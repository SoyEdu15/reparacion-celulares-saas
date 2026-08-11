import { dbAdmin, dbTenant } from '../src/lib/db';
import { withTenant } from '../src/lib/rls';

let failures = 0;

function check(label: string, condition: boolean) {
  if (condition) {
    console.log(`  OK   ${label}`);
  } else {
    console.error(`  FAIL ${label}`);
    failures++;
  }
}

async function main() {
  const t1 = await dbAdmin.tenant.findUniqueOrThrow({ where: { subdominio: 'tallerdemo1' } });
  const t2 = await dbAdmin.tenant.findUniqueOrThrow({ where: { subdominio: 'tallerdemo2' } });
  const clienteT2 = await dbAdmin.cliente.findFirstOrThrow({ where: { tenantId: t2.id } });

  console.log('\n1. Sin app.tenant_id seteado (rol app_tenant, fuera de withTenant): debe fallar cerrado');
  const sinContexto = await dbTenant.cliente.findMany();
  check('0 filas visibles sin contexto de tenant', sinContexto.length === 0);

  console.log('\n2. withTenant(tenant1) solo ve datos de tenant1');
  const clientesT1 = await withTenant(t1.id, (tx) => tx.cliente.findMany());
  check(`todas las filas pertenecen a tenant1 (${clientesT1.length} fila(s))`, clientesT1.every((c) => c.tenantId === t1.id));
  check('no aparece ningún cliente de tenant2', !clientesT1.some((c) => c.tenantId === t2.id));

  console.log('\n3. withTenant(tenant1) no puede leer por ID una fila de tenant2 (aunque la app tenga un bug y la pida)');
  const fugaPorId = await withTenant(t1.id, (tx) => tx.cliente.findUnique({ where: { id: clienteT2.id } }));
  check('findUnique de un id de tenant2 devuelve null bajo el contexto de tenant1', fugaPorId === null);

  console.log('\n4. tabla tenants: withTenant(tenant1) solo ve su propia fila, no la lista completa');
  const tenantsVisibles = await withTenant(t1.id, (tx) => tx.tenant.findMany());
  check('exactamente 1 fila visible', tenantsVisibles.length === 1);
  check('es la fila de tenant1', tenantsVisibles[0]?.id === t1.id);

  console.log('\n5. WITH CHECK: no se puede insertar una fila de tenant2 bajo el contexto de tenant1');
  let insertBloqueado = false;
  try {
    await withTenant(t1.id, (tx) =>
      tx.cliente.create({
        data: { tenantId: t2.id, nombre: 'Fuga cross-tenant', telefono: '3000000000' },
      }),
    );
  } catch {
    insertBloqueado = true;
  }
  check('el INSERT con tenant_id ajeno fue rechazado por RLS', insertBloqueado);

  console.log('\n6. app_admin (BYPASSRLS) sigue viendo todos los tenants — necesario para jobs cross-tenant y super-admin');
  const todosLosTenants = await dbAdmin.tenant.findMany();
  check('ve ambos tenants de prueba', todosLosTenants.some((t) => t.id === t1.id) && todosLosTenants.some((t) => t.id === t2.id));

  console.log(failures === 0 ? '\nAislamiento multi-tenant verificado correctamente.\n' : `\n${failures} verificación(es) fallaron.\n`);
  process.exit(failures === 0 ? 0 : 1);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await dbAdmin.$disconnect();
    await dbTenant.$disconnect();
  });
