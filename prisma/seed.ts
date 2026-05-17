import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import fs from 'fs';
import path from 'path';
import readline from 'readline';

// ─── Configuración ───────────────────────────────────────────────────────────

const DATA_DIR = path.join(__dirname, 'data');
const FILE_ESTADOS     = path.join(DATA_DIR, 'Estados.csv');
const FILE_MUNICIPIOS  = path.join(DATA_DIR, 'Municipios.csv');
const FILE_COMUNIDADES = path.join(DATA_DIR, 'Comunidades_oaxaca.csv');
const FILE_CP = path.join(DATA_DIR, 'CP_oaxaca.txt');

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma  = new PrismaClient({ adapter });

// ─── Helpers ─────────────────────────────────────────────────────────────────

const pad = (val: string, n: number) => val?.trim().padStart(n, '0') || '0'.repeat(n);

function toSlug(text: string, suffix: string): string {
  return (
    text.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9\s-]/g, '').trim().replace(/\s+/g, '-') + '-' + suffix
  );
}

/** Lector para archivos CSV estándar (Estados, Municipios, Comunidades) */
async function readCsv(filePath: string): Promise<Record<string, string>[]> {
  const rows: Record<string, string>[] = [];
  const rl = readline.createInterface({
    input: fs.createReadStream(filePath, { encoding: 'utf-8' }),
    crlfDelay: Infinity,
  });

  let headers: string[] = [];
  for await (const line of rl) {
    if (!line.trim()) continue;
    if (headers.length === 0) {
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

// ─── Main ────────────────────────────────────────────────────────────────────

async function main() {
  console.log('Iniciando Seed masivo...\n');

  // 1. ESTADOS
  console.log('Procesando Estados...');
  const estadosData = (await readCsv(FILE_ESTADOS)).map(r => ({
    clave:  pad(r['CVE_ENT'], 2),
    nombre: r['NOM_ENT'].trim(),
  }));
  await prisma.estado.createMany({ data: estadosData, skipDuplicates: true });
  
  const estadoMap = new Map<string, number>();
  (await prisma.estado.findMany()).forEach(e => estadoMap.set(e.clave, e.id));

  // 2. MUNICIPIOS
  console.log('Procesando Municipios...');
  const municipiosData = (await readCsv(FILE_MUNICIPIOS))
    .filter(r => r['CVE_ENT'] && r['CVE_MUN'])
    .map(r => {
      const cvEnt = pad(r['CVE_ENT'], 2);
      return { 
        clave: cvEnt + pad(r['CVE_MUN'], 3), 
        nombre: r['NOM_MUN'].trim(), 
        estadoId: estadoMap.get(cvEnt)! 
      };
    }).filter(m => m.estadoId);

  await prisma.municipio.createMany({ data: municipiosData, skipDuplicates: true });
  
  const municipioMap = new Map<string, number>();
  (await prisma.municipio.findMany()).forEach(m => municipioMap.set(m.clave, m.id));

  // 3. COMUNIDADES
  console.log('🏘️  Procesando Comunidades...');
  const comunidadesRaw = (await readCsv(FILE_COMUNIDADES))
    .filter(r => r['CVE_ENT'] && r['CVE_MUN'] && r['NOM_LOC'])
    .map(r => {
      const claveM = pad(r['CVE_ENT'], 2) + pad(r['CVE_MUN'], 3);
      const nombre = r['NOM_LOC'].trim();
      return { 
        nombre, 
        slug: toSlug(nombre, `${claveM}-${pad(r['CVE_LOC'], 4)}`), 
        municipioId: municipioMap.get(claveM) 
      };
    }).filter(c => c.municipioId);

  const comboSeen = new Set<string>();
  const comunidadesUnicas = comunidadesRaw.filter(c => {
    const key = `${c.municipioId}-${c.nombre.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "")}`;
    if (comboSeen.has(key)) return false;
    comboSeen.add(key);
    return true;
  });

  for (let i = 0; i < comunidadesUnicas.length; i += 2000) {
    await prisma.comunidad.createMany({
      data: comunidadesUnicas.slice(i, i + 2000) as any,
      skipDuplicates: true,
    });
  }

  // 4. CÓDIGOS POSTALES (SEPOMEX) - LÓGICA REPARADA
  console.log('Procesando Códigos Postales (CP.txt)...');
  
  const cpRows: any[] = [];
  const rlCP = readline.createInterface({
    input: fs.createReadStream(FILE_CP, { encoding: 'latin1' }),
    crlfDelay: Infinity,
  });

  let cpHeaders: string[] = [];
  for await (const line of rlCP) {
    // Saltamos avisos legales hasta encontrar la cabecera real
    if (!cpHeaders.length) {
      if (line.includes('d_codigo')) {
        cpHeaders = line.split('|').map(h => h.trim());
      }
      continue;
    }

    const values = line.split('|');
    if (values.length < 10) continue;

    const row: any = {};
    cpHeaders.forEach((h, i) => { row[h] = values[i] || ''; });
    
    const claveM = pad(row['c_estado'], 2) + pad(row['c_mnpio'], 3);
    const mId = municipioMap.get(claveM);

    if (mId) {
      cpRows.push({
        codigo: pad(row['d_codigo'], 5),
        colonia: row['d_asenta'].trim(),
        municipioId: mId
      });
    }
  }

  console.log(`   Insertando ${cpRows.length} códigos postales...`);
  for (let i = 0; i < cpRows.length; i += 5000) {
    await prisma.codigoPostal.createMany({
      data: cpRows.slice(i, i + 5000),
      skipDuplicates: true,
    });
    process.stdout.write(`\r   Progreso CP: ${Math.min(i + 5000, cpRows.length)}/${cpRows.length}`);
  }

  console.log('\n\n✅ Seed completado con éxito.');
}

main()
  .catch(e => { console.error('\n❌ Error:', e); process.exit(1); })
  .finally(() => prisma.$disconnect());