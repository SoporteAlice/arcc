/* ============================================================
   APP.JS — FlowOS Main Logic
   ============================================================ */

const App = {
  section: "tareas",
  tab: "board",
  drag: null,
  calOffset: 0,
  modalAssignees: [],
  currentProject: null,
  projectTab: "planning",
  boardFilter: "mine",
  resizing: null,
  dragSource: null,
  dragFromDate: null,
};

// ──────────────────────────────────────────────
// BOOT
// ──────────────────────────────────────────────
document.addEventListener("DOMContentLoaded", () => {
  initDate();
  initIconSidebar();
  initModal();
  showSection("tareas");
  document.getElementById("icon-dot-tareas").classList.add("visible");
});

function initDate() {
  const d = new Date();
  document.getElementById("topbarDate").textContent =
    d.toLocaleDateString("es-PE", { weekday:"short", day:"numeric", month:"short", year:"numeric" });
}

// ──────────────────────────────────────────────
// ICON SIDEBAR
// ──────────────────────────────────────────────
function initIconSidebar() {
  document.querySelectorAll(".icon-btn[data-section]").forEach(btn => {
    btn.addEventListener("click", () => showSection(btn.dataset.section));
  });
  document.getElementById("btnTopAdd").addEventListener("click", () => {
    if (App.section === "proyectos") openProjectModal();
    else openTaskModal();
  });
}

function showSection(section) {
  App.section = section;
  App.currentProject = null;

  document.querySelectorAll(".icon-btn[data-section]").forEach(b => {
    b.classList.toggle("active", b.dataset.section === section);
  });

  const titles = {
    tareas:"TAREAS", proyectos:"PROYECTOS", dashboard:"DASHBOARD",
    reportes:"REPORTES", settings:"CONFIGURACIÓN", calendario:"CALENDARIO"
  };
  document.getElementById("topbarTitle").textContent = titles[section] || section.toUpperCase();

  // ── Proyectos: sin sub-tabs de estado, solo acciones globales ──
  const subnavConfigs = {
    tareas: [
      { key:"planning",   label:"Planificación de tareas" },
      { key:"board",      label:"Tablero de tareas" },
      { key:"created",    label:"Tareas Creadas" },
      { key:"realized",   label:"Tareas realizadas" },
      { key:"myprojects", label:"Mis Proyectos" },
      { key:"reportes-t", label:"Reportes" },
    ],
    // Proyectos: vista unificada, sin pestañas de estado
    proyectos: [
      { key:"proj-board",   label:"Tablero de Proyectos" },
      { key:"myprojects",   label:"Mis Proyectos" },
      { key:"reportes-t",   label:"Reportes" },
    ],
    dashboard: [],
    reportes:  [],
    settings:  [],
  };

  const tabs = subnavConfigs[section] || [];
  buildSubnav(tabs);

  const defaults = {
    tareas:"board", proyectos:"proj-board",
    dashboard:"dash", reportes:"rep", settings:"cfg"
  };
  const def = defaults[section] || (tabs.length ? tabs[0].key : section);
  showTab(def);
}

function buildSubnav(tabs) {
  const nav = document.getElementById("subnav");
  if (!tabs.length) { nav.innerHTML = ""; return; }
  nav.innerHTML = tabs.map(t => {
    const count = getTabCount(t.key);
    return `<button class="tab-btn" data-tab="${t.key}">
      ${t.label}
      ${count ? `<span class="tab-count">${count}</span>` : ""}
    </button>`;
  }).join("");
  nav.querySelectorAll(".tab-btn").forEach(b => {
    b.addEventListener("click", () => showTab(b.dataset.tab));
  });
}

function getTabCount(tab) {
  const m = {
    panel:      DB.myTasks().filter(t => t.status !== "done").length,
    board:      DB.myTasks().length,
    created:    DB.createdByMe().length,
    realized:   DB.doneTasks().length,
    myprojects: DB.projects.filter(p => p.team.includes(DB.meId)).length,
    "proj-board": DB.projects.length,
  };
  return m[tab] || 0;
}

function showTab(tab) {
  App.tab = tab;
  if (App.currentProject) App.projectTab = tab;

  document.querySelectorAll(".tab-btn").forEach(b =>
    b.classList.toggle("active", b.dataset.tab === tab)
  );

  const view = document.getElementById("viewArea");
  view.innerHTML = "";

  // Vista interna de proyecto
  if (App.currentProject) {
    renderProjectView(App.currentProject, tab);
    return;
  }

  const renderers = {
    panel:        renderPanel,
    planning:     renderPlanning,
    board:        () => { App.boardFilter = "mine";    renderBoard("mine"); },
    created:      () => { App.boardFilter = "created"; renderBoard("created"); },
    realized:     renderRealized,
    myprojects:   renderMyProjects,
    "reportes-t": renderReportes,
    "proj-board": renderProjects,         // ← vista unificada de proyectos
    dash:         renderDashboard,
    rep:          renderReportes,
    cfg:          renderSettings,
  };

  (renderers[tab] || renderDashboard)();
}

// ──────────────────────────────────────────────
// PANEL VIEW
// ──────────────────────────────────────────────
function renderPanel() {
  const view = document.getElementById("viewArea");
  view.innerHTML = `
    <div class="panel-view">
      <div class="panel-filters">
        <span class="panel-filter-label">Proyectos visualizados</span>
        <div style="flex:1"></div>
        <div style="display:flex;gap:6px">
          <button class="filter-chip active">Filtro</button>
          <button class="filter-chip">Limpiar filtro</button>
        </div>
      </div>
      <div id="panelGroups"></div>
    </div>
  `;
  const groups = [
    { key:"pending",  label:"pending",  cls:"badge-pending" },
    { key:"doing",    label:"doing",    cls:"badge-doing" },
    { key:"done",     label:"done",     cls:"badge-done" },
  ];
  const container = document.getElementById("panelGroups");
  groups.forEach(g => {
    const tasks = DB.myTasks().filter(t => t.status === g.key);
    container.innerHTML += buildTaskGroup(g.key, g.label, g.cls, tasks);
  });
  requestAnimationFrame(() => {
    const firstGroup = container.querySelector(".task-group");
    if (firstGroup) openGroup(firstGroup);
    container.querySelectorAll(".task-group").forEach(g => {
      g.querySelector(".group-header").addEventListener("click", () => openGroup(g));
    });
  });
}

function buildTaskGroup(key, label, badgeCls, tasks) {
  const rows = tasks.map(t => {
    const proj = DB.getProject(t.project);
    const isOverdue = t.due && new Date(t.due) < new Date() && t.status !== "done";
    return `<tr data-id="${t.id}">
      <td style="width:38px">
        <div class="task-check ${t.status==="done"?"checked":""}" onclick="toggleTask('${t.id}',event)">
          ${t.status==="done"?`<svg viewBox="0 0 24 24"><path d="M20 6L9 17l-5-5"/></svg>`:""}
        </div>
      </td>
      <td style="min-width:280px">
        <span class="task-text ${t.status==="done"?"striked":""}">${t.title}</span>
      </td>
      <td class="cell-date ${isOverdue?"overdue":""}">${fmtDate(t.due)}</td>
      <td style="width:70px">
        <svg style="width:16px;height:16px;stroke:var(--txt4);fill:none;stroke-width:1.8" viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><path d="M12 8v4l2 2"/></svg>
      </td>
      <td><span class="priority-pill priority-${t.priority}">${t.priority}</span></td>
      <td><span class="status-pill sp-${t.status === "done" ? "done" : "undefined"}">${t.status === "done" ? "done" : "undefined"}</span></td>
    </tr>`;
  }).join("");

  const thead = `<tr>
    <th></th><th>Tarea</th><th>Fecha</th><th></th><th>Prioridad</th><th>Estado</th>
  </tr>`;

  return `
    <div class="task-group" data-key="${key}">
      <div class="group-header">
        <span class="group-toggle"><svg viewBox="0 0 24 24"><path d="M9 18l6-6-6-6"/></svg></span>
        <span class="group-label">${label}</span>
        <span class="group-badge ${badgeCls}">${tasks.length}</span>
        <button class="group-add-btn" onclick="openTaskModal('${key}');event.stopPropagation()">+ New Task</button>
      </div>
      <div class="group-body">
        <table class="task-table">
          <thead>${thead}</thead>
          <tbody>${rows || `<tr><td colspan="6"><div class="empty"><div class="empty-t">Sin tareas</div></div></td></tr>`}</tbody>
        </table>
      </div>
    </div>
  `;
}

function openGroup(el) { el.classList.toggle("open"); }

