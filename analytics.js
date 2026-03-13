// Analytics Module using Chart.js

const Analytics = {
    chartWait: null,
    chartMeals: null,
    maxDataPoints: 50,
    startTime: Date.now(),

    // Initialize Charts
    init: function (ctxWait, ctxMeals, philosopherCount) {
        // Destroy existing if any (on reset)
        if (this.chartWait) this.chartWait.destroy();
        if (this.chartMeals) this.chartMeals.destroy();

        this.startTime = Date.now();

        // 1. Wait Time Trend Chart (Line)
        this.chartWait = new Chart(ctxWait, {
            type: 'line',
            data: {
                labels: [],
                datasets: [{
                    label: 'Max Wait Time',
                    data: [],
                    borderColor: '#f59e0b', // Amber
                    backgroundColor: 'rgba(245, 158, 11, 0.1)',
                    borderWidth: 2,
                    tension: 0.4, // Smooth curves
                    fill: true
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: false },
                    title: { display: true, text: 'Max Wait Time Trend', color: '#9ca3af' }
                },
                scales: {
                    x: { display: false }, // Hide timestamps for clean look
                    y: {
                        beginAtZero: true,
                        grid: { color: 'rgba(255, 255, 255, 0.1)' },
                        ticks: { color: '#9ca3af' }
                    }
                },
                animation: { duration: 0 } // Performance optimization
            }
        });

        // 2. Meal Distribution Chart (Bar)
        // Generate labels P0, P1...
        const labels = Array.from({ length: philosopherCount }, (_, i) => `P${i}`);
        // Generate colors matching the philosophers
        const bgColors = CONFIG.colors.slice(0, philosopherCount);

        this.chartMeals = new Chart(ctxMeals, {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Meals Eaten',
                    data: new Array(philosopherCount).fill(0),
                    backgroundColor: bgColors,
                    borderWidth: 0,
                    borderRadius: 4
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: false },
                    title: { display: true, text: 'Fairness (Meals per Philosopher)', color: '#9ca3af' }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        grid: { color: 'rgba(255, 255, 255, 0.1)' },
                        ticks: { color: '#9ca3af' }
                    },
                    x: {
                        ticks: { color: '#9ca3af' },
                        grid: { display: false }
                    }
                },
                animation: { duration: 200 }
            }
        });
    },

    // Push new frame of data
    update: function (philosophers) {
        if (!this.chartWait || !this.chartMeals) return;

        // --- Update Wait Chart ---
        const maxWait = Math.max(0, ...philosophers.map(p => p.wait));
        const timeNow = ((Date.now() - this.startTime) / 1000).toFixed(1);

        this.chartWait.data.labels.push(timeNow);
        this.chartWait.data.datasets[0].data.push(maxWait);

        // Keep it scrolling
        if (this.chartWait.data.labels.length > this.maxDataPoints) {
            this.chartWait.data.labels.shift();
            this.chartWait.data.datasets[0].data.shift();
        }
        this.chartWait.update();

        // --- Update Meals Chart ---
        // We need to track meals per philosopher.
        // The simulation object 'philosophers' doesn't strictly track meals in the array?
        // Let's check chandy.js -> p.state="eating"; meals++. 
        // Ah, 'meals' is a global counter. We need per-philosopher counters.
        // FIX: I need to update the philosopher objects to track their own meals.

        // Assuming philosopher objects have a 'mealsEaten' property.
        // If not, I will add it to the simulation reset logic.
        const mealCounts = philosophers.map(p => p.mealsEaten || 0);

        this.chartMeals.data.datasets[0].data = mealCounts;
        this.chartMeals.update();

        // Calculate Fairness (Jain's Index)
        // Index = (Sum x_i)^2 / (n * Sum x_i^2)
        const n = mealCounts.length;
        const sum = mealCounts.reduce((a, b) => a + b, 0);
        const sumSq = mealCounts.reduce((a, b) => a + b * b, 0);

        let fairness = 1;
        if (sum > 0) {
            fairness = (sum * sum) / (n * sumSq);
        }

        // Update a DOM element if it exists
        const fairnessEl = document.getElementById('stat-fairness');
        if (fairnessEl) {
            fairnessEl.innerText = fairness.toFixed(2);
            // Color code
            fairnessEl.style.color = fairness > 0.9 ? '#10b981' : (fairness > 0.7 ? '#facc15' : '#ef4444');
        }
    }
};
