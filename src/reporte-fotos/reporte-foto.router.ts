import { Router, Request, Response } from "express";
import { reporteFotoService } from "./reporte-foto.service";
import {
	reporteIdParamSchema,
	fotoIdParamSchema,
} from "./reporte-foto.schema";
import { authenticate } from "../middleware/auth.middleware";
import { optionalAuth } from "../middleware/optional-auth.middleware";
import { uploadReporteFotos } from "../middleware/upload";

// mergeParams: true permite leer :reporteId del router padre
export const reporteFotoRouter = Router({ mergeParams: true });

/**
 * @swagger
 * /api/v1/reportes/{reporteId}/fotos:
 *   get:
 *     summary: Listar fotos de un reporte
 *     tags: [ReporteFotos]
 *     parameters:
 *       - in: path
 *         name: reporteId
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Lista de fotos del reporte
 *       404:
 *         description: Reporte no encontrado
 */
reporteFotoRouter.get(
	"/",
	optionalAuth,
	async (req: Request, res: Response): Promise<void> => {
		const parsed = reporteIdParamSchema.safeParse(req.params);
		if (!parsed.success) {
			res.status(400).json({ errors: parsed.error.flatten().fieldErrors });
			return;
		}
		const fotos = await reporteFotoService.getByReporte(parsed.data.reporteId);
		res.json(fotos);
	},
);

/**
 * @swagger
 * /api/v1/reportes/{reporteId}/fotos:
 *   post:
 *     summary: Agregar fotos a un reporte
 *     tags: [ReporteFotos]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: reporteId
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [urls]
 *             properties:
 *               urls:
 *                 type: array
 *                 items:
 *                   type: string
 *                   format: uri
 *                 maxItems: 10
 *                 example: ["https://cdn.example.com/foto1.jpg"]
 *     responses:
 *       200:
 *         description: Lista actualizada de fotos
 *       400:
 *         description: Límite de fotos superado o datos inválidos
 *       403:
 *         description: Sin permisos
 *       404:
 *         description: Reporte no encontrado
 */
reporteFotoRouter.post(
  '/',

  authenticate,

  uploadReporteFotos.array('fotos', 10),

  async (
    req: Request,
    res: Response
  ): Promise<void> => {

    console.log("Params recibidos:", req.params); // Si esto sale {}, el problema es mergeParams (pero ya lo tienes)
    console.log("Archivos recibidos:", req.files?.length); // Si esto sale 0 o undefined, el problema es el FormData de Expo

    const paramParsed =
      reporteIdParamSchema.safeParse(
        req.params
      );

    if (!paramParsed.success) {
      res.status(400).json({
        errors:
          paramParsed.error.flatten()
            .fieldErrors,
      });

      return;
    }

    const files =
      req.files as Express.Multer.File[];

    if (!files || files.length === 0) {
      res.status(400).json({
        error: 'No se enviaron fotos',
      });

      return;
    }

    const fotos =
      await reporteFotoService.add(
        paramParsed.data.reporteId,
        files,
        req.user!
      );

    res.json(fotos);
  }
);


/**
 * @swagger
 * /api/v1/reportes/{reporteId}/fotos/{id}:
 *   delete:
 *     summary: Eliminar una foto de un reporte
 *     tags: [ReporteFotos]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: reporteId
 *         required: true
 *         schema:
 *           type: integer
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Foto eliminada
 *       400:
 *         description: La foto no pertenece a este reporte
 *       403:
 *         description: Sin permisos
 *       404:
 *         description: Reporte o foto no encontrados
 */
reporteFotoRouter.delete(
	"/:id",
	authenticate,
	async (req: Request, res: Response): Promise<void> => {
		const parsed = fotoIdParamSchema.safeParse(req.params);
		if (!parsed.success) {
			res.status(400).json({ errors: parsed.error.flatten().fieldErrors });
			return;
		}
		const result = await reporteFotoService.delete(
			parsed.data.reporteId,
			parsed.data.id,
			req.user!,
		);
		res.json(result);
	},
);
