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

export interface MeResponse {
  authenticated: boolean;
  name?: string;
  email?: string;
  preferredUsername?: string;
  authType?: string;
}

export async function Login(token: string) {
  const resp = await karmadaClient.post<IResponse<{ token: string }>>(
    `/login`,
    { token },
    {
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    },
  );
  return resp.data;
}

export async function Me() {
  const resp = await karmadaClient.get<IResponse<MeResponse>>(`me`);
  return resp.data;
}

export async function GetOIDCEnabled() {
  const resp = await karmadaClient.get<
    IResponse<{
      enabled: boolean;
    }>
  >(`/auth/oidc/enabled`);
  return resp.data;
}

export async function GetOIDCLoginURL() {
  const resp = await karmadaClient.get<
    IResponse<{
      authUrl: string;
      state: string;
    }>
  >(`/auth/oidc/login`);
  return resp.data;
}

export async function OIDCCallback(code: string, state: string) {
  const resp = await karmadaClient.get<
    IResponse<{
      token: string;
    }>
  >(`/auth/oidc/callback`, { params: { code, state } });
  return resp.data;
}
