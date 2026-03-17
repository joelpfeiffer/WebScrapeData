/* ---------------------------------------
   DARK MODE SYNC
--------------------------------------- */
const root = document.documentElement;
const themeBtn = document.getElementById("themeToggle");

const savedTheme = localStorage.getItem("theme");
if (savedTheme) {
    root.setAttribute("data-theme", savedTheme);
    themeBtn.textContent =
        savedTheme === "dark" ? "☀️ Licht modus" : "🌙 Donkere modus";
}

themeBtn.addEventListener("click", () => {
    const isDark = root.getAttribute("data-theme") === "dark";
    const newTheme = isDark ? "light" : "dark";
    root.setAttribute("data-theme", newTheme);
    localStorage.setItem("theme", newTheme);
    themeBtn.textContent =
        newTheme === "dark" ? "☀️ Licht modus" : "🌙 Donkere modus";
});

/* ---------------------------------------
   HELPERS
--------------------------------------- */

function fmt(v) {
    return (typeof v === "number" && !isNaN(v)) ? v.toFixed(3) : "-";
}

function toNumber(v) {
    if (!v) return null;
    v = v.replace(/"/g, "").trim();
    v = v.replace(/[^0-9.,-]/g, "");
    if (v.includes(",")) v = v.replace(/,/g, ".");
    const parts = v.split(".");
    if (parts.length > 2) v = parts[0] + "." + parts.slice(1).join("");
    const num = parseFloat(v);
    return isNaN(num) ? null : num;
}

function parseCSV(txt) {
    const rows = txt.trim().split("\n").map(r => r.split(","));
    const body = rows.slice(1);

    return body.map(r => ({
        date: r[0] || "-",
        Diesel: toNumber(r[1]),
        E10: toNumber(r[2]),
        E5: toNumber(r[3]),
        LPG: toNumber(r[4])
    }));
}

// FIX: gebruik laatste geldige rij
function getLastValidRow(rows) {
    for (let i = rows.length - 1; i >= 0; i--) {
        const r = rows[i];
        if (r.E5 || r.E10 || r.Diesel || r.LPG) return r;
    }
    return { date: "-", E5: null, E10: null, Diesel: null, LPG: null };
}

/* ---------------------------------------
   FETCH LIST
--------------------------------------- */
let allCountryData = {};

fetch("https://raw.githubusercontent.com/joelpfeiffer/WebScrapeData/main/docs/data/index.json")
    .then(r => r.json())
    .then(list => {
        const sel = document.getElementById("multiCountry");
        list.forEach(file => {
            const land = file.replace(".csv", "");
            const o = document.createElement("option");
            o.value = land;
            o.textContent = land.charAt(0).toUpperCase() + land.slice(1);
            sel.appendChild(o);
        });
    });

/* ---------------------------------------
   HANDLE MULTI SELECT
--------------------------------------- */
document.getElementById("multiCountry").addEventListener("change", async function () {
    const selected = [...this.selectedOptions].map(o => o.value);

    if (selected.length > 4) {
        alert("Maximaal 4 landen tegelijk.");
        this.selectedOptions[4].selected = false;
        return;
    }

    const loaders = selected.map(land =>
        fetch(`https://raw.githubusercontent.com/joelpfeiffer/WebScrapeData/main/docs/data/${land}.csv`)
            .then(r => r.text())
            .then(txt => allCountryData[land] = parseCSV(txt))
    );

    await Promise.all(loaders);
    updateTable(selected);
});

/* ---------------------------------------
   RENDER TABLE
--------------------------------------- */
function updateTable(landen) {
    const div = document.getElementById("comparisonTable");
    div.innerHTML = "";

    if (landen.length === 0) {
        div.innerHTML = "<p>Geen landen geselecteerd.</p>";
        return;
    }

    let html = `
    <table>
        <thead>
            <tr>
                <th>Land</th>
                <th>Datum</th>
                <th>E5</th>
                <th>E10</th>
                <th>Diesel</th>
                <th>LPG</th>
            </tr>
        </thead>
        <tbody>
    `;

    landen.forEach(land => {
        const rows = allCountryData[land];
        const last = getLastValidRow(rows);

        html += `
        <tr>
            <td>${land.charAt(0).toUpperCase() + land.slice(1)}</td>
            <td>${last.date}</td>
            <td>${fmt(last.E5)}</td>
            <td>${fmt(last.E10)}</td>
            <td>${fmt(last.Diesel)}</td>
            <td>${fmt(last.LPG)}</td>
        </tr>
        `;
    });

    html += "</tbody></table>";
    div.innerHTML = html;
}
