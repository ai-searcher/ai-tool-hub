// assets/js/utils.js - HILFSFUNKTIONEN

// Funktion 1: Datum formatieren
export function formatDate(dateString) {
    if (!dateString) return '';
    const date = new Date(dateString);
    const options = { day: '2-digit', month: '2-digit', year: 'numeric' };
    return date.toLocaleDateString('de-DE', options);
}

// Funktion 2: Große Zahlen kürzen (1.000 = 1k)
export function formatNumber(num) {
    if (num >= 1000000) {
        return (num / 1000000).toFixed(1) + 'M';
    }
    if (num >= 1000) {
        return (num / 1000).toFixed(1) + 'k';
    }
    return num.toString();
}

// Funktion 3: Benachrichtigung anzeigen (wichtig!)
export function showNotification(message, type = 'info') {
    console.log(`[${type}] ${message}`);
    
    // Einfache Browser-Benachrichtigung
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.textContent = message;
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: ${type === 'success' ? 'green' : type === 'error' ? 'red' : 'blue'};
        color: white;
        padding: 12px 24px;
        border-radius: 8px;
        z-index: 10000;
        font-family: sans-serif;
    `;
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
        if (notification.parentNode) {
            notification.parentNode.removeChild(notification);
        }
    }, 3000);
}

// Funktion 4: Text kürzen
export function truncateText(text, maxLength = 100) {
    if (!text) return '';
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
}

// Funktion 5: Uhrzeit formatieren
export function formatTime(date) {
    return date.toLocaleTimeString('de-DE', {
        hour: '2-digit',
        minute: '2-digit'
    });
}

// Weitere Hilfsfunktionen
export function randomDelay(min = 300, max = 800) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

export function isUpdatedToday(dateString) {
    const today = new Date().toDateString();
    const updateDate = new Date(dateString).toDateString();
    return today === updateDate;
}

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

// Platzhalter-Funktionen für die App
export function updateUIAfterVote() {
    console.log("UI würde jetzt aktualisiert werden");
}

export function getRandomItems(array, count) {
    return array.slice(0, count);
}

export function sortByProperty(array, property) {
    return array.sort((a, b) => a[property] - b[property]);
}

// Alias für formatNumber
export function abbreviateNumber(num) {
    return formatNumber(num);
}