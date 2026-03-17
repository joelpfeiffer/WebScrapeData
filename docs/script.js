// --- Lijst van alle landen (voor de tabel) ---
const alleLanden = [
    "nederland",
    "belgie",
    "duitsland",
    "frankrijk",
    "luxemburg",
    "zwitserland"
];

// Tabel opbouwen met laatste waarden
function laadLaatsteWaarden() {
    const tbody = document.querySelector("#latestTable tbody");
    tbody.innerHTML = ""; // leegmaken

    alleLanden.forEach(land => {
        const csvPath = `data/${land}.csv`;

        Papa.parse(csvPath, {
            download: true,
            header: true,
            delimiter: ",",
            complete: (result) => {
                const rows = result.data.filter(r => r["Datum (ANWB)"]);
                if (rows.length === 0) return;

                const laatste = rows[rows.length - 1];

                const tr = document.createElement("tr");
                tr.innerHTML = `
                    <td>${land.charAt(0).toUpperCase() + land.slice(1)}</td>
                    <td>${laatste["Datum (ANWB)"]}</td>
                    <td>${laatste["Diesel (B7)"]}</td>
                    <td>${laatste["E10"]}</td>
                    <td>${laatste["E5"]}</td>
                    <td>${laatste["Lpg"]}</td>
                `;
                tbody.appendChild(tr);
            }
        });
    });
}

// Laad de tabel wanneer de pagina opent
laadLaatsteWaarden();
