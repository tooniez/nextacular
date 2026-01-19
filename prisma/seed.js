const {
  PrismaClient,
  InvitationStatus,
  TeamRole,
  StationStatus,
  ConnectorStatus,
  SessionStatus,
  BillingStatus,
  PaymentStatus,
  PayoutStatus,
  ClearingStatus,
  RoamingType,
} = require('@prisma/client');

const prisma = new PrismaClient();

const main = async () => {
  // #region agent log
  try {
    fetch('http://localhost:7242/ingest/63d3e4d3-5a4a-4343-8839-58d002db9a84', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sessionId: 'debug-session',
        runId: 'seed-demo',
        hypothesisId: 'H1',
        location: 'prisma/seed.js',
        message: 'seed start',
        data: { ts: Date.now() },
        timestamp: Date.now(),
      }),
    }).catch(() => {});
  } catch {}
  // #endregion

  // 1. Create or get admin user
  const user = await prisma.user.upsert({
    create: { 
      email: process.env.ADMIN_EMAIL || 'admin@example.com',
      name: 'Admin User'
    },
    update: {},
    where: { email: process.env.ADMIN_EMAIL || 'admin@example.com' },
  });
  console.info('✓ User:', user.email);

  // Demo platform users (for Credentials login)
  const bcrypt = require('bcryptjs');
  const superAdminEmail = process.env.DEMO_SUPERADMIN_EMAIL || 'superadmin@m-solution.local';
  const subCpoEmail = process.env.DEMO_SUBCPO_EMAIL || 'subcpo@m-solution.local';
  const superAdminPassword = process.env.DEMO_SUPERADMIN_PASSWORD || 'Admin1234!';
  const subCpoPassword = process.env.DEMO_SUBCPO_PASSWORD || 'Subcpo1234!';
  const [superAdminHash, subCpoHash] = await Promise.all([
    bcrypt.hash(superAdminPassword, 10),
    bcrypt.hash(subCpoPassword, 10),
  ]);

  const superAdminUser = await prisma.user.upsert({
    where: { email: superAdminEmail },
    update: { passwordHash: superAdminHash, name: 'Super Admin (Demo)' },
    create: { email: superAdminEmail, passwordHash: superAdminHash, name: 'Super Admin (Demo)' },
  });
  const subCpoUser = await prisma.user.upsert({
    where: { email: subCpoEmail },
    update: { passwordHash: subCpoHash, name: 'Sub-CPO (Demo)' },
    create: { email: subCpoEmail, passwordHash: subCpoHash, name: 'Sub-CPO (Demo)' },
  });
  console.info('✓ Demo Users:', superAdminUser.email, subCpoUser.email);

  // 2. Create or get demo workspace (Sub-CPO)
  let workspace = await prisma.workspace.findFirst({
    where: { 
      slug: 'demo-cpo',
      deletedAt: null,
    },
    include: {
      members: true,
    },
  });

  if (!workspace) {
    workspace = await prisma.workspace.create({
      data: {
        creatorId: superAdminUser.id,
        name: 'Demo CPO',
        slug: 'demo-cpo',
        contactWebsiteUrl: 'https://demo-cpo.example',
        contactEmail: 'support@demo-cpo.example',
        contactPhone: '+39 02 0000 0000',
        members: {
          create: {
            email: subCpoUser.email,
            inviter: superAdminUser.email,
            status: InvitationStatus.ACCEPTED,
            teamRole: TeamRole.ADMIN,
          },
        },
      },
      include: {
        members: true,
      },
    });
  }
  console.info('✓ Workspace:', workspace.name);

  // Keep contact fields in sync (idempotent)
  workspace = await prisma.workspace.update({
    where: { id: workspace.id },
    data: {
      contactWebsiteUrl: 'https://demo-cpo.example',
      contactEmail: 'support@demo-cpo.example',
      contactPhone: '+39 02 0000 0000',
      brandLogoUrl: 'https://placehold.co/240x80/png?text=DEMO+CPO',
    },
  });

  // Ensure Sub-CPO membership exists (idempotent)
  await prisma.member.upsert({
    where: { workspaceId_email: { workspaceId: workspace.id, email: subCpoUser.email } },
    update: { deletedAt: null, status: InvitationStatus.ACCEPTED, teamRole: TeamRole.ADMIN, inviter: superAdminUser.email },
    create: {
      workspaceId: workspace.id,
      email: subCpoUser.email,
      inviter: superAdminUser.email,
      status: InvitationStatus.ACCEPTED,
      teamRole: TeamRole.ADMIN,
    },
  });

  // 2b. Create second demo workspace
  let workspace2 = await prisma.workspace.findFirst({
    where: {
      slug: 'est-workspace',
      deletedAt: null,
    },
    include: { members: true },
  });

  if (!workspace2) {
    workspace2 = await prisma.workspace.create({
      data: {
        creatorId: user.id,
        name: 'EST Workspace',
        slug: 'est-workspace',
        members: {
          create: {
            email: user.email,
            inviter: user.email,
            status: InvitationStatus.ACCEPTED,
            teamRole: TeamRole.OWNER,
          },
        },
      },
      include: { members: true },
    });
  }
  console.info('✓ Workspace 2:', workspace2.name);

  // 3. Create demo charging station
  const station = await prisma.chargingStation.upsert({
    where: {
      workspaceId_ocppId: {
        workspaceId: workspace.id,
        ocppId: 'CP001',
      },
    },
    update: {},
    create: {
      workspaceId: workspace.id,
      ocppId: 'CP001',
      name: 'Demo Charging Station 1',
      location: 'Via Roma 1, Milano',
      latitude: 45.4642,
      longitude: 9.1900,
      status: StationStatus.AVAILABLE,
      ocppVersion: '2.0.1',
    },
  });
  console.info('✓ Charging Station:', station.name);

  // 3b. Create more demo stations
  const station2 = await prisma.chargingStation.upsert({
    where: {
      workspaceId_ocppId: {
        workspaceId: workspace.id,
        ocppId: 'CP002',
      },
    },
    update: {},
    create: {
      workspaceId: workspace.id,
      ocppId: 'CP002',
      name: 'Demo Charging Station 2',
      location: 'Corso Italia 10, Roma',
      latitude: 41.9028,
      longitude: 12.4964,
      status: StationStatus.AVAILABLE,
      ocppVersion: '1.6J',
      logoUrl: null,
      photoUrls: [],
      rfidWhitelist: [],
    },
  });
  console.info('✓ Charging Station:', station2.name);

  const station3 = await prisma.chargingStation.upsert({
    where: {
      workspaceId_ocppId: {
        workspaceId: workspace2.id,
        ocppId: 'EST001',
      },
    },
    update: {},
    create: {
      workspaceId: workspace2.id,
      ocppId: 'EST001',
      name: 'EST Station 1',
      location: 'Via Napoli 5, Torino',
      latitude: 45.0703,
      longitude: 7.6869,
      status: StationStatus.AVAILABLE,
      ocppVersion: '2.0.1',
      logoUrl: null,
      photoUrls: [],
      rfidWhitelist: [
        {
          id: 'seed-card-1',
          uid: 'RFID123456',
          name: 'Demo Driver',
          type: 'Digitale',
          addedAt: new Date().toISOString(),
        },
      ],
    },
  });
  console.info('✓ Charging Station:', station3.name);

  // 4. Create demo connector
  const connector = await prisma.connector.upsert({
    where: {
      stationId_connectorId: {
        stationId: station.id,
        connectorId: 1,
      },
    },
    update: {},
    create: {
      stationId: station.id,
      connectorId: 1,
      name: 'Connector 1',
      status: ConnectorStatus.AVAILABLE,
      maxPower: 22.0, // 22 kW
      connectorType: 'Type2',
    },
  });
  console.info('✓ Connector:', connector.name);

  // 4b. Connectors for additional stations
  await prisma.connector.upsert({
    where: {
      stationId_connectorId: { stationId: station2.id, connectorId: 1 },
    },
    update: {},
    create: {
      stationId: station2.id,
      connectorId: 1,
      name: 'Connector 1',
      status: ConnectorStatus.AVAILABLE,
      maxPower: 50.0,
      connectorType: 'CCS',
    },
  });

  await prisma.connector.upsert({
    where: {
      stationId_connectorId: { stationId: station3.id, connectorId: 1 },
    },
    update: {},
    create: {
      stationId: station3.id,
      connectorId: 1,
      name: 'Connector 1',
      status: ConnectorStatus.AVAILABLE,
      maxPower: 22.0,
      connectorType: 'Type2',
    },
  });

  // 5. Create demo tariff profile
  let tariff = await prisma.tariffProfile.findFirst({
    where: {
      workspaceId: workspace.id,
      name: 'Default Tariff',
      deletedAt: null,
    },
  });

  if (!tariff) {
    tariff = await prisma.tariffProfile.create({
      data: {
        workspaceId: workspace.id,
        name: 'Default Tariff',
        basePricePerKwh: 0.45, // 0.45 EUR/kWh
        currency: 'EUR',
        msFeePercent: 15.0, // 15% MSolution fee
        version: 1,
        isActive: true,
        validFrom: new Date(),
      },
    });
  }
  console.info('✓ Tariff Profile:', tariff.name, `(${tariff.basePricePerKwh} EUR/kWh)`);

  // 5b. Second workspace tariff
  let tariff2 = await prisma.tariffProfile.findFirst({
    where: {
      workspaceId: workspace2.id,
      name: 'Default Tariff',
      deletedAt: null,
    },
  });
  if (!tariff2) {
    tariff2 = await prisma.tariffProfile.create({
      data: {
        workspaceId: workspace2.id,
        name: 'Default Tariff',
        basePricePerKwh: 0.55,
        currency: 'EUR',
        msFeePercent: 12.0,
        version: 1,
        isActive: true,
        validFrom: new Date(),
      },
    });
  }
  console.info('✓ Tariff Profile 2:', tariff2.name, `(${tariff2.basePricePerKwh} EUR/kWh)`);

  // 6. Create demo end user (global, not tied to workspace)
  const demoDriverPassword = process.env.DEMO_DRIVER_PASSWORD || 'driver12345';
  const demoDriverHash = await bcrypt.hash(demoDriverPassword, 10);

  const endUser = await prisma.endUser.upsert({
    where: { email: 'driver@example.com' },
    update: {
      passwordHash: demoDriverHash,
    },
    create: {
      email: 'driver@example.com',
      name: 'Demo Driver',
      phone: '+39 123 456 7890',
      rfidToken: 'RFID123456',
      passwordHash: demoDriverHash,
      consents: {
        privacy: true,
        terms: true,
        marketing: false,
        profiling: false,
        updatedAt: new Date().toISOString(),
      },
      status: 'ACTIVE',
    },
  });
  console.info('✓ End User:', endUser.email);

  // 6b. More end users
  const endUser2 = await prisma.endUser.upsert({
    where: { email: 'driver2@example.com' },
    update: {},
    create: {
      email: 'driver2@example.com',
      name: 'Demo Driver 2',
      phone: '+39 333 222 1111',
      rfidToken: 'RFID654321',
      rfidBalanceCents: 1500,
      status: 'ACTIVE',
    },
  });
  console.info('✓ End User:', endUser2.email);

  // Seed a couple of card recharges for UI
  const existingRecharge = await prisma.cardRecharge.findFirst({
    where: { cardSerial: endUser.rfidToken || 'RFID123456' },
  });
  if (!existingRecharge) {
    await prisma.$transaction([
      prisma.cardRecharge.create({
        data: {
          endUserId: endUser.id,
          cardSerial: endUser.rfidToken || 'RFID123456',
          amountCents: 2000,
          currency: 'EUR',
          status: 'COMPLETED',
          channel: 'manual',
          createdByEmail: user.email,
          createdByName: user.name,
        },
      }),
      prisma.endUser.update({
        where: { id: endUser.id },
        data: { rfidBalanceCents: { increment: 2000 } },
      }),
    ]);
    console.info('✓ CardRecharge seeded for', endUser.email);
  }

  // Seed vouchers
  await prisma.voucher.upsert({
    where: { code: 'WELCOME10' },
    update: { isActive: true },
    create: {
      code: 'WELCOME10',
      amountCents: 1000,
      currency: 'EUR',
      isActive: true,
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    },
  });
  await prisma.voucher.upsert({
    where: { code: 'WELCOME5' },
    update: { isActive: true },
    create: {
      code: 'WELCOME5',
      amountCents: 500,
      currency: 'EUR',
      isActive: true,
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    },
  });
  console.info('✓ Vouchers seeded: WELCOME10, WELCOME5');

  // Seed a favorite station for demo driver (CP001)
  await prisma.favoriteStation.upsert({
    where: { endUserId_stationId: { endUserId: endUser.id, stationId: station.id } },
    update: {},
    create: { endUserId: endUser.id, stationId: station.id },
  });
  console.info('✓ FavoriteStation seeded for', endUser.email);

  // Seed a support ticket
  const existingTicket = await prisma.supportTicket.findFirst({ where: { endUserId: endUser.id } });
  if (!existingTicket) {
    await prisma.supportTicket.create({
      data: {
        endUserId: endUser.id,
        subject: 'Problema login (demo)',
        message: 'Questo è un ticket demo creato dal seed per popolare la sezione Assistenza.',
        status: 'OPEN',
      },
    });
    console.info('✓ SupportTicket seeded');
  }

  // 7. Create demo subscription plan (global template)
  let subscriptionPlan = await prisma.subscriptionPlan.findUnique({
    where: { planCode: 'basic-monthly' },
  });

  if (!subscriptionPlan) {
    subscriptionPlan = await prisma.subscriptionPlan.create({
      data: {
        planCode: 'basic-monthly',
        name: 'Basic Monthly Plan',
        description: 'Monthly subscription per charging station',
        monthlyFeePerStation: 29.99, // 29.99 EUR per station per month
        currency: 'EUR',
        isActive: true,
      },
    });
  }
  console.info('✓ Subscription Plan:', subscriptionPlan.name);

  // 8. Create demo organization subscription (optional)
  let orgSubscription = await prisma.organizationSubscription.findFirst({
    where: {
      workspaceId: workspace.id,
      stationId: station.id,
      status: 'ACTIVE',
    },
  });

  if (!orgSubscription) {
    orgSubscription = await prisma.organizationSubscription.create({
      data: {
        workspaceId: workspace.id,
        planId: subscriptionPlan.id,
        stationId: station.id, // Specific station subscription
        status: 'ACTIVE',
        activeFrom: new Date(),
        monthlyFee: subscriptionPlan.monthlyFeePerStation,
      },
    });
  }
  console.info('✓ Organization Subscription:', 'Active for station', station.name);

  // 9. Create demo charging sessions (completed + charging)
  const now = new Date();
  const daysAgo = (n) => new Date(now.getTime() - n * 24 * 60 * 60 * 1000);

  const pickStations = [
    { ws: workspace, station: station, connectorId: connector.id, tariff: tariff, endUser },
    { ws: workspace, station: station2, connectorId: (await prisma.connector.findFirst({ where: { stationId: station2.id, connectorId: 1 } })).id, tariff: tariff, endUser: endUser2 },
    { ws: workspace2, station: station3, connectorId: (await prisma.connector.findFirst({ where: { stationId: station3.id, connectorId: 1 } })).id, tariff: tariff2, endUser },
  ];

  const sessionsToCreate = [];
  for (let i = 1; i <= 12; i++) {
    const ref = pickStations[i % pickStations.length];
    const start = daysAgo(20 - i);
    const durationSeconds = 900 + i * 60; // 15-27 minutes
    const end = new Date(start.getTime() + durationSeconds * 1000);
    const energyKwh = 6 + i * 0.5;
    const pricePerKwh = ref.tariff.basePricePerKwh || 0.45;
    const gross = energyKwh * pricePerKwh;
    const msFee = (gross * (ref.tariff.msFeePercent || 15)) / 100;
    const subCpo = gross - msFee;
    const billedAt = end;
    const paidAt = end;

    // Add a couple of roaming sessions for Hubject stats demo
    const isRoamingInbound = i === 10;
    const isRoamingOutbound = i === 11;

    sessionsToCreate.push({
      id: `seed-session-${ref.ws.slug}-${i}`,
      workspaceId: ref.ws.id,
      stationId: ref.station.id,
      connectorId: ref.connectorId,
      endUserId: ref.endUser.id,
      startTime: start,
      endTime: end,
      durationSeconds,
      energyKwh,
      status: SessionStatus.COMPLETED,
      billingStatus: BillingStatus.BILLED,
      billedAt,
      paymentStatus: PaymentStatus.CAPTURED,
      paidAt,
      tariffSnapshotId: ref.tariff.id,
      tariffBasePricePerKwh: pricePerKwh,
      tariffMsFeePercent: ref.tariff.msFeePercent || 15,
      grossAmount: gross,
      msFeeAmount: msFee,
      subCpoEarningAmount: subCpo,
      currency: 'EUR',
      roamingType: isRoamingInbound ? RoamingType.INBOUND : isRoamingOutbound ? RoamingType.OUTBOUND : RoamingType.NONE,
      roamingProvider: (isRoamingInbound || isRoamingOutbound) ? 'HUBJECT' : null,
      hubjectSessionId: (isRoamingInbound || isRoamingOutbound) ? `HUBJECT-SEED-${ref.ws.slug}-${i}` : null,
      empId: isRoamingInbound ? 'EMP-DEMO' : null,
      cpoId: isRoamingOutbound ? 'CPO-DEMO' : null,
      roamingGrossAmount: (isRoamingInbound || isRoamingOutbound) ? gross : null,
      roamingNetAmount: isRoamingInbound ? subCpo : null,
      clearingStatus: isRoamingInbound ? ClearingStatus.SETTLED : ClearingStatus.PENDING,
      clearingSettledAt: isRoamingInbound ? end : null,
    });
  }

  // One charging session to test "stop"
  const chargingRef = pickStations[0];
  sessionsToCreate.push({
    id: `seed-session-${chargingRef.ws.slug}-charging`,
    workspaceId: chargingRef.ws.id,
    stationId: chargingRef.station.id,
    connectorId: chargingRef.connectorId,
    endUserId: chargingRef.endUser.id,
    startTime: new Date(now.getTime() - 10 * 60 * 1000),
    endTime: null,
    durationSeconds: null,
    energyKwh: 0.8,
    status: SessionStatus.CHARGING,
    billingStatus: BillingStatus.NOT_BILLED,
    paymentStatus: PaymentStatus.HOLD_OK,
    holdAmountCents: 5000,
    currency: 'EUR',
    roamingType: RoamingType.NONE,
    clearingStatus: ClearingStatus.PENDING,
  });

  for (const s of sessionsToCreate) {
    const existing = await prisma.chargingSession.findUnique({ where: { id: s.id } });
    if (!existing) {
      await prisma.chargingSession.create({ data: s });
    } else {
      // Keep seed idempotent but allow enriching existing records (e.g. roaming fields)
      const enrich = {};
      [
        'roamingType',
        'roamingProvider',
        'hubjectSessionId',
        'empId',
        'cpoId',
        'roamingGrossAmount',
        'roamingNetAmount',
        'clearingStatus',
        'clearingSettledAt',
      ].forEach((k) => {
        if (s[k] !== undefined && s[k] !== null) enrich[k] = s[k];
      });

      if (Object.keys(enrich).length > 0) {
        await prisma.chargingSession.update({
          where: { id: s.id },
          data: enrich,
        });
      }
    }
  }
  console.info(`✓ Charging Sessions: ensured ${sessionsToCreate.length}`);

  // 10. Create a payout statement per workspace (seeded, derived from billed+captured sessions)
  async function seedPayoutForWorkspace(ws) {
    const periodStart = daysAgo(30);
    const periodEnd = now;

    const eligible = await prisma.chargingSession.findMany({
      where: {
        workspaceId: ws.id,
        status: SessionStatus.COMPLETED,
        billingStatus: BillingStatus.BILLED,
        paymentStatus: PaymentStatus.CAPTURED,
        billedAt: { gte: periodStart, lte: periodEnd },
        payoutStatementId: null,
      },
      select: {
        id: true,
        startTime: true,
        energyKwh: true,
        grossAmount: true,
        msFeeAmount: true,
        subCpoEarningAmount: true,
        currency: true,
        station: { select: { name: true, ocppId: true } },
      },
      take: 200,
    });

    if (eligible.length === 0) return null;

    const statementId = `seed-payout-${ws.slug}`;
    const existingStatement = await prisma.payoutStatement.findUnique({ where: { id: statementId } });
    if (existingStatement) return existingStatement;

    const totals = eligible.reduce(
      (acc, s) => {
        acc.totalSessions += 1;
        acc.totalEnergyKwh += s.energyKwh || 0;
        acc.totalGrossAmount += s.grossAmount || 0;
        acc.totalMsFeeAmount += s.msFeeAmount || 0;
        acc.totalSubCpoEarning += s.subCpoEarningAmount || 0;
        return acc;
      },
      {
        totalSessions: 0,
        totalEnergyKwh: 0,
        totalGrossAmount: 0,
        totalMsFeeAmount: 0,
        totalSubCpoEarning: 0,
      }
    );

    const statement = await prisma.payoutStatement.create({
      data: {
        id: statementId,
        workspaceId: ws.id,
        periodStart,
        periodEnd,
        status: PayoutStatus.DRAFT,
        totalSessions: totals.totalSessions,
        totalEnergyKwh: totals.totalEnergyKwh,
        totalGrossAmount: totals.totalGrossAmount,
        totalMsFeeAmount: totals.totalMsFeeAmount,
        totalSubCpoEarning: totals.totalSubCpoEarning,
        currency: 'EUR',
      },
    });

    await prisma.payoutLineItem.createMany({
      data: eligible.map((s) => ({
        statementId: statement.id,
        sessionId: s.id,
        sessionStartTime: s.startTime,
        stationName: s.station?.name || s.station?.ocppId || 'Unknown',
        energyKwh: s.energyKwh || 0,
        grossAmount: s.grossAmount || 0,
        msFeeAmount: s.msFeeAmount || 0,
        subCpoEarning: s.subCpoEarningAmount || 0,
        currency: s.currency || 'EUR',
      })),
    });

    await prisma.chargingSession.updateMany({
      where: { id: { in: eligible.map((s) => s.id) } },
      data: { payoutStatementId: statement.id },
    });

    return statement;
  }

  const p1 = await seedPayoutForWorkspace(workspace);
  const p2 = await seedPayoutForWorkspace(workspace2);
  if (p1) console.info('✓ Seed PayoutStatement:', p1.id);
  if (p2) console.info('✓ Seed PayoutStatement:', p2.id);

  console.info('\n✅ Seed completed successfully!');
  console.info('\nSummary:');
  console.info(`  - User: ${user.email}`);
  console.info(`  - Workspace: ${workspace.name} (slug: ${workspace.slug})`);
  console.info(`  - Workspace2: ${workspace2.name} (slug: ${workspace2.slug})`);
  console.info(`  - Station: ${station.name} (OCPP ID: ${station.ocppId})`);
  console.info(`  - Connector: ${connector.name} (${connector.maxPower} kW)`);
  console.info(`  - Tariff: ${tariff.name} (${tariff.basePricePerKwh} EUR/kWh, ${tariff.msFeePercent}% fee)`);
  console.info(`  - End User: ${endUser.email} (RFID: ${endUser.rfidToken})`);
};

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error('❌ Seed error:', e);
    await prisma.$disconnect();
    process.exit(1);
  });
