import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import fs from 'fs';
import path from 'path';
import readline from 'readline';

const DATA_DIR = path.join(__dirname, 'data');

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma  = new PrismaClient({ adapter });

const pad = (val: string, n: number) => val?.trim().padStart(n, '0') || '0'.repeat(n);

async function readCsv(filePath: string): Promise<Record<string, string>[]> {
  const rows: Record<string, string>[] = [];
  const rl = readline.createInterface({
    input: fs.createReadStream(filePath, { encoding: 'utf-8' }),
    crlfDelay: Infinity,
  });
  let headers: string[] = [];
  for await (const line of rl) {
    if (!line.trim()) continue;
    if (!headers.length) {
      const sep = line.includes('\t') ? '\t' : ',';
      headers = line.split(sep).map(h => h.trim().replace(/^"|"$/g, ''));
      continue;
    }
    const values = line.split(',').map(v => v.trim().replace(/^"|"$/g, ''));
    const row: Record<string, string> = {};
    headers.forEach((h, i) => { row[h] = values[i] || ''; });
    rows.push(row);
  }
  return rows;
}

async function main() {
  console.log('\n🚀 Seed — Sistema IRSU (Oaxaca)\n');

  // ── 1. ESTADO DE OAXACA ───────────────────────────────────────────────────
  console.log('Cargando estado de Oaxaca...');
  const todosEstados = await readCsv(path.join(DATA_DIR, 'Estados.csv'));
  const oaxacaRow    = todosEstados.find(r => pad(r['CVE_ENT'], 2) === '20');
  if (!oaxacaRow) throw new Error('No se encontró Oaxaca en Estados.csv');

  await prisma.estado.upsert({
    where:  { clave: '20' },
    update: {},
    create: { clave: '20', nombre: oaxacaRow['NOM_ENT'].trim() },
  });
  const estado = await prisma.estado.findUnique({ where: { clave: '20' } });
  console.log(`Estado: ${estado!.nombre} (id: ${estado!.id})`);

  // ── 2. MUNICIPIOS DE OAXACA ───────────────────────────────────────────────
  console.log('Cargando municipios de Oaxaca...');
  const municipiosOax = (await readCsv(path.join(DATA_DIR, 'Municipios_oaxaca.csv')))
    .map(r => ({
      clave:    '20' + pad(r['CVE_MUN'], 3),
      nombre:   r['NOM_MUN'].trim(),
      estadoId: estado!.id,
    }));

  await prisma.municipio.createMany({ data: municipiosOax, skipDuplicates: true });
  const municipios  = await prisma.municipio.findMany({ where: { estadoId: estado!.id } });
  const municipioMap = new Map<string, number>();
  municipios.forEach(m => municipioMap.set(m.clave, m.id));
  console.log(`${municipios.length} municipios cargados`);

  // ── 3. CÓDIGOS POSTALES (CP_oaxaca.txt) ───────────────────────────────────
  console.log('Cargando códigos postales...');
  const cpRows: { codigo: string; colonia: string; municipioId: number }[] = [];

  const rlCP = readline.createInterface({
    input: fs.createReadStream(path.join(DATA_DIR, 'CP_oaxaca.txt'), { encoding: 'latin1' }),
    crlfDelay: Infinity,
  });

  let cpHeader = true;
  for await (const line of rlCP) {
    if (cpHeader) { cpHeader = false; continue; }
    const cols = line.split('|');
    if (cols.length < 12) continue;

    const codigo    = pad(cols[0].trim(), 5);
    const colonia   = cols[1].trim();
    const cveMun    = '20' + cols[11].trim().padStart(3, '0');
    const municipioId = municipioMap.get(cveMun);

    if (municipioId && codigo && colonia) {
      cpRows.push({ codigo, colonia, municipioId });
    }
  }

  for (let i = 0; i < cpRows.length; i += 5000) {
    await prisma.codigoPostal.createMany({
      data: cpRows.slice(i, i + 5000),
      skipDuplicates: true,
    });
    process.stdout.write(`\r   CPs: ${Math.min(i + 5000, cpRows.length)}/${cpRows.length}`);
  }
  console.log(`\n${cpRows.length} códigos postales cargados`);

  // ── 4. COMUNIDADES (comunidades_oaxaca.csv) ───────────────────────────────
  console.log('Cargando comunidades...');

  // Cargar CPs en memoria para hacer match por codigo+colonia
  const cpsEnBD = await prisma.codigoPostal.findMany({
    select: { id: true, codigo: true, colonia: true },
  });
  const cpMap = new Map<string, number>();
  for (const cp of cpsEnBD) {
    const norm = cp.colonia.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();
    cpMap.set(`${cp.codigo}-${norm}`, cp.id);
  }

  const rlCom = readline.createInterface({
    input: fs.createReadStream(path.join(DATA_DIR, 'comunidades_oaxaca.csv'), { encoding: 'utf-8' }),
    crlfDelay: Infinity,
  });

  let comHeader = true;
  let buffer: any[] = [];
  let creadas = 0;
  let sinCpId = 0;
  const slugsSeen = new Set<string>();

  const flush = async () => {
    if (!buffer.length) return;
    await prisma.comunidad.createMany({ data: buffer, skipDuplicates: true });
    creadas += buffer.length;
    buffer   = [];
    process.stdout.write(`\r   Comunidades: ${creadas}`);
  };

  for await (const line of rlCom) {
    if (comHeader) { comHeader = false; continue; }
    const cols = line.trim().split(',');
    if (cols.length < 5) continue;

    const [cp, nombre, , cveMun, slugBase] = cols;
    const municipioId = municipioMap.get('20' + cveMun.padStart(3, '0'));
    if (!municipioId) continue;

    const norm  = nombre.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();
    const cpId  = cpMap.get(`${cp.padStart(5, '0')}-${norm}`);
    if (!cpId) sinCpId++;

    let slug = slugBase.trim();
    if (slugsSeen.has(slug)) slug = `${slug}-${creadas + buffer.length}`;
    slugsSeen.add(slug);

    buffer.push({
      nombre,
      slug,
      status:     'ACTIVO',
      municipioId,
      cpId:       cpId ?? undefined,
      irsuActual: 0,
      color:      '#3B82F6',
    });

    if (buffer.length >= 500) await flush();
  }
  await flush();

  console.log(`\n${creadas} comunidades creadas (${sinCpId} sin cpId)`);
  console.log('\nSeed completado.\n');
}

main()
  .catch(e => { console.error('\nError:', e); process.exit(1); })
  .finally(() => prisma.$disconnect());