function toggleTask(id, e) {
  e.stopPropagation();
  const t = DB.getTask(id);
  if (!t) return;
  t.status = t.status === "done" ? "pending" : "done";
  renderPanel();
}

// ──────────────────────────────────────────────
// PLANNING VIEW
// ──────────────────────────────────────────────
function renderPlanning() {
  document.getElementById("viewArea").innerHTML = `
    <div class="planning-layout">
      <div class="planning-panel" id="planningPanel"></div>
      <div class="cal-wrap" id="calWrap"></div>
    </div>
  `;
  buildPlanningPanel();
  buildWeekCalendar();
}

function buildPlanningPanel() {
  const panel = document.getElementById("planningPanel");
  const statColors = { pending:"#f59e0b", doing:"#3b82f6", done:"#22c55e", wishlist:"#8b5cf6" };
  let filterQuery = "";

  function renderList() {
    const tasks = DB.tasks.filter(t =>
      t.status !== "done" &&
      (filterQuery === "" || t.title.toLowerCase().includes(filterQuery))
    );
    const list = document.getElementById("panelTasksList");
    if (!list) return;
    list.innerHTML = tasks.length ? tasks.map(t => {
      const proj = DB.getProject(t.project);
      const isScheduled = Object.values(DB.calendarEvents).flat().includes(t.id);
      return `<div class="panel-task-chip ${isScheduled ? "chip-scheduled" : ""}"
                   draggable="true" data-id="${t.id}"
                   ondragstart="planDragStart(event,'${t.id}')">
        <div class="chip-left">
          <span class="chip-status-dot" style="background:${statColors[t.status] || "#ccc"}"></span>
        </div>
        <div class="chip-body">
          <div class="chip-name">${t.title.slice(0,55)}${t.title.length>55?"…":""}</div>
          <div class="chip-meta">
            <span class="chip-project">${proj ? proj.name.split(" ").slice(0,2).join(" ") : "—"}</span>
            <span class="chip-assignee">${formatTaskAssignees(t)}</span>
            ${isScheduled ? `<span class="chip-cal-icon" title="Ya agendado">📅</span>` : ""}
          </div>
        </div>
      </div>`;
    }).join("") : `<div style="padding:20px;text-align:center;color:var(--txt4);font-size:12px">Sin tareas disponibles</div>`;
  }

  panel.innerHTML = `
    <div class="planning-panel-header">
      <span class="planning-panel-title">Panel de Tareas</span>
      <span style="font-size:11px;color:var(--txt4)">${DB.tasks.filter(t=>t.status!=="done").length} disponibles</span>
    </div>
    <div class="panel-filter-row">
      <div class="search-input-wrap" style="max-width:100%">
        <svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="7"/><path d="M21 21l-4.35-4.35"/></svg>
        <input class="search-input" placeholder="Buscar tarea…" id="panelFilterInput"
               oninput="planFilterTasks(this.value)"/>
      </div>
    </div>
    <div class="panel-legend">
      <span class="legend-item"><span style="background:#ef4444" class="legend-dot"></span>Alta</span>
      <span class="legend-item"><span style="background:#f59e0b" class="legend-dot"></span>Media</span>
      <span class="legend-item"><span style="background:#16a34a" class="legend-dot"></span>Baja</span>
    </div>
    <div class="panel-note" style="font-size:11px;color:var(--txt4);margin-bottom:10px">
      Arrastra tareas al calendario para planificarlas. Arrastra el borde inferior para ajustar duración.
    </div>
    <div class="panel-tasks-list" id="panelTasksList"></div>
  `;
  renderList();
  window.planFilterTasks = (q) => { filterQuery = q.toLowerCase(); renderList(); };
}

// ── Anti-overlap calendar algorithm ──
function resolveOverlaps(evIds) {
  const events = evIds
    .filter(id => DB.calEventTimes[id] !== undefined)
    .map(id => {
      const start = DB.calEventTimes[id];
      const duration = DB.calEventDurations?.[id] || 1;
      return { id, start, end: start + duration };
    })
    .sort((a,b) => a.start - b.start);

  if (!events.length) return {};

  const groups = [];
  let currentGroup = [];
  let maxEnd = -Infinity;

  for (const ev of events) {
    if (currentGroup.length === 0 || ev.start < maxEnd) {
      currentGroup.push(ev);
      maxEnd = Math.max(maxEnd, ev.end);
    } else {
      groups.push([...currentGroup]);
      currentGroup = [ev];
      maxEnd = ev.end;
    }
  }
  if (currentGroup.length) groups.push(currentGroup);

  const result = {};
  for (const group of groups) {
    const cols = [];
    for (const ev of group) {
      let placed = false;
      for (let c = 0; c < cols.length; c++) {
        if (ev.start >= cols[c]) {
          cols[c] = ev.end;
          result[ev.id] = { colIdx: c, colCount: group.length };
          placed = true;
          break;
        }
      }
      if (!placed) {
        cols.push(ev.end);
        result[ev.id] = { colIdx: cols.length - 1, colCount: group.length };
      }
    }
    const totalCols = cols.length;
    for (const ev of group) result[ev.id].colCount = totalCols;
  }
  return result;
}

function buildWeekCalendar(projectId = null) {
  const calWrap = document.getElementById("calWrap");
  if (!calWrap) return;

  const today = new Date();
  const weekStart = new Date(today);
  weekStart.setDate(today.getDate() - today.getDay() + 1 + App.calOffset * 7);

  const days = Array.from({length:7}, (_,i) => {
    const d = new Date(weekStart);
    d.setDate(weekStart.getDate() + i);
    return d;
  });

  const dayNames = ["LUN","MAR","MIÉ","JUE","VIE","SÁB","DOM"];
  const months   = ["ene","feb","mar","abr","may","jun","jul","ago","sep","oct","nov","dic"];
  const d0 = days[0], d6 = days[6];
  const rangeFmt = `${d0.getDate()} – ${d6.getDate()} ${months[d6.getMonth()]} ${d6.getFullYear()}`;

  const HOUR_H  = 64;
  const START_H = 8;
  const END_H   = 20;
  const hours   = Array.from({length: END_H - START_H}, (_,i) => i + START_H);
  const totalH  = hours.length * HOUR_H;

  const evColors = {
    pending:  { bg:"#fff7ed", bd:"#fb923c", tx:"#9a3412" },
    doing:    { bg:"#eff6ff", bd:"#3b82f6", tx:"#1e40af" },
    done:     { bg:"#f0fdf4", bd:"#22c55e", tx:"#166534" },
    wishlist: { bg:"#faf5ff", bd:"#a855f7", tx:"#6b21a8" },
  };

  const daysHeader = days.map((d,i) => {
    const isToday = d.toDateString() === today.toDateString();
    return `<div class="cal-day-head ${isToday?"today":""}">
      <span class="cal-day-name">${dayNames[i]}</span>
      <span class="cal-day-num">${d.getDate()}</span>
    </div>`;
  }).join("");

  const timesHtml = hours.map(h => `
    <div class="cal-time-slot" style="height:${HOUR_H}px">
      <span class="cal-time-label">${String(h).padStart(2,"0")}:00</span>
    </div>
  `).join("");

  const colsHtml = days.map(d => {
    const dateKey = d.toISOString().slice(0,10);
    let evIds = DB.calendarEvents[dateKey] || [];
    if (projectId) evIds = evIds.filter(id => DB.getTask(id)?.project === projectId);
    const layout = resolveOverlaps(evIds);

    const bgCells = hours.map(h =>
      `<div class="cal-bg-cell" style="height:${HOUR_H}px;top:${(h-START_H)*HOUR_H}px"
            data-date="${dateKey}" data-hour="${h}"
            ondragover="calDragOver(event)" ondrop="calDrop(event,'${dateKey}',${h})"></div>`
    ).join("");

    const eventsHtml = evIds.map(id => {
      const task = DB.getTask(id);
      if (!task) return "";
      const timeVal = DB.calEventTimes[id];
      if (timeVal === undefined) return "";
      const duration = DB.calEventDurations?.[id] || 1;

      const top    = (timeVal - START_H) * HOUR_H;
      const height = Math.max(duration * HOUR_H - 6, 38);
      const info   = layout[id] || { colIdx:0, colCount:1 };
      const gap    = 3;
      const colW   = (100 / info.colCount);
      const left   = info.colIdx * colW;
      const width  = colW;
      const c      = evColors[task.status] || evColors.doing;
      const proj   = DB.getProject(task.project);
      const hh     = String(Math.floor(timeVal)).padStart(2,"0");
      const mm     = String(Math.round((timeVal % 1)*60)).padStart(2,"0");

      return `<div class="cal-event-abs"
                   style="top:${top+3}px;height:${height}px;
                          left:calc(${left}% + ${gap}px);
                          width:calc(${width}% - ${gap*2}px);
                          background:${c.bg};border-left:3px solid ${c.bd};color:${c.tx}"
                   draggable="true"
                   onclick="openCalendarTaskPreview('${id}', event)"
                   ondragstart="calEventDragStart(event,'${id}','${dateKey}')"
                   title="${task.title}">
        <div class="cal-ev-time">${hh}:${mm}</div>
        <div class="cal-ev-title">${task.title.slice(0,36)}${task.title.length>36?"…":""}</div>
        ${proj ? `<div class="cal-ev-proj">${proj.name.split(" ").slice(0,2).join(" ")}</div>` : ""}
        <div class="cal-event-resize" onpointerdown="event.stopPropagation(); calEventResizeStart(event,'${id}','${dateKey}')" title="Arrastra para extender/reducir duración"></div>
      </div>`;
    }).join("");

    return `<div class="cal-col" style="height:${totalH}px">${bgCells}${eventsHtml}</div>`;
  }).join("");

  calWrap.innerHTML = `
    <div class="cal-header">
      <button class="cal-nav-btn" onclick="calNav(-1)">‹</button>
      <button class="cal-today-btn" onclick="calNavToday()">Hoy</button>
      <button class="cal-nav-btn" onclick="calNav(1)">›</button>
      <span class="cal-range-label">${rangeFmt}</span>
      <div class="cal-view-btns">
        <button class="cal-view-btn">month</button>
        <button class="cal-view-btn active">week</button>
        <button class="cal-view-btn">day</button>
      </div>
    </div>
    <div class="cal-body">
      <div class="cal-times" style="padding-top:48px">${timesHtml}</div>
      <div class="cal-days-wrap">
        <div class="cal-days-header">${daysHeader}</div>
        <div class="cal-grid-scroll">
          <div class="cal-grid" style="height:${totalH}px">${colsHtml}</div>
        </div>
      </div>
    </div>
  `;
}

