import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { app } from '../../src/app';

describe('[Integration] Reportes', () => {
  // ── Health ────────────────────────────────────────────────────────────────
  describe('GET /api/health', () => {
    it('200 — retorna status ok', async () => {
      const res = await request(app).get('/api/health');
      expect(res.status).toBe(200);
      expect(res.body.status).toBe('ok');
    });
  });

  // ── GET /reportes ─────────────────────────────────────────────────────────
  describe('GET /api/v1/reportes', () => {
    it('200 — retorna estructura paginada correcta', async () => {
      const res = await request(app).get('/api/v1/reportes');

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('data');
      expect(res.body).toHaveProperty('meta');
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.meta).toHaveProperty('total');
      expect(res.body.meta).toHaveProperty('page');
      expect(res.body.meta).toHaveProperty('limit');
      expect(res.body.meta).toHaveProperty('totalPages');
    });

    it('200 — acepta filtro por categoría válida', async () => {
      const res = await request(app)
        .get('/api/v1/reportes')
        .query({ categoria: 'SEGURIDAD', page: 1, limit: 5 });
      expect(res.status).toBe(200);
    });

    it('200 — acepta filtro por estado válido', async () => {
      const res = await request(app)
        .get('/api/v1/reportes')
        .query({ estado: 'PENDIENTE' });
      expect(res.status).toBe(200);
    });

    it('400 — rechaza limit fuera de rango (> 100)', async () => {
      const res = await request(app)
        .get('/api/v1/reportes')
        .query({ limit: 999 });
      expect(res.status).toBe(400);
    });

    it('400 — rechaza categoría inválida', async () => {
      const res = await request(app)
        .get('/api/v1/reportes')
        .query({ categoria: 'CATEGORIA_FALSA' });
      expect(res.status).toBe(400);
    });

    it('400 — rechaza estado inválido', async () => {
      const res = await request(app)
        .get('/api/v1/reportes')
        .query({ estado: 'NO_EXISTE' });
      expect(res.status).toBe(400);
    });
  });

  // ── GET /reportes/:id ────────────────────────────────────────────────────
  describe('GET /api/v1/reportes/:id', () => {
    it('404 — reporte inexistente retorna 404', async () => {
      const res = await request(app).get('/api/v1/reportes/99999999');
      expect(res.status).toBe(404);
    });
  });

  // ── POST /reportes — validaciones de schema ───────────────────────────────
  describe('POST /api/v1/reportes — validaciones', () => {
    it('400 — rechaza body vacío', async () => {
      const res = await request(app).post('/api/v1/reportes').send({});
      expect(res.status).toBe(400);
    });

    it('400 — rechaza gravedad > 5', async () => {
      const res = await request(app)
        .post('/api/v1/reportes')
        .send({ titulo: 'Test', gravedad: 10, categoria: 'SEGURIDAD', latitud: 17.06, longitud: -96.72, comunidadId: 1 });
      expect(res.status).toBe(400);
    });

    it('400 — rechaza gravedad < 1', async () => {
      const res = await request(app)
        .post('/api/v1/reportes')
        .send({ titulo: 'Test', gravedad: 0, categoria: 'SEGURIDAD', latitud: 17.06, longitud: -96.72, comunidadId: 1 });
      expect(res.status).toBe(400);
    });

    it('400 — rechaza latitud fuera de rango (> 90)', async () => {
      const res = await request(app)
        .post('/api/v1/reportes')
        .send({ titulo: 'Test', gravedad: 3, categoria: 'SEGURIDAD', latitud: 200, longitud: -96.72, comunidadId: 1 });
      expect(res.status).toBe(400);
    });

    it('400 — rechaza categoría inválida', async () => {
      const res = await request(app)
        .post('/api/v1/reportes')
        .send({ titulo: 'Test', gravedad: 3, categoria: 'OTRA', latitud: 17.06, longitud: -96.72, comunidadId: 1 });
      expect(res.status).toBe(400);
    });

    it('400 — rechaza título menor a 3 caracteres', async () => {
      const res = await request(app)
        .post('/api/v1/reportes')
        .send({ titulo: 'Hi', gravedad: 3, categoria: 'SEGURIDAD', latitud: 17.06, longitud: -96.72, comunidadId: 1 });
      expect(res.status).toBe(400);
    });
  });

  // ── Endpoints protegidos ──────────────────────────────────────────────────
  describe('Endpoints protegidos — sin token', () => {
    it('401 — PATCH /reportes/:id requiere autenticación', async () => {
      const res = await request(app)
        .patch('/api/v1/reportes/1')
        .send({ titulo: 'Cambio sin token' });
      expect(res.status).toBe(401);
    });

    it('401 — DELETE /reportes/:id requiere autenticación', async () => {
      const res = await request(app).delete('/api/v1/reportes/1');
      expect(res.status).toBe(401);
    });

    it('401 — PATCH /reportes/:id/estado requiere autenticación', async () => {
      const res = await request(app)
        .patch('/api/v1/reportes/1/estado')
        .send({ estado: 'RESUELTO' });
      expect(res.status).toBe(401);
    });

    it('401 — GET /api/v1/irsu/stats/dashboard requiere autenticación', async () => {
      const res = await request(app).get('/api/v1/irsu/stats/dashboard');
      expect(res.status).toBe(401);
    });
  });
});
