// ===========================================
// CONFIGURATION FILE FOR AI TOOL HUB
// Wichtig: Ersetze die Platzhalter mit deinen eigenen Werten!
// ===========================================

// Supabase Configuration
// ----------------------
// Hier die Verbindungsdaten zu deiner Supabase-Datenbank eintragen
// Diese findest du in deinem Supabase Dashboard unter Settings > API

export const SUPABASE_URL = 'https://your-project-url.supabase.co';  // Deine Supabase URL
export const SUPABASE_ANON_KEY = 'your-anon-key-here';               // Dein Anon Key
export const SUPABASE_TABLE_TOOLS = 'ai_tools';                      // Tabellenname für KI-Tools
export const SUPABASE_TABLE_CATEGORIES = 'categories';               // Tabellenname für Kategorien
export const SUPABASE_TABLE_RANKINGS = 'rankings';                   // Tabellenname für Rankings

// Google Analytics Configuration
// ------------------------------
// Deine GA4 Measurement ID (beginnt mit "G-")

export const GA_TRACKING_ID = 'G-XXXXXXXXXX';  // Deine Google Analytics 4 ID

// Application Configuration
// -------------------------
// Allgemeine App-Einstellungen

export const APP_NAME = 'AI Tool Hub';
export const APP_VERSION = '1.0.0';
export const APP_ENV = 'production';  // 'development', 'staging', 'production'

// API Configuration
// -----------------
// Einstellungen für API-Aufrufe

export const API_TIMEOUT = 10000;  // 10 Sekunden Timeout
export const API_MAX_RETRIES = 3;  // Maximale Wiederholungsversuche

// Feature Flags
// -------------
// Hier kannst du Features ein- und ausschalten

export const FEATURES = {
    DARK_MODE_TOGGLE: true,
    SEARCH_FUNCTIONALITY: true,
    FILTER_BY_CATEGORY: true,
    TOOL_RANKINGS: true,
    TOOL_STATISTICS: true,
    MODAL_DIALOGS: true,
    RESPONSIVE_DESIGN: true,
    ANIMATIONS: true
};

// UI Configuration
// ----------------
// Einstellungen für das User Interface

export const UI_CONFIG = {
    ITEMS_PER_PAGE: 12,            // Anzahl Tools pro Seite
    AUTO_REFRESH_INTERVAL: 300000, // 5 Minuten in Millisekunden
    TOOLTIP_DELAY: 300,            // Millisekunden
    ANIMATION_DURATION: 300,       // Millisekunden
    DEBOUNCE_DELAY: 300            // Millisekunden für Such-Input
};

// Date and Time Configuration
// ---------------------------
// Formate und Zeitzonen

export const DATE_FORMAT = 'DD.MM.YYYY';
export const TIME_FORMAT = 'HH:mm';
export const TIMEZONE = 'Europe/Berlin';

// Categories Configuration
// ------------------------
// Standard-Kategorien (falls nicht aus Datenbank geladen werden können)

export const DEFAULT_CATEGORIES = [
    { id: 'all', name: 'Alle Tools', icon: 'fas fa-th-large' },
    { id: 'text', name: 'Text-Generierung', icon: 'fas fa-font' },
    { id: 'image', name: 'Bild-Generierung', icon: 'fas fa-image' },
    { id: 'video', name: 'Video-Generierung', icon: 'fas fa-video' },
    { id: 'audio', name: 'Audio-Generierung', icon: 'fas fa-music' },
    { id: 'code', name: 'Code-Generierung', icon: 'fas fa-code' },
    { id: 'data', name: 'Datenanalyse', icon: 'fas fa-chart-line' },
    { id: 'productivity', name: 'Produktivität', icon: 'fas fa-rocket' },
    { id: 'free', name: 'Kostenlos', icon: 'fas fa-euro-sign' }
];

// Tool Default Values
// -------------------
// Standardwerte für Tool-Karten

export const TOOL_DEFAULTS = {
    RATING: 4.0,
    USAGE_COUNT: 0,
    IS_FREE: false,
    IS_FEATURED: false,
    STATUS: 'active'
};

// Error Messages
// --------------
// Standard-Fehlermeldungen

export const ERROR_MESSAGES = {
    NETWORK_ERROR: 'Netzwerkfehler. Bitte überprüfe deine Internetverbindung.',
    DATABASE_ERROR: 'Datenbankfehler. Bitte versuche es später erneut.',
    NO_TOOLS_FOUND: 'Keine Tools gefunden. Versuche andere Suchbegriffe.',
    LOADING_ERROR: 'Fehler beim Laden der Daten. Bitte Seite neu laden.',
    SEARCH_ERROR: 'Fehler bei der Suche. Bitte versuche es erneut.'
};

// Success Messages
// ----------------
// Standard-Erfolgsmeldungen

export const SUCCESS_MESSAGES = {
    TOOLS_LOADED: 'Tools erfolgreich geladen.',
    SEARCH_COMPLETE: 'Suche abgeschlossen.',
    FILTER_APPLIED: 'Filter angewendet.',
    RANKING_UPDATED: 'Ranking aktualisiert.'
};

// Color Theme
// -----------
// Falls du die Farben überschreiben möchtest (werden normalerweise in CSS-Variablen definiert)

export const COLORS = {
    PRIMARY: '#00f3ff',
    SECONDARY: '#b967ff',
    SUCCESS: '#00ff9d',
    WARNING: '#ffcc00',
    ERROR: '#ff3366',
    INFO: '#00c3ff'
};

// Export Validation
// -----------------
// Diese Funktion prüft, ob alle erforderlichen Konfigurationen gesetzt sind

export const validateConfig = () => {
    const errors = [];
    
    if (!SUPABASE_URL || SUPABASE_URL.includes('your-project-url')) {
        errors.push('SUPABASE_URL ist nicht konfiguriert. Bitte trage deine Supabase-URL ein.');
    }
    
    if (!SUPABASE_ANON_KEY || SUPABASE_ANON_KEY.includes('your-anon-key-here')) {
        errors.push('SUPABASE_ANON_KEY ist nicht konfiguriert. Bitte trage deinen Anon Key ein.');
    }
    
    if (!GA_TRACKING_ID || GA_TRACKING_ID.includes('XXXXXXXXXX')) {
        console.warn('GA_TRACKING_ID ist nicht konfiguriert. Google Analytics wird nicht funktionieren.');
    }
    
    if (errors.length > 0) {
        console.error('Konfigurationsfehler gefunden:');
        errors.forEach(error => console.error(`- ${error}`));
        return false;
    }
    
    console.log('✓ Konfiguration erfolgreich validiert');
    return true;
};

// Development Mode Check
// ----------------------
export const isDevelopment = () => {
    return APP_ENV === 'development';
};

// ===========================================
// Hinweise für die Verwendung:
// 1. Ersetze SUPABASE_URL und SUPABASE_ANON_KEY mit deinen eigenen Werten
// 2. Trage deine Google Analytics ID ein (optional)
// 3. Passe andere Einstellungen nach Bedarf an
// ===========================================

// Automatische Validierung beim Import
if (typeof window !== 'undefined' && isDevelopment()) {
    console.log(`🔧 ${APP_NAME} v${APP_VERSION} (${APP_ENV})`);
    validateConfig();
}