function calNav(dir)   { App.calOffset += dir; buildWeekCalendar(); }
function calNavToday() { App.calOffset = 0;    buildWeekCalendar(); }

function planDragStart(e, id) {
  App.drag = id;
  App.dragSource = "panel";
  e.dataTransfer.effectAllowed = "copy";
}
function calEventDragStart(e, id, fromDate) {
  App.drag = id;
  App.dragSource = "calendar";
  App.dragFromDate = fromDate;
  e.dataTransfer.effectAllowed = "move";
  e.stopPropagation();
}
function calDragOver(e) {
  e.preventDefault();
  e.currentTarget.classList.add("drag-over");
}
function calDrop(e, date, hour) {
  e.preventDefault();
  e.currentTarget.classList.remove("drag-over");
  if (!App.drag) return;
  if (App.dragSource === "calendar" && App.dragFromDate && App.dragFromDate !== date) {
    const prev = DB.calendarEvents[App.dragFromDate];
    if (prev) DB.calendarEvents[App.dragFromDate] = prev.filter(x => x !== App.drag);
  }
  if (!DB.calendarEvents[date]) DB.calendarEvents[date] = [];
  if (!DB.calendarEvents[date].includes(App.drag)) DB.calendarEvents[date].push(App.drag);
  DB.calEventTimes[App.drag] = hour;
  App.drag = null;
  App.dragSource = null;
  App.dragFromDate = null;
  buildWeekCalendar();
  buildPlanningPanel();
}
document.addEventListener("dragleave", e => {
  if (e.target.classList) e.target.classList.remove("drag-over");
});

function openCalendarTaskPreview(taskId, event) {
  const task = DB.getTask(taskId);
  if (!task) return;
  closeCalendarTaskPreview();
  const project  = DB.getProject(task.project);
  const assignees = getTaskAssignees(task).map(id => DB.getUser(id)?.name || id).join(", ");
  const preview  = document.createElement("div");
  preview.id = "calendarTaskPreview";
  preview.className = "calendar-task-preview";
  const x = Math.min(event.clientX + 12, window.innerWidth  - 360);
  const y = Math.min(event.clientY + 12, window.innerHeight - 260);
  preview.style.left = `${x}px`;
  preview.style.top  = `${y}px`;
  preview.innerHTML = `
    <div class="preview-header">
      <div>
        <div class="preview-title">${task.title}</div>
        <div class="preview-subtitle">${project ? project.name : "Sin proyecto"}</div>
      </div>
      <button class="preview-close" onclick="closeCalendarTaskPreview()">×</button>
    </div>
    <div class="preview-body">
      <div><strong>Estado:</strong> ${task.status}</div>
      <div><strong>Prioridad:</strong> ${task.priority}</div>
      <div><strong>Entrega:</strong> ${fmtDateShort(task.due)}</div>
      <div><strong>Duración:</strong> ${DB.calEventDurations?.[taskId] || 1}h</div>
      <div><strong>Miembros:</strong> ${assignees || "—"}</div>
      <div class="preview-desc">${task.description || "Sin descripción."}</div>
      <div style="margin-top:12px;text-align:right;">
        <button class="btn btn-primary btn-sm" onclick="openTaskModal(null, '${task.project}', '${task.id}')">Editar Tarea</button>
      </div>
    </div>
  `;
  document.body.appendChild(preview);
  setTimeout(() => preview.classList.add("visible"), 10);
}

function closeCalendarTaskPreview() {
  const existing = document.getElementById("calendarTaskPreview");
  if (existing) existing.remove();
}

function calEventResizeStart(e, id, fromDate) {
  e.preventDefault();
  e.stopPropagation();
  const el = e.currentTarget.closest(".cal-event-abs");
  if (!el) return;
  App.resizing = {
    id, date: fromDate,
    startY: e.clientY,
    origDuration: DB.calEventDurations?.[id] || 1,
    element: el,
  };
  document.body.style.cursor = "ns-resize";
}

document.addEventListener("pointermove", e => {
  if (!App.resizing) return;
  const HOUR_H = 64;
  const deltaHours  = Math.round((e.clientY - App.resizing.startY) / HOUR_H * 2) / 2;
  const newDuration = Math.max(0.5, App.resizing.origDuration + deltaHours);
  App.resizing.element.style.height = `${Math.max(newDuration * HOUR_H - 6, 38)}px`;
});

document.addEventListener("pointerup", e => {
  if (!App.resizing) return;
  const HOUR_H = 64;
  const deltaHours  = Math.round((e.clientY - App.resizing.startY) / HOUR_H * 2) / 2;
  const newDuration = Math.max(0.5, App.resizing.origDuration + deltaHours);
  DB.calEventDurations = DB.calEventDurations || {};
  DB.calEventDurations[App.resizing.id] = newDuration;
  App.resizing = null;
  document.body.style.cursor = "";
  buildWeekCalendar();
});

// ──────────────────────────────────────────────
// BOARD VIEW (Tareas)
// ──────────────────────────────────────────────
function renderBoard(filter) {
  const allTasks = filter === "created" ? DB.createdByMe() : DB.myTasks();

  const cols = [
    { key:"pending",  label:"PENDING",  color:"#f59e0b", bg:"#fff7ed" },
    { key:"doing",    label:"DOING",    color:"#3b82f6", bg:"#eff6ff" },
    { key:"done",     label:"DONE",     color:"#22c55e", bg:"#f0fdf4" },
    { key:"wishlist", label:"WISHLIST", color:"#8b5cf6", bg:"#faf5ff" },
  ];

  const colsHtml = cols.map(col => {
    const tasks = allTasks.filter(t => t.status === col.key);
    return `
      <div class="blist-col">
        <div class="blist-col-head" style="border-top:3px solid ${col.color}">
          <div class="blist-col-title-row">
            <span class="blist-col-title" style="color:${col.color}">${col.label}</span>
            <span class="blist-col-count" style="background:${col.bg};color:${col.color}">${tasks.length}</span>
          </div>
        </div>
        <div class="blist-col-body" data-col="${col.key}"
             ondragover="boardDragOver(event)" ondrop="boardDrop(event,'${col.key}','${filter}')">
          ${tasks.length
            ? tasks.map(t => buildBlistRow(t, col.color)).join("")
            : `<div class="blist-empty">Sin tareas — suelta aquí</div>`
          }
        </div>
        <div class="blist-col-foot">
          <button class="blist-add-btn" onclick="openTaskModal('${col.key}')">
            <svg viewBox="0 0 24 24"><path d="M12 5v14M5 12h14"/></svg>
            New Task
          </button>
        </div>
      </div>
    `;
  }).join("");

  document.getElementById("viewArea").innerHTML = `
    <div class="blist-toolbar">
      <div class="search-input-wrap">
        <svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="7"/><path d="M21 21l-4.35-4.35"/></svg>
        <input class="search-input" placeholder="Buscar tarea…" oninput="boardFilter(event,'${filter}')"/>
      </div>
      <button class="btn btn-primary btn-sm" onclick="openTaskModal()">
        <svg viewBox="0 0 24 24"><path d="M12 5v14M5 12h14"/></svg>
        Nueva Tarea
      </button>
    </div>
    <div class="blist-board">${colsHtml}</div>
  `;
}

