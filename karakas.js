/* static/js/karakas.js */

(function() {
    // ... (Keep your existing Button Inject & Table Logic here) ...
    let isKarakasVisible = false;

    function injectKarakaButton() {
        if (document.getElementById("btnKarakas")) return;
        const btn = document.createElement("button");
        btn.id = "btnKarakas";
        btn.innerText = "👑 Jaimini Karakas";
        btn.onclick = toggleKarakas;
        Object.assign(btn.style, {
            marginLeft: "5px", padding: "6px 10px",
            background: "#673AB7", color: "white",
            border: "none", borderRadius: "4px", cursor: "pointer"
        });
        const formbar = document.getElementById("formbar");
        if (formbar) formbar.appendChild(btn);
    }

    if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", injectKarakaButton);
    else injectKarakaButton();

    function toggleKarakas() {
        const container = document.getElementById("karakasContainer");
        if (container && container.style.display !== "none") {
            container.style.display = "none";
        } else {
            loadKarakas();
        }
    }

    async function loadKarakas() {
        // ... (Same loading logic as before) ...
        let payload = {};
        if (typeof collectChartData === "function") payload = collectChartData();
        else {
            const d = document.getElementById("date")?.value;
            const t = document.getElementById("time")?.value;
            payload = { date: d, time: t, tz: 5.5 };
        }
        try {
            const res = await fetch("/compute_karakas", {
                method: "POST", headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload)
            });
            const json = await res.json();
            if(json.status === "ok") renderKarakaTable(json.data);
        } catch (e) { console.error(e); }
    }

    function renderKarakaTable(data) {
       // ... (Same table rendering logic as before) ...
       let container = document.getElementById("karakasContainer");
       if (!container) {
            container = document.createElement("div");
            container.id = "karakasContainer";
            document.body.appendChild(container);
            // ... styles ...
            Object.assign(container.style, {
                position: "fixed", left: "50%", top: "50%", transform: "translate(-50%,-50%)",
                width: "500px", height: "400px", backgroundColor: "#fff", border: "1px solid #ccc",
                borderRadius: "8px", boxShadow: "0 10px 30px rgba(0,0,0,0.3)", zIndex: "10002",
                display: "flex", flexDirection: "column", resize: "both", overflow: "hidden"
            });
       } else {
           container.style.display = "flex";
       }
       // ... (HTML content generation) ...
       const tamilPlanetMap = { "Sun": "சூரியன்", "Moon": "சந்திரன்", "Mars": "செவ்வாய்", "Mercury": "புதன்", "Jupiter": "குரு", "Venus": "சுக்கிரன்", "Saturn": "சனி" };
       const tamilSignMap = { "Mesham": "மேஷம்", "Rishabam": "ரிஷபம்", "Mithunam": "மிதுனம்", "Kadagam": "கடகம்", "Simmam": "சிம்மம்", "Kanni": "கன்னி", "Thulaam": "துலாம்", "Vrischikam": "விருச்சிகம்", "Dhanusu": "தனுசு", "Makaram": "மகரம்", "Kumbam": "கும்பம்", "Meenam": "மீனம்" };

       const html = `
        <div id="karakasHeader" style="flex: 0 0 auto; padding: 12px; background: #673AB7; color: #fff; font-weight: bold; border-radius: 8px 8px 0 0; cursor: move; display: flex; justify-content: space-between; align-items: center;">
            <span>👑 Jaimini Chara Karakas</span>
            <span id="closeKarakasBtn" style="cursor:pointer; font-size:20px;">&times;</span>
        </div>
        <div style="flex: 1 1 auto; overflow: auto; padding: 0;">
            <table style="width:100%; border-collapse:collapse; font-size:13px; text-align:center;">
                <tr style="background:#f5f5f5; height:35px; border-bottom:1px solid #ddd;"><th>Karaka</th><th>Planet</th><th>Sign</th><th>Degree</th></tr>
                ${data.map(r => `<tr style="border-bottom:1px solid #eee; height:30px;"><td title="${r.karaka_name}" style="font-weight:bold; color:#673AB7; cursor:help;">${r.karaka_code} <span style="font-size:11px; color:#555;">(${r.karaka_tamil})</span></td><td style="font-weight:bold;">${tamilPlanetMap[r.planet] || r.planet}</td><td>${tamilSignMap[r.sign] || r.sign}</td><td style="font-family:monospace; color:#444;">${r.degree}</td></tr>`).join('')}
            </table>
        </div>`;
       container.innerHTML = html;
       document.getElementById("closeKarakasBtn").onclick = () => container.style.display = "none";
       makeDraggable(container, document.getElementById("karakasHeader"));
    }

    function makeDraggable(elmnt, header) {
        let pos1=0, pos2=0, pos3=0, pos4=0;
        header.onmousedown = (e) => { e.preventDefault(); pos3=e.clientX; pos4=e.clientY; document.onmouseup=close; document.onmousemove=drag; };
        function drag(e) { e.preventDefault(); pos1=pos3-e.clientX; pos2=pos4-e.clientY; pos3=e.clientX; pos4=e.clientY; elmnt.style.top=(elmnt.offsetTop-pos2)+"px"; elmnt.style.left=(elmnt.offsetLeft-pos1)+"px"; }
        function close() { document.onmouseup=null; document.onmousemove=null; }
    }

    // ============================================================
    // 🚀 OVERWRITE CHART RENDERER TO ADD TOOLTIPS (Without modifying HTML)
    // ============================================================
    window.renderChart = function(rows) {
        const tamilRasis = ["மேஷம்", "ரிஷபம்", "மிதுனம்", "கடகம்", "சிம்மம்", "கன்னி", "துலாம்", "விருச்சிகம்", "தனுசு", "மகரம்", "கும்பம்", "மீனம்"];
        const grid = {}; 
        tamilRasis.forEach(r => grid[r] = []);
        let lagnaRasi = null;

        const planetColors = {
            "சூரியன்": "#e67e22", "சந்திரன்": "#3498db", "செவ்வாய்": "#ff4d4d",
            "புதன்": "#27ae60", "குரு": "#f1c40f", "சுக்கிரன்": "#f78fb3",
            "சனி": "#2c3e50", "ராகு": "#8e44ad", "கேது": "#95a5a6",
            "லக்னம்": "#ff7f00", "மாந்தி": "#34495e"
        };

        rows.forEach(r => {
            if (!r.name || r.name === "ராசி") return;
            const rasi = r.rasi || "";
            if (!rasi || !grid.hasOwnProperty(rasi)) return;

            const color = planetColors[r.name] || "#000";
            if (r.name === "லக்னம்" || r.name === "Lagna") lagnaRasi = rasi;
            
            const label = r.grid_label || `(${r.name})`;
            
            // Degree
            let shortDeg = "";
            if (r.dms) {
                let match = r.dms.match(/(\d+)[°:] ?(\d+)/);
                if (match) shortDeg = `${match[1]}°${match[2]}'`;
                else if (typeof r.dms === "string") shortDeg = r.dms.replace(/[^\d°′]/g, "").slice(0, 6);
            }

            // ✅ ADD TOOLTIP HERE (Using title attribute)
            // If 'karaka' exists (AK, AmK), use it. Otherwise just Name.
            const tooltipText = r.karaka ? ` ${r.karaka}` : r.name;

            grid[rasi].push(
                `<span style='color:${color}; font-weight:bold; cursor:help;' title='${tooltipText}'>
                    ${label}
                 </span>` +
                (shortDeg ? `<small>${shortDeg}</small>` : "")
            );
        });

        // Render Grid
        const order = ["மீனம்", "மேஷம்", "ரிஷபம்", "மிதுனம்", "கும்பம்", null, null, "கடகம்", "மகரம்", null, null, "சிம்மம்", "தனுசு", "விருச்சிகம்", "துலாம்", "கன்னி"];
        const chart = document.getElementById("chart");
        if(chart) {
            chart.innerHTML = "";
            order.forEach(r => {
                if (r === null) chart.innerHTML += "<div></div>";
                else {
                    const hl = (r === lagnaRasi);
                    chart.innerHTML += `<div class='chart-box' style='background:${hl ? "#fff8e1" : "#fff"}; border-color:${hl ? "#ff9800" : "#000"};'>${grid[r].join("<br>")}</div>`;
                }
            });
        }
    };

})();