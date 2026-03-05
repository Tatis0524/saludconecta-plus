let medicosData  = [];
let selectedMedico = null;

// ── INIT ──────────────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', async () => {
  await checkSession();
  await Promise.all([loadMedicos(), loadCitas()]);
});

async function checkSession() {
  try {
    const res  = await fetch('/api/session');
    const data = await res.json();
    if (!data.loggedIn) {
      window.location.href = '/login.html';
      return;
    }
    const initial = data.nombre.charAt(0).toUpperCase();
    document.getElementById('navUserName').textContent      = data.nombre;
    document.getElementById('sidebarUserName').textContent  = data.nombre;
    document.getElementById('userAvatarLetter').textContent = initial;
  } catch {
    window.location.href = '/login.html';
  }
}

// ── TOAST ─────────────────────────────────────────────────────────────────────
function showToast(msg, type = 'info') {
  const c = document.getElementById('toastContainer');
  const icons = { success: '✅', error: '❌', info: 'ℹ️' };
  const t = document.createElement('div');
  t.className = `toast ${type}`;
  t.innerHTML = `<span>${icons[type]||'ℹ️'}</span><span>${msg}</span>`;
  c.appendChild(t);
  setTimeout(() => t.remove(), 3500);
}

// ── NAVEGACIÓN ────────────────────────────────────────────────────────────────
function showSection(name) {
  document.querySelectorAll('.tab-section').forEach(s => s.classList.remove('active'));
  document.querySelectorAll('.nav-item').forEach(b => b.classList.remove('active'));
  document.getElementById(`sec-${name}`)?.classList.add('active');
  document.querySelectorAll('.nav-item').forEach(b => {
    if (b.textContent.toLowerCase().includes(
      name === 'inicio' ? 'inicio' :
      name === 'medicos' ? 'médic' :
      name === 'citas'   ? 'citas' : 'triage'
    )) b.classList.add('active');
  });
  if (name === 'medicos' && medicosData.length === 0) loadMedicos();
  if (name === 'citas') loadCitas();
}

// ── MÉDICOS ───────────────────────────────────────────────────────────────────
async function loadMedicos() {
  try {
    const res    = await fetch('/api/medicos');
    medicosData  = await res.json();
    renderMedicos();
    document.getElementById('statMedicos').textContent = medicosData.length;
  } catch {
    document.getElementById('medicosGrid').innerHTML =
      '<p style="color:var(--danger)">Error al cargar médicos.</p>';
  }
}

const especialidadIcons = {
  'Medicina General': '🩺', 'Cardiología': '❤️', 'Dermatología': '🔬',
  'Pediatría': '👶',        'Neurología': '🧠',   'Ginecología': '🌸',
  'Ortopedia': '🦴',        'Psiquiatría': '🧬'
};

function renderMedicos() {
  const grid = document.getElementById('medicosGrid');
  if (!medicosData.length) {
    grid.innerHTML = '<p>No hay médicos disponibles.</p>';
    return;
  }
  grid.innerHTML = medicosData.map(m => `
    <div class="medico-card">
      <div class="medico-rating">⭐ ${m.rating}</div>
      <div class="medico-header">
        <div class="medico-avatar">${especialidadIcons[m.especialidad] || '👨‍⚕️'}</div>
        <div>
          <div class="medico-name">${m.nombre}</div>
          <div class="medico-spec">${m.especialidad}</div>
        </div>
      </div>
      <div class="medico-disponible">
        <span class="disponible-dot"></span> Disponible hoy
      </div>
      <button class="btn btn-primary btn-sm"
              style="width:100%;justify-content:center;margin-top:1rem;"
              onclick="openModal(${m.id}, '${m.nombre}', '${m.especialidad}')">
        📅 Agendar cita
      </button>
    </div>
  `).join('');
}

// ── MODAL CITA ────────────────────────────────────────────────────────────────
function openModal(medicoId, nombre, especialidad) {
  selectedMedico = medicoId;
  document.getElementById('modalMedicoNombre').textContent = `${nombre} · ${especialidad}`;
  // Fecha mínima = hoy
  const today = new Date().toISOString().split('T')[0];
  document.getElementById('citaFecha').min = today;
  document.getElementById('citaFecha').value = today;
  document.getElementById('citaHora').value = '';
  document.getElementById('citaMotivo').value = '';
  document.getElementById('modalError').classList.remove('show');
  document.getElementById('modalCita').classList.add('show');
}

function closeModal() {
  document.getElementById('modalCita').classList.remove('show');
  selectedMedico = null;
}

