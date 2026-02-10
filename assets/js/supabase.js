// ===========================================
// SUPABASE CLIENT & DATABASE FUNCTIONS
// AI Tool Hub - Database Operations
// ===========================================

import {
    SUPABASE_URL,
    SUPABASE_ANON_KEY,
    SUPABASE_TABLE_TOOLS,
    SUPABASE_TABLE_CATEGORIES,
    SUPABASE_TABLE_RANKINGS,
    ERROR_MESSAGES,
    validateConfig
} from './config.js';

// ===========================================
// SUPABASE CLIENT INITIALIZATION
// ===========================================

let supabase = null;
let initializationPromise = null;
const activeSubscriptions = new Map();
const voteLocks = new Map();

/**
 * Initializes Supabase client once with thread safety
 * @returns {Promise<Object>} Initialized Supabase client
 */
async function initializeSupabase() {
    if (initializationPromise) return initializationPromise;
    
    initializationPromise = (async () => {
        try {
            if (typeof window === 'undefined') {
                throw new Error('Browser environment required');
            }

            if (!window.supabase?.createClient) {
                throw new Error('Supabase CDN not loaded');
            }

            const isValid = validateConfig();
            if (!isValid) {
                throw new Error('Supabase not configured - using local mode');
            }


            const client = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
                auth: {
                    persistSession: true,
                    autoRefreshToken: false,
                    detectSessionInUrl: false
                },
                global: {
                    headers: { 'X-Client-Info': 'ai-tool-hub' }
                }
            });

            // Test minimal connection without fetching data
            const { error } = await client
                .from(SUPABASE_TABLE_TOOLS)
                .select('id', { count: 'exact', head: true })
                .limit(1);

            if (error) throw error;

            supabase = client;
            return client;
        } catch (error) {
            console.error('Supabase initialization failed:', error);
            supabase = null;
            initializationPromise = null;
            throw new Error('Database initialization failed');
        }
    })();

    return initializationPromise;
}

/**
 * Gets validated Supabase client
 * @returns {Promise<Object>} Supabase client
 */
async function getClient() {
    if (supabase) return supabase;
    return await initializeSupabase();
}

// ===========================================
// AUTHENTICATION FUNCTIONS
// ===========================================

/**
 * Signs in user anonymously or with OAuth
 * @param {Object} options - Auth options { provider: 'github'|'google', anonymous: boolean }
 * @returns {Promise<Object>} Auth result
 */
export async function signIn(options = {}) {
    try {
        const client = await getClient();
        
        if (options.anonymous) {
            const { data, error } = await client.auth.signInAnonymously();
            if (error) throw error;
            return { success: true, user: data.user, isAnonymous: true };
        }
        
        if (options.provider) {
            const { error } = await client.auth.signInWithOAuth({
                provider: options.provider,
                options: { redirectTo: window.location.origin }
            });
            if (error) throw error;
            return { success: true, message: `Redirecting to ${options.provider}...` };
        }
        
        throw new Error('No authentication method specified');
    } catch (error) {
        console.error('Sign in error:', error);
        return {
            success: false,
            message: ERROR_MESSAGES.AUTH_ERROR,
            error: error.message
        };
    }
}

/**
 * Signs out current user
 * @returns {Promise<Object>} Sign out result
 */
export async function signOut() {
    try {
        const client = await getClient();
        const { error } = await client.auth.signOut();
        if (error) throw error;
        return { success: true };
    } catch (error) {
        console.error('Sign out error:', error);
        return { success: false, message: ERROR_MESSAGES.AUTH_ERROR };
    }
}

/**
 * Gets current auth state
 * @returns {Promise<Object>} Auth state
 */
export async function getAuthState() {
    try {
        const client = await getClient();
        const { data: { session }, error } = await client.auth.getSession();
        
        if (error) throw error;
        
        return {
            isAuthenticated: !!session,
            user: session?.user || null,
            session: session
        };
    } catch (error) {
        console.warn('Auth state check failed:', error);
        return { isAuthenticated: false, user: null, session: null };
    }
}

