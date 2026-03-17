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

    return body.reverse().map(r => ({
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

    const hasMultiple = data.length > 1;

    chart = new Chart(ctx, {
        type: "line",
        data: {
            labels: data.map(d => d.date),
            datasets: [
                makeDataset("E5", "#0078FF", data.map(d => d.E5), hasMultiple),
                makeDataset("E10", "#FF8800", data.map(d => d.E10), hasMultiple),
                makeDataset("Diesel", "#00AA00", data.map(d => d.Diesel), hasMultiple),
                makeDataset("LPG", "#AA00AA", data.map(d => d.LPG), hasMultiple),
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false
        }
    });
}

function makeDataset(label, color, values, hasMultiple) {
    return {
        label: label,
        data: values,
        borderColor: color,
        backgroundColor: color,
        fill: false,
        tension: 0.3,
        showLine: hasMultiple,         // <— dit zorgt dat een lijn pas verschijnt als er 2+ punten zijn
        pointRadius: 5,                // <— maakt de punten zichtbaar (ook bij maar 1 datapunt!)
        pointHoverRadius: 7
    };
}

// --- Range buttons ---
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
``
