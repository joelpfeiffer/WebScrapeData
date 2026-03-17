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
   LOAD CSV LIST (FROM docs/data/)
--------------------------*/
fetch("https://api.github.com/repos/joelpfeiffer/WebScrapeData/contents/docs/data")
    .then(res => res.json())
    .then(files => {
        const select = document.getElementById("landSelect");
        select.innerHTML = "";

        files
            .filter(f => f.name.endsWith(".csv"))
            .forEach(f => {
                const land = f.name.replace(".csv", "");
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
   LOAD INDIVIDUAL CSV
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
   CLEAN + PARSE NUMERIC VALUES
--------------------------*/
function toNumber(value) {
    if (!value) return null;

    value = value.replace(/"/g, "").trim();
    value = value.replace(/[^0-9.,-]/g, "");

    if (value.includes(",")) {
        value = value.replace(/,/g, ".");
    }

    return parseFloat(value);
}

/* -------------------------
   PARSE WHOLE CSV FILE
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
   DRAW TREND CHART
--------------------------*/
function updateChart(data) {
    const ctx = document.getElementById("trendChart").getContext("2d");

    if (chart) chart.destroy();

    const multiple = data.length > 1;

    chart = new Chart(ctx, {
        type: "line",
        data: {
            labels: data.map(d => d.date),
            datasets: [
                dataset("E5", "#0078FF", data.map(d => d.E5), multiple),
                dataset("E10", "#FF8800", data.map(d => d.E10), multiple),
                dataset("Diesel", "#00AA00", data.map(d => d.Diesel), multiple),
                dataset("LPG", "#AA00AA", data.map(d => d.LPG), multiple),
            ]
        },
        options: {
            responsive: false,
            maintainAspectRatio: false
        }
    });
}

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
   DATE RANGE FILTER BUTTONS
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
