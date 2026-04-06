export interface ReporteFotoResponse {
  id:        number;
  url:       string;
  reporteId: number;
}

export interface CreateReporteFotoDto {
  url:       string;
  reporteId: number;
}