import { Router, Request, Response } from 'express';
import { codigoPostalService } from './codigo-postal.service';
import { codigoQuerySchema, idParamSchema, municipioIdParamSchema } from './codigo-postal.schema';

export const codigoPostalRouter = Router();

/**
 * @swagger
 * /api/v1/codigos-postales:
 *   get:
 *     summary: Buscar colonias por código postal
 *     tags: [CodigosPostales]
 *     parameters:
 *       - in: query
 *         name: codigo
 *         required: true
 *         schema:
 *           type: string
 *           minLength: 5
 *           maxLength: 5
 *         example: "68000"
 *     responses:
 *       200:
 *         description: Lista de colonias para ese código postal
 *       400:
 *         description: Código postal inválido
 */
codigoPostalRouter.get('/', async (req: Request, res: Response) => {
  const parsed = codigoQuerySchema.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ errors: parsed.error.flatten().fieldErrors });
    return;
  }
  const resultados = await codigoPostalService.getByCodigo(parsed.data.codigo);
  res.json(resultados);
});

/**
 * @swagger
 * /api/v1/codigos-postales/id/{id}:
 *   get:
 *     summary: Obtener un código postal por ID
 *     tags: [CodigosPostales]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         example: 1
 *     responses:
 *       200:
 *         description: Código postal encontrado
 *       400:
 *         description: ID inválido
 *       404:
 *         description: Código postal no encontrado
 */
codigoPostalRouter.get('/id/:id', async (req: Request, res: Response) => {
  const parsed = idParamSchema.safeParse(req.params);
  if (!parsed.success) {
    res.status(400).json({ errors: parsed.error.flatten().fieldErrors });
    return;
  }
  const cp = await codigoPostalService.getById(parsed.data.id);
  res.json(cp);
});

/**
 * @swagger
 * /api/v1/codigos-postales/municipio/{municipioId}:
 *   get:
 *     summary: Listar códigos postales de un municipio
 *     tags: [CodigosPostales]
 *     parameters:
 *       - in: path
 *         name: municipioId
 *         required: true
 *         schema:
 *           type: integer
 *         example: 1
 *     responses:
 *       200:
 *         description: Lista de códigos postales del municipio
 *       400:
 *         description: ID inválido
 *       404:
 *         description: Municipio no encontrado
 */
codigoPostalRouter.get('/municipio/:municipioId', async (req: Request, res: Response) => {
  const parsed = municipioIdParamSchema.safeParse(req.params);
  if (!parsed.success) {
    res.status(400).json({ errors: parsed.error.flatten().fieldErrors });
    return;
  }
  const cps = await codigoPostalService.getByMunicipio(parsed.data.municipioId);
  res.json(cps);
});