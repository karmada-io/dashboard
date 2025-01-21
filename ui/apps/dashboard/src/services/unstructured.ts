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

import { IResponse, karmadaClient } from './base';

export async function DeleteResource(params: UnstructuredParams) {
  const url = generateUrlForUnstructuredParams(params);
  const resp = await karmadaClient.delete<IResponse<any>>(url);
  return resp.data;
}

export async function GetResource(params: UnstructuredParams) {
  const url = generateUrlForUnstructuredParams(params);
  const resp = await karmadaClient.get<IResponse<any>>(url);
  return resp.data;
}

export async function PutResource(
  params: UnstructuredParams & {
    content: Record<string, any>;
  },
) {
  const url = generateUrlForUnstructuredParams(params);
  const resp = await karmadaClient.put<IResponse<any>>(url, params.content);
  return resp.data;
}

interface UnstructuredParams {
  kind: string;
  name: string;
  namespace?: string;
}

function generateUrlForUnstructuredParams(params: UnstructuredParams) {
  const { kind, name, namespace } = params;
  if (namespace) {
    return `/_raw/${kind}/namespace/${namespace}/name/${name}`;
  } else {
    return `/_raw/${kind}/name/${name}`;
  }
}

export async function CreateResource(
  params: UnstructuredParams & {
    content: Record<string, any>;
  },
) {
  const url = generateUrlForUnstructuredParams(params);
  const resp = await karmadaClient.post<IResponse<any>>(url, params.content);
  return resp.data;
}
