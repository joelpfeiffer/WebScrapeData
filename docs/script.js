let chart = null;
let fullData = null;   // Ongefilterde data
let fullLabels = null; // Ongefilterde labels
let currentLand = "nederland";
let currentRange = "all";

const colors = {
    "Diesel (B7)": "rgba(255, 159, 64, 1)",
    "E10": "rgba(54, 162, 235, 1)",
    "E5": "rgba(75, 192, 192, 1)",
    "Lpg": "rgba(153, 102, 255, 1)"
};

// --- Land CSV laden ---
function loadCSV(land) {
    currentLand = land;
    const csvPath = `data/${land}.csv`;

    Papa.parse(csvPath, {
        download: true,
        header: true,
        delimiter: ",",
        complete: (result) => {
            const rows = result.data.filter(r => r["Datum (ANWB)"]);

            fullLabels = rows.map(r => r["Datum (ANWB)"]);
            fullData = rows;

            applyFilter();
        }
    });
}

// --- Datum filter ---
function applyFilter() {
    if (!fullData) return;

    const today = new Date();

    let filteredRows = fullData;
    let filteredLabels = fullLabels;

    if (currentRange !== "all") {
        const days = parseInt(currentRange);
        const cutoff = new Date(today.getTime() - days * 24 * 60 * 60 * 1000);

        filteredRows = fullData.filter((r, i) => {
            const [day, month, year] = fullLabels[i].split("-").map(Number);
            const d = new Date(year, month - 1, day);
            return d >= cutoff;
        });

        filteredLabels = filteredRows.map(r => r["Datum (ANWB)"]);
    }

    drawChart(filteredRows, filteredLabels);
}

// --- Grafiek tekenen ---
function drawChart(rows, labels) {
    const fuels = ["Diesel (B7)", "E10", "E5", "Lpg"];

    const datasets = fuels.map(fuel => ({
        label: fuel,
        data: rows.map(r => parseFloat((r[fuel] || "0").replace(",", "."))),
        borderColor: colors[fuel],
        borderWidth: 2,
        fill: false,
        tension: 0.2
    }));

    const ctx = document.getElementById("fuelChart").getContext("2d");

    if (chart) chart.destroy();

    chart = new Chart(ctx, {
        type: "line",
        data: { labels, datasets },
        options: {
            responsive: true,
            scales: {
                y: { title: { display: true, text: "Prijs (€/L)" } },
                x: { title: { display: true, text: "Datum" } }
            }
        }
    });
}

// --- Knoppen handler ---
function setRange(range) {
    currentRange = range;
    applyFilter();
}

// --- Land selecteren ---
document.getElementById("landSelect").addEventListener("change", function () {
    loadCSV(this.value);
});

// Start met Nederland
loadCSV("nederland");
