// Deadlock Sandbox & Framework Logic
// Supports Creation, Detection, Prevention, and Recovery strategies

let N = 5;
let timer = null;
let philosophers = [];
let forks = [];
let isDeadlocked = false;
let arbitratorAvailable = 0; // For Arbitrator solution

// Theme Definitions - UPDATED WITH ICONS
const THEMES = {
    classic: {
        agent: "Philosopher",
        resource: "Fork",
        action: "Eating",
        idle: "Thinking",
        wait: "Hungry",
        die: "gave up",
        // Icons
        resourceIcon: "🍴",
        stateIcons: {
            thinking: "🤔",
            hungry: "🤤",
            eating: "🍝",
            deadlocked: "😵"
        },
        resourceIcons: ["🍴", "🍴", "🍴", "🍴", "🍴"]
    },
    os: {
        agent: "Process",
        resource: "Device",
        action: "IO Exec",
        idle: "Computing",
        wait: "Blocked",
        die: "rolled back",
        resourceIcon: "💾",
        stateIcons: {
            thinking: "⚙️",
            hungry: "⚠️",
            eating: "⚡",
            deadlocked: "🚫"
        },
        resourceIcons: ["🖨️", "🖱️", "💾", "💿", "📼"]
    }
};

function initDeadlock() {
    philosophers = [];
    forks = [];
    isDeadlocked = false;
    arbitratorAvailable = N - 1; // Allow N-1 to eat at once
    Logger.init();

    // Check global init mode from dedicated pages
    const modeSelect = document.getElementById('param-mode');
    if (window.INITIAL_MODE && modeSelect) {
        modeSelect.value = window.INITIAL_MODE;
    }

    const themeKey = document.getElementById('param-theme') ? document.getElementById('param-theme').value : 'classic';
    const terms = THEMES[themeKey];

    Logger.log(`Framework Init: ${terms.agent}s ready.`, "system");

    for (let i = 0; i < N; i++) {
        philosophers.push({
            id: i,
            state: "thinking",
            wait: 0,
            hasLeft: false,
            hasRight: false,
            timestamp: Date.now() + i, // Older = smaller ID usually, but here just init
            startTime: 0 // Track wait time for timeout
        });

        forks.push({
            id: i,
            holder: null
        });
    }

    resetUI();
    drawScene();
}

function resetUI() {
    const status = document.getElementById('status-indicator');
    const coffman = document.getElementById('coffman-list');
    if (status) {
        status.innerHTML = "● SYSTEM ACTIVE";
        status.style.color = "var(--success)";
    }
    if (coffman) coffman.style.display = 'none';
    if (document.getElementById('graph-canvas')) {
        document.getElementById('graph-canvas').innerHTML = '';
    }
}

