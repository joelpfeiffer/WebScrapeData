let fullData = [];
let chart = null;

/* -------------------------
   DARK MODE
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
   LOAD COUNTRIES LIST
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

document.getElementById("landSelect").addEventListener("change", function () {
    loadCSV(this.value);
});

/* -------------------------
   LOAD CSV
--------------------------*/
function loadCSV(land) {
    const url =
        `https://raw.githubusercontent.com/joelpfeiffer/WebScrapeData/main/docs/data/${land}.csv`;

    fetch(url)
        .then(res => res.text())
        .then(text => {
            fullData = parseCSV(text);
            updateChart(fullData);
        });
}

/* -------------------------
   PARSE PRICE STRING
--------------------------*/
function toNumber(v) {
    if (!v) return null;
    v = v.replace(/"/g, "").trim();
    v = v.replace(/[^0-9.,-]/g, "");
    if (v.includes(",")) v = v.replace(/,/g, ".");
    const parts = v.split(".");
    if (parts.length > 2) v = parts[0] + "." + parts.slice(1).join("");
    return parseFloat(v);
}

/* -------------------------
   PARSE CSV
--------------------------*/
function parseCSV(csv) {
    const rows = csv.trim().split("\n").map(r => r.split(","));
    const body = rows.slice(1);

    const data = body.map(r => ({
        date: r[0],
        E5: toNumber(r[1]),
        E10: toNumber(r[2]),
        Diesel: toNumber(r[3]),
        LPG: toNumber(r[4])
    }));

    return data;
}

/* -------------------------
   FIX: Duplicate datapoint if only 1 exists
--------------------------*/
function fixOnePointData(data) {
    if (data.length === 1) {
        const d = data[0];
        return [d, { ...d }];
    }
    return data;
}

/* -------------------------
   DATASET BUILDER
--------------------------*/
function dataset(label, color, values) {
    return {
        label,
        data: values,
        borderColor: color,
        backgroundColor: color,
        fill: false,
        tension: 0.3,
        showLine: true,      // ALWAYS draw a line
        pointRadius: 5,
        pointHoverRadius: 8,
        borderWidth: 2
    };
}

/* -------------------------
   UPDATE CHART
--------------------------*/
function updateChart(dataRaw) {

    // FIX: ALWAYS ensure 2 points
    const data = fixOnePointData(dataRaw);

    const ctx = document.getElementById("trendChart").getContext("2d");
    if (chart) chart.destroy();

    const maxValue = Math.max(
        ...data.map(d => d.E5 || 0),
        ...data.map(d => d.E10 || 0),
        ...data.map(d => d.Diesel || 0),
        ...data.map(d => d.LPG || 0)
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

/* -------------------------
   RANGE BUTTONS
--------------------------*/
document.querySelectorAll("button[data-range]").forEach(btn => {
    btn.addEventListener("click", () => {

        document.querySelectorAll("button[data-range]")
            .forEach(b => b.classList.remove("active"));

        btn.classList.add("active");

        const range = btn.getAttribute("data-range");

        if (range === "all") {
            updateChart(fullData);
            return;
        }

        const days = parseInt(range);
        updateChart(fullData.slice(-days));
    });
});
