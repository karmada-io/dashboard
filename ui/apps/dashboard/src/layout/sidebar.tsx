import React, { useState, useEffect } from 'react';
import type { MenuProps } from 'antd';
import { Menu } from 'antd';
import {
  IRouteObjectHandle,
  menuItems,
  flattenRoutes,
} from '@/routes/route.tsx';
import { useMatches, useNavigate } from 'react-router-dom';
import { useMemo } from 'react';
import _ from 'lodash';
import { getSidebarWidth } from '@/utils/i18n.tsx';

const useWindowSize = () => {
  const [size, setSize] = useState([window.innerWidth, window.innerHeight]);
  useEffect(() => {
    const handleResize = () => {
      setSize([window.innerWidth, window.innerHeight]);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);
  return size;
};

const Sidebar = () => {
  const navigate = useNavigate();
  const [collapsed, setCollapsed] = useState(false);
  const [width] = useWindowSize();
  const isSmallScreen = width <= 768;

  useEffect(() => {
    setCollapsed(isSmallScreen);
  }, [isSmallScreen]);

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
      className={`w-full h-full overflow-y-auto ${collapsed ? 'collapsed-sidebar' : ''}`}
      style={{ transition: 'width 0.3s' }}
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
        inlineCollapsed={collapsed}
      />
    </div>
  );
};
export default Sidebar;