function step() {
    if (isDeadlocked) return;

    // Detection Layer
    const deadlockedNodes = detectCycleDFS();
    if (deadlockedNodes.length > 0) {
        const mode = document.getElementById('param-mode').value;
        if (mode !== 'timeout' && mode !== 'waitdie') {
            triggerDeadlockVisuals(deadlockedNodes);
            return;
        }
    }

    const mode = document.getElementById('param-mode').value;
    const themeKey = document.getElementById('param-theme').value;
    const terms = THEMES[themeKey];

    // Shuffle order
    const indices = Array.from({ length: N }, (_, i) => i).sort(() => Math.random() - 0.5);

    for (let i of indices) {
        const p = philosophers[i];

        // 1. IDLE -> WAIT
        if (p.state === "thinking") {
            if (Math.random() < 0.2) {
                // Arbitrator Check
                if (mode === 'arbitrator') {
                    if (arbitratorAvailable > 0) {
                        arbitratorAvailable--;
                        p.state = "hungry";
                        p.startTime = Date.now();
                        Logger.log(`${terms.agent} ${i} Asked Butler -> Granted.`);
                    }
                } else {
                    p.state = "hungry";
                    p.startTime = Date.now();
                    Logger.log(`${terms.agent} ${i} is ${terms.wait}.`);
                }
            }
        }

        // 2. WAIT BEHAVIOR
        if (p.state === "hungry") {
            p.wait++;

            // Timeout Check
            if (mode === 'timeout') {
                const elapsed = Date.now() - p.startTime;
                if (elapsed > 4000) {
                    Logger.log(`${terms.agent} ${i} TIMEOUT! Retrying...`, "warning");
                    releaseResources(i);
                    p.state = "thinking";
                    continue;
                }
            }

            const leftForkId = i;
            const rightForkId = (i + N - 1) % N;

            // Logic
            if (mode === 'naive' || mode === 'arbitrator' || mode === 'timeout') {
                if (!p.hasLeft && forks[leftForkId].holder === null) {
                    forks[leftForkId].holder = i;
                    p.hasLeft = true;
                }

                if (p.hasLeft && !p.hasRight) {
                    if (forks[rightForkId].holder === null) {
                        forks[rightForkId].holder = i;
                        p.hasRight = true;
                    }
                }
            }
            else if (mode === 'waitdie') {
                const leftOwner = forks[leftForkId].holder;
                const rightOwner = forks[rightForkId].holder;

                if (!p.hasLeft) {
                    if (leftOwner === null) { forks[leftForkId].holder = i; p.hasLeft = true; }
                    else if (leftOwner !== i) {
                        if (i < leftOwner) { Logger.log(`P${i} (Old) waits.`); }
                        else {
                            Logger.log(`P${i} (Young) dies.`, "warning");
                            releaseResources(i); p.state = "thinking"; continue;
                        }
                    }
                }
                if (p.hasLeft && !p.hasRight) {
                    if (rightOwner === null) { forks[rightForkId].holder = i; p.hasRight = true; }
                    else if (rightOwner !== i) {
                        if (i < rightOwner) { }
                        else {
                            Logger.log(`P${i} (Young) dies.`, "warning");
                            releaseResources(i); p.state = "thinking"; continue;
                        }
                    }
                }
            }
            else if (mode === 'ordered') {
                const f1 = Math.min(leftForkId, rightForkId);
                const f2 = Math.max(leftForkId, rightForkId);
                const hasF1 = (forks[f1].holder === i);
                const hasF2 = (forks[f2].holder === i);

                if (!hasF1 && forks[f1].holder === null) { forks[f1].holder = i; }
                else if (hasF1 && !hasF2 && forks[f2].holder === null) { forks[f2].holder = i; }

                if (forks[leftForkId].holder === i) p.hasLeft = true;
                if (forks[rightForkId].holder === i) p.hasRight = true;
            }

            if (p.hasLeft && p.hasRight) {
                p.state = "eating";
                Logger.log(`${terms.agent} ${i} starts ${terms.action}.`, "highlight");
            }
        }
        else if (p.state === "eating") {
            if (Math.random() < 0.3) {
                finishEating(i);
                if (mode === 'arbitrator') { arbitratorAvailable++; }
            }
        }
    }
    drawScene();
}

function releaseResources(pId) {
    const p = philosophers[pId];
    if (forks[pId].holder === pId) forks[pId].holder = null;
    const rightId = (pId + N - 1) % N;
    if (forks[rightId].holder === pId) forks[rightId].holder = null;
    p.hasLeft = false;
    p.hasRight = false;
}

function finishEating(pId) {
    const p = philosophers[pId];
    p.state = "thinking";
    releaseResources(pId);
    const themeKey = document.getElementById('param-theme').value;
    const terms = THEMES[themeKey];
    Logger.log(`${terms.agent} ${pId} finished.`, "system");
}

function detectCycleDFS() {
    const adj = Array.from({ length: N }, () => []);
    for (let i = 0; i < N; i++) {
        const p = philosophers[i];
        if (p.state === 'hungry') {
            const leftId = i;
            const rightId = (i + N - 1) % N;
            if (!p.hasLeft && forks[leftId].holder !== null && forks[leftId].holder !== i) { adj[i].push(forks[leftId].holder); }
            if (!p.hasRight && forks[rightId].holder !== null && forks[rightId].holder !== i) { adj[i].push(forks[rightId].holder); }
        }
    }
    const visited = new Array(N).fill(0);
    const stack = [];
    function dfs(u) {
        visited[u] = 1; stack.push(u);
        for (let v of adj[u]) {
            if (visited[v] === 1) return true;
            else if (visited[v] === 0) { if (dfs(v)) return true; }
        }
        visited[u] = 2; stack.pop(); return false;
    }
    const waitingCount = philosophers.filter(p => p.state === 'hungry').length;
    if (waitingCount < 2) return [];
    for (let i = 0; i < N; i++) {
        if (visited[i] === 0) { if (dfs(i)) return stack.slice(); }
    }
    return [];
}

function triggerDeadlockVisuals(nodes) {
    isDeadlocked = true;
    if (timer) clearInterval(timer);
    Logger.log(`⚠ DEADLOCK! Cycle: [${nodes.join('->')}]`, "error");
    const status = document.getElementById('status-indicator');
    status.innerHTML = "⚠ DEADLOCK CYCLE FOUND";
    status.style.color = "var(--danger)";
    document.getElementById('coffman-list').style.display = 'block';
    philosophers.forEach(p => { if (nodes.includes(p.id)) p.state = 'deadlocked'; });
    drawScene();
}

