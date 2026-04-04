import { Router, Request, Response } from 'express';
import { municipioService } from './municipio.service';
import { idParamSchema, claveMunicipioSchema, nombreParamSchema } from './municipio.schema';

export const municipioRouter = Router();

/**
 * @swagger
 * /api/v1/municipios:
 *   get:
 *     summary: Listar todos los municipios
 *     tags: [Municipios]
 *     responses:
 *       200:
 *         description: Lista de municipios ordenados por ID
 */
municipioRouter.get('/', async (_req: Request, res: Response) => {
  const municipios = await municipioService.getAll();
  res.json(municipios);
});

/**
 * @swagger
 * /api/v1/municipios/id/{id}:
 *   get:
 *     summary: Obtener un municipio por ID
 *     tags: [Municipios]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         example: 1
 *     responses:
 *       200:
 *         description: Municipio encontrado
 *       400:
 *         description: ID inválido
 *       404:
 *         description: Municipio no encontrado
 */
municipioRouter.get('/id/:id', async (req: Request, res: Response) => {
  const parsed = idParamSchema.safeParse(req.params);
  if (!parsed.success) {
    res.status(400).json({ errors: parsed.error.flatten().fieldErrors });
    return;
  }
  const municipio = await municipioService.getById(parsed.data.id);
  res.json(municipio);
});

/**
 * @swagger
 * /api/v1/municipios/clave/{clave}:
 *   get:
 *     summary: Obtener un municipio por clave INEGI (5 dígitos)
 *     tags: [Municipios]
 *     parameters:
 *       - in: path
 *         name: clave
 *         required: true
 *         schema:
 *           type: string
 *           minLength: 5
 *           maxLength: 5
 *         example: "20067"
 *     responses:
 *       200:
 *         description: Municipio encontrado
 *       400:
 *         description: Clave inválida
 *       404:
 *         description: Municipio no encontrado
 */
municipioRouter.get('/clave/:clave', async (req: Request, res: Response) => {
  const parsed = claveMunicipioSchema.safeParse(req.params);
  if (!parsed.success) {
    res.status(400).json({ errors: parsed.error.flatten().fieldErrors });
    return;
  }
  const municipio = await municipioService.getByClave(parsed.data.clave);
  res.json(municipio);
});

/**
 * @swagger
 * /api/v1/municipios/nombre/{nombre}:
 *   get:
 *     summary: Obtener un municipio por nombre (insensible a mayúsculas)
 *     tags: [Municipios]
 *     parameters:
 *       - in: path
 *         name: nombre
 *         required: true
 *         schema:
 *           type: string
 *         example: "Oaxaca de Juárez"
 *     responses:
 *       200:
 *         description: Municipio encontrado
 *       400:
 *         description: Nombre inválido
 *       404:
 *         description: Municipio no encontrado
 */
municipioRouter.get('/nombre/:nombre', async (req: Request, res: Response) => {
  const parsed = nombreParamSchema.safeParse(req.params);
  if (!parsed.success) {
    res.status(400).json({ errors: parsed.error.flatten().fieldErrors });
    return;
  }
  const municipio = await municipioService.getByNombre(parsed.data.nombre);
  res.json(municipio);
});

/**
 * @swagger
 * /api/v1/municipios/{id}/comunidades:
 *   get:
 *     summary: Listar comunidades activas de un municipio
 *     tags: [Municipios]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         example: 1
 *     responses:
 *       200:
 *         description: Lista de comunidades activas del municipio
 *       400:
 *         description: ID inválido
 *       404:
 *         description: Municipio no encontrado
 */
municipioRouter.get('/:id/comunidades', async (req: Request, res: Response) => {
  const parsed = idParamSchema.safeParse(req.params);
  if (!parsed.success) {
    res.status(400).json({ errors: parsed.error.flatten().fieldErrors });
    return;
  }
  const comunidades = await municipioService.getComunidadesByMunicipio(parsed.data.id);
  res.json(comunidades);
});