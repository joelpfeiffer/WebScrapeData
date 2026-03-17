let allCountryData = {};

/* -------------------------
   DARK MODE
--------------------------*/
document.getElementById("themeToggle").addEventListener("click", () => {
    const root = document.documentElement;
    const isDark = root.getAttribute("data-theme") === "dark";
    root.setAttribute("data-theme", isDark ? "light" : "dark");
});

/* -------------------------
   LANDEN LADEN
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
   MULTI-SELECT HANDLER
--------------------------*/
document.getElementById("landSelect").addEventListener("change", function () {
    const selected = [...this.selectedOptions].map(o => o.value);

    if (selected.length > 4) {
        alert("Je kunt maximaal 4 landen tegelijk kiezen.");
        this.selectedOptions[4].selected = false;
        return;
    }

    loadMultipleCountries(selected);
});

/* -------------------------
   CSV MULTI LOAD
--------------------------*/
function loadMultipleCountries(landen) {
    const promises = landen.map(land =>
        fetch(`https://raw.githubusercontent.com/joelpfeiffer/WebScrapeData/main/docs/data/${land}.csv`)
            .then(res => res.text())
            .then(text => {
                allCountryData[land] = parseCSV(text);
            })
    );

    Promise.all(promises).then(() => {
        updateTable(landen);
    });
}

/* -------------------------
   STRING → NUMMER
--------------------------*/
function toNumber(v) {
    if (!v) return null;

    v = v.replace(/"/g, "").trim();
    v = v.replace(/[^0-9.,-]/g, "");

    if (v.includes(",")) {
        v = v.replace(/,/g, ".");
    }

    const parts = v.split(".");
    if (parts.length > 2) {
        v = parts[0] + "." + parts.slice(1).join("");
    }

    return parseFloat(v);
}

/* -------------------------
   PARSE CSV (juiste kolomvolgorde)
--------------------------*/
function parseCSV(csv) {
    const rows = csv.trim().split("\n").map(r => r.split(","));
    const body = rows.slice(1);

    return body.map(r => ({
        date: r[0],
        Diesel: toNumber(r[1]), // ← kolom 1
        E10: toNumber(r[2]),    // ← kolom 2
        E5: toNumber(r[3]),     // ← kolom 3
        LPG: toNumber(r[4])     // ← kolom 4
    }));
}

/* -------------------------
   TABEL MAKEN
--------------------------*/
function updateTable(landen) {
    const tableDiv = document.getElementById("comparisonTable");
    tableDiv.innerHTML = "";

    if (landen.length === 0) {
        tableDiv.innerHTML = "<p>Geen landen geselecteerd.</p>";
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
        const data = allCountryData[land];
        const last = data[data.length - 1];

        html += `
            <tr>
                <td>${land.charAt(0).toUpperCase() + land.slice(1)}</td>
                <td>${last.date}</td>
                <td>${last.E5?.toFixed(3)}</td>
                <td>${last.E10?.toFixed(3)}</td>
                <td>${last.Diesel?.toFixed(3)}</td>
                <td>${last.LPG?.toFixed(3)}</td>
            </tr>
        `;
    });

    html += `</tbody></table>`;

    tableDiv.innerHTML = html;
}

/* -------------------------
   RANGE FILTERS
--------------------------*/
document.querySelectorAll("button[data-range]").forEach(btn => {
    btn.addEventListener("click", () => {

        document.querySelectorAll("button[data-range]")
            .forEach(b => b.classList.remove("active"));
        btn.classList.add("active");

        const range = btn.dataset.range;

        const selected = [...document.getElementById("landSelect").selectedOptions]
            .map(o => o.value);

        if (selected.length === 0) return;

        if (range === "all") {
            updateTable(selected);
            return;
        }

        const days = parseInt(range);

        const newData = {};

        selected.forEach(land => {
            const all = allCountryData[land];
            newData[land] = all.slice(-days);
        });

        // vervang globale data en update tabel
        allCountryData = { ...allCountryData, ...newData };

        updateTable(selected);
    });
});
