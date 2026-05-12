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
import { getDashboardVersionInfo } from '@/utils/version';

interface SidebarProps {
  collapsed: boolean;
}

const Sidebar: FC<SidebarProps> = ({ collapsed }) => {
  const { versionKind, displayVersion, targetUrl, title } =
    getDashboardVersionInfo();
  const sidebarWidth = collapsed ? 80 : getSidebarWidth();
  const versionLabel = versionKind === 'tag' ? 'Tag' : 'Commit';
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
    if (!data || !data.menu_configs || data.menu_configs.length === 0)
      return menuItems;
    const menuInfo = traverseMenuConfig(data.menu_configs);
    return filterMenuItems(menuItems, menuInfo);
  }, [data]);
  return (
    <div className={cn('w-full', 'h-full', 'flex', 'flex-col')}>
      <div className={cn('flex-1', 'overflow-y-auto')}>
        <Menu
          onClick={onClick}
          style={{ width: `${sidebarWidth}px` }}
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
      <a
        href={targetUrl}
        target="_blank"
        rel="noopener noreferrer"
        className={cn(
          'h-11',
          'w-full',
          'px-3',
          collapsed ? 'text-center' : 'text-left',
          'text-[11px]',
          'leading-[1.2]',
          'text-[#666666]',
          'border-0 border-l-0 border-r-0 border-b-0',
          'border-t',
          'border-solid',
          'border-[#ebebeb]',
          'bg-[#fafafa]',
          'cursor-pointer',
          'no-underline',
          'transition-colors duration-200 ease-out',
          'hover:bg-[#f5f5f5]',
          'hover:text-[#171717]',
          'focus-visible:outline',
          'focus-visible:outline-2',
          'focus-visible:outline-offset-[-2px]',
          'focus-visible:outline-[#1677ff]',
          'flex',
          'items-center',
          collapsed ? 'justify-center' : 'justify-start',
        )}
        title={title}
        aria-label={`Open ${versionKind} in repository`}
      >
        {collapsed ? (
          <span className={cn('block', 'truncate', 'font-mono')}>
            {displayVersion.slice(0, 7)}
          </span>
        ) : (
          <span className={cn('flex', 'w-full', 'items-center', 'gap-1.5')}>
            <span className={cn('text-[#8c8c8c]')}>{versionLabel}</span>
            <span className={cn('block', 'truncate', 'font-mono', 'text-[#262626]')}>
              {displayVersion}
            </span>
          </span>
        )}
      </a>
    </div>
  );
};

function traverseMenuConfig(
  menu_configs: menuConfig[],
): Record<string, boolean> {
  if (
    !menu_configs ||
    !Array.isArray(menu_configs) ||
    menu_configs.length === 0
  ) {
    return {};
  }

  let menuInfo = {} as Record<string, boolean>;
  for (const menu_config of menu_configs) {
    if (!menu_config || !menu_config.sidebar_key) continue;

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
