// vimshottari_final_inline_shorttamil.js
// Final: Inline breadcrumb (replaces title), Tamil short names, planet-only dark-orange highlight,
// MD / B / A / P / S / PD labels, one-level-per-click rebuild (Option B), full-dasa focus view.
// Drop into your app (replace previous vimshottari JS). No backend changes required.

// ---------------- Global state ----------------
let vimData = null;        // holds mahadasha list from /vimshottari_dasha
let navStack = [];         // navigation stack: [{ node, level }] level: 1=MD,2=B,3=A,4=P,5=S,6=PD

const LEVEL_LABELS = { 1: "MD", 2: "B", 3: "A", 4: "P", 5: "S", 6: "PD" };

// Full Tamil-to-short-Tamil mapping for breadcrumb (short forms you specified)
const SHORT_TA = {
    "Sun": "சூரி",
    "Moon": "சந்",
    "Mars": "செவ்",
    "Mercury": "புத",
    "Jupiter": "குரு",
    "Venus": "சுக்",
    "Saturn": "சனி",
    "Rahu": "ராகு",
    "Ketu": "கேது"
};

// keep full Tamil names for tables (optional mapping; fallback to English if not known)
const FULL_TA = {
    "Sun": "சூரியன்", "Moon": "சந்திரன்", "Mars": "செவ்வாய்", "Mercury": "புதன்",
    "Jupiter": "குரு", "Venus": "சுக்கிரன்", "Saturn": "சனி", "Rahu": "ராகு", "Ketu": "கேது"
};

// ---------------- Helpers ----------------
function shortDT(s) { if (!s) return ""; const p = String(s).split(" "); return p.length >= 2 ? `${p[0]} (${p[1]})` : p[0]; }
function parseLocal(s) { if (!s) return null; return new Date(s.replace(" ", "T")); }
function escapeHtml(t) { if (t == null) return ""; return String(t).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])); }
function createSpinner() {
    const s = document.createElement("span"); s.className = "vh-spinner"; s.innerHTML =
        `<svg width="16" height="16" viewBox="0 0 50 50"><circle cx="25" cy="25" r="20" stroke-width="5" stroke="#ff9800" stroke-opacity="0.2" fill="none"></circle><path d="M45 25a20 20 0 0 1-20 20" stroke="#ff9800" stroke-width="5" fill="none"></path></svg>`; return s;
}

// ---------------- Entry (called from core.js) ----------------
async function loadAndRenderVimshottariCompact(meta) {
    const wrap = document.getElementById("dashaTreeWrap"); if (!wrap) return;
    wrap.innerHTML = ""; navStack = [];
    const ld = document.createElement("div"); ld.className = "vh-loading"; ld.appendChild(createSpinner()); ld.append(" கணக்கிடப்படுகிறது...");
    wrap.appendChild(ld);

    try {
        const res = await fetch("/vimshottari_dasha", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(meta)
        });
        const j = await res.json();
        if (!j || j.status !== "ok") throw new Error(j?.message || "dasha load failed");
        vimData = j;
        renderMahadashas(j.mahadashas, meta.tz);
    } catch (err) {
        console.error("vimshottari load error", err);
        wrap.innerHTML = "<div class='vh-error'>⚠️ தசை தரவு கிடைக்கவில்லை.</div>";
    }
}

