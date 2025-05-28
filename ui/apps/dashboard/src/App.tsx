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

import './App.css';
import Router from './routes';
import { Helmet, HelmetProvider } from 'react-helmet-async';
import { ConfigProvider, App as AntdApp } from 'antd';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import AuthProvider from '@/components/auth';
import { getAntdLocale } from '@/utils/i18n.tsx';
import { useEffect } from 'react';
import setupSegmentedAutoFix from '@/utils/segmented-fix';

const queryClient = new QueryClient();

function App() {
  // 启动Segmented组件修复
  useEffect(() => {
    setupSegmentedAutoFix();
    
    // 页面完全加载后的强制修复
    const forceFixAfterLoad = () => {
      // 等待所有资源加载完成
      if (document.readyState === 'complete') {
        setTimeout(() => {
          // 强制修复所有Segmented组件
          const segmentedElements = document.querySelectorAll('.ant-segmented, .tech-segmented');
          segmentedElements.forEach(element => {
            const selectedItems = element.querySelectorAll('.ant-segmented-item-selected, .ant-segmented-item[aria-selected="true"]');
            selectedItems.forEach(item => {
              if (item instanceof HTMLElement) {
                // 强制应用选中样式
                item.style.setProperty('background', 'var(--tech-primary)', 'important');
                item.style.setProperty('background-color', 'var(--tech-primary)', 'important');
                item.style.setProperty('color', '#ffffff', 'important');
                item.style.setProperty('box-shadow', '0 2px 8px rgba(64, 158, 255, 0.3)', 'important');
                item.style.setProperty('font-weight', '600', 'important');
                item.style.setProperty('border', 'none', 'important');
                item.style.setProperty('z-index', '10', 'important');
                
                // 对内部元素也应用样式
                const label = item.querySelector('.ant-segmented-item-label');
                if (label instanceof HTMLElement) {
                  label.style.setProperty('color', '#ffffff', 'important');
                  label.style.setProperty('font-weight', '600', 'important');
                }
              }
            });
            
            const unselectedItems = element.querySelectorAll('.ant-segmented-item:not(.ant-segmented-item-selected)');
            unselectedItems.forEach(item => {
              if (item instanceof HTMLElement && item.getAttribute('aria-selected') !== 'true') {
                item.style.setProperty('background', 'transparent', 'important');
                item.style.setProperty('background-color', 'transparent', 'important');
                item.style.setProperty('color', 'var(--text-color-secondary)', 'important');
                item.style.setProperty('box-shadow', 'none', 'important');
                item.style.setProperty('font-weight', '500', 'important');
                
                const label = item.querySelector('.ant-segmented-item-label');
                if (label instanceof HTMLElement) {
                  label.style.setProperty('color', 'var(--text-color-secondary)', 'important');
                  label.style.setProperty('font-weight', '500', 'important');
                }
              }
            });
          });
        }, 100);
      } else {
        // 如果还没有完全加载，等待加载完成
        window.addEventListener('load', forceFixAfterLoad, { once: true });
      }
    };
    
    forceFixAfterLoad();
    
    // 设置高频检查，确保修复持续有效
    const highFrequencyCheck = setInterval(() => {
      const segmentedElements = document.querySelectorAll('.ant-segmented, .tech-segmented');
      segmentedElements.forEach(element => {
        const selectedItems = element.querySelectorAll('.ant-segmented-item-selected, .ant-segmented-item[aria-selected="true"]');
        selectedItems.forEach(item => {
          if (item instanceof HTMLElement) {
            const currentBg = window.getComputedStyle(item).backgroundColor;
            // 如果选中项没有正确的背景色，强制应用
            if (!currentBg.includes('64, 158, 255') && !currentBg.includes('var(--tech-primary)')) {
              item.style.setProperty('background', 'var(--tech-primary)', 'important');
              item.style.setProperty('background-color', 'var(--tech-primary)', 'important');
              item.style.setProperty('color', '#ffffff', 'important');
              item.style.setProperty('box-shadow', '0 2px 8px rgba(64, 158, 255, 0.3)', 'important');
              item.style.setProperty('font-weight', '600', 'important');
              
              const label = item.querySelector('.ant-segmented-item-label');
              if (label instanceof HTMLElement) {
                label.style.setProperty('color', '#ffffff', 'important');
                label.style.setProperty('font-weight', '600', 'important');
              }
            }
          }
        });
      });
    }, 200); // 每200ms检查一次
    
    // 清理函数
    return () => {
      clearInterval(highFrequencyCheck);
    };
  }, []);

  return (
    <ConfigProvider
      locale={getAntdLocale()}
      theme={{
        token: {
          // 舒适主题色 - 进一步降低亮度
          colorPrimary: '#409eff',
          colorSuccess: '#67c23a',
          colorWarning: '#e6a23c',
          colorError: '#f56c6c',
          colorInfo: '#409eff',
          
          // 舒适背景色
          colorBgBase: '#fafafa',
          colorBgContainer: '#ffffff',
          colorBgElevated: '#ffffff',
          
          // 舒适文字色
          colorText: '#262626',
          colorTextSecondary: '#595959',
          colorTextTertiary: '#8c8c8c',
          colorTextQuaternary: '#bfbfbf',
          
          // 柔和边框色
          colorBorder: '#d9d9d9',
          colorBorderSecondary: '#f0f0f0',
          
          // 圆角保持
          borderRadius: 8,
          borderRadiusLG: 12,
          borderRadiusXS: 6,
          
          // 柔和阴影
          boxShadow: '0 2px 8px rgba(0, 0, 0, 0.06), 0 1px 4px rgba(0, 0, 0, 0.04)',
          boxShadowSecondary: '0 4px 16px rgba(0, 0, 0, 0.08), 0 2px 8px rgba(0, 0, 0, 0.06)',
        },
        components: {
          Layout: {
            siderBg: '#ffffff',
            bodyBg: '#fafafa',
            headerBg: 'rgba(255, 255, 255, 0.95)',
          },
          Menu: {
            itemBg: 'transparent',
            itemSelectedBg: '#ecf5ff',
            itemSelectedColor: '#409eff',
            itemHoverBg: '#f5f9ff',
            itemHoverColor: '#409eff',
            itemColor: '#595959',
            itemActiveBg: '#ecf5ff',
          },
          Card: {
            colorBgContainer: '#ffffff',
            boxShadowTertiary: '0 2px 8px rgba(0, 0, 0, 0.06), 0 1px 4px rgba(0, 0, 0, 0.04)',
          },
          Button: {
            primaryShadow: '0 2px 8px rgba(24, 144, 255, 0.2)',
            dangerShadow: '0 2px 8px rgba(255, 77, 79, 0.2)',
          },
          Progress: {
            defaultColor: '#409eff',
            remainingColor: 'rgba(64, 158, 255, 0.1)',
          },
          Table: {
            headerBg: '#fafafa',
            rowHoverBg: '#f5f5f5',
          },
          Tag: {
            defaultBg: 'rgba(64, 158, 255, 0.1)',
            defaultColor: '#409eff',
          }
        },
      }}
    >
      <AntdApp>
        <QueryClientProvider client={queryClient}>
          <AuthProvider>
            <HelmetProvider>
              <Helmet>
                <title>Karmada Control Center - 多云管理平台</title>
                <link
                  rel="apple-touch-icon"
                  sizes="180x180"
                  href="/apple-touch-icon.png"
                />

                <link
                  rel="icon"
                  type="image/png"
                  sizes="16x16"
                  href="/favicon-16x16.png"
                />

                <link
                  rel="icon"
                  type="image/png"
                  sizes="32x32"
                  href="/favicon-32x32.png"
                />

                <link
                  rel="shortcut icon"
                  type="image/x-icon"
                  href="/favicon.ico"
                />
              </Helmet>
              <Router />
            </HelmetProvider>
          </AuthProvider>
        </QueryClientProvider>
      </AntdApp>
    </ConfigProvider>
  );
}

export default App;
