import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { app } from '../../src/app';

// Email único por ejecución para evitar conflictos entre runs
const UNIQUE        = Date.now();
const TEST_EMAIL    = `ci_${UNIQUE}@irsu.mx`;
const TEST_PASSWORD = 'TestPassword123!';

describe('[Integration] Auth', () => {
  // ── Register ──────────────────────────────────────────────────────────────
  describe('POST /api/v1/auth/register', () => {
    it('201 — registra usuario nuevo y retorna JWT con estructura correcta', async () => {
      const res = await request(app)
        .post('/api/v1/auth/register')
        .send({ email: TEST_EMAIL, password: TEST_PASSWORD, nombre: 'CI User' });

      expect(res.status).toBe(201);
      expect(res.body).toHaveProperty('token');
      expect(typeof res.body.token).toBe('string');
      expect(res.body.token.length).toBeGreaterThan(10);
      expect(res.body.usuario.email).toBe(TEST_EMAIL);
      expect(res.body.usuario.rol).toBe('USUARIO');
      // El passwordHash nunca debe exponerse
      expect(res.body.usuario).not.toHaveProperty('passwordHash');
    });

    it('400 — rechaza email ya registrado', async () => {
      const res = await request(app)
        .post('/api/v1/auth/register')
        .send({ email: TEST_EMAIL, password: TEST_PASSWORD });

      expect(res.status).toBe(400);
      expect(res.body).toHaveProperty('error');
    });

    it('400 — rechaza email con formato inválido', async () => {
      const res = await request(app)
        .post('/api/v1/auth/register')
        .send({ email: 'no-es-un-email', password: TEST_PASSWORD });

      expect(res.status).toBe(400);
      expect(res.body).toHaveProperty('errors');
    });

    it('400 — rechaza contraseña menor a 8 caracteres', async () => {
      const res = await request(app)
        .post('/api/v1/auth/register')
        .send({ email: `short_${UNIQUE}@irsu.mx`, password: '123' });

      expect(res.status).toBe(400);
    });

    it('400 — rechaza body vacío', async () => {
      const res = await request(app)
        .post('/api/v1/auth/register')
        .send({});

      expect(res.status).toBe(400);
    });
  });

  // ── Login ─────────────────────────────────────────────────────────────────
  describe('POST /api/v1/auth/login', () => {
    it('200 — retorna JWT con credenciales válidas', async () => {
      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({ email: TEST_EMAIL, password: TEST_PASSWORD });

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('token');
      expect(res.body.usuario.email).toBe(TEST_EMAIL);
    });

    it('401 — rechaza contraseña incorrecta', async () => {
      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({ email: TEST_EMAIL, password: 'ContraseñaMal999!' });

      expect(res.status).toBe(401);
    });

    it('401 — rechaza email inexistente', async () => {
      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({ email: `noexiste_${UNIQUE}@irsu.mx`, password: TEST_PASSWORD });

      expect(res.status).toBe(401);
    });

    it('400 — rechaza body vacío', async () => {
      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({});

      expect(res.status).toBe(400);
    });

    it('401 — token generado es verificable (el endpoint de perfil lo acepta)', async () => {
      const loginRes = await request(app)
        .post('/api/v1/auth/login')
        .send({ email: TEST_EMAIL, password: TEST_PASSWORD });

      const token = loginRes.body.token;

      const perfilRes = await request(app)
        .get('/api/v1/usuarios/perfil')
        .set('Authorization', `Bearer ${token}`);

      expect(perfilRes.status).toBe(200);
      expect(perfilRes.body.email).toBe(TEST_EMAIL);
    });
  });
});