// Cerrar modal al hacer click en overlay
document.getElementById('modalCita').addEventListener('click', function(e) {
  if (e.target === this) closeModal();
});

async function confirmarCita() {
  const fecha  = document.getElementById('citaFecha').value;
  const hora   = document.getElementById('citaHora').value;
  const motivo = document.getElementById('citaMotivo').value.trim();
  const errEl  = document.getElementById('modalError');
  const errMsg = document.getElementById('modalErrorMsg');

  errEl.classList.remove('show');

  if (!fecha) {
    errMsg.textContent = 'Selecciona una fecha';
    errEl.classList.add('show');
    return;
  }
  if (!hora) {
    errMsg.textContent = 'Selecciona un horario';
    errEl.classList.add('show');
    return;
  }

  const btn = document.getElementById('btnConfirmar');
  btn.disabled = true;
  btn.textContent = '⏳ Guardando...';

  try {
    const res  = await fetch('/api/citas', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ medico_id: selectedMedico, fecha, hora, motivo })
    });
    const data = await res.json();
    if (res.ok) {
      closeModal();
      showToast('¡Cita agendada exitosamente! ✅', 'success');
      await loadCitas();
      showSection('citas');
    } else {
      errMsg.textContent = data.error;
      errEl.classList.add('show');
    }
  } catch {
    errMsg.textContent = 'Error de conexión';
    errEl.classList.add('show');
  } finally {
    btn.disabled = false;
    btn.textContent = '✅ Confirmar cita';
  }
}

// ── CITAS ─────────────────────────────────────────────────────────────────────
async function loadCitas() {
  try {
    const res   = await fetch('/api/citas');
    const citas = await res.json();
    renderCitas(citas, 'citasList');
    renderCitas(citas.slice(0, 3), 'proximasCitas');

    const total       = citas.length;
    const confirmadas = citas.filter(c => c.estado === 'Confirmada').length;
    document.getElementById('statTotal').textContent       = total;
    document.getElementById('statConfirmadas').textContent = confirmadas;
  } catch {
    document.getElementById('citasList').innerHTML =
      '<p style="padding:1rem;color:var(--danger)">Error al cargar citas.</p>';
  }
}

function renderCitas(citas, containerId) {
  const el = document.getElementById(containerId);
  if (!el) return;
  if (!citas || citas.length === 0) {
    el.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">📅</div>
        <p>No tienes citas agendadas aún</p>
        <button class="btn btn-primary btn-sm" style="margin-top:1rem"
                onclick="showSection('medicos')">Agendar primera cita</button>
      </div>`;
    return;
  }
  el.innerHTML = citas.map(c => {
    const icon  = especialidadIcons[c.especialidad] || '👨‍⚕️';
    const badge = c.estado === 'Confirmada'
      ? 'badge-success' : c.estado === 'Cancelada'
      ? 'badge-danger'  : 'badge-warning';
    const fechaFmt = new Date(c.fecha + 'T12:00:00').toLocaleDateString('es-CO', {
      weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
    });
    return `
      <div class="cita-item">
        <div class="cita-icon">${icon}</div>
        <div class="cita-info">
          <div class="cita-medico">${c.medico_nombre}</div>
          <div class="cita-spec">${c.especialidad}</div>
          <div class="cita-datetime">
            <span class="cita-fecha">📅 ${fechaFmt}</span>
            <span class="cita-hora">🕐 ${c.hora}</span>
            ${c.motivo ? `<span>📝 ${c.motivo}</span>` : ''}
          </div>
        </div>
        <div style="display:flex;flex-direction:column;align-items:flex-end;gap:.5rem;">
          <span class="badge ${badge}">${c.estado}</span>
          ${c.estado !== 'Cancelada' ? `
            <button class="btn btn-ghost btn-sm"
                    onclick="cancelarCita(${c.id})"
                    style="color:var(--danger);font-size:.75rem;">
              🗑 Cancelar
            </button>` : ''}
        </div>
      </div>`;
  }).join('');
}

async function cancelarCita(id) {
  if (!confirm('¿Seguro que deseas cancelar esta cita?')) return;
  try {
    await fetch(`/api/citas/${id}/cancelar`, { method: 'PUT' });
    showToast('Cita cancelada', 'info');
    await loadCitas();
  } catch {
    showToast('Error al cancelar', 'error');
  }
}

async function handleLogout() {
  await fetch('/api/logout', { method: 'POST' });
  window.location.href = '/login.html';
}