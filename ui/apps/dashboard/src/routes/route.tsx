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

import i18nInstance from '@/utils/i18n';
import React, { ReactNode } from 'react';
import { NonIndexRouteObject, redirect } from 'react-router-dom';
import type { MenuProps } from 'antd';
import _ from 'lodash';
import { MainLayout } from '@/layout';
import ErrorBoundary from '@/components/error';
import Overview from '@/pages/overview';
import {
  MultiCloudConfig,
  MultiCloudNamespace,
  MultiCloudService,
  MultiCloudworkload,
} from '@/pages/multicloud-resource-manage';
import {
  MultiCloudOverridePolicy,
  MultiCloudPropagationPolicy,
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
import AssistantPage from '@/pages/assistant';
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
            sidebarName: i18nInstance.t('86385379cf9cfbc2c554944f1c054a45'),
            icon: <Icons.overview {...IconStyles} />,
          },
        },
        {
          path: '/multicloud-resource-manage',
          handle: {
            sidebarKey: 'MULTICLOUD-RESOURCE-MANAGE',
            sidebarName: i18nInstance.t('21a4e07b08a4efbbfe2b9d88c208836a'),
            isPage: false,
            icon: <Icons.resource {...IconStyles} />,
          },
          children: [
            {
              path: 'namespace',
              element: <MultiCloudNamespace />,
              handle: {
                sidebarKey: 'NAMESPACE',
                sidebarName: i18nInstance.t(
                  'a4b28a416f0b6f3c215c51e79e517298',
                  '命名空间',
                ),
              },
            },
            {
              path: 'workload',
              element: <MultiCloudworkload />,
              handle: {
                sidebarKey: 'WORKLOAD',
                sidebarName: i18nInstance.t('c3bc562e9ffcae6029db730fe218515c'),
              },
            },
            {
              path: 'service',
              element: <MultiCloudService />,
              handle: {
                sidebarKey: 'SERVICE',
                sidebarName: i18nInstance.t('4653569c7943335f62caa11e38d48aa0'),
              },
            },
            {
              path: 'config',
              element: <MultiCloudConfig />,
              handle: {
                sidebarKey: 'CONFIG',
                sidebarName: i18nInstance.t('837d8a6473195b8b5e85d58a72cb9c7e'),
              },
            },
          ],
        },
        {
          path: '/multicloud-policy-manage',
          handle: {
            sidebarKey: 'MULTICLOUD-POLICY-MANAGE',
            sidebarName: i18nInstance.t('8654db688fcb1f7f11f6d7ea6b208a55'),
            icon: <Icons.policy {...IconStyles} />,
            isPage: false,
          },
          children: [
            {
              path: 'propagation-policy',
              element: <MultiCloudPropagationPolicy />,
              handle: {
                sidebarKey: 'PROPAGATION-POLICY',
                sidebarName: i18nInstance.t('a95abe7b8eeb55427547e764bf39f1c4'),
              },
            },
            {
              path: 'override-policy',
              element: <MultiCloudOverridePolicy />,
              handle: {
                sidebarKey: 'OVERRIDE-POLICY',
                sidebarName: i18nInstance.t('0a7e9443c41575378d2db1e288d3f1cb'),
              },
            },
          ],
        },
        {
          path: '/cluster-manage',
          element: <ClusterManage />,
          handle: {
            sidebarKey: 'CLUSTER-MANAGE',
            sidebarName: i18nInstance.t('74ea72bbd64d8251bbc2642cc38e7bb1'),
            icon: <Icons.clusters {...IconStyles} />,
            isPage: false,
          },
        },
        {
          path: '/basic-config',
          handle: {
            sidebarKey: 'BASIC-CONFIG',
            sidebarName: i18nInstance.t('cba0d61936703636d3ab45914c9e754a'),
            icon: <Icons.basicConfig {...IconStyles} />,
            isPage: false,
          },
          children: [
            {
              path: 'oem',
              element: <Oem />,
              handle: {
                sidebarKey: 'OEM',
                sidebarName: i18nInstance.t('bdf0eb5121c6dd3b2c57ab9d01b02a7e'),
              },
            },
            {
              path: 'upgrade',
              element: <Upgrade />,
              handle: {
                sidebarKey: 'UPGRADE',
                sidebarName: i18nInstance.t('0506797675615f94ddf57bebca9da81f'),
              },
            },
            {
              path: 'karmada-config',
              element: <KarmadaConfig />,
              handle: {
                sidebarKey: 'KARMADA-CONFIG',
                sidebarName: i18nInstance.t('3955f4df8c2b4cb52d3c91296308edef'),
              },
            },
            {
              path: 'helm',
              element: <Helm />,
              handle: {
                sidebarKey: 'HELM',
                sidebarName: i18nInstance.t('f8bb304d7eae5ddba6ac13bf6931187b'),
              },
            },
            {
              path: 'registry',
              element: <Registry />,
              handle: {
                sidebarKey: 'REGISTRY',
                sidebarName: i18nInstance.t('c8330a63d6dfbb7dabb24cbf26430cb4'),
              },
            },
          ],
        },
        {
          path: '/advanced-config',
          handle: {
            sidebarKey: 'ADVANCED-CONFIG',
            sidebarName: i18nInstance.t(
              '1f318234cab713b51b5172d91770bc11',
              '高级配置',
            ),
            icon: <Icons.advancedConfig {...IconStyles} />,
            isPage: false,
          },
          children: [
            {
              path: 'failover',
              element: <Failover />,
              handle: {
                sidebarKey: 'FAILOVER',
                sidebarName: i18nInstance.t('41c84a00fe4f8f03d3f06a5887de31c8'),
              },
            },
            {
              path: 'reschedule',
              element: <Reschedule />,
              handle: {
                sidebarKey: 'RESCHEDULE',
                sidebarName: i18nInstance.t('28a905999d14769b2aae998b74c1a864'),
              },
            },
            {
              path: 'permission',
              element: <Permission />,
              handle: {
                sidebarKey: 'PERMISSION',
                sidebarName: i18nInstance.t('23bbdd59d0b1d94621fc98e7f533ad9f'),
              },
            },
          ],
        },
        {
          path: '/addon',
          handle: {
            sidebarKey: 'ADDON',
            sidebarName: i18nInstance.t('14c4e4ecdac2ff3337385747dda6e621'),
            icon: <Icons.addon {...IconStyles} />,
            isPage: false,
          },
          children: [
            {
              path: 'buildin',
              element: <BuildInAddon />,
              handle: {
                sidebarKey: 'BUILDIN',
                sidebarName: i18nInstance.t('976eb1e050088fbdd7d2cab3f644e7e5'),
              },
            },
            {
              path: 'thirdparty',
              element: <ThridPartyAddon />,
              handle: {
                sidebarKey: 'THIRDPARTY',
                sidebarName: i18nInstance.t('fb7f97d757a27c46d1e4f03287d9dd1f'),
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
    {
      path: '/assistant',
      errorElement: <ErrorBoundary />,
      element: <AssistantPage />,
    },
  ];

  return routes;
}
export const routes: RouteObject[] = getRoutes();

export const flattenRoutes: Record<string, string> = {};

function concatPathSegment(paths: string[] = []) {
  return paths.map((p) => (p.startsWith('/') ? p : `/${p}`)).join('');
}

export function traverseRoutes(route: RouteObject, paths: string[] = []) {
  if (_.isUndefined(route) || _.isUndefined(route.handle)) return;
  const { path = '' } = route;
  const { sidebarKey } = route.handle;
  const newPaths = [...paths, path];
  if (!route.children) {
    flattenRoutes[sidebarKey] = concatPathSegment(newPaths);
  } else {
    route.children.forEach((child) => traverseRoutes(child, newPaths));
  }
}

export function filterMenuItems(
  menuItems: MenuItem[],
  menuInfo: Record<string, boolean>,
): MenuItem[] {
  return menuItems
    .filter((menuItem) => {
      if (!menuItem) return;
      const menuKey = menuItem.key as string;
      if (menuKey && !menuInfo[menuKey]) {
        return;
      }
      if (menuItem.children && menuItem.children.length > 0) {
        menuItem.children = filterMenuItems(menuItem.children, menuInfo);
      }
      return menuItem;
    })
    .filter(Boolean);
}

// type MenuPropsItems = MenuProps['items']
type MenuItem = Required<MenuProps>['items'][number] & {
  children?: MenuItem[];
};

function getItem(
  label: React.ReactNode,
  key: React.Key,
  icon?: React.ReactNode,
  children?: (MenuItem | null)[],
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
  keyPaths: string[] = [],
): MenuItem | null {
  if (_.isUndefined(route.handle)) return null;
  const { sidebarName, sidebarKey, icon } = route.handle;
  const newKeyPaths = [...keyPaths, sidebarKey];
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
    .map((route) => convertRouteToMenuItem(route) as MenuItem)
    .filter((menuItem) => !_.isNull(menuItem));

  rs[0].children.map((route) => traverseRoutes(route));
}

initRoute();

export { menuItems };
