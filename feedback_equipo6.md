# Feedback – Equipo 6: Sistema de Reportes Ciudadanos Geolocalizados
**Stack:** Node.js + Express + TypeScript · React Native Expo · PostgreSQL (Prisma ORM)  
**Fecha de revisión:** 22 de abril de 2025

---

## Resumen general

El equipo entrega un backend bien estructurado con una cobertura de dominio amplia y pensada: reportes ciudadanos con geolocalización, sistema de votos, historial de cambios de estado, alertas, fotos adjuntas y un índice IRSU. La arquitectura multicapas está bien aplicada y la lógica de negocio dentro de los services demuestra comprensión genuina de los conceptos del curso.

---

## Lo que están haciendo bien ✅

### Arquitectura multicapas consistente en todo el proyecto

Cada módulo sigue el mismo patrón de 3 capas con 5 archivos:

```
modulo/
  ├── modulo.router.ts      → capa de presentación: recibe HTTP, llama al service
  ├── modulo.service.ts     → capa de negocio: reglas, validaciones, orquestación
  ├── modulo.repository.ts  → capa de datos: queries con Prisma
  ├── modulo.schema.ts      → contratos de entrada (DTOs con Zod)
  └── modulo.types.ts       → tipos TypeScript del módulo
```

Esta consistencia es valiosa: cualquier desarrollador que entre al proyecto sabe exactamente dónde encontrar cada cosa en cualquier módulo. La arquitectura está presente y es uniforme — no solo en algunos módulos sino en los 12 módulos del sistema.

### DTOs con Zod como contratos de entrada

Los esquemas Zod (`CreateReporteInput`, `UpdateReporteInput`, `CambiarEstadoInput`, `FiltrosReporteInput`) definen con precisión qué datos acepta cada operación. Esto actúa como un contrato explícito: el service nunca recibe datos sin validar, y la API comunica claramente qué espera de los clientes.

### Lógica de negocio real y bien ubicada en los services

`reporte.service.ts` no es solo un puente de datos — contiene reglas de negocio reales y bien implementadas, todas en el lugar correcto (el service, no el router ni el repository):

- Verificar que la comunidad exista y esté activa antes de crear un reporte.
- Límite de 3 reportes diarios para usuarios anónimos por IP.
- Solo el autor puede editar o eliminar sus propios reportes.
- No se puede editar un reporte ya resuelto o rechazado.
- Solo coordinadores pueden cambiar estado, y solo dentro de su propia comunidad.

Esto es exactamente lo que se busca: reglas de dominio en la capa de negocio, no dispersas en el router o hardcodeadas en el repositorio.

### Control de acceso con middleware de autenticación doble

El diseño de tener `auth.middleware.ts` (autenticación obligatoria) y `optional-auth.middleware.ts` (autenticación opcional) es inteligente: permite que ciertos endpoints sirvan tanto a usuarios anónimos como autenticados con comportamiento diferente, sin duplicar lógica. El middleware opcional inyecta el usuario si el token está presente, o continúa sin él si no lo está.

### Swagger / OpenAPI configurado

La documentación de la API está disponible en `/api/docs` con `swagger-jsdoc`. Los comentarios JSDoc en los routers generan la documentación automáticamente. El `app.ts` muestra la configuración correcta del spec con `info`, `components` y `securitySchemes`.

### Manejo de errores consistente

Los errores se crean con `Object.assign(new Error(...), { statusCode: ... })` y el handler global al final del `app.ts` los captura y convierte en respuestas HTTP con el status code correcto. El cliente siempre recibe un objeto `{ error: message }` estructurado.

### Soft Delete con trazabilidad

El método `softDelete` en el repositorio de reportes marca el registro como eliminado en lugar de borrarlo físicamente. En un sistema ciudadano donde los reportes tienen valor histórico, esto es la decisión correcta. El módulo `reporte-historial` complementa esto registrando cada cambio de estado, creando un log de auditoría completo.

---

## Áreas de mejora 🔧

### README muy incompleto

El README actual solo tiene dos comandos: la migración de Prisma y el seed. No hay descripción del sistema, instrucciones para configurar las variables de entorno, cómo correr el backend, ni diagrama de arquitectura. Esto es el punto más crítico antes de la presentación porque es lo primero que cualquier evaluador abre.

### Ruta duplicada en `app.ts`

En el archivo `app.ts` el router de reportes está registrado dos veces:

```ts
app.use('/api/v1/reportes', reporteRouter);
// ... otras rutas ...
app.use('/api/v1/reportes', reporteRouter);  // ← duplicado
```

El primer registro siempre responde, por lo que el segundo nunca se alcanza. No rompe el sistema, pero es un descuido que cualquier revisor notará. Hay que eliminar la línea duplicada.

### El manejo de errores puede mejorar con una clase propia

