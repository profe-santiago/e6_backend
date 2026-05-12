<<<<<<< HEAD
import { prisma } from '../lib/prisma';
import { AppError } from '../lib/app-error';
import { reporteFotoRepository } from './reporte-foto.repository';
import { AddFotosInput } from './reporte-foto.schema';
import { TokenPayload } from '../auth/auth.types';
=======
import { prisma } from "../lib/prisma";
import { AppError } from "../lib/app-error";
import { reporteFotoRepository } from "./reporte-foto.repository";
import { JwtPayload } from "../auth/auth.types";
>>>>>>> adbfa1a (add: middleware and updated service and router to accept multipart files)

const MAX_FOTOS = 10;

async function getReporteOr404(reporteId: number) {
	const reporte = await prisma.reporte.findFirst({
		where: { id: reporteId, deletedAt: null },
		select: { id: true, usuarioId: true, estado: true },
	});
	if (!reporte) throw new AppError(404, "Reporte no encontrado");
	return reporte;
}

export const reporteFotoService = {
	getByReporte: async (reporteId: number) => {
		await getReporteOr404(reporteId);
		return reporteFotoRepository.findByReporte(reporteId);
	},

<<<<<<< HEAD
  add: async (reporteId: number, data: AddFotosInput, user: TokenPayload) => {
    const reporte = await getReporteOr404(reporteId);
=======
    add: async (
      reporteId: number,
      files: Express.Multer.File[],
      user: JwtPayload,
    ) => {
      const reporte = await getReporteOr404(reporteId);
>>>>>>> adbfa1a (add: middleware and updated service and router to accept multipart files)

      const esAutor = reporte.usuarioId === user.sub;

      const esAutoridad = ["SUPER_ADMIN", "ADMIN", "COORDINADOR"].includes(
        user.rol,
      );

      if (!esAutor && !esAutoridad) {
        throw new AppError(
          403,
          "Solo puedes agregar fotos a tus propios reportes",
        );
      }

      if (["RESUELTO", "RECHAZADO"].includes(reporte.estado)) {
        throw new AppError(400, "No se pueden agregar fotos");
      }

<<<<<<< HEAD
  delete: async (reporteId: number, fotoId: number, user: TokenPayload) => {
    await getReporteOr404(reporteId);
=======
      const actual = await reporteFotoRepository.countByReporte(reporteId);
>>>>>>> adbfa1a (add: middleware and updated service and router to accept multipart files)

      if (actual + files.length > MAX_FOTOS) {
        throw new AppError(400, `Máximo ${MAX_FOTOS} fotos`);
      }

      const urls = files.map((file) => `/uploads/reports/${file.filename}`);

      await reporteFotoRepository.addMany(reporteId, urls);

      return reporteFotoRepository.findByReporte(reporteId);
    },

	delete: async (reporteId: number, fotoId: number, user: JwtPayload) => {
		await getReporteOr404(reporteId);

		const foto = await reporteFotoRepository.findById(fotoId);
		if (!foto) throw new AppError(404, "Foto no encontrada");
		if (foto.reporteId !== reporteId)
			throw new AppError(400, "La foto no pertenece a este reporte");

		const reporte = await prisma.reporte.findUnique({
			where: { id: reporteId },
			select: { usuarioId: true },
		});
		const esAutor = reporte?.usuarioId === user.sub;
		const esAutoridad = ["SUPER_ADMIN", "ADMIN", "COORDINADOR"].includes(
			user.rol,
		);
		if (!esAutor && !esAutoridad) {
			throw new AppError(
				403,
				"Solo puedes eliminar fotos de tus propios reportes",
			);
		}

		await reporteFotoRepository.deleteById(fotoId);
		return { message: "Foto eliminada correctamente" };
	},
};