// ---------------- Root: Full Mahadasha list ----------------
function renderMahadashas(list, tz) {
    const wrap = document.getElementById("dashaTreeWrap"); if (!wrap) return;
    wrap.innerHTML = "";

    // header
    const header = document.createElement("div"); header.className = "vh-header";
    const title = document.createElement("div"); title.className = "vh-title"; title.textContent = "🪔 விம்ஷோத்ரி தசா";
    header.appendChild(title);
    wrap.appendChild(header);

    // table
    const tbl = document.createElement("table"); tbl.className = "vh-table";
    tbl.innerHTML = `<thead><tr><th>தசை / Lord (TA)</th><th>தொடக்கம்</th><th>-</th><th>முடிவு</th></tr></thead>`;
    const tb = document.createElement("tbody");
    const now = new Date();

    list.forEach(m => {
        const tr = document.createElement("tr"); tr.className = "vh-row vh-maha";
        const lordFullTa = FULL_TA[m.lord] || m.lord;
        const nameTd = document.createElement("td");
        nameTd.innerHTML = `<span class="vh-lord-full">${escapeHtml(lordFullTa)}</span> <span class="vh-lord-en">(${escapeHtml(m.lord)})</span>`;
        nameTd.style.cursor = "pointer";
        nameTd.onclick = () => showMahadashaFocus(m, tz);

        const startTd = document.createElement("td"); startTd.textContent = shortDT(m.start);
        const sepTd = document.createElement("td"); sepTd.textContent = "-";
        const endTd = document.createElement("td"); endTd.textContent = shortDT(m.end);

        // active highlight
        try {
            const s = parseLocal(m.start), e = parseLocal(m.end);
            if (s && e && now >= s && now <= e) tr.classList.add("vh-active");
        } catch (e) { }

        tr.appendChild(nameTd); tr.appendChild(startTd); tr.appendChild(sepTd); tr.appendChild(endTd);
        tb.appendChild(tr);
    });

    tbl.appendChild(tb); wrap.appendChild(tbl);
}

// ---------------- Single-focus view (click MD -> hide others) ----------------
function showMahadashaFocus(maha, tz) {
    navStack = [{ node: maha, level: 1 }]; rebuildView(tz);
}

function rebuildView(tz) {
    const wrap = document.getElementById("dashaTreeWrap"); if (!wrap) return;
    wrap.innerHTML = "";

    // Header row: left = (optional small title), middle = breadcrumb inline, right = Full Dasa button
    const header = document.createElement("div"); header.className = "vh-header-inline";

    // small left title
    const left = document.createElement("div"); left.className = "vh-left-title"; left.textContent = "🪔 Vimshottari Dasa";
    header.appendChild(left);

    // breadcrumb (inline, replaces title area)
    const bread = document.createElement("div"); bread.className = "vh-breadcrumb-inline";
    // populate breadcrumb items from navStack (use short Tamil names + abbreviation)
    navStack.forEach((entry, idx) => {
        const node = entry.node;
        const level = entry.level;
        const shortName = SHORT_TA[node.lord] || (FULL_TA[node.lord] ? FULL_TA[node.lord].slice(0, 3) : node.lord);
        const abbr = LEVEL_LABELS[level] || "";
        const item = document.createElement("span"); item.className = "vh-bc-item-inline";

        // planet name (only planet part dark-orange if first item)
        const planetSpan = document.createElement("span"); planetSpan.className = "vh-bc-planet";
        planetSpan.textContent = shortName;
        if (idx === 0) planetSpan.classList.add("vh-bc-planet-active"); // planet-only dark orange for the first item

        // small separator and abbreviation
        const abbrSpan = document.createElement("span"); abbrSpan.className = "vh-bc-abbr"; abbrSpan.textContent = ` (${abbr})`;

        item.appendChild(planetSpan);
        item.appendChild(abbrSpan);

        // clickable: navigate back to this level (rebuild fresh)
        item.style.cursor = "pointer";
        item.onclick = () => {
            navStack = navStack.slice(0, idx + 1);
            rebuildView(tz);
        };

        bread.appendChild(item);
        if (idx < navStack.length - 1) {
            const sep = document.createElement("span"); sep.className = "vh-bc-sep-inline"; sep.textContent = " › ";
            bread.appendChild(sep);
        }
    });

    header.appendChild(bread);

    // right: Full Dasa List button
    const right = document.createElement("div"); right.className = "vh-right";
    const fullBtn = document.createElement("button"); fullBtn.className = "vh-fullbtn";
    fullBtn.textContent = "🪔 Full Dasa List";
    fullBtn.onclick = () => renderMahadashas(vimData.mahadashas, tz);
    right.appendChild(fullBtn);
    header.appendChild(right);

    wrap.appendChild(header);

    // show the current level's children (top-of-stack)
    const current = navStack[navStack.length - 1];
    showChildren(current.node, current.level, tz, wrap);
}

