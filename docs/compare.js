/* ---------------------------------------
   DARK MODE SYNC (werkt samen met index.html)
--------------------------------------- */
const root = document.documentElement;
const themeBtn = document.getElementById("themeToggle");

// thema laden
const savedTheme = localStorage.getItem("theme");
if (savedTheme) {
    root.setAttribute("data-theme", savedTheme);
    themeBtn.textContent =
        savedTheme === "dark" ? "☀️ Licht modus" : "🌙 Donkere modus";
}

// thema switchen
themeBtn.addEventListener("click", () => {
    const isDark = root.getAttribute("data-theme") === "dark";
    const newTheme = isDark ? "light" : "dark";
    root.setAttribute("data-theme", newTheme);
    localStorage.setItem("theme", newTheme);
    themeBtn.textContent =
        newTheme === "dark" ? "☀️ Licht modus" : "🌙 Donkere modus";
});

/* ---------------------------------------
   MEERDERE LANDEN DATA
--------------------------------------- */
let allCountryData = {};

/* ---------------------------------------
   HELPERS
--------------------------------------- */

// veilige formatter voor prijzen (geen crash bij Servië)
function fmt(v) {
    return (typeof v === "number" && !isNaN(v)) ? v.toFixed(3) : "-";
}

// €‑waarde parser
function toNumber(v) {
    if (!v) return null;

    v = v.replace(/"/g, "").trim();
    v = v.replace(/[^0-9.,-]/g, "");

    if (v.includes(",")) v = v.replace(/,/g, ".");

    const parts = v.split(".");
    if (parts.length > 2) {
        v = parts[0] + "." + parts.slice(1).join("");
    }

    const num = parseFloat(v);
    return isNaN(num) ? null : num;
}

// CSV parser volgens jouw CSV structuur
function parseCSV(txt) {
    const rows = txt.trim().split("\n").map(r => r.split(","));
    const body = rows.slice(1);

    return body.map(r => ({
        date: r[0],
        Diesel: toNumber(r[1]),
        E10:    toNumber(r[2]),
        E5:     toNumber(r[3]),
        LPG:    toNumber(r[4])
    }));
}

/* ---------------------------------------
   LANDEN LIJST LADEN
--------------------------------------- */
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
   SELECTIE HANDLER
--------------------------------------- */
document.getElementById("multiCountry").addEventListener("change", async function() {

    const selected = [...this.selectedOptions].map(o => o.value);

    // maximaal 4 landen
    if (selected.length > 4) {
        alert("Je kunt maximaal 4 landen tegelijk selecteren.");
        this.selectedOptions[4].selected = false;
        return;
    }

    // CSV's ophalen
    const fetchTasks = selected.map(land =>
        fetch(`https://raw.githubusercontent.com/joelpfeiffer/WebScrapeData/main/docs/data/${land}.csv`)
            .then(r => r.text())
            .then(txt => {
                allCountryData[land] = parseCSV(txt);
            })
    );

    await Promise.all(fetchTasks);

    updateTable(selected);
});

/* ---------------------------------------
   TABEL GENEREREN
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
        const list = allCountryData[land];
        const last = list[list.length - 1];

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
``
