import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';

import Actions from './actions';
import Menu from './menu';
import sidebarMenu from '@/config/menu/sidebar-static';
import { useWorkspaces } from '@/hooks/data';
import { useWorkspace } from '@/providers/workspace';
import { Bars3Icon } from '@heroicons/react/24/outline';

const staticMenu = sidebarMenu();

const Sidebar = ({ menu, principal }) => {
  const [showMenu, setMenuVisibility] = useState(false);
  const router = useRouter();
  const { data, isLoading } = useWorkspaces();
  const { workspace } = useWorkspace();
  const workspaceSlug = router.query.workspaceSlug;
  const isSuperAdmin = Boolean(principal?.isSuperAdmin);

  // Render menu if workspace is set OR if workspaceSlug is in URL OR if super admin
  const shouldRenderMenu = workspace || workspaceSlug || isSuperAdmin;
  const menuToRender = menu || [];

  // #region agent log (console only to avoid CORS)
  useEffect(() => {
    if (process.env.NODE_ENV === 'development') {
      console.log('[Sidebar] Render check', {
        hasWorkspace: !!workspace,
        workspaceSlug,
        isSuperAdmin,
        shouldRenderMenu,
        menuItemsCount: menuToRender?.length || 0,
      });
    }
  }, [workspace, workspaceSlug, isSuperAdmin, shouldRenderMenu, menuToRender]);
  // #endregion

  const renderMenu = () => {
    if (!shouldRenderMenu || !menuToRender || menuToRender.length === 0) return null;
    const show = true; // menu is already authz-filtered; render consistently
    return menuToRender.map((item, index) => (
      <Menu key={`menu-${index}-${item.name}`} data={item} isLoading={isLoading} showMenu={show} />
    ));
  };

  const renderStaticMenu = () => {
    // Only show static menu if no workspace is selected
    if (shouldRenderMenu) {
      return null;
    }
    return staticMenu.map((item, index) => (
      <Menu key={index} data={item} showMenu={true} />
    ));
  };

  const toggleMenu = () => setMenuVisibility(!showMenu);

  const brandSlug = workspace?.slug || workspaceSlug;
  const brandHref = brandSlug ? `/account/${brandSlug}` : '/';

  const brand = workspace?.brandLogoUrl ? (
    <img
      src={workspace.brandLogoUrl}
      alt={workspace?.name ? `${workspace.name} logo` : 'Logo'}
      className="h-8 max-w-[180px] object-contain"
      onError={(e) => {
        // #region agent log (console only)
        if (process.env.NODE_ENV === 'development') {
          console.log('[Sidebar] logo load error', { src: workspace?.brandLogoUrl });
        }
        // #endregion
        try { e.currentTarget.style.display = 'none'; } catch {}
      }}
    />
  ) : (
    <span>Intermobility</span>
  );

  return (
    <aside className="sticky z-40 flex flex-col space-y-5 text-white bg-gray-800 dark:bg-gray-900 md:overflow-y-auto md:w-1/4 md:h-screen overscroll-contain">
      <div className="relative flex items-center justify-center p-5 text-center border-b border-b-gray-900">
        <Link href={brandHref} className="flex-grow text-2xl font-bold flex items-center justify-center">
          {brand}
        </Link>
        <button className="absolute right-0 p-5 md:hidden" onClick={toggleMenu}>
          <Bars3Icon className="w-6 h-6" />
        </button>
      </div>
      <div
        className={[
          'flex-col space-y-5 md:flex md:relative md:top-0',
          showMenu
            ? 'absolute top-12 bg-gray-800 right-0 left-0 h-screen'
            : 'hidden',
        ].join(' ')}
      >
        {/* Only show Actions (Create Workspace + Selector) if no workspace is selected AND not super admin */}
        {!shouldRenderMenu && !isSuperAdmin && <Actions />}
        <div className="flex flex-col p-4 space-y-1">
          {renderStaticMenu()}
          {renderMenu()}
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;
