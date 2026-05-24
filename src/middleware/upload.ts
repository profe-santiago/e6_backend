import multer from 'multer';
import { CloudinaryStorage } from 'multer-storage-cloudinary';
import { cloudinary } from '../lib/cloudinary';

const reportesStorage = new CloudinaryStorage({
  cloudinary,
  params: {
    folder:         'irsu/reportes',
    allowed_formats: ['jpg', 'jpeg', 'png', 'webp'],
    transformation: [{ width: 1200, quality: 'auto' }],
  } as any,
});

const avatarsStorage = new CloudinaryStorage({
  cloudinary,
  params: {
    folder:         'irsu/avatars',
    allowed_formats: ['jpg', 'jpeg', 'png', 'webp'],
    transformation: [{ width: 400, height: 400, crop: 'fill', quality: 'auto' }],
  } as any,
});

export const uploadReporteFotos = multer({
  storage: reportesStorage,
  limits:  { files: 10, fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (!file.mimetype.startsWith('image/')) {
      return cb(new Error('Solo imágenes'));
    }
    cb(null, true);
  },
});

export const uploadAvatar = multer({
  storage: avatarsStorage,
  limits:  { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const allowed = ['image/jpeg', 'image/png', 'image/webp'];
    allowed.includes(file.mimetype) ? cb(null, true) : cb(new Error('Formato no permitido'));
  },
});