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

import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { GetClusters, Cluster } from '@/services/cluster';

/**
 * 集群列表 Hook，用于获取集群列表
 */
const useCluster = () => {
  const {
    data: clusterData,
    isLoading: loading,
    refetch,
  } = useQuery({
    queryKey: ['GetClusters'],
    queryFn: async () => {
      const response = await GetClusters();
      return response.data || {};
    },
  });

  // 处理集群列表
  const clusterList = useMemo(() => {
    if (!clusterData?.clusters) return [];
    return clusterData.clusters.map((cluster: Cluster) => ({
      name: cluster.objectMeta.name,
      ready: cluster.ready,
      version: cluster.kubernetesVersion,
      syncMode: cluster.syncMode,
      nodeCount: cluster.nodeSummary?.totalNum || 0,
      readyNodeCount: cluster.nodeSummary?.readyNum || 0,
      ...cluster
    }));
  }, [clusterData]);

  return {
    clusterList,
    loading,
    refetchClusterList: refetch,
  };
};

export default useCluster; 