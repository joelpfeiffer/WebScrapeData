let chart = null;
let trendData = [];
let allCountryData = {};

/* --------------------------------------
   DARK MODE
---------------------------------------*/
document.getElementById("themeToggle").addEventListener("click", () => {
    const root = document.documentElement;
    const dark = root.getAttribute("data-theme") === "dark";
    root.setAttribute("data-theme", dark ? "light" : "dark");
});

/* --------------------------------------
   LANDEN LADEN (1-land en multi-land)
---------------------------------------*/
fetch("https://raw.githubusercontent.com/joelpfeiffer/WebScrapeData/main/docs/data/index.json")
    .then(res => res.json())
    .then(list => {
        const single = document.getElementById("singleLand");
        const multi  = document.getElementById("landSelect");

        single.innerHTML = "";
        multi.innerHTML  = "";

        list.forEach(file => {
            const land = file.replace(".csv", "");
            const name = land.charAt(0).toUpperCase() + land.slice(1);

            const o1 = document.createElement("option");
            o1.value = land;
            o1.textContent = name;
            single.appendChild(o1);

            const o2 = document.createElement("option");
            o2.value = land;
            o2.textContent = name;
            multi.appendChild(o2);
        });
    });

/* --------------------------------------
   TREND LAND SELECT
---------------------------------------*/
document.getElementById("singleLand").addEventListener("change", function(){
    loadTrendCSV(this.value);
});

/* --------------------------------------
   SINGLE CSV LADEN (TREND)
---------------------------------------*/
function loadTrendCSV(land){
    const url=`https://raw.githubusercontent.com/joelpfeiffer/WebScrapeData/main/docs/data/${land}.csv`;

    fetch(url)
        .then(r=>r.text())
        .then(text=>{
            trendData=parseCSV(text);
            updateTrendChart(trendData);
        });
}

/* --------------------------------------
   CSV PARSER
---------------------------------------*/
function toNumber(v){
    if(!v) return null;
    v=v.replace(/"/g,"").trim();
    v=v.replace(/[^0-9.,-]/g,"");
    if(v.includes(",")) v=v.replace(/,/g,".");
    let p=v.split(".");
    if(p.length>2) v=p[0]+"."+p.slice(1).join("");
    return parseFloat(v);
}

function parseCSV(csv){
    const rows=csv.trim().split("\n").map(r=>r.split(","));
    const body=rows.slice(1);

    return body.map(r=>({
        date:   r[0],
        Diesel: toNumber(r[1]),
        E10:    toNumber(r[2]),
        E5:     toNumber(r[3]),
        LPG:    toNumber(r[4])
    }));
}

/* --------------------------------------
   CANVAS RESET
---------------------------------------*/
function resetCanvas(){
    const old=document.getElementById("trendChart");
    const parent=old.parentNode;
    old.remove();
    const c=document.createElement("canvas");
    c.id="trendChart";
    c.width=900;
    c.height=400;
    parent.appendChild(c);
}

/* --------------------------------------
   TREND CHART
---------------------------------------*/
function updateTrendChart(data){
    resetCanvas();

    const ctx=document.getElementById("trendChart").getContext("2d");

    const maxValue = Math.max(
        ...data.map(d=>d.E5),
        ...data.map(d=>d.E10),
        ...data.map(d=>d.Diesel),
        ...data.map(d=>d.LPG)
    );

    const yMax=maxValue+0.15;

    chart=new Chart(ctx,{
        type:"line",
        data:{
            labels:data.map(d=>d.date),
            datasets:[
                {
                    label:"E5", borderColor:"#0078FF", backgroundColor:"#0078FF",
                    data:data.map(d=>d.E5), tension:0.2, fill:false
                },
                {
                    label:"E10", borderColor:"#FF8800", backgroundColor:"#FF8800",
                    data:data.map(d=>d.E10), tension:0.2, fill:false
                },
                {
                    label:"Diesel", borderColor:"#00AA00", backgroundColor:"#00AA00",
                    data:data.map(d=>d.Diesel), tension:0.2, fill:false
                },
                {
                    label:"LPG", borderColor:"#AA00AA", backgroundColor:"#AA00AA",
                    data:data.map(d=>d.LPG), tension:0.2, fill:false
                }
            ]
        },
        options:{
            responsive:false,
            maintainAspectRatio:false,
            scales:{
                y:{
                    min:0,
                    max:yMax,
                    ticks:{precision:2}
                }
            },
            plugins:{
                legend:{position:"bottom"}
            }
        }
    });
}

/* --------------------------------------
   MULTI-COUNTRY TABLE
---------------------------------------*/
document.getElementById("landSelect").addEventListener("change", function(){

    const selected=[...this.selectedOptions].map(o=>o.value);

    if(selected.length>4){
        alert("Max 4 landen.");
        this.selectedOptions[4].selected=false;
        return;
    }

    loadMultiple(selected);
});

/* --------------------------------------
   Load CSVs for table
---------------------------------------*/
function loadMultiple(landen){
    const promises=landen.map(land=>
        fetch(`https://raw.githubusercontent.com/joelpfeiffer/WebScrapeData/main/docs/data/${land}.csv`)
            .then(r=>r.text())
            .then(txt=>allCountryData[land]=parseCSV(txt))
    );

    Promise.all(promises).then(()=>updateTable(landen));
}

/* --------------------------------------
   UPDATE TABLE
---------------------------------------*/
function updateTable(landen){
    const div=document.getElementById("comparisonTable");
    div.innerHTML="";

    if(landen.length===0){
        div.innerHTML="<p>Geen landen geselecteerd.</p>";
        return;
    }

    let html=`
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
    <tbody>`;

    landen.forEach(land=>{
        const d=allCountryData[land];
        const last=d[d.length-1];

        html+=`
        <tr>
            <td>${land.charAt(0).toUpperCase()+land.slice(1)}</td>
            <td>${last.date}</td>
            <td>${last.E5.toFixed(3)}</td>
            <td>${last.E10.toFixed(3)}</td>
            <td>${last.Diesel.toFixed(3)}</td>
            <td>${last.LPG.toFixed(3)}</td>
        </tr>`;
    });

    html+="</tbody></table>";
    div.innerHTML=html;
}

/* --------------------------------------
   RANGE FILTERS (trend + table)
---------------------------------------*/
document.querySelectorAll("button[data-range]").forEach(btn=>{
    btn.addEventListener("click",()=>{
        document.querySelectorAll("button[data-range]").forEach(b=>b.classList.remove("active"));
        btn.classList.add("active");

        const range=btn.dataset.range;

        // Trend
        const land=document.getElementById("singleLand").value;
        if(range==="all"){
            loadTrendCSV(land);
        }else{
            const days=parseInt(range);
            const cut=trendData.slice(-days);
            updateTrendChart(cut);
        }

        // Table
        const selected=[...document.getElementById("landSelect").selectedOptions]
            .map(o=>o.value);

        if(selected.length>0){
            if(range==="all"){
                updateTable(selected);
            }else{
                const days=parseInt(range);
                const newData={};
                selected.forEach(land=>{
                    newData[land]=allCountryData[land].slice(-days);
                });
                allCountryData={...allCountryData,...newData};
                updateTable(selected);
            }
        }
    });
});
