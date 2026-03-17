let fullData = [];
let chart = null;

// --- CSV's ophalen uit docs/data ---
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

// --- Land selectie handler ---
document.getElementById("landSelect").addEventListener("change", function () {
    loadCSV(this.value);
});

// --- CSV ophalen ---
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

// --- CSV parser ---
function parseCSV(csv) {
    const rows = csv.trim().split("\n").map(r => r.split(","));
    const body = rows.slice(1);

    return body.map(r => ({
        date: r[0],
        E5: parseFloat(r[1].replace(",", ".")),
        E10: parseFloat(r[2].replace(",", ".")),
        Diesel: parseFloat(r[3].replace(",", ".")),
        LPG: parseFloat(r[4].replace(",", "."))
    }));
}

// --- Grafiek tekenen ---
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
            maintainAspectRatio: false
        }
    });
}

// --- Range buttons ---
document.querySelectorAll("button[data-range]").forEach(btn => {
    btn.addEventListener("click", () => {
        // Active styling
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