function buildBlistRow(t, accentColor) {
  const proj   = DB.getProject(t.project);
  const isOver = t.due && new Date(t.due) < new Date() && t.status !== "done";
  const priCfg = { high:["#fef2f2","#b91c1c"], medium:["#fefce8","#854d0e"], low:["#f0fdf4","#15803d"] };
  const [priBg, priC] = priCfg[t.priority] || priCfg.medium;
  return `
    <div class="blist-row" draggable="true" data-id="${t.id}"
         ondragstart="boardDragStart(event,'${t.id}')">
      <div class="brow-drag-handle">
        <svg viewBox="0 0 24 24"><circle cx="9" cy="7" r="1.2" fill="currentColor"/><circle cx="15" cy="7" r="1.2" fill="currentColor"/><circle cx="9" cy="12" r="1.2" fill="currentColor"/><circle cx="15" cy="12" r="1.2" fill="currentColor"/><circle cx="9" cy="17" r="1.2" fill="currentColor"/><circle cx="15" cy="17" r="1.2" fill="currentColor"/></svg>
      </div>
      <div class="brow-check ${t.status==="done"?"checked":""}"
           onclick="boardToggleTask('${t.id}',event)"
           style="${t.status==="done"?`background:${accentColor};border-color:${accentColor}`:""}">
        ${t.status==="done"?`<svg viewBox="0 0 24 24"><path d="M20 6L9 17l-5-5"/></svg>`:""}
      </div>
      <div class="brow-body">
        <div class="brow-title ${t.status==="done"?"striked":""}">${t.title.slice(0,70)}${t.title.length>70?"…":""}</div>
        <div class="brow-meta">
          ${proj ? `<span class="brow-proj">${proj.name.split(" ").slice(0,2).join(" ")}</span>` : ""}
          <span class="brow-assign">${formatTaskAssignees(t)}</span>
        </div>
      </div>
      <div class="brow-right">
        <span class="brow-pri" style="background:${priBg};color:${priC}">${t.priority}</span>
        <span class="brow-date ${isOver?"overdue":""}">${fmtDateShort(t.due)}</span>
      </div>
    </div>
  `;
}

function boardToggleTask(id, e) {
  e.stopPropagation();
  const t = DB.getTask(id);
  if (!t) return;
  t.status = t.status === "done" ? "pending" : "done";
  renderBoard(App.boardFilter || "mine");
}

function boardDragStart(e, id) {
  App.drag = id;
  e.dataTransfer.effectAllowed = "move";
  setTimeout(() => {
    const el = document.querySelector(`.blist-row[data-id="${id}"]`);
    if (el) el.classList.add("dragging");
  }, 0);
}
function boardDragOver(e) {
  e.preventDefault();
  e.currentTarget.classList.add("drag-over");
}
function boardDrop(e, status, filter) {
  e.preventDefault();
  e.currentTarget.classList.remove("drag-over");
  document.querySelectorAll(".blist-row.dragging").forEach(el => el.classList.remove("dragging"));
  const t = DB.getTask(App.drag);
  if (t) {
    t.status = status;
    if (filter.startsWith("project-")) {
      renderProjectBoard(filter.split("-")[1]);
    } else {
      renderBoard(filter);
    }
  }
  App.drag = null;
}
function boardFilter(e, filter) {
  const q = e.target.value.toLowerCase();
  document.querySelectorAll(".blist-row").forEach(row => {
    const text = row.querySelector(".brow-title").textContent.toLowerCase();
    row.style.display = text.includes(q) ? "" : "none";
  });
}

// ──────────────────────────────────────────────
// TAREAS REALIZADAS
// ──────────────────────────────────────────────
function renderRealized() {
  const done = DB.doneTasks();
  const perPage = 10;
  let page = 1;

  function render() {
    const total = done.length;
    const start = (page - 1) * perPage;
    const slice = done.slice(start, start + perPage);

    const rows = slice.map(t => {
      const proj = DB.getProject(t.project);
      return `<tr>
        <td>
          <button class="td-edit-btn"><svg viewBox="0 0 24 24"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4z"/></svg></button>
        </td>
        <td>
          <div class="td-task-cell">
            <div class="td-check-icon"><svg viewBox="0 0 24 24"><path d="M20 6L9 17l-5-5"/></svg></div>
            <span class="td-task-name">${t.title.slice(0,70)}${t.title.length>70?"…":""}</span>
          </div>
        </td>
        <td>${proj ? proj.name : "—"}</td>
        <td style="font-size:12px;color:var(--txt3);max-width:220px">${proj ? proj.desc.slice(0,60)+"…" : "—"}</td>
      </tr>`;
    }).join("");

    const totalPages = Math.ceil(total / perPage);
    const pageNums = Array.from({length:totalPages}, (_,i) => i + 1).map(p =>
      `<button class="page-btn ${p===page?"active":""}" onclick="realPage(${p})">${p}</button>`
    ).join("");

    document.getElementById("viewArea").innerHTML = `
      <div class="realized-view">
        <div class="realized-toolbar">
          <div style="font-size:12px;color:var(--txt3)">${perPage} items por página</div>
          <div class="search-input-wrap" style="max-width:240px">
            <svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="7"/><path d="M21 21l-4.35-4.35"/></svg>
            <input class="search-input" placeholder="Search" />
          </div>
        </div>
        <div class="data-table-wrap">
          <table class="data-table">
            <thead><tr>
              <th style="width:40px"></th>
              <th>TAREA</th>
              <th>PROYECTO</th>
              <th>DESCRIPCIÓN</th>
            </tr></thead>
            <tbody>${rows}</tbody>
          </table>
          <div class="pagination">
            <div class="page-info">Mostrando ${start+1} al ${Math.min(start+perPage,total)} de ${total} tareas</div>
            <div class="page-btns">${pageNums}</div>
          </div>
        </div>
      </div>
    `;
  }

  window.realPage = (p) => { page = p; render(); };
  render();
}

// ══════════════════════════════════════════════
// PROYECTOS — VISTA UNIFICADA (Kanban por estado)
// ══════════════════════════════════════════════

/*
 * Configuración centralizada de estados de proyecto.
 * Un único punto de verdad: colores, etiquetas, orden de columnas.
 */
const PROJ_COLS = [
  { key:"pendiente",  label:"PENDIENTE",     color:"#f59e0b", bg:"#fff7ed", badgeCls:"psb-pendiente" },
  { key:"desarrollo", label:"EN DESARROLLO",  color:"#3b82f6", bg:"#eff6ff", badgeCls:"psb-desarrollo" },
  { key:"qa",         label:"QA / REVISIÓN",  color:"#b45309", bg:"#fff7ed", badgeCls:"psb-qa" },
  { key:"publicado",  label:"PUBLICADO",      color:"#6366f1", bg:"#eef2ff", badgeCls:"psb-publicado" },
  { key:"finalizado", label:"FINALIZADO",     color:"#22c55e", bg:"#f0fdf4", badgeCls:"psb-finalizado" },
  { key:"descartado", label:"DESCARTADO",     color:"#9ca3af", bg:"#f9fafb", badgeCls:"psb-descartado" },
];

/**
 * renderProjects()
 * Vista principal de proyectos: tablero Kanban unificado.
 * Todos los estados visibles al mismo tiempo, sin pestañas de filtro.
 */