// ===========================================
// VOTING SYSTEM FUNCTIONS
// ===========================================

/**
 * Loads vote statistics for a specific tool with server-side aggregation
 * @param {string} toolId - The ID of the tool
 * @returns {Promise<Object>} - Vote statistics { total: number, average: number, count: number }
 */
export async function loadToolVotes(toolId) {
    try {
        if (!toolId || typeof toolId !== 'string') {
            return { total: 0, average: 0, count: 0 };
        }

        const client = await getClient();
        
        // Get count and average in single query
        const { count, error: countError } = await client
            .from('votes')
            .select('*', { count: 'exact', head: false })
            .eq('tool_id', toolId);

        if (countError) {
            console.error('Error loading vote count:', countError);
            return { total: 0, average: 0, count: 0 };
        }

        const voteCount = count || 0;
        if (voteCount === 0) {
            return { total: 0, average: 0, count: 0 };
        }

        // Get sum for total calculation
        const { data: votes, error: votesError } = await client
            .from('votes')
            .select('vote_value')
            .eq('tool_id', toolId);

        if (votesError) {
            console.error('Error loading vote values:', votesError);
            return { total: 0, average: 0, count: voteCount };
        }

        const total = votes.reduce((sum, vote) => sum + vote.vote_value, 0);
        const average = voteCount > 0 ? total / voteCount : 0;

        return { 
            total, 
            average: Math.round(average * 10) / 10, 
            count: voteCount 
        };
    } catch (error) {
        console.error('Unexpected error loading votes:', error);
        return { total: 0, average: 0, count: 0 };
    }
}

/**
 * Loads votes for multiple tools at once
 * @param {Array<string>} toolIds - Array of tool IDs
 * @returns {Promise<Object>} - Map of toolId -> vote statistics
 */
export async function loadMultipleToolVotes(toolIds) {
    try {
        if (!Array.isArray(toolIds) || toolIds.length === 0) {
            return {};
        }

        const client = await getClient();
        const { data, error } = await client
            .from('votes')
            .select('tool_id, vote_value')
            .in('tool_id', toolIds);

        if (error) {
            console.error('Error loading multiple votes:', error);
            return {};
        }

        if (!data || data.length === 0) {
            return {};
        }

        // Group and calculate efficiently
        const stats = {};
        const toolStats = new Map();
        
        data.forEach(vote => {
            const toolId = vote.tool_id;
            if (!toolStats.has(toolId)) {
                toolStats.set(toolId, { total: 0, count: 0 });
            }
            const stat = toolStats.get(toolId);
            stat.total += vote.vote_value;
            stat.count += 1;
        });

        for (const [toolId, stat] of toolStats.entries()) {
            const average = stat.count > 0 ? stat.total / stat.count : 0;
            stats[toolId] = { 
                total: stat.total, 
                average: Math.round(average * 10) / 10, 
                count: stat.count 
            };
        }

        return stats;
    } catch (error) {
        console.error('Unexpected error loading multiple votes:', error);
        return {};
    }
}

/**
 * Saves a vote for a tool with enhanced race condition protection
 * @param {string} toolId - The ID of the tool
 * @param {number} voteValue - Vote value (1-5)
 * @param {string} userId - Optional user identifier
 * @returns {Promise<Object>} - Result { success: boolean, message: string, data: any }
 */
