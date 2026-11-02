// Autenticación con JWT y control de acceso por rol (RNF01)
require('dotenv').config();
const jwt = require('jsonwebtoken');

exports.firmar = (payload) => jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '8h' });

exports.autenticar = (req, res, next) => {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return res.status(401).json({ error: 'Debes iniciar sesión.' });
  try {
    req.user = jwt.verify(token, process.env.JWT_SECRET); // { id, nombre, rol, rid }
    next();
  } catch {
    res.status(401).json({ error: 'Sesión inválida o expirada.' });
  }
};

/** Permite el paso solo a los roles indicados. */
exports.soloRoles = (...roles) => (req, res, next) =>
  roles.includes(req.user.rol) ? next() : res.status(403).json({ error: 'No tienes permiso para esta acción.' });
