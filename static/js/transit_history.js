// static/js/transit_history.js
// -----------------------------------------------------------
// Handles transit history, notes, and preview for a specific chart.
// Must be loaded after core.js (so window.currentChartId is available)
// -----------------------------------------------------------
(function () {
    const HISTORY_CONTAINER_ID = "transitHistoryBox";
    const CONTAINER_ID = "transitContainer";
    const DEFAULT_LOCATION = "Chennai";

    // Small style specific to history panel
    const css = `
      #${HISTORY_CONTAINER_ID}{
          position:absolute;left:540px;top:620px;display:none;z-index:9998;
          width:520px;max-height:520px;overflow:auto;background:#f7fbff;
          border:2px solid #cfe2ff;border-radius:10px;padding:8px;
          box-shadow:0 6px 18px rgba(0,0,0,0.08);
      }
      #${HISTORY_CONTAINER_ID} table{width:100%;border-collapse:collapse;font-size:12px;}
      #${HISTORY_CONTAINER_ID} th,#${HISTORY_CONTAINER_ID} td{
          border:1px solid #ccc;padding:4px;text-align:left;vertical-align:middle;
      }
      #${HISTORY_CONTAINER_ID} button{padding:4px 6px;font-size:12px;border-radius:4px;cursor:pointer;}
      #${HISTORY_CONTAINER_ID} .view-link{color:#0b63d6;cursor:pointer;text-decoration:underline;background:none;border:none;padding:0;}
      .preview-panel{position:absolute;width:420px;background:#fff;border:2px solid #ddd;border-radius:8px;
          box-shadow:0 8px 24px rgba(0,0,0,0.12);z-index:10001;padding:6px;overflow:auto;}
      .preview-header{display:flex;justify-content:space-between;align-items:center;
          padding:6px 8px;border-bottom:1px solid #eee;font-weight:600;}
      .preview-close{cursor:pointer;padding:4px 6px;border-radius:6px;background:#f5f5f5;}
      .tiny-btn{padding:4px 6px;font-size:12px;border-radius:6px;cursor:pointer;}
    `;
    const st = document.createElement("style");
    st.textContent = css;
    document.head.appendChild(st);

    // Create / show panel on demand
    function ensurePanel() {
        let box = document.getElementById(HISTORY_CONTAINER_ID);
        if (!box) {
            box = document.createElement("div");
            box.id = HISTORY_CONTAINER_ID;
            document.body.appendChild(box);
        }
        return box;
    }

    // Public toggle button (you can attach this to UI)
    window.toggleTransitHistory = async function () {
        const box = ensurePanel();
        if (box.style.display === "none" || !box.style.display) {
            await renderTransitHistory();
            box.style.display = "block";
        } else {
            box.style.display = "none";
        }
    };

    async function renderTransitHistory() {
        const hb = ensurePanel();
        const chartId = parseInt(window.currentChartId || 0);
        if (!chartId) {
            hb.innerHTML = `<h4>Transit History</h4><div style="color:#b22222;">No chart loaded.</div>`;
            return;
        }
        try {
            const res = await fetch(`/transit_history/${chartId}`);
            const j = await res.json();
            const rows = (j && j.status === "ok" && Array.isArray(j.history)) ? j.history.reverse() : [];
            hb.innerHTML = `
                <h4>Transit History — ${rows.length} entries</h4>
                <input id="transitSearch" type="text" placeholder="🔍 Search notes or date..."
                       style="width:100%;padding:6px;margin-bottom:6px;border:1px solid #ccc;border-radius:6px;">
                <div id="historyTableWrap"></div>
                <div style="text-align:right;margin-top:8px;">
                    <button id="refreshBtn">🔄 Refresh</button>
                    <button id="saveBtn">💾 Save Snapshot</button>
                </div>
            `;
            const wrap = hb.querySelector("#historyTableWrap");
            wrap.innerHTML = buildTable(rows);

            document.getElementById("refreshBtn").onclick = renderTransitHistory;
            document.getElementById("saveBtn").onclick = async () => {
                const ok = await saveSnapshot(chartId, "");
                alert(ok ? "✅ Snapshot saved" : "❌ Save failed");
                await renderTransitHistory();
            };
            document.getElementById("transitSearch").addEventListener("input", e => {
                const q = e.target.value.toLowerCase();
                const filtered = rows.filter(r =>
                    (r.note || "").toLowerCase().includes(q) ||
                    (r.timestamp || "").toLowerCase().includes(q)
                );
                wrap.innerHTML = buildTable(filtered);
                attachRowListeners(filtered, chartId);
            });
            attachRowListeners(rows, chartId);
        } catch (err) {
            console.error("renderTransitHistory error:", err);
            hb.innerHTML = `<div style="color:#b22222;">Error loading transit history.</div>`;
        }
    }

    function buildTable(rows) {
        let html = `<table><thead><tr><th>ID</th><th>Timestamp</th><th>Note</th><th>Action</th></tr></thead><tbody>`;
        (rows || []).forEach(r => {
            const dt = new Date(r.timestamp || new Date().toISOString());
            const local = dt.toISOString().slice(0, 16);
            const note = r.note || "";
            html += `
                <tr>
                    <td>${r.id}</td>
                    <td><input type="datetime-local" id="ts-${r.id}" value="${local}"></td>
                    <td><input id="note-${r.id}" type="text" value="${note}" placeholder="Short note"></td>
                    <td style="white-space:nowrap;">
                        <span id="view-${r.id}" class="view-link">View</span>
                        &nbsp;<button id="save-${r.id}" class="tiny-btn">💾</button>
                        &nbsp;<button id="del-${r.id}" class="tiny-btn" style="background:#fee;border:1px solid #f99;">🗑️</button>
                    </td>
                </tr>`;
        });
        html += `</tbody></table>`;
        return html;
    }

    function attachRowListeners(rows, chartId) {
        (rows || []).forEach(r => {
            const tsEl = document.getElementById(`ts-${r.id}`);
            const noteEl = document.getElementById(`note-${r.id}`);
            const saveEl = document.getElementById(`save-${r.id}`);
            const delEl = document.getElementById(`del-${r.id}`);
            const viewEl = document.getElementById(`view-${r.id}`);

            if (saveEl) saveEl.onclick = async () => {
                const payload = {
                    id: r.id,
                    chart_id: chartId,
                    timestamp: new Date(tsEl.value).toISOString(),
                    note: noteEl.value
                };
                await fetch("/update_transit_note", {
                    method: "POST", headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(payload)
                });
                alert("✅ Note updated");
                renderTransitHistory();
            };

            if (delEl) delEl.onclick = async () => {
                if (!confirm("Delete this snapshot?")) return;
                await fetch(`/delete_transit_snapshot/${r.id}`, { method: "POST" });
                renderTransitHistory();
            };

            if (viewEl) viewEl.onclick = async () => {
                const pid = `preview-${r.id}`;
                const exist = document.getElementById(pid);
                if (exist) return exist.remove();

                const panel = document.createElement("div");
                panel.id = pid;
                panel.className = "preview-panel";
                panel.style.left = (document.getElementById(HISTORY_CONTAINER_ID).offsetLeft + 540) + "px";
                panel.style.top = document.getElementById(HISTORY_CONTAINER_ID).offsetTop + "px";
                panel.innerHTML = `<div class="preview-header">Transit — ${tsEl.value}<div class="preview-close">✕</div></div>
                    <div style="padding:8px;text-align:center;">Loading...</div>`;
                document.body.appendChild(panel);
                panel.querySelector(".preview-close").onclick = () => panel.remove();

                const res = await fetch("/generate_chart", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        ...buildPayload({ timestamp: new Date(tsEl.value).toISOString() }),
                        chartType: "rasi"
                    })
                });
                const data = await res.json();
                panel.lastChild.innerHTML = data.status === "ok" ? buildGrid(data.rows) : "Error loading transit";
            };
        });
    }

    async function saveSnapshot(chartId, note) {
        try {
            if (!window.lastTransitData || window.lastTransitData.length === 0) return false;
            const payload = {
                chart_id: chartId,
                transit_data: window.lastTransitData,
                location: document.getElementById("placeSearch")?.value || DEFAULT_LOCATION,
                note
            };
            const res = await fetch("/save_transit_snapshot", {
                method: "POST", headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload)
            });
            const j = await res.json();
            return j.status === "ok";
        } catch (e) {
            console.error("saveSnapshot error:", e);
            return false;
        }
    }

    function buildPayload(extra = {}) {
        const now = extra.timestamp ? new Date(extra.timestamp) : new Date();
        const [y, m, d] = now.toISOString().slice(0, 10).split("-").map(Number);
        const [h, mi] = now.toTimeString().slice(0, 5).split(":").map(Number);
        const s = now.getSeconds();
        let lat = 13.0827, lon = 80.2707, tz = 5.5;
        const pl = document.getElementById("placeSearch") || document.getElementById("place");
        if (pl) {
            lat = parseFloat(pl.getAttribute("data-lat")) || lat;
            lon = parseFloat(pl.getAttribute("data-lon")) || lon;
            tz = parseFloat(pl.getAttribute("data-tz")) || tz;
        }
        return { year: y, month: m, day: d, hour: h, minute: mi, second: s, lat, lon, tz };
    }

    function buildGrid(rows) {
        const tamilRasis = ["மேஷம்", "ரிஷபம்", "மிதுனம்", "கடகம்", "சிம்மம்", "கன்னி",
            "துலாம்", "விருச்சிகம்", "தனுசு", "மகரம்", "கும்பம்", "மீனம்"];
        const grid = {}; tamilRasis.forEach(r => grid[r] = []);
        (rows || []).forEach(r => {
            const name = r.name || r.graha_ta || "";
            const rasi = r.rasi || r.rasi_ta || "";
            if (!rasi) return;
            grid[rasi].push(`<span style="font-weight:600;">${r.short || name}</span>`);
        });
        let html = `<div style="display:grid;grid-template-columns:repeat(4,1fr);gap:2px;">`;
        tamilRasis.forEach(r => { html += `<div style="border:1px solid #aaa;padding:3px;">${grid[r].join("<br>")}</div>`; });
        html += `</div>`;
        return html;
    }
})();
