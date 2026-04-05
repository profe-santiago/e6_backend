import 'dotenv/config';
import bcrypt from 'bcryptjs';
import { prisma } from '../src/lib/prisma';

async function main() {
  const passwordHash = await bcrypt.hash('SuperAdmin2024!', 10);

  const superadmin = await prisma.usuario.create({
    data: {
      email:        'superadmin@irsu.mx',
      passwordHash,
      nombre:       'Super Administrador',
      rol:          'SUPER_ADMIN',
      activo:       true,
    },
  });

  console.log('SUPER_ADMIN creado:', superadmin.email);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());