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

import React, { useState } from 'react';
import { Layout, Menu, Avatar, Dropdown, Badge, Button } from 'antd';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import {
  DashboardOutlined,
  ClusterOutlined,
  AppstoreOutlined,
  SettingOutlined,
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  BellOutlined,
  UserOutlined,
  LogoutOutlined,
  GatewayOutlined,
  CloudOutlined,
  SafetyCertificateOutlined,
  ControlOutlined,
  ApiOutlined,
  ThunderboltOutlined
} from '@ant-design/icons';
import '@/styles/tech-theme.css';

const { Header, Sider, Content } = Layout;

interface TechLayoutProps {
  children?: React.ReactNode;
}

const TechLayout: React.FC<TechLayoutProps> = ({ children }) => {
  const [collapsed, setCollapsed] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  // 菜单项配置
  const menuItems = [
    {
      key: '/overview',
      icon: <DashboardOutlined />,
      label: '系统概览',
    },
    {
      key: '/cluster-manage',
      icon: <ClusterOutlined />,
      label: '集群管理',
    },
    {
      key: 'multicloud-resource',
      icon: <AppstoreOutlined />,
      label: '多云资源管理',
      children: [
        {
          key: '/multicloud-resource-manage/workload',
          icon: <GatewayOutlined />,
          label: '工作负载',
        },
        {
          key: '/multicloud-resource-manage/service',
          icon: <CloudOutlined />,
          label: '网络服务',
        },
        {
          key: '/multicloud-resource-manage/config',
          icon: <SettingOutlined />,
          label: '配置管理',
        },
        {
          key: '/multicloud-resource-manage/namespace',
          icon: <SafetyCertificateOutlined />,
          label: '命名空间',
        },
      ],
    },
    {
      key: 'multicloud-policy',
      icon: <ControlOutlined />,
      label: '多云策略管理',
      children: [
        {
          key: '/multicloud-policy-manage/propagation-policy',
          icon: <ApiOutlined />,
          label: '调度策略',
        },
        {
          key: '/multicloud-policy-manage/override-policy',
          icon: <ThunderboltOutlined />,
          label: '差异化策略',
        },
      ],
    },
    {
      key: 'config',
      icon: <SettingOutlined />,
      label: '系统配置',
      children: [
        {
          key: '/basic-config',
          label: '基础配置',
        },
        {
          key: '/advanced-config',
          label: '高级配置',
        },
      ],
    },
  ];

  // 用户下拉菜单
  const userMenuItems = [
    {
      key: 'profile',
      icon: <UserOutlined />,
      label: '个人设置',
    },
    {
      type: 'divider' as const,
    },
    {
      key: 'logout',
      icon: <LogoutOutlined />,
      label: '退出登录',
      danger: true,
    },
  ];

  const handleMenuClick = ({ key }: { key: string }) => {
    navigate(key);
  };

  const handleUserMenuClick = ({ key }: { key: string }) => {
    if (key === 'logout') {
      // 处理退出登录
      console.log('Logout');
    } else if (key === 'profile') {
      // 处理个人设置
      console.log('Profile');
    }
  };

  return (
    <Layout className="tech-background min-h-screen">
      {/* 侧边栏 */}
      <Sider 
        trigger={null} 
        collapsible 
        collapsed={collapsed}
        width={280}
        collapsedWidth={80}
        className="tech-sidebar"
        style={{
          background: 'linear-gradient(180deg, rgba(0, 212, 255, 0.1) 0%, rgba(124, 58, 237, 0.05) 100%)',
          backdropFilter: 'blur(10px)',
          borderRight: '1px solid rgba(0, 212, 255, 0.3)',
          boxShadow: '0 0 20px rgba(0, 212, 255, 0.1)',
        }}
      >
        {/* Logo 区域 */}
        <div className="flex items-center justify-center py-6">
          <div className="tech-card p-4 bg-transparent border-none">
            <div className="flex items-center space-x-3">
              <div 
                className="w-10 h-10 rounded-lg flex items-center justify-center text-2xl"
                style={{ 
                  background: 'linear-gradient(45deg, #00d4ff, #7c3aed)',
                  boxShadow: '0 0 20px rgba(0, 212, 255, 0.4)',
                  color: 'white'
                }}
              >
                K
              </div>
              {!collapsed && (
                <div>
                  <div 
                    className="text-xl font-bold tech-hologram-text"
                    style={{ color: 'var(--tech-primary)' }}
                  >
                    KARMADA
                  </div>
                  <div className="text-xs text-gray-500 uppercase tracking-wider">
                    Control Center
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* 导航菜单 */}
        <Menu
          mode="inline"
          selectedKeys={[location.pathname]}
          items={menuItems}
          onClick={handleMenuClick}
          style={{
            background: 'transparent',
            border: 'none',
          }}
          className="tech-menu"
        />
      </Sider>

      <Layout>
        {/* 顶部栏 */}
        <Header 
          className="tech-header"
          style={{
            padding: '0 24px',
            background: 'rgba(255, 255, 255, 0.9)',
            backdropFilter: 'blur(10px)',
            borderBottom: '1px solid rgba(0, 212, 255, 0.3)',
            boxShadow: '0 2px 8px rgba(0, 212, 255, 0.1)',
          }}
        >
          <div className="flex items-center justify-between h-full">
            {/* 左侧 - 折叠按钮 */}
            <div className="flex items-center">
              <Button
                type="text"
                icon={collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
                onClick={() => setCollapsed(!collapsed)}
                className="tech-btn-secondary mr-4"
                style={{
                  fontSize: '16px',
                  width: 40,
                  height: 40,
                }}
              />
              
              {/* 面包屑导航 */}
              <div className="flex items-center space-x-2 text-gray-600">
                <span className="text-sm">当前位置:</span>
                <span 
                  className="text-sm font-semibold tech-hologram-text"
                  style={{ color: 'var(--tech-primary)' }}
                >
                  {location.pathname === '/overview' && '系统概览'}
                  {location.pathname === '/cluster-manage' && '集群管理'}
                  {location.pathname.startsWith('/multicloud-resource-manage') && '多云资源管理'}
                  {location.pathname.startsWith('/multicloud-policy-manage') && '多云策略管理'}
                </span>
              </div>
            </div>

            {/* 右侧 - 通知和用户 */}
            <div className="flex items-center space-x-4">
              {/* 系统状态指示器 */}
              <div className="flex items-center space-x-2">
                <div 
                  className="w-2 h-2 rounded-full animate-pulse"
                  style={{ background: 'var(--success-color)' }}
                />
                <span className="text-sm text-gray-600">系统正常</span>
              </div>

              {/* 通知铃铛 */}
              <Badge count={3} size="small">
                <Button
                  type="text"
                  icon={<BellOutlined />}
                  className="tech-btn-secondary"
                  style={{
                    fontSize: '16px',
                    width: 40,
                    height: 40,
                  }}
                />
              </Badge>

              {/* 用户头像和下拉菜单 */}
              <Dropdown 
                menu={{ 
                  items: userMenuItems, 
                  onClick: handleUserMenuClick 
                }}
                placement="bottomRight"
                arrow
              >
                <div className="flex items-center space-x-2 cursor-pointer p-2 rounded-lg hover:bg-blue-50 transition-colors">
                  <Avatar 
                    size="small" 
                    icon={<UserOutlined />}
                    style={{
                      background: 'linear-gradient(45deg, #00d4ff, #7c3aed)',
                    }}
                  />
                  <span className="text-sm font-medium text-gray-700">
                    管理员
                  </span>
                </div>
              </Dropdown>
            </div>
          </div>
        </Header>

        {/* 主内容区域 */}
        <Content
          style={{
            margin: 0,
            padding: 0,
            minHeight: 'calc(100vh - 64px)',
            background: 'transparent',
          }}
        >
          {children || <Outlet />}
        </Content>
      </Layout>
    </Layout>
  );
};

export default TechLayout; 