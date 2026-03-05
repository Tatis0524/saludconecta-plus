const SINTOMAS = [
  { id: 'fiebre',       label: '🌡️ Fiebre alta (>38.5°C)', nivel: 3 },
  { id: 'dolor_pecho',  label: '💔 Dolor en el pecho',      nivel: 5 },
  { id: 'dificultad',   label: '😮‍💨 Dificultad para respirar', nivel: 5 },
  { id: 'cefalea',      label: '🤕 Dolor de cabeza intenso', nivel: 3 },
  { id: 'nausea',       label: '🤢 Náuseas / vómitos',       nivel: 2 },
  { id: 'tos',          label: '😷 Tos persistente',         nivel: 2 },
  { id: 'mareo',        label: '😵 Mareo o desmayo',         nivel: 3 },
  { id: 'dolor_abdomen',label: '🫄 Dolor abdominal fuerte',  nivel: 4 },
  { id: 'entumecimiento',label:'🦾 Entumecimiento / parálisis',nivel: 5 },
  { id: 'sangrado',     label: '🩸 Sangrado inusual',        nivel: 4 },
  { id: 'cansancio',    label: '😴 Cansancio extremo',       nivel: 2 },
  { id: 'confusion',    label: '😵‍💫 Confusión / desorientación', nivel: 5 },
];

// Renderizar checkboxes
document.addEventListener('DOMContentLoaded', () => {
  const grid = document.getElementById('sintomasGrid');
  if (!grid) return;
  grid.innerHTML = SINTOMAS.map(s => `
    <label class="sintoma-label" id="lbl-${s.id}">
      <input type="checkbox" id="s-${s.id}" value="${s.id}"
             onchange="toggleSintoma('${s.id}')">
      ${s.label}
    </label>
  `).join('');
});

function toggleSintoma(id) {
  const cb  = document.getElementById(`s-${id}`);
  const lbl = document.getElementById(`lbl-${id}`);
  lbl.classList.toggle('checked', cb.checked);
}

function evaluarTriage() {
  const seleccionados = SINTOMAS.filter(s =>
    document.getElementById(`s-${s.id}`)?.checked
  );

  const result = document.getElementById('triageResult');

  if (seleccionados.length === 0) {
    result.className = 'triage-result show';
    result.style.borderColor = 'var(--gray-400)';
    document.getElementById('triageNivel').textContent        = '⚠️ Sin síntomas seleccionados';
    document.getElementById('triageRecomendacion').textContent = 'Por favor selecciona al menos un síntoma.';
    document.getElementById('triageDetalle').textContent      = '';
    document.getElementById('triageAccion').innerHTML         = '';
    return;
  }

  const maxNivel = Math.max(...seleccionados.map(s => s.nivel));
  const sintomasTexto = seleccionados.map(s => s.label.split(' ').slice(1).join(' ')).join(', ');

  let nivel, titulo, detalle, accion, clase;

  if (maxNivel >= 5) {
    clase  = 'urgente';
    nivel  = '🚨 URGENCIA ALTA';
    titulo = 'Busca atención médica inmediata';
    detalle = `Tienes síntomas que pueden indicar una condición grave: ${sintomasTexto}. No esperes y acude a urgencias o llama a emergencias.`;
    accion  = `<button class="btn btn-danger btn-sm" onclick="alert('Llama al 123 o acude a urgencias')">
                 🚑 Ver centros de urgencias
               </button>`;
  } else if (maxNivel >= 3) {
    clase  = 'moderado';
    nivel  = '⚠️ NIVEL MODERADO';
    titulo = 'Consulta médica recomendada pronto';
    detalle = `Tus síntomas (${sintomasTexto}) requieren evaluación médica. Agenda una cita en las próximas 24-48 horas.`;
    accion  = `<button class="btn btn-primary btn-sm" onclick="showSection('medicos')">
                 📅 Agendar cita ahora
               </button>`;
  } else {
    clase  = 'leve';
    nivel  = '✅ NIVEL LEVE';
    titulo = 'Síntomas leves — monitoreo en casa';
    detalle = `Tus síntomas (${sintomasTexto}) son de baja gravedad. Descansa, mantén hidratación adecuada y monitorea tu evolución. Si empeoran, consulta un médico.`;
    accion  = `<button class="btn btn-success btn-sm" onclick="showSection('medicos')">
                 👨‍⚕️ Consultar de todas formas
               </button>`;
  }

  result.className = `triage-result show ${clase}`;
  document.getElementById('triageNivel').textContent         = nivel;
  document.getElementById('triageRecomendacion').textContent = titulo;
  document.getElementById('triageDetalle').textContent       = detalle;
  document.getElementById('triageAccion').innerHTML          = accion;
}

function limpiarTriage() {
  SINTOMAS.forEach(s => {
    const cb  = document.getElementById(`s-${s.id}`);
    const lbl = document.getElementById(`lbl-${s.id}`);
    if (cb)  cb.checked = false;
    if (lbl) lbl.classList.remove('checked');
  });
  document.getElementById('triageResult').className = 'triage-result';
}