export async function saveVote(toolId, voteValue, userId = null) {
    const lockKey = `vote_${toolId}_${userId || 'anonymous'}`;
    
    // Prevent rapid duplicate votes with timestamp check
    const now = Date.now();
    const lastVoteTime = voteLocks.get(lockKey) || 0;
    
    if (now - lastVoteTime < 2000) { // 2 second cooldown
        return {
            success: false,
            message: 'Please wait before voting again',
            data: null
        };
    }
    
    voteLocks.set(lockKey, now);
    
    try {
        if (!toolId || typeof toolId !== 'string') {
            return {
                success: false,
                message: 'Tool ID is required',
                data: null
            };
        }

        const voteNum = Number(voteValue);
        if (!Number.isInteger(voteNum) || voteNum < 1 || voteNum > 5) {
            return {
                success: false,
                message: 'Vote value must be an integer between 1 and 5',
                data: null
            };
        }

        const client = await getClient();
        const authState = await getAuthState();
        const currentUserId = userId || authState.user?.id || null;

        if (currentUserId) {
            const { data: existingVote, error: checkError } = await client
                .from('votes')
                .select('id')
                .eq('tool_id', toolId)
                .eq('user_id', currentUserId)
                .maybeSingle();

            if (checkError) {
                console.error('Error checking existing vote:', checkError);
            } else if (existingVote) {
                return {
                    success: false,
                    message: 'You have already voted for this tool',
                    data: null
                };
            }
        }

        const voteData = {
            tool_id: toolId,
            vote_value: voteNum,
            created_at: new Date().toISOString(),
            user_id: currentUserId,
            ip_address: null
        };

        const { data, error } = await client
            .from('votes')
            .insert([voteData])
            .select('id, vote_value, created_at')
            .single();

        if (error) throw error;

        // Update statistics using server-side aggregation
        await updateToolVoteStatistics(toolId);

        return {
            success: true,
            message: 'Vote saved successfully',
            data: data
        };
    } catch (error) {
        console.error('Error saving vote:', error);
        return {
            success: false,
            message: error.code === '23505' ? 'You have already voted for this tool' : ERROR_MESSAGES.DATABASE_ERROR,
            data: null
        };
    }
}

/**
 * Updates tool's vote statistics using consistent aggregation
 * @param {string} toolId - The ID of the tool
 * @returns {Promise<boolean>} - Success status
 */
async function updateToolVoteStatistics(toolId) {
    try {
        const client = await getClient();
        
        // Use the same aggregation logic as loadToolVotes for consistency
        const { count, error: countError } = await client
            .from('votes')
            .select('*', { count: 'exact', head: false })
            .eq('tool_id', toolId);

        if (countError) throw countError;

        const voteCount = count || 0;
        let average = 0;

        if (voteCount > 0) {
            const { data: votes, error: votesError } = await client
                .from('votes')
                .select('vote_value')
                .eq('tool_id', toolId);

            if (votesError) throw votesError;
            
            const total = votes.reduce((sum, vote) => sum + vote.vote_value, 0);
            average = total / voteCount;
        }

        const { error: updateError } = await client
            .from(SUPABASE_TABLE_TOOLS)
            .update({
                vote_count: voteCount,
                vote_average: Math.round(average * 10) / 10,
                last_vote_at: new Date().toISOString()
            })
            .eq('id', toolId);

        if (updateError) throw updateError;
        return true;
    } catch (error) {
        console.error('Error updating tool vote statistics:', error);
        return false;
    }
}

// ===========================================
// FAVORITES SYSTEM FUNCTIONS
// ===========================================

/**
 * Adds a tool to user's favorites
 * @param {string} toolId - Tool ID
 * @returns {Promise<Object>} Operation result
 */
export async function addFavorite(toolId) {
    try {
        const client = await getClient();
        const authState = await getAuthState();
        
        if (!authState.isAuthenticated) {
            return {
                success: false,
                message: 'Please sign in to save favorites',
                requiresAuth: true
            };
        }

        const { error } = await client
            .from('favorites')
            .upsert({
                tool_id: toolId,
                user_id: authState.user.id,
                created_at: new Date().toISOString()
            }, {
                onConflict: 'tool_id,user_id'
            });

        if (error) throw error;

        return { success: true };
    } catch (error) {
        console.error('Error adding favorite:', error);
        return {
            success: false,
            message: error.code === '23505' ? 'Already in favorites' : ERROR_MESSAGES.DATABASE_ERROR
        };
    }
}

/**
 * Removes a tool from user's favorites
 * @param {string} toolId - Tool ID
 * @returns {Promise<Object>} Operation result
 */
