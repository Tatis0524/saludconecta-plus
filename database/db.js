const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const DB_PATH = path.join(__dirname, 'db.sqlite');
const db = new sqlite3.Database(DB_PATH);

module.exports = db;

// Habilitar WAL para mejor performance
db.pragma('journal_mode = WAL');

// Crear tablas
db.exec(`
  CREATE TABLE IF NOT EXISTS usuarios (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nombre TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS medicos (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nombre TEXT NOT NULL,
    especialidad TEXT NOT NULL,
    disponibilidad TEXT DEFAULT 'Disponible',
    rating REAL DEFAULT 4.5,
    foto TEXT DEFAULT 'default'
  );

  CREATE TABLE IF NOT EXISTS citas (
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
  );
`);

// Insertar médicos demo si la tabla está vacía
const medicosCount = db.prepare('SELECT COUNT(*) as count FROM medicos').get();
if (medicosCount.count === 0) {
  const insertMedico = db.prepare(
    'INSERT INTO medicos (nombre, especialidad, rating) VALUES (?, ?, ?)'
  );
  const medicos = [
    ['Dr. Carlos Ramírez',    'Medicina General',   4.8],
    ['Dra. Ana Martínez',     'Cardiología',        4.9],
    ['Dr. Luis Herrera',      'Dermatología',       4.7],
    ['Dra. Sofia Gómez',      'Pediatría',          4.9],
    ['Dr. Miguel Torres',     'Neurología',         4.6],
    ['Dra. Laura Sánchez',    'Ginecología',        4.8],
    ['Dr. Ricardo Vega',      'Ortopedia',          4.5],
    ['Dra. Patricia Flores',  'Psiquiatría',        4.7],
  ];
  medicos.forEach(m => insertMedico.run(...m));
}

module.exports = db;