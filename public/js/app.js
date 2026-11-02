/* NGSOFT PQRS – frontend con una interfaz distinta por rol
   Si tus rutas o campos se llaman distinto, ajusta solo CONFIG y normalizar(). */
 
const CONFIG = {
  rutas: { login: '/auth/login', solicitudes: '/solicitudes', catalogos: '/catalogos' },
  diasLegales: 15, // días hábiles para responder una petición
  clave: '1234',
  // Ajusta estos correos a los de tu seed.js
  demo: [
    ['Admin', 'admin@pqrs.co'],
    ['Kevin (Peticiones)', 'kevin@pqrs.co'],
    ['Andrés (Quejas)', 'andres@pqrs.co'],
    ['Maira (Reclamos)', 'maira@pqrs.co'],
    ['Moisés (Sugerencias)', 'moises@pqrs.co'],
    ['Laura (Usuario)', 'laura@pqrs.co'],
  ],
};
 
const ESTADOS = [
  { key: 'pendiente', label: 'Pendiente' },
  { key: 'proceso', label: 'En proceso' },
  { key: 'resuelta', label: 'Resuelta' },
];
const NAV = {
  admin: [{ id: 'resumen', label: 'Resumen' }, { id: 'solicitudes', label: 'Todas las PQRS' }],
  responsable: [{ id: 'tablero', label: 'Mi tablero' }, { id: 'lista', label: 'Lista' }],
  usuario: [{ id: 'mis', label: 'Mis solicitudes' }],
};
const ROL_LABEL = { admin: 'Administrador', responsable: 'Responsable', usuario: 'Usuario' };
const TAB_INICIAL = { admin: 'resumen', responsable: 'tablero', usuario: 'mis' };
const PASOS = ['Radicada', 'En revisión', 'Respondida'];
 
const state = {
  token: sessionStorage.getItem('token'),
  me: JSON.parse(sessionStorage.getItem('me') || 'null'),
  role: null, tab: null, items: [], tipos: [], q: '', est: 'todos',
};
 
