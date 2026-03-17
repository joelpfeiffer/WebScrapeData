let fullData = [];
let chart = null;

/* ---------------------------------------
   DARK MODE
--------------------------------------- */
const root = document.documentElement;
const toggle = document.getElementById("themeToggle");

toggle.addEventListener("click", () => {
    const isDark = root.getAttribute("data-theme") === "dark";
    root.setAttribute("data-theme", isDark ? "light" : "dark");
    toggle.textContent = isDark ? "🌙 Dark Mode" : "☀️ Light Mode";
    if (chart) chart.update();
});

/* ---------------------------------------
   LANDEN LADEN
--------------------------------------- */
fetch("https://raw.githubusercontent.com/joelpfeiffer/WebScrapeData/main/docs/data/index.json")
    .then(res => res.json())
    .then(list => {
        const select = document.getElementById("landSelect");
        select.innerHTML = "";

        list.forEach(file => {
            const land = file.replace(".csv", "");
            const opt = document.createElement("option");
            opt.value = land;
            opt.textContent = land.charAt(0).toUpperCase() + land.slice(1);
            select.appendChild(opt);
        });
    });

document.getElementById("landSelect").addEventListener("change", function () {
    loadCSV(this.value);
});

/* ---------------------------------------
   CSV LADEN
--------------------------------------- */
function loadCSV(land) {
    const url = `https://raw.githubusercontent.com/joelpfeiffer/WebScrapeData/main/docs/data/${land}.csv`;

    fetch(url)
        .then(res => res.text())
        .then(text => {
            fullData = parseCSV(text);
            updateChart(fullData);
        });
}

/* ---------------------------------------
   STRING NAAR NUMMER
--------------------------------------- */
function toNumber(v) {
    if (!v) return null;
    v = v.replace(/"/g, "").trim();
    v = v.replace(/[^0-9.,-]/g, "");
    if (v.includes(",")) v = v.replace(/,/g, ".");
    let parts = v.split(".");
    if (parts.length > 2) v = parts[0] + "." + parts.slice(1).join("");
    return parseFloat(v);
}

/* ---------------------------------------
   CSV PARSER
--------------------------------------- */
function parseCSV(csv) {
    const rows = csv.trim().split("\n").map(r => r.split(","));
    const body = rows.slice(1);

    return body.map(r => ({
        date: r[0],
        E5: toNumber(r[1]),
        E10: toNumber(r[2]),
        Diesel: toNumber(r[3]),
        LPG: toNumber(r[4])
    }));
}

/* ---------------------------------------
   CANVAS HARDE RESET
--------------------------------------- */
function resetCanvas() {
    const old = document.getElementById("trendChart");
    const parent = old.parentNode;
    old.remove();

    const canvas = document.createElement("canvas");
    canvas.id = "trendChart";
    canvas.width = 700;
    canvas.height = 350;
    parent.appendChild(canvas);
}

/* ---------------------------------------
   DATASET MAKER
--------------------------------------- */
function dataset(label, color, data) {
    return {
        label,
        data,
        borderColor: color,
        backgroundColor: color,
        tension: 0.3,
        fill: false,
        spanGaps: true,                      // ★★★ FIX: geen gaten, geen rare render
        cubicInterpolationMode: 'monotone',  // ★★★ FIX: smooth & stabiel bij 1 punt
        pointRadius: 6,
        pointHoverRadius: 8,
        borderWidth: 2
    };
}

/* ---------------------------------------
   UPDATE CHART
--------------------------------------- */
function updateChart(data) {
    resetCanvas();

    const ctx = document.getElementById("trendChart").getContext("2d");

    // schaal bepalen
    const maxValue = Math.max(
        ...data.map(d => d.E5),
        ...data.map(d => d.E10),
        ...data.map(d => d.Diesel),
        ...data.map(d => d.LPG)
    );

    const yMax = maxValue + 0.2;

    chart = new Chart(ctx, {
        type: "line",
        data: {
            labels: data.map(d => d.date),
            datasets: [
                dataset("E5", "#0078FF", data.map(d => d.E5)),
                dataset("E10", "#FF8800", data.map(d => d.E10)),
                dataset("Diesel", "#00AA00", data.map(d => d.Diesel)),
                dataset("LPG", "#AA00AA", data.map(d => d.LPG))
            ]
        },
        options: {
            responsive: false,
            maintainAspectRatio: false,

            scales: {
                y: {
                    min: 0,
                    max: yMax,
                    ticks: { stepSize: 0.1, precision: 2 }
                }
            },

            plugins: {
                legend: {
                    position: "bottom",
                    labels: {
                        boxWidth: 12,
                        boxHeight: 12,
                        font: { size: 12 }
                    }
                }
            }
        }
    });
}

/* ---------------------------------------
   RANGE FILTERS
--------------------------------------- */
document.querySelectorAll("button[data-range]").forEach(btn => {
    btn.addEventListener("click", () => {
        document.querySelectorAll("button[data-range]").forEach(b => b.classList.remove("active"));
        btn.classList.add("active");

        const range = btn.dataset.range;

        if (range === "all") {
            updateChart(fullData);
            return;
        }

        updateChart(fullData.slice(-parseInt(range)));
    });
});
