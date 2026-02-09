// assets/js/utils.js - Hilfsfunktionen

/**
 * Formatieren eines Datums
 */
export function formatDate(dateString) {
    const options = { day: '2-digit', month: '2-digit', year: 'numeric' };
    return new Date(dateString).toLocaleDateString('de-DE', options);
}

/**
 * Abkürzung für große Zahlen (1k, 1M, etc.)
 */
export function formatNumber(num) {
    if (num >= 1000000) {
        return (num / 1000000).toFixed(1) + 'M';
    }
    if (num >= 1000) {
        return (num / 1000).toFixed(1) + 'k';
    }
    return num.toString();
}

/**
 * Zufällige Verzögerung (für Demo-Zwecke)
 */
export function randomDelay(min = 300, max = 800) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

/**
 * Prüfen, ob heute aktualisiert
 */
export function isUpdatedToday(dateString) {
    const today = new Date().toDateString();
    const updateDate = new Date(dateString).toDateString();
    return today === updateDate;
}

/**
 * Debounce-Funktion für Suchleiste
 */
export function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}