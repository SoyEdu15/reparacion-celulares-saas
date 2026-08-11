import { hash } from '@node-rs/argon2';
import { dbAdmin } from '../src/lib/db';

async function upsertTenant(subdominio: string, nombreComercial: string) {
  const tenant = await dbAdmin.tenant.upsert({
    where: { subdominio },
    update: {},
    create: {
      subdominio,
      nombreComercial,
      estado: 'ACTIVO',
      whatsappContactoSoporte: '+573000000000',
    },
  });

  const passwordHash = await hash('password123');

  const dueno = await dbAdmin.usuario.upsert({
    where: { tenantId_email: { tenantId: tenant.id, email: `dueno@${subdominio}.test` } },
    update: {},
    create: {
      tenantId: tenant.id,
      rol: 'DUENO',
      nombre: `Dueño ${nombreComercial}`,
      email: `dueno@${subdominio}.test`,
      passwordHash,
    },
  });

  const tecnico = await dbAdmin.usuario.upsert({
    where: { tenantId_email: { tenantId: tenant.id, email: `tecnico@${subdominio}.test` } },
    update: {},
    create: {
      tenantId: tenant.id,
      rol: 'TECNICO',
      nombre: `Técnico ${nombreComercial}`,
      email: `tecnico@${subdominio}.test`,
      passwordHash,
    },
  });

  const cliente = await dbAdmin.cliente.create({
    data: {
      tenantId: tenant.id,
      nombre: `Cliente de prueba ${nombreComercial}`,
      telefono: '3001234567',
      cedula: '1000000000',
    },
  });

  return { tenant, dueno, tecnico, cliente };
}

async function main() {
  const t1 = await upsertTenant('tallerdemo1', 'Taller Demo 1');
  const t2 = await upsertTenant('tallerdemo2', 'Taller Demo 2');

  console.log('Tenants de prueba creados:');
  for (const { tenant, dueno, tecnico, cliente } of [t1, t2]) {
    console.log(`\n${tenant.nombreComercial} — http://${tenant.subdominio}.localhost:3000`);
    console.log(`  tenant.id: ${tenant.id}`);
    console.log(`  dueño:   ${dueno.email} / password123`);
    console.log(`  técnico: ${tecnico.email} / password123`);
    console.log(`  cliente de prueba: ${cliente.nombre} (${cliente.id})`);
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await dbAdmin.$disconnect();
  });
