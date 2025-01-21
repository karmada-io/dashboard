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

import { IResponse, karmadaClient } from '@/services/base.ts';

export interface dockerRegistry {
  name: string;
  url: string;
  user: string;
  password: string;
  add_time: number;
}

export interface chartRegistry {
  name: string;
  url: string;
  user: string;
  password: string;
  add_time: number;
}

export interface menuConfig {
  path: string;
  enable: boolean;
  sidebar_key: string;
  children: menuConfig[];
}

interface DashboardConfig {
  docker_registries: dockerRegistry[];
  chart_registries: chartRegistry[];
  menu_configs: menuConfig[];
}

export async function GetDashboardConfig() {
  const url = '/config';
  const resp = await karmadaClient.get<IResponse<DashboardConfig>>(url);
  return resp.data;
}

export async function SetDashboardConfig(cfg: Partial<DashboardConfig>) {
  const url = '/config';
  const resp = await karmadaClient.post<IResponse<DashboardConfig>>(url, cfg);
  return resp.data;
}
