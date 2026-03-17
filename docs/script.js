// Pad naar de CSV in de repo
const csvPath = "../data/nederland.csv";

console.log("script.js is geladen!");


// Grafiekkleuren
const colors = {
    "Diesel (B7)": "rgba(255, 159, 64, 1)",
    "E10": "rgba(54, 162, 235, 1)",
    "E5": "rgba(75, 192, 192, 1)",
    "Lpg": "rgba(153, 102, 255, 1)"
};

// CSV inladen en parsen
Papa.parse(csvPath, {
    download: true,
    header: true,
    delimiter: ",",
    complete: function(result) {
        const rows = result.data;

        // Datum + datasets opbouwen
        const labels = rows.map(r => r["Datum (ANWB)"]);

        const datasets = [
            "Diesel (B7)",
            "E10",
            "E5",
            "Lpg"
        ].map(fuel => ({
            label: fuel,
            data: rows.map(r => parseFloat(r[fuel].replace(",", "."))),
            borderColor: colors[fuel],
            fill: false,
            tension: 0.2
        }));

        // Grafiek tekenen
        const ctx = document.getElementById("fuelChart").getContext("2d");

        new Chart(ctx, {
            type: "line",
            data: {
                labels: labels,
                datasets: datasets
            },
            options: {
                responsive: true,
                scales: {
                    y: {
                        title: {
                            display: true,
                            text: "Prijs (€/L)"
                        }
                    },
                    x: {
                        title: {
                            display: true,
                            text: "Datum"
                        }
                    }
                }
            }
        });
    }
});
