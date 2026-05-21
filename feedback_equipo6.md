# Feedback – Equipo 6: Sistema de Reportes Ciudadanos Geolocalizados
**Stack:** Node.js + Express + TypeScript · React Native Expo · PostgreSQL (Prisma ORM)  
**Fecha de revisión:** 27 de abril de 2026 *(actualizado)*

---

## Resumen general

El equipo entrega un backend sólido con amplia cobertura de dominio: reportes ciudadanos con geolocalización, sistema de votos, historial de cambios de estado, alertas, fotos adjuntas e índice IRSU. En esta última entrega aplicaron varias de las mejoras sugeridas de forma correcta y completa, lo cual se valora positivamente.

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

Esta consistencia es uniforme en los 12 módulos del sistema.

### DTOs con Zod como contratos de entrada

Los esquemas Zod (`CreateReporteInput`, `UpdateReporteInput`, `CambiarEstadoInput`, `FiltrosReporteInput`) definen con precisión qué datos acepta cada operación. El service nunca recibe datos sin validar.

### Clase `AppError` implementada correctamente ✅ *(nuevo)*

Crearon `src/lib/app-error.ts` con una implementación sólida que incluye `Object.setPrototypeOf` para garantizar que `instanceof` funcione correctamente incluso con transpilación de TypeScript:

```ts
export class AppError extends Error {
  constructor(
    public readonly statusCode: number,
    message: string
  ) {
    super(message);
    this.name = 'AppError';
    Object.setPrototypeOf(this, AppError.prototype);
  }
}
```

Este detalle (`Object.setPrototypeOf`) es importante: sin él, `instanceof AppError` puede fallar en entornos donde TypeScript compila a ES5, ya que la cadena de prototipos no queda correctamente enlazada. Es una implementación de nivel profesional.

### Error handler global usa `instanceof` correctamente ✅ *(nuevo)*

El handler en `app.ts` ahora distingue entre errores controlados y no controlados usando `instanceof AppError`:

```ts
app.use((err: unknown, _req, res, _next) => {
  if (err instanceof AppError) {
    res.status(err.statusCode).json({ error: err.message });
    return;
  }
  const message = err instanceof Error ? err.message : 'Error interno del servidor';
  res.status(500).json({ error: message });
});
```

Esto es exactamente lo correcto: los errores de negocio (404, 403, 400, 429) se responden con su código preciso; cualquier otro error inesperado cae como 500.

### `AppError` integrada en el service ✅ *(nuevo)*

`reporte.service.ts` ya usa `AppError` de forma consistente en todos los casos:

```ts
throw new AppError(404, 'Reporte no encontrado');
throw new AppError(400, 'Solo se pueden crear reportes en comunidades activas');
throw new AppError(429, `Los usuarios anónimos tienen un límite de ${LIMITE_ANONIMO} reportes por día`);
throw new AppError(403, 'Solo puedes editar tus propios reportes');
```

### `LIMITE_ANONIMO` configurable desde variable de entorno ✅ *(nuevo)*

```ts
const LIMITE_ANONIMO = Number(process.env.LIMITE_REPORTES_ANONIMO ?? 3);
```

El valor ya no está hardcodeado — puede cambiarse sin tocar el código. El `?? 3` como fallback garantiza que el sistema funcione aunque la variable no esté definida.

### Bug de ruta duplicada corregido ✅ *(nuevo)*

El `app.ts` ya no tiene el router de reportes registrado dos veces. Las rutas están limpias y sin duplicados.

### Lógica de negocio real y bien ubicada en los services

`reporte.service.ts` contiene reglas de dominio reales en el lugar correcto: límite de reportes anónimos por IP, restricción de edición por autor y estado, cambio de estado restringido a coordinadores de la propia comunidad. Toda esta lógica está en el service, no en el router ni en el repository.

### Control de acceso con middleware de autenticación doble

`auth.middleware.ts` (autenticación obligatoria) y `optional-auth.middleware.ts` (autenticación opcional) permiten que ciertos endpoints sirvan tanto a usuarios anónimos como autenticados con comportamiento diferente sin duplicar lógica.

