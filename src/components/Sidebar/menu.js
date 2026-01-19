import Item from './item';
import { useTranslation } from "react-i18next";
import { ChevronDownIcon, ChevronRightIcon } from '@heroicons/react/24/outline';
import { useState } from 'react';

const Menu = ({ data, isLoading, showMenu }) => {
  const { t } = useTranslation();
  const [isExpanded, setIsExpanded] = useState(data?.defaultExpanded ?? false);
  
  if (!showMenu || !data) return null;
  
  // If it's a single item (has path but no menuItems), render as Item directly
  if (data.path && !data.menuItems) {
    return (
      <div className="py-0.5">
        <Item data={data} isLoading={isLoading} />
      </div>
    );
  }
  
  // If it's a group (has menuItems), render as collapsible group
  if (data.menuItems && data.menuItems.length > 0) {
    const shouldBeCollapsible = data.collapsible !== false;
    const expanded = shouldBeCollapsible ? isExpanded : true;
    
    return (
      <div className="py-0.5">
        {shouldBeCollapsible ? (
          <>
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setIsExpanded(!isExpanded);
              }}
              className="w-full flex items-center justify-between px-3 py-2.5 text-sm font-medium text-gray-300 hover:text-white hover:bg-gray-700 rounded transition-colors focus:outline-none"
            >
              <span className="flex items-center gap-3">
                <span>{t(data.name)}</span>
              </span>
              {expanded ? (
                <ChevronDownIcon className="w-4 h-4 flex-shrink-0" />
              ) : (
                <ChevronRightIcon className="w-4 h-4 flex-shrink-0" />
              )}
            </button>
            {expanded && (
              <ul className="ml-4 mt-0.5 space-y-0.5 list-none">
                {data.menuItems.map((entry, index) => (
                  <Menu key={`menu-${index}-${entry.name}-${entry.path || 'group'}`} data={entry} isLoading={isLoading} showMenu={true} />
                ))}
              </ul>
            )}
          </>
        ) : (
          <>
            <h5 className="px-3 py-2 text-xs font-semibold text-gray-400 uppercase tracking-wider">
              {t(data.name)}
            </h5>
            <ul className="ml-4 space-y-0.5 list-none">
              {data.menuItems.map((entry, index) => (
                <Menu key={`menu-${index}-${entry.name}-${entry.path || 'group'}`} data={entry} isLoading={isLoading} showMenu={true} />
              ))}
            </ul>
          </>
        )}
      </div>
    );
  }
  
  return null;
};

Menu.defaultProps = {
  isLoading: false,
  showMenu: false,
};

export default Menu;