El patrón actual `Object.assign(new Error(...), { statusCode: ... })` funciona, pero es frágil: no tiene tipo en TypeScript y requiere que cada desarrollador recuerde la misma sintaxis. Una clase propia es más clara y type-safe:

```ts
// src/lib/app-error.ts
export class AppError extends Error {
  constructor(
    public readonly statusCode: number,
    message: string
  ) {
    super(message);
    this.name = 'AppError';
  }
}
```

Y usarla así en cualquier service:

```ts
import { AppError } from '../lib/app-error';

throw new AppError(404, 'Reporte no encontrado');
throw new AppError(403, 'Solo puedes editar tus propios reportes');
```

El handler global queda igual pero con un `instanceof` más confiable:

```ts
app.use((err: any, _req, res, _next) => {
  const status  = err instanceof AppError ? err.statusCode : 500;
  const message = err.message || 'Error interno';
  res.status(status).json({ error: message });
});
```

### Sin diagrama de arquitectura

Dado que el sistema tiene muchos módulos con relaciones entre sí (reportes → fotos, reportes → votos, reportes → historial, comunidades → reportes → alertas → IRSU), un diagrama de capas o de módulos sería muy valioso tanto para la evaluación como para la presentación final.

---

## Calificación conceptual

| Criterio | Evaluación |
|---|---|
| Arquitectura multicapas | ✅ Excelente — uniforme en los 12 módulos |
| DTOs con Zod | ✅ Bien implementado |
| Lógica de negocio en el Service | ✅ Excelente — reglas reales bien ubicadas |
| Diseño RESTful | ✅ Bien aplicado |
| Control de acceso por roles | ✅ Bien pensado |
| Swagger / OpenAPI | ✅ Configurado |
| Manejo de errores | ✅ Consistente (mejorable con clase propia) |
| Soft Delete + Historial de auditoría | ✅ Buenas prácticas |
| README | ❌ Muy incompleto |
| Diagrama de arquitectura | ❌ No encontrado |
| Bug ruta duplicada | ⚠️ Debe corregirse |

---

## Recomendación final

El backend es de los más completos y mejor razonados del grupo. La lógica de negocio está bien ubicada y el dominio del problema está claramente comprendido. Lo que hace falta es documentación: README completo con instrucciones de ejecución y diagrama de arquitectura. Corrijan también la ruta duplicada antes de la presentación — es un detalle pequeño pero visible. Si la demo funciona end-to-end con el frontend móvil, tienen un proyecto muy sólido.

---

## Sugerencias adicionales de buenas prácticas

Estas son mejoras aplicables en el tiempo que queda, sin afectar la funcionalidad:

**1. Crear un archivo `.env.example` en el repositorio**
Agregar un archivo con los nombres de las variables necesarias (sin valores reales). Cualquier persona que clone el proyecto sabrá qué configurar:
```
DATABASE_URL=postgresql://user:password@localhost:5432/reportes_db
JWT_SECRET=your_secret_here
PORT=3000
```

**2. Agregar una constante para el límite de reportes anónimos**
En `reporte.service.ts` el valor `3` está hardcodeado como `const LIMITE_ANONIMO = 3`. Esto ya está bien hecho. Sugerencia adicional: moverlo a un archivo de configuración o leerlo desde una variable de entorno para poder cambiarlo sin tocar el código:
```ts
const LIMITE_ANONIMO = Number(process.env.LIMITE_REPORTES_ANONIMO ?? 3);
```

**3. Usar el tipo `void` en middlewares Express que no retornan nada**
En los routers, algunos handlers tienen el tipo de retorno implícito. Ser explícito con `Promise<void>` o `void` en los handlers que no retornan un valor mejora la claridad:
```ts
router.get('/', async (req: Request, res: Response): Promise<void> => {
  const reportes = await reporteService.getAll(...);
  res.json(reportes);
});
```

**4. Revisar que todos los módulos tengan índices de error HTTP consistentes**
Verificar que todos los services usen los mismos status codes para situaciones similares: `404` para "no encontrado", `403` para "sin permiso", `400` para "datos inválidos", `429` para "límite excedido". La consistencia en los códigos HTTP es parte del contrato de la API.

**5. Documentar el schema de Prisma con comentarios**
Los modelos del schema de Prisma pueden incluir comentarios que expliquen campos no obvios. Por ejemplo, qué significa `deviceIp`, cuándo se usa `deletedAt`, o cuáles son los posibles valores de `estado`. Esto hace el schema auto-documentado:
```prisma
model Reporte {
  id        Int      @id @default(autoincrement())
  estado    String   // PENDIENTE | EN_PROCESO | RESUELTO | RECHAZADO
  deviceIp  String?  // IP del dispositivo, solo para reportes anónimos
  deletedAt DateTime? // null si no ha sido eliminado (soft delete)
}
```