### Swagger / OpenAPI configurado

La documentación de la API está disponible en `/api/docs` con `swagger-jsdoc`. Los comentarios JSDoc en los routers generan la documentación automáticamente.

### Soft Delete con trazabilidad

`softDelete` marca el registro como eliminado en lugar de borrarlo físicamente. El módulo `reporte-historial` registra cada cambio de estado, creando un log de auditoría completo.

---

## Áreas de mejora 🔧

### README muy incompleto

El README sigue siendo el punto más crítico. No hay descripción del sistema, instrucciones de configuración ni diagrama de arquitectura. Antes de la presentación final deben tener al menos:
- Descripción del sistema y para qué sirve.
- Variables de entorno requeridas (puede ser un `.env.example` comentado).
- Instrucciones para correr el proyecto localmente.
- Diagrama de arquitectura (ver guía `guia_diagrama_arquitectura.md` en la carpeta del curso).

### Sin diagrama de arquitectura

El sistema tiene 12 módulos con relaciones entre sí. Un diagrama de capas mostrando los módulos principales y sus dependencias sería muy valioso para la presentación final.

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
| Clase `AppError` | ✅ Implementada correctamente con `setPrototypeOf` *(nuevo)* |
| Error handler con `instanceof` | ✅ Correcto *(nuevo)* |
| `LIMITE_ANONIMO` configurable | ✅ Desde variable de entorno *(nuevo)* |
| Bug ruta duplicada | ✅ Corregido *(nuevo)* |
| Soft Delete + Historial de auditoría | ✅ Buenas prácticas |
| README | ❌ Muy incompleto |
| Diagrama de arquitectura | ❌ No encontrado |

---

## Recomendación final

El equipo respondió al feedback anterior de forma completa y correcta: `AppError`, el error handler, el límite configurable y la ruta duplicada están todos resueltos. La implementación de `Object.setPrototypeOf` demuestra atención al detalle. Lo que queda es exclusivamente documentación: README con instrucciones y diagrama de arquitectura. Si eso está listo antes de la presentación, el proyecto está en muy buen estado.

---

## Sugerencias adicionales de buenas prácticas

**1. Agregar un archivo `.env.example` en el repositorio**
El servicio ya lee `LIMITE_REPORTES_ANONIMO` desde variables de entorno. Documentar todas las variables necesarias en un `.env.example`:
```
DATABASE_URL=postgresql://user:password@localhost:5432/reportes_db
JWT_SECRET=your_secret_here
PORT=3000
LIMITE_REPORTES_ANONIMO=3
```

**2. Usar el tipo `void` en handlers Express que no retornan nada**
Ser explícito con `Promise<void>` en los handlers mejora la legibilidad y ayuda a TypeScript a detectar retornos accidentales:
```ts
router.get('/', async (req: Request, res: Response): Promise<void> => {
  const reportes = await reporteService.getAll(...);
  res.json(reportes);
});
```

**3. Documentar el schema de Prisma con comentarios**
Los modelos pueden incluir comentarios que expliquen campos no obvios:
```prisma
model Reporte {
  id        Int       @id @default(autoincrement())
  estado    String    // PENDIENTE | EN_PROCESO | RESUELTO | RECHAZADO
  deviceIp  String?   // Solo para reportes anónimos (control de límite diario)
  deletedAt DateTime? // null = activo, non-null = soft deleted
}
```

**4. Verificar status codes consistentes en todos los módulos**
Con la clase `AppError` ya en su lugar, es buen momento para revisar que todos los módulos usen los mismos códigos para situaciones similares: `404` para "no encontrado", `403` para "sin permiso", `400` para "datos inválidos", `429` para "límite excedido".

**5. Agregar el campo `updatedAt` con `@updatedAt` en los modelos de Prisma**
Si no está ya, agregar `updatedAt DateTime @updatedAt` a los modelos principales permite saber cuándo fue la última modificación sin esfuerzo adicional — útil para el historial y para debugging.
