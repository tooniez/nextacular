/* eslint-disable no-console */
/**
 * Create/update demo accounts for local/dev environments.
 *
 * Creates:
 * - SUPER ADMIN (platform)   -> users + members.teamRole=SUPER_ADMIN
 * - SUB-CPO ADMIN (platform) -> users + workspace demo-cpo + members.teamRole=OWNER
 * - DRIVER (end user)        -> endUsers
 *
 * Run:
 *   cd /opt/nextacular
 *   node scripts/setup-demo-accounts.js
 */

const bcrypt = require('bcryptjs');
const { PrismaClient, InvitationStatus, TeamRole } = require('@prisma/client');

const prisma = new PrismaClient();

const DEMO_PASSWORD = 'Demo1234!';
const DEMO = {
  superAdmin: { email: 'superadmin@demo.local', name: 'Super Admin Demo' },
  subCpo: { email: 'subcpo@demo.local', name: 'Sub‑CPO Admin Demo', workspace: { slug: 'demo-cpo', name: 'Demo CPO' } },
  driver: { email: 'driver@demo.local', name: 'Driver Demo' },
};

async function upsertPlatformUser({ email, name, password }) {
  const passwordHash = await bcrypt.hash(String(password), 10);
  const user = await prisma.user.upsert({
    where: { email },
    update: {
      name,
      passwordHash,
      deletedAt: null,
    },
    create: {
      email,
      name,
      passwordHash,
    },
    select: { id: true, email: true },
  });
  return user;
}

async function upsertWorkspace({ creatorId, slug, name }) {
  // NOTE: Workspace.slug is NOT unique in this schema, so we can't use upsert by slug.
  const existing = await prisma.workspace.findFirst({
    where: { slug },
    select: { id: true },
  });
  if (existing?.id) {
    return await prisma.workspace.update({
      where: { id: existing.id },
      data: {
        name,
        slug,
        deletedAt: null,
        isActive: true,
        isSuspended: false,
        suspendedAt: null,
        suspensionReason: null,
      },
      select: { id: true, slug: true, name: true },
    });
  }
  return await prisma.workspace.create({
    data: {
      creatorId,
      slug,
      name,
      isActive: true,
      isSuspended: false,
    },
    select: { id: true, slug: true, name: true },
  });
}

async function upsertMember({ workspaceId, email, inviterEmail, teamRole }) {
  const m = await prisma.member.upsert({
    where: { workspaceId_email: { workspaceId, email } },
    update: {
      deletedAt: null,
      status: InvitationStatus.ACCEPTED,
      joinedAt: new Date(),
      inviter: inviterEmail,
      teamRole,
    },
    create: {
      workspaceId,
      email,
      inviter: inviterEmail,
      status: InvitationStatus.ACCEPTED,
      joinedAt: new Date(),
      teamRole,
    },
    select: { id: true, email: true, teamRole: true, status: true, workspaceId: true },
  });
  return m;
}

async function upsertDriver({ email, name, password }) {
  const passwordHash = await bcrypt.hash(String(password), 10);
  const u = await prisma.endUser.upsert({
    where: { email },
    update: {
      name,
      passwordHash,
      status: 'ACTIVE',
      deletedAt: null,
    },
    create: {
      email,
      name,
      passwordHash,
      status: 'ACTIVE',
      rfidBalanceCents: 2500,
    },
    select: { id: true, email: true, status: true },
  });
  return u;
}

async function main() {
  const superAdminUser = await upsertPlatformUser({
    email: DEMO.superAdmin.email,
    name: DEMO.superAdmin.name,
    password: DEMO_PASSWORD,
  });

  const subCpoUser = await upsertPlatformUser({
    email: DEMO.subCpo.email,
    name: DEMO.subCpo.name,
    password: DEMO_PASSWORD,
  });

  const subCpoWs = await upsertWorkspace({
    creatorId: subCpoUser.id,
    slug: DEMO.subCpo.workspace.slug,
    name: DEMO.subCpo.workspace.name,
  });

  // Sub‑CPO gets OWNER role in its workspace
  await upsertMember({
    workspaceId: subCpoWs.id,
    email: subCpoUser.email,
    inviterEmail: subCpoUser.email,
    teamRole: TeamRole.OWNER,
  });

  // Super admin membership (db-based), put it in the same workspace
  await upsertMember({
    workspaceId: subCpoWs.id,
    email: superAdminUser.email,
    inviterEmail: superAdminUser.email,
    teamRole: TeamRole.SUPER_ADMIN,
  });

  const driverUser = await upsertDriver({
    email: DEMO.driver.email,
    name: DEMO.driver.name,
    password: DEMO_PASSWORD,
  });

  console.log('\n✅ Demo accounts ready\n');
  console.log('Login URL:', 'https://89.46.70.101:3443/auth/login');
  console.log('\nPlatform (Super Admin):');
  console.log('  email:', superAdminUser.email);
  console.log('  password:', DEMO_PASSWORD);
  console.log('\nPlatform (Sub‑CPO Admin):');
  console.log('  email:', subCpoUser.email);
  console.log('  password:', DEMO_PASSWORD);
  console.log('  workspace:', `/account/${subCpoWs.slug}`);
  console.log('\nDriver:');
  console.log('  email:', driverUser.email);
  console.log('  password:', DEMO_PASSWORD);
  console.log('  after login:', '/driver/map');
  console.log('');
}

main()
  .catch((e) => {
    console.error('❌ setup-demo-accounts failed:', e?.message || e);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect().catch(() => {});
  });

