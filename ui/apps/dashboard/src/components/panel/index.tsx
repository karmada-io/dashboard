import { FC, ReactNode, useMemo } from 'react';
import { useMatches } from 'react-router-dom';
import { Breadcrumb } from 'antd';
import { getRoutes, IRouteObjectHandle } from '@/routes/route.tsx';
import * as React from 'react';

interface IPanelProps {
  children: ReactNode;
}

interface MenuItem {
  key?: React.Key;
  title?: React.ReactNode;
  label?: React.ReactNode;
  path?: string;
  href?: string;
}

const Panel: FC<IPanelProps> = (props) => {
  const { children } = props;
  const matches = useMatches();
  const breadcrumbs = useMemo(() => {
    if (!matches || matches.length === 0) return [] as MenuItem[];
    const filteredMatches = matches.filter((m) => Boolean(m.handle));
    let idx = 0;
    let ptr = getRoutes()[0];
    const menuItems: MenuItem[] = [];
    while (idx < filteredMatches.length) {
      const { isPage, sidebarKey: _sideBarKey } = filteredMatches[idx]
        .handle as IRouteObjectHandle;
      for (let i = 0; ptr.children && i < ptr.children.length; i++) {
        if (ptr.children[i].handle?.sidebarKey === _sideBarKey) {
          menuItems.push({
            title:
              isPage && filteredMatches[idx].pathname ? (
                <a>{ptr.children[i].handle?.sidebarName}</a>
              ) : (
                ptr.children[i].handle?.sidebarName
              ),
          });
          ptr = ptr.children[i];
        }
      }
      idx++;
    }
    return menuItems;
  }, [matches]);
  return (
    <div className="w-full h-full px-[30px] py-[20px] box-border bg-[#FAFBFC]">
      <div className="w-full h-full bg-white box-border p-[12px] overflow-y-scroll">
        <Breadcrumb className="mb-4" items={breadcrumbs} />
        {children}
      </div>
    </div>
  );
};

export default Panel;
