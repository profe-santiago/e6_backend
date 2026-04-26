# Sistema de Reportes Ciudadanos Geolocalizados — Backend

API REST para la gestión de reportes ciudadanos con geolocalización, sistema de votos, historial de cambios de estado, alertas automáticas y el índice **IRSU** (Índice de Riesgo Social Urbano) por comunidad.

**Stack:** Node.js · Express 5 · TypeScript · PostgreSQL · Prisma ORM · Zod

---

## Requisitos

- Node.js 22+
- PostgreSQL 14+
- npm 9+

---

## Instalación y configuración

### 1. Clonar el repositorio

```bash
git clone https://github.com/KyriuxDev/e6_backend.git
cd e6_backend
npm install
```

### 2. Configurar variables de entorno

Copia el archivo de ejemplo y rellena los valores:

```bash
cp .env.example .env
```

Variables requeridas:

| Variable | Descripción | Ejemplo |
|---|---|---|
| `DATABASE_URL` | Cadena de conexión PostgreSQL | `postgresql://user:pass@localhost:5432/irsu_db` |
| `JWT_SECRET` | Clave secreta para firmar JWT | `mi_clave_super_secreta_1234567890ab` |
| `JWT_EXPIRES_IN` | Duración del token JWT | `7d` |
| `PORT` | Puerto del servidor | `3000` |
| `NODE_ENV` | Entorno de ejecución | `development` |
| `APP_NAME` | Nombre de la API (Swagger) | `API IRSU` |
| `APP_DESCRIPTION` | Descripción (Swagger) | `Reportes ciudadanos` |
| `APP_VERSION` | Versión (Swagger) | `1.0.0` |
| `LIMITE_REPORTES_ANONIMO` | Límite diario de reportes por IP anónima (opcional, default: 3) | `3` |

### 3. Crear la base de datos y ejecutar migraciones

```bash
npx prisma migrate dev --name irsu_inicial
```

### 4. Poblar la base de datos con datos geográficos

Carga estados, municipios, comunidades y códigos postales de México:

```bash
npm run seed
```

> El seed espera los archivos CSV/TXT en `prisma/data/`. El proceso puede tardar varios minutos por el volumen de códigos postales.

### 5. Crear el primer SUPER_ADMIN (opcional)

```bash
npm run create-superadmin
```

Crea el usuario `superadmin@irsu.mx` con contraseña `SuperAdmin2024!`. **Cámbiala antes de producción.**

---

## Ejecución

### Modo desarrollo (con recarga automática)

```bash
npm run dev
```

### Modo producción

```bash
npm run build
npm start
```

El servidor arranca en `http://localhost:PORT`.

---

## Documentación de la API

Swagger UI disponible en:

```
http://localhost:3000/api/docs
```

Health check:

```
GET http://localhost:3000/api/health
```

---

## Arquitectura

El proyecto sigue una arquitectura multicapas uniforme en los 12 módulos del sistema:

```
src/
├── lib/
│   ├── prisma.ts          → instancia singleton de PrismaClient
│   └── app-error.ts       → clase AppError (errores HTTP tipados)
├── middleware/
│   ├── auth.middleware.ts          → autenticación JWT obligatoria
│   └── optional-auth.middleware.ts → autenticación JWT opcional
├── config.ts              → validación de variables de entorno con Zod
├── app.ts                 → configuración Express, rutas y error handler global
├── server.ts              → punto de entrada
│
├── auth/                  → registro y login
├── estados/               → catálogo INEGI de estados
├── municipios/            → catálogo INEGI de municipios
├── codigo-postal/         → catálogo SEPOMEX de códigos postales
├── comunidades/           → comunidades geolocalizadas
├── usuarios/              → gestión de usuarios y roles
├── reportes/              → reportes ciudadanos (núcleo del sistema)
├── reporte-fotos/         → fotos adjuntas a reportes
├── votos/                 → sistema de votos en reportes
├── reporte-historial/     → log de auditoría de cambios de estado
├── alertas/               → alertas automáticas por nivel IRSU
└── irsu/                  → motor de cálculo del índice IRSU
```

Cada módulo tiene exactamente 5 archivos:

```
modulo/
├── modulo.router.ts      → capa de presentación: recibe HTTP, llama al service
├── modulo.service.ts     → capa de negocio: reglas, validaciones, orquestación
├── modulo.repository.ts  → capa de datos: queries con Prisma
├── modulo.schema.ts      → contratos de entrada validados con Zod
└── modulo.types.ts       → interfaces TypeScript del módulo
```

### Flujo de una petición

```
Cliente HTTP
    ↓
Router       → valida params/body con Zod → 400 si inválido
    ↓
Service      → reglas de negocio, control de acceso, orquesta repos
    ↓
Repository   → queries Prisma contra PostgreSQL
    ↓
Error handler global (app.ts) → captura AppError y errores no controlados
```

### Roles y permisos

| Rol | Alcance |
|---|---|
| `SUPER_ADMIN` | Acceso total al sistema |
| `ADMIN` | Gestión dentro de su municipio |
| `COORDINADOR` | Gestión dentro de su comunidad |
| `USUARIO` | Crear y gestionar sus propios reportes |
| Anónimo | Crear reportes (máx. `LIMITE_REPORTES_ANONIMO` por día/IP) |

---

## Scripts disponibles

```bash
npm run dev              # Servidor en modo watch
npm run build            # Compila TypeScript → dist/
npm start                # Ejecuta la versión compilada
npm run seed             # Carga datos geográficos en la BD
npm run create-superadmin # Crea usuario SUPER_ADMIN inicial
```