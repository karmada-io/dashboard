import React, { ReactNode } from 'react';
import { NonIndexRouteObject, redirect } from 'react-router-dom';
import type { MenuProps } from 'antd';
import _ from 'lodash';
import { MainLayout } from '@/layout';
import ErrorBoundary from '@/components/error';
import Overview from '@/pages/overview';
import {
  MultiCloudConfig,
  MultiCloudworkload,
  MultiCloudService,
  MultiCloudNamespace,
} from '@/pages/multicloud-resource-manage';
import {
  MultiCloudPropagationPolicy,
  MultiCloudOverridePolicy,
} from '@/pages/multicloud-policy-manage';
import {
  Helm,
  KarmadaConfig,
  Oem,
  Registry,
  Upgrade,
} from '@/pages/basic-config';
import { Failover, Permission, Reschedule } from '@/pages/advanced-config';
import { BuildInAddon, ThridPartyAddon } from '@/pages/addon';
import ClusterManage from '@/pages/cluster-manage';
import Login from '@/pages/login';
import { Icons } from '@/components/icons';

export interface IRouteObjectHandle {
  icon?: ReactNode;
  sidebarKey: string;
  sidebarName: string;
  isPage?: boolean;
}

export interface RouteObject extends NonIndexRouteObject {
  handle?: IRouteObjectHandle;
  children?: RouteObject[];
}

export interface FlattenRouteObject extends IRouteObjectHandle {
  url: string;
}

const redirectToHomepage = () => {
  return redirect('/overview');
};
const IconStyles = {
  width: 20,
  height: 20,
};

export function getRoutes() {
  const routes: RouteObject[] = [
    {
      path: '/',
      element: <MainLayout />,
      errorElement: <ErrorBoundary />,
      children: [
        {
          path: '/',
          loader: redirectToHomepage,
        },
        {
          path: '/overview',
          element: <Overview />,
          handle: {
            sidebarKey: 'OVERVIEW',
            sidebarName: '概览',
            icon: <Icons.overview {...IconStyles} />,
          },
        },
        {
          path: '/multicloud-resource-manage',
          handle: {
            sidebarKey: 'MULTICLOUD-RESOURCE-MANAGE',
            sidebarName: '多云资源管理',
            isPage: false,
            icon: <Icons.resource {...IconStyles} />,
          },
          children: [
            {
              path: 'namespace',
              element: <MultiCloudNamespace />,
              handle: {
                sidebarKey: 'NAMESPACE',
                sidebarName: '命名空间',
              },
            },
            {
              path: 'workload',
              element: <MultiCloudworkload />,
              handle: {
                sidebarKey: 'WORKLOAD',
                sidebarName: '工作负载',
              },
            },
            {
              path: 'service',
              element: <MultiCloudService />,
              handle: {
                sidebarKey: 'SERVICE',
                sidebarName: '服务管理',
              },
            },
            {
              path: 'config',
              element: <MultiCloudConfig />,
              handle: {
                sidebarKey: 'CONFIG',
                sidebarName: '配置管理',
              },
            },
          ],
        },
        {
          path: '/multicloud-policy-manage',
          handle: {
            sidebarKey: 'MULTICLOUD-POLICY-MANAGE',
            sidebarName: '策略管理',
            icon: <Icons.policy {...IconStyles} />,
            isPage: false,
          },
          children: [
            {
              path: 'propagation-policy',
              element: <MultiCloudPropagationPolicy />,
              handle: {
                sidebarKey: 'PROPAGTION-POLICY',
                sidebarName: '调度策略',
              },
            },
            {
              path: 'override-policy',
              element: <MultiCloudOverridePolicy />,
              handle: {
                sidebarKey: 'OVERRIDE-POLICY',
                sidebarName: '差异化策略',
              },
            },
          ],
        },
        {
          path: '/cluster-manage',
          element: <ClusterManage />,
          handle: {
            sidebarKey: 'CLUSTER-MANAGE',
            sidebarName: '集群管理',
            icon: <Icons.clusters {...IconStyles} />,
            isPage: false,
          },
        },
        {
          path: '/basic-config',
          handle: {
            sidebarKey: 'BASIC-CONFIG',
            sidebarName: '基本配置',
            icon: <Icons.basicConfig {...IconStyles} />,
            isPage: false,
          },
          children: [
            {
              path: 'oem',
              element: <Oem />,
              handle: {
                sidebarKey: 'OEM',
                sidebarName: 'OEM配置',
              },
            },
            {
              path: 'upgrade',
              element: <Upgrade />,
              handle: {
                sidebarKey: 'UPGRADE',
                sidebarName: '升级管理',
              },
            },
            {
              path: 'karmada-config',
              element: <KarmadaConfig />,
              handle: {
                sidebarKey: 'KARMADA-CONFIG',
                sidebarName: 'Karmada配置',
              },
            },
            {
              path: 'helm',
              element: <Helm />,
              handle: {
                sidebarKey: 'HELM',
                sidebarName: 'Helm配置',
              },
            },
            {
              path: 'registry',
              element: <Registry />,
              handle: {
                sidebarKey: 'REGISTRY',
                sidebarName: 'Registry配置',
              },
            },
          ],
        },
        {
          path: '/advanced-config',
          handle: {
            sidebarKey: 'ADVANCED-CONFIG',
            sidebarName: '高级配置',
            icon: <Icons.advancedConfig {...IconStyles} />,
            isPage: false,
          },
          children: [
            {
              path: 'failover',
              element: <Failover />,
              handle: {
                sidebarKey: 'FAILOVER',
                sidebarName: 'Failover配置',
              },
            },
            {
              path: 'reschedule',
              element: <Reschedule />,
              handle: {
                sidebarKey: 'RESCHEDULE',
                sidebarName: '重调度配置',
              },
            },
            {
              path: 'permission',
              element: <Permission />,
              handle: {
                sidebarKey: 'PERMISSION',
                sidebarName: '权限管理',
              },
            },
          ],
        },
        {
          path: '/addon',
          handle: {
            sidebarKey: 'ADDON',
            sidebarName: '扩展管理',
            icon: <Icons.addon {...IconStyles} />,
            isPage: false,
          },
          children: [
            {
              path: 'buildin',
              element: <BuildInAddon />,
              handle: {
                sidebarKey: 'BUILDIN',
                sidebarName: '内置扩展',
              },
            },
            {
              path: 'thirdparty',
              element: <ThridPartyAddon />,
              handle: {
                sidebarKey: 'THIRDPARTY',
                sidebarName: '第三方扩展',
              },
            },
          ],
        },
      ],
    },
    {
      path: '/login',
      errorElement: <ErrorBoundary />,
      element: <Login />,
    },
  ];
  return routes;
}
export const routes: RouteObject[] = getRoutes();

