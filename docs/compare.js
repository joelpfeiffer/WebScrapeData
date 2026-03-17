/* ---------------------------------------
   DARK MODE SYNC
--------------------------------------- */
const root = document.documentElement;
const themeBtn = document.getElementById("themeToggle");

const savedTheme = localStorage.getItem("theme");
if (savedTheme) {
    root.setAttribute("data-theme", savedTheme);
    themeBtn.textContent = savedTheme === "dark" ? "☀️ Licht modus" : "🌙 Donkere modus";
}

themeBtn.addEventListener("click", () => {
    const isDark = root.getAttribute("data-theme") === "dark";
    const newTheme = isDark ? "light" : "dark";
    root.setAttribute("data-theme", newTheme);
    localStorage.setItem("theme", newTheme);
    themeBtn.textContent = newTheme === "dark" ? "☀️ Licht modus" : "🌙 Donkere modus";
});

/* ---------------------------------------
   MEERDERE LANDEN LADEN
--------------------------------------- */
let allCountryData = {};

function toNumber(v) {
    if (!v) return null;
    v = v.replace(/"/g, "").trim();
    v = v.replace(/[^0-9.,]/g, "");
    if (v.includes(",")) v = v.replace(/,/g, ".");
    let p = v.split(".");
    if (p.length > 2) v = p[0]+"."+p.slice(1).join("");
    return parseFloat(v);
}

function parseCSV(txt) {
    const rows = txt.trim().split("\n").map(r=>r.split(","));
    const body = rows.slice(1);

    return body.map(r => ({
        date: r[0],
        Diesel: toNumber(r[1]),
        E10: toNumber(r[2]),
        E5: toNumber(r[3]),
        LPG: toNumber(r[4])
    }));
}

fetch("https://raw.githubusercontent.com/joelpfeiffer/WebScrapeData/main/docs/data/index.json")
    .then(r=>r.json())
    .then(list=>{
        const s=document.getElementById("multiCountry");
        list.forEach(file=>{
            const land=file.replace(".csv","");
            const o=document.createElement("option");
            o.value=land;
            o.textContent=land.charAt(0).toUpperCase()+land.slice(1);
            s.appendChild(o);
        });
    });

document.getElementById("multiCountry").addEventListener("change", async function(){
    const sel=[...this.selectedOptions].map(o=>o.value);

    const fetches = sel.map(land =>
        fetch(`https://raw.githubusercontent.com/joelpfeiffer/WebScrapeData/main/docs/data/${land}.csv`)
            .then(r=>r.text())
            .then(txt => allCountryData[land] = parseCSV(txt))
    );

    await Promise.all(fetches);
    updateTable(sel);
});

/* ---------------------------------------
   TABEL GENEREREN
--------------------------------------- */
function updateTable(landen){

    const div=document.getElementById("comparisonTable");
    div.innerHTML="";

    if(landen.length===0){
        div.innerHTML="<p>Geen landen geselecteerd.</p>";
        return;
    }

    let html = `
    <table>
        <thead>
            <tr>
                <th>Land</th>
                <th>Datum</th>
                <th>E5</th>
                <th>E10</th>
                <th>Diesel</th>
                <th>LPG</th>
            </tr>
        </thead>
        <tbody>
    `;

    landen.forEach(land=>{
        const d=allCountryData[land];
        const last=d[d.length-1];

        html += `
        <tr>
            <td>${land.charAt(0).toUpperCase()+land.slice(1)}</td>
            <td>${last.date}</td>
            <td>${last.E5.toFixed(3)}</td>
            <td>${last.E10.toFixed(3)}</td>
            <td>${last.Diesel.toFixed(3)}</td>
            <td>${last.LPG.toFixed(3)}</td>
        </tr>`;
    });

    html += "</tbody></table>";

    div.innerHTML = html;
}
