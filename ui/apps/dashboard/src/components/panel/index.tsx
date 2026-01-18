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

import { FC, ReactNode, useMemo } from 'react';
import { useMatches } from 'react-router-dom';
import { Breadcrumb } from 'antd';
import type { BreadcrumbProps } from 'antd';
import { getRoutes, IRouteObjectHandle } from '@/routes/route.tsx';

interface IPanelProps {
  children: ReactNode;
}

const Panel: FC<IPanelProps> = (props) => {
  const { children } = props;
  const matches = useMatches();
  const breadcrumbs = useMemo<NonNullable<BreadcrumbProps['items']>>(() => {
    if (!matches || matches.length === 0) return [];
    const filteredMatches = matches.filter((m) => Boolean(m.handle));
    let idx = 0;
    let ptr = getRoutes()[0];
    const menuItems: NonNullable<BreadcrumbProps['items']> = [];
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
