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

import { FC, ReactNode } from 'react';
import { Layout as AntdLayout } from 'antd';
import { Outlet, Navigate } from 'react-router-dom';
import Header from './header';
import Sidebar from './sidebar';
import { cn } from '@/utils/cn.ts';
import { useAuth } from '@/components/auth';
import { getSidebarWidth } from '@/utils/i18n';
import { useWindowSize } from '@uidotdev/usehooks';
import { KarmadaTerminal } from '@/components/terminal';
import { useGlobalStore } from '@/store/global';
import { FloatingChat } from '@karmada/chatui';

const { Sider: AntdSider, Content: AntdContent } = AntdLayout;

export const MainLayout: FC = () => {
  const { authenticated } = useAuth();
  const { width } = useWindowSize();
  const isSmallScreen = width !== null && width <= 768;
  const { karmadaTerminalOpen, toggleKarmadaTerminal, setKarmadaTerminalOpen } =
    useGlobalStore();

  if (!authenticated) {
    return <Navigate to="/login" />;
  }

  return (
    <>
      <Header onTerminalClick={toggleKarmadaTerminal} />
      <AntdLayout
        className={cn('h-[calc(100vh-48px)]', 'overflow-hidden', 'flex')}
      >
        <AntdSider
          width={getSidebarWidth()}
          collapsible
          collapsed={isSmallScreen}
          breakpoint="lg"
          trigger={null}
        >
          <Sidebar collapsed={isSmallScreen} />
        </AntdSider>
        <AntdContent>
          <Outlet />
        </AntdContent>
      </AntdLayout>

      <KarmadaTerminal
        isOpen={karmadaTerminalOpen}
        onClose={() => {
          setKarmadaTerminalOpen(false);
        }}
      />
      
      <FloatingChat 
        apiConfig={{
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          },
          chatEndpoint: '/api/v1/chat',
          toolsEndpoint: '/api/v1/chat/tools'
        }}
        enableMCP={true}
      />
    </>
  );
};

export interface IOnlyHeaderLayout {
  children?: ReactNode;
}

export const OnlyHeaderLayout: FC<IOnlyHeaderLayout> = ({ children }) => {
  return (
    <>
      <Header />
      <AntdLayout className={cn('h-[calc(100vh-48px)]')}>
        <AntdContent>{children}</AntdContent>
      </AntdLayout>
    </>
  );
};
