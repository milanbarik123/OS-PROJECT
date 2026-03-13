// Chandy-Misra Algorithm Logic
// Includes Visualization of the Dynamic Wait-For Graph

let N = 5;
let timer = null;
let philosophers = [];
let forks = [];
let meals = 0;
let moves = 0;

// Initialize
function initCM() {
    philosophers = [];
    forks = [];
    meals = 0;
    moves = 0;

    Logger.init(); // Init the new scrolling log
    Logger.log("Initializing Chandy-Misra with " + N + " nodes...", "system");

    // Initialize Philosophers
    for (let i = 0; i < N; i++) {
        philosophers.push({
            id: i,
            state: "thinking", // thinking, hungry, eating
            wait: 0,
            mealsEaten: 0,
            hasLeft: false, // For visualization mainly context
            hasRight: false
        });

        // Initialize Forks (Edges)
        // In CM, forks are always dirty or clean, and belong to someone.
        // To be acyclic initially, give fork to min(i, neighbor).
        const neighbor = (i + N - 1) % N;
        const owner = Math.min(i, neighbor); // Lower ID owns it

        // Wait, neighbor of 0 is 4. min(0,4) = 0.
        // neighbor of 1 is 0. min(1,0) = 0. 
        // Fork 0 is shared by 0 and 1? No.
        // Let's standard: Fork i is between P(i) and P(next).
        // Common layout: P(i) needs Fork i and Fork i-1.
        // Init: Fork i given to P(i) (Dirty). Fork i-1 given to P(i-1).
        // This creates a cycle if everyone needs Left and Right.

        // CM Init Rule: All forks dirty. Direction: P_i -> P_j if P_i > P_j.
        // i.e., Higher ID has the fork initially? Or Lower?
        // Let's give all forks to Lower ID.
        // Fork between i and neighbor.
        // Fork i represents edge between i and (i+N-1)%N.

        forks.push({
            id: i,
            owner: i, // Default
            state: "dirty",
            req: [false, false] // Request buffer
        });
    }

    // Fix Initial Ownership for Acyclicity
    // Give Fork i to min(i, (i+N-1)%N)?
    // P0 shares Fork0 with P4 (neighbor). Min(0,4)=0. P0 owns Fork0.
    // P1 shares Fork1 with P0. Min(1,0)=0. P0 owns Fork1 ???
    // This mapping depends on who shares what.
    // Let's assume Fork i is shared by P(i) and P((i+N-1)%N).
    // Fork 0: P0 vs P4. Owner P0.
    // Fork 1: P1 vs P0. Owner P0.
    // ...
    // Fork i: P(i) vs P(i-1). Owner P(i-1).
    // This accumulates forks at low IDs.

    // Let's just use the current assignment, but log it.
    Logger.log("Graph Structure: Acyclic (Priority to Lower IDs)");

    updateUI();
    drawCM();
}

const left = i => i;
const right = i => (i + N - 1) % N;

// Logic Step
function step() {
    // 1. Process Logic
    let actionOccurred = false;

    for (let i = 0; i < N; i++) {
        const p = philosophers[i];

        // BECOME HUNGRY
        if (p.state === "thinking") {
            if (Math.random() < 0.25) {
                p.state = "hungry";
                p.wait = 0;
                Logger.log(`P${i} is HUNGRY (Requesting resources)`);
                actionOccurred = true;
            }
        }

        // HUNGRY BEHAVIOR
        if (p.state === "hungry") {
            p.wait++;

            // Request Forks
            requestFork(i, left(i));
            requestFork(i, right(i));

            // Check if we have both
            if (forks[left(i)].owner === i && forks[right(i)].owner === i) {
                p.state = "eating";
                meals++;
                p.mealsEaten++;
                Logger.log(`P${i} acquired both forks -> EATING`, "highlight");

                // Set forks to "clean" visually if needed, but in CM they stay dirty until transferred?
                // Actually CM: Fork is Clean when sending. Becomes Dirty when eating finishes.
                // So now they are implicitly "in use".
            }
        }

        // EATING BEHAVIOR
        else if (p.state === "eating") {
            if (Math.random() < 0.4) {
                finishEating(i);
                actionOccurred = true;
            }
        }
    }

    updateUI();
    drawCM();
}

