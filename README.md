# Sistema de Reportes Ciudadanos Geolocalizados — Backend
 
API REST para la gestión de reportes ciudadanos con geolocalización, sistema de votos, historial de cambios de estado, alertas automáticas y el índice **IRSU** (Índice de Riesgo Social Urbano) por comunidad.
 
**Stack:** Node.js 22 · Express 5 · TypeScript · PostgreSQL · Prisma ORM · Zod · Vitest
 
---
 
## 🌐 Despliegue en producción
 
| Servicio | URL |
|---|---|
| API REST | `https://e6backend-production.up.railway.app` |
| Swagger UI | `https://e6backend-production.up.railway.app/api/docs` |
| Health check | `https://e6backend-production.up.railway.app/api/health` |
 
> El frontend React Native Expo se encuentra en un repositorio separado y se conecta a esta misma API.
 
---
 
## 📱 Frontend — React Native Expo
 
**Stack:** React Native · Expo Router · NativeWind · TanStack Query · Zustand · Zod
 
El frontend es una aplicación móvil multiplataforma (iOS, Android y Web) que consume esta API.
 
### Configuración
 
```bash
# En el .env del proyecto frontend:
EXPO_PUBLIC_API_URL=https://e6backend-production.up.railway.app/api/v1
```
 
### Pantallas por rol
 
| Rol | Pantallas disponibles |
|---|---|
| `USUARIO` | Reportes, Comunidades, Alertas, Perfil, Ranking |
| `COORDINADOR` | + Panel Admin (reportes, comunidades, alertas, cuadrillas) |
| `ADMIN` | + Gestión de cuadrillas y asignaciones |
| `SUPER_ADMIN` | Acceso total + recálculo IRSU global |
| `OPERADOR` | Solo pantalla de Cuadrillas (sus asignaciones) |
 
### Características principales
 
- Mapa de calor IRSU con marcadores por comunidad (React Native Maps en móvil, Leaflet en web)
- Formulario de reporte con GPS, cámara y galería
- Panel admin web con dashboard (gráfica IRSU temporal en SVG), gestión de reportes, comunidades, cuadrillas y alertas
- Autenticación persistente con Expo SecureStore (móvil) y localStorage (web)
- Soporte para usuarios anónimos (máx. 3 reportes/día/IP)
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
 
```bash
cp .env.example .env
```
 
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
| `LIMITE_REPORTES_ANONIMO` | Límite diario de reportes por IP anónima | `3` |
 
### 3. Crear la base de datos y ejecutar migraciones
 
```bash
npx prisma migrate dev --name irsu_inicial
```
 
### 4. Poblar la base de datos con datos geográficos
 
```bash
npm run seed
```
 
> El seed carga estados, municipios, comunidades y códigos postales de México (INEGI/SEPOMEX). Los archivos CSV/TXT deben estar en `prisma/data/`. El proceso puede tardar varios minutos por el volumen de códigos postales.
 
### 5. Crear el primer SUPER_ADMIN (opcional)
 
```bash
npm run create-superadmin
```
 
Crea el usuario `superadmin@irsu.mx` con contraseña `SuperAdmin2024!`.
 
---
 
## Ejecución
 
```bash
npm run dev       # Desarrollo con recarga automática
npm run build     # Compilar TypeScript → dist/
npm start         # Producción
```
 
---
 
## Docker
 
```bash
# Levantar backend + PostgreSQL
docker compose up --build
 
# Primera vez: cargar datos geográficos (tarda ~5-10 min)
SEED_DATA=true docker compose up --build
```
 
El `docker-entrypoint.sh` espera a que PostgreSQL esté disponible, aplica migraciones automáticamente y crea el SUPER_ADMIN antes de levantar el servidor.
 
---
 
## Tests
 
```bash
npm test                  # Todos los tests
npm run test:unit         # Solo unitarios
npm run test:integration  # Solo integración
npm run test:coverage     # Cobertura
```
 
| Suite | Ubicación | Descripción |
|---|---|---|
| Unitarios | `tests/unit/irsu.utils.test.ts` | 20 casos sobre la fórmula IRSU pura |
| Integración | `tests/integration/auth.test.ts` | Registro, login y validación de JWT |
| Integración | `tests/integration/reportes.test.ts` | CRUD de reportes, filtros y protección de endpoints |
 
---
 
## Arquitectura
 
El proyecto sigue una **arquitectura multicapas** uniforme en los 15 módulos del sistema.
 
### Diagrama de capas
 