/* ---------- utilidades ---------- */
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const esc = (v) => String(v ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const labelOf = (key) => ESTADOS.find((e) => e.key === key).label;
const nombreDe = (me) => me.nombre ?? me.name ?? me.correo ?? 'Usuario';
const primerNombre = (me) => nombreDe(me).split(' ')[0];
const iniciales = (n) => n.split(' ').map((p) => p[0]).slice(0, 2).join('').toUpperCase();
const fmt = (f) => new Date(f).toLocaleDateString('es-CO', { day: 'numeric', month: 'short', year: 'numeric' });
 
function rolDe(me) {
  const r = String(me.rol ?? me.role ?? me.rol_nombre ?? '').toLowerCase();
  if (r.includes('admin')) return 'admin';
  if (r.includes('respons')) return 'responsable';
  return 'usuario';
}
function estadoKey(e) {
  const t = String(e ?? '').toLowerCase();
  if (t.includes('proceso')) return 'proceso';
  if (t.includes('resuel') || t.includes('cerr')) return 'resuelta';
  return 'pendiente';
}
function normalizar(s) {
  const fecha = new Date(s.fecha ?? s.created_at ?? s.fecha_creacion);
  const key = estadoKey(s.estado ?? s.estado_nombre);
  return {
    id: s.id ?? s.id_solicitud,
    asunto: s.asunto ?? s.titulo ?? '',
    descripcion: s.descripcion ?? s.detalle ?? '',
    tipo: s.tipo ?? s.tipo_nombre ?? '',
    usuario: s.usuario ?? s.usuario_nombre ?? '',
    responsable: s.responsable ?? s.responsable_nombre ?? '',
    fecha: isNaN(fecha) ? new Date() : fecha,
    key, label: labelOf(key),
  };
}
 
/* Días hábiles (sin festivos) para el semáforo de vencimiento */
function habilesTranscurridos(desde) {
  const d = new Date(desde), hoy = new Date();
  d.setHours(0, 0, 0, 0); hoy.setHours(0, 0, 0, 0);
  let n = 0;
  while (d < hoy) { d.setDate(d.getDate() + 1); if (d.getDay() % 6 !== 0) n++; }
  return n;
}
const restantes = (s) => CONFIG.diasLegales - habilesTranscurridos(s.fecha);
function semaforo(s) {
  if (s.key === 'resuelta') return { cls: 'ok', txt: 'Cerrada' };
  const r = restantes(s);
  if (r < 0) return { cls: 'bad', txt: `Vencida hace ${-r} d` };
  if (r <= 3) return { cls: 'bad', txt: `${r} d hábiles` };
  if (r <= 7) return { cls: 'warn', txt: `${r} d hábiles` };
  return { cls: 'ok', txt: `${r} d hábiles` };
}
const chipVence = (s) => { const v = semaforo(s); return `<span class="due ${v.cls}">${v.txt}</span>`; };
const chipEstado = (s) => `<span class="chip st-${s.key}">${s.label}</span>`;
 
function toast(msg, tipo = 'ok') {
  let box = $('#toasts');
  if (!box) { box = document.createElement('div'); box.id = 'toasts'; document.body.append(box); }
  const t = document.createElement('div');
  t.className = `toast ${tipo}`; t.textContent = msg; box.append(t);
  setTimeout(() => t.remove(), 3800);
}
 
/* ---------- API ---------- */
async function api(path, options = {}) {
  const headers = { 'Content-Type': 'application/json', ...(state.token && { Authorization: `Bearer ${state.token}` }) };
  const res = await fetch(`/api${path}`, { ...options, headers });
  const data = await res.json().catch(() => ({}));
  if (res.status === 401 && state.token) { logout(); throw new Error('Tu sesión expiró. Ingresa de nuevo.'); }
  if (!res.ok) throw new Error(data.error || data.message || 'Error en la solicitud');
  return data;
}
 
async function cargar() {
  const R = CONFIG.rutas;
  const [sol, cat] = await Promise.all([api(R.solicitudes), api(R.catalogos).catch(() => null)]);
  const lista = Array.isArray(sol) ? sol : sol.solicitudes ?? sol.data ?? [];
  state.items = lista.map(normalizar).sort((a, b) => b.id - a.id);
  const t = cat?.tipos ?? cat?.tipos_solicitud ?? (Array.isArray(cat) ? cat : []);
  state.tipos = t.length
    ? t.map((x) => ({ id: x.id, nombre: x.nombre ?? x.tipo }))
    : ['Petición', 'Queja', 'Reclamo', 'Sugerencia'].map((n, i) => ({ id: i + 1, nombre: n }));
}
 
async function updateEstado(id, key) {
  const s = state.items.find((x) => String(x.id) === String(id));
  if (!s || s.key === key) return;
  const prev = { key: s.key, label: s.label };
  Object.assign(s, { key, label: labelOf(key) });
  render();
  try {
    await api(`${CONFIG.rutas.solicitudes}/${s.id}`, { method: 'PATCH', body: JSON.stringify({ estado: labelOf(key) }) });
    toast(`#${s.id} pasó a ${labelOf(key)}`);
  } catch (err) {
    Object.assign(s, prev); render();
    toast(`No se pudo guardar el cambio. ${err.message}`, 'error');
  }
}
 
/* ---------- sesión ---------- */
function setSession(token, me) {
  state.token = token; state.me = me;
  state.role = rolDe(me); state.tab = TAB_INICIAL[state.role];
  sessionStorage.setItem('token', token);
  sessionStorage.setItem('me', JSON.stringify(me));
}
function logout() {
  sessionStorage.clear();
  Object.assign(state, { token: null, me: null, role: null, items: [], q: '', est: 'todos' });
  closeOverlays(); render();
}
function toggleTheme() {
  const next = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark';
  document.documentElement.dataset.theme = next;
  localStorage.setItem('theme', next); render();
}
 
/* ---------- login ---------- */
function renderLogin() {
  $('#app').innerHTML = `
    <div class="auth">
      <section class="auth-hero">
        <span class="logo">NG</span>
        <h1>Cada solicitud merece una respuesta a tiempo.</h1>
        <p>Radica, atiende y haz seguimiento de peticiones, quejas, reclamos y sugerencias en un solo lugar.</p>
      </section>
      <section class="auth-card">
        <h2>Ingresa a NGSOFT PQRS</h2>
        <form id="login-form">
          <label>Correo electrónico<input type="email" name="correo" id="correo" required placeholder="correo@pqrs.co" autocomplete="username"></label>
          <label>Contraseña<input type="password" name="password" required placeholder="Tu contraseña" autocomplete="current-password"></label>
          <button class="btn btn-main wide">Ingresar</button>
        </form>
        <div class="demo">
          <p>Acceso rápido de demostración (clave ${CONFIG.clave})</p>
          <div>${CONFIG.demo.map(([n, c]) => `<button type="button" class="pill" data-demo="${c}">${esc(n)}</button>`).join('')}</div>
        </div>
      </section>
    </div>`;
}
 
/* ---------- estructura común ---------- */
function shell(inner) {
  const nombre = nombreDe(state.me);
  const oscuro = document.documentElement.dataset.theme === 'dark';
  return `
  <div class="shell role-${state.role}">
    <aside class="side">
      <div class="brand"><span class="logo">NG</span><b>NGSOFT PQRS</b></div>
      <nav>${NAV[state.role].map((n) => `<button class="nav ${state.tab === n.id ? 'on' : ''}" data-tab="${n.id}">${n.label}</button>`).join('')}</nav>
      <div class="side-foot">
        <div class="me"><span class="avatar">${esc(iniciales(nombre))}</span><div><b>${esc(nombre)}</b><small>${ROL_LABEL[state.role]}</small></div></div>
        <div class="row">
          <button class="ghost" data-action="theme" aria-label="Cambiar tema">${oscuro ? 'Claro' : 'Oscuro'}</button>
          <button class="ghost grow" data-action="logout">Salir</button>
        </div>
      </div>
    </aside>
    <main class="main">${inner}</main>
  </div>`;
}
const head = (titulo, sub, acciones = '') =>
  `<header class="head"><div><h1>${titulo}</h1><p>${sub}</p></div><div class="head-actions">${acciones}</div></header>`;
 
const timeline = (s) => {
  const idx = ESTADOS.findIndex((e) => e.key === s.key);
  return `<ol class="timeline">${PASOS.map((p, i) =>
    `<li class="${s.key === 'resuelta' || i < idx ? 'done' : i === idx ? 'now' : ''}">${p}</li>`).join('')}</ol>`;
};
 
/* ---------- vista ADMIN: resumen ---------- */
function viewResumen() {
  const L = state.items, n = (k) => L.filter((s) => s.key === k).length;
  const urgentes = L.filter((s) => s.key !== 'resuelta' && restantes(s) <= 3).sort((a, b) => restantes(a) - restantes(b));
  const grupo = (campo) => {
    const m = {};
    L.forEach((s) => { const k = s[campo] || 'Sin asignar'; m[k] = (m[k] || 0) + 1; });
    return Object.entries(m).sort((a, b) => b[1] - a[1]);
  };
  const barras = (pares) => {
    const max = Math.max(1, ...pares.map((p) => p[1]));
    return pares.map(([k, v], i) => `<div class="bar"><span>${esc(k)}</span><div class="track"><i style="--w:${(v / max) * 100}%;--d:${i * 80}ms"></i></div><b>${v}</b></div>`).join('')
      || '<p class="empty-sm">Aún no hay datos.</p>';
  };
  const stats = [['Total', L.length, 'all'], ['Pendientes', n('pendiente'), 'pendiente'], ['En proceso', n('proceso'), 'proceso'], ['Resueltas', n('resuelta'), 'resuelta']];
  return head('Resumen general', 'Así va la atención de solicitudes hoy.', '<button class="btn" data-action="csv">Exportar CSV</button>')
    + `<section class="stats">${stats.map(([l, v, k]) => `<div class="stat s-${k}"><b data-count="${v}">0</b><span>${l}</span></div>`).join('')}</section>
    <section class="grid2">
      <div class="panel"><h2>Solicitudes por tipo</h2>${barras(grupo('tipo'))}</div>
      <div class="panel"><h2>Carga por responsable</h2>${barras(grupo('responsable'))}</div>
    </section>
    <section class="panel"><h2>Por vencer o vencidas</h2>${urgentes.length
      ? `<ul class="list">${urgentes.map((s) => `<li data-open="${s.id}"><b>#${s.id} ${esc(s.asunto)}</b><span>${esc(s.responsable)}</span>${chipVence(s)}</li>`).join('')}</ul>`
      : '<p class="empty-sm">Nada vence en los próximos 3 días hábiles.</p>'}</section>`;
}
 
/* ---------- tabla (admin y responsable) ---------- */
function filtrar() {
  const q = state.q.trim().toLowerCase();
  return state.items.filter((s) => (state.est === 'todos' || s.key === state.est)
    && (!q || [s.id, s.asunto, s.tipo, s.usuario, s.responsable].join(' ').toLowerCase().includes(q)));
}
function filas() {
  const L = filtrar();
  if (!L.length) return '<p class="empty">No hay solicitudes con ese filtro.</p>';
  return `<div class="scroll"><table class="tbl"><thead><tr><th>ID</th><th>Asunto</th><th>Tipo</th><th>Estado</th><th>Usuario</th><th>Responsable</th><th>Vence</th></tr></thead><tbody>
    ${L.map((s) => `<tr data-open="${s.id}"><td>#${s.id}</td><td><b>${esc(s.asunto)}</b></td><td>${esc(s.tipo)}</td><td>${chipEstado(s)}</td><td>${esc(s.usuario)}</td><td>${esc(s.responsable)}</td><td>${chipVence(s)}</td></tr>`).join('')}
  </tbody></table></div>`;
}
function viewTabla() {
  const filtros = [['todos', 'Todas'], ...ESTADOS.map((e) => [e.key, e.label])];
  return head(state.role === 'admin' ? 'Todas las PQRS' : 'Mi lista', `${state.items.length} solicitudes registradas.`,
    state.role === 'admin' ? '<button class="btn" data-action="csv">Exportar CSV</button>' : '')
    + `<div class="toolbar">
        <input type="search" data-q placeholder="Buscar por asunto, usuario o responsable" value="${esc(state.q)}">
        <div class="seg">${filtros.map(([k, l]) => `<button class="${state.est === k ? 'on' : ''}" data-est="${k}">${l}</button>`).join('')}</div>
      </div>
      <div class="panel flush" id="tbl">${filas()}</div>`;
}
 
/* ---------- vista RESPONSABLE: tablero ---------- */
function tarjeta(s) {
  return `<article class="pqrs" draggable="true" data-open="${s.id}">
    <div class="meta"><span>#${s.id}</span><span class="tipo">${esc(s.tipo)}</span>${chipVence(s)}</div>
    <h3>${esc(s.asunto)}</h3>
    <p>${esc(s.usuario)} · ${fmt(s.fecha)}</p>
  </article>`;
}
function viewTablero() {
  const L = state.items;
  const cols = ESTADOS.map((e) => {
    const l = L.filter((s) => s.key === e.key);
    return `<section class="col st-${e.key}" data-col="${e.key}">
      <h3>${e.label}<span class="count">${l.length}</span></h3>
      <div class="stack">${l.map(tarjeta).join('') || '<p class="empty-sm">Arrastra una tarjeta hasta aquí.</p>'}</div>
    </section>`;
  }).join('');
  const urgentes = L.filter((s) => s.key !== 'resuelta' && restantes(s) <= 3).length;
  return head(`Hola, ${esc(primerNombre(state.me))}`,
    urgentes ? `Tienes ${urgentes} solicitud${urgentes === 1 ? '' : 'es'} por vencer. Empieza por las rojas.` : 'Vas al día. Arrastra las tarjetas para cambiar su estado.')
    + `<section class="board">${cols}</section>`;
}
 
/* ---------- vista USUARIO ---------- */
function viewMias() {
  const L = state.items, abiertas = L.filter((s) => s.key !== 'resuelta').length;
  const sub = L.length ? `Tienes ${abiertas} solicitud${abiertas === 1 ? '' : 'es'} en curso.` : 'Aquí verás el avance de todo lo que radiques.';
  const cuerpo = L.length
    ? `<section class="cards">${L.map((s) => `<article class="mine" data-open="${s.id}">
        <div class="meta"><span class="tipo">${esc(s.tipo)}</span><span>Radicada el ${fmt(s.fecha)}</span></div>
        <h3>${esc(s.asunto)}</h3>${timeline(s)}
      </article>`).join('')}</section>`
    : `<div class="empty big"><h2>Aún no has radicado nada</h2><p>Cuéntanos qué necesitas y te avisaremos cuando haya respuesta.</p><button class="btn btn-main" data-action="nueva">Radicar mi primera PQRS</button></div>`;
  return head(`Hola, ${esc(primerNombre(state.me))}`, sub, '<button class="btn btn-main" data-action="nueva">Radicar nueva PQRS</button>') + cuerpo;
}
 
/* ---------- panel de detalle y modal ---------- */
function closeOverlays() { $('#layer')?.remove(); }
function openLayer(html) {
  closeOverlays();
  const d = document.createElement('div');
  d.id = 'layer'; d.className = `role-${state.role}`; d.innerHTML = `<div class="overlay" data-action="close"></div>${html}`;
  document.body.append(d);
  d.querySelector('input,textarea,select,button.btn')?.focus();
}
function openDrawer(id) {
  const s = state.items.find((x) => String(x.id) === String(id));
  if (!s) return;
  const mover = state.role === 'responsable'
    ? `<h4>Cambiar estado</h4><div class="move">${ESTADOS.map((e) => `<button class="btn ${e.key === s.key ? 'btn-main' : ''}" data-move="${e.key}" data-id="${s.id}">${e.label}</button>`).join('')}</div>` : '';
  openLayer(`<aside class="drawer" role="dialog" aria-label="Detalle de la solicitud">
    <button class="x" data-action="close" aria-label="Cerrar">×</button>
    <p class="muted">PQRS #${s.id}</p><h2>${esc(s.asunto)}</h2>
    <div class="row gap">${chipEstado(s)}${chipVence(s)}</div>
    <dl>
      <dt>Tipo</dt><dd>${esc(s.tipo)}</dd>
      <dt>Radicada por</dt><dd>${esc(s.usuario)}</dd>
      <dt>Responsable</dt><dd>${esc(s.responsable)}</dd>
      <dt>Fecha</dt><dd>${fmt(s.fecha)}</dd>
    </dl>
    ${s.descripcion ? `<h4>Descripción</h4><p>${esc(s.descripcion)}</p>` : ''}
    <h4>Avance</h4>${timeline(s)}${mover}
  </aside>`);
}
function openNueva() {
  openLayer(`<form class="modal" id="nueva">
    <h2>Radicar nueva PQRS</h2>
    <label>Tipo<select name="tipo">${state.tipos.map((t) => `<option value="${t.id}">${esc(t.nombre)}</option>`).join('')}</select></label>
    <label>Asunto<input name="asunto" required maxlength="120" placeholder="Ej. Demora en la atención"></label>
    <label>Descripción<textarea name="descripcion" rows="4" required placeholder="Cuéntanos qué pasó y qué esperas como respuesta"></textarea></label>
    <div class="row end"><button type="button" class="btn" data-action="close">Cancelar</button><button class="btn btn-main">Radicar</button></div>
  </form>`);
}
 
function exportCSV() {
  const rows = [['ID', 'Asunto', 'Tipo', 'Estado', 'Usuario', 'Responsable', 'Fecha'],
    ...filtrar().map((s) => [s.id, s.asunto, s.tipo, s.label, s.usuario, s.responsable, fmt(s.fecha)])];
  const csv = '\ufeff' + rows.map((r) => r.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n');
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
  a.download = 'pqrs.csv'; a.click(); URL.revokeObjectURL(a.href);
}
 
/* ---------- render ---------- */
function contar(el) {
  const fin = +el.dataset.count;
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) { el.textContent = fin; return; }
  const t0 = performance.now();
  const paso = (t) => {
    const p = Math.min(1, (t - t0) / 700);
    el.textContent = Math.round(fin * (1 - Math.pow(1 - p, 3)));
    if (p < 1) requestAnimationFrame(paso);
  };
  requestAnimationFrame(paso);
}
function render() {
  if (!state.token || !state.me) return renderLogin();
  const vistas = { resumen: viewResumen, solicitudes: viewTabla, tablero: viewTablero, lista: viewTabla, mis: viewMias };
  $('#app').innerHTML = shell(vistas[state.tab]());
  $$('[data-count]').forEach(contar);
}
 
/* ---------- eventos ---------- */
document.addEventListener('click', (e) => {
  const el = e.target.closest('[data-action],[data-tab],[data-est],[data-move],[data-open],[data-demo]');
  if (!el) return;
  const d = el.dataset;
  if (d.move) return updateEstado(d.id, d.move).then(() => openDrawer(d.id));
  if (d.demo) { const f = $('#login-form'); f.correo.value = d.demo; f.password.value = CONFIG.clave; return f.requestSubmit(); }
  if (d.tab) { Object.assign(state, { tab: d.tab, q: '', est: 'todos' }); return render(); }
  if (d.est) { state.est = d.est; return render(); }
  if (d.open) return openDrawer(d.open);
  ({ logout, theme: toggleTheme, csv: exportCSV, nueva: openNueva, close: closeOverlays })[d.action]?.();
});
 
document.addEventListener('input', (e) => {
  if (!e.target.matches('[data-q]')) return;
  state.q = e.target.value; $('#tbl').innerHTML = filas();
});
document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeOverlays(); });
 
document.addEventListener('submit', async (e) => {
  e.preventDefault();
  const f = e.target, btn = $('button:not([type=button])', f), txt = btn.textContent;
  btn.disabled = true; btn.textContent = 'Un momento…';
  try {
    if (f.id === 'login-form') {
      const pass = f.password.value;
      // Se envían varios nombres de campo por si tu backend usa "clave" o "contrasena"; deja solo el que uses.
      const data = await api(CONFIG.rutas.login, { method: 'POST', body: JSON.stringify({ correo: f.correo.value.trim(), password: pass, clave: pass, contrasena: pass }) });
      setSession(data.token, data.usuario ?? data.user ?? data);
      await cargar(); render();
      toast(`Bienvenido, ${primerNombre(state.me)}`);
    } else if (f.id === 'nueva') {
      const tipo = f.tipo.selectedOptions[0].textContent;
      await api(CONFIG.rutas.solicitudes, { method: 'POST', body: JSON.stringify({ asunto: f.asunto.value.trim(), descripcion: f.descripcion.value.trim(), tipo_id: Number(f.tipo.value), tipo }) });
      closeOverlays(); await cargar(); render();
      toast('PQRS radicada. Te avisaremos cuando haya respuesta.');
    }
  } catch (err) {
    btn.disabled = false; btn.textContent = txt;
    toast(err.message, 'error');
  }
});
 
/* Arrastrar y soltar en el tablero del responsable */
document.addEventListener('dragstart', (e) => {
  const c = e.target.closest?.('.pqrs'); if (!c) return;
  e.dataTransfer.setData('text/plain', c.dataset.open); c.classList.add('drag');
});
document.addEventListener('dragend', () => $$('.drag,.over').forEach((n) => n.classList.remove('drag', 'over')));
document.addEventListener('dragover', (e) => {
  const col = e.target.closest?.('.col'); if (!col) return;
  e.preventDefault();
  $$('.col.over').forEach((c) => c !== col && c.classList.remove('over')); col.classList.add('over');
});
document.addEventListener('drop', (e) => {
  const col = e.target.closest?.('.col'); if (!col) return;
  e.preventDefault(); updateEstado(e.dataTransfer.getData('text/plain'), col.dataset.col);
});
 
/* ---------- arranque ---------- */
(async function boot() {
  document.documentElement.dataset.theme = localStorage.getItem('theme') || 'light';
  if (state.token && state.me) {
    state.role = rolDe(state.me); state.tab = TAB_INICIAL[state.role];
    try { await cargar(); } catch { return logout(); }
  }
  render();
})();
 