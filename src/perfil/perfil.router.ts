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
  filename: (_req: any, file: any, cb: any) => {
    const ext = path.extname(file.originalname);
    cb(null, `avatar-${Date.now()}${ext}`);
  },
});


const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req: any, file: any, cb: any) => {
    const allowed = ['image/jpeg', 'image/png', 'image/webp'];
    allowed.includes(file.mimetype) ? cb(null, true) : cb(new Error('Formato no permitido'));
  },
});

export const perfilRouter = Router();

perfilRouter.use(authenticate);
perfilRouter.use(authenticate);
perfilRouter.get('/me', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = await perfilService.getMiPerfil(req.user!.sub);    res.json(data);
  } catch (e) { next(e); }
});

perfilRouter.patch('/me', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const dto = actualizarPerfilSchema.parse(req.body);
    const data = await perfilService.actualizarPerfil(req.user!.sub, dto);
    res.json(data);
  } catch (e) { next(e); }
});

perfilRouter.post('/me/avatar', upload.single('avatar'), async (req: any, res: Response, next: NextFunction) => {
  try {
    const data = await perfilService.actualizarAvatar(req.user!.sub, req.file);
    res.json(data);
  } catch (e) { next(e); }
});

perfilRouter.get('/me/comunidades', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = await perfilService.getMisComunidades(req.user!.sub);
    res.json(data);
  } catch (e) { next(e); }
});

perfilRouter.post('/me/comunidades', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const dto = agregarComunidadSchema.parse(req.body);
    const data = await perfilService.agregarComunidad(req.user!.sub, dto);
    res.status(201).json(data);
  } catch (e) { next(e); }
});

perfilRouter.delete('/me/comunidades/:comunidadId', async (req: Request, res: Response, next: NextFunction) => {
  try {
    await perfilService.eliminarComunidad(req.user!.sub, Number(req.params.comunidadId));
    res.status(204).send();
  } catch (e) { next(e); }
});

perfilRouter.patch('/me/comunidades/:comunidadId/principal', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = await perfilService.setPrincipal(req.user!.sub, Number(req.params.comunidadId));
    res.json(data);
  } catch (e) { next(e); }
});