function renderProjects() {
  // Estadísticas globales para el encabezado de la vista
  const total      = DB.projects.length;
  const activos    = DB.projects.filter(p => p.status === "desarrollo" || p.status === "qa").length;
  const finalizados = DB.projects.filter(p => p.status === "finalizado").length;

  // Construir columnas
  const colsHtml = PROJ_COLS.map(col => {
    const projects = DB.projectsByStatus(col.key);
    return buildProjColumn(col, projects);
  }).join("");

  document.getElementById("viewArea").innerHTML = `
    <div class="proj-board-view">

      <!-- ── Barra superior ── -->
      <div class="proj-board-toolbar">
        <div class="proj-board-stats">
          <span class="pbs-chip"><strong>${total}</strong> proyectos</span>
          <span class="pbs-sep">·</span>
          <span class="pbs-chip pbs-activo"><strong>${activos}</strong> activos</span>
          <span class="pbs-sep">·</span>
          <span class="pbs-chip pbs-done"><strong>${finalizados}</strong> finalizados</span>
        </div>
        <div class="search-input-wrap" style="max-width:240px">
          <svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="7"/><path d="M21 21l-4.35-4.35"/></svg>
          <input class="search-input" placeholder="Buscar proyecto…" id="projSearchInput"
                 oninput="projBoardFilter(this.value)"/>
        </div>
        <button class="btn btn-primary btn-sm" onclick="openProjectModal()">
          <svg viewBox="0 0 24 24"><path d="M12 5v14M5 12h14"/></svg>
          Nuevo Proyecto
        </button>
      </div>

      <!-- ── Kanban ── -->
      <div class="proj-kanban" id="projKanban">
        ${colsHtml}
      </div>

    </div>
  `;
}

/**
 * Construye una columna del Kanban de proyectos.
 */
function buildProjColumn(col, projects) {
  const cardsHtml = projects.length
    ? projects.map(p => buildProjCard(p, col)).join("")
    : `<div class="proj-col-empty">
        <svg viewBox="0 0 24 24" style="width:24px;height:24px;stroke:var(--border2);fill:none;stroke-width:1.5;margin-bottom:6px"><path d="M2 7a2 2 0 012-2h4.586a1 1 0 01.707.293L11 7h9a2 2 0 012 2v9a2 2 0 01-2 2H4a2 2 0 01-2-2V7z"/></svg>
        Sin proyectos
       </div>`;

  return `
    <div class="proj-col" data-status="${col.key}">
      <!-- Encabezado de columna -->
      <div class="proj-col-head" style="border-top:3px solid ${col.color}">
        <div class="proj-col-title-row">
          <span class="proj-col-title" style="color:${col.color}">${col.label}</span>
          <span class="proj-col-badge" style="background:${col.bg};color:${col.color}">${projects.length}</span>
        </div>
      </div>

      <!-- Lista de tarjetas -->
      <div class="proj-col-body" id="projCol-${col.key}">
        ${cardsHtml}
      </div>

      <!-- Footer: agregar proyecto -->
      <div class="proj-col-foot">
        <button class="blist-add-btn" onclick="openProjectModal()">
          <svg viewBox="0 0 24 24"><path d="M12 5v14M5 12h14"/></svg>
          Nuevo Proyecto
        </button>
      </div>
    </div>
  `;
}

/**
 * Construye la tarjeta de un proyecto dentro de la columna.
 */
function buildProjCard(p, col) {
  const tasksCount = DB.tasks.filter(t => t.project === p.id).length;
  const done       = DB.tasks.filter(t => t.project === p.id && t.status === "done").length;
  const teamHtml   = p.team.slice(0, 4).map(m => {
    const user = DB.getUser(m);
    return `<div class="proj-avatar proj-avatar-sm" title="${user?.name || m}">${m}</div>`;
  }).join("");

  // Mini barra de progreso con color de la columna
  return `
    <div class="proj-card-k" data-proj-id="${p.id}" onclick="renderProjectView('${p.id}')">
      <!-- Nombre -->
      <div class="pck-name">${p.name}</div>

      <!-- Descripción truncada -->
      <div class="pck-desc">${p.desc.slice(0, 72)}${p.desc.length > 72 ? "…" : ""}</div>

      <!-- Progreso -->
      <div class="pck-progress">
        <div class="pck-prog-meta">
          <span>Progreso</span>
          <span>${p.progress}%</span>
        </div>
        <div class="pck-prog-bar">
          <div class="pck-prog-fill" style="width:${p.progress}%;background:${col.color}"></div>
        </div>
      </div>

      <!-- Footer: equipo + contador de tareas -->
      <div class="pck-footer">
        <div class="pck-team">${teamHtml}</div>
        <div class="pck-meta-right">
          <svg viewBox="0 0 24 24" style="width:11px;height:11px;stroke:var(--txt4);fill:none;stroke-width:2"><path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2"/><rect x="9" y="3" width="6" height="4" rx="1"/></svg>
          <span>${done}/${tasksCount}</span>
        </div>
      </div>
    </div>
  `;
}

/**
 * Filtro de búsqueda en tiempo real para el tablero de proyectos.
 * Oculta tarjetas cuyo nombre no coincida; muestra/oculta el estado vacío de cada columna.
 */
function projBoardFilter(query) {
  const q = query.toLowerCase().trim();
  document.querySelectorAll(".proj-card-k").forEach(card => {
    const name = card.querySelector(".pck-name").textContent.toLowerCase();
    card.style.display = (!q || name.includes(q)) ? "" : "none";
  });

  // Mostrar/ocultar placeholder de columna vacía según resultado de búsqueda
  document.querySelectorAll(".proj-col-body").forEach(col => {
    const visible = [...col.querySelectorAll(".proj-card-k")].some(c => c.style.display !== "none");
    let empty = col.querySelector(".proj-col-empty-search");
    if (!visible && q) {
      if (!empty) {
        empty = document.createElement("div");
        empty.className = "proj-col-empty proj-col-empty-search";
        empty.textContent = "Sin resultados";
        col.appendChild(empty);
      }
    } else if (empty) {
      empty.remove();
    }
  });
}

// Exponer globalmente para el input inline
window.projBoardFilter = projBoardFilter;

// ──────────────────────────────────────────────
// MIS PROYECTOS
// ──────────────────────────────────────────────
function renderMyProjects() {
  const projects = DB.projects.filter(p => p.team.includes(DB.meId));

  // Reutilizamos el mismo Kanban pero solo con los proyectos del usuario
  const colsHtml = PROJ_COLS.map(col => {
    const colProjects = projects.filter(p => p.status === col.key);
    return buildProjColumn(col, colProjects);
  }).join("");

  document.getElementById("viewArea").innerHTML = `
    <div class="proj-board-view">
      <div class="proj-board-toolbar">
        <div class="proj-board-stats">
          <span class="pbs-chip"><strong>${projects.length}</strong> proyectos asignados a mí</span>
        </div>
        <div class="search-input-wrap" style="max-width:240px">
          <svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="7"/><path d="M21 21l-4.35-4.35"/></svg>
          <input class="search-input" placeholder="Buscar proyecto…"
                 oninput="projBoardFilter(this.value)"/>
        </div>
        <button class="btn btn-primary btn-sm" onclick="openProjectModal()">
          <svg viewBox="0 0 24 24"><path d="M12 5v14M5 12h14"/></svg>
          Nuevo Proyecto
        </button>
      </div>
      <div class="proj-kanban">${colsHtml}</div>
    </div>
  `;
}

// ──────────────────────────────────────────────
// VISTA INTERNA DE PROYECTO
// ──────────────────────────────────────────────
function renderProjectView(projectId, tab = "planning") {
  const project = DB.getProject(projectId);
  if (!project) {
    document.getElementById("viewArea").innerHTML =
      `<div style="padding:20px;color:var(--txt3)">Proyecto no encontrado.</div>`;
    return;
  }
  App.currentProject = projectId;
  App.projectTab = tab;
  document.getElementById("topbarTitle").textContent = project.name.toUpperCase();

  const projectTabs = [
    { key:"planning",       label:"Planificación" },
    { key:"board",          label:"Tablero" },
    { key:"docs",           label:"Documentación" },
    { key:"user-report",    label:"Reporte Usuario" },
    { key:"project-report", label:"Reporte Proyecto" },
  ];
  buildSubnav(projectTabs);

  const renderers = {
    planning:         () => renderProjectPlanning(projectId),
    board:            () => renderProjectBoard(projectId),
    docs:             () => renderProjectDocs(projectId),
    "user-report":    () => renderProjectUserReport(projectId),
    "project-report": () => renderProjectReport(projectId),
  };
  (renderers[tab] || renderers.planning)();
}

function renderProjectPlanning(projectId) {
  document.getElementById("viewArea").innerHTML = `
    <div class="planning-layout">
      <div class="planning-panel" id="planningPanel"></div>
      <div class="cal-wrap" id="calWrap"></div>
    </div>
  `;
  buildProjectPlanningPanel(projectId);
  buildWeekCalendar();
}

