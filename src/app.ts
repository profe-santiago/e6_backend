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

// Error handler global — Express 5 propaga async errors aquí automáticamente
app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  const status  = err.statusCode || 500;
  const message = err.message    || 'Error interno del servidor';
  res.status(status).json({ error: message });
});