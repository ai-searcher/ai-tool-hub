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

// Initialize Supabase Client
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Validate configuration on import
if (typeof window !== 'undefined') {
    validateConfig();
}

// ===========================================
// VOTING SYSTEM FUNCTIONS
// ===========================================

/**
 * Loads vote statistics for a specific tool
 * @param {string} toolId - The ID of the tool
 * @returns {Promise<Object>} - Vote statistics { total: number, average: number, count: number }
 */
export async function loadToolVotes(toolId) {
    try {
        if (!toolId) {
            console.error('Tool ID is required');
            return { total: 0, average: 0, count: 0 };
        }

        const { data, error } = await supabase
            .from('votes')
            .select('*')
            .eq('tool_id', toolId);

        if (error) {
            console.error('Error loading votes:', error);
            return { total: 0, average: 0, count: 0 };
        }

        if (!data || data.length === 0) {
            return { total: 0, average: 0, count: 0 };
        }

        // Calculate statistics
        const votes = data.map(v => v.vote_value);
        const total = votes.reduce((sum, vote) => sum + vote, 0);
        const average = votes.length > 0 ? total / votes.length : 0;
        const count = votes.length;

        return { total, average, count };
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
        if (!toolIds || !Array.isArray(toolIds) || toolIds.length === 0) {
            return {};
        }

        const { data, error } = await supabase
            .from('votes')
            .select('*')
            .in('tool_id', toolIds);

        if (error) {
            console.error('Error loading multiple votes:', error);
            return {};
        }

        if (!data || data.length === 0) {
            return {};
        }

        // Group votes by tool_id
        const votesByTool = {};
        data.forEach(vote => {
            const toolId = vote.tool_id;
            if (!votesByTool[toolId]) {
                votesByTool[toolId] = [];
            }
            votesByTool[toolId].push(vote.vote_value);
        });

        // Calculate statistics for each tool
        const result = {};
        Object.keys(votesByTool).forEach(toolId => {
            const votes = votesByTool[toolId];
            const total = votes.reduce((sum, vote) => sum + vote, 0);
            const average = votes.length > 0 ? total / votes.length : 0;
            result[toolId] = { total, average, count: votes.length };
        });

        return result;
    } catch (error) {
        console.error('Unexpected error loading multiple votes:', error);
        return {};
    }
}

/**
 * Saves a vote for a tool
 * @param {string} toolId - The ID of the tool
 * @param {number} voteValue - Vote value (e.g., 1-5)
 * @param {string} userId - Optional user identifier (for preventing duplicate votes)
 * @returns {Promise<Object>} - Result { success: boolean, message: string, data: any }
 */
