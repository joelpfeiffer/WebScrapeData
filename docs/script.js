let fullData = [];
let chart = null;

/* ---------------------------------------
   DARK MODE + SYNC
--------------------------------------- */
const root = document.documentElement;
const themeBtn = document.getElementById("themeToggle");

// apply saved theme
const savedTheme = localStorage.getItem("theme");
if (savedTheme) {
    root.setAttribute("data-theme", savedTheme);
    themeBtn.textContent = savedTheme === "dark" ? "☀️ Licht modus" : "🌙 Donkere modus";
}

themeBtn.addEventListener("click", () => {
    const isDark = root.getAttribute("data-theme") === "dark";
    const newTheme = isDark ? "light" : "dark";
    root.setAttribute("data-theme", newTheme);
    localStorage.setItem("theme", newTheme);
    themeBtn.textContent = newTheme === "dark" ? "☀️ Licht modus" : "🌙 Donkere modus";
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
   PRICE PARSER
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
        Diesel: toNumber(r[1]),
        E10: toNumber(r[2]),
        E5: toNumber(r[3]),
        LPG: toNumber(r[4])
    }));
}

/* ---------------------------------------
   CANVAS RESET
--------------------------------------- */
function resetCanvas() {
    const old = document.getElementById("trendChart");
    const parent = old.parentNode;
    old.remove();

    const canvas = document.createElement("canvas");
    canvas.id = "trendChart";
    canvas.width = 900;
    canvas.height = 400;

    parent.appendChild(canvas);
}

/* ---------------------------------------
   UPDATE CHART
--------------------------------------- */
function updateChart(data) {

    resetCanvas();
    const ctx = document.getElementById("trendChart").getContext("2d");

    const maxValue = Math.max(
        ...data.map(d => d.E5),
        ...data.map(d => d.E10),
        ...data.map(d => d.Diesel),
        ...data.map(d => d.LPG)
    );

    const yMax = maxValue + 0.15;

    chart = new Chart(ctx, {
        type: "line",
        data: {
            labels: data.map(d => d.date),
            datasets: [
                {label:"E5", borderColor:"#0078FF", data:data.map(d=>d.E5), tension:0.2},
                {label:"E10", borderColor:"#FF8800", data:data.map(d=>d.E10), tension:0.2},
                {label:"Diesel", borderColor:"#00AA00", data:data.map(d=>d.Diesel), tension:0.2},
                {label:"LPG", borderColor:"#AA00AA", data:data.map(d=>d.LPG), tension:0.2},
            ]
        },
        options: {
            responsive: false,
            maintainAspectRatio: false,
            scales: {
                y: {
                    min: 0,
                    max: yMax,
                    ticks: { precision: 2 }
                }
            },
            plugins: {
                legend: { position: "bottom" }
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

        const days = parseInt(range);
        updateChart(fullData.slice(-days));
    });
});