function drawScene() {
    const table = document.getElementById('visual-table');
    table.innerHTML = '';
    const svgCanvas = document.getElementById('graph-canvas');
    svgCanvas.innerHTML = '';

    const themeKey = document.getElementById('param-theme').value;
    const terms = THEMES[themeKey];

    // 1. Draw Philosophers
    philosophers.forEach((p, i) => {
        const pos = getCircularPosition(i, N, CONFIG.radius);
        let stateClass = p.state;

        // Icon Selection
        const iconInfo = terms.stateIcons[p.state] || terms.stateIcons['thinking'];

        let displayContent = `<div style="font-size:2rem;">${iconInfo}</div>`;
        if (themeKey === 'os') {
            displayContent = `<div style="font-size:1.5rem;">${iconInfo}</div><div style="font-size:0.7rem; margin-top:5px;">P${i}</div>`;
        } else {
            displayContent = `<div style="font-size:2rem;">${iconInfo}</div><div class="state-label">P${i}</div>`;
        }

        let borderStyle = "2px solid rgba(0,0,0,0.1)";
        if (p.state === 'deadlocked') borderStyle = "4px solid var(--danger)";
        if (p.state === 'eating') borderStyle = "2px solid var(--primary)";

        const el = createElement(`philosopher ${stateClass}`, displayContent, {
            left: pos.x - 40 + 'px',
            top: pos.y - 40 + 'px',
            border: borderStyle,
            background: '#ffffff'
        });
        table.appendChild(el);
    });

    // 2. Draw Forks (Resources) with Movement
    forks.forEach((f, i) => {
        // Default Pos
        let pos = getCircularPosition(i, N, CONFIG.forkRadius, - (360 / N) / 2);

        // IF HELD, MOVE TO OWNER'S HAND
        if (f.holder !== null) {
            const ownerPos = getCircularPosition(f.holder, N, CONFIG.radius);

            // Logic: Is it Left or Right?
            // Fork i is Left of P(i)
            // Fork i is Right of P(i+1) (which is (i+N-1)%N logic inverse)
            // If f.holder == i, it's Left hand.
            if (f.holder === i) {
                // Left Hand
                pos = { x: ownerPos.x - 30, y: ownerPos.y + 10 };
            } else {
                // Right Hand
                pos = { x: ownerPos.x + 30, y: ownerPos.y + 10 };
            }
        }

        let icon = (themeKey === 'os') ? terms.resourceIcons[i] : terms.resourceIcon;

        const el = createElement(`fork ${f.holder !== null ? 'held' : 'free'}`,
            `<div style="font-size:1.4rem;">${icon}</div>`,
            {
                left: (pos.x - 20) + 'px',
                top: (pos.y - 20) + 'px',
                width: '40px', height: '40px',
                background: 'transparent', border: 'none',
                zIndex: 20 // Above philosopher
            }
        );
        table.appendChild(el);

        // 3. Draw Request Lines (Only if waiting)
        const leftId = i;
        const rightId = (i + 1) % N;
        const pLeft = philosophers[leftId];
        const pRight = philosophers[rightId];

        // P(i) needs Fork(i) [Left]
        // Only draw line if NOT held (waiting)
        if (pLeft.state === 'hungry' && !pLeft.hasLeft && forks[leftId].id === i && forks[leftId].holder !== i) {
            const pPos = getCircularPosition(leftId, N, CONFIG.radius);
            createRequestLine(pPos, pos, svgCanvas);
        }
        // P(i+1) needs Fork(i) [Right]
        if (pRight.state === 'hungry' && !pRight.hasRight && forks[leftId].id === i && forks[leftId].holder !== rightId) {
            const pPos = getCircularPosition(rightId, N, CONFIG.radius);
            createRequestLine(pPos, pos, svgCanvas);
        }
    });
}
function createRequestLine(pPos, fPos, canvas) {
    const line = createSVGElement("line", {
        x1: pPos.x, y1: pPos.y, x2: fPos.x, y2: fPos.y, class: "edge-path request"
    });
    canvas.appendChild(line);
}
function changeTheme() { reset(); }
function changeMode() { reset(); }
function toggleAuto() {
    const btn = document.getElementById('btn-play');
    if (timer) { clearInterval(timer); timer = null; btn.innerHTML = '▶ Start'; } else {
        const speed = 2100 - document.getElementById('param-speed').value;
        timer = setInterval(step, speed); btn.innerHTML = '⏸ Pause';
    }
}
function nextStep() { step(); }
function reset() {
    if (timer) clearInterval(timer); timer = null; initDeadlock(); document.getElementById('btn-play').innerHTML = '▶ Start';
}
window.onload = initDeadlock;
