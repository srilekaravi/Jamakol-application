/* static/js/padas.js */

(function() {
    // State to track visibility
    let isPadasVisible = false;

    // 1. Inject Button
    function injectPadasButton() {
        if (document.getElementById("btnPadas")) return;

        const btn = document.createElement("button");
        btn.id = "btnPadas";
        btn.innerText = "🔮 Arudha Padas";
        btn.onclick = togglePadas;
        
        Object.assign(btn.style, {
            marginLeft: "5px", padding: "6px 10px",
            background: "#009688", color: "white",
            border: "none", borderRadius: "4px", cursor: "pointer"
        });

        const formbar = document.getElementById("formbar");
        if (formbar) formbar.appendChild(btn);
    }

    if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", injectPadasButton);
    else injectPadasButton();

    // 2. Toggle Logic
    function togglePadas() {
        if (isPadasVisible) {
            document.querySelectorAll(".pada-container").forEach(e => e.remove());
            const table = document.getElementById("padasContainer");
            if (table) table.style.display = "none";
            isPadasVisible = false;
        } else {
            loadPadas();
            isPadasVisible = true;
        }
    }

    // 3. Load Data
    async function loadPadas() {
        let payload = {};
        if (typeof collectChartData === "function") payload = collectChartData();
        else {
            const d = document.getElementById("date")?.value;
            const t = document.getElementById("time")?.value;
            const p = document.getElementById("placeSearch");
            payload = { date: d, time: t, lat: p?.getAttribute("data-lat") || 13.0827, lon: p?.getAttribute("data-lon") || 80.2707, tz: p?.getAttribute("data-tz") || 5.5 };
        }

        try {
            const res = await fetch("/compute_padas", {
                method: "POST", headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload)
            });
            const json = await res.json();
            if(json.status === "ok") {
                renderPadaTable(json.data);
                overlayPadasOnChart(json.data);
            } else {
                alert("Error: " + json.message);
            }
        } catch (e) { console.error(e); }
    }

    // 4. Overlay on Chart
    function overlayPadasOnChart(data) {
        const chartBoxes = document.querySelectorAll(".chart-box");
        if(chartBoxes.length !== 12) return; 

        document.querySelectorAll(".pada-container").forEach(e => e.remove());

        const signToDomIndex = {
            11: 0, 0: 1, 1: 2, 2: 3,
            10: 4, 3: 5, 9: 6, 4: 7,
            8: 8, 7: 9, 6: 10, 5: 11
        };

        data.forEach(p => {
            const signId = p.sign_id; 
            const targetIndex = signToDomIndex[signId];

            if (targetIndex !== undefined && chartBoxes[targetIndex]) {
                const box = chartBoxes[targetIndex];

                let container = box.querySelector(".pada-container");
                if (!container) {
                    container = document.createElement("div");
                    container.className = "pada-container";
                    container.style.cssText = "display:flex; flex-wrap:wrap; gap:5px; margin-top:4px; padding-top:2px; border-top:1px dotted #ccc; justify-content:center; width:100%;";
                    box.appendChild(container);
                }

                const badge = document.createElement("span");
                badge.innerText = p.label;
                // Show degree in tooltip on the chart marker
                badge.title = `${p.label} (${p.sign_name}) @ ${p.degree}`;
                
                if (p.label === "AL") {
                    badge.style.cssText = "font-size:14px; color:#D32F2F; font-weight:900; padding:0 2px;";
                } else if (p.label === "UL") {
                    badge.style.cssText = "font-size:14px; color:#1976D2; font-weight:900; padding:0 2px;";
                } else {
                    badge.style.cssText = "font-size:12px; color:#444; font-weight:bold; padding:0 2px;";
                }
                
                container.appendChild(badge);
            }
        });
    }

    // 5. Render Table (Added Degree Column)
    function renderPadaTable(data) {
        let container = document.getElementById("padasContainer");
        
        if (!container) {
            container = document.createElement("div");
            container.id = "padasContainer";
            document.body.appendChild(container);
            
            Object.assign(container.style, {
                position: "fixed", top: "15%", right: "20px",
                width: "380px", // Widened for Degree column
                backgroundColor: "#fff",
                border: "1px solid #ccc", borderRadius: "8px",
                boxShadow: "0 10px 30px rgba(0,0,0,0.3)", zIndex: "10001",
                display: "flex", flexDirection: "column"
            });
        } else {
            container.style.display = "flex";
        }

        // Tamil Maps
        const signTamilMap = {
            "Mesham": "மேஷம்", "Rishabam": "ரிஷபம்", "Mithunam": "மிதுனம்", "Kadagam": "கடகம்",
            "Simmam": "சிம்மம்", "Kanni": "கன்னி", "Thulaam": "துலாம்", "Vrischikam": "விருச்சிகம்",
            "Dhanusu": "தனுசு", "Makaram": "மகரம்", "Kumbam": "கும்பம்", "Meenam": "மீனம்"
        };
        const planetTamilMap = { 
            "Sun": "சூரியன்", "Moon": "சந்திரன்", "Mars": "செவ்வாய்", 
            "Mercury": "புதன்", "Jupiter": "குரு", "Venus": "சுக்கிரன்", 
            "Saturn": "சனி", "Rahu": "ராகு", "Ketu": "கேது" 
        };

        const html = `
        <div id="padasHeader" style="padding:12px; background:#009688; color:#fff; font-weight:bold; border-radius:8px 8px 0 0; cursor:move; display:flex; justify-content:space-between; align-items:center;">
            <span style="font-size:15px;">🔮 ஜைமினி ஆருட பாதங்கள்</span>
            <span id="closePadasBtn" style="cursor:pointer; font-size:20px;">&times;</span>
        </div>
        <div style="padding:0; overflow:auto; max-height:450px;">
            <table style="width:100%; border-collapse:collapse; font-size:13px; text-align:center;">
                <tr style="background:#f5f5f5; height:35px; border-bottom:1px solid #ddd; font-weight:bold;">
                    <th>பதம்</th>
                    <th>பாகை</th>
                    <th>ராசி</th>
                    <th>அதிபதி</th>
                </tr>
                ${data.map(r => `
                    <tr style="border-bottom:1px solid #eee; height:30px;">
                        <td style="font-weight:bold; color:${r.label==='AL'?'#E91E63':(r.label==='UL'?'#2196F3':'#333')}">
                            ${r.label}
                        </td>
                        <td style="font-family:monospace; font-weight:bold; color:#555;">
                            ${r.degree}
                        </td>
                        <td>${signTamilMap[r.sign_name] || r.sign_name}</td>
                        <td style="font-weight:bold;">${planetTamilMap[r.lord] || r.lord}</td>
                    </tr>
                `).join('')}
            </table>
        </div>`;

        container.innerHTML = html;
        
        document.getElementById("closePadasBtn").onclick = () => {
            togglePadas();
        };

        makeDraggable(container, document.getElementById("padasHeader"));
    }

    function makeDraggable(elmnt, header) {
        let pos1=0, pos2=0, pos3=0, pos4=0;
        header.onmousedown = dragMouseDown;
        function dragMouseDown(e) {
            e.preventDefault(); pos3 = e.clientX; pos4 = e.clientY;
            document.onmouseup = closeDragElement; document.onmousemove = elementDrag;
        }
        function elementDrag(e) {
            e.preventDefault(); pos1 = pos3 - e.clientX; pos2 = pos4 - e.clientY;
            pos3 = e.clientX; pos4 = e.clientY;
            elmnt.style.top = (elmnt.offsetTop - pos2) + "px"; elmnt.style.left = (elmnt.offsetLeft - pos1) + "px";
        }
        function closeDragElement() { document.onmouseup = null; document.onmousemove = null; }
    }
})();