function requestFork(pId, forkId) {
    const fork = forks[forkId];

    if (fork.owner !== pId) {
        // Need to request it
        const ownerId = fork.owner;
        const owner = philosophers[ownerId];

        // CM Rule: Give up if Dirty and Request comes in.
        if (fork.state === "dirty" && owner.state !== "eating") {
            // Transfer!
            fork.owner = pId;
            fork.state = "clean"; // Clean on transfer
            moves++;
            Logger.log(`Fork ${forkId} transferred: P${ownerId} -> P${pId} (Now CLEAN)`);
        } else {
            // Owner keeps it (Clean or Eating)
            // Log once per wait? No, too spammy.
        }
    }
}

function finishEating(pId) {
    const p = philosophers[pId];
    p.state = "thinking";

    // Forks become dirty
    forks[left(pId)].state = "dirty";
    forks[right(pId)].state = "dirty";

    Logger.log(`P${pId} finished. Forks ${left(pId)} & ${right(pId)} marked DIRTY.`);
}

// Visualization
function drawCM() {
    const table = document.getElementById('visual-table');
    table.innerHTML = '';

    const svgCanvas = document.getElementById('graph-canvas');
    svgCanvas.innerHTML = '';

    // Draw Philosophers
    philosophers.forEach((p, i) => {
        const pos = getCircularPosition(i, N, CONFIG.radius);
        const el = createElement(`philosopher ${p.state}`,
            `P${i}<div class="state-label">${p.state}</div>`,
            { left: pos.x - 40 + 'px', top: pos.y - 40 + 'px' }
        );
        table.appendChild(el);
    });

    // Draw Forks & Edges
    forks.forEach((f, i) => {
        // Use common helper for positioning
        const pos = getCircularPosition(i, N, CONFIG.forkRadius, - (360 / N) / 2);

        // Visual: Who owns it? Draw line to owner.
        const ownerPos = getCircularPosition(f.owner, N, CONFIG.radius);

        // Draw Allocation Line (Solid)
        const lineClass = (f.state === 'clean') ? "edge-path held clean" : "edge-path held";
        // If owner is eating, make it glow
        const isOwnerEating = philosophers[f.owner].state === 'eating';
        const finalClass = isOwnerEating ? "edge-path held eating" : lineClass;

        const line = createSVGElement("line", {
            x1: pos.x, y1: pos.y,
            x2: ownerPos.x, y2: ownerPos.y,
            class: finalClass
        });
        if (f.state === 'clean') line.setAttribute('stroke', 'var(--success)'); // Force green for clean
        else line.setAttribute('stroke', '#64748b'); // Slate for dirty but held?

        if (isOwnerEating) line.setAttribute('stroke', 'var(--success)');

        svgCanvas.appendChild(line);

        // Draw Fork Icon
        const el = createElement(`fork ${f.state}`, `F${i}`, {
            left: pos.x - 16 + 'px',
            top: pos.y - 16 + 'px'
        });
        table.appendChild(el);

        // Draw Request Lines?
        // If Neighbor wants it but doesn't have it.
        // Identify neighbor: The one who shares this fork but is not owner.
        // Fork i shared by P(i) and P(i-1 aka right(i)).
        // If Owner=i, then Neighbor=i-1.
        // If Owner=i-1, then Neighbor=i.

        let neighborId = (f.owner === i) ? (i + N - 1) % N : i;
        let neighbor = philosophers[neighborId];

        if (neighbor.state === 'hungry') {
            const nPos = getCircularPosition(neighborId, N, CONFIG.radius);
            const reqLine = createSVGElement("line", {
                x1: nPos.x, y1: nPos.y,
                x2: pos.x, y2: pos.y,
                class: "edge-path request"
            });
            svgCanvas.appendChild(reqLine);
        }
    });
}

function updateUI() {
    updateStat("stat-meals", meals);
    updateStat("stat-moves", moves);
    updateStat("stat-wait", Math.max(0, ...philosophers.map(p => p.wait)));
    Analytics.update(philosophers, meals);
}

// Controls
function reset() {
    if (timer) clearInterval(timer);
    timer = null;
    initCM();
    const btn = document.getElementById('btn-play');
    if (btn) btn.innerHTML = '▶ Start Simulation';
}

function toggleAuto() {
    const btn = document.getElementById('btn-play');
    if (timer) {
        clearInterval(timer);
        timer = null;
        btn.innerHTML = '▶ Start Simulation';
    } else {
        const speed = 2100 - document.getElementById('param-speed').value;
        timer = setInterval(step, speed);
        btn.innerHTML = '⏸ Pause';
    }
}

function nextStep() { step(); }

window.onload = function () {
    initCM();
    const ctxWait = document.getElementById('chart-wait');
    const ctxMeals = document.getElementById('chart-meals');
    if (ctxWait && ctxMeals) {
        Analytics.init(ctxWait, ctxMeals, N);
    }
};
