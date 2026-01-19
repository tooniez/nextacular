import Link from 'next/link';
import { useTranslation } from "react-i18next";
import { useRouter } from 'next/router';

const Item = ({ data, isLoading }) => {
  const { t } = useTranslation();
  const router = useRouter();
  
  if (isLoading) {
    return <div className="h-6 mb-3 bg-gray-600 rounded animate-pulse" />;
  }
  
  // #region agent log (console only to avoid CORS)
  // Log item state for debugging
  if (process.env.NODE_ENV === 'development') {
    console.log('[Menu Item] Render check', {
      name: data?.name,
      path: data?.path,
      disabled: data?.disabled,
      hasPath: !!data?.path,
      isHash: data?.path === '#',
      willBeDisabled: data?.disabled || !data?.path || data.path === '#',
    });
  }
  // #endregion
  
  // Handle disabled items
  if (data?.disabled || !data?.path || data.path === '#') {
    return (
      <li className="list-none group relative">
        <span className="flex items-center px-3 py-2.5 text-sm text-gray-500 cursor-not-allowed opacity-50">
          <span className="w-2 h-2 rounded-full bg-gray-500 mr-3"></span>
          <span className="flex-1">{t(data.name)}</span>
          {data?.tooltip && (
            <span className="ml-2 text-xs opacity-0 group-hover:opacity-100 transition-opacity">
              ℹ️
            </span>
          )}
        </span>
        {data?.tooltip && (
          <div className="absolute left-full ml-2 top-0 bg-gray-800 text-white text-xs rounded px-2 py-1 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-50">
            {data.tooltip}
          </div>
        )}
      </li>
    );
  }
  
  // #region agent log (console only to avoid CORS)
  const checkActive = () => {
    if (!router || !router.asPath) {
      return false;
    }
    
    const currentPath = router.asPath.split('?')[0].split('#')[0]; // Remove query params and hash
    const itemPath = data.path;
    
    if (!itemPath || itemPath === '#') {
      return false;
    }
    
    // Normalize paths (remove trailing slashes for comparison)
    const normalizedCurrent = currentPath.replace(/\/$/, '') || '/';
    const normalizedItem = itemPath.replace(/\/$/, '') || '/';
    
    // Exact match (most important)
    if (normalizedCurrent === normalizedItem) {
      if (process.env.NODE_ENV === 'development') {
        console.log('[Menu Item] ✅ Active: EXACT match', { 
          name: data.name, 
          itemPath: normalizedItem, 
          currentPath: normalizedCurrent,
          rawCurrent: router.asPath,
          rawItem: itemPath
        });
      }
      return true;
    }
    
    // For paths that are too generic (like /account), ONLY match exactly
    // This prevents /account/organizations from matching /account
    const genericPaths = ['/account', '/dashboard', '/contact', '/info'];
    if (genericPaths.includes(normalizedItem)) {
      if (process.env.NODE_ENV === 'development') {
        console.log('[Menu Item] ❌ NOT Active: generic path (exact match only)', { 
          name: data.name, 
          itemPath: normalizedItem, 
          currentPath: normalizedCurrent,
          isGeneric: true
        });
      }
      return false;
    }
    
    // For other paths, check if current path starts with item path + '/'
    // This allows /account/workspace/dashboard to match /account/workspace/dashboard/revenue
    // But NOT /account/organizations to match /account
    if (normalizedCurrent.startsWith(normalizedItem + '/')) {
      if (process.env.NODE_ENV === 'development') {
        console.log('[Menu Item] ✅ Active: prefix match', { 
          name: data.name, 
          itemPath: normalizedItem, 
          currentPath: normalizedCurrent 
        });
      }
      return true;
    }
    
    if (process.env.NODE_ENV === 'development') {
      console.log('[Menu Item] ❌ NOT Active: no match', { 
        name: data.name, 
        itemPath: normalizedItem, 
        currentPath: normalizedCurrent 
      });
    }
    return false;
  };
  
  const isActive = checkActive();
  // #endregion
  
  const handleClick = (e) => {
    if (process.env.NODE_ENV === 'development') {
      console.log('[Menu Item] Clicked', { 
        name: data.name, 
        path: data.path, 
        currentPath: router.asPath,
        disabled: data?.disabled 
      });
    }
    
    // Prevent navigation if disabled
    if (data?.disabled || !data?.path || data.path === '#') {
      e.preventDefault();
      e.stopPropagation();
      return false;
    }
    
    // Ensure event propagates correctly for Link
    // Don't prevent default - let Next.js Link handle it
  };
  
  return (
    <li className="list-none">
      <Link 
        href={data.path || '#'} 
        onClick={handleClick}
        className={`
          flex items-center px-3 py-2.5 rounded transition-colors cursor-pointer text-sm
          ${isActive 
            ? 'bg-gray-700 text-white font-medium' 
            : 'text-gray-300 hover:text-white hover:bg-gray-700'
          }
          ${data?.disabled ? 'pointer-events-none opacity-50' : ''}
        `}
        prefetch={false}
        shallow={false}
      >
        <span className="flex items-center gap-3 w-full">
          {/* Icon would go here - using text for now */}
          <span className="flex-1">{t(data.name)}</span>
        </span>
      </Link>
    </li>
  );
};

Item.defaultProps = {
  data: null,
  isLoading: false,
};

export default Item;
