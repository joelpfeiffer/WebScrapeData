let chart = null;
let fullRows = [];    // alle rijen met data + datum als object
let currentLand = "nederland";
let currentRange = "all";

// Brandstofkleuren
const colors = {
    "Diesel (B7)": "rgba(255, 159, 64, 1)",
    "E10": "rgba(54, 162, 235, 1)",
    "E5": "rgba(75, 192, 192, 1)",
    "Lpg": "rgba(153, 102, 255, 1)"
};

// --- CSV INLADEN ---
function loadCSV(land) {
    currentLand = land;
    const csvPath = `data/${land}.csv`;

    Papa.parse(csvPath, {
        download: true,
        header: true,
        delimiter: ",",
        complete: (result) => {
            const rows = result.data.filter(r => r["Datum (ANWB)"]);

            // Zet CSV datum om naar JS datumobject
            fullRows = rows.map(r => {
                const [day, month, year] = r["Datum (ANWB)"].split("-").map(Number);
                return {
                    date: new Date(year, month - 1, day),
                    label: r["Datum (ANWB)"],
                    "Diesel (B7)": parseFloat(r["Diesel (B7)"].replace(",", ".")),
                    "E10": parseFloat(r["E10"].replace(",", ".")),
                    "E5": parseFloat(r["E5"].replace(",", ".")),
                    "Lpg": parseFloat(r["Lpg"].replace(",", "."))
                };
            });

            applyFilter();
        }
    });
}

// --- FILTER OP TIJD ---
function applyFilter() {
    let filtered = fullRows;

    if (currentRange !== "all") {
        const days = parseInt(currentRange);
        const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

        filtered = fullRows.filter(r => r.date >= cutoff);
    }

    drawChart(filtered);
}

// --- GRAFIEK TEKENEN ---
function drawChart(rows) {
    const labels = rows.map(r => r.label);

    const fuels = ["Diesel (B7)", "E10", "E5", "Lpg"];
    const datasets = fuels.map(fuel => ({
        label: fuel,
        data: rows.map(r => r[fuel]),
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

// --- RANGE-KNOP handler ---
function setRange(range) {
    currentRange = range;
    applyFilter();
}

// --- LAND-WISSEL handler ---
document.getElementById("landSelect").addEventListener("change", function () {
    loadCSV(this.value);
});

// Start met Nederland
loadCSV("nederland");
