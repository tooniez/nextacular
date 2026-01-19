import prisma from '@/prisma/index';

export const getWorkspacePaths = async () => {
  const items = await prisma.workspace.findMany({
    select: {
      slug: true,
      domains: { select: { name: true }, where: { deletedAt: null } },
    },
    where: { deletedAt: null },
  });

  const paths = [];
  for (const ws of items) {
    if (ws.slug) paths.push({ params: { site: ws.slug } });
    for (const d of ws.domains || []) {
      if (d?.name) paths.push({ params: { site: d.name } });
    }
  }
  return paths;
};

export const getSiteWorkspace = async (site, isDomain) => {
  const siteStr = String(site || '').trim();
  if (!siteStr) return null;

  const domainOrSlug = isDomain ? [{ domains: { some: { deletedAt: null, name: siteStr } } }] : [{ slug: siteStr }];

  return await prisma.workspace.findFirst({
    select: {
      id: true,
      name: true,
      slug: true,
      workspaceCode: true,
      inviteCode: true,
      creatorId: true,
      domains: { select: { name: true }, where: { deletedAt: null } },
    },
    where: {
      deletedAt: null,
      OR: domainOrSlug,
    },
  });
};

export const getWorkspace = async (slug) => {
  const s = String(slug || '').trim();
  if (!s) return null;
  return await prisma.workspace.findFirst({
    where: { deletedAt: null, slug: s },
    include: {
      domains: { where: { deletedAt: null } },
      members: { where: { deletedAt: null } },
    },
  });
};

export const isWorkspaceCreator = async (userId, workspaceSlug) => {
  const ws = await prisma.workspace.findFirst({
    select: { creatorId: true },
    where: { deletedAt: null, slug: String(workspaceSlug || '').trim() },
  });
  return Boolean(ws && userId && ws.creatorId === userId);
};

export const isWorkspaceOwner = async (userId, email, workspaceSlug) => {
  const slug = String(workspaceSlug || '').trim();
  const ws = await prisma.workspace.findFirst({
    select: { id: true, creatorId: true },
    where: { deletedAt: null, slug },
  });
  if (!ws) return false;
  if (userId && ws.creatorId === userId) return true;

  if (!email) return false;
  const m = await prisma.member.findFirst({
    select: { teamRole: true, status: true, deletedAt: true },
    where: {
      deletedAt: null,
      workspaceId: ws.id,
      email: String(email || '').toLowerCase().trim(),
      status: 'ACCEPTED',
      teamRole: { in: ['OWNER', 'ADMIN', 'SUPER_ADMIN'] },
    },
  });
  return Boolean(m);
};

export const getInvitation = async (inviteCode) => {
  const code = String(inviteCode || '').trim();
  if (!code) return null;
  const ws = await prisma.workspace.findFirst({
    select: { name: true, workspaceCode: true },
    where: { deletedAt: null, inviteCode: code, isActive: true, isSuspended: false },
  });
  return ws || null;
};

export const getWorkspaces = async (userId, email) => {
  const e = String(email || '').toLowerCase().trim();
  return await prisma.workspace.findMany({
    where: {
      deletedAt: null,
      OR: [
        userId ? { creatorId: userId } : undefined,
        e
          ? {
              members: {
                some: { deletedAt: null, email: e, status: 'ACCEPTED' },
              },
            }
          : undefined,
      ].filter(Boolean),
    },
    select: { id: true, name: true, slug: true, brandLogoUrl: true, createdAt: true, updatedAt: true },
    orderBy: { createdAt: 'desc' },
  });
};

export const createWorkspace = async (userId, email, name, slug) => {
  const e = String(email || '').toLowerCase().trim();
  const ws = await prisma.workspace.create({
    data: {
      creatorId: userId,
      name,
      slug,
      members: e
        ? {
            create: {
              email: e,
              inviter: e,
              status: 'ACCEPTED',
              teamRole: 'OWNER',
              joinedAt: new Date(),
            },
          }
        : undefined,
    },
  });
  return ws;
};

export const updateName = async (workspaceSlug, name) => {
  return await prisma.workspace.update({
    where: { slug: String(workspaceSlug || '').trim() },
    data: { name },
  });
};

export const updateSlug = async (workspaceSlug, slug) => {
  return await prisma.workspace.update({
    where: { slug: String(workspaceSlug || '').trim() },
    data: { slug },
  });
};

export const deleteWorkspace = async (workspaceSlug) => {
  return await prisma.workspace.update({
    where: { slug: String(workspaceSlug || '').trim() },
    data: { deletedAt: new Date() },
  });
};

export const inviteUsers = async (workspaceId, inviterEmail, emails = [], teamRole = 'MEMBER') => {
  const inviter = String(inviterEmail || '').toLowerCase().trim();
  const uniq = Array.from(new Set((emails || []).map((e) => String(e || '').toLowerCase().trim()).filter(Boolean)));
  if (!uniq.length) return [];

  const created = [];
  for (const email of uniq) {
    const m = await prisma.member.upsert({
      where: { workspaceId_email: { workspaceId, email } },
      update: { deletedAt: null, inviter, status: 'PENDING', teamRole },
      create: { workspaceId, email, inviter, status: 'PENDING', teamRole },
    });
    created.push(m);
  }
  return created;
};

export const joinWorkspace = async (workspaceCode, userEmail) => {
  const code = String(workspaceCode || '').trim();
  const email = String(userEmail || '').toLowerCase().trim();
  const ws = await prisma.workspace.findFirst({ select: { id: true }, where: { deletedAt: null, workspaceCode: code } });
  if (!ws) return null;

  return await prisma.member.update({
    where: { workspaceId_email: { workspaceId: ws.id, email } },
    data: { status: 'ACCEPTED', joinedAt: new Date(), deletedAt: null },
  });
};

