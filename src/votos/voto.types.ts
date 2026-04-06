export interface VotoResponse {
  id:        number;
  usuarioId: number;
  reporteId: number;
  usuario:   { id: number; nombre: string | null; email: string };
}

export interface VotoResumen {
  total:    number;
  yaVote:   boolean;
  usuarios: { id: number; nombre: string | null; email: string }[];
}