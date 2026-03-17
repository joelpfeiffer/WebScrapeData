// 1. Haal alle CSV-bestanden op uit docs/data
fetch("https://api.github.com/repos/joelpfeiffer/WebScrapeData/contents/docs/data")
    .then(res => res.json())
    .then(files => {
        const select = document.getElementById("landSelect");
        select.innerHTML = ""; // leegmaken

        files
            .filter(f => f.name.endsWith(".csv"))
            .forEach(f => {
                const land = f.name.replace(".csv", "");
                const opt = document.createElement("option");
                opt.value = land;
                opt.textContent =
                    land.charAt(0).toUpperCase() + land.slice(1);
                select.appendChild(opt);
            });
    });

// 2. Bij land-selectie → CSV ophalen
document.getElementById("landSelect").addEventListener("change", function () {
    const land = this.value;

    const url =
        `https://raw.githubusercontent.com/joelpfeiffer/WebScrapeData/main/docs/data/${land}.csv`;

    fetch(url)
        .then(res => res.text())
        .then(csv => {
            const rows = csv.trim().split("\n").map(r => r.split(","));
            renderTable(rows);
        });
});

// 3. CSV → HTML tabel
function renderTable(rows) {
    let html = "<table>";
    rows.forEach((row, index) => {
        html += "<tr>";
        row.forEach(col => {
            html += index === 0
                ? `<th>${col}</th>`
                : `<td>${col}</td>`;
        });
        html += "</tr>";
    });
    html += "</table>";

    document.getElementById("output").innerHTML = html;
}
