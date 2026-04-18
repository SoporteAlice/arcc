/* ============================================================
   GANTT.JS — FlowOS  |  Diagrama de Gantt de Proyectos
   Dependencias: DB (data.js), variables CSS de styles.css
   No modifica ningún archivo existente.
   Expone: renderGantt()
   ============================================================ */

function renderGantt() {
  const view = document.getElementById("viewArea");

  /* ── Inyectar estilos (una sola vez) ── */
  if (!document.getElementById("gantt-styles")) {
    const style = document.createElement("style");
    style.id = "gantt-styles";
    style.textContent = `
      .gantt-root { display:flex; flex-direction:column; height:calc(100vh - var(--topbar-h) - var(--subnav-h)); overflow:hidden; }
      .gantt-toolbar { display:flex; align-items:center; gap:8px; padding:10px 18px; background:var(--surface); border-bottom:1px solid var(--border); flex-shrink:0; flex-wrap:wrap; }
      .gantt-toolbar-title { font-size:13px; font-weight:700; color:var(--txt2); flex:1; }
      .gantt-chip { height:28px; padding:0 11px; border-radius:20px; border:1px solid var(--border); background:var(--surface); color:var(--txt3); font-size:12px; font-weight:500; cursor:pointer; transition:all .15s; font-family:'Inter',sans-serif; }
      .gantt-chip:hover { border-color:var(--brand-mid); color:var(--brand); }
      .gantt-chip.gc-active { background:var(--brand-lt); border-color:var(--brand-mid); color:var(--brand-dk); font-weight:600; }
      .gantt-legend { display:flex; align-items:center; gap:14px; padding:6px 18px; background:var(--surface2); border-bottom:1px solid var(--border); flex-shrink:0; flex-wrap:wrap; }
      .gantt-leg-item { display:flex; align-items:center; gap:5px; font-size:11px; color:var(--txt3); }
      .gantt-leg-sq { width:10px; height:10px; border-radius:2px; flex-shrink:0; }
      .gantt-body { display:flex; flex:1; overflow:hidden; }
      .gantt-left { width:190px; flex-shrink:0; border-right:1px solid var(--border); display:flex; flex-direction:column; background:var(--surface); }
      .gantt-left-head { height:52px; display:flex; align-items:center; padding:0 14px; font-size:11px; font-weight:700; text-transform:uppercase; letter-spacing:.5px; color:var(--txt4); border-bottom:1px solid var(--border); flex-shrink:0; }
      .gantt-left-list { flex:1; overflow-y:hidden; }
      .gantt-proj-row { height:46px; display:flex; align-items:center; padding:0 12px; gap:8px; border-bottom:1px solid var(--border); cursor:pointer; transition:background .12s; }
      .gantt-proj-row:hover { background:var(--surface2); }
      .gantt-proj-row.gpr-hidden { display:none; }
      .gantt-proj-dot { width:8px; height:8px; border-radius:50%; flex-shrink:0; }
      .gantt-proj-name { font-size:12px; font-weight:500; color:var(--txt2); white-space:nowrap; overflow:hidden; text-overflow:ellipsis; flex:1; }
      .gantt-right { flex:1; overflow-x:auto; overflow-y:hidden; display:flex; flex-direction:column; }
      .gantt-right::-webkit-scrollbar { height:5px; }
      .gantt-right::-webkit-scrollbar-thumb { background:var(--border2); border-radius:3px; }
      .gantt-months { height:52px; display:flex; align-items:flex-end; border-bottom:1px solid var(--border); background:var(--surface2); flex-shrink:0; }
      .gantt-month-cell { flex-shrink:0; border-right:1px solid var(--border); height:100%; display:flex; flex-direction:column; justify-content:flex-end; padding:0 0 7px 8px; }
      .gantt-month-lbl { font-size:11px; color:var(--txt3); white-space:nowrap; }
      .gantt-month-yr { font-size:10px; color:var(--txt4); }
      .gantt-chart { flex:1; overflow-y:hidden; position:relative; }
      .gantt-bar-row { height:46px; border-bottom:1px solid var(--border); position:relative; display:flex; align-items:center; }
      .gantt-bar-row.gpr-hidden { display:none; }
      .gantt-grid-line { position:absolute; top:0; bottom:0; width:1px; background:var(--border); pointer-events:none; }
      .gantt-today-line { position:absolute; top:0; bottom:0; width:2px; background:#dc2626; z-index:10; pointer-events:none; }
      .gantt-today-lbl { position:absolute; top:4px; font-size:10px; color:#dc2626; font-weight:600; white-space:nowrap; transform:translateX(-50%); z-index:11; pointer-events:none; }
      .gantt-bar { position:absolute; height:26px; top:10px; border-radius:5px; overflow:hidden; cursor:pointer; transition:opacity .15s; border-left:3px solid transparent; border-top-left-radius:0; border-bottom-left-radius:0; }
      .gantt-bar:hover { opacity:.8; }
      .gantt-bar-fill { position:absolute; left:0; top:0; bottom:0; }
      .gantt-bar-label { position:absolute; left:8px; right:36px; top:0; bottom:0; display:flex; align-items:center; font-size:11px; font-weight:500; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; pointer-events:none; }
      .gantt-bar-pct { position:absolute; right:6px; top:0; bottom:0; display:flex; align-items:center; font-size:10px; font-weight:600; pointer-events:none; }
      .gantt-tooltip { position:absolute; background:var(--surface); border:1px solid var(--border); border-radius:var(--radius-lg); padding:12px 14px; font-size:12px; z-index:200; pointer-events:none; min-width:190px; max-width:250px; box-shadow:var(--shadow); display:none; }
      .gantt-tooltip.gtt-show { display:block; }
      .gtt-name { font-size:13px; font-weight:600; color:var(--txt); margin-bottom:8px; }
      .gtt-row { display:flex; justify-content:space-between; gap:14px; margin-bottom:4px; }
      .gtt-key { color:var(--txt3); }
      .gtt-val { font-weight:500; color:var(--txt2); }
      .gantt-footer { display:grid; grid-template-columns:repeat(4,1fr); gap:10px; padding:10px 18px; background:var(--surface); border-top:1px solid var(--border); flex-shrink:0; }
      .gantt-stat { background:var(--surface2); border-radius:var(--radius); padding:10px 14px; text-align:center; }
      .gantt-stat-n { font-size:22px; font-weight:700; }
      .gantt-stat-l { font-size:11px; color:var(--txt3); margin-top:2px; }
    `;
    document.head.appendChild(style);
  }

  /* ── Configuración de estados ── */
  const STATUS_CFG = {
    pendiente:  { bg:"#fff7ed", bd:"#f97316", tx:"#9a3412", prog:"#fb923c", dot:"#f97316", label:"Pendiente" },
    desarrollo: { bg:"#eff6ff", bd:"#3b82f6", tx:"#1e40af", prog:"#60a5fa", dot:"#3b82f6", label:"En desarrollo" },
    qa:         { bg:"#fefce8", bd:"#b45309", tx:"#713f12", prog:"#d97706", dot:"#b45309", label:"QA" },
    publicado:  { bg:"#eef2ff", bd:"#6366f1", tx:"#312e81", prog:"#818cf8", dot:"#6366f1", label:"Publicado" },
    finalizado: { bg:"#f0fdf4", bd:"#22c55e", tx:"#14532d", prog:"#4ade80", dot:"#22c55e", label:"Finalizado" },
    descartado: { bg:"#f9fafb", bd:"#9ca3af", tx:"#374151", prog:"#d1d5db", dot:"#9ca3af", label:"Descartado" },
  };

  /* ── Rango temporal: Sep 2025 – Sep 2026 ── */
  const MONTHS = [];
  for (let y = 2025; y <= 2026; y++) {
    for (let m = 0; m < 12; m++) {
      if (y === 2025 && m < 8) continue;
      if (y === 2026 && m > 8) continue;
      MONTHS.push({ y, m });
    }
  }
  const MONTH_NAMES = ["ene","feb","mar","abr","may","jun","jul","ago","sep","oct","nov","dic"];
  const CELL_W  = 54;
  const ROW_H   = 46;
  const CHART_W = MONTHS.length * CELL_W;
  const RANGE_START = new Date(2025, 8, 1);

  function dateToX(str) {
    const d = new Date(str + "T00:00:00");
    const days = (d - RANGE_START) / 86400000;
    const totalDays = MONTHS.length * 30.44;
    return Math.max(0, Math.min((days / totalDays) * CHART_W, CHART_W));
  }

  function fmtShort(str) {
    const d = new Date(str + "T00:00:00");
    return `${d.getDate()} ${MONTH_NAMES[d.getMonth()]} ${d.getFullYear()}`;
  }

  /* ── Derivar fechas estimadas de fin desde DB.projects ── */
  const END_DATES = {
    p1:"2026-05-31", p2:"2026-04-30", p3:"2026-08-31",
    p4:"2026-02-28", p5:"2026-01-15", p6:"2025-11-30",
    p7:"2026-07-31", p8:"2026-06-30", p9:"2026-09-30",
    p10:"2026-07-20", p11:"2026-05-15",
  };

  /* ── Orden cronológico por fecha de inicio ── */
  const PROJ_ORDER = ["p6","p5","p4","p2","p1","p7","p3","p8","p11","p10","p9"];
  const projects = PROJ_ORDER
    .map(id => DB.projects.find(p => p.id === id))
    .filter(Boolean)
    .map(p => ({ ...p, end: END_DATES[p.id] || "2026-09-30" }));

  const TODAY_STR = "2026-04-17";
  const TODAY_X   = dateToX(TODAY_STR);

  /* ── Estado del filtro ── */
  let activeFilters = new Set(Object.keys(STATUS_CFG));

  /* ── Render principal ── */
  function build() {
    const tasksDoneByProj = id =>
      DB.tasks.filter(t => t.project === id && t.status === "done").length;
    const tasksTotalByProj = id =>
      DB.tasks.filter(t => t.project === id).length;

    /* chips de filtro */
    const chipHtml = Object.entries(STATUS_CFG).map(([k, c]) => {
      const on = activeFilters.has(k);
      return `<button class="gantt-chip ${on ? "gc-active" : ""}"
        style="${on ? `background:${c.bg};border-color:${c.bd};color:${c.tx}` : ""}"
        onclick="ganttToggleFilter('${k}')">${c.label}</button>`;
    }).join("");

    /* leyenda */
    const legHtml = Object.values(STATUS_CFG).map(c =>
      `<div class="gantt-leg-item">
        <div class="gantt-leg-sq" style="background:${c.bd}"></div>${c.label}
      </div>`
    ).join("") +
    `<div class="gantt-leg-item" style="margin-left:auto">
      <div style="width:12px;height:2px;background:#dc2626;flex-shrink:0"></div>
      Hoy (17 abr 2026)
    </div>`;

    /* cabecera de meses */
    const monthsHtml = MONTHS.map(({ y, m }, i) =>
      `<div class="gantt-month-cell" style="width:${CELL_W}px">
        <div class="gantt-month-lbl">${MONTH_NAMES[m]}</div>
        ${i === 0 || m === 0 ? `<div class="gantt-month-yr">${y}</div>` : ""}
      </div>`
    ).join("");

    /* filas del panel izquierdo */
    const projRowsHtml = projects.map(p => {
      const c   = STATUS_CFG[p.status] || STATUS_CFG.pendiente;
      const vis = activeFilters.has(p.status) ? "" : "gpr-hidden";
      return `<div class="gantt-proj-row ${vis}" data-pid="${p.id}"
        onclick="ganttClickProj('${p.id}','${p.name}','${p.status}')">
        <div class="gantt-proj-dot" style="background:${c.dot}"></div>
        <div class="gantt-proj-name" title="${p.name}">${p.name}</div>
      </div>`;
    }).join("");

    /* líneas de cuadrícula + línea de hoy */
    const gridLines = MONTHS.map((_, i) =>
      `<div class="gantt-grid-line" style="left:${i * CELL_W}px"></div>`
    ).join("");

    const todayLine = `
      <div class="gantt-today-line" style="left:${TODAY_X}px"></div>
      <div class="gantt-today-lbl"  style="left:${TODAY_X}px">hoy</div>`;

    /* barras */
    const barRowsHtml = projects.map(p => {
      const c   = STATUS_CFG[p.status] || STATUS_CFG.pendiente;
      const vis = activeFilters.has(p.status) ? "" : "gpr-hidden";
      const x1  = dateToX(p.created);
      const x2  = dateToX(p.end);
      const bw  = Math.max(x2 - x1, 16);
      const fw  = bw * (p.progress / 100);
      const done  = tasksDoneByProj(p.id);
      const total = tasksTotalByProj(p.id);
      return `<div class="gantt-bar-row ${vis}" data-pid="${p.id}" style="width:${CHART_W}px">
        <div class="gantt-bar"
          style="left:${x1}px;width:${bw}px;background:${c.bg};border-left-color:${c.bd}"
          onmouseenter="ganttShowTip(event,'${p.id}')"
          onmouseleave="ganttHideTip()"
          onclick="ganttClickProj('${p.id}','${p.name}','${p.status}')">
          <div class="gantt-bar-fill" style="width:${fw}px;background:${c.prog}"></div>
          ${bw > 90 ? `<div class="gantt-bar-label" style="color:${c.tx}">${p.name.slice(0, 24)}${p.name.length > 24 ? "…" : ""}</div>` : ""}
          ${bw > 50 ? `<div class="gantt-bar-pct" style="color:${c.tx}">${p.progress}%</div>` : ""}
        </div>
      </div>`;
    }).join("");

    /* estadísticas del pie */
    const activos   = projects.filter(p => p.status === "desarrollo" || p.status === "qa").length;
    const finalizados = projects.filter(p => p.status === "finalizado" || p.status === "publicado").length;
    const avgProg   = Math.round(projects.reduce((s, p) => s + p.progress, 0) / projects.length);
    const critical  = projects.filter(p => {
      const d = new Date(p.end + "T00:00:00");
      const hoy = new Date("2026-04-17");
      const diff = (d - hoy) / 86400000;
      return diff > 0 && diff <= 45 && p.status !== "finalizado" && p.status !== "descartado";
    }).length;

    view.innerHTML = `
      <div class="gantt-root">

        <div class="gantt-toolbar">
          <span class="gantt-toolbar-title">Gantt de Proyectos</span>
          ${chipHtml}
          <button class="btn btn-ghost btn-sm" onclick="ganttResetFilter()">Limpiar</button>
        </div>

        <div class="gantt-legend">${legHtml}</div>

        <div class="gantt-body">

          <div class="gantt-left">
            <div class="gantt-left-head">Proyecto</div>
            <div class="gantt-left-list" id="ganttLeftList">${projRowsHtml}</div>
          </div>

          <div class="gantt-right" id="ganttRight">
            <div class="gantt-months" style="width:${CHART_W}px">${monthsHtml}</div>
            <div class="gantt-chart" id="ganttChart" style="width:${CHART_W}px">
              ${gridLines}
              ${todayLine}
              ${barRowsHtml}
              <div class="gantt-tooltip" id="ganttTooltip"></div>
            </div>
          </div>

        </div>

        <div class="gantt-footer">
          <div class="gantt-stat">
            <div class="gantt-stat-n" style="color:#3b82f6">${activos}</div>
            <div class="gantt-stat-l">En ejecución</div>
          </div>
          <div class="gantt-stat">
            <div class="gantt-stat-n" style="color:#22c55e">${finalizados}</div>
            <div class="gantt-stat-l">Completados</div>
          </div>
          <div class="gantt-stat">
            <div class="gantt-stat-n" style="color:#6366f1">${avgProg}%</div>
            <div class="gantt-stat-l">Progreso promedio</div>
          </div>
          <div class="gantt-stat">
            <div class="gantt-stat-n" style="color:#dc2626">${critical}</div>
            <div class="gantt-stat-l">Vencen en 45 días</div>
          </div>
        </div>

      </div>
    `;

    /* sincronizar scroll vertical entre panel izquierdo y barras */
    const chart = document.getElementById("ganttChart");
    const right = document.getElementById("ganttRight");
    const list  = document.getElementById("ganttLeftList");
    if (right && list) {
      right.addEventListener("scroll", () => { list.scrollTop = right.scrollTop; });
    }

    /* tooltip: seguir al cursor dentro del chart */
    if (chart) {
      chart.addEventListener("mousemove", e => {
        const tip = document.getElementById("ganttTooltip");
        if (!tip || !tip.classList.contains("gtt-show")) return;
        const rect = chart.getBoundingClientRect();
        const x = e.clientX - rect.left + 14;
        const y = e.clientY - rect.top  - 80;
        tip.style.left = Math.min(x, CHART_W - 260) + "px";
        tip.style.top  = Math.max(0, y) + "px";
      });
    }
  }

  /* ── Helpers globales (necesarios para los handlers inline) ── */
  window.ganttToggleFilter = function(status) {
    if (activeFilters.has(status)) activeFilters.delete(status);
    else activeFilters.add(status);
    build();
  };

  window.ganttResetFilter = function() {
    activeFilters = new Set(Object.keys(STATUS_CFG));
    build();
  };

  window.ganttShowTip = function(e, id) {
    const p = projects.find(x => x.id === id);
    if (!p) return;
    const c = STATUS_CFG[p.status];
    const tip = document.getElementById("ganttTooltip");
    if (!tip) return;
    const done  = DB.tasks.filter(t => t.project === id && t.status === "done").length;
    const total = DB.tasks.filter(t => t.project === id).length;
    const teamNames = p.team.map(uid => DB.getUser(uid)?.name || uid).join(", ");
    tip.innerHTML = `
      <div class="gtt-name">${p.name}</div>
      <div class="gtt-row"><span class="gtt-key">Estado</span>
        <span class="gtt-val" style="color:${c.dot}">${c.label}</span></div>
      <div class="gtt-row"><span class="gtt-key">Progreso</span>
        <span class="gtt-val">${p.progress}%</span></div>
      <div class="gtt-row"><span class="gtt-key">Inicio</span>
        <span class="gtt-val">${p.created}</span></div>
      <div class="gtt-row"><span class="gtt-key">Fin est.</span>
        <span class="gtt-val">${p.end}</span></div>
      <div class="gtt-row"><span class="gtt-key">Tareas</span>
        <span class="gtt-val">${done}/${total} completadas</span></div>
      <div class="gtt-row"><span class="gtt-key">Equipo</span>
        <span class="gtt-val">${teamNames}</span></div>
    `;
    tip.classList.add("gtt-show");
  };

  window.ganttHideTip = function() {
    const tip = document.getElementById("ganttTooltip");
    if (tip) tip.classList.remove("gtt-show");
  };

  window.ganttClickProj = function(id, name, status) {
    /* Al hacer clic en nombre/barra → navegar a la vista interna del proyecto */
    renderProjectView(id);
  };

  build();
}
