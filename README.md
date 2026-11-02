# NGSOFT PQRS

Aplicativo web para la gestión de solicitudes, peticiones, quejas y reclamos (PQRS).
Universidad de Cartagena · Ingeniería de Software · INGSOFT 4_8

**Equipo:** Maira Llamas, Kevin Fernández, Andrés Acevedo, Moisés Mercado · **Docente:** Over Estrada Beltrán

## Tecnologías
Frontend: HTML5, CSS3, JavaScript · Backend: Node.js + Express (API REST) · Base de datos: MySQL 8
Seguridad: JWT, contraseñas con bcrypt, control de acceso por rol, consultas parametrizadas.

## Requisitos
- Node.js 18 o superior
- MySQL 8 (o XAMPP / MariaDB)
- VS Code (opcional, recomendado)

## Puesta en marcha
1. **Base de datos.** Crea el esquema (desde una terminal o desde MySQL Workbench):
   `mysql -u root -p < database/schema.sql`
2. **Configuración.** Copia `.env.example` como `.env` y ajusta `DB_PASSWORD` y `JWT_SECRET`.
3. **Dependencias.** En la carpeta del proyecto: `npm install`
4. **Datos de ejemplo.** `npm run seed` (crea usuarios, responsables y solicitudes de prueba).
5. **Servidor.** `npm start` (o `npm run dev` para reinicio automático) y abre http://localhost:3000

## Usuarios de demostración (clave `1234`)
| Rol | Correo | Permisos |
|---|---|---|
| Administrador | admin@pqrs.co | Todo: asignar, responder, estadísticas |
| Responsable | kevin@pqrs.co | Ve sus casos, cambia estados, responde |
| Usuario | laura@pqrs.co | Registra y consulta sus solicitudes |

## Estructura
```
ngsoft-pqrs/
├── database/schema.sql          Esquema MySQL (8 tablas) y catálogos
├── src/
│   ├── server.js                Servidor Express y manejo de errores
│   ├── db.js                    Pool de conexiones MySQL y transacciones
│   ├── seed.js                  Datos de demostración
│   ├── middleware/auth.js       JWT y control de acceso por rol
│   └── routes/                  auth, solicitudes, catálogos
└── public/                      Frontend (index.html, css/, js/)
```

## API REST
| Método | Ruta | Rol | Descripción |
|---|---|---|---|
| POST | /api/auth/login | Todos | Inicia sesión y devuelve el JWT |
| GET | /api/solicitudes | Autenticado | Lista las solicitudes visibles según el rol |
| POST | /api/solicitudes | Autenticado | Registra una solicitud |
| PUT | /api/solicitudes/:id/asignar | Administrador | Asigna un responsable |
| PUT | /api/solicitudes/:id/estado | Admin / Responsable | Cambia el estado |
| POST | /api/solicitudes/:id/respuesta | Admin / Responsable | Registra la respuesta |
| GET | /api/responsables | Autenticado | Catálogo de responsables |

## Requisitos cubiertos
RF01 registrar · RF02 clasificar · RF03 consultar · RF04 asignar · RF05 estados · RF06 respuestas ·
RF07 tiempos de atención · RF08 estadísticas · RF09 búsqueda · RF10 usuarios y roles.

## Notas
- Respecto al modelo de la Unidad 2 se añadió la columna `asunto` en `solicitudes` y la tabla `historial` (trazabilidad de cada caso).
- Mejora futura: límite de intentos de login, gestión de usuarios desde la interfaz y notificaciones.