export async function removeFavorite(toolId) {
    try {
        const client = await getClient();
        const authState = await getAuthState();
        
        if (!authState.isAuthenticated) {
            return { success: false, message: 'Not authenticated' };
        }

        const { error } = await client
            .from('favorites')
            .delete()
            .eq('tool_id', toolId)
            .eq('user_id', authState.user.id);

        if (error) throw error;

        return { success: true };
    } catch (error) {
        console.error('Error removing favorite:', error);
        return {
            success: false,
            message: ERROR_MESSAGES.DATABASE_ERROR
        };
    }
}

/**
 * Checks if a tool is in user's favorites
 * @param {string} toolId - Tool ID
 * @returns {Promise<boolean>} Favorite status
 */
export async function isFavorite(toolId) {
    try {
        const client = await getClient();
        const authState = await getAuthState();
        
        if (!authState.isAuthenticated) return false;

        const { data, error } = await client
            .from('favorites')
            .select('id')
            .eq('tool_id', toolId)
            .eq('user_id', authState.user.id)
            .maybeSingle();

        if (error) throw error;
        return !!data;
    } catch (error) {
        console.error('Error checking favorite:', error);
        return false;
    }
}

/**
 * Loads user's favorite tools
 * @returns {Promise<Array>} Array of favorite tools
 */
