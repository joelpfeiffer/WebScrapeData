let fullData = [];
let chart = null;

// --- 1. CSV-bestanden ophalen uit docs/data ---
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

// --- 2. Land geselecteerd ---
document.getElementById("landSelect").addEventListener("change", function () {
    loadCSV(this.value);
});

// --- 3. CSV inladen ---
function loadCSV(land) {
    const url = `https://raw.githubusercontent.com/joelpfeiffer/WebScrapeData/main/docs/data/${land}.csv`;

    fetch(url)
        .then(res => res.text())
        .then(text => {
            fullData = parseCSV(text);

            renderTable(fullData);
            updateChart(fullData);
        });
}

// --- CSV → dataset ---
function parseCSV(csv) {
    const rows = csv.trim().split("\n").map(r => r.split(","));
    const body = rows.slice(1);

    return body.map(r => ({
        date: r[0],
        E5: parseComma(r[1]),
        E10: parseComma(r[2]),
        Diesel: parseComma(r[3]),
        LPG: parseComma(r[4])
    }));
}

function parseComma(v) {
    return parseFloat(v.replace(",", "."));
}

// --- 4. Trendgrafiek ---
function updateChart(data) {
    const ctx = document.getElementById("trendChart").getContext("2d");

    if (chart) chart.destroy();

    chart = new Chart(ctx, {
        type: "line",
        data: {
            labels: data.map(d => d.date),
            datasets: [
                { label: "E5", borderColor: "#0078FF", data: data.map(d => d.E5), fill: false },
                { label: "E10", borderColor: "#FF8800", data: data.map(d => d.E10), fill: false },
                { label: "Diesel", borderColor: "#00AA00", data: data.map(d => d.Diesel), fill: false },
                { label: "LPG", borderColor: "#AA00AA", data: data.map(d => d.LPG), fill: false }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: { beginAtZero: false }
            }
        }
    });
}

// --- 5. Buttons voor datum-range ---
document.querySelectorAll("button[data-range]").forEach(btn => {
    btn.addEventListener("click", () => {
        document.querySelectorAll("button[data-range]").forEach(b => b.classList.remove("active"));
        btn.classList.add("active");

        let range = btn.getAttribute("data-range");

        if (range === "all") {
            updateChart(fullData);
            renderTable(fullData);
            return;
        }

        const days = parseInt(range);
        const filtered = fullData.slice(-days);

        updateChart(filtered);
        renderTable(filtered);
    });
});

// --- 6. Tabel ---
function renderTable(data) {
    const output = document.getElementById("output");

    let html = "<table>";
    html += "<tr><th>Datum</th><th>E5</th><th>E10</th><th>Diesel</th><th>LPG</th></tr>";

    data.forEach(r => {
        html += `
        <tr>
            <td>${r.date}</td>
            <td>${r.E5}</td>
            <td>${r.E10}</td>
            <td>${r.Diesel}</td>
            <td>${r.LPG}</td>
        </tr>`;
    });

    html += "</table>";
    output.innerHTML = html;
}
``
