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

import { useState } from 'react';
import { 
  Row, 
  Col, 
  Typography, 
  Button, 
  Input, 
  Statistic,
  Card,
  message,
  Select,
  Flex,
} from 'antd';
import { useQuery } from '@tanstack/react-query';
import { GetClusters, DeleteCluster, GetClusterDetail } from '@/services/cluster';
import { ClusterCard } from '@/components/cluster';
import { PlusOutlined, SearchOutlined, ReloadOutlined, FilterOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import NewClusterModal from './new-cluster-modal';
import type { Cluster, ClusterDetail } from '@/services/cluster';


const { Title, Text } = Typography;
const { Search } = Input;
const { Option } = Select;

const ClusterManagePage = () => {
  const [messageApi, messageContextHolder] = message.useMessage();
  const navigate = useNavigate();
  
  const [searchText, setSearchText] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [clusterModalData, setModalData] = useState<{
    mode: 'create' | 'edit';
    open: boolean;
    clusterDetail?: ClusterDetail;
  }>({
    mode: 'create',
    open: false,
  });

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['GetClusters'],
    queryFn: async () => {
      const ret = await GetClusters();
      return ret.data;
    },
  });

  // 转换API数据为组件需要的格式
  const transformClusterData = (clusters: Cluster[]) => {
    return clusters.map(cluster => ({
      name: cluster.objectMeta.name,
      status: cluster.ready ? 'ready' as const : 'notReady' as const,
      kubernetesVersion: cluster.kubernetesVersion,
      syncMode: cluster.syncMode as 'Push' | 'Pull',
      nodeStatus: {
        ready: cluster.nodeSummary?.readyNum || 0,
        total: cluster.nodeSummary?.totalNum || 0,
      },
      resources: {
        cpu: {
          used: cluster.allocatedResources?.cpuFraction ? 
            (cluster.allocatedResources.cpuFraction / 100) * (cluster.allocatedResources.cpuCapacity || 0) : 0,
          total: cluster.allocatedResources?.cpuCapacity || 0,
          percentage: cluster.allocatedResources?.cpuFraction || 0,
        },
        memory: {
          used: cluster.allocatedResources?.memoryFraction ? 
            (cluster.allocatedResources.memoryFraction / 100) * (cluster.allocatedResources.memoryCapacity || 0) / (1024 * 1024 * 1024) : 0,
          total: (cluster.allocatedResources?.memoryCapacity || 0) / (1024 * 1024 * 1024),
          percentage: cluster.allocatedResources?.memoryFraction || 0,
        },
        pods: {
          used: cluster.allocatedResources?.allocatedPods || 0,
          total: cluster.allocatedResources?.podCapacity || 0,
          percentage: cluster.allocatedResources?.podFraction || 0,
        },
      },
      createTime: cluster.objectMeta.creationTimestamp,
      originalData: cluster,
    }));
  };

  const clusterData = data ? transformClusterData(data.clusters || []) : [];

  // 过滤集群数据
  const filteredClusters = clusterData.filter(cluster => {
    const matchesSearch = cluster.name.toLowerCase().includes(searchText.toLowerCase());
    const matchesStatus = statusFilter === 'all' || cluster.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  // 统计数据
  const stats = {
    total: clusterData.length,
    ready: clusterData.filter(c => c.status === 'ready').length,
    notReady: clusterData.filter(c => c.status === 'notReady').length,
  };

  const handleCreateCluster = () => {
    setModalData({
      mode: 'create',
      open: true,
    });
  };

  const handleEditCluster = async (clusterName: string) => {
    try {
      const detail = await GetClusterDetail(clusterName);
      setModalData({
        mode: 'edit',
        open: true,
        clusterDetail: detail.data,
      });
    } catch (error) {
      messageApi.error('获取集群详情失败');
    }
  };

  const handleDeleteCluster = async (clusterName: string) => {
    try {
      await DeleteCluster(clusterName);
      messageApi.success('集群删除成功');
      refetch();
    } catch (error) {
      messageApi.error('集群删除失败');
    }
  };



  return (
    <div style={{ padding: '24px', backgroundColor: '#f0f2f5', minHeight: '100vh' }}>
      {messageContextHolder}
      
      {/* 页面标题和操作栏 */}
      <div style={{ marginBottom: '24px' }}>
        <Flex justify="space-between" align="center" style={{ marginBottom: '16px' }}>
          <div>
            <Title level={2} style={{ margin: 0 }}>
              集群管理
            </Title>
            <Text type="secondary">
              管理和监控所有成员集群
            </Text>
          </div>
          <Button 
            type="primary" 
            icon={<PlusOutlined />} 
            onClick={handleCreateCluster}
            size="large"
          >
            添加集群
          </Button>
        </Flex>

        {/* 搜索和过滤栏 */}
        <Flex gap={16} align="center">
          <Search
            placeholder="搜索集群名称"
            allowClear
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            style={{ width: 300 }}
            prefix={<SearchOutlined />}
          />
          <Select
            value={statusFilter}
            onChange={setStatusFilter}
            style={{ width: 120 }}
          >
            <Option value="all">全部状态</Option>
            <Option value="ready">Ready</Option>
            <Option value="notReady">Not Ready</Option>
          </Select>
          <Button 
            icon={<ReloadOutlined />} 
            onClick={() => refetch()}
            loading={isLoading}
          >
            刷新
          </Button>
        </Flex>
      </div>

      {/* 统计信息卡片 */}
      <Row gutter={[16, 16]} style={{ marginBottom: '24px' }}>
        <Col xs={24} sm={8}>
          <Card>
            <Statistic
              title="总集群数"
              value={stats.total}
              valueStyle={{ color: '#1890ff' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={8}>
          <Card>
            <Statistic
              title="正常集群"
              value={stats.ready}
              valueStyle={{ color: '#52c41a' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={8}>
          <Card>
            <Statistic
              title="异常集群"
              value={stats.notReady}
              valueStyle={{ color: '#ff4d4f' }}
            />
          </Card>
        </Col>
      </Row>

      {/* 集群卡片网格 */}
      <Row gutter={[16, 16]}>
        {filteredClusters.map((cluster) => (
          <Col xs={24} lg={12} xl={8} key={cluster.name}>
            <ClusterCard
              name={cluster.name}
              status={cluster.status}
              kubernetesVersion={cluster.kubernetesVersion}
              syncMode={cluster.syncMode}
              nodeStatus={cluster.nodeStatus}
              resources={cluster.resources}
              createTime={cluster.createTime}
              onView={() => navigate(`/cluster-manage/clusters/${cluster.name}`)}
              onEdit={() => handleEditCluster(cluster.name)}
              onManage={() => navigate(`/cluster-manage/clusters/${cluster.name}/nodes`)}
                             onDelete={() => handleDeleteCluster(cluster.name)}
            />
          </Col>
        ))}
      </Row>

      {/* 空状态 */}
      {filteredClusters.length === 0 && !isLoading && (
        <div style={{ 
          textAlign: 'center', 
          padding: '60px 0',
          backgroundColor: '#ffffff',
          borderRadius: '8px',
          marginTop: '24px',
        }}>
          <Text type="secondary" style={{ fontSize: '16px' }}>
            {searchText || statusFilter !== 'all' ? '没有找到匹配的集群' : '暂无集群数据'}
          </Text>
          {!searchText && statusFilter === 'all' && (
            <div style={{ marginTop: '16px' }}>
              <Button type="primary" icon={<PlusOutlined />} onClick={handleCreateCluster}>
                添加第一个集群
              </Button>
            </div>
          )}
        </div>
      )}

      {/* 新建/编辑集群模态框 */}
      <NewClusterModal
        mode={clusterModalData.mode}
        open={clusterModalData.open}
        onOk={async (ret) => {
          if (ret.code === 200) {
            if (clusterModalData.mode === 'create') {
              messageApi.success('集群接入成功');
            } else if (clusterModalData.mode === 'edit') {
              messageApi.success('集群更新成功');
            }
            refetch();
            setModalData({
              clusterDetail: undefined,
              mode: 'create',
              open: false,
            });
          } else {
            if (clusterModalData.mode === 'create') {
              messageApi.error('集群接入失败');
            } else if (clusterModalData.mode === 'edit') {
              messageApi.error('集群更新失败');
            }
          }
        }}
        onCancel={() => {
          setModalData({
            clusterDetail: undefined,
            mode: 'create',
            open: false,
          });
        }}
        clusterDetail={clusterModalData.clusterDetail}
      />
    </div>
  );
};

export default ClusterManagePage;
