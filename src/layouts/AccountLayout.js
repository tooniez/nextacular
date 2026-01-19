import { useEffect } from 'react';
import React from 'react';
import { useRouter } from 'next/router';
import { useSession } from 'next-auth/react';
import { Toaster } from 'react-hot-toast';
import toast from 'react-hot-toast';

import Content from '@/components/Content/index';
import Header from '@/components/Header/index';
import Sidebar from '@/components/Sidebar/index';
import { useWorkspace } from '@/providers/workspace';
import { useWorkspaces } from '@/hooks/data';
import { useAuthzMe } from '@/hooks/data/useAuthzMe';

const dbg = (hypothesisId, location, message, data) => {
  try {
    fetch('/api/_debug/log', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ runId: 'rbac', hypothesisId, location, message, data, timestamp: Date.now() }),
    }).catch(() => {});
  } catch {}
};

const AccountLayout = ({ children }) => {
  const { status } = useSession();
  const router = useRouter();
  const { workspace, setWorkspace } = useWorkspace();
  const workspaceSlug = router.query.workspaceSlug;

  // Only fetch workspaces when platform session is authenticated.
  // NOTE: must be declared before any usage (TDZ / "Cannot access ... before initialization").
  const { data: workspacesData } = useWorkspaces({ enabled: status === 'authenticated' });

  // Auto-set workspace when workspaceSlug is in URL
  useEffect(() => {
    if (workspaceSlug && workspacesData?.workspaces) {
      const foundWorkspace = workspacesData.workspaces.find(
        (w) => w.slug === workspaceSlug
      );

      if (foundWorkspace) {
        // Only set if different to avoid unnecessary updates
        if (!workspace || workspace.slug !== workspaceSlug) {
          setWorkspace(foundWorkspace);
        }
      }
    }
  }, [workspaceSlug, workspacesData, workspace, setWorkspace]);

  // Menu context is derived from the URL (explicit tenant context), not from persisted workspace state.
  // This avoids unexpected "admin ↔ tenant" menu switching for Super Admin.
  const menuSlug = workspaceSlug;
  const { principal, menu: authzMenu, isLoading: authzLoading } = useAuthzMe({ workspaceSlug: menuSlug || undefined });
  const isSuperAdmin = Boolean(principal?.isSuperAdmin);
  const isOrgManager = Boolean(principal?.platform?.isAuthenticated) && (isSuperAdmin || (principal?.workspaces || []).length > 0);
  const isSuperAdminLoading = Boolean(authzLoading);

  useEffect(() => {
    if (status === 'unauthenticated') {
      // If user is authenticated as Driver (separate session), keep them in driver area.
      if (principal?.driver?.isAuthenticated) {
        router.replace('/driver/map');
      } else {
        router.replace('/auth/login');
      }
    }
  }, [status, router, principal?.driver?.isAuthenticated]);

  // Tenant boundary UX: if a workspaceSlug is in the URL but the principal is NOT a member, redirect to /account.
  useEffect(() => {
    const slug = workspaceSlug ? String(workspaceSlug) : '';
    if (!slug) return;
    if (status !== 'authenticated') return;
    if (isSuperAdminLoading) return;
    if (isSuperAdmin) return;

    const allowed = (principal?.workspaces || []).some((w) => String(w?.slug || '') === slug);
    if (allowed) return;

    const current = String(router.asPath || '').split('?')[0].split('#')[0];
    // Avoid loops
    if (current === '/account') return;

    toast.error('Workspace non autorizzato');
    router.replace('/account');
  }, [workspaceSlug, status, isSuperAdminLoading, isSuperAdmin, principal?.workspaces, router]);

  const menuItems = React.useMemo(() => {
    return Array.isArray(authzMenu) ? authzMenu : [];
  }, [authzMenu]);

  // #region agent log
  useEffect(() => {
    dbg('MENU_1', 'layouts/AccountLayout.js', 'menu generated', {
      isSuperAdmin,
      isOrgManager,
      isSuperAdminLoading,
      hasWorkspace: Boolean(workspace),
      workspaceSlug: workspaceSlug ? String(workspaceSlug) : null,
      menuSlug: menuSlug ? String(menuSlug) : null,
      menuItemsCount: menuItems?.length || 0,
      currentPath: router.asPath ? String(router.asPath).slice(0, 120) : null,
      menuNames: (menuItems || []).map((i) => String(i?.name || '').slice(0, 32)).slice(0, 12),
    });
  }, [isSuperAdmin, isOrgManager, isSuperAdminLoading, workspace, workspaceSlug, menuSlug, menuItems, router.asPath]);
  // #endregion


  if (status === 'loading' || isSuperAdminLoading) return <></>;
  return (
    <main className="relative flex flex-col w-screen h-screen space-x-0 text-gray-800 dark:text-gray-200 md:space-x-5 md:flex-row bg-gray-50 dark:bg-gray-800">
      <Sidebar menu={menuItems} principal={principal} />
      <Content>
        <Toaster position="bottom-left" toastOptions={{ duration: 10000 }} />
        <Header />
        {children}
      </Content>
    </main>
  );
};

export default AccountLayout;