function buildProjectPlanningPanel(projectId) {
  const panel = document.getElementById("planningPanel");
  const statColors = { pending:"#f59e0b", doing:"#3b82f6", done:"#22c55e", wishlist:"#8b5cf6" };
  let filterQuery = "";

  function renderList() {
    const tasks = DB.tasks.filter(t =>
      t.project === projectId &&
      t.status !== "done" &&
      (filterQuery === "" || t.title.toLowerCase().includes(filterQuery))
    );
    const list = document.getElementById("panelTasksList");
    if (!list) return;
    list.innerHTML = tasks.length ? tasks.map(t => {
      const proj = DB.getProject(t.project);
      const isScheduled = Object.values(DB.calendarEvents).flat().includes(t.id);
      return `<div class="panel-task-chip ${isScheduled ? "chip-scheduled" : ""}"
                   draggable="true" data-id="${t.id}"
                   ondragstart="planDragStart(event,'${t.id}')">
        <div class="chip-left">
          <span class="chip-status-dot" style="background:${statColors[t.status] || "#ccc"}"></span>
        </div>
        <div class="chip-body">
          <div class="chip-name">${t.title.slice(0,55)}${t.title.length>55?"…":""}</div>
          <div class="chip-meta">
            <span class="chip-project">${proj ? proj.name.split(" ").slice(0,2).join(" ") : "—"}</span>
            <span class="chip-assignee">${formatTaskAssignees(t)}</span>
            ${isScheduled ? `<span class="chip-cal-icon" title="Ya agendado">📅</span>` : ""}
          </div>
        </div>
      </div>`;
    }).join("") :
      `<div style="padding:20px;text-align:center;color:var(--txt4);font-size:12px">Sin tareas disponibles</div>`;
  }

  panel.innerHTML = `
    <div class="planning-panel-header">
      <span class="planning-panel-title">Panel de Tareas</span>
      <span style="font-size:11px;color:var(--txt4)">${DB.tasks.filter(t=>t.project===projectId&&t.status!=="done").length} disponibles</span>
    </div>
    <div class="panel-filter-row">
      <div class="search-input-wrap" style="max-width:100%">
        <svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="7"/><path d="M21 21l-4.35-4.35"/></svg>
        <input class="search-input" placeholder="Buscar tarea…" id="panelFilterInput"
               oninput="planFilterTasks(this.value)"/>
      </div>
    </div>
    <div class="panel-legend">
      <span class="legend-item"><span style="background:#ef4444" class="legend-dot"></span>Alta</span>
      <span class="legend-item"><span style="background:#f59e0b" class="legend-dot"></span>Media</span>
      <span class="legend-item"><span style="background:#16a34a" class="legend-dot"></span>Baja</span>
    </div>
    <div class="panel-tasks-list" id="panelTasksList"></div>
  `;
  renderList();
  window.planFilterTasks = (q) => { filterQuery = q.toLowerCase(); renderList(); };
}

function renderProjectBoard(projectId) {
  const allTasks = DB.tasks.filter(t => t.project === projectId);

  const cols = [
    { key:"pending",  label:"PENDING",  color:"#f59e0b", bg:"#fff7ed" },
    { key:"doing",    label:"DOING",    color:"#3b82f6", bg:"#eff6ff" },
    { key:"done",     label:"DONE",     color:"#22c55e", bg:"#f0fdf4" },
    { key:"wishlist", label:"WISHLIST", color:"#8b5cf6", bg:"#faf5ff" },
  ];

  const colsHtml = cols.map(col => {
    const tasks = allTasks.filter(t => t.status === col.key);
    return `
      <div class="blist-col">
        <div class="blist-col-head" style="border-top:3px solid ${col.color}">
          <div class="blist-col-title-row">
            <span class="blist-col-title" style="color:${col.color}">${col.label}</span>
            <span class="blist-col-count" style="background:${col.bg};color:${col.color}">${tasks.length}</span>
          </div>
        </div>
        <div class="blist-col-body" data-col="${col.key}"
             ondragover="boardDragOver(event)" ondrop="boardDrop(event,'${col.key}','project-${projectId}')">
          ${tasks.length
            ? tasks.map(t => buildBlistRow(t, col.color)).join("")
            : `<div class="blist-empty">Sin tareas — suelta aquí</div>`
          }
        </div>
        <div class="blist-col-foot">
          <button class="blist-add-btn" onclick="openTaskModal('${col.key}', '${projectId}')">
            <svg viewBox="0 0 24 24"><path d="M12 5v14M5 12h14"/></svg>
            New Task
          </button>
        </div>
      </div>
    `;
  }).join("");

  document.getElementById("viewArea").innerHTML = `
    <div class="blist-toolbar">
      <div class="search-input-wrap">
        <svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="7"/><path d="M21 21l-4.35-4.35"/></svg>
        <input class="search-input" placeholder="Buscar tarea…" oninput="boardFilter(event,'project-${projectId}')"/>
      </div>
      <button class="btn btn-primary btn-sm" onclick="openTaskModal(null, '${projectId}')">
        <svg viewBox="0 0 24 24"><path d="M12 5v14M5 12h14"/></svg>
        Nueva Tarea
      </button>
    </div>
    <div class="blist-board">${colsHtml}</div>
  `;
}

function renderProjectDocs(projectId) {
  const project = DB.getProject(projectId);
  document.getElementById("viewArea").innerHTML = `
    <div class="project-docs-view" style="padding:20px">
      <div style="margin-bottom:20px">
        <h3>Documentación del Proyecto</h3>
        <p>Registra notas, especificaciones y documentación relevante.</p>
      </div>
      <textarea class="form-textarea" id="projectDocsTextarea"
                placeholder="Escribe la documentación aquí..."
                style="min-height:400px">${project.docs || ""}</textarea>
      <div style="margin-top:16px;text-align:right">
        <button class="btn btn-primary" onclick="saveProjectDocs('${projectId}')">Guardar Documentación</button>
      </div>
    </div>
  `;
}

function saveProjectDocs(projectId) {
  const docs = document.getElementById("projectDocsTextarea").value;
  const project = DB.getProject(projectId);
  if (project) { project.docs = docs; alert("Documentación guardada."); }
}

function renderProjectUserReport(projectId) {
  const project  = DB.getProject(projectId);
  const teamTasks = DB.tasks.filter(t => t.project === projectId);
  const userStats = project.team.map(userId => {
    const user       = DB.getUser(userId);
    const userTasks  = teamTasks.filter(t => getTaskAssignees(t).includes(userId));
    const completed  = userTasks.filter(t => t.status === "done").length;
    const total      = userTasks.length;
    const totalHours = userTasks.reduce((sum, t) => sum + (t.hours || 0), 0);
    return { user, completed, total, totalHours };
  });

  const rows = userStats.map(stat => `
    <tr>
      <td>${stat.user?.name || stat.user?.id || "—"}</td>
      <td>${stat.completed}</td>
      <td>${stat.total}</td>
      <td>${stat.totalHours}h</td>
    </tr>
  `).join("");

  document.getElementById("viewArea").innerHTML = `
    <div style="padding:20px">
      <h3 style="margin-bottom:8px">Reporte de Usuarios</h3>
      <p style="color:var(--txt3);font-size:12px;margin-bottom:20px">Desempeño de cada usuario asignado al proyecto.</p>
      <div class="data-table-wrap">
        <table class="data-table">
          <thead><tr>
            <th>Usuario</th><th>Tareas Completadas</th><th>Total Tareas</th><th>Horas Dedicadas</th>
          </tr></thead>
          <tbody>${rows}</tbody>
        </table>
      </div>
    </div>
  `;
}

