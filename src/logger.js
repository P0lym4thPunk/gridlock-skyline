/**
 * logger.js
 * Robust runtime error capture system for GRIDLOCK: SKYLINE.
 * Captures errors and displays them on-screen for instant diagnosis.
 */

export function initLogger() {
    // Create the debug overlay
    const consoleEl = document.createElement('div');
    consoleEl.id = 'debug-console';
    consoleEl.style.cssText = `
        position: fixed;
        top: 10px;
        left: 10px;
        width: 400px;
        max-height: 300px;
        background: rgba(0, 0, 0, 0.85);
        color: #ff4444;
        font-family: 'Courier New', Courier, monospace;
        font-size: 12px;
        padding: 10px;
        border-radius: 5px;
        border: 1px solid #ff0000;
        z-index: 9999;
        overflow-y: auto;
        pointer-events: auto;
        display: none;
        box-shadow: 0 0 15px rgba(255, 0, 0, 0.3);
    `;

    const copyBtn = document.createElement('button');
    copyBtn.textContent = 'COPY LOGS';
    copyBtn.style.cssText = `
        display: block;
        margin-bottom: 10px;
        background: #ff4444;
        color: white;
        border: none;
        padding: 5px 10px;
        cursor: pointer;
        font-family: inherit;
        font-weight: bold;
        border-radius: 3px;
    `;

    const logContainer = document.createElement('div');
    logContainer.id = 'debug-log-container';

    consoleEl.appendChild(copyBtn);
    consoleEl.appendChild(logContainer);
    document.body.appendChild(consoleEl);

    const logs = [];

    const addLog = (msg, type = 'ERROR') => {
        consoleEl.style.display = 'block';
        const timestamp = new Date().toLocaleTimeString();
        const entry = `[${timestamp}] [${type}] ${msg}`;
        logs.push(entry);

        const div = document.createElement('div');
        div.style.marginBottom = '5px';
        div.style.borderBottom = '1px solid rgba(255,0,0,0.2)';
        div.textContent = entry;
        logContainer.appendChild(div);

        // Auto-scroll to bottom
        consoleEl.scrollTop = consoleEl.scrollHeight;
    };

    copyBtn.onclick = () => {
        const fullLog = logs.join('\\n');
        navigator.clipboard.writeText(fullLog).then(() => {
            const originalText = copyBtn.textContent;
            copyBtn.textContent = 'COPIED!';
            setTimeout(() => copyBtn.textContent = originalText, 2000);
        });
    };

    // Override console.error
    const originalError = console.error;
    console.error = (...args) => {
        addLog(args.join(' '));
        originalError.apply(console, args);
    };

    // Override console.warn
    const originalWarn = console.warn;
    console.warn = (...args) => {
        addLog(args.join(' '), 'WARN');
        originalWarn.apply(console, args);
    };

    // Global Error Listeners
    window.addEventListener('error', (event) => {
        const msg = `Uncaught Error: ${event.message} at ${event.filename}:${event.lineno}`;
        addLog(msg);
    });

    window.addEventListener('unhandledrejection', (event) => {
        addLog(`Unhandled Promise Rejection: ${event.reason}`);
    });

    console.log('Debug Logger initialized.');
}

export function logDebug(msg) {
    // Standard debug log that doesn't necessarily trigger the red overlay
    console.log(`[DEBUG] ${msg}`);
}
