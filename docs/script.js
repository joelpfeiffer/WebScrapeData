// Correct pad naar de CSV (GitHub Pages serveert /docs als root)
const csvPath = "data/nederland.csv";

// Grafiekkleuren
const colors = {
    "Diesel (B7)": "rgba(255, 159, 64, 1)",
    "E10": "rgba(54, 162, 235, 1)",
    "E5": "rgba(75, 192, 192, 1)",
    "Lpg": "rgba(153, 102, 255, 1)"
};

console.log("script.js geladen, CSV pad =", csvPath);

// CSV inladen en grafiek bouwen
Papa.parse(csvPath, {
    download: true,
    header: true,
    delimiter: ",",
    complete: function(result) {
        console.log("CSV geladen:", result);

        const rows = result.data.filter(r => r["Datum (ANWB)"]); // lege regels eruit
        const labels = rows.map(r => r["Datum (ANWB)"]);

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
    },
    error: function(err) {
        console.error("PapaParse fout:", err);
    }
});
