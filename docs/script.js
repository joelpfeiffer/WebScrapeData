let chart = null;
let fullRows = [];
let currentRange = "all";
let currentLand = "nederland";

const alleLanden = [
    "nederland",
    "belgie",
    "duitsland",
    "frankrijk",
    "luxemburg",
    "zwitserland"
];

const colors = {
    "Diesel (B7)": "rgba(255, 159, 64, 1)",
    "E10": "rgba(54, 162, 235, 1)",
    "E5": "rgba(75, 192, 192, 1)",
    "Lpg": "rgba(153, 102, 255, 1)"
};

// CSV inladen voor gekozen land
function loadCSV(land) {
    currentLand = land;
    const csvPath = `data/${land}.csv`;

    Papa.parse(csvPath, {
        download: true,
        header: true,
        delimiter: ",",
        complete: (result) => {
            const rows = result.data.filter(r => r["Datum (ANWB)"]);

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

    laadLaatsteWaarden();
}

// Filtering
function applyFilter() {
    let filtered = fullRows;

    if (currentRange !== "all") {
        const cutoff = new Date(Date.now() - parseInt(currentRange) * 86400000);
        filtered = fullRows.filter(r => r.date >= cutoff);
    }

    drawChart(filtered);
}

// Grafiek tekenen
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

function setRange(days) {
    currentRange = days;
    applyFilter();
}

// LAATSTE WAARDEN TABEL
function laadLaatsteWaarden() {
    const tbody = document.querySelector("#latestTable tbody");
    tbody.innerHTML = "";

    alleLanden.forEach(land => {
        Papa.parse(`data/${land}.csv`, {
            download: true,
            header: true,
            delimiter: ",",
            complete: (result) => {
                const rows = result.data.filter(r => r["Datum (ANWB)"]);
                if (!rows.length) return;
                const last = rows[rows.length - 1];

                const tr = document.createElement("tr");
                tr.innerHTML = `
                    <td>${land}</td>
                    <td>${last["Datum (ANWB)"]}</td>
                    <td>${last["Diesel (B7)"]}</td>
                    <td>${last["E10"]}</td>
                    <td>${last["E5"]}</td>
                    <td>${last["Lpg"]}</td>
                `;
                tbody.appendChild(tr);
            }
        });
    });
}

// Event listener
document.getElementById("landSelect").addEventListener("change", e => loadCSV(e.target.value));

// Start
loadCSV("nederland");
``
