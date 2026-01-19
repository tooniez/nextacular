/**
 * Workspace Admin Service
 * Handles Super Admin operations on Workspaces
 */

import prisma from '@/prisma/index';

/**
 * Get all workspaces with filters (Super Admin)
 * @param {object} filters - Filters
 * @returns {Promise<object>} Workspaces with pagination
 */
async function getWorkspaces(filters = {}) {
  const {
    status = 'all', // all, active, suspended
    search = '',
    page = 1,
    pageSize = 20,
  } = filters;

  const where = {
    deletedAt: null,
  };

  // Status filter
  if (status === 'active') {
    where.isActive = true;
    where.isSuspended = false;
  } else if (status === 'suspended') {
    where.isSuspended = true;
  }

  // Search filter
  if (search) {
    where.OR = [
      { name: { contains: search, mode: 'insensitive' } },
      { slug: { contains: search, mode: 'insensitive' } },
    ];
  }

  const skip = (page - 1) * pageSize;

  const [workspaces, total] = await Promise.all([
    prisma.workspace.findMany({
      where,
      select: {
        id: true,
        name: true,
        slug: true,
        isActive: true,
        isSuspended: true,
        defaultMsFeePercent: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
      skip,
      take: pageSize,
    }),
    prisma.workspace.count({ where }),
  ]);

  return {
    data: workspaces,
    pagination: {
      page,
      pageSize,
      total,
      totalPages: Math.ceil(total / pageSize),
    },
  };
}

/**
 * Get workspace by ID (Super Admin)
 * @param {string} workspaceId - Workspace ID
 * @returns {Promise<object>} Workspace
 */
async function getWorkspaceById(workspaceId) {
  const workspace = await prisma.workspace.findUnique({
    where: { id: workspaceId },
    select: {
      id: true,
      name: true,
      slug: true,
      createdAt: true,
      updatedAt: true,
      // Economic settings
      defaultMsFeePercent: true,
      defaultSubCpoSharePercent: true,
      perSessionStartFeeCents: true,
      gracePeriodMinutes: true,
      overstayFeeCentsPerMinute: true,
      hubjectPriceOverrides: true,
      // Operational settings
      isActive: true,
      isSuspended: true,
      suspendedAt: true,
      suspensionReason: true,
      // Creator info
      creator: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
    },
  });

  return workspace;
}

/**
 * Update workspace settings (Super Admin)
 * @param {string} workspaceId - Workspace ID
 * @param {object} updates - Updates
 * @param {string} changedByUserId - User ID making the change
 * @param {string} reason - Reason for change (optional)
 * @returns {Promise<object>} Updated workspace + history record
 */
async function updateWorkspaceSettings(workspaceId, updates, changedByUserId, reason = null) {
  // Get current values for history
  const current = await prisma.workspace.findUnique({
    where: { id: workspaceId },
    select: {
      defaultMsFeePercent: true,
      defaultSubCpoSharePercent: true,
      perSessionStartFeeCents: true,
      gracePeriodMinutes: true,
      overstayFeeCentsPerMinute: true,
      hubjectPriceOverrides: true,
      isActive: true,
      isSuspended: true,
      suspendedAt: true,
      suspensionReason: true,
    },
  });

  if (!current) {
    throw new Error(`Workspace ${workspaceId} not found`);
  }

  // Validate updates
  if (updates.defaultMsFeePercent !== undefined) {
    if (updates.defaultMsFeePercent < 0 || updates.defaultMsFeePercent > 100) {
      throw new Error('defaultMsFeePercent must be between 0 and 100');
    }
    // Auto-calculate subCpoSharePercent if not provided
    if (updates.defaultSubCpoSharePercent === undefined) {
      updates.defaultSubCpoSharePercent = 100 - updates.defaultMsFeePercent;
    }
  }

  if (updates.perSessionStartFeeCents !== undefined && updates.perSessionStartFeeCents < 0) {
    throw new Error('perSessionStartFeeCents must be >= 0');
  }

  if (updates.gracePeriodMinutes !== undefined && updates.gracePeriodMinutes < 0) {
    throw new Error('gracePeriodMinutes must be >= 0');
  }

  if (updates.overstayFeeCentsPerMinute !== undefined && updates.overstayFeeCentsPerMinute < 0) {
    throw new Error('overstayFeeCentsPerMinute must be >= 0');
  }

  if (updates.hubjectPriceOverrides !== undefined && updates.hubjectPriceOverrides !== null) {
    try {
      JSON.parse(updates.hubjectPriceOverrides);
    } catch (e) {
      throw new Error('hubjectPriceOverrides must be valid JSON');
    }
  }

  // Handle suspension
  if (updates.isSuspended === true && !current.isSuspended) {
    updates.suspendedAt = new Date();
  } else if (updates.isSuspended === false && current.isSuspended) {
    updates.suspendedAt = null;
    updates.suspensionReason = null;
  }

  // Prepare old and new values for history
  const oldValues = {
    defaultMsFeePercent: current.defaultMsFeePercent,
    defaultSubCpoSharePercent: current.defaultSubCpoSharePercent,
    perSessionStartFeeCents: current.perSessionStartFeeCents,
    gracePeriodMinutes: current.gracePeriodMinutes,
    overstayFeeCentsPerMinute: current.overstayFeeCentsPerMinute,
    hubjectPriceOverrides: current.hubjectPriceOverrides,
    isActive: current.isActive,
    isSuspended: current.isSuspended,
    suspendedAt: current.suspendedAt,
    suspensionReason: current.suspensionReason,
  };

  const newValues = {
    ...oldValues,
    ...updates,
  };

  // Update workspace
  const updated = await prisma.workspace.update({
    where: { id: workspaceId },
    data: updates,
    select: {
      id: true,
      name: true,
      slug: true,
      defaultMsFeePercent: true,
      defaultSubCpoSharePercent: true,
      perSessionStartFeeCents: true,
      gracePeriodMinutes: true,
      overstayFeeCentsPerMinute: true,
      hubjectPriceOverrides: true,
      isActive: true,
      isSuspended: true,
      suspendedAt: true,
      suspensionReason: true,
      updatedAt: true,
    },
  });

  // Create history record
  const history = await prisma.workspaceFeePolicyHistory.create({
    data: {
      workspaceId,
      changedByUserId,
      oldValues,
      newValues,
      reason,
    },
  });

  return {
    workspace: updated,
    historyId: history.id,
  };
}

export {
  getWorkspaces,
  getWorkspaceById,
  updateWorkspaceSettings,
};
