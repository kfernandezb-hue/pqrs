const express = require('express');
const router = express.Router();
const pool = require('../db');
const { ah } = require('../utils');

const RESPONSABLE_POR_TIPO = { 1: 1, 2: 2, 3: 3, 4: 4 };

// GET /api/solicitudes
router.get('/', ah(async (req, res) => {
  let user = { id_usuario: null, rol: 'Administrador', rid: null };

  const authHeader = req.headers.authorization || '';
  const token = authHeader.replace('Bearer ', '').trim();

  if (token) {
    try {
      user = JSON.parse(Buffer.from(token, 'base64').toString('utf-8'));
    } catch (e) {}
  }

  let query = `
    SELECT 
      s.id_solicitud,
      s.asunto,
      s.descripcion,
      s.fecha_recepcion,
      t.nombre AS tipo,
      e.nombre AS estado,
      u.nombre AS usuario_nombre,
      r.nombre AS responsable_nombre
    FROM solicitudes s
    LEFT JOIN tipos_solicitud t ON s.id_tipo = t.id_tipo
    LEFT JOIN estados e ON s.id_estado = e.id_estado
    LEFT JOIN usuarios u ON s.id_usuario = u.id_usuario
    LEFT JOIN responsables r ON s.id_responsable = r.id_responsable
  `;
  const params = [];

  if (user.rol === 'Usuario' && user.id_usuario) {
    query += ` WHERE s.id_usuario = ?`;
    params.push(user.id_usuario);
  } else if (user.rol === 'Responsable' && user.rid) {
    query += ` WHERE s.id_responsable = ?`;
    params.push(user.rid);
  }

  query += ` ORDER BY s.id_solicitud DESC`;

  const [rows] = await pool.query(query, params);
  res.json(rows);
}));

// POST /api/solicitudes
router.post('/', ah(async (req, res) => {
  const { asunto, descripcion, id_tipo } = req.body;
  if (!asunto || !descripcion || !id_tipo) {
    return res.status(400).json({ error: 'Todos los campos son requeridos.' });
  }

  let userId = 1;
  const authHeader = req.headers.authorization || '';
  const token = authHeader.replace('Bearer ', '').trim();
  if (token) {
    try {
      const parsed = JSON.parse(Buffer.from(token, 'base64').toString('utf-8'));
      if (parsed.id_usuario) userId = parsed.id_usuario;
    } catch (e) {}
  }

  const id_responsable = RESPONSABLE_POR_TIPO[id_tipo] || null;

  const [resInsert] = await pool.query(
    `INSERT INTO solicitudes (asunto, descripcion, id_tipo, id_estado, id_usuario, id_responsable) 
     VALUES (?, ?, ?, 1, ?, ?)`,
    [asunto, descripcion, id_tipo, userId, id_responsable]
  );

  res.json({ ok: true, id: resInsert.insertId, mensaje: 'Solicitud radicada con éxito.' });
}));

module.exports = router;