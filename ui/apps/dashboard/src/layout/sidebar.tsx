import type { MenuProps } from 'antd';
import { Menu } from 'antd';
import {
  IRouteObjectHandle,
  menuItems,
  flattenRoutes,
} from '@/routes/route.tsx';
import { useMatches, useNavigate } from 'react-router-dom';
import { FC,useMemo } from 'react';
import _ from 'lodash';
import { getSidebarWidth } from '@/utils/i18n.tsx';
import { cn } from '@/utils/cn.ts';

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
  return (
    <div
      className={cn('w-full', 'h-full', 'overflow-y-auto')}
    >
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
        items={menuItems}
      />
    </div>
  );
};
export default Sidebar;