```mermaid
flowchart LR
  C["Cliente HTTP\n(App / Web)"]
 
  subgraph MW["Middleware"]
    A["auth.middleware\n(JWT obligatorio)"]
    B["optional-auth.middleware\n(JWT opcional)"]
  end
 
  subgraph Módulo["Módulo (×15)"]
    R["router.ts\nPresentación"]
    S["service.ts\nNegocio"]
    Repo["repository.ts\nDatos"]
  end
 
  Z["Zod Schema\nValidación de entrada"]
  P["PrismaClient\n(Singleton)"]
  DB[("PostgreSQL")]
  EH["Error Handler Global\napp.ts"]
 
  C --> MW --> R
  R --> Z
  Z -->|válido| S
  Z -->|inválido| EH
  S --> Repo
  Repo --> P --> DB
  S -->|AppError| EH
```
 
### Estructura de cada módulo
 
```
modulo/
├── modulo.router.ts      → capa de presentación: recibe HTTP, llama al service
├── modulo.service.ts     → capa de negocio: reglas, validaciones, orquestación
├── modulo.repository.ts  → capa de datos: queries con Prisma
├── modulo.schema.ts      → contratos de entrada validados con Zod
└── modulo.types.ts       → interfaces TypeScript del módulo
```
 
### Módulos del sistema
 
```
src/
├── lib/
│   ├── prisma.ts                  → instancia singleton de PrismaClient
│   └── app-error.ts               → clase AppError (errores HTTP tipados)
├── middleware/
│   ├── auth.middleware.ts         → autenticación JWT obligatoria
│   ├── optional-auth.middleware.ts → autenticación JWT opcional
│   └── upload.ts                  → multer para fotos
├── config.ts                      → validación de variables de entorno con Zod
├── app.ts                         → configuración Express, rutas y error handler
├── server.ts                      → punto de entrada
│
├── auth/          → registro y login
├── estados/       → catálogo INEGI de estados
├── municipios/    → catálogo INEGI de municipios
├── codigo-postal/ → catálogo SEPOMEX de códigos postales
├── comunidades/   → comunidades geolocalizadas
├── usuarios/      → gestión de usuarios y roles
├── perfil/        → perfil y suscripciones a comunidades
├── reportes/      → reportes ciudadanos (núcleo del sistema)
├── reporte-fotos/ → fotos adjuntas a reportes
├── votos/         → sistema de votos en reportes
├── reporte-historial/ → log de auditoría de cambios de estado
├── alertas/       → alertas automáticas por nivel IRSU
├── irsu/          → motor de cálculo del índice IRSU
├── cuadrillas/    → cuadrillas de trabajo y asignaciones
└── ranking/       → ranking de ciudadanos por reportes
```
 
---
 
## Modelo de datos (ER)
 
```mermaid
erDiagram
  Estado ||--o{ Municipio : "tiene"
  Municipio ||--o{ CodigoPostal : "tiene"
  Municipio ||--o{ Comunidad : "agrupa"
  Municipio ||--o{ Usuario : "asignado"
  Municipio ||--o{ Cuadrilla : "opera en"
  CodigoPostal ||--o{ Comunidad : "referencia"
 
  Comunidad ||--o{ Usuario : "coordinador"
  Comunidad ||--o{ UsuarioComunidad : "suscripción"
  Comunidad ||--o{ Reporte : "recibe"
  Comunidad ||--o{ Alerta : "genera"
  Comunidad ||--o{ IrsuHistorial : "historial"
 
  Usuario ||--o{ UsuarioComunidad : "pertenece"
  Usuario ||--o{ Reporte : "crea"
  Usuario ||--o{ Voto : "emite"
  Usuario ||--o{ ReporteHistorial : "registra"
  Usuario ||--o{ Alerta : "asignado"
  Usuario ||--o{ AsignacionCuadrilla : "asigna"
 
  Reporte ||--o{ ReporteFoto : "tiene"
  Reporte ||--o{ Voto : "recibe"
  Reporte ||--o{ ReporteHistorial : "registra"
  Reporte ||--o{ AsignacionCuadrilla : "asignada a"
 
  Cuadrilla ||--o{ AsignacionCuadrilla : "ejecuta"
```
 
---
 
## Patrones de diseño
 
