// Manejador asíncrono para rutas
const ah = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

// Generador de errores HTTP
const httpError = (status, message) => {
  const err = new Error(message);
  err.status = status;
  return err;
};

module.exports = { ah, httpError };