// ---------------- Load & show immediate children (level = parent's next) ----------------
// parent node at level L: show children of level L+1 (request level=1 to backend for immediate children)
async function showChildren(node, level, tz, wrap) {
    // small parent summary row (like JHora top block)
    const parentTable = document.createElement("table"); parentTable.className = "vh-table vh-parent";
    parentTable.innerHTML = `<tbody><tr class="vh-parent-row">
    <td class="vh-parent-name"><strong>${escapeHtml(FULL_TA[node.lord] || node.lord)}</strong> <span class="vh-lord-en">(${escapeHtml(node.lord)})</span></td>
    <td>${shortDT(node.start)}</td><td>-</td><td>${shortDT(node.end)}</td>
  </tr></tbody>`;
    wrap.appendChild(parentTable);

    // subheader with back button (if level>1)
    const subh = document.createElement("div"); subh.className = "vh-subheader";
    const subTitle = document.createElement("div"); subTitle.className = "vh-subtitle";
    subTitle.innerHTML = `<strong>${escapeHtml(FULL_TA[node.lord] || node.lord)}</strong> — ${LEVEL_LABELS[level] || ""}`;
    subh.appendChild(subTitle);
    if (level > 1) {
        const back = document.createElement("button"); back.className = "vh-back";
        back.textContent = `← Back to ${LEVEL_LABELS[level - 1] || "Parent"}`;
        back.onclick = () => { if (navStack.length > 1) navStack.pop(); rebuildView(tz); };
        subh.appendChild(back);
    }
    wrap.appendChild(subh);

    // loading spinner
    const loading = document.createElement("div"); loading.className = "vh-loading-block";
    loading.appendChild(createSpinner()); loading.append(" ஏற்றப்படுகிறது...");
    wrap.appendChild(loading);

    try {
        // use cache if available
        if (node._cache && Array.isArray(node._cache)) {
            loading.remove();
            renderChildrenTable(wrap, node._cache, level, tz, node);
            return;
        }

        // fetch immediate children (backend: level=1 returns immediate children)
        const payload = { start_jd: node.start_jd, end_jd: node.end_jd, tz: tz, level: 1, lord: node.lord };
        const res = await fetch("/vimshottari_subtree", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
        const j = await res.json();
        loading.remove();
        if (!j || j.status !== "ok") throw new Error(j?.message || "subtree failed");
        node._cache = j.subtree || []; // cache immediate children
        renderChildrenTable(wrap, node._cache, level, tz, node);
    } catch (err) {
        console.error("children load failed", err);
        loading.textContent = "⚠️ தரவு ஏற்றம் தோல்வி.";
    }
}

// ---------------- Render children table (compact JHora style) ----------------
function renderChildrenTable(wrapper, children, parentLevel, tz, parentNode) {
    const tbl = document.createElement("table"); tbl.className = "vh-table vh-childtable";
    tbl.innerHTML = `<thead><tr><th>${LEVEL_LABELS[parentLevel + 1]}</th><th>தொடக்கம்</th><th>-</th><th>முடிவு</th></tr></thead>`;
    const tb = document.createElement("tbody");
    const now = new Date();

    children.forEach(ch => {
        const tr = document.createElement("tr"); tr.className = "vh-row vh-child";
        const fullTa = FULL_TA[ch.lord] || ch.lord;
        const nameTd = document.createElement("td");
        nameTd.innerHTML = `<span class="vh-lord-full">${escapeHtml(fullTa)}</span> <span class="vh-lord-en">(${escapeHtml(ch.lord)})</span>`;
        if (parentLevel + 1 < 6) { // clickable until Prana level
            nameTd.style.cursor = "pointer";
            nameTd.onclick = () => { navStack.push({ node: ch, level: parentLevel + 1 }); rebuildView(tz); };
        }

        const sTd = document.createElement("td"); sTd.textContent = shortDT(ch.start);
        const midTd = document.createElement("td"); midTd.textContent = "-";
        const eTd = document.createElement("td"); eTd.textContent = shortDT(ch.end);

        // highlight if active (current time)
        try {
            const s = parseLocal(ch.start), e = parseLocal(ch.end);
            if (s && e && now >= s && now <= e) tr.classList.add("vh-active");
        } catch (e) { }

        tr.appendChild(nameTd); tr.appendChild(sTd); tr.appendChild(midTd); tr.appendChild(eTd);
        tb.appendChild(tr);
    });

    tbl.appendChild(tb);
    wrapper.appendChild(tbl);
}

// ---------------- Styles (embedded) ----------------
(function css() {
    const s = document.createElement("style");
    s.textContent = `
  /* Container basics */
  #dashaTreeWrap { font-family: "Noto Sans Tamil", Arial, Helvetica, sans-serif; font-size:13px; color:#222; }

  /* Header inline (left title, center breadcrumb, right full button) */
  .vh-header-inline { display:flex; align-items:center; justify-content:space-between; gap:12px; margin-bottom:6px; }
  .vh-left-title { font-weight:700; }

  /* Breadcrumb inline: placed in middle of header row */
  .vh-breadcrumb-inline { display:flex; align-items:center; justify-content:center; gap:6px; flex:1; text-align:center; }
  .vh-bc-item-inline { display:inline-flex; align-items:center; gap:6px; font-weight:600; font-size:13.2px; color:#1b3f91; cursor:pointer; }
  .vh-bc-planet { margin-right:4px; }
  .vh-bc-planet-active { color:#d35400; font-weight:700; }
  .vh-bc-abbr { color:#1b3f91; font-weight:600; margin-left:2px; font-size:12.8px; }
  .vh-bc-sep-inline { color:#5472d3; margin:0 6px; }

  /* Right button */
  .vh-right { flex:0 0 auto; }
  .vh-fullbtn { background:#ff9800; color:#fff; border:none; padding:6px 10px; border-radius:6px; cursor:pointer; }
  .vh-fullbtn:hover { background:#e68900; }

  /* Tables */
  .vh-table { width:100%; border-collapse:collapse; margin-bottom:8px; }
  .vh-table thead th { background:#fafafa; padding:6px 8px; border:1px solid #e6e6e6; text-align:left; color:#333; font-size:12.8px; }
  .vh-table td { padding:6px 8px; border:1px solid #eee; font-size:12.6px; }

  .vh-parent { margin-bottom:6px; border:none; }
  .vh-parent-row td { background:transparent; border:none; padding:4px 0; }

  .vh-lord-full { color:#0b5d2b; font-weight:600; }
  .vh-lord-en { color:#666; margin-left:6px; font-size:12px; }

  /* active highlight for rows */
  .vh-active td { background:#fff9c9; border-left:4px solid #f6c02b; }

  /* subheader/back */
  .vh-subheader { display:flex; justify-content:space-between; align-items:center; margin-top:8px; margin-bottom:6px; }
  .vh-subtitle { font-weight:600; }
  .vh-back { background:#f0f0f0; border:1px solid #ddd; padding:6px 8px; border-radius:4px; cursor:pointer; }
  .vh-back:hover { background:#eee; }

  /* breadcrumb divider style for visual separation if navStack length > 0 */
  .vh-breadcrumb-inline { padding-bottom:4px; border-bottom:1px solid #ccc; margin:4px 0 8px 0; }

  /* loading & spinner */
  .vh-loading, .vh-loading-block { display:flex; align-items:center; gap:8px; color:#666; margin:6px 0; }
  .vh-spinner svg { animation: vh-rot 1s linear infinite; }
  @keyframes vh-rot { from { transform:rotate(0deg); } to { transform:rotate(360deg); } }

  .vh-error { color:#a00; font-weight:700; }

  /* compact tuning */
  .vh-table td, .vh-table th { font-size:12.6px; }

  /* --- Planet & Abbreviation fine-tuning --- */
  .vh-bc-planet {
    font-size: 11.5px;
    font-weight: 600;
    margin-right: 2px;
  }

  .vh-bc-planet-active {
    color: #d35400;
    font-weight: 700;
    font-size: 13.5px;
  }

  /* smaller, lighter MD/B/A/P/S/PD label */
  .vh-bc-abbr {
    color: #1b3f91;
    font-weight: 500;
    font-size: 8.5px;
    vertical-align: middle;
    position: relative;
    top: 0.5px;
  }

  /* slightly reduce wider names like குரு, சனி */
  .vh-bc-planet:has(span:contains("குரு")),
  .vh-bc-planet:has(span:contains("சனி")) {
    font-size: 13px;
  }
  `;
    document.head.appendChild(s);
})();


// expose the loader globally for core.js
window.loadAndRenderVimshottariCompact = loadAndRenderVimshottariCompact;

