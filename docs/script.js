let fullData = [];
let chart = null;

/* -------------------------
   DARK MODE TOGGLE
--------------------------*/
const root = document.documentElement;
const toggle = document.getElementById("themeToggle");

toggle.addEventListener("click", () => {
    const isDark = root.getAttribute("data-theme") === "dark";
    root.setAttribute("data-theme", isDark ? "light" : "dark");
    toggle.textContent = isDark ? "🌙 Dark Mode" : "☀️ Light Mode";
    if (chart) chart.update();
});

/* -------------------------
   LOAD CSV LIST FROM docs/data/index.json
--------------------------*/
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

/* -------------------------
   WHEN SELECT CHANGES → LOAD CSV
--------------------------*/
document.getElementById("landSelect").addEventListener("change", function () {
    loadCSV(this.value);
});

/* -------------------------
   LOAD INDIVIDUAL CSV FILE
--------------------------*/
function loadCSV(land) {
    const url = `https://raw.githubusercontent.com/joelpfeiffer/WebScrapeData/main/docs/data/${land}.csv`;

    fetch(url)
        .then(res => res.text())
        .then(text => {
            fullData = parseCSV(text);
            updateChart(fullData);
        });
}

/* -------------------------
   CONVERT ANY PRICE STRING TO FLOAT
--------------------------*/
function toNumber(v) {
    if (!v) return null;

    v = v.replace(/"/g, "").trim();
    v = v.replace(/[^0-9.,-]/g, "");

    // comma → dot
    if (v.includes(",")) {
        v = v.replace(/,/g, ".");
    }

    // safety: reduce multiple dots
    const parts = v.split(".");
    if (parts.length > 2) {
        v = parts[0] + "." + parts.slice(1).join("");
    }

    return parseFloat(v);
}

/* -------------------------
   PARSE CSV → ARRAY
--------------------------*/
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

/* -------------------------
   CREATE A DATASET
--------------------------*/
function dataset(label, color, values, showLine) {
    return {
        label,
        data: values,
        borderColor: color,
        backgroundColor: color,
        fill: false,
        tension: 0.3,
        showLine: showLine,
        pointRadius: 5,
        pointHoverRadius: 7
    };
}

/* -------------------------
   DRAW TREND CHART
--------------------------*/
function updateChart(data) {
    const ctx = document.getElementById("trendChart").getContext("2d");

    if (chart) chart.destroy();

    // ❗ FIX ZOOM PROBLEM:
    // Bepaal de grootste waarde van dit land en bouw de y-as daaromheen
    const maxValue = Math.max(
        ...data.map(d => d.E5 || 0),
        ...data.map(d => d.E10 || 0),
        ...data.map(d => d.Diesel || 0),
        ...data.map(d => d.LPG || 0)
    );

    const yMax = maxValue + 0.20; // beetje marge
    const multiple = data.length > 1;

    chart = new Chart(ctx, {
        type: "line",
        data: {
            labels: data.map(d => d.date),
            datasets: [
                dataset("E5", "#0078FF", data.map(d => d.E5), multiple),
                dataset("E10", "#FF8800", data.map(d => d.E10), multiple),
                dataset("Diesel", "#00AA00", data.map(d => d.Diesel), multiple),
                dataset("LPG", "#AA00AA", data.map(d => d.LPG), multiple)
            ]
        },
        options: {
            responsive: false,
            maintainAspectRatio: false,
            scales: {
                y: {
                    beginAtZero: true,
                    suggestedMax: yMax,
                    ticks: {
                        stepSize: 0.1
                    }
                }
            }
        }
    });
}

/* -------------------------
   DATE RANGE BUTTONS
--------------------------*/
document.querySelectorAll("button[data-range]").forEach(btn => {
    btn.addEventListener("click", () => {
        document.querySelectorAll("button[data-range]").forEach(b => b.classList.remove("active"));
        btn.classList.add("active");

        let range = btn.getAttribute("data-range");

        if (range === "all") {
            updateChart(fullData);
            return;
        }

        const days = parseInt(range);
        const filtered = fullData.slice(-days);
        updateChart(filtered);
    });
});
``
