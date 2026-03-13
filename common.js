// Common constants and utilities

const CONFIG = {
    center: 300,        // Matches the 600x600 table-surface
    radius: 220,        // Philosophers circle
    philosopherRadius: 40,
    forkRadius: 180,    // Forks inner circle
    colors: ["#ef4444", "#f59e0b", "#10b981", "#3b82f6", "#8b5cf6", "#ec4899", "#06b6d4", "#84cc16", "#d946ef", "#6366f1"]
};

// --- LOGGING SYSTEM ---
// --- LOGGING SYSTEM ---
const Logger = {
    init: function () {
        const container = document.getElementById('log-container');
        if (container) container.innerHTML = 'System Ready';
    },

    log: function (text, type = "info") {
        const container = document.getElementById('log-container');
        if (!container) return;

        // Overwrite content - SINGLE LINE STATUS
        container.innerHTML = text;
        container.className = ""; // Reset class to re-trigger if needed

        // Add specific class for coloring text based on event type
        if (type === 'error') container.style.color = "var(--danger)";
        else if (type === 'highlight') container.style.color = "var(--primary)";
        else if (type === 'warning') container.style.color = "var(--warning)";
        else if (type === 'system') container.style.color = "var(--accent)";
        else container.style.color = "var(--text-main)";

        // Optional: Simple animation to show update
        container.style.opacity = '0.5';
        setTimeout(() => container.style.opacity = '1', 50);
    }
};

// --- GEOMETRY & SVG HELPERS ---

function getCircularPosition(index, total, radius, offsetDeg = 0) {
    const angleRad = (index * (360 / total) - 90 + offsetDeg) * (Math.PI / 180);
    return {
        x: CONFIG.center + radius * Math.cos(angleRad),
        y: CONFIG.center + radius * Math.sin(angleRad),
        angle: angleRad
    };
}

// Create SVG element (line, path, etc)
function createSVGElement(type, attrs = {}) {
    const el = document.createElementNS("http://www.w3.org/2000/svg", type);
    for (const [key, value] of Object.entries(attrs)) {
        el.setAttribute(key, value);
    }
    return el;
}

// Update an existing SVG line
function updateSVGLine(el, x1, y1, x2, y2, colorClass = null) {
    el.setAttribute("x1", x1);
    el.setAttribute("y1", y1);
    el.setAttribute("x2", x2);
    el.setAttribute("y2", y2);
    if (colorClass) {
        // Clear previous classes ensuring 'edge-path' remains
        el.setAttribute("class", `edge-path ${colorClass}`);
    }
}

// Helper to update specific stat
function updateStat(id, value) {
    const el = document.getElementById(id);
    if (el) el.innerText = value;
}

// UI Helper: Set Action Log (Legacy support + Logger bridge)
function setAction(text) {
    // We can pipe this to our new Logger
    // Logger.log(text); 
    // But we probably want more structured logs from the app itself

    // Legacy single line update if needed
    const el = document.getElementById("actionText");
    if (el) {
        el.innerText = text;
        el.style.opacity = '1';
        setTimeout(() => el.style.opacity = '0.7', 500);
    }
}

// DOM Helper
function createElement(className, content = '', styles = {}) {
    const el = document.createElement('div');
    el.className = className;
    el.innerHTML = content;
    Object.assign(el.style, styles);
    return el;
}
