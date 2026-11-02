const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');
require('dotenv').config();

async function runSeed() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASS || ''
  });

  console.log('Creando base de datos e instalando tablas...');

  await connection.query(`CREATE DATABASE IF NOT EXISTS \`${process.env.DB_NAME || 'ngsoft_pqrs'}\``);
  await connection.query(`USE \`${process.env.DB_NAME || 'ngsoft_pqrs'}\``);

  await connection.query(`SET FOREIGN_KEY_CHECKS = 0`);
  await connection.query(`DROP TABLE IF EXISTS historial, solicitudes, responsables, estados, tipos_solicitud, usuarios, roles`);
  await connection.query(`SET FOREIGN_KEY_CHECKS = 1`);

  // Tablas Catálogo
  await connection.query(`
    CREATE TABLE roles (
      id_rol INT AUTO_INCREMENT PRIMARY KEY,
      nombre VARCHAR(50) NOT NULL
    )
  `);

  await connection.query(`
    CREATE TABLE tipos_solicitud (
      id_tipo INT AUTO_INCREMENT PRIMARY KEY,
      nombre VARCHAR(50) NOT NULL
    )
  `);

  await connection.query(`
    CREATE TABLE estados (
      id_estado INT AUTO_INCREMENT PRIMARY KEY,
      nombre VARCHAR(50) NOT NULL
    )
  `);

  // Usuarios y Responsables
  await connection.query(`
    CREATE TABLE usuarios (
      id_usuario INT AUTO_INCREMENT PRIMARY KEY,
      nombre VARCHAR(100) NOT NULL,
      correo VARCHAR(100) UNIQUE NOT NULL,
      contrasena VARCHAR(255) NOT NULL,
      id_rol INT NOT NULL,
      FOREIGN KEY (id_rol) REFERENCES roles(id_rol)
    )
  `);

  await connection.query(`
    CREATE TABLE responsables (
      id_responsable INT AUTO_INCREMENT PRIMARY KEY,
      nombre VARCHAR(100) NOT NULL,
      id_usuario INT UNIQUE,
      FOREIGN KEY (id_usuario) REFERENCES usuarios(id_usuario)
    )
  `);

  // Solicitudes e Historial
  await connection.query(`
    CREATE TABLE solicitudes (
      id_solicitud INT AUTO_INCREMENT PRIMARY KEY,
      asunto VARCHAR(150) NOT NULL,
      descripcion TEXT NOT NULL,
      fecha_recepcion DATETIME DEFAULT CURRENT_TIMESTAMP,
      id_tipo INT NOT NULL,
      id_estado INT DEFAULT 1,
      id_usuario INT NOT NULL,
      id_responsable INT,
      FOREIGN KEY (id_tipo) REFERENCES tipos_solicitud(id_tipo),
      FOREIGN KEY (id_estado) REFERENCES estados(id_estado),
      FOREIGN KEY (id_usuario) REFERENCES usuarios(id_usuario),
      FOREIGN KEY (id_responsable) REFERENCES responsables(id_responsable)
    )
  `);

  await connection.query(`
    CREATE TABLE historial (
      id_historial INT AUTO_INCREMENT PRIMARY KEY,
      id_solicitud INT NOT NULL,
      fecha DATETIME DEFAULT CURRENT_TIMESTAMP,
      detalle TEXT NOT NULL,
      FOREIGN KEY (id_solicitud) REFERENCES solicitudes(id_solicitud) ON DELETE CASCADE
    )
  `);

  // Inserción de Catálogos
  await connection.query(`INSERT INTO roles (id_rol, nombre) VALUES (1, 'Administrador'), (2, 'Responsable'), (3, 'Usuario')`);
  await connection.query(`INSERT INTO tipos_solicitud (id_tipo, nombre) VALUES (1, 'Petición'), (2, 'Queja'), (3, 'Reclamo'), (4, 'Sugerencia')`);
  await connection.query(`INSERT INTO estados (id_estado, nombre) VALUES (1, 'Pendiente'), (2, 'En Proceso'), (3, 'Resuelto'), (4, 'Cerrado')`);

  // Contraseña encriptada predeterminada para todos
  const passHash = await bcrypt.hash('1234', 10);

  // Inserción de Usuarios
  await connection.query(`
    INSERT INTO usuarios (id_usuario, nombre, correo, contrasena, id_rol) VALUES 
    (1, 'Admin General', 'admin@pqrs.co', '${passHash}', 1),
    (2, 'Kevin Fernández', 'kevin@pqrs.co', '${passHash}', 2),
    (3, 'Andrés Gómez', 'andres@pqrs.co', '${passHash}', 2),
    (4, 'Maira Rojas', 'maira@pqrs.co', '${passHash}', 2),
    (5, 'Moisés López', 'moises@pqrs.co', '${passHash}', 2),
    (6, 'Laura Usuario', 'laura@pqrs.co', '${passHash}', 3)
  `);

  // Inserción de Responsables
  await connection.query(`
    INSERT INTO responsables (id_responsable, nombre, id_usuario) VALUES 
    (1, 'Kevin (Peticiones)', 2),
    (2, 'Andrés (Quejas)', 3),
    (3, 'Maira (Reclamos)', 4),
    (4, 'Moisés (Sugerencias)', 5)
  `);

  // Datos Iniciales de PQRS
  await connection.query(`
    INSERT INTO solicitudes (asunto, descripcion, id_tipo, id_estado, id_usuario, id_responsable) VALUES 
    ('Solicitud de copia de contrato', 'Requiero copia del contrato de prestación de servicios.', 1, 1, 6, 1),
    ('Demora en la atención', 'El tiempo de respuesta del módulo de soporte supera las 48 horas.', 2, 1, 6, 2)
  `);

  console.log('¡Base de datos sembrada con éxito!');
  await connection.end();
}

runSeed().catch(err => {
  console.error('Error al ejecutar seed:', err);
  process.exit(1);
});