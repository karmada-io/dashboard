import type { MenuProps } from 'antd';
import { Menu } from 'antd';
import {
  IRouteObjectHandle,
  menuItems,
  flattenRoutes,
  filterMenuItems,
} from '@/routes/route.tsx';
import { useMatches, useNavigate } from 'react-router-dom';
import { FC, useMemo } from 'react';
import _ from 'lodash';
import { getSidebarWidth } from '@/utils/i18n.tsx';
import { cn } from '@/utils/cn.ts';
import { useQuery } from '@tanstack/react-query';
import { GetDashboardConfig, menuConfig } from '@/services/dashboard-config.ts';

interface SidebarProps {
  collapsed: boolean;
}

const Sidebar: FC<SidebarProps> = ({ collapsed }) => {
  const navigate = useNavigate();
  const onClick: MenuProps['onClick'] = (e) => {
    const url = flattenRoutes[e.key];
    if (!url) return;
    navigate(url);
  };
  const matches = useMatches();
  const selectKeys = useMemo(() => {
    if (!matches) return [];
    return matches
      .filter((m) => !_.isUndefined(m.handle))
      .map((m) => (m.handle as IRouteObjectHandle).sidebarKey);
  }, [matches]);
  const { data } = useQuery({
    queryKey: ['GetDashboardConfig'],
    queryFn: async () => {
      const ret = await GetDashboardConfig();
      return ret.data;
    },
  });
  const filteredMenuItems = useMemo(() => {
    if (!data) return menuItems;
    const menuInfo = traverseMenuConfig(data.menu_configs);
    return filterMenuItems(menuItems, menuInfo);
  }, [data, menuItems]);
  return (
    <div className={cn('w-full', 'h-full', 'overflow-y-auto')}>
      <Menu
        onClick={onClick}
        style={{ width: collapsed ? '80px' : getSidebarWidth() }}
        selectedKeys={selectKeys}
        defaultOpenKeys={
          selectKeys.length > 0
            ? [selectKeys[0]]
            : ['MULTICLOUD-RESOURCE-MANAGE', 'MULTICLOUD-POLICY-MANAGE']
        }
        mode="inline"
        items={filteredMenuItems}
      />
    </div>
  );
};

function traverseMenuConfig(
  menu_configs: menuConfig[],
): Record<string, boolean> {
  let menuInfo = {} as Record<string, boolean>;
  for (const menu_config of menu_configs) {
    menuInfo[menu_config.sidebar_key] = menu_config.enable;
    const childrenMenuInfo = menu_config.children
      ? traverseMenuConfig(menu_config.children)
      : {};
    menuInfo = {
      ...menuInfo,
      ...childrenMenuInfo,
    };
  }
  return menuInfo;
}

export default Sidebar;
