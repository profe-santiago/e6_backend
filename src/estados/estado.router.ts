import { Router, Request, Response } from 'express';
import { estadoService } from './estado.service';
import { idParamSchema, claveEstadoSchema, nombreParamSchema } from './estado.schema';

export const estadoRouter = Router();

/**
 * @swagger
 * /api/v1/estados:
 *   get:
 *     summary: Listar todos los estados
 *     tags: [Estados]
 *     responses:
 *       200:
 *         description: Lista de estados ordenados por ID
 */
estadoRouter.get('/', async (_req: Request, res: Response) => {
  const estados = await estadoService.getAll();
  res.json(estados);
});

/**
 * @swagger
 * /api/v1/estados/id/{id}:
 *   get:
 *     summary: Obtener un estado por ID
 *     tags: [Estados]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         example: 20
 *     responses:
 *       200:
 *         description: Estado encontrado
 *       400:
 *         description: ID inválido
 *       404:
 *         description: Estado no encontrado
 */
estadoRouter.get('/id/:id', async (req: Request, res: Response) => {
  const parsed = idParamSchema.safeParse(req.params);
  if (!parsed.success) {
    res.status(400).json({ errors: parsed.error.flatten().fieldErrors });
    return;
  }
  const estado = await estadoService.getById(parsed.data.id);
  res.json(estado);
});

/**
 * @swagger
 * /api/v1/estados/clave/{clave}:
 *   get:
 *     summary: Obtener un estado por clave INEGI (2 dígitos)
 *     tags: [Estados]
 *     parameters:
 *       - in: path
 *         name: clave
 *         required: true
 *         schema:
 *           type: string
 *           minLength: 2
 *           maxLength: 2
 *         example: "20"
 *     responses:
 *       200:
 *         description: Estado encontrado
 *       400:
 *         description: Clave inválida
 *       404:
 *         description: Estado no encontrado
 */
estadoRouter.get('/clave/:clave', async (req: Request, res: Response) => {
  const parsed = claveEstadoSchema.safeParse(req.params);
  if (!parsed.success) {
    res.status(400).json({ errors: parsed.error.flatten().fieldErrors });
    return;
  }
  const estado = await estadoService.getByClave(parsed.data.clave);
  res.json(estado);
});

/**
 * @swagger
 * /api/v1/estados/nombre/{nombre}:
 *   get:
 *     summary: Obtener un estado por nombre (insensible a mayúsculas)
 *     tags: [Estados]
 *     parameters:
 *       - in: path
 *         name: nombre
 *         required: true
 *         schema:
 *           type: string
 *         example: "Oaxaca"
 *     responses:
 *       200:
 *         description: Estado encontrado
 *       400:
 *         description: Nombre inválido
 *       404:
 *         description: Estado no encontrado
 */
estadoRouter.get('/nombre/:nombre', async (req: Request, res: Response) => {
  const parsed = nombreParamSchema.safeParse(req.params);
  if (!parsed.success) {
    res.status(400).json({ errors: parsed.error.flatten().fieldErrors });
    return;
  }
  const estado = await estadoService.getByNombre(parsed.data.nombre);
  res.json(estado);
});

/**
 * @swagger
 * /api/v1/estados/{id}/municipios:
 *   get:
 *     summary: Listar todos los municipios de un estado
 *     tags: [Estados]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         example: 20
 *     responses:
 *       200:
 *         description: Lista de municipios del estado
 *       400:
 *         description: ID inválido
 *       404:
 *         description: Estado no encontrado
 */
estadoRouter.get('/:id/municipios', async (req: Request, res: Response) => {
  const parsed = idParamSchema.safeParse(req.params);
  if (!parsed.success) {
    res.status(400).json({ errors: parsed.error.flatten().fieldErrors });
    return;
  }
  const municipios = await estadoService.getMunicipiosByEstado(parsed.data.id);
  res.json(municipios);
});