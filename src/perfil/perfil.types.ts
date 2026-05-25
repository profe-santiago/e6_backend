export interface ActualizarPerfilDto {
  nombre?: string;
}

export interface AgregarComunidadDto {
  comunidadId: number;
}

export interface PerfilResponse {
  id: number;
  email: string;
  nombre: string | null;
  avatarUrl: string | null;
  rol: string;
  comunidades: ComunidadUsuarioItem[];
}

export interface ComunidadUsuarioItem {
  id: number;
  comunidadId: number;
  nombre: string;
  slug: string;
  esPrincipal: boolean;
  irsuActual: number;
  color: string;
  codigoPostal: string | null;
  colonia: string | null;
}