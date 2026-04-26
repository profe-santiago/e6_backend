import express from 'express';
import cors from 'cors';
import swaggerUi from 'swagger-ui-express';
import swaggerJsdoc from 'swagger-jsdoc';
import { config } from './config';
import { authRouter } from './auth/auth.router';
import { optionalAuth } from './middleware/optional-auth.middleware';
import { estadoRouter } from './estados/estado.router';
import { municipioRouter } from './municipios/municipio.router';
import { codigoPostalRouter } from './codigo-postal/codigo-postal.router';
import { comunidadRouter } from './comunidades/comunidad.router';
import { usuarioRouter } from './usuarios/usuario.router';
import { reporteRouter } from './reportes/reporte.router';
import { reporteFotoRouter } from './reporte-fotos/reporte-foto.router';
import { votoRouter } from './votos/voto.router';
import { reporteHistorialRouter } from './reporte-historial/reporte-historial.router';
import { alertaRouter } from './alertas/alerta.router';
import { irsuRouter } from './irsu/irsu.router';
import { AppError } from './lib/app-error';


export const app = express();

app.use(cors());
app.use(express.json());

const swaggerSpec = swaggerJsdoc({
  definition: {
    openapi: '3.0.0',
    info: { title: config.APP_NAME, description: config.APP_DESCRIPTION, version: config.APP_VERSION },
    components: {
      securitySchemes: {
        bearerAuth: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
      },
    },
  },
  apis: ['./src/**/*.router.ts'],
});

app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));
app.get('/api/health', (_req, res) => { res.json({ status: 'ok' }); });
app.use(optionalAuth);

// Routers
app.use('/api/v1/auth', authRouter);
app.use('/api/v1/estados', estadoRouter);
app.use('/api/v1/municipios', municipioRouter);
app.use('/api/v1/codigos-postales', codigoPostalRouter);
app.use('/api/v1/comunidades', comunidadRouter);
app.use('/api/v1/usuarios', usuarioRouter);
app.use('/api/v1/alertas', alertaRouter);
app.use('/api/v1/irsu', irsuRouter);;
app.use('/api/v1/reportes', reporteRouter)
app.use('/api/v1/reportes/:reporteId/fotos', reporteFotoRouter);
app.use('/api/v1/reportes/:reporteId/votos', votoRouter);
app.use('/api/v1/reportes/:reporteId/historial', reporteHistorialRouter);

// Error handler global — Express 5 propaga async errors aquí automáticamente
app.use((err: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  if (err instanceof AppError) {
    res.status(err.statusCode).json({ error: err.message });
    return;
  }
  // Errores no controlados
  const message = err instanceof Error ? err.message : 'Error interno del servidor';
  res.status(500).json({ error: message });
});