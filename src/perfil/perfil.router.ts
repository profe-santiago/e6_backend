import { Router, Request, Response, NextFunction } from 'express';
import path from 'path';
import fs from 'fs';
import { authenticate } from '../middleware/auth.middleware';
import { perfilService } from './perfil.service';
import { actualizarPerfilSchema, agregarComunidadSchema } from './perfil.schema';

// eslint-disable-next-line @typescript-eslint/no-require-imports
const multer = require('multer');
const uploadsDir = path.join(process.cwd(), 'uploads', 'avatars');
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (_req: any, _file: any, cb: any) => cb(null, uploadsDir),
  filename:    (_req: any, file: any, cb: any) => {
    const ext = path.extname(file.originalname);
    cb(null, `avatar-${Date.now()}${ext}`);
  },
});

const upload = multer({
  storage,
  limits:     { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req: any, file: any, cb: any) => {
    const allowed = ['image/jpeg', 'image/png', 'image/webp'];
    allowed.includes(file.mimetype) ? cb(null, true) : cb(new Error('Formato no permitido'));
  },
});

export const perfilRouter = Router();

perfilRouter.use(authenticate);

/**
 * @swagger
 * /api/perfil/me:
 *   get:
 *     summary: Obtener el perfil del usuario autenticado
 *     tags: [Perfil]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Perfil completo con comunidades suscritas
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 id:
 *                   type: integer
 *                 email:
 *                   type: string
 *                 nombre:
 *                   type: string
 *                 avatarUrl:
 *                   type: string
 *                   nullable: true
 *                 rol:
 *                   type: string
 *                 comunidades:
 *                   type: array
 *       401:
 *         description: Token requerido
 *       404:
 *         description: Usuario no encontrado
 */
perfilRouter.get('/me', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = await perfilService.getMiPerfil(req.user!.sub);
    res.json(data);
  } catch (e) { next(e); }
});

/**
 * @swagger
 * /api/perfil/me:
 *   patch:
 *     summary: Actualizar nombre del usuario autenticado
 *     tags: [Perfil]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               nombre:
 *                 type: string
 *                 minLength: 1
 *                 maxLength: 100
 *                 example: "María García"
 *     responses:
 *       200:
 *         description: Perfil actualizado
 *       400:
 *         description: Datos inválidos o ningún campo enviado
 *       401:
 *         description: Token requerido
 */
perfilRouter.patch('/me', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const dto  = actualizarPerfilSchema.parse(req.body);
    const data = await perfilService.actualizarPerfil(req.user!.sub, dto);
    res.json(data);
  } catch (e) { next(e); }
});

/**
 * @swagger
 * /api/perfil/me/avatar:
 *   post:
 *     summary: Subir o reemplazar el avatar del usuario autenticado
 *     tags: [Perfil]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required: [avatar]
 *             properties:
 *               avatar:
 *                 type: string
 *                 format: binary
 *                 description: Imagen JPEG, PNG o WebP. Máximo 5 MB.
 *     responses:
 *       200:
 *         description: Avatar actualizado. Retorna la URL pública de la imagen.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 avatarUrl:
 *                   type: string
 *                   example: "/uploads/avatars/avatar-1716000000000.jpg"
 *       400:
 *         description: No se recibió archivo o formato no permitido
 *       401:
 *         description: Token requerido
 */
perfilRouter.post('/me/avatar', upload.single('avatar'), async (req: any, res: Response, next: NextFunction) => {
  try {
    const data = await perfilService.actualizarAvatar(req.user!.sub, req.file);
    res.json(data);
  } catch (e) { next(e); }
});

/**
 * @swagger
 * /api/perfil/me/comunidades:
 *   get:
 *     summary: Listar las comunidades a las que pertenece el usuario
 *     tags: [Perfil]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Lista de comunidades suscritas con indicador de comunidad principal
 *       401:
 *         description: Token requerido
 */
perfilRouter.get('/me/comunidades', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = await perfilService.getMisComunidades(req.user!.sub);
    res.json(data);
  } catch (e) { next(e); }
});

/**
 * @swagger
 * /api/perfil/me/comunidades:
 *   post:
 *     summary: Suscribirse a una comunidad
 *     tags: [Perfil]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [comunidadId]
 *             properties:
 *               comunidadId:
 *                 type: integer
 *                 example: 5
 *     responses:
 *       201:
 *         description: Suscripción creada. La primera comunidad suscrita se marca automáticamente como principal.
 *       409:
 *         description: El usuario ya pertenece a esa comunidad
 *       401:
 *         description: Token requerido
 */
perfilRouter.post('/me/comunidades', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const dto  = agregarComunidadSchema.parse(req.body);
    const data = await perfilService.agregarComunidad(req.user!.sub, dto);
    res.status(201).json(data);
  } catch (e) { next(e); }
});

/**
 * @swagger
 * /api/perfil/me/comunidades/{comunidadId}:
 *   delete:
 *     summary: Desuscribirse de una comunidad
 *     tags: [Perfil]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: comunidadId
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       204:
 *         description: Suscripción eliminada
 *       400:
 *         description: No puedes eliminar tu comunidad principal
 *       401:
 *         description: Token requerido
 *       404:
 *         description: No perteneces a esa comunidad
 */
perfilRouter.delete('/me/comunidades/:comunidadId', async (req: Request, res: Response, next: NextFunction) => {
  try {
    await perfilService.eliminarComunidad(req.user!.sub, Number(req.params.comunidadId));
    res.status(204).send();
  } catch (e) { next(e); }
});

/**
 * @swagger
 * /api/perfil/me/comunidades/{comunidadId}/principal:
 *   patch:
 *     summary: Establecer una comunidad como principal
 *     tags: [Perfil]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: comunidadId
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Comunidad principal actualizada
 *       401:
 *         description: Token requerido
 *       404:
 *         description: No perteneces a esa comunidad
 */
perfilRouter.patch('/me/comunidades/:comunidadId/principal', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = await perfilService.setPrincipal(req.user!.sub, Number(req.params.comunidadId));
    res.json(data);
  } catch (e) { next(e); }
});