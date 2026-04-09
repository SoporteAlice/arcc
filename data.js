/* ============================================================
   DATA.JS — FlowOS data store
   ============================================================ */

const DB = {
  me: "Juan Dev",
  meId: "JD",

  users: [
    { id: "JD", name: "Juan Dev",            initials: "JD" },
    { id: "AM", name: "Alejandro M.",        initials: "AM" },
    { id: "KR", name: "Karen R.",            initials: "KR" },
    { id: "BS", name: "Brian S.",            initials: "BS" },
    { id: "FN", name: "Fernando Carrasco",   initials: "FC" },
  ],

  projects: [
    { id: "p1", name: "Portal E-Commerce",     desc: "Rediseño del portal de ventas con nuevo checkout y UX.",    status: "desarrollo", progress: 65,  team: ["JD","AM","KR"], tasks: 12, created: "2025-11-01" },
    { id: "p2", name: "App Móvil v2.0",        desc: "Nueva versión con soporte offline y dark mode.",            status: "qa",         progress: 88,  team: ["JD","BS"],      tasks: 8,  created: "2025-10-15" },
    { id: "p3", name: "Dashboard Analytics",   desc: "Panel de métricas en tiempo real para marketing.",          status: "pendiente",  progress: 10,  team: ["AM"],           tasks: 5,  created: "2025-12-01" },
    { id: "p4", name: "API REST v3",           desc: "Refactorización con GraphQL y nuevos endpoints.",           status: "publicado",  progress: 100, team: ["JD","KR"],      tasks: 20, created: "2025-09-01" },
    { id: "p5", name: "Sistema de Pagos",      desc: "Integración con Stripe y PayPal para pagos globales.",      status: "finalizado", progress: 100, team: ["JD","AM","BS"], tasks: 18, created: "2025-08-01" },
    { id: "p6", name: "Chatbot IA",            desc: "Bot de soporte automatizado usando GPT.",                   status: "descartado", progress: 30,  team: ["JD"],           tasks: 4,  created: "2025-07-01" },
    { id: "p7", name: "Migración Cloud",       desc: "Migración de infraestructura on-premise a AWS.",           status: "desarrollo", progress: 45,  team: ["JD","KR"],      tasks: 15, created: "2025-11-20" },
    { id: "p8", name: "APP - Richard",         desc: "Aplicación de gestión para cliente Richard.",               status: "desarrollo", progress: 55,  team: ["JD","FN"],      tasks: 10, created: "2025-12-10" },
    { id: "p9", name: "APP - MHS Saye 2",      desc: "Segunda versión de MHS Saye con nuevas funciones.",        status: "pendiente",  progress: 5,   team: ["JD","AM"],      tasks: 7,  created: "2026-01-05" },
    { id:"p10", name: "Casa de cambio Foo",    desc: "Sistema de gestión de casa de cambio.",                    status: "desarrollo", progress: 40,  team: ["JD","KR"],      tasks: 9,  created: "2026-01-10" },
    { id:"p11", name: "Desarrollo casa 2.0",   desc: "Segunda versión del desarrollo de casa.",                  status: "qa",         progress: 75,  team: ["JD","AM","BS"], tasks: 14, created: "2025-12-20" },
  ],

  tasks: [
    // Mis Tareas (asignadas a mí)
    { id: "t01", title: "@Jlewei definir tareas para la E-shop",           status: "pending",  assignee: "JD", createdBy: "AM", project: "p1",  priority: "high",   tags: ["dev"],     due: "2026-01-13", mine: true,  created: false },
    { id: "t02", title: "@Jlewei kontactar a @Richard - darle seguimiento", status: "pending",  assignee: "JD", createdBy: "JD", project: "p8",  priority: "medium", tags: ["feature"], due: "2026-01-16", mine: true,  created: true  },
    { id: "t03", title: "@Jlewei añadir parcela de dealtime",              status: "pending",  assignee: "JD", createdBy: "JD", project: "p10", priority: "medium", tags: ["dev"],     due: "2026-01-18", mine: true,  created: true  },
    { id: "t04", title: "presupuesto co gestión de crédito que…",         status: "pending",  assignee: "JD", createdBy: "AM", project: "p3",  priority: "high",   tags: ["design"],  due: "2026-01-20", mine: true,  created: false },
    { id: "t05", title: "crear presupuesto para facilprit con regresión de d…", status: "pending", assignee: "JD", createdBy: "JD", project: "p9", priority: "low", tags: ["feature"], due: "2026-01-25", mine: true, created: true },
    { id: "t06", title: "@Jlewei contactar con Ernesto Barros seguimiento 1.", status: "doing",   assignee: "JD", createdBy: "BS", project: "p1",  priority: "high",   tags: ["dev"],     due: "2026-01-17", mine: true, created: false },
    { id: "t07", title: "@Michel Caje concepto - cambiar pago de presupuesto por pago de un saldo pendiente", status: "doing", assignee: "JD", createdBy: "JD", project: "p11", priority: "high", tags: ["dev"], due: "2026-01-19", mine: true, created: true },
    { id: "t08", title: "Desarrollo casa de cambio 2.0 (AO)/LOS BOL…",   status: "doing",    assignee: "JD", createdBy: "JD", project: "p10", priority: "medium", tags: ["dev"],     due: "2026-01-22", mine: true, created: true  },
    { id: "t09", title: "@Jlewei contactar con Ernesto Barros seguimiento f.", status: "done",  assignee: "JD", createdBy: "AM", project: "p1",  priority: "medium", tags: ["feature"], due: "2025-12-19", mine: true, created: false },
    { id: "t10", title: "@Michel Caje concepto - cambiar pago de presupuesto", status: "done", assignee: "JD", createdBy: "JD", project: "p11", priority: "high",   tags: ["dev"],     due: "2025-12-30", mine: true, created: true  },
    { id: "t11", title: "Desarrollo casa de cambio 2.0 (ALGUOSE BOL…",   status: "done",     assignee: "JD", createdBy: "JD", project: "p10", priority: "low",    tags: ["dev"],     due: "2025-12-28", mine: true, created: true  },
    { id: "t12", title: "@Michel apartado de solo inventarios de costos (…", status: "done",  assignee: "JD", createdBy: "AM", project: "p11", priority: "medium", tags: ["qa"],      due: "2025-11-25", mine: true, created: false },

    // Tareas creadas por mí para otros
    { id: "t13", title: "aneglar T3",                                      status: "pending",  assignee: "AM", createdBy: "JD", project: "p4",  priority: "medium", tags: ["dev"],     due: "2026-01-28", mine: false, created: true },
    { id: "t14", title: "running",                                         status: "pending",  assignee: "KR", createdBy: "JD", project: "p7",  priority: "low",    tags: ["qa"],      due: "2026-02-01", mine: false, created: true },
    { id: "t15", title: "web Sonia Diaz Parga - Joaquín",                 status: "doing",    assignee: "AM", createdBy: "JD", project: "p1",  priority: "high",   tags: ["design"],  due: "2026-01-19", mine: false, created: true },
    { id: "t16", title: "Corregir bug en formulario de login",            status: "done",     assignee: "BS", createdBy: "JD", project: "p2",  priority: "high",   tags: ["bug"],     due: "2026-01-10", mine: false, created: true },
    { id: "t17", title: "email también: me-reply@…",                      status: "wishlist", assignee: "AM", createdBy: "JD", project: "p2",  priority: "low",    tags: ["feature"], due: "2026-03-01", mine: false, created: true },
    { id: "t18", title: "CUESTIONES ADMINISTRATIVAS Y DE FUNCIONAMIENTO - @Jlewei enlace con el Financiero: José Manuel y pasar la propuesta y el costo!", status: "doing", assignee: "FN", createdBy: "JD", project: "p8", priority: "high", tags: ["dev"], due: "2026-01-21", mine: false, created: true },

    // Wishlist general
    { id: "t19", title: "Implementar notificaciones push",                 status: "wishlist", assignee: "JD", createdBy: "JD", project: "p2",  priority: "low",    tags: ["feature"], due: "2026-03-01", mine: true,  created: true  },
    { id: "t20", title: "Palanca de taller FORM - 1 gestión admirables… datos de vehículo", status: "wishlist", assignee: "AM", createdBy: "JD", project: "p4", priority: "medium", tags: ["design"], due: "2026-04-01", mine: false, created: true },
    { id: "t21", title: "PROYECTO GRID XFO - FREE integrar formulario con el CRM", status: "wishlist", assignee: "JD", createdBy: "AM", project: "p5", priority: "medium", tags: ["dev","feature"], due: "2026-03-15", mine: true, created: false },
  ],

  calendarEvents: {
    "2026-04-06": ["t01","t06"],
    "2026-04-07": ["t02","t18"],
    "2026-04-08": ["t07","t04"],
    "2026-04-09": ["t03","t15"],
    "2026-04-10": ["t08"],
    "2026-04-11": ["t05"],
  },
  calEventTimes: {
    "t01": 9, "t06": 15, "t02": 10, "t18": 9.5,
    "t07": 10.5, "t04": 16, "t03": 11, "t15": 9,
    "t08": 11.5, "t05": 9, "t21": 15,
  },
  calEventDurations: {
    "t01": 1, "t06": 1, "t02": 1, "t18": 1.5,
    "t07": 1.5, "t04": 1, "t03": 1, "t15": 1,
    "t08": 1, "t05": 1, "t21": 1,
  },

  activity: [
    { text: "Proyecto 'App Móvil v2.0' movido a QA",          time: "Hace 10 min",  color: "#f59e0b" },
    { text: "Tarea 'Integrar Stripe' iniciada por Juan Dev",  time: "Hace 1 hora",  color: "#3b82f6" },
    { text: "Bug crítico resuelto en formulario de login",    time: "Hace 3 horas", color: "#22c55e" },
    { text: "Nuevo proyecto 'Migración Cloud' creado",        time: "Ayer",         color: "#8b5cf6" },
    { text: "Tarea 'Config CI/CD' marcada como completada",  time: "Ayer",         color: "#22c55e" },
  ],

  // helpers
  getTask(id)     { return this.tasks.find(t => t.id === id); },
  getProject(id)  { return this.projects.find(p => p.id === id); },
  getUser(id)     { return this.users.find(u => u.id === id); },
  myTasks()       { return this.tasks.filter(t => t.mine); },
  createdByMe()   { return this.tasks.filter(t => t.createdBy === this.meId); },
  doneTasks()     { return this.tasks.filter(t => t.status === "done"); },
  projectsByStatus(s) { return this.projects.filter(p => p.status === s); },
};