function renderProjectReport(projectId) {
  const allTasks = DB.tasks.filter(t => t.project === projectId);
  const statusCounts = {
    pending:  allTasks.filter(t => t.status === "pending").length,
    doing:    allTasks.filter(t => t.status === "doing").length,
    done:     allTasks.filter(t => t.status === "done").length,
    wishlist: allTasks.filter(t => t.status === "wishlist").length,
  };

  const summaryHtml = `
    <div style="display:flex;gap:10px;flex-wrap:wrap;margin-bottom:24px">
      ${[
        ["#f59e0b","Pending",statusCounts.pending],
        ["#3b82f6","Doing",statusCounts.doing],
        ["#22c55e","Done",statusCounts.done],
        ["#8b5cf6","Wishlist",statusCounts.wishlist],
      ].map(([c,l,n]) =>
        `<div style="background:${c};color:white;padding:8px 16px;border-radius:8px;font-weight:600;font-size:13px">${l}: ${n}</div>`
      ).join("")}
    </div>
  `;

  const completedTasks = allTasks.filter(t => t.status === "done");
  const rows = completedTasks.map(t => {
    const assigneeNames = getTaskAssignees(t).map(id => DB.getUser(id)?.name || id).join(", ");
    return `<tr>
      <td>${t.title}</td>
      <td>${assigneeNames || "—"}</td>
      <td>${fmtDateShort(t.due)}</td>
      <td>${t.priority}</td>
    </tr>`;
  }).join("") || `<tr><td colspan="4" style="text-align:center;padding:18px;color:var(--txt4)">No hay tareas finalizadas.</td></tr>`;

  document.getElementById("viewArea").innerHTML = `
    <div style="padding:20px">
      <h3 style="margin-bottom:8px">Reporte del Proyecto</h3>
      <p style="color:var(--txt3);font-size:12px;margin-bottom:20px">Resumen de tareas y estado del proyecto.</p>
      ${summaryHtml}
      <div class="data-table-wrap">
        <table class="data-table">
          <thead><tr>
            <th>Tarea</th><th>Asignados</th><th>Fecha de Entrega</th><th>Prioridad</th>
          </tr></thead>
          <tbody>${rows}</tbody>
        </table>
      </div>
    </div>
  `;
}

// ──────────────────────────────────────────────
// DASHBOARD
// ──────────────────────────────────────────────
function renderDashboard() {
  const done    = DB.tasks.filter(t => t.status === "done").length;
  const doing   = DB.tasks.filter(t => t.status === "doing").length;
  const pending = DB.tasks.filter(t => t.status === "pending").length;
  const wish    = DB.tasks.filter(t => t.status === "wishlist").length;

  const statsHtml = [
    { label:"Total Proyectos", val: DB.projects.length,                                         sub:"activos",    cls:"dash-stat-accent" },
    { label:"En Desarrollo",   val: DB.projects.filter(p=>p.status==="desarrollo").length,      sub:"proyectos",  cls:"dash-stat-blue" },
    { label:"Tareas Doing",    val: doing,  sub:"en curso",    cls:"dash-stat-blue" },
    { label:"Pendientes",      val: pending, sub:"por atender", cls:"dash-stat-orange" },
    { label:"Completadas",     val: done,   sub:"tareas done", cls:"dash-stat-accent" },
    { label:"Wishlist",        val: wish,   sub:"ideas",       cls:"dash-stat-purple" },
  ].map(s => `
    <div class="dash-stat ${s.cls}">
      <div class="dash-stat-label">${s.label}</div>
      <div class="dash-stat-value">${s.val}</div>
      <div class="dash-stat-sub">${s.sub}</div>
    </div>
  `).join("");

  const activityHtml = DB.activity.map(a => `
    <div class="activity-row">
      <div class="activity-dot" style="background:${a.color}"></div>
      <div>
        <div class="activity-text">${a.text}</div>
        <div class="activity-time">${a.time}</div>
      </div>
    </div>
  `).join("");

  const activeProj  = DB.projects.filter(p => p.status === "desarrollo" || p.status === "qa");
  const progressHtml = activeProj.map(p => `
    <div style="margin-bottom:10px">
      <div style="display:flex;justify-content:space-between;font-size:12px;color:var(--txt3);margin-bottom:4px">
        <span>${p.name}</span><span>${p.progress}%</span>
      </div>
      <div class="prog-bar"><div class="prog-fill" style="width:${p.progress}%"></div></div>
    </div>
  `).join("");

  document.getElementById("viewArea").innerHTML = `
    <div class="dashboard-view">
      <div class="dashboard-grid">${statsHtml}</div>
      <div class="dash-bottom">
        <div class="dash-panel"><div class="dash-panel-title">Actividad Reciente</div>${activityHtml}</div>
        <div class="dash-panel"><div class="dash-panel-title">Proyectos Activos</div>${progressHtml}</div>
      </div>
    </div>
  `;
}

// ──────────────────────────────────────────────
// REPORTES
// ──────────────────────────────────────────────
function renderReportes() {
  const statuses = ["pending","doing","done","wishlist"];
  const colors   = { pending:"#f59e0b", doing:"#3b82f6", done:"#22c55e", wishlist:"#8b5cf6" };
  const max      = Math.max(...statuses.map(s => DB.tasks.filter(t=>t.status===s).length), 1);

  const taskBars = statuses.map(s => {
    const count = DB.tasks.filter(t => t.status === s).length;
    return `<div class="bar-row">
      <span class="bar-label">${s}</span>
      <div class="bar-track"><div class="bar-fill" style="width:${(count/max*100).toFixed(0)}%;background:${colors[s]}"></div></div>
      <span class="bar-val">${count}</span>
    </div>`;
  }).join("");

  const projStatuses = ["pendiente","desarrollo","qa","publicado","finalizado","descartado"];
  const pColors = ["#f59e0b","#3b82f6","#f97316","#6366f1","#22c55e","#9ca3af"];
  const pMax    = Math.max(...projStatuses.map(s => DB.projects.filter(p=>p.status===s).length), 1);
  const projBars = projStatuses.map((s,i) => {
    const count = DB.projects.filter(p => p.status === s).length;
    return `<div class="bar-row">
      <span class="bar-label" style="font-size:11px">${s}</span>
      <div class="bar-track"><div class="bar-fill" style="width:${(count/pMax*100).toFixed(0)}%;background:${pColors[i]}"></div></div>
      <span class="bar-val">${count}</span>
    </div>`;
  }).join("");

  document.getElementById("viewArea").innerHTML = `
    <div class="reportes-view">
      <div style="font-size:18px;font-weight:700;margin-bottom:18px">Reportes</div>
      <div class="report-grid">
        <div class="report-card">
          <div class="report-title">Tareas por Estado</div>
          <div class="bar-chart">${taskBars}</div>
        </div>
        <div class="report-card">
          <div class="report-title">Proyectos por Estado</div>
          <div class="bar-chart">${projBars}</div>
        </div>
        <div class="report-card">
          <div class="report-title">Carga del equipo</div>
          <div class="bar-chart">
            ${DB.users.map(u => {
              const cnt   = DB.tasks.filter(t=>getTaskAssignees(t).includes(u.id)&&t.status!=="done").length;
              const total = DB.tasks.filter(t=>getTaskAssignees(t).includes(u.id)).length;
              return `<div class="bar-row">
                <span class="bar-label">${u.initials}</span>
                <div class="bar-track"><div class="bar-fill" style="width:${total?cnt/total*100:0}%;background:var(--brand)"></div></div>
                <span class="bar-val">${cnt}</span>
              </div>`;
            }).join("")}
          </div>
        </div>
        <div class="report-card">
          <div class="report-title">Progreso de Proyectos Activos</div>
          <div class="bar-chart">
            ${DB.projects.filter(p=>p.status==="desarrollo"||p.status==="qa").map(p => `
              <div class="bar-row">
                <span class="bar-label" style="font-size:10px">${p.name.slice(0,12)}</span>
                <div class="bar-track"><div class="bar-fill" style="width:${p.progress}%;background:var(--brand)"></div></div>
                <span class="bar-val">${p.progress}%</span>
              </div>
            `).join("")}
          </div>
        </div>
      </div>
    </div>
  `;
}

// ──────────────────────────────────────────────
// SETTINGS
// ──────────────────────────────────────────────
function renderSettings() {
  document.getElementById("viewArea").innerHTML = `
    <div style="padding:20px;max-width:480px">
      <div style="font-size:18px;font-weight:700;margin-bottom:18px">Configuración</div>
      <div style="background:var(--surface);border:1px solid var(--border);border-radius:var(--radius-lg);padding:20px">
        <div class="form-group"><label class="form-label">Nombre</label><input class="form-input" value="Juan Dev"/></div>
        <div class="form-group"><label class="form-label">Rol</label><input class="form-input" value="Lead Developer"/></div>
        <div class="form-group"><label class="form-label">Email</label><input class="form-input" type="email" value="juan@flowos.dev"/></div>
        <button class="btn btn-primary">Guardar Cambios</button>
      </div>
    </div>
  `;
}

