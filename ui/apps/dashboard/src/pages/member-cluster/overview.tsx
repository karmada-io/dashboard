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

import { useMemberClusterContext } from '@/hooks';
import { useQuery } from '@tanstack/react-query';
import { GetClusterDetail, ClusterDetail } from '@/services/cluster';
import { useClusters } from '@/hooks/use-cluster';
import { fleetGPUCapacity } from '@/utils/gpu';

export default function MemberClusterOverview() {
  const { memberClusterName } = useMemberClusterContext();
  const { data: clusterResp, isLoading } = useQuery({
    queryKey: ['GetClusterDetail', memberClusterName],
    queryFn: async () => {
      const ret = await GetClusterDetail(memberClusterName);
      return ret;
    },
  });

  const clusterDetail: ClusterDetail | undefined = clusterResp?.data;

  const nodeCount = clusterDetail?.nodeSummary.totalNum ?? 0;
  const totalPods = clusterDetail?.allocatedResources.allocatedPods ?? 0;
  const cpuUsage = clusterDetail?.allocatedResources.cpuFraction ?? null;
  const memoryUsage = clusterDetail?.allocatedResources.memoryFraction ?? null;
  const gpuCapacity = clusterDetail?.allocatedResources.gpuCapacity ?? 0;
  const allocatedGPUs = clusterDetail?.allocatedResources.allocatedGPUs ?? 0;
  const kubeVersion = clusterDetail?.kubernetesVersion ?? '-';
  const syncMode = clusterDetail?.syncMode ?? '-';
  const loading = isLoading;

  const formatPercentage = (value: number | null) =>
    value !== null ? `${value.toFixed(2)}%` : '-';

  // Clusters without GPU nodes report zero capacity, so show a dash rather
  // than "0/0" which would read as an exhausted pool.
  const gpuUsage = gpuCapacity > 0 ? `${allocatedGPUs}/${gpuCapacity}` : '—';

  // The GPU card only appears when the fleet has accelerator capacity, so a
  // fleet without accelerators keeps the original 4-card layout.
  const { data: clusters } = useClusters();
  const showGPU = fleetGPUCapacity(clusters) > 0;

  return (
    <div className="p-4 space-y-6">
      <h2 className="text-lg font-semibold mb-4">
        Member Cluster({memberClusterName}) Overview
        <p className="mt-1 max-w-2xl text-sm/6 text-gray-500">
          Monitor your Kubernetes cluster health and performance.
        </p>
      </h2>

      <div className="mt-6 bg-white p-4 rounded-lg shadow">
        <h3 className="text-lg font-medium mb-4">Cluster Information</h3>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <span className="font-medium">Cluster Name:</span>{' '}
            {memberClusterName}
          </div>
          <div>
            <span className="font-medium">Sync Mode:</span> {syncMode}
          </div>
          <div>
            <span className="font-medium">Kubernetes Version:</span> {kubeVersion}
          </div>
          <div>
            <span className="font-medium">Region:</span> -
          </div>
        </div>
      </div>

      <div
        className={`grid grid-cols-1 md:grid-cols-2 ${showGPU ? 'lg:grid-cols-5' : 'lg:grid-cols-4'} gap-4`}
      >
        <div className="bg-white p-4 rounded-lg shadow">
          <h3 className="text-sm font-medium text-gray-500 mb-2">Total Pods</h3>
          <p className="text-2xl font-bold text-green-600">
            {loading ? '...' : totalPods}
          </p>
        </div>
        <div className="bg-white p-4 rounded-lg shadow">
          <h3 className="text-sm font-medium text-gray-500 mb-2">Node Count</h3>
          <p className="text-2xl font-bold text-blue-600">
            {loading ? '...' : nodeCount}
          </p>
        </div>
        <div className="bg-white p-4 rounded-lg shadow">
          <h3 className="text-sm font-medium text-gray-500 mb-2">CPU Usage</h3>
          <p className="text-2xl font-bold text-orange-600">
            {loading ? '...' : formatPercentage(cpuUsage)}
          </p>
        </div>
        <div className="bg-white p-4 rounded-lg shadow">
          <h3 className="text-sm font-medium text-gray-500 mb-2">Memory Usage</h3>
          <p className="text-2xl font-bold text-red-600">
            {loading ? '...' : formatPercentage(memoryUsage)}
          </p>
        </div>
        {showGPU && (
          <div className="bg-white p-4 rounded-lg shadow">
            <h3 className="text-sm font-medium text-gray-500 mb-2">GPU Usage</h3>
            <p className="text-2xl font-bold text-purple-600">
              {loading ? '...' : gpuUsage}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