export async function saveVote(toolId, voteValue, userId = null) {
    try {
        if (!toolId) {
            return {
                success: false,
                message: 'Tool ID is required',
                data: null
            };
        }

        if (voteValue < 1 || voteValue > 5) {
            return {
                success: false,
                message: 'Vote value must be between 1 and 5',
                data: null
            };
        }

        // Check if user already voted (if userId is provided)
        if (userId) {
            const { data: existingVote, error: checkError } = await supabase
                .from('votes')
                .select('id')
                .eq('tool_id', toolId)
                .eq('user_id', userId)
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

        // Prepare vote data
        const voteData = {
            tool_id: toolId,
            vote_value: voteValue,
            created_at: new Date().toISOString(),
            user_id: userId,
            ip_address: userId ? null : await getClientIP()
        };

        // Insert vote
        const { data, error } = await supabase
            .from('votes')
            .insert([voteData])
            .select();

        if (error) {
            console.error('Error saving vote:', error);
            return {
                success: false,
                message: ERROR_MESSAGES.DATABASE_ERROR,
                data: null
            };
        }

        // Update tool's vote statistics
        await updateToolVoteStatistics(toolId);

        return {
            success: true,
            message: 'Vote saved successfully',
            data: data[0]
        };
    } catch (error) {
        console.error('Unexpected error saving vote:', error);
        return {
            success: false,
            message: ERROR_MESSAGES.DATABASE_ERROR,
            data: null
        };
    }
}

/**
 * Updates tool's vote statistics in the tools table
 * @param {string} toolId - The ID of the tool
 * @returns {Promise<boolean>} - Success status
 */
async function updateToolVoteStatistics(toolId) {
    try {
        const voteStats = await loadToolVotes(toolId);
        
        const { error } = await supabase
            .from(SUPABASE_TABLE_TOOLS)
            .update({
                vote_count: voteStats.count,
                vote_average: voteStats.average,
                last_vote_at: new Date().toISOString()
            })
            .eq('id', toolId);

        if (error) {
            console.error('Error updating tool vote statistics:', error);
            return false;
        }

        return true;
    } catch (error) {
        console.error('Unexpected error updating vote statistics:', error);
        return false;
    }
}

/**
 * Gets client IP address (for anonymous voting)
 * @returns {Promise<string>} - Client IP address
 */
async function getClientIP() {
    try {
        // Try to get IP from a public service
        const response = await fetch('https://api.ipify.org?format=json');
        const data = await response.json();
        return data.ip;
    } catch (error) {
        console.warn('Could not get IP address:', error);
        return 'unknown';
    }
}

// ===========================================
// TOOL MANAGEMENT FUNCTIONS
// ===========================================

/**
 * Loads all AI tools from database
 * @param {Object} options - Filter and pagination options
 * @returns {Promise<Array>} - Array of tool objects
 */
export async function loadTools(options = {}) {
    try {
        let query = supabase
            .from(SUPABASE_TABLE_TOOLS)
            .select('*')
            .eq('status', 'active')
            .order('created_at', { ascending: false });

        // Apply filters
        if (options.category && options.category !== 'all') {
            query = query.eq('category', options.category);
        }

        if (options.search) {
            query = query.or(`title.ilike.%${options.search}%,description.ilike.%${options.search}%`);
        }

        if (options.limit) {
            query = query.limit(options.limit);
        }

        const { data, error } = await query;

        if (error) {
            console.error('Error loading tools:', error);
            throw new Error(ERROR_MESSAGES.DATABASE_ERROR);
        }

        return data || [];
    } catch (error) {
        console.error('Unexpected error loading tools:', error);
        throw new Error(ERROR_MESSAGES.LOADING_ERROR);
    }
}

/**
 * Loads tool categories from database
 * @returns {Promise<Array>} - Array of category objects
 */
export async function loadCategories() {
    try {
        const { data, error } = await supabase
            .from(SUPABASE_TABLE_CATEGORIES)
            .select('*')
            .order('name');

        if (error) {
            console.error('Error loading categories:', error);
            throw new Error(ERROR_MESSAGES.DATABASE_ERROR);
        }

        return data || [];
    } catch (error) {
        console.error('Unexpected error loading categories:', error);
        throw new Error(ERROR_MESSAGES.LOADING_ERROR);
    }
}

/**
 * Loads tool ranking data
 * @returns {Promise<Array>} - Array of top ranked tools
 */
export async function loadRankings() {
    try {
        const { data, error } = await supabase
            .from(SUPABASE_TABLE_RANKINGS)
            .select(`
                *,
                tool:tool_id (*)
            `)
            .order('position')
            .limit(3);

        if (error) {
            console.error('Error loading rankings:', error);
            throw new Error(ERROR_MESSAGES.DATABASE_ERROR);
        }

        return data || [];
    } catch (error) {
        console.error('Unexpected error loading rankings:', error);
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
        // Get current usage count
        const { data: tool, error: fetchError } = await supabase
            .from(SUPABASE_TABLE_TOOLS)
            .select('usage_count')
            .eq('id', toolId)
            .single();

        if (fetchError) {
            console.error('Error fetching tool:', fetchError);
            return false;
        }

        // Increment usage count
        const { error: updateError } = await supabase
            .from(SUPABASE_TABLE_TOOLS)
            .update({
                usage_count: (tool.usage_count || 0) + 1,
                last_used_at: new Date().toISOString()
            })
            .eq('id', toolId);

        if (updateError) {
            console.error('Error updating tool usage:', updateError);
            return false;
        }

        return true;
    } catch (error) {
        console.error('Unexpected error incrementing tool usage:', error);
        return false;
    }
}

/**
 * Loads tool statistics for the hero section
 * @returns {Promise<Object>} - Statistics object
 */
export async function loadToolStatistics() {
    try {
        // Get total tools count
        const { count: totalTools } = await supabase
            .from(SUPABASE_TABLE_TOOLS)
            .select('*', { count: 'exact', head: true })
            .eq('status', 'active');

        // Get tools updated today
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const { count: updatedToday } = await supabase
            .from(SUPABASE_TABLE_TOOLS)
            .select('*', { count: 'exact', head: true })
            .gte('updated_at', today.toISOString());

        // Get free tools count
        const { count: freeTools } = await supabase
            .from(SUPABASE_TABLE_TOOLS)
            .select('*', { count: 'exact', head: true })
            .eq('is_free', true)
            .eq('status', 'active');

        return {
            total: totalTools || 0,
            updatedToday: updatedToday || 0,
            free: freeTools || 0
        };
    } catch (error) {
        console.error('Error loading tool statistics:', error);
        return {
            total: 0,
            updatedToday: 0,
            free: 0
        };
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
        const { data, error } = await supabase
            .from(SUPABASE_TABLE_TOOLS)
            .select('count', { count: 'exact', head: true });

        if (error) {
            console.error('Database connection test failed:', error);
            return false;
        }

        console.log('✅ Database connection successful');
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
                user_id TEXT,
                ip_address TEXT,
                created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
                UNIQUE(tool_id, user_id) WHERE user_id IS NOT NULL
            );
            
            -- Index for better performance
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
 * @returns {Object} - Subscription object
 */
export function subscribeToVoteUpdates(toolId, callback) {
    const subscription = supabase
        .channel(`votes:${toolId}`)
        .on(
            'postgres_changes',
            {
                event: '*',
                schema: 'public',
                table: 'votes',
                filter: `tool_id=eq.${toolId}`
            },
            (payload) => {
                callback(payload);
            }
        )
        .subscribe();

    return subscription;
}

/**
 * Unsubscribes from real-time updates
 * @param {Object} subscription - Subscription object
 */
export function unsubscribeFromUpdates(subscription) {
    if (subscription) {
        supabase.removeChannel(subscription);
    }
}

// ===========================================
// EXPORT SUPABASE CLIENT
// ===========================================

export { supabase };
