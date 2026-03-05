// ── Utilidades ──────────────────────────────────────────────────────────────
function showToast(msg, type = 'info') {
  const c = document.getElementById('toastContainer');
  if (!c) return;
  const icons = { success: '✅', error: '❌', info: 'ℹ️' };
  const t = document.createElement('div');
  t.className = `toast ${type}`;
  t.innerHTML = `<span>${icons[type] || 'ℹ️'}</span><span>${msg}</span>`;
  c.appendChild(t);
  setTimeout(() => t.remove(), 3500);
}

function showError(msg) {
  const a = document.getElementById('alertError');
  const m = document.getElementById('errorMsg');
  if (a && m) { m.textContent = msg; a.classList.add('show'); }
}
function hideAlerts() {
  document.querySelectorAll('.alert').forEach(a => a.classList.remove('show'));
}

function setLoading(btnId, loading, text) {
  const btn = document.getElementById(btnId);
  if (!btn) return;
  btn.disabled = loading;
  btn.textContent = loading ? '⏳ Cargando...' : text;
}

// ── REGISTRO ─────────────────────────────────────────────────────────────────
async function handleRegister() {
  hideAlerts();
  const nombre   = document.getElementById('nombre')?.value.trim();
  const email    = document.getElementById('email')?.value.trim();
  const password = document.getElementById('password')?.value;
  const password2= document.getElementById('password2')?.value;

  if (!nombre || !email || !password || !password2) {
    return showError('Completa todos los campos');
  }
  if (!/\S+@\S+\.\S+/.test(email)) {
    return showError('Ingresa un correo válido');
  }
  if (password.length < 6) {
    return showError('La contraseña debe tener al menos 6 caracteres');
  }
  if (password !== password2) {
    return showError('Las contraseñas no coinciden');
  }

  setLoading('btnRegister', true, '🚀 Crear mi cuenta');
  try {
    const res = await fetch('/api/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nombre, email, password })
    });
    const data = await res.json();
    if (res.ok) {
      showToast('¡Cuenta creada exitosamente! Redirigiendo...', 'success');
      setTimeout(() => { window.location.href = '/dashboard.html'; }, 1200);
    } else {
      showError(data.error || 'Error al registrarse');
    }
  } catch {
    showError('Error de conexión. Verifica que el servidor esté corriendo.');
  } finally {
    setLoading('btnRegister', false, '🚀 Crear mi cuenta');
  }
}

// ── LOGIN ─────────────────────────────────────────────────────────────────────
async function handleLogin() {
  hideAlerts();
  const email    = document.getElementById('email')?.value.trim();
  const password = document.getElementById('password')?.value;

  if (!email || !password) {
    return showError('Ingresa tu correo y contraseña');
  }

  setLoading('btnLogin', true, '🔑 Iniciar sesión');
  try {
    const res = await fetch('/api/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });
    const data = await res.json();
    if (res.ok) {
      showToast(`¡Bienvenido, ${data.nombre}!`, 'success');
      setTimeout(() => { window.location.href = '/dashboard.html'; }, 1000);
    } else {
      showError(data.error || 'Credenciales incorrectas');
    }
  } catch {
    showError('Error de conexión. Verifica que el servidor esté corriendo.');
  } finally {
    setLoading('btnLogin', false, '🔑 Iniciar sesión');
  }
}

// ── LOGOUT ────────────────────────────────────────────────────────────────────
async function handleLogout() {
  await fetch('/api/logout', { method: 'POST' });
  window.location.href = '/login.html';
}

// Enter key support
document.addEventListener('keydown', e => {
  if (e.key !== 'Enter') return;
  if (document.getElementById('btnRegister')) handleRegister();
  if (document.getElementById('btnLogin'))    handleLogin();
});