| Patrón | Ubicación | Justificación |
|---|---|---|
| **Repository Pattern** | `src/*/modulo.repository.ts` (×15) | Abstrae completamente el acceso a datos — el service nunca importa `@prisma/client` directamente. Permite cambiar el ORM sin tocar la lógica de negocio. |
| **Service Layer Pattern** | `src/*/modulo.service.ts` (×15) | Toda la lógica de negocio vive aquí: límite de reportes anónimos, control de comunidades activas, restricciones por rol. El router solo recibe, valida y delega. |
| **Singleton Pattern** | `src/lib/prisma.ts` | Una sola instancia de `PrismaClient` en toda la aplicación, evitando la saturación del pool de conexiones de PostgreSQL. |
| **Middleware Chain Pattern** | `src/middleware/auth.middleware.ts` + `optional-auth.middleware.ts` | Cadena de middlewares que prepara `req.user` antes de llegar al router. El middleware opcional permite que endpoints sirvan tanto a usuarios anónimos como autenticados sin duplicar lógica. |
| **Error Object Pattern** | `src/lib/app-error.ts` + handler en `app.ts` | `AppError` tipado con `statusCode` permite que cualquier capa del sistema lance errores que el handler global convierte en respuestas HTTP estructuradas. Express 5 propaga errores async automáticamente. |
| **Schema Validation Pattern** | `src/*/modulo.schema.ts` (×15) | Zod valida y transforma cada entrada antes de llegar al service. Si el body no cumple el contrato, se responde `400` sin que el service sea invocado nunca. |
| **Strategy Pattern** | `src/irsu/irsu.utils.ts` | Las funciones puras del cálculo IRSU (`calcularIrsu`, `calcularTendencia`, `calcularColor`) están separadas del service, son completamente testeables de forma aislada y podrían intercambiarse por otra fórmula sin tocar el resto del módulo. |
| **Rate Limiting por entidad** | `src/reportes/reporte.service.ts` + `src/middleware/optional-auth.middleware.ts` | Los usuarios anónimos tienen un límite configurable de reportes por día/IP (`LIMITE_REPORTES_ANONIMO`), aplicado en la capa de servicio antes de persistir. |
 
---
 
## Roles y permisos
 
| Rol | Alcance |
|---|---|
| `SUPER_ADMIN` | Acceso total al sistema |
| `ADMIN` | Gestión dentro de su municipio |
| `COORDINADOR` | Gestión dentro de su comunidad |
| `OPERADOR` | Solo ve y actualiza asignaciones de cuadrilla |
| `USUARIO` | Crear y gestionar sus propios reportes |
| Anónimo | Crear reportes (máx. `LIMITE_REPORTES_ANONIMO` por día/IP) |
 
---
 
## Autenticación
 
El sistema usa **JWT de corta duración + Refresh Token** almacenado en base de datos.
 
| Endpoint | Método | Auth | Descripción |
|---|---|---|---|
| `/api/v1/auth/register` | POST | No | Registro de ciudadano |
| `/api/v1/auth/login` | POST | No | Login — retorna `token` y `refreshToken` |
| `/api/v1/auth/refresh` | POST | No | Renueva el access token sin contraseña |
| `/api/v1/auth/logout` | POST | No | Revoca el refresh token |
 
### Flujo de tokens
 
```
Login → { token (JWT, 30min), refreshToken (UUID, 7 días) }
 
Token expirado → POST /auth/refresh → nuevo token + nuevo refreshToken
                                      (el anterior queda revocado — rotación)
 
Logout → POST /auth/logout → refreshToken revocado en BD
```
 
### Variables de entorno relacionadas
 
| Variable | Descripción | Ejemplo |
|---|---|---|
| `JWT_SECRET` | Clave para firmar los JWT | `clave_secreta_larga` |
| `JWT_EXPIRES_IN` | Duración del access token | `30m` |
| `REFRESH_TOKEN_EXPIRES_DAYS` | Duración del refresh token | `7` |
```
 
---

## Scripts disponibles
 
```bash
npm run dev               # Servidor en modo watch
npm run build             # Compila TypeScript → dist/
npm start                 # Ejecuta la versión compilada
npm run seed              # Carga datos geográficos en la BD
npm run create-superadmin # Crea usuario SUPER_ADMIN inicial
npm test                  # Ejecuta todos los tests con Vitest
npm run test:unit         # Solo tests unitarios
npm run test:integration  # Solo tests de integración
npm run test:coverage     # Cobertura de código
```
 
---
 
## Documentación de la API
 
- **Swagger UI:** `http://localhost:3000/api/docs` (local) · `https://e6backend-production.up.railway.app/api/docs` (producción)
- **Colección Postman:** ver archivo `IRSU_API.postman_collection.json` en la raíz del repositorio
- **Health check:** `GET /api/health`