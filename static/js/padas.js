/* static/js/padas.js */

(function() {
    // 1. Inject Checkbox
    function injectPadasCheckbox() {
        if (document.getElementById("chkPadasContainer")) return;

        const container = document.createElement("label");
        container.id = "chkPadasContainer";
        container.style.cssText = "margin-left:10px; padding: 6px 8px; font-weight:bold; font-size:10px; cursor:pointer; display:inline-flex; align-items:center; background:#fff; border:1px solid #ccc; border-radius:4px;";

        const chk = document.createElement("input");
        chk.type = "checkbox";
        chk.id = "chkPadas";
        chk.style.marginRight = "5px";
        chk.onchange = togglePadas;

        container.appendChild(chk);
        container.appendChild(document.createTextNode("🔮 Arudha Padas"));

        const formbar = document.getElementById("formbar");
        if (formbar) formbar.appendChild(container);
    }

    if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", injectPadasCheckbox);
    else injectPadasCheckbox();

    // 2. Toggle Logic
    function togglePadas(e) {
        const isChecked = e.target.checked;
        if (!isChecked) {
            document.querySelectorAll(".pada-container").forEach(e => e.remove());
        } else {
            loadPadas();
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
            payload = { 
                date: d, time: t, 
                lat: p?.getAttribute("data-lat") || 13.0827, 
                lon: p?.getAttribute("data-lon") || 80.2707, 
                tz: p?.getAttribute("data-tz") || 5.5 
            };
        }

        try {
            const res = await fetch("/compute_padas", {
                method: "POST", headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload)
            });
            const json = await res.json();
            if(json.status === "ok") {
                overlayPadasOnChart(json.data);
            } else {
                alert("Error: " + json.message);
                const chk = document.getElementById("chkPadas");
                if(chk) chk.checked = false;
            }
        } catch (e) { 
            console.error(e);
            const chk = document.getElementById("chkPadas");
            if(chk) chk.checked = false;
        }
    }

    // 4. Overlay on Chart (Updated for Font Size & Tooltip)
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
                    // Removed dotted border, just simple container
                    container.style.cssText = "display:flex; flex-wrap:wrap; gap:4px; margin-top:2px; padding-top:2px; justify-content:center; width:100%;";
                    box.appendChild(container);
                }

                const badge = document.createElement("span");
                
                // 1. Set Text (Label Only)
                badge.innerText = p.label;

                // 2. Set Tooltip (Label + Degree)
                badge.title = `${p.label} at ${p.degree}`;

                // 3. Styling (Larger Fonts)
                let color = "#333";
                let fontWeight = "bold";
                let fontSize = "12px"; // Default size increased from 10px
                
                if (p.label === "AL") { 
                    color = "#D32F2F"; 
                    fontWeight = "900"; 
                    fontSize = "14px"; // Larger for AL
                }
                else if (p.label === "UL") { 
                    color = "#1976D2"; 
                    fontWeight = "900"; 
                    fontSize = "14px"; // Larger for UL
                }

                badge.style.cssText = `font-size:${fontSize}; color:${color}; font-weight:${fontWeight}; cursor:help; padding:0 2px;`;
                
                container.appendChild(badge);
            }
        });
    }

})();
