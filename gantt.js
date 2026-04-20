/* ============================================================
   GANTT.JS — FlowOS  |  Diagrama de Gantt Interactivo v2.0
   ─────────────────────────────────────────────────────────
   MEJORAS:
   ① Vista de tareas por proyecto (clic en barra → drill-down)
   ② Drag & Drop horizontal para reprogramar tareas
   ③ Cálculo y visualización de Ruta Crítica
   ④ Sincronización inmediata con Calendario y Dashboard
   ============================================================ */

function renderGantt() {
  const view = document.getElementById("viewArea");

  /* ── Inyectar estilos (una sola vez) ── */
  if (!document.getElementById("gantt-styles")) {
    const style = document.createElement("style");
    style.id = "gantt-styles";
    style.textContent = `
      /* ── Layout ── */
      .gantt-root { display:flex; flex-direction:column; height:calc(100vh - var(--topbar-h) - var(--subnav-h)); overflow:hidden; }

      /* ── Toolbar ── */
      .gantt-toolbar { display:flex; align-items:center; gap:8px; padding:10px 18px; background:var(--surface); border-bottom:1px solid var(--border); flex-shrink:0; flex-wrap:wrap; }
      .gantt-toolbar-title { font-size:13px; font-weight:700; color:var(--txt2); flex:1; }
      .gantt-breadcrumb { display:flex; align-items:center; gap:6px; flex:1; }
      .gantt-breadcrumb-home { font-size:13px; font-weight:700; color:var(--brand); cursor:pointer; padding:2px 6px; border-radius:4px; transition:background .15s; }
      .gantt-breadcrumb-home:hover { background:var(--brand-lt); }
      .gantt-breadcrumb-sep { color:var(--txt4); font-size:13px; }
      .gantt-breadcrumb-cur { font-size:13px; font-weight:600; color:var(--txt2); }
      .gantt-chip { height:28px; padding:0 11px; border-radius:20px; border:1px solid var(--border); background:var(--surface); color:var(--txt3); font-size:12px; font-weight:500; cursor:pointer; transition:all .15s; font-family:'Inter',sans-serif; }
      .gantt-chip:hover { border-color:var(--brand-mid); color:var(--brand); }
      .gantt-chip.gc-active { background:var(--brand-lt); border-color:var(--brand-mid); color:var(--brand-dk); font-weight:600; }
      .gantt-back-btn { display:flex; align-items:center; gap:5px; height:28px; padding:0 12px; border-radius:6px; border:1px solid var(--border); background:var(--surface); color:var(--txt2); font-size:12px; font-weight:500; cursor:pointer; transition:all .15s; font-family:'Inter',sans-serif; }
      .gantt-back-btn:hover { border-color:var(--brand); color:var(--brand); background:var(--brand-lt); }
      .gantt-back-btn svg { width:14px; height:14px; stroke:currentColor; fill:none; stroke-width:2.5; }

      /* ── Legend ── */
      .gantt-legend { display:flex; align-items:center; gap:14px; padding:6px 18px; background:var(--surface2); border-bottom:1px solid var(--border); flex-shrink:0; flex-wrap:wrap; }
      .gantt-leg-item { display:flex; align-items:center; gap:5px; font-size:11px; color:var(--txt3); }
      .gantt-leg-sq { width:10px; height:10px; border-radius:2px; flex-shrink:0; }

      /* ── Body / Panels ── */
      .gantt-body { display:flex; flex:1; overflow:hidden; }
      .gantt-left { width:200px; flex-shrink:0; border-right:1px solid var(--border); display:flex; flex-direction:column; background:var(--surface); }
      .gantt-left-head { height:52px; display:flex; align-items:center; padding:0 14px; font-size:11px; font-weight:700; text-transform:uppercase; letter-spacing:.5px; color:var(--txt4); border-bottom:1px solid var(--border); flex-shrink:0; justify-content:space-between; }
      .gantt-left-list { flex:1; overflow-y:hidden; }

      /* ── Project row (vista de proyectos) ── */
      .gantt-proj-row { height:46px; display:flex; align-items:center; padding:0 12px; gap:8px; border-bottom:1px solid var(--border); cursor:pointer; transition:background .12s; }
      .gantt-proj-row:hover { background:var(--surface2); }
      .gantt-proj-row.gpr-hidden { display:none; }
      .gantt-proj-dot { width:8px; height:8px; border-radius:50%; flex-shrink:0; }
      .gantt-proj-name { font-size:12px; font-weight:500; color:var(--txt2); white-space:nowrap; overflow:hidden; text-overflow:ellipsis; flex:1; }
      .gantt-proj-arrow { color:var(--txt4); font-size:14px; opacity:0; transition:opacity .15s; flex-shrink:0; }
      .gantt-proj-row:hover .gantt-proj-arrow { opacity:1; }

      /* ── Task row (vista de tareas) ── */
      .gantt-task-row { height:40px; display:flex; align-items:center; padding:0 10px; gap:7px; border-bottom:1px solid var(--border); transition:background .12s; }
      .gantt-task-row:hover { background:var(--surface2); }
      .gantt-task-check { width:14px; height:14px; border:1.5px solid var(--border2); border-radius:3px; flex-shrink:0; cursor:pointer; display:flex; align-items:center; justify-content:center; transition:all .15s; }
      .gantt-task-check.done { background:var(--brand); border-color:var(--brand); }
      .gantt-task-check svg { width:8px; height:8px; stroke:#fff; fill:none; stroke-width:3; }
      .gantt-task-name { font-size:11.5px; color:var(--txt2); white-space:nowrap; overflow:hidden; text-overflow:ellipsis; flex:1; }
      .gantt-task-name.done-txt { text-decoration:line-through; color:var(--txt4); }
      .gantt-task-priority { width:6px; height:6px; border-radius:50%; flex-shrink:0; }

      /* ── Right panel ── */
      .gantt-right { flex:1; overflow-x:auto; overflow-y:hidden; display:flex; flex-direction:column; }
      .gantt-right::-webkit-scrollbar { height:5px; }
      .gantt-right::-webkit-scrollbar-thumb { background:var(--border2); border-radius:3px; }
      .gantt-months { height:52px; display:flex; align-items:flex-end; border-bottom:1px solid var(--border); background:var(--surface2); flex-shrink:0; }
      .gantt-month-cell { flex-shrink:0; border-right:1px solid var(--border); height:100%; display:flex; flex-direction:column; justify-content:flex-end; padding:0 0 7px 8px; }
      .gantt-month-lbl { font-size:11px; color:var(--txt3); white-space:nowrap; }
      .gantt-month-yr { font-size:10px; color:var(--txt4); }
      .gantt-chart { flex:1; overflow-y:hidden; position:relative; }

      /* ── Bar rows ── */
      .gantt-bar-row { height:46px; border-bottom:1px solid var(--border); position:relative; display:flex; align-items:center; }
      .gantt-task-bar-row { height:40px; border-bottom:1px solid var(--border); position:relative; display:flex; align-items:center; }
      .gantt-bar-row.gpr-hidden, .gantt-task-bar-row.gpr-hidden { display:none; }

      /* ── Grid / Today ── */
      .gantt-grid-line { position:absolute; top:0; bottom:0; width:1px; background:var(--border); pointer-events:none; }
      .gantt-today-line { position:absolute; top:0; bottom:0; width:2px; background:#dc2626; z-index:10; pointer-events:none; }
      .gantt-today-lbl { position:absolute; top:4px; font-size:10px; color:#dc2626; font-weight:600; white-space:nowrap; transform:translateX(-50%); z-index:11; pointer-events:none; }

      /* ── Project bar ── */
      .gantt-bar { position:absolute; height:26px; top:10px; border-radius:5px; overflow:hidden; cursor:pointer; transition:opacity .15s; border-left:3px solid transparent; border-top-left-radius:0; border-bottom-left-radius:0; }
      .gantt-bar:hover { opacity:.8; }
      .gantt-bar-fill { position:absolute; left:0; top:0; bottom:0; }
      .gantt-bar-label { position:absolute; left:8px; right:36px; top:0; bottom:0; display:flex; align-items:center; font-size:11px; font-weight:500; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; pointer-events:none; }
      .gantt-bar-pct { position:absolute; right:6px; top:0; bottom:0; display:flex; align-items:center; font-size:10px; font-weight:600; pointer-events:none; }
      .gantt-bar-drill-hint { position:absolute; right:-22px; top:50%; transform:translateY(-50%); font-size:10px; color:var(--brand); opacity:0; transition:opacity .15s; pointer-events:none; white-space:nowrap; background:var(--brand-lt); padding:2px 5px; border-radius:4px; }
      .gantt-bar:hover .gantt-bar-drill-hint { opacity:1; }

      /* ── Task bar ── */
      .gantt-task-bar {
        position:absolute; height:22px; top:9px;
        border-radius:4px; overflow:visible;
        cursor:grab; user-select:none;
        border-left:3px solid transparent;
        border-top-left-radius:0; border-bottom-left-radius:0;
        transition:box-shadow .15s, opacity .15s;
        will-change:transform;
      }
      .gantt-task-bar:hover { box-shadow:0 2px 8px rgba(0,0,0,.18); z-index:20; }
      .gantt-task-bar.dragging { opacity:.7; cursor:grabbing; box-shadow:0 4px 16px rgba(0,0,0,.28); z-index:50; }
      .gantt-task-bar-fill { position:absolute; left:0; top:0; bottom:0; border-radius:2px; }
      .gantt-task-bar-label { position:absolute; left:7px; right:4px; top:0; bottom:0; display:flex; align-items:center; font-size:10.5px; font-weight:500; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; pointer-events:none; }

      /* ── Critical path ── */
      .gantt-task-bar.critical {
        border-left-color:#ef4444 !important;
        background:#fff5f5 !important;
      }
      .gantt-task-bar.critical .gantt-task-bar-fill { background:#fca5a5 !important; }
      .gantt-task-bar.critical .gantt-task-bar-label { color:#991b1b !important; }
      .gantt-critical-badge {
        position:absolute; right:-42px; top:50%; transform:translateY(-50%);
        background:#fef2f2; border:1px solid #fca5a5; color:#dc2626;
        font-size:9px; font-weight:700; padding:1px 5px; border-radius:10px;
        white-space:nowrap; pointer-events:none;
      }
      .gantt-leg-critical { background:#fca5a5; border-radius:2px; }

      /* ── Drag ghost line ── */
      .gantt-drop-indicator {
        position:absolute; top:0; bottom:0; width:2px;
        background:rgba(45,156,110,.5); z-index:30; pointer-events:none; display:none;
      }

      /* ── Tooltip ── */
      .gantt-tooltip { position:absolute; background:var(--surface); border:1px solid var(--border); border-radius:var(--radius-lg); padding:12px 14px; font-size:12px; z-index:200; pointer-events:none; min-width:190px; max-width:260px; box-shadow:var(--shadow); display:none; }
      .gantt-tooltip.gtt-show { display:block; }
      .gtt-name { font-size:13px; font-weight:600; color:var(--txt); margin-bottom:8px; }
      .gtt-row { display:flex; justify-content:space-between; gap:14px; margin-bottom:4px; }
      .gtt-key { color:var(--txt3); }
      .gtt-val { font-weight:500; color:var(--txt2); }
      .gtt-critical-tag { display:inline-block; background:#fef2f2; color:#dc2626; font-size:10px; font-weight:700; padding:2px 7px; border-radius:10px; margin-top:6px; border:1px solid #fca5a5; }

      /* ── Footer stats ── */
      .gantt-footer { display:grid; grid-template-columns:repeat(4,1fr); gap:10px; padding:10px 18px; background:var(--surface); border-top:1px solid var(--border); flex-shrink:0; }
      .gantt-stat { background:var(--surface2); border-radius:var(--radius); padding:10px 14px; text-align:center; }
      .gantt-stat-n { font-size:22px; font-weight:700; }
      .gantt-stat-l { font-size:11px; color:var(--txt3); margin-top:2px; }

      /* ── Drag date label ── */
      .gantt-drag-date {
        position:fixed; background:#1a2035; color:#fff; font-size:11px; font-weight:600;
        padding:4px 9px; border-radius:6px; pointer-events:none; z-index:9999; display:none;
        box-shadow:0 2px 8px rgba(0,0,0,.3);
      }
    `;
    document.head.appendChild(style);
  }

  /* ════════════════════════════════════════
     CONFIGURACIÓN Y CONSTANTES
  ════════════════════════════════════════ */
  const STATUS_CFG = {
    pendiente:  { bg:"#fff7ed", bd:"#f97316", tx:"#9a3412", prog:"#fb923c", dot:"#f97316", label:"Pendiente" },
    desarrollo: { bg:"#eff6ff", bd:"#3b82f6", tx:"#1e40af", prog:"#60a5fa", dot:"#3b82f6", label:"En desarrollo" },
    qa:         { bg:"#fefce8", bd:"#b45309", tx:"#713f12", prog:"#d97706", dot:"#b45309", label:"QA" },
    publicado:  { bg:"#eef2ff", bd:"#6366f1", tx:"#312e81", prog:"#818cf8", dot:"#6366f1", label:"Publicado" },
    finalizado: { bg:"#f0fdf4", bd:"#22c55e", tx:"#14532d", prog:"#4ade80", dot:"#22c55e", label:"Finalizado" },
    descartado: { bg:"#f9fafb", bd:"#9ca3af", tx:"#374151", prog:"#d1d5db", dot:"#9ca3af", label:"Descartado" },
  };

  const TASK_STATUS_CFG = {
    pending:  { bg:"#fff7ed", bd:"#f97316", tx:"#9a3412", prog:"#fb923c" },
    doing:    { bg:"#eff6ff", bd:"#3b82f6", tx:"#1e40af", prog:"#60a5fa" },
    done:     { bg:"#f0fdf4", bd:"#22c55e", tx:"#14532d", prog:"#4ade80" },
    wishlist: { bg:"#faf5ff", bd:"#8b5cf6", tx:"#4c1d95", prog:"#a78bfa" },
  };

  const PRIORITY_COLORS = { high:"#ef4444", medium:"#f59e0b", low:"#22c55e" };
  const MONTH_NAMES = ["ene","feb","mar","abr","may","jun","jul","ago","sep","oct","nov","dic"];

  /* Rango temporal */
  const MONTHS = [];
  for (let y = 2025; y <= 2026; y++) {
    for (let m = 0; m < 12; m++) {
      if (y === 2025 && m < 8) continue;
      if (y === 2026 && m > 8) continue;
      MONTHS.push({ y, m });
    }
  }

  const CELL_W      = 54;
  const ROW_H_PROJ  = 46;
  const ROW_H_TASK  = 40;
  const CHART_W     = MONTHS.length * CELL_W;
  const RANGE_START = new Date(2025, 8, 1);
  const TODAY_STR   = "2026-04-20";

  /* Fechas estimadas de fin por proyecto */
  const END_DATES = {
    p1:"2026-05-31", p2:"2026-04-30", p3:"2026-08-31",
    p4:"2026-02-28", p5:"2026-01-15", p6:"2025-11-30",
    p7:"2026-07-31", p8:"2026-06-30", p9:"2026-09-30",
    p10:"2026-07-20", p11:"2026-05-15",
  };

  const PROJ_ORDER = ["p6","p5","p4","p2","p1","p7","p3","p8","p11","p10","p9"];

  /* ── Estado reactivo del módulo ── */
  const ganttState = {
    activeFilters: new Set(Object.keys(STATUS_CFG)),
    currentProject: null,   // null = vista de proyectos; string = id del proyecto
    dragging: null,          // { taskId, barEl, startX, origLeft, origDate }
  };

  /* ════════════════════════════════════════
     UTILIDADES DE COORDENADAS
  ════════════════════════════════════════ */
  function dateToX(str) {
    if (!str) return 0;
    const d = new Date(str + "T00:00:00");
    const days = (d - RANGE_START) / 86400000;
    const totalDays = MONTHS.length * 30.44;
    return Math.max(0, Math.min((days / totalDays) * CHART_W, CHART_W));
  }

  function xToDate(x) {
    const totalDays = MONTHS.length * 30.44;
    const days = Math.round((x / CHART_W) * totalDays);
    const d = new Date(RANGE_START);
    d.setDate(d.getDate() + days);
    return d.toISOString().slice(0, 10);
  }

  function fmtShort(str) {
    if (!str) return "—";
    const d = new Date(str + "T00:00:00");
    return `${d.getDate()} ${MONTH_NAMES[d.getMonth()]} ${d.getFullYear()}`;
  }

  /* ════════════════════════════════════════
     ③ CÁLCULO DE RUTA CRÍTICA
     Una tarea es crítica si:
     – No está completada (status !== 'done')
     – Su fecha de vencimiento ≤ fecha de fin estimada del proyecto
       Y la diferencia es ≤ 14 días (margen muy ajustado)
     – O está vencida respecto a hoy
  ════════════════════════════════════════ */
  function computeCriticalTasks(projectId) {
    const proj = DB.projects.find(p => p.id === projectId);
    if (!proj) return new Set();

    const projEnd   = new Date((END_DATES[projectId] || "2026-09-30") + "T00:00:00");
    const today     = new Date(TODAY_STR + "T00:00:00");
    const criticals = new Set();

    DB.tasks
      .filter(t => t.project === projectId && t.status !== "done")
      .forEach(t => {
        if (!t.due) return;
        const dueDate = new Date(t.due + "T00:00:00");
        const msToProj   = projEnd - dueDate;
        const msToToday  = dueDate - today;
        const daysToProj  = msToProj / 86400000;
        const daysToToday = msToToday / 86400000;

        // Crítica si: vencida O margen al fin del proyecto ≤ 14 días
        if (daysToToday < 0 || daysToProj <= 14) {
          criticals.add(t.id);
        }
      });

    return criticals;
  }

  /* ════════════════════════════════════════
     ④ SINCRONIZACIÓN CON OTROS MÓDULOS
     Notifica a Calendario y Dashboard
  ════════════════════════════════════════ */
  function syncAllModules() {
    // Si hay un calendario renderizado, lo reconstruye
    if (typeof buildWeekCalendar === "function") {
      try { buildWeekCalendar(ganttState.currentProject); } catch(e) {}
    }
    // Si hay un dashboard renderizado, lo reconstruye
    if (typeof renderDashboard === "function") {
      // Sólo si la vista actual es dashboard (no interrumpimos al usuario)
      const currentSection = window.App?.section;
      const currentTab     = window.App?.tab;
      if (currentSection === "dashboard") {
        try { renderDashboard(); } catch(e) {}
      }
    }
    // Actualizar contadores de subnav
    if (typeof buildSubnav === "function" && typeof getTabCount === "function") {
      try {
        const nav = document.getElementById("subnav");
        if (nav) {
          nav.querySelectorAll(".tab-btn").forEach(btn => {
            const count = getTabCount(btn.dataset.tab);
            const badge = btn.querySelector(".tab-count");
            if (badge) badge.textContent = count;
          });
        }
      } catch(e) {}
    }
  }

  /* ════════════════════════════════════════
     RENDER PRINCIPAL (entrada)
  ════════════════════════════════════════ */
  function build() {
    if (ganttState.currentProject) {
      buildTaskView(ganttState.currentProject);
    } else {
      buildProjectView();
    }
  }

  /* ════════════════════════════════════════
     VISTA DE PROYECTOS (nivel 1)
  ════════════════════════════════════════ */
  function buildProjectView() {
    const projects = PROJ_ORDER
      .map(id => DB.projects.find(p => p.id === id))
      .filter(Boolean)
      .map(p => ({ ...p, end: END_DATES[p.id] || "2026-09-30" }));

    const TODAY_X = dateToX(TODAY_STR);

    /* chips */
    const chipHtml = Object.entries(STATUS_CFG).map(([k, c]) => {
      const on = ganttState.activeFilters.has(k);
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
      <div style="width:12px;height:2px;background:#dc2626;flex-shrink:0"></div> Hoy
    </div>
    <div class="gantt-leg-item">
      <svg viewBox="0 0 12 12" style="width:12px;height:12px;flex-shrink:0">
        <circle cx="6" cy="6" r="5" fill="#fca5a5" stroke="#ef4444" stroke-width="1.5"/>
      </svg> Click en barra → ver tareas
    </div>`;

    /* cabecera de meses */
    const monthsHtml = MONTHS.map(({ y, m }, i) =>
      `<div class="gantt-month-cell" style="width:${CELL_W}px">
        <div class="gantt-month-lbl">${MONTH_NAMES[m]}</div>
        ${i === 0 || m === 0 ? `<div class="gantt-month-yr">${y}</div>` : ""}
      </div>`
    ).join("");

    /* panel izquierdo */
    const projRowsHtml = projects.map(p => {
      const c   = STATUS_CFG[p.status] || STATUS_CFG.pendiente;
      const vis = ganttState.activeFilters.has(p.status) ? "" : "gpr-hidden";
      return `<div class="gantt-proj-row ${vis}" data-pid="${p.id}">
        <div class="gantt-proj-dot" style="background:${c.dot}"></div>
        <div class="gantt-proj-name" title="${p.name}">${p.name}</div>
        <div class="gantt-proj-arrow">›</div>
      </div>`;
    }).join("");

    /* grid + hoy */
    const gridLines = MONTHS.map((_, i) =>
      `<div class="gantt-grid-line" style="left:${i * CELL_W}px"></div>`
    ).join("");
    const todayLine = `
      <div class="gantt-today-line" style="left:${TODAY_X}px"></div>
      <div class="gantt-today-lbl"  style="left:${TODAY_X}px">hoy</div>`;

    /* barras de proyectos */
    const barRowsHtml = projects.map(p => {
      const c   = STATUS_CFG[p.status] || STATUS_CFG.pendiente;
      const vis = ganttState.activeFilters.has(p.status) ? "" : "gpr-hidden";
      const x1  = dateToX(p.created);
      const x2  = dateToX(p.end);
      const bw  = Math.max(x2 - x1, 16);
      const fw  = bw * (p.progress / 100);
      const done  = DB.tasks.filter(t => t.project === p.id && t.status === "done").length;
      const total = DB.tasks.filter(t => t.project === p.id).length;
      return `<div class="gantt-bar-row ${vis}" data-pid="${p.id}" style="width:${CHART_W}px">
        <div class="gantt-bar"
          style="left:${x1}px;width:${bw}px;background:${c.bg};border-left-color:${c.bd}"
          onmouseenter="ganttShowProjTip(event,'${p.id}')"
          onmouseleave="ganttHideTip()"
          onclick="ganttDrillDown('${p.id}')">
          <div class="gantt-bar-fill" style="width:${fw}px;background:${c.prog}"></div>
          ${bw > 90 ? `<div class="gantt-bar-label" style="color:${c.tx}">${p.name.slice(0, 22)}${p.name.length > 22 ? "…" : ""}</div>` : ""}
          ${bw > 50 ? `<div class="gantt-bar-pct" style="color:${c.tx}">${p.progress}%</div>` : ""}
          <div class="gantt-bar-drill-hint">ver tareas →</div>
        </div>
      </div>`;
    }).join("");

    /* estadísticas */
    const activos     = projects.filter(p => p.status === "desarrollo" || p.status === "qa").length;
    const finalizados = projects.filter(p => p.status === "finalizado" || p.status === "publicado").length;
    const avgProg     = Math.round(projects.reduce((s, p) => s + p.progress, 0) / projects.length);
    const critical    = projects.filter(p => {
      const d = new Date(p.end + "T00:00:00");
      const hoy = new Date(TODAY_STR);
      const diff = (d - hoy) / 86400000;
      return diff > 0 && diff <= 45 && p.status !== "finalizado" && p.status !== "descartado";
    }).length;

    view.innerHTML = `
      <div class="gantt-root" id="ganttRoot">
        <div class="gantt-toolbar">
          <span class="gantt-toolbar-title">Gantt de Proyectos</span>
          ${chipHtml}
          <button class="btn btn-ghost btn-sm" onclick="ganttResetFilter()">Limpiar</button>
        </div>
        <div class="gantt-legend">${legHtml}</div>
        <div class="gantt-body">
          <div class="gantt-left">
            <div class="gantt-left-head"><span>Proyecto</span></div>
            <div class="gantt-left-list" id="ganttLeftList">${projRowsHtml}</div>
          </div>
          <div class="gantt-right" id="ganttRight">
            <div class="gantt-months" style="width:${CHART_W}px">${monthsHtml}</div>
            <div class="gantt-chart" id="ganttChart" style="width:${CHART_W}px">
              ${gridLines}${todayLine}
              ${barRowsHtml}
              <div class="gantt-tooltip" id="ganttTooltip"></div>
            </div>
          </div>
        </div>
        <div class="gantt-footer">
          <div class="gantt-stat"><div class="gantt-stat-n" style="color:#3b82f6">${activos}</div><div class="gantt-stat-l">En ejecución</div></div>
          <div class="gantt-stat"><div class="gantt-stat-n" style="color:#22c55e">${finalizados}</div><div class="gantt-stat-l">Completados</div></div>
          <div class="gantt-stat"><div class="gantt-stat-n" style="color:#6366f1">${avgProg}%</div><div class="gantt-stat-l">Progreso promedio</div></div>
          <div class="gantt-stat"><div class="gantt-stat-n" style="color:#dc2626">${critical}</div><div class="gantt-stat-l">Vencen en 45 días</div></div>
        </div>
      </div>
      <div class="gantt-drag-date" id="ganttDragDate"></div>
    `;

    bindProjectViewEvents();
  }

  /* ════════════════════════════════════════
     ① VISTA DE TAREAS (nivel 2 — drill-down)
  ════════════════════════════════════════ */
  function buildTaskView(projectId) {
    const proj = DB.projects.find(p => p.id === projectId);
    if (!proj) { ganttState.currentProject = null; build(); return; }

    const tasks      = DB.tasks.filter(t => t.project === projectId);
    const projEnd    = END_DATES[projectId] || "2026-09-30";
    const TODAY_X    = dateToX(TODAY_STR);
    const criticals  = computeCriticalTasks(projectId);   // ③ ruta crítica
    const projCfg    = STATUS_CFG[proj.status] || STATUS_CFG.pendiente;

    /* cabecera de meses */
    const monthsHtml = MONTHS.map(({ y, m }, i) =>
      `<div class="gantt-month-cell" style="width:${CELL_W}px">
        <div class="gantt-month-lbl">${MONTH_NAMES[m]}</div>
        ${i === 0 || m === 0 ? `<div class="gantt-month-yr">${y}</div>` : ""}
      </div>`
    ).join("");

    /* panel izquierdo — lista de tareas */
    const taskRowsHtml = tasks.map(t => {
      const isCrit = criticals.has(t.id);
      return `<div class="gantt-task-row ${isCrit ? "gantt-critical-row" : ""}" data-tid="${t.id}">
        <div class="gantt-task-priority" style="background:${PRIORITY_COLORS[t.priority] || "#ccc"}"></div>
        <div class="gantt-task-check ${t.status === "done" ? "done" : ""}"
             onclick="ganttToggleTask('${t.id}')" title="Marcar como ${t.status === "done" ? "pendiente" : "hecha"}">
          ${t.status === "done" ? `<svg viewBox="0 0 24 24"><path d="M20 6L9 17l-5-5"/></svg>` : ""}
        </div>
        <div class="gantt-task-name ${t.status === "done" ? "done-txt" : ""}" title="${t.title}">${t.title.slice(0, 30)}${t.title.length > 30 ? "…" : ""}</div>
        ${isCrit ? `<div style="font-size:9px;color:#dc2626;font-weight:700;flex-shrink:0">⚠</div>` : ""}
      </div>`;
    }).join("") || `<div style="padding:16px;text-align:center;font-size:12px;color:var(--txt4)">Sin tareas</div>`;

    /* grid */
    const gridLines = MONTHS.map((_, i) =>
      `<div class="gantt-grid-line" style="left:${i * CELL_W}px"></div>`
    ).join("");
    const todayLine = `
      <div class="gantt-today-line" style="left:${TODAY_X}px"></div>
      <div class="gantt-today-lbl"  style="left:${TODAY_X}px">hoy</div>`;

    /* ── barra resumen del proyecto ── */
    const px1 = dateToX(proj.created);
    const px2 = dateToX(projEnd);
    const pbw = Math.max(px2 - px1, 16);
    const pfw = pbw * (proj.progress / 100);
    const projSummaryBar = `
      <div style="height:30px;width:${CHART_W}px;position:relative;border-bottom:2px solid var(--border);background:var(--surface2);">
        <div style="position:absolute;left:${px1}px;width:${pbw}px;height:18px;top:6px;
                    background:${projCfg.bg};border-left:3px solid ${projCfg.bd};border-radius:3px;overflow:hidden;">
          <div style="position:absolute;left:0;top:0;bottom:0;width:${pfw}px;background:${projCfg.prog}"></div>
          ${pbw > 60 ? `<div style="position:absolute;left:8px;top:0;bottom:0;display:flex;align-items:center;font-size:10px;font-weight:600;color:${projCfg.tx};">${proj.name.slice(0,20)} · ${proj.progress}%</div>` : ""}
        </div>
        ${gridLines}
        ${todayLine}
      </div>`;

    /* ── barras de tareas (② drag & drop) ── */
    const barRowsHtml = tasks.map(t => {
      const cfg     = TASK_STATUS_CFG[t.status] || TASK_STATUS_CFG.pending;
      const isCrit  = criticals.has(t.id);
      const startStr = t.ganttStart || t.created || "2026-01-01";
      const endStr   = t.due        || "2026-09-30";
      const x1  = dateToX(startStr);
      const x2  = dateToX(endStr);
      const bw  = Math.max(x2 - x1, 28);

      return `<div class="gantt-task-bar-row" data-tid="${t.id}" style="width:${CHART_W}px">
        <div class="gantt-task-bar ${isCrit ? "critical" : ""}"
          id="gtb-${t.id}"
          style="left:${x1}px;width:${bw}px;background:${isCrit ? "#fff5f5" : cfg.bg};border-left-color:${isCrit ? "#ef4444" : cfg.bd}"
          data-tid="${t.id}" data-x="${x1}" data-origstart="${startStr}"
          onmouseenter="ganttShowTaskTip(event,'${t.id}')"
          onmouseleave="ganttHideTip()">
          <div class="gantt-task-bar-fill" style="width:100%;background:${isCrit ? "#fca5a5" : cfg.prog};opacity:.5"></div>
          ${bw > 70 ? `<div class="gantt-task-bar-label" style="color:${isCrit ? "#991b1b" : cfg.tx}">${t.title.slice(0, 20)}${t.title.length > 20 ? "…" : ""}</div>` : ""}
          ${isCrit ? `<div class="gantt-critical-badge">CRÍTICA</div>` : ""}
        </div>
      </div>`;
    }).join("");

    /* estadísticas de tareas */
    const done     = tasks.filter(t => t.status === "done").length;
    const doing    = tasks.filter(t => t.status === "doing").length;
    const critCount = criticals.size;
    const daysLeft = Math.round((new Date(projEnd) - new Date(TODAY_STR)) / 86400000);

    /* leyenda */
    const legHtml = `
      <div class="gantt-leg-item"><div class="gantt-leg-sq" style="background:#f97316"></div>Pending</div>
      <div class="gantt-leg-item"><div class="gantt-leg-sq" style="background:#3b82f6"></div>Doing</div>
      <div class="gantt-leg-item"><div class="gantt-leg-sq" style="background:#22c55e"></div>Done</div>
      <div class="gantt-leg-item"><div class="gantt-leg-sq gantt-leg-critical"></div>Ruta crítica</div>
      <div class="gantt-leg-item" style="margin-left:auto;font-size:11px;color:var(--txt3)">
        ✦ Arrastra las barras para reprogramar tareas
      </div>`;

    view.innerHTML = `
      <div class="gantt-root" id="ganttRoot">
        <div class="gantt-toolbar">
          <div class="gantt-breadcrumb">
            <span class="gantt-breadcrumb-home" onclick="ganttGoHome()">Gantt de Proyectos</span>
            <span class="gantt-breadcrumb-sep">›</span>
            <span class="gantt-breadcrumb-cur">${proj.name}</span>
          </div>
          <button class="gantt-back-btn" onclick="ganttGoHome()">
            <svg viewBox="0 0 24 24"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
            Volver
          </button>
        </div>
        <div class="gantt-legend">${legHtml}</div>
        <div class="gantt-body">
          <div class="gantt-left">
            <div class="gantt-left-head">
              <span>Tarea</span>
              <span style="font-size:10px;color:var(--txt4)">${tasks.length} total</span>
            </div>
            <div class="gantt-left-list" id="ganttLeftList">${taskRowsHtml}</div>
          </div>
          <div class="gantt-right" id="ganttRight">
            <div class="gantt-months" style="width:${CHART_W}px">${monthsHtml}</div>
            <div class="gantt-chart" id="ganttChart" style="width:${CHART_W}px">
              ${projSummaryBar}
              ${barRowsHtml}
              <div class="gantt-drop-indicator" id="ganttDropIndicator"></div>
              <div class="gantt-tooltip" id="ganttTooltip"></div>
            </div>
          </div>
        </div>
        <div class="gantt-footer">
          <div class="gantt-stat"><div class="gantt-stat-n" style="color:#22c55e">${done}</div><div class="gantt-stat-l">Tareas listas</div></div>
          <div class="gantt-stat"><div class="gantt-stat-n" style="color:#3b82f6">${doing}</div><div class="gantt-stat-l">En curso</div></div>
          <div class="gantt-stat"><div class="gantt-stat-n" style="color:#dc2626">${critCount}</div><div class="gantt-stat-l">Ruta crítica</div></div>
          <div class="gantt-stat"><div class="gantt-stat-n" style="color:${daysLeft <= 30 ? "#dc2626" : "#6366f1"}">${daysLeft}</div><div class="gantt-stat-l">Días restantes</div></div>
        </div>
      </div>
      <div class="gantt-drag-date" id="ganttDragDate"></div>
    `;

    bindTaskViewEvents(projectId);
  }

  /* ════════════════════════════════════════
     EVENTOS — VISTA DE PROYECTOS
  ════════════════════════════════════════ */
  function bindProjectViewEvents() {
    const right = document.getElementById("ganttRight");
    const list  = document.getElementById("ganttLeftList");
    const chart = document.getElementById("ganttChart");

    /* scroll sync */
    if (right && list) {
      right.addEventListener("scroll", () => { list.scrollTop = right.scrollTop; });
    }
    /* tooltip mousemove */
    if (chart) {
      chart.addEventListener("mousemove", e => {
        const tip = document.getElementById("ganttTooltip");
        if (!tip?.classList.contains("gtt-show")) return;
        const rect = chart.getBoundingClientRect();
        tip.style.left = Math.min(e.clientX - rect.left + 14, CHART_W - 260) + "px";
        tip.style.top  = Math.max(0, e.clientY - rect.top - 80) + "px";
      });
    }
    /* clic en fila izquierda → drill-down */
    list?.querySelectorAll(".gantt-proj-row").forEach(row => {
      row.addEventListener("click", () => {
        const pid = row.dataset.pid;
        if (pid) ganttDrillDown(pid);
      });
    });
  }

  /* ════════════════════════════════════════
     EVENTOS — VISTA DE TAREAS
     Incluye ② Drag & Drop
  ════════════════════════════════════════ */
  function bindTaskViewEvents(projectId) {
    const right = document.getElementById("ganttRight");
    const list  = document.getElementById("ganttLeftList");
    const chart = document.getElementById("ganttChart");

    /* scroll sync */
    if (right && list) {
      right.addEventListener("scroll", () => { list.scrollTop = right.scrollTop; });
    }

    /* tooltip mousemove */
    if (chart) {
      chart.addEventListener("mousemove", e => {
        const tip = document.getElementById("ganttTooltip");
        if (!tip?.classList.contains("gtt-show")) return;
        const rect = chart.getBoundingClientRect();
        tip.style.left = Math.min(e.clientX - rect.left + 14, CHART_W - 260) + "px";
        tip.style.top  = Math.max(0, e.clientY - rect.top - 80) + "px";
      });
    }

    /* ── ② DRAG & DROP en barras de tareas ── */
    const dragLabel = document.getElementById("ganttDragDate");

    chart?.querySelectorAll(".gantt-task-bar").forEach(bar => {
      bar.addEventListener("mousedown", e => {
        // Ignorar si es clic simple (sin movimiento)
        const tid = bar.dataset.tid;
        if (!tid) return;
        e.preventDefault();

        const startX   = e.clientX;
        const origLeft = parseFloat(bar.style.left) || 0;
        const origDate = bar.dataset.origstart;
        let moved      = false;

        bar.classList.add("dragging");
        ganttHideTip();

        const indicator = document.getElementById("ganttDropIndicator");

        function onMove(ev) {
          moved = true;
          const dx      = ev.clientX - startX;
          const newLeft = Math.max(0, Math.min(origLeft + dx, CHART_W - 20));

          bar.style.left = newLeft + "px";
          if (indicator) {
            indicator.style.left    = newLeft + "px";
            indicator.style.display = "block";
          }

          /* fecha proyectada */
          const newDate = xToDate(newLeft);
          if (dragLabel) {
            dragLabel.style.display = "block";
            dragLabel.style.left    = (ev.clientX + 14) + "px";
            dragLabel.style.top     = (ev.clientY - 30) + "px";
            dragLabel.textContent   = fmtShort(newDate);
          }
        }

        function onUp(ev) {
          document.removeEventListener("mousemove", onMove);
          document.removeEventListener("mouseup",   onUp);
          bar.classList.remove("dragging");
          if (dragLabel) dragLabel.style.display = "none";
          if (indicator) indicator.style.display  = "none";

          if (!moved) return;

          const dx      = ev.clientX - startX;
          const newLeft = Math.max(0, Math.min(origLeft + dx, CHART_W - 20));
          const newDate = xToDate(newLeft);

          /* ── Calcular duración original ── */
          const task = DB.getTask(tid);
          if (!task) return;

          const oldStart = new Date((task.ganttStart || task.created || "2026-01-01") + "T00:00:00");
          const oldEnd   = new Date((task.due || "2026-09-30") + "T00:00:00");
          const duration = oldEnd - oldStart; // milisegundos

          /* ── Actualizar DB (④ sincronización) ── */
          task.ganttStart = newDate;
          const newEnd = new Date(new Date(newDate + "T00:00:00").getTime() + duration);
          task.due = newEnd.toISOString().slice(0, 10);
          bar.dataset.origstart = newDate;

          /* Actualizar atributo x */
          bar.dataset.x = newLeft;

          /* ── Reconstruir sólo la vista de tareas (sin parpadeo total) ── */
          buildTaskView(projectId);

          /* ── Notificar otros módulos ── */
          syncAllModules();
        }

        document.addEventListener("mousemove", onMove);
        document.addEventListener("mouseup",   onUp);
      });
    });

    /* clic en checkbox de tarea en el panel izquierdo */
    list?.querySelectorAll(".gantt-task-check").forEach(chk => {
      chk.addEventListener("click", e => {
        e.stopPropagation();
        const row = chk.closest(".gantt-task-row");
        const tid = row?.dataset.tid;
        if (!tid) return;
        const task = DB.getTask(tid);
        if (!task) return;
        task.status = task.status === "done" ? "pending" : "done";
        buildTaskView(projectId);
        syncAllModules();
      });
    });
  }

  /* ════════════════════════════════════════
     HELPERS GLOBALES
  ════════════════════════════════════════ */
  window.ganttToggleFilter = function(status) {
    if (ganttState.activeFilters.has(status)) ganttState.activeFilters.delete(status);
    else ganttState.activeFilters.add(status);
    build();
  };

  window.ganttResetFilter = function() {
    ganttState.activeFilters = new Set(Object.keys(STATUS_CFG));
    build();
  };

  window.ganttDrillDown = function(projectId) {
    ganttState.currentProject = projectId;
    build();
  };

  window.ganttGoHome = function() {
    ganttState.currentProject = null;
    build();
  };

  window.ganttToggleTask = function(tid) {
    const task = DB.getTask(tid);
    if (!task) return;
    task.status = task.status === "done" ? "pending" : "done";
    if (ganttState.currentProject) buildTaskView(ganttState.currentProject);
    syncAllModules();
  };

  /* ── Tooltips de proyectos ── */
  window.ganttShowProjTip = function(e, id) {
    const p = DB.projects.find(x => x.id === id);
    if (!p) return;
    const c     = STATUS_CFG[p.status];
    const tip   = document.getElementById("ganttTooltip");
    if (!tip) return;
    const done  = DB.tasks.filter(t => t.project === id && t.status === "done").length;
    const total = DB.tasks.filter(t => t.project === id).length;
    const team  = p.team.map(uid => DB.getUser(uid)?.name || uid).join(", ");
    tip.innerHTML = `
      <div class="gtt-name">${p.name}</div>
      <div class="gtt-row"><span class="gtt-key">Estado</span><span class="gtt-val" style="color:${c.dot}">${c.label}</span></div>
      <div class="gtt-row"><span class="gtt-key">Progreso</span><span class="gtt-val">${p.progress}%</span></div>
      <div class="gtt-row"><span class="gtt-key">Inicio</span><span class="gtt-val">${fmtShort(p.created)}</span></div>
      <div class="gtt-row"><span class="gtt-key">Fin est.</span><span class="gtt-val">${fmtShort(END_DATES[id])}</span></div>
      <div class="gtt-row"><span class="gtt-key">Tareas</span><span class="gtt-val">${done}/${total}</span></div>
      <div class="gtt-row"><span class="gtt-key">Equipo</span><span class="gtt-val">${team}</span></div>
      <div style="margin-top:8px;font-size:10.5px;color:var(--brand);font-weight:600">Clic para ver tareas →</div>
    `;
    tip.classList.add("gtt-show");
  };

  /* ── Tooltip de tareas ── */
  window.ganttShowTaskTip = function(e, tid) {
    const t = DB.getTask(tid);
    if (!t) return;
    const tip = document.getElementById("ganttTooltip");
    if (!tip) return;
    const cfg  = TASK_STATUS_CFG[t.status] || TASK_STATUS_CFG.pending;

    /* recalcular criticalidad en contexto actual */
    const crit = ganttState.currentProject
      ? computeCriticalTasks(ganttState.currentProject).has(tid)
      : false;

    const assignee = DB.getUser(t.assignee)?.name || t.assignee || "—";
    tip.innerHTML = `
      <div class="gtt-name">${t.title.slice(0, 50)}${t.title.length > 50 ? "…" : ""}</div>
      <div class="gtt-row"><span class="gtt-key">Estado</span><span class="gtt-val">${t.status}</span></div>
      <div class="gtt-row"><span class="gtt-key">Prioridad</span><span class="gtt-val">${t.priority}</span></div>
      <div class="gtt-row"><span class="gtt-key">Inicio</span><span class="gtt-val">${fmtShort(t.ganttStart || t.created)}</span></div>
      <div class="gtt-row"><span class="gtt-key">Entrega</span><span class="gtt-val">${fmtShort(t.due)}</span></div>
      <div class="gtt-row"><span class="gtt-key">Asignado</span><span class="gtt-val">${assignee}</span></div>
      ${crit ? `<div class="gtt-critical-tag">⚠ RUTA CRÍTICA</div>` : ""}
      <div style="margin-top:8px;font-size:10px;color:var(--txt4)">Arrastra para reprogramar</div>
    `;
    tip.classList.add("gtt-show");
  };

  window.ganttHideTip = function() {
    const tip = document.getElementById("ganttTooltip");
    if (tip) tip.classList.remove("gtt-show");
  };

  /* ── Entrada pública para recargar desde fuera ── */
  window.ganttRefresh = function() { build(); };

  /* ── Arranque ── */
  build();
}