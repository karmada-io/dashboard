import { FC, ReactNode, useState, useEffect } from 'react';
import { Layout as AntdLayout } from 'antd';
import { Outlet, Navigate } from 'react-router-dom';
import Header from './header';
import Sidebar from './sidebar';
import { cn } from '@/utils/cn.ts';
import { useAuth } from '@/components/auth';
import { getSidebarWidth } from '@/utils/i18n.tsx';

const { Sider: AntdSider, Content: AntdContent } = AntdLayout;

export const MainLayout: FC = () => {
  const { authenticated } = useAuth();
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    const handleResize = () => {
      setCollapsed(window.innerWidth <= 768);
    };

    handleResize(); // Set initial state based on current window size
    window.addEventListener('resize', handleResize);

    return () => window.removeEventListener('resize', handleResize);
  }, []);

  if (!authenticated) {
    return <Navigate to="/login" />;
  }

  return (
    <>
      <Header />
      <AntdLayout className={cn('h-[calc(100vh-48px)]', 'overflow-hidden', 'flex')}>
        <AntdSider
          width={getSidebarWidth()}
          collapsible
          collapsed={collapsed}
          breakpoint="lg"
          onBreakpoint={(broken) => setCollapsed(broken)}
          style={{ transition: 'width 0.3s ease' }}
          trigger={null}
        >
          <Sidebar />
        </AntdSider>
        <AntdContent className="flex-grow" style={{ transition: 'margin-left 0.3s ease' }}>
          <Outlet />
        </AntdContent>
      </AntdLayout>
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
      <AntdLayout className={cn('h-[calc(100vh-48px)]', 'flex')}>
        <AntdContent className="flex-grow">{children}</AntdContent>
      </AntdLayout>
    </>
  );
};
