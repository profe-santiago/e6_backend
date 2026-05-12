import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma  = new PrismaClient({ adapter });

function toSlug(text: string, suffix: string): string {
  return (
    text.toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9\s-]/g, '')
      .trim()
      .replace(/\s+/g, '-') +
    '-' + suffix
  );
}

async function main() {
  // Obtener municipio Oaxaca de Juárez
  const municipio = await prisma.municipio.findUnique({
    where: { clave: '20067' },
  });

  if (!municipio) {
    console.error('No se encontró el municipio de Oaxaca de Juárez');
    process.exit(1);
  }

  console.log(`Municipio encontrado: ${municipio.nombre} (ID: ${municipio.id})`);

  // Obtener colonias del código postal de Oaxaca de Juárez
  const colonias = await prisma.codigoPostal.findMany({
    where: { municipioId: municipio.id },
    orderBy: { colonia: 'asc' },
  });

  console.log(`Colonias encontradas: ${colonias.length}`);

  let creadas   = 0;
  let omitidas  = 0;

  for (const colonia of colonias) {
    const nombre = colonia.colonia.trim();
    const slug   = toSlug(nombre, `${municipio.id}-${colonia.id}`);

    // Verifica si ya existe
    const existe = await prisma.comunidad.findFirst({
      where: { municipioId: municipio.id, nombre },
    });

    if (existe) {
      omitidas++;
      continue;
    }

    await prisma.comunidad.create({
      data: {
        nombre,
        slug,
        municipioId: municipio.id,
        cpId:        colonia.id,
        status:      'PENDIENTE',
        color:       '#3B82F6',
      },
    });

    creadas++;
    process.stdout.write(`\r Creadas: ${creadas} | Omitidas: ${omitidas}`);
  }

  console.log(`\n\n✅ Listo — ${creadas} comunidades creadas, ${omitidas} ya existían`);
}

main()
  .catch(e => { console.error('\n❌ Error:', e); process.exit(1); })
  .finally(() => prisma.$disconnect());