/*
Copyright 2026 The Karmada Authors.

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

import { describe, expect, it } from 'vitest';
import type { Cluster } from '@/services/cluster';
import { fleetGPUCapacity } from './gpu';

const clusterWith = (gpuCapacity: number) =>
  ({ allocatedResources: { gpuCapacity } }) as unknown as Cluster;

describe('fleetGPUCapacity', () => {
  it('sums GPU capacity across clusters', () => {
    expect(fleetGPUCapacity([clusterWith(8), clusterWith(4), clusterWith(0)])).toBe(12);
  });

  it('is zero for a fleet without GPUs or no data', () => {
    expect(fleetGPUCapacity([clusterWith(0)])).toBe(0);
    expect(fleetGPUCapacity(undefined)).toBe(0);
  });

  it('treats a response without GPU fields as zero', () => {
    expect(fleetGPUCapacity([{ allocatedResources: {} } as unknown as Cluster])).toBe(0);
  });
});
