import { prisma } from "../lib/prisma";
import { AppError } from "../lib/app-error";
import { reporteRepository } from "./reporte.repository";
import {
	CreateReporteInput,
	UpdateReporteInput,
	CambiarEstadoInput,
	FiltrosReporteInput,
} from "./reporte.schema";
import { TokenPayload } from "../auth/auth.types";
import { irsuService } from "../irsu/irsu.service";

const LIMITE_ANONIMO = Number(process.env.LIMITE_REPORTES_ANONIMO ?? 3);

export const reporteService = {
	getAll: async (filtros: FiltrosReporteInput, user?: TokenPayload) => {
		const comunidadId =
			user?.rol === "COORDINADOR"
				? (user.comunidadId ?? filtros.comunidadId)
				: filtros.comunidadId;

		const usuarioId = user?.rol === "USUARIO" ? user.sub : filtros.usuarioId;

		const skip = (filtros.page - 1) * filtros.limit;
		const take = filtros.limit;

		const [reportes, total] = await Promise.all([
			reporteRepository.findAll({
				comunidadId,
				categoria: filtros.categoria,
				estado: filtros.estado,
				fuente: filtros.fuente,
				usuarioId,
				skip,
				take,
			}),
			reporteRepository.count({
				comunidadId,
				categoria: filtros.categoria,
				estado: filtros.estado,
				fuente: filtros.fuente,
				usuarioId,
			}),
		]);

		return {
			data: reportes,
			meta: {
				total,
				page: filtros.page,
				limit: filtros.limit,
				totalPages: Math.ceil(total / filtros.limit),
			},
		};
	},

	getById: async (id: number) => {
		const reporte = await reporteRepository.findById(id);
		if (!reporte) {
			throw new AppError(404, "Reporte no encontrado");
		}
		return reporte;
	},

	create: async (
		data: CreateReporteInput,
		user?: TokenPayload,
		ip?: string,
	) => {
		const comunidad = await prisma.comunidad.findUnique({
			where: { id: data.comunidadId },
			select: { id: true, status: true },
		});
		if (!comunidad) {
			throw new AppError(404, "Comunidad no encontrada");
		}
		if (comunidad.status !== "ACTIVO") {
			throw new AppError(
				400,
				"Solo se pueden crear reportes en comunidades activas",
			);
		}

		if (!user && ip) {
			const countHoy = await reporteRepository.countByIpToday(ip);
			if (countHoy >= LIMITE_ANONIMO) {
				throw new AppError(
					429,
					`Los usuarios anónimos tienen un límite de ${LIMITE_ANONIMO} reportes por día`,
				);
			}
		}

		const reporte = await reporteRepository.create({
			...data,
			usuarioId: user?.sub,
			deviceIp: ip,
		});

		// Recalcula el IRSU de la comunidad afectada en background
		irsuService.calcular(data.comunidadId).catch(() => {});

		return reporte;
	},

	getStats: async (where: any, user?: TokenPayload) => {
		const comunidadId =
			user?.rol === "COORDINADOR" ? user.comunidadId : undefined;

		const baseWhere = {
			deletedAt: null,
			...(comunidadId && { comunidadId }),
		};

		const grouped = await prisma.reporte.groupBy({
			by: ["estado"],
			where: baseWhere,
			_count: {
				estado: true,
			},
		});

		const stats = {
			PENDIENTE: 0,
			EN_PROCESO: 0,
			RESUELTO: 0,
			RECHAZADO: 0,
		};

		grouped.forEach((g) => {
			stats[g.estado] = g._count.estado;
		});

		return stats;
	},

	update: async (id: number, data: UpdateReporteInput, user: TokenPayload) => {
		const reporte = await reporteService.getById(id);

		if (reporte.usuario?.id !== user.sub && user.rol === "USUARIO") {
			throw new AppError(403, "Solo puedes editar tus propios reportes");
		}

		if (["RESUELTO", "RECHAZADO"].includes(reporte.estado)) {
			throw new AppError(
				400,
				"No se puede editar un reporte resuelto o rechazado",
			);
		}

		return reporteRepository.update(id, data);
	},

	delete: async (id: number, user: TokenPayload) => {
		const reporte = await reporteService.getById(id);

		if (reporte.usuario?.id !== user.sub && user.rol === "USUARIO") {
			throw new AppError(403, "Solo puedes eliminar tus propios reportes");
		}

		await reporteRepository.softDelete(id);
		return { message: "Reporte eliminado correctamente" };
	},

	cambiarEstado: async (
		id: number,
		data: CambiarEstadoInput,
		user: TokenPayload,
	) => {
		const reporte = await reporteService.getById(id);

		if (user.rol === "USUARIO") {
			throw new AppError(
				403,
				"No tienes permisos para cambiar el estado de un reporte",
			);
		}

		if (
			user.rol === "COORDINADOR" &&
			user.comunidadId !== reporte.comunidad.id
		) {
			throw new AppError(
				403,
				"No puedes cambiar el estado de reportes fuera de tu comunidad",
			);
		}

		await reporteRepository.cambiarEstado(id, {
			estado: data.estado,
			cambiadoPor: user.sub,
			estadoAnterior: reporte.estado,
			nota: data.nota,
		});

		// Recalcula el IRSU de la comunidad afectada en background
		irsuService.calcular(reporte.comunidad.id).catch(() => {});

		return reporteService.getById(id);
	},
};
