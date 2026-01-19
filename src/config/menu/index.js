import { Permission } from '@/lib/authz/permissions';

// Note: menu function cannot use hooks directly
// isSuperAdmin must be passed from component that uses useSuperAdmin hook
// workspace can be an object with { slug, id } or just a string (slug)
const menu = (workspace, isSuperAdmin = false) => {
  const workspaceSlug = typeof workspace === 'string' ? workspace : workspace?.slug;
  const workspaceId = typeof workspace === 'object' ? workspace?.id : null;
  
  // Sub‑CPO menu (tenant-scoped). Everything outside this menu is Super Admin only.
  if (!isSuperAdmin && workspaceSlug) {
    return [
      {
        name: 'Dashboard',
        path: `/account/${workspaceSlug}/dashboard`,
        icon: 'dashboard',
        requiredPermission: Permission.DASHBOARD_VIEW,
      },
      {
        name: 'Operazioni',
        icon: 'ops',
        collapsible: true,
        defaultExpanded: true,
        menuItems: [
          {
            name: 'Stazioni',
            path: `/account/${workspaceSlug}/stations`,
            icon: 'stations',
            requiredPermission: Permission.STATIONS_VIEW,
          },
          {
            name: 'Ricariche',
            path: `/account/${workspaceSlug}/sessions`,
            icon: 'sessions',
            requiredPermission: Permission.SESSIONS_VIEW,
          },
          {
            name: 'Tariffe',
            path: `/account/${workspaceSlug}/tariffs`,
            icon: 'tariffs',
            requiredPermission: Permission.SETTINGS_EDIT,
          },
          {
            name: 'Andamento',
            path: `/account/${workspaceSlug}/dashboard/revenue`,
            icon: 'trend',
            requiredPermission: Permission.DASHBOARD_VIEW,
          },
        ],
      },
      {
        name: 'Finanza',
        icon: 'finance',
        collapsible: true,
        defaultExpanded: false,
        menuItems: [
          {
            name: 'Pagamenti',
            path: `/account/${workspaceSlug}/payouts`,
            icon: 'payments',
            requiredPermission: Permission.PAYOUTS_VIEW,
          },
        ],
      },
      {
        name: 'Impostazioni',
        icon: 'settings',
        collapsible: true,
        defaultExpanded: false,
        menuItems: [
          {
            name: 'Generali',
            path: `/account/${workspaceSlug}/settings/general`,
            icon: 'settings',
            requiredPermission: Permission.SETTINGS_VIEW,
          },
          {
            name: 'Team',
            path: `/account/${workspaceSlug}/settings/team`,
            icon: 'users',
            requiredPermission: Permission.USERS_MANAGE,
          },
          {
            name: 'Dominio',
            path: `/account/${workspaceSlug}/settings/domain`,
            icon: 'domain',
            requiredPermission: Permission.SETTINGS_EDIT,
          },
        ],
      },
      {
        name: 'App Conducente',
        path: '/driver/map',
        icon: 'driver',
      },
    ];
  }

  const menuItems = [];
  
  // Dashboard - Always first (single item, no submenu)
  menuItems.push({
    name: 'Dashboard',
    path: workspaceSlug ? `/account/${workspaceSlug}/dashboard` : (isSuperAdmin ? '/admin/dashboard' : '/dashboard'),
    icon: 'dashboard',
  });

  // Organizzazioni - Single item
  menuItems.push({
    name: 'Organizzazioni',
    path: isSuperAdmin ? '/admin/organizations' : (workspaceSlug ? `/account/${workspaceSlug}/organizations` : '/account'),
    icon: 'organizations',
  });

  // Stazioni di Ricarica - Single item
  const stationsPath = workspaceSlug 
    ? `/account/${workspaceSlug}/stations` 
    : (isSuperAdmin ? '/admin/stations' : '#');
  const stationsDisabled = !workspaceSlug && !isSuperAdmin;
  menuItems.push({
    name: 'Stazioni di Ricarica',
    path: stationsPath,
    icon: 'stations',
    disabled: stationsDisabled,
  });

  // Ricariche Veicoli - Single item
  const sessionsPath = workspaceSlug 
    ? `/account/${workspaceSlug}/sessions` 
    : (isSuperAdmin ? '/admin/sessions' : '#');
  const sessionsDisabled = !workspaceSlug && !isSuperAdmin;
  menuItems.push({
    name: 'Ricariche Veicoli',
    path: sessionsPath,
    icon: 'sessions',
    disabled: sessionsDisabled,
  });

  // Andamento - Single item
  const trendPath = workspaceSlug 
    ? `/account/${workspaceSlug}/dashboard/revenue` 
    : (isSuperAdmin ? '/admin/trend' : '#');
  const trendDisabled = !workspaceSlug && !isSuperAdmin;
  menuItems.push({
    name: 'Andamento',
    path: trendPath,
    icon: 'trend',
    disabled: trendDisabled,
  });

  // Pagamenti - Single item
  const payoutsPath = workspaceSlug 
    ? `/account/${workspaceSlug}/payouts` 
    : (isSuperAdmin ? '/admin/payouts' : '#');
  const payoutsDisabled = !workspaceSlug && !isSuperAdmin;
  menuItems.push({
    name: 'Pagamenti',
    path: payoutsPath,
    icon: 'payments',
    disabled: payoutsDisabled,
  });

  // Utenti - Single item (workspace or super admin)
  if (workspaceSlug) {
    menuItems.push({
      name: 'Utenti',
      path: `/account/${workspaceSlug}/users`,
      icon: 'users',
    });
  } else if (isSuperAdmin) {
    menuItems.push({
      name: 'Utenti',
      path: '/admin/users',
      icon: 'users',
    });
  }

  // RFID (Super Admin aggregate)
  if (isSuperAdmin && !workspaceSlug) {
    menuItems.push({
      name: 'RFID',
      icon: 'cards',
      collapsible: true,
      defaultExpanded: false,
      menuItems: [
        { name: 'Carte RFID', path: '/admin/rfid-cards', icon: 'cards' },
        { name: 'Ricariche carte', path: '/admin/card-recharges', icon: 'card-recharges' },
      ],
    });
  }
  
  // Amministrazione (collapsible) - For workspace users OR super admin
  if (workspaceSlug || isSuperAdmin) {
    const adminMenuItems = workspaceSlug
      ? [
          // Tenant-scoped settings (real routes exist under /account/<slug>/settings/*)
          {
            name: 'Impostazioni',
            path: `/account/${workspaceSlug}/settings/general`,
            icon: 'settings',
          },
        ]
      : [
          // Super Admin aggregate views (all /admin/**)
          { name: 'Monitoraggio', icon: 'admin', collapsible: true, defaultExpanded: false, menuItems: [
            { name: 'Messaggi OCPP', path: '/admin/ocpp-messages', icon: 'ocpp-messages' },
            { name: 'Log server OCPP', path: '/admin/ocpp-server-logs', icon: 'ocpp-server-logs' },
            { name: 'Log errori', path: '/admin/error-logs', icon: 'error-logs' },
            { name: 'System info', path: '/admin/system-info', icon: 'system-info' },
            { name: 'IP bloccati', path: '/admin/blocked-ips', icon: 'blocked-ips' },
            { name: 'Ops dashboard', path: '/admin/ops/dashboard', icon: 'ops-dashboard' },
          ]},
          { name: 'Piattaforma', icon: 'super-admin', collapsible: true, defaultExpanded: false, menuItems: [
            { name: 'Impostazioni piattaforma', path: '/admin/platform/settings', icon: 'settings' },
            { name: 'Workspaces', path: '/admin/workspaces', icon: 'workspaces' },
            { name: 'Prodotti', path: '/admin/products', icon: 'products' },
          ]},
        ];
    
    menuItems.push({
      name: 'Amministrazione',
      icon: 'admin',
      collapsible: true,
      defaultExpanded: false,
      menuItems: adminMenuItems,
    });
  }

  // Link diretto all'app conducente (browse mode -> mappa)
  menuItems.push({
    name: 'App Conducente',
    path: '/driver/map',
    icon: 'driver',
  });
  
  // Scrivici - Single item (contact/write to us)
  menuItems.push({
    name: 'Scrivici',
    path: '/contact',
    icon: 'contact',
  });
  
  // Info - Single item
  menuItems.push({
    name: 'Info',
    path: '/info',
    icon: 'info',
  });

  // Note: Super Admin-specific groups are now included under "Amministrazione" to avoid duplicates.

  return menuItems;
};

export default menu;
