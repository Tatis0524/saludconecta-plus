const express = require('express');
const session = require('express-session');
const bcrypt = require('bcryptjs');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Base de datos
const db = new sqlite3.Database(path.join(__dirname, 'database', 'db.sqlite'), (err) => {
  if (err) console.error('Error abriendo DB:', err);
  else console.log('✅ Base de datos conectada');
});

// Crear tablas
db.serialize(() => {
  db.run(`CREATE TABLE IF NOT EXISTS usuarios (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nombre TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS medicos (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nombre TEXT NOT NULL,
    especialidad TEXT NOT NULL,
    disponibilidad TEXT DEFAULT 'Disponible',
    rating REAL DEFAULT 4.5
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS citas (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    usuario_id INTEGER NOT NULL,
    medico_id INTEGER NOT NULL,
    fecha TEXT NOT NULL,
    hora TEXT NOT NULL,
    estado TEXT DEFAULT 'Confirmada',
    motivo TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (usuario_id) REFERENCES usuarios(id),
    FOREIGN KEY (medico_id) REFERENCES medicos(id)
  )`);

  // Insertar médicos si no existen
  db.get('SELECT COUNT(*) as count FROM medicos', (err, row) => {
    if (!err && row.count === 0) {
      const medicos = [
        ['Dr. Carlos Ramírez',   'Medicina General', 4.8],
        ['Dra. Ana Martínez',    'Cardiología',      4.9],
        ['Dr. Luis Herrera',     'Dermatología',     4.7],
        ['Dra. Sofia Gómez',     'Pediatría',        4.9],
        ['Dr. Miguel Torres',    'Neurología',       4.6],
        ['Dra. Laura Sánchez',   'Ginecología',      4.8],
        ['Dr. Ricardo Vega',     'Ortopedia',        4.5],
        ['Dra. Patricia Flores', 'Psiquiatría',      4.7],
      ];
      const stmt = db.prepare('INSERT INTO medicos (nombre, especialidad, rating) VALUES (?, ?, ?)');
      medicos.forEach(m => stmt.run(...m));
      stmt.finalize();
      console.log('✅ Médicos de prueba insertados');
    }
  });
});

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));
app.use(session({
  secret: 'saludconecta_secret_2024',
  resave: false,
  saveUninitialized: false,
  cookie: { secure: false, maxAge: 24 * 60 * 60 * 1000 }
}));

function requireAuth(req, res, next) {
  if (!req.session.userId) return res.status(401).json({ error: 'No autenticado' });
  next();
}

// ── REGISTRO ──────────────────────────────────────────────────
app.post('/api/register', async (req, res) => {
  const { nombre, email, password } = req.body;
  if (!nombre || !email || !password)
    return res.status(400).json({ error: 'Todos los campos son requeridos' });
  if (password.length < 6)
    return res.status(400).json({ error: 'La contraseña debe tener al menos 6 caracteres' });

  try {
    db.get('SELECT id FROM usuarios WHERE email = ?', [email], async (err, row) => {
      if (row) return res.status(409).json({ error: 'El correo ya está registrado' });
      const hash = await bcrypt.hash(password, 10);
      db.run('INSERT INTO usuarios (nombre, email, password) VALUES (?, ?, ?)',
        [nombre, email, hash],
        function(err) {
          if (err) return res.status(500).json({ error: 'Error al registrar' });
          req.session.userId   = this.lastID;
          req.session.userName = nombre;
          res.json({ success: true, nombre });
        }
      );
    });
  } catch (err) {
    res.status(500).json({ error: 'Error interno' });
  }
});

// ── LOGIN ─────────────────────────────────────────────────────
app.post('/api/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password)
    return res.status(400).json({ error: 'Ingresa email y contraseña' });

  db.get('SELECT * FROM usuarios WHERE email = ?', [email], async (err, usuario) => {
    if (!usuario) return res.status(401).json({ error: 'Credenciales incorrectas' });
    const match = await bcrypt.compare(password, usuario.password);
    if (!match)  return res.status(401).json({ error: 'Credenciales incorrectas' });
    req.session.userId   = usuario.id;
    req.session.userName = usuario.nombre;
    res.json({ success: true, nombre: usuario.nombre });
  });
});

// ── LOGOUT ────────────────────────────────────────────────────
app.post('/api/logout', (req, res) => {
  req.session.destroy();
  res.json({ success: true });
});

// ── SESIÓN ────────────────────────────────────────────────────
app.get('/api/session', (req, res) => {
  if (req.session.userId)
    res.json({ loggedIn: true, nombre: req.session.userName, id: req.session.userId });
  else
    res.json({ loggedIn: false });
});

// ── MÉDICOS ───────────────────────────────────────────────────
app.get('/api/medicos', requireAuth, (req, res) => {
  db.all('SELECT * FROM medicos', [], (err, rows) => {
    if (err) return res.status(500).json({ error: 'Error al obtener médicos' });
    res.json(rows);
  });
});

// ── AGENDAR CITA ──────────────────────────────────────────────
app.post('/api/citas', requireAuth, (req, res) => {
  const { medico_id, fecha, hora, motivo } = req.body;
  const usuario_id = req.session.userId;

  if (!medico_id || !fecha || !hora)
    return res.status(400).json({ error: 'Médico, fecha y hora son requeridos' });

  // Verificar conflicto de horario
  db.get(
    'SELECT id FROM citas WHERE medico_id = ? AND fecha = ? AND hora = ? AND estado != "Cancelada"',
    [medico_id, fecha, hora],
    (err, row) => {
      if (row) return res.status(409).json({ error: 'Ese horario ya está ocupado. Elige otro.' });

      db.run(
        'INSERT INTO citas (usuario_id, medico_id, fecha, hora, motivo) VALUES (?, ?, ?, ?, ?)',
        [usuario_id, medico_id, fecha, hora, motivo || ''],
        function(err) {
          if (err) {
            console.error('Error insertando cita:', err);
            return res.status(500).json({ error: 'Error al guardar la cita' });
          }
          res.json({ success: true, id: this.lastID, message: 'Cita agendada exitosamente' });
        }
      );
    }
  );
});

// ── VER CITAS ─────────────────────────────────────────────────
app.get('/api/citas', requireAuth, (req, res) => {
  db.all(`
    SELECT c.id, c.fecha, c.hora, c.estado, c.motivo, c.created_at,
           m.nombre AS medico_nombre, m.especialidad
    FROM citas c
    JOIN medicos m ON c.medico_id = m.id
    WHERE c.usuario_id = ?
    ORDER BY c.fecha DESC, c.hora DESC
  `, [req.session.userId], (err, rows) => {
    if (err) return res.status(500).json({ error: 'Error al obtener citas' });
    res.json(rows);
  });
});

// ── CANCELAR CITA ─────────────────────────────────────────────
app.put('/api/citas/:id/cancelar', requireAuth, (req, res) => {
  db.run(
    'UPDATE citas SET estado = "Cancelada" WHERE id = ? AND usuario_id = ?',
    [req.params.id, req.session.userId],
    (err) => {
      if (err) return res.status(500).json({ error: 'Error al cancelar' });
      res.json({ success: true });
    }
  );
});

// ── START ─────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`\n✅ SaludConecta+ corriendo en http://localhost:${PORT}\n`);
});
