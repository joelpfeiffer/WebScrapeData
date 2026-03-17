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

    // Remove quotes and spaces
    value = value.replace(/"/g, "").trim();

    // Remove all characters except digits, dot, comma
    value = value.replace(/[^0-9.,]/g, "");

    // Convert comma decimal → dot
    if (value.includes(",")) {
        value = value.replace(",", ".");
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
