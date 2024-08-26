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