export async function loadFavorites() {
    try {
        const client = await getClient();
        const authState = await getAuthState();
        
        if (!authState.isAuthenticated) return [];

        const { data,


// ===========================================
// TOOL MANAGEMENT FUNCTIONS
// ===========================================

/**
 * Loads all AI tools from database with safe search query
 * @param {Object} options - Filter and pagination options
 * @returns {Promise<Array>} - Array of tool objects
 */
// ===========================================
// TOOL MANAGEMENT FUNCTIONS
// ===========================================

/**
 * Loads all AI tools from database with safe search query
 * @param {Object} options - Filter and pagination options
 * @returns {Promise<Array>} - Array of tool objects
 */
export async function loadTools(options = {}) {
    try {
        const client = await getClient();
        let query = client
            .from(SUPABASE_TABLE_TOOLS)
            .select('id, title, description, category, link, is_free, vote_average, vote_count, usage_count, created_at, updated_at')
            .eq('status', 'active')
            .order('created_at', { ascending: false });

        if (options.category && options.category !== 'all') {
            query = query.eq('category', options.category);
        }

        if (options.search) {
            const safeSearch = String(options.search || '').trim();
            if (safeSearch) {
                query = query.or(`title.ilike.%${safeSearch}%,description.ilike.%${safeSearch}%`);
            }
        }

        if (options.limit) {
            query = query.limit(options.limit);
        }

        const { data, error } = await query;

        if (error) throw error;

        // link/url angleichen (für Kompatibilität)
        return (data || []).map(tool => ({
            ...tool,
            url: tool.url || tool.link || '',
            link: tool.link || tool.url || ''
        }));
    } catch (error) {
        console.error('Error loading tools:', error);
        throw new Error(ERROR_MESSAGES.LOADING_ERROR);
    }
}


/**
 * Loads tool categories from database
 * @returns {Promise<Array>} - Array of category objects
 */
export async function loadCategories() {
    try {
        const client = await getClient();
        const { data, error } = await client
            .from(SUPABASE_TABLE_CATEGORIES)
            .select('id, name, description, tool_count')
            .order('name');

        if (error) throw error;
        return data || [];
    } catch (error) {
        console.error('Error loading categories:', error);
        throw new Error(ERROR_MESSAGES.LOADING_ERROR);
    }
}

/**
 * Loads tool ranking data
 * @returns {Promise<Array>} - Array of top ranked tools
 */
export async function loadRankings() {
    try {
        const client = await getClient();
        const { data, error } = await client
            .from(SUPABASE_TABLE_RANKINGS)
            .select(`
                position,
                tool:tool_id(id, title, description, category, vote_average)
            `)
            .order('position')
            .limit(3);

        if (error) throw error;
        return data || [];
    } catch (error) {
        console.error('Error loading rankings:', error);
        throw new Error(ERROR_MESSAGES.LOADING_ERROR);
    }
}

/**
 * Increments the usage count for a tool
 * @param {string} toolId - The ID of the tool
 * @returns {Promise<boolean>} - Success status
 */
export async function incrementToolUsage(toolId) {
    try {
        const client = await getClient();
        
        // Try RPC first
        try {
            const { error } = await client.rpc('increment_usage_count', {
                tool_id: toolId
            });
            if (!error) return true;
        } catch (rpcError) {
            console.warn('RPC not available, falling back to transaction:', rpcError);
        }

        // Fallback to atomic update
        const { data: tool, error: fetchError } = await client
            .from(SUPABASE_TABLE_TOOLS)
            .select('usage_count')
            .eq('id', toolId)
            .single();

        if (fetchError) throw fetchError;

        const { error: updateError } = await client
            .from(SUPABASE_TABLE_TOOLS)
            .update({
                usage_count: (tool.usage_count || 0) + 1,
                last_used_at: new Date().toISOString()
            })
            .eq('id', toolId);

        if (updateError) throw updateError;
        return true;
    } catch (error) {
        console.error('Error incrementing tool usage:', error);
        return false;
    }
}

/**
 * Loads tool statistics for the hero section
 * @returns {Promise<Object>} - Statistics object
 */
export async function loadToolStatistics() {
    try {
        const client = await getClient();
        
        const [
            { count: totalTools },
            { count: updatedToday },
            { count: freeTools }
        ] = await Promise.all([
            client.from(SUPABASE_TABLE_TOOLS)
                .select('*', { count: 'exact', head: true })
                .eq('status', 'active'),
            client.from(SUPABASE_TABLE_TOOLS)
                .select('*', { count: 'exact', head: true })
                .gte('updated_at', new Date().toISOString().split('T')[0]),
            client.from(SUPABASE_TABLE_TOOLS)
                .select('*', { count: 'exact', head: true })
                .eq('is_free', true)
                .eq('status', 'active')
        ]);

        return {
            total: totalTools || 0,
            updatedToday: updatedToday || 0,
            free: freeTools || 0
        };
    } catch (error) {
        console.error('Error loading tool statistics:', error);
        return { total: 0, updatedToday: 0, free: 0 };
    }
}

// ===========================================
// DATABASE SETUP & VALIDATION
// ===========================================

/**
 * Tests the database connection
 * @returns {Promise<boolean>} - Connection status
 */
export async function testConnection() {
    try {
        const client = await getClient();
        const { error } = await client
            .from(SUPABASE_TABLE_TOOLS)
            .select('id', { count: 'exact', head: true })
            .limit(1);

        if (error) {
            console.error('Database connection test failed:', error);
            return false;
        }

        return true;
    } catch (error) {
        console.error('Database connection test failed:', error);
        return false;
    }
}

/**
 * Creates the votes table if it doesn't exist
 * Note: This would normally be done via Supabase migrations
 * This is just a helper function for development
 */
export async function setupVotesTable() {
    try {
        console.log('ℹ️ Note: Votes table should be created via Supabase migrations.');
        console.log('ℹ️ Required schema for votes table:');
        console.log(`
            CREATE TABLE IF NOT EXISTS votes (
                id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
                tool_id UUID REFERENCES ai_tools(id) ON DELETE CASCADE,
                vote_value INTEGER NOT NULL CHECK (vote_value >= 1 AND vote_value <= 5),
                user_id UUID REFERENCES auth.users(id),
                ip_address TEXT,
                created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
                UNIQUE(tool_id, user_id) WHERE user_id IS NOT NULL
            );
            
            CREATE INDEX IF NOT EXISTS idx_votes_tool_id ON votes(tool_id);
            CREATE INDEX IF NOT EXISTS idx_votes_created_at ON votes(created_at);
        `);
        
        return true;
    } catch (error) {
        console.error('Error setting up votes table:', error);
        return false;
    }
}

// ===========================================
// REAL-TIME SUBSCRIPTIONS
// ===========================================

/**
 * Subscribes to real-time vote updates for a tool
 * @param {string} toolId - The ID of the tool
 * @param {Function} callback - Function to call when votes change
 * @returns {Object} - Subscription object with unsubscribe method
 */
export async function subscribeToVoteUpdates(toolId, callback) {
    const channelKey = `votes:${toolId}`;

    const client = await getClient();
    
    // Check if already subscribed
    if (activeSubscriptions.has(channelKey)) {
        const existing = activeSubscriptions.get(channelKey);
        return {
            unsubscribe: () => unsubscribeFromUpdates(existing)
        };
    }

    try {
        if (!client) {
            console.error('Supabase client not initialized');
            return { unsubscribe: () => {} };
        }

        const subscription = client
            .channel(channelKey)
            .on(
                'postgres_changes',
                {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'votes',
                    filter: `tool_id=eq.${toolId}`
                },
                callback
            )
            .subscribe((status) => {
                if (status === 'SUBSCRIBED') {
                    activeSubscriptions.set(channelKey, subscription);
                } else if (status === 'CLOSED' || status === 'CHANNEL_ERROR') {
                    activeSubscriptions.delete(channelKey);
                }
            });

        return {
            unsubscribe: () => unsubscribeFromUpdates(subscription)
        };
    } catch (error) {
        console.error('Error creating vote subscription:', error);
        return { unsubscribe: () => {} };
    }
}

/**
 * Subscribes to favorite updates for current user
 * @param {Function} callback - Function to call when favorites change
 * @returns {Object} - Subscription object with unsubscribe method
 */
export async function subscribeToFavoriteUpdates(callback) {
    const client = await getClient();
    if (!client) {
        console.error('Supabase client not initialized');
        return { unsubscribe: () => {} };
    }

    const authState = await getAuthState();
    if (!authState.isAuthenticated) {
        console.warn('Favorites subscription skipped: user not authenticated');
        return { unsubscribe: () => {} };
    }

    const userId = authState.user.id;
    const channelKey = `favorites:user:${userId}`;

    // Doppel-Subscription verhindern
    if (activeSubscriptions.has(channelKey)) {
        const existing = activeSubscriptions.get(channelKey);
        return {
            unsubscribe: () => unsubscribeFromUpdates(existing)
        };
    }

    try {
        const subscription = client
            .channel(channelKey)
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'favorites',
                    filter: `user_id=eq.${userId}`
                },
                callback
            )
            .subscribe((status) => {
                if (status === 'SUBSCRIBED') {
                    activeSubscriptions.set(channelKey, subscription);
                } else if (status === 'CLOSED' || status === 'CHANNEL_ERROR') {
                    activeSubscriptions.delete(channelKey);
                }
            });

        return {
            unsubscribe: () => unsubscribeFromUpdates(subscription)
        };
    } catch (error) {
        console.error('Error creating favorites subscription:', error);
        return { unsubscribe: () => {} };
    }
}

/**
 * Unsubscribes from real-time updates
 * @param {Object} subscription - Subscription object
 */
export function unsubscribeFromUpdates(subscription) {
    if (!subscription || !supabase) return;
    
    try {
        supabase.removeChannel(subscription);
        
        // Remove from active subscriptions
        for (const [key, sub] of activeSubscriptions.entries()) {
            if (sub === subscription) {
                activeSubscriptions.delete(key);
                break;
            }
        }
    } catch (error) {
        console.error('Error unsubscribing:', error);
    }
}

/**
 * Cleanup all active subscriptions
 */
export function cleanupAllSubscriptions() {
    if (!supabase) return;
    
    try {
        for (const subscription of activeSubscriptions.values()) {
            supabase.removeChannel(subscription);
        }
        activeSubscriptions.clear();
    } catch (error) {
        console.error('Error cleaning up subscriptions:', error);
    }
}

// ===========================================
// EXPORT SUPABASE CLIENT
// ===========================================

export async function getSupabaseClient() {
    return await getClient();
}