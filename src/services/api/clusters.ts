import { apiClient } from './client';
import { Cluster, DataSelectQuery, ListMeta, LabelParam, TaintParam } from '../../types';

interface ListClusterResponse {
  listMeta: ListMeta;
  clusters: Cluster[];
  errors: string[];
}

interface CreateClusterParams {
  kubeconfig: string;
  clusterName: string;
  mode: 'Push' | 'Pull';
}

interface UpdateClusterParams {
  clusterName: string;
  labels: LabelParam[];
  taints: TaintParam[];
}

const convertDataSelectQuery = (query: DataSelectQuery) => {
  const dsQuery: Record<string, string | number> = {};
  if (query.filterBy) {
    dsQuery['filterBy'] = query.filterBy.join(',');
  }
  if (query.sortBy) {
    dsQuery['sortBy'] = query.sortBy.join(',');
  }
  if (query.itemsPerPage && query.page) {
    dsQuery['itemsPerPage'] = query.itemsPerPage;
    dsQuery['page'] = query.page;
  }
  return dsQuery;
};

export const clustersAPI = {
  // Get all clusters
  async getClusters(query: DataSelectQuery = {}): Promise<ListClusterResponse> {
    const response = await apiClient.get<ListClusterResponse>('/cluster', {
      params: convertDataSelectQuery(query),
    });
    return response.data;
  },

  // Get specific cluster details
  async getCluster(clusterName: string): Promise<Cluster> {
    const response = await apiClient.get<Cluster>(`/cluster/${clusterName}`);
    return response.data;
  },

  // Create new cluster
  async createCluster(params: CreateClusterParams): Promise<string> {
    const response = await apiClient.post<string>('/cluster', {
      memberClusterKubeconfig: params.kubeconfig,
      memberClusterName: params.clusterName,
      syncMode: params.mode,
    });
    return response.data;
  },

  // Update cluster
  async updateCluster(params: UpdateClusterParams): Promise<Cluster> {
    const { clusterName, ...updateData } = params;
    const response = await apiClient.put<Cluster>(`/cluster/${clusterName}`, updateData);
    return response.data;
  },

  // Delete cluster
  async deleteCluster(clusterName: string): Promise<Cluster> {
    const response = await apiClient.delete<Cluster>(`/cluster/${clusterName}`);
    return response.data;
  },

  // Get cluster health metrics
  async getClusterHealth(clusterName: string): Promise<any> {
    const response = await apiClient.get(`/cluster/${clusterName}/health`);
    return response.data;
  },

  // Get cluster nodes
  async getClusterNodes(clusterName: string): Promise<any> {
    const response = await apiClient.get(`/cluster/${clusterName}/nodes`);
    return response.data;
  },

  // Get cluster events
  async getClusterEvents(clusterName: string): Promise<any> {
    const response = await apiClient.get(`/cluster/${clusterName}/events`);
    return response.data;
  },
};

export default clustersAPI;