// ──────────────────────────────────────────────
// MODAL
// ──────────────────────────────────────────────
function initModal() {
  const overlay = document.getElementById("modalOverlay");
  const close   = () => overlay.classList.remove("open");
  document.getElementById("modalClose").addEventListener("click", close);
  document.getElementById("modalCancel").addEventListener("click", close);
  overlay.addEventListener("click", e => { if (e.target === overlay) close(); });

  document.getElementById("modalSave").addEventListener("click", () => {
    const body      = document.getElementById("modalBody");
    const nameInput = body.querySelector('[name="name"]');
    if (!nameInput?.value.trim()) { nameInput.style.borderColor = "red"; return; }

    const type   = document.getElementById("modalSave").dataset.type;
    const taskId = document.getElementById("modalSave").dataset.taskId;

    if (type === "project") {
      DB.projects.push({
        id: "p" + Date.now(),
        name: nameInput.value.trim(),
        desc: body.querySelector('[name="desc"]')?.value || "",
        status: body.querySelector('[name="status"]')?.value || "pendiente",
        progress: 0, team: ["JD"], tasks: 0,
        created: new Date().toISOString().slice(0,10),
      });
    } else if (taskId) {
      const task = DB.getTask(taskId);
      if (task) {
        task.title       = nameInput.value.trim();
        task.description = body.querySelector('[name="description"]')?.value || "";
        task.status      = body.querySelector('[name="status"]')?.value || "pending";
        task.project     = body.querySelector('[name="project"]')?.value || "p1";
        task.priority    = body.querySelector('[name="priority"]')?.value || "medium";
        task.due         = body.querySelector('[name="due"]')?.value || "2026-12-31";
        task.hours       = body.querySelector('[name="hours"]')?.value || "";
        task.attachment  = body.querySelector('[name="attachment"]')?.files[0]?.name || task.attachment;
        task.assignees   = App.modalAssignees.length ? App.modalAssignees : [DB.meId];
        task.assignee    = task.assignees[0];
      }
    } else {
      const assignees = App.modalAssignees.length ? App.modalAssignees : [DB.meId];
      DB.tasks.push({
        id: "t" + Date.now(),
        title:       nameInput.value.trim(),
        description: body.querySelector('[name="description"]')?.value || "",
        status:      body.querySelector('[name="status"]')?.value || "pending",
        assignee:    assignees[0],
        assignees,
        createdBy:   "JD",
        project:     body.querySelector('[name="project"]')?.value || "p1",
        priority:    body.querySelector('[name="priority"]')?.value || "medium",
        due:         body.querySelector('[name="due"]')?.value || "2026-12-31",
        hours:       body.querySelector('[name="hours"]')?.value || "",
        attachment:  body.querySelector('[name="attachment"]')?.files[0]?.name || "",
        tags: [], mine: true, created: true,
      });
    }
    close();
    showTab(App.tab);
  });
}

function openTaskModal(defaultStatus = "pending", projectId = null, taskId = null) {
  const isEdit = !!taskId;
  const task   = isEdit ? DB.getTask(taskId) : null;
  document.getElementById("modalTitle").textContent = isEdit ? "Editar Tarea" : "Nueva Tarea";
  document.getElementById("modalSave").dataset.type   = "task";
  document.getElementById("modalSave").dataset.taskId = taskId || "";

  const projOpts = DB.projects.map(p =>
    `<option value="${p.id}" ${projectId === p.id || (task && task.project === p.id) ? "selected" : ""}>${p.name}</option>`
  ).join("");

  document.getElementById("modalBody").innerHTML = `
    <div class="form-group"><label class="form-label">Título *</label>
      <input class="form-input" name="name" placeholder="Ej. Diseñar pantalla de perfil" value="${task?.title || ""}"/>
    </div>
    <div class="form-group"><label class="form-label">Descripción</label>
      <textarea class="form-textarea" name="description" placeholder="Describe la tarea">${task?.description || ""}</textarea>
    </div>
    <div class="form-row">
      <div class="form-group"><label class="form-label">Proyecto</label>
        <select class="form-select" name="project">${projOpts}</select>
      </div>
      <div class="form-group"><label class="form-label">Miembros asignados</label>
        <div class="member-chip-list" id="assigneeChipList"></div>
      </div>
    </div>
    <div class="form-row">
      <div class="form-group"><label class="form-label">Fecha de entrega</label>
        <input class="form-input" type="date" name="due" value="${task?.due || ""}"/>
      </div>
      <div class="form-group"><label class="form-label">Horas a trabajar</label>
        <input class="form-input" type="number" min="0" step="0.5" name="hours" placeholder="Horas" value="${task?.hours || ""}"/>
      </div>
    </div>
    <div class="form-row">
      <div class="form-group"><label class="form-label">Estado</label>
        <select class="form-select" name="status">
          <option value="pending"  ${task?.status==="pending"  || (!task && defaultStatus==="pending")  ? "selected":""}>Pending</option>
          <option value="doing"    ${task?.status==="doing"    || (!task && defaultStatus==="doing")    ? "selected":""}>Doing</option>
          <option value="done"     ${task?.status==="done"     || (!task && defaultStatus==="done")     ? "selected":""}>Done</option>
          <option value="wishlist" ${task?.status==="wishlist" || (!task && defaultStatus==="wishlist") ? "selected":""}>Wishlist</option>
        </select>
      </div>
      <div class="form-group"><label class="form-label">Prioridad</label>
        <select class="form-select" name="priority">
          <option value="high"   ${task?.priority==="high"   ? "selected":""}>Alta</option>
          <option value="medium" ${task?.priority==="medium" || !task ? "selected":""}>Media</option>
          <option value="low"    ${task?.priority==="low"    ? "selected":""}>Baja</option>
        </select>
      </div>
    </div>
    <div class="form-group"><label class="form-label">Subir archivo</label>
      <input class="form-input" type="file" name="attachment"/>
    </div>
  `;

  App.modalAssignees = task ? [...task.assignees] : [];
  const projectSelect = document.querySelector('[name="project"]');
  projectSelect.addEventListener("change", () => {
    App.modalAssignees = [];
    renderAssigneeChips(projectSelect.value);
  });
  renderAssigneeChips(task?.project || projectId || projectSelect.value);
  document.getElementById("modalOverlay").classList.add("open");
}

function renderAssigneeChips(projectId) {
  const list = document.getElementById("assigneeChipList");
  if (!list) return;
  const project = DB.getProject(projectId);
  const members = project?.team || [];
  list.innerHTML = members.map(id => {
    const user     = DB.getUser(id);
    const selected = App.modalAssignees.includes(id) ? "selected" : "";
    return `<button type="button" class="member-chip ${selected}" data-user-id="${id}">
      <span class="member-chip-key">${user?.initials || id}</span>
      <span class="member-chip-label">${user?.name || id}</span>
    </button>`;
  }).join("");
  list.querySelectorAll(".member-chip").forEach(chip => {
    chip.addEventListener("click", () => {
      const id = chip.dataset.userId;
      chip.classList.toggle("selected");
      if (chip.classList.contains("selected")) {
        if (!App.modalAssignees.includes(id)) App.modalAssignees.push(id);
      } else {
        App.modalAssignees = App.modalAssignees.filter(x => x !== id);
      }
    });
  });
}

function openProjectModal() {
  document.getElementById("modalTitle").textContent = "Nuevo Proyecto";
  document.getElementById("modalSave").dataset.type = "project";
  document.getElementById("modalBody").innerHTML = `
    <div class="form-group"><label class="form-label">Nombre *</label>
      <input class="form-input" name="name" placeholder="Ej. Portal de clientes v3"/>
    </div>
    <div class="form-group"><label class="form-label">Descripción</label>
      <textarea class="form-textarea" name="desc" placeholder="¿De qué trata?"></textarea>
    </div>
    <div class="form-row">
      <div class="form-group"><label class="form-label">Estado inicial</label>
        <select class="form-select" name="status">
          <option value="pendiente">Pendiente</option>
          <option value="desarrollo">En Desarrollo</option>
          <option value="qa">QA</option>
          <option value="publicado">Publicado</option>
        </select>
      </div>
    </div>
  `;
  document.getElementById("modalOverlay").classList.add("open");
}

// ──────────────────────────────────────────────
// UTILS
// ──────────────────────────────────────────────
function getTaskAssignees(t) {
  if (!t) return [];
  if (Array.isArray(t.assignees)) return t.assignees;
  return t.assignee ? [t.assignee] : [];
}
function formatTaskAssignees(t) {
  const assignees = getTaskAssignees(t);
  return assignees.length
    ? assignees.map(id => `@${DB.getUser(id)?.initials || id}`).join(", ")
    : "—";
}
function fmtDate(str) {
  if (!str) return "—";
  const d = new Date(str + "T00:00:00");
  return d.toLocaleDateString("es-PE", { day:"numeric", month:"short", year:"numeric" });
}
function fmtDateShort(str) {
  if (!str) return "—";
  const d = new Date(str + "T00:00:00");
  return d.toLocaleDateString("es-PE", { day:"numeric", month:"short" });
}
