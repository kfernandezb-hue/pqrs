const router = require('express').Router();
const pool = require('../db');
const { ah } = require('../utils');

// GET /api/responsables
router.get('/', ah(async (req, res) => {
  const [rows] = await pool.query(
    'SELECT id_responsable AS id, nombre, area FROM responsables ORDER BY id_responsable'
  );
  res.json(rows);
}));

module.exports = router;
