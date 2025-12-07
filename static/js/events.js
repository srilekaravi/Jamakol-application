// static/js/events.js
// 🌟 Astro Events Module — clean + editable + non-intrusive

(function () {
    const API_BASE = ""; // same domain
    const formId = "eventForm";
    const listId = "eventList";
    let currentChartId = null;

    // --- Helper ---
    function $(sel) { return document.querySelector(sel); }

    // --- 1️⃣ Create floating event form ---
    function createForm(title = "➕ Add Event") {
        if (document.getElementById(formId)) return;
        const div = document.createElement("div");
        div.id = formId;
        div.innerHTML = `
      <div style="background:#fffdf8;border:1px solid #ccc;border-radius:8px;
                  box-shadow:0 6px 18px rgba(0,0,0,0.2);padding:12px;
                  position:fixed;top:20%;left:50%;transform:translateX(-50%);
                  z-index:20000;max-width:340px;font-size:13px;">
        <div style="font-weight:600;margin-bottom:6px;">${title}</div>
        <input id="evName" placeholder="Event Name" style="width:100%;margin-bottom:6px;">
        <input id="evDate" type="date" style="width:49%;margin-right:1%;">
        <input id="evTime" type="time" step="1" style="width:49%;">
        <textarea id="evNotes" rows="2" placeholder="Notes" style="width:100%;margin-top:6px;"></textarea>
        <div style="margin-top:8px;text-align:right;">
          <button id="saveEvBtn">💾 Save</button>
          <button id="closeEvBtn">✖</button>
        </div>
      </div>`;
        document.body.appendChild(div);
        $("#closeEvBtn").onclick = () => div.remove();
        $("#saveEvBtn").onclick = saveEvent;
    }

    // --- 2️⃣ Ensure Event List Container ---
    function ensureListBox() {
        if (document.getElementById(listId)) return;
        const box = document.createElement("div");
        box.id = listId;
        box.style = "margin-top:10px;font-size:12px;background:#fffef8;padding:6px;border-radius:8px;max-width:600px;";
        box.innerHTML = "<div style='font-weight:600;margin-bottom:4px;'>🎯 Saved Events</div><div id='eventItems'>None yet.</div>";
        const transitBox = document.getElementById("transitBox");
        (transitBox?.parentElement || document.body).appendChild(box);
    }

    // --- 3️⃣ Save New Event ---
    async function saveEvent() {
        const name = $("#evName").value.trim();
        const date = $("#evDate").value;
        const time = $("#evTime").value || "00:00:00";
        const notes = $("#evNotes").value.trim();

        if (!name || !date) {
            alert("Enter event name & date.");
            return;
        }

        const pl = document.getElementById("placeSearch") || document.getElementById("place");
        const lat = parseFloat(pl?.dataset.lat || 13.0827);
        const lon = parseFloat(pl?.dataset.lon || 80.2707);
        const tz = parseFloat(pl?.dataset.tz || 5.5);

        let chain = { dasha: "", bhukti: "", antara: "", sookshma: "", prana: "" };

        try {
            const chart = window.currentChart || {};
            const birth_date = chart.birth_date || window.lastBirthDate || "";
            const birth_time = chart.birth_time || window.lastBirthTime || "";

            const resDash = await fetch("/get_dasha_layers", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    date, time, lat, lon, tz,
                    birth_date, birth_time
                })
            });

            const jDash = await resDash.json();
            if (jDash.status === "ok" && jDash.chain) chain = jDash.chain;
            else console.warn("⚠️ Dasha chain fetch failed:", jDash);
        } catch (err) {
            console.error("❌ Error fetching Dasha chain:", err);
        }

        const payload = {
            chart_id: currentChartId || "default_chart",
            event_name: name,
            event_date: date,
            event_time: time,
            event_notes: notes,
            ...chain,
            transit_data: {}
        };

        try {
            const res = await fetch("/save_event", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload)
            });
            const j = await res.json();
            if (j.status === "ok") {
                $("#eventForm").remove();
                loadEvents();
            } else {
                alert("Save failed: " + j.message);
            }
        } catch (err) {
            console.error("❌ Save event error:", err);
            alert("Failed to save event.");
        }
    }

    // --- 4️⃣ Update Existing Event ---
    async function updateEvent(id) {
        const name = $("#evName").value.trim();
        const date = $("#evDate").value;
        const time = $("#evTime").value || "00:00:00";
        const notes = $("#evNotes").value.trim();

        if (!name || !date) { alert("Enter event name & date."); return; }

        const payload = { id, event_name: name, event_date: date, event_time: time, event_notes: notes };

        try {
            const res = await fetch("/update_event", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload)
            });
            const j = await res.json();
            if (j.status === "ok") {
                $("#eventForm").remove();
                loadEvents();
            } else alert("Update failed: " + j.message);
        } catch (err) {
            console.error("updateEvent error:", err);
            alert("Error updating event.");
        }
    }

    // --- 5️⃣ Load Events List ---
    async function loadEvents() {
        ensureListBox();
        const box = $("#eventItems");
        box.innerHTML = "⏳ Loading...";
        try {
            const q = currentChartId ? "?chart_id=" + currentChartId : "";
            const res = await fetch(API_BASE + "/list_events" + q);
            const j = await res.json();
            if (j.status !== "ok") throw new Error(j.message);
            if (!j.events.length) { box.innerHTML = "No saved events."; return; }

            box.innerHTML = j.events.map(e =>
                `<div class='event-card' data-id='${e.id}' 
                    data-name='${e.event_name}' data-date='${e.event_date}' 
                    data-time='${e.event_time}' data-notes='${e.event_notes || ""}'
                    data-dasha='${e.dasha}' data-bhukti='${e.bhukti}' 
                    data-antara='${e.antara}' data-sookshma='${e.sookshma}' data-prana='${e.prana}'
                    style='margin-bottom:6px;padding:4px 6px;border:1px solid #ccc;border-radius:6px;background:#fff;'>
                    <b>${e.event_name}</b> – ${e.event_date}
                    <div style='font-size:11px;color:#555;'>${e.dasha ? `D:${e.dasha} B:${e.bhukti} A:${e.antara}` : ''}</div>
                    ${e.event_notes ? `<div>${e.event_notes}</div>` : ""}
                    <div style='margin-top:3px;'>
                        <button data-edit='${e.id}' style='font-size:10px;'>✏</button>
                        <button data-del='${e.id}' style='font-size:10px;'>🗑</button>
                    </div>
                </div>`
            ).join("");

            // ✏ Edit handler
            box.querySelectorAll("[data-edit]").forEach(btn => {
                btn.onclick = () => {
                    const card = btn.closest(".event-card");
                    createForm("✏ Edit Event");
                    $("#evName").value = card.dataset.name || "";
                    $("#evDate").value = card.dataset.date || "";
                    $("#evTime").value = card.dataset.time || "";
                    $("#evNotes").value = card.dataset.notes || "";
                    $("#saveEvBtn").onclick = () => updateEvent(card.dataset.id);
                };
            });

            // 🗑 Delete handler
            box.querySelectorAll("[data-del]").forEach(btn => {
                btn.onclick = async () => {
                    await fetch("/delete_event", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ id: btn.dataset.del })
                    });
                    loadEvents();
                };
            });

            // 🌟 Click card to highlight Transit chart planets
            box.querySelectorAll(".event-card").forEach(card => {
                card.onclick = e => {
                    if (e.target.tagName === "BUTTON") return; // ignore button clicks
                    const d = card.dataset;
                    if (window.highlightTransitPlanets) {
                        highlightTransitPlanets([d.dasha, d.bhukti, d.antara, d.sookshma, d.prana]);
                    }
                };
            });

        } catch (err) {
            console.error("loadEvents error", err);
            box.innerHTML = "❌ Failed to load events.";
        }
    }

    // --- 6️⃣ Hook Add Event Button ---
    function init() {
        const btn = document.createElement("button");
        btn.id = "addEventBtn";
        btn.textContent = "📝 Add Event";
        btn.onclick = createForm;
        const formbar = document.getElementById("formbar");
        if (formbar) formbar.appendChild(btn);
    }

    // --- 7️⃣ Init on page load ---
    window.addEventListener("DOMContentLoaded", () => {
        currentChartId = window.lastChartId || "default_chart";
        init();
    });

    // --- Expose loader globally ---
    window.loadEvents = loadEvents;
})();