export let flattenRoutes: Record<string, string> = {};

function concatPathSegment(paths: string[] = []) {
  return paths.map((p) => (p.startsWith('/') ? p : `/${p}`)).join('');
}

export function tranverseRoutes(route: RouteObject, paths: string[] = []) {
  if (_.isUndefined(route) || _.isUndefined(route.handle)) return;
  const { path = '' } = route;
  const { sidebarKey } = route.handle;
  const newPaths = [...paths, path];
  if (!route.children) {
    flattenRoutes[sidebarKey] = concatPathSegment(newPaths);
  } else {
    route.children.forEach((child) => tranverseRoutes(child, newPaths));
  }
}

// type MenuPropsItems = MenuProps['items']
type MenuItem = Required<MenuProps>['items'][number];

function getItem(
  label: React.ReactNode,
  key: React.Key,
  icon?: React.ReactNode,
  children?: MenuItem[],
  type?: 'group',
): MenuItem {
  return {
    key,
    icon,
    children,
    label,
    type,
  } as MenuItem;
}

function convertRouteToMenuItem(
  route: RouteObject,
  keypaths: string[] = [],
): MenuItem | null {
  if (_.isUndefined(route.handle)) return null;
  const { sidebarName, sidebarKey, icon } = route.handle;
  const newKeyPaths = [...keypaths, sidebarKey];
  if (!route.children) {
    return getItem(sidebarName, sidebarKey, icon);
  } else {
    return getItem(
      sidebarName,
      sidebarKey,
      icon,
      route.children
        .map((child) => convertRouteToMenuItem(child, newKeyPaths))
        .filter((menuItem) => !_.isNull(menuItem)),
    );
  }
}

let menuItems: MenuItem[] = [];

export function initRoute() {
  const rs = getRoutes();
  if (!rs[0].children) return;

  menuItems = rs[0].children
    .map((route) => convertRouteToMenuItem(route))
    .filter((menuItem) => !_.isNull(menuItem));

  rs[0].children.map((route) => tranverseRoutes(route));
}

initRoute();

export { menuItems };
