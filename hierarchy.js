// Resource Hierarchy Algorithm Logic

let N = 5;
let timer = null;
let philosophers = [];
let forks = [];
let meals = 0;

// Initialize
function initRH() {
    philosophers = [];
    forks = [];
    meals = 0;

    for (let i = 0; i < N; i++) {
        philosophers.push({
            id: i,
            state: "thinking", // thinking, hungry, eating
            wait: 0,
            hasLow: false,
            hasHigh: false,
            mealsEaten: 0
        });

        // Forks are shared resources. Fork i is between P(i) and P(i+1) usually?
        // Let's stick to standard: Fork i is between P(i) and P(next).
        // For RH, we need global numbering.
        forks.push({
            id: i,
            free: true
        });
    }

    updateUI();
    drawRH();
    setAction("Simulation initialized.");
}

const left = i => i;
const right = i => (i + N - 1) % N;

// Logic Step
function step() {
    // 1. Process Logic
    for (let i = 0; i < N; i++) {
        const p = philosophers[i];

        // Determine which forks are "Low" and "High" for this philosopher
        // Standard Circle: P(i) needs Fork(i) and Fork((i+N-1)%N)? 
        // Let's stick to the previous implementation's mapping:
        // left(i) = i; right(i) = (i+N-1)%N.
        // So P(i) needs Fork(i) and Fork(i-1).

        const f1 = left(i);
        const f2 = right(i);

        let low = Math.min(f1, f2);
        let high = Math.max(f1, f2);

        // Feature: Resource Order Toggle
        const isUnsafe = document.getElementById('param-order') && document.getElementById('param-order').checked;
        if (isUnsafe) {
            // Swap: Pick high then low
            // Logic below assumes "low" is first pick, "high" is second.
            // So to reverse order, we swap the definitions.
            const temp = low;
            low = high;
            high = temp;
        }

        // BECOME HUNGRY
        if (p.state === "thinking") {
            if (Math.random() < 0.3) {
                p.state = "hungry";
                p.wait = 0;
                setAction(`P${i} wants to eat`);
            }
        }

        // HUNGRY BEHAVIOR
        if (p.state === "hungry") {
            p.wait++;

            // Resource Hierarchy Rule: Must pick Low first, then High.

            // 1. Try to pick Low
            if (!p.hasLow) {
                if (forks[low].free) {
                    forks[low].free = false;
                    p.hasLow = true;
                    // No action text for single pickup to reduce noise? Or yes.
                    // setAction(`P${i} picks F${low}`);
                }
            }

            // 2. If has Low, Try to pick High
            if (p.hasLow && !p.hasHigh) {
                if (forks[high].free) {
                    forks[high].free = false;
                    p.hasHigh = true;

                    // Has both! Eat.
                    p.state = "eating";
                    meals++;
                    p.mealsEaten++;
                    setAction(`P${i} picks F${high} & eats`);
                }
            }
        } else if (p.state === "eating") {
            // EATING BEHAVIOR
            if (Math.random() < 0.5) {
                finishEating(i);
            }
        }
    }

    updateUI();
    // Analytics Hook
    Analytics.update(philosophers);
    drawRH();
}

function finishEating(pId) {
    const p = philosophers[pId];
    p.state = "thinking";

    // Release both
    const f1 = left(pId);
    const f2 = right(pId);

    forks[f1].free = true;
    forks[f2].free = true;

    p.hasLow = false;
    p.hasHigh = false;

    setAction(`P${pId} finished eating`);
}

// Visualization
function drawRH() {
    const table = document.getElementById('visual-table');
    table.innerHTML = '';

    // Draw Philosophers
    philosophers.forEach((p, i) => {
        const pos = getCircularPosition(i, N, CONFIG.radius);
        const el = createElement(`philosopher ${p.state}`,
            `P${i}<div class="state-label">${p.state}</div>`,
            { left: pos.x - 40 + 'px', top: pos.y - 40 + 'px' }
        );
        table.appendChild(el);
    });

    // Draw Forks
    forks.forEach((f, i) => {
        // Position forks. Standard circle.
        // Fork i should be visually near P(i).
        // To be between P(i) and P(i-1) (which is right neighbor), let's place it at angle i*step - step/2

        const step = 360 / N;
        // Fork i is conceptually between i and i-1? Or i and i+1?
        // Logic use left=i, right=i-1. 
        // So Fork i is needed by P(i) (Left) and P(i+1) (Right?? no P(i+1)'s right is i).
        // Yes, Fork i is between P(i) and P(next). No wait.

        // P(i) needs i and i-1.
        // P(0) needs 0 and 4.
        // P(1) needs 1 and 0.
        // So Fork 0 is shared by P(0) and P(1).
        // So Fork 0 should be between P(0) and P(1).

        // Visually: P(0) at -90deg. P(1) at -90 + step.
        // Fork 0 at -90 + step/2.

        const angle = (i * step - 90) + (step / 2); // Between i and i+1
        // Wait, if Fork 0 is shared by P(0) and P(1), its angle should be between them.

        const pos = getCircularPosition(i, N, CONFIG.radius * 0.6, (360 / N) / 2);

        const el = createElement(`fork ${f.free ? 'free' : 'held'}`, `F${i}`, {
            left: pos.x - 18 + 'px',
            top: pos.y - 18 + 'px'
        });

        // Add label for order
        if (f.free) el.style.backgroundColor = '#ccc'; // Grey if free? No, use class.

        table.appendChild(el);
    });
}

function updateUI() {
    updateStat("stat-meals", meals);
    updateStat("stat-wait", Math.max(0, ...philosophers.map(p => p.wait)));
}

// Controls
function applySettings() {
    const newN = parseInt(document.getElementById('param-n').value);
    if (newN >= 3 && newN <= 10) {
        N = newN;
        reset();
    }
}

function nextStep() {
    step();
}

function reset() {
    if (timer) clearInterval(timer);
    timer = null;
    initRH();
    const btn = document.getElementById('btn-play');
    if (btn) btn.innerHTML = '▶ Play Auto';
    // Reset Analytics
    if (typeof Analytics !== 'undefined' && Analytics.isInitialized()) {
        Analytics.reset(N);
    }
}

function toggleAuto() {
    const btn = document.getElementById('btn-play');
    if (timer) {
        clearInterval(timer);
        timer = null;
        btn.innerHTML = '▶ Play Auto';
    } else {
        const speed = 2100 - document.getElementById('param-speed').value;
        timer = setInterval(step, speed);
        btn.innerHTML = '⏸ Pause';
    }
}

// Boot
window.onload = function () {
    initRH();
    // Initialize Analytics
    const ctxWait = document.getElementById('chart-wait');
    const ctxMeals = document.getElementById('chart-meals');
    if (ctxWait && ctxMeals) {
        Analytics.init(ctxWait, ctxMeals, N);
    }
};
