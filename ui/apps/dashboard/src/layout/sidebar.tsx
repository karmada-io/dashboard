/*
Copyright 2024 The Karmada Authors.

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

    http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
*/

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
import { getSidebarWidth } from '@/utils/i18n';
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
      try {
        const ret = await GetDashboardConfig();
        return ret.data;
      } catch (error) {
        console.error('Failed to fetch dashboard config:', error);
        return null;
      }
    },
  });
  const filteredMenuItems = useMemo(() => {
    // 如果没有配置数据或者menu_configs为空，显示所有菜单项
    if (!data || !data.menu_configs || data.menu_configs.length === 0) {
      return menuItems;
    }
    const menuInfo = traverseMenuConfig(data.menu_configs);
    // 如果menuInfo为空对象，也显示所有菜单项
    if (Object.keys(menuInfo).length === 0) {
      return menuItems;
    }
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
  menu_configs: menuConfig[] | undefined | null,
): Record<string, boolean> {
  let menuInfo = {} as Record<string, boolean>;

  // 检查 menu_configs 是否为有效的数组
  if (!menu_configs || !Array.isArray(menu_configs)) {
    return menuInfo;
  }

  for (const menu_config of menu_configs) {
    if (menu_config && menu_config.sidebar_key) {
      menuInfo[menu_config.sidebar_key] = menu_config.enable;
      const childrenMenuInfo = menu_config.children
        ? traverseMenuConfig(menu_config.children)
        : {};
      menuInfo = {
        ...menuInfo,
        ...childrenMenuInfo,
      };
    }
  }
  return menuInfo;
}

export default Sidebar;
