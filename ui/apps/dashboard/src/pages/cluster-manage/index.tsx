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
import { PlusOutlined, SearchOutlined, ReloadOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import NewClusterModal from './new-cluster-modal';
import type { Cluster, ClusterDetail } from '@/services/cluster';
import '@/styles/tech-theme.css';
import ScrollContainer from '@/components/common/ScrollContainer';

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
      status: cluster.ready === 'True' ? 'ready' as const : 'notReady' as const,
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
    <ScrollContainer
      height="100vh"
      padding="0"
      background="transparent"
    >
      <div className="tech-background min-h-screen">
        {/* 粒子背景效果 */}
        <div className="tech-particles-container">
          {Array.from({ length: 12 }, (_, i) => (
            <div
              key={i}
              className="tech-particle"
              style={{
                left: `${Math.random() * 100}%`,
                animationDelay: `${Math.random() * 20}s`
              }}
            />
          ))}
        </div>

        <div className="relative z-10 p-6">
          {/* 页面标题 */}
          <div className="mb-8">
            <Title 
              level={1} 
              className="tech-hologram-text m-0 text-4xl font-bold"
              style={{ color: 'var(--tech-primary)' }}
            >
              🖥️ CLUSTER MANAGEMENT
            </Title>
            <Text className="text-gray-600 text-lg">
              多云集群管理与监控中心
            </Text>
          </div>

          {/* 操作区域 */}
          <div className="tech-card mb-6">
            <Flex justify="space-between" align="center" style={{ marginBottom: '16px' }}>
              <div>
                <Title level={3} style={{ margin: 0, color: 'var(--text-color)' }}>
                  集群概览
                </Title>
                <Text type="secondary">
                  当前管理 {stats.total} 个集群，{stats.ready} 个正常运行
                </Text>
              </div>
              <button 
                className="tech-btn-primary flex items-center space-x-2"
                onClick={handleCreateCluster}
              >
                <PlusOutlined />
                <span>添加集群</span>
              </button>
            </Flex>

            {/* 搜索和过滤栏 */}
            <Flex gap={16} align="center">
              <Search
                placeholder="搜索集群名称"
                allowClear
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
                style={{ width: 300 }}
                className="tech-search-input"
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
                style={{
                  borderColor: 'var(--tech-primary)',
                  color: 'var(--tech-primary)',
                }}
              >
                刷新
              </Button>
            </Flex>
          </div>

          {/* 统计信息卡片 */}
          <Row gutter={[24, 24]} style={{ marginBottom: '32px' }}>
            <Col xs={24} sm={8}>
              <div className="tech-card tech-hover-scale">
                <div className="text-center">
                  <div 
                    className="text-4xl font-bold mb-2 tech-hologram-text"
                    style={{ color: 'var(--tech-primary)' }}
                  >
                    {stats.total}
                  </div>
                  <Text className="text-gray-600 font-semibold uppercase tracking-wide">
                    总集群数
                  </Text>
                </div>
              </div>
            </Col>
            <Col xs={24} sm={8}>
              <div className="tech-card tech-hover-scale">
                <div className="text-center">
                  <div 
                    className="text-4xl font-bold mb-2 tech-hologram-text"
                    style={{ color: 'var(--success-color)' }}
                  >
                    {stats.ready}
                  </div>
                  <Text className="text-gray-600 font-semibold uppercase tracking-wide">
                    正常集群
                  </Text>
                </div>
              </div>
            </Col>
            <Col xs={24} sm={8}>
              <div className="tech-card tech-hover-scale">
                <div className="text-center">
                  <div 
                    className="text-4xl font-bold mb-2 tech-hologram-text"
                    style={{ color: 'var(--error-color)' }}
                  >
                    {stats.notReady}
                  </div>
                  <Text className="text-gray-600 font-semibold uppercase tracking-wide">
                    异常集群
                  </Text>
                </div>
              </div>
            </Col>
          </Row>

          {/* 集群卡片网格 */}
          <div className="tech-card mb-6">
            <Row gutter={[24, 24]}>
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
                    onView={() => navigate(`/cluster-manage/${cluster.name}`)}
                    onEdit={() => handleEditCluster(cluster.name)}
                    onManage={() => navigate(`/cluster-manage/${cluster.name}`)}
                    onDelete={() => handleDeleteCluster(cluster.name)}
                  />
                </Col>
              ))}
            </Row>
          </div>

          {/* 空状态 */}
          {filteredClusters.length === 0 && !isLoading && (
            <div className="tech-card text-center py-16">
              <PlusOutlined 
                className="text-6xl mb-6"
                style={{ color: 'var(--tech-primary)', opacity: 0.5 }}
              />
              <Text 
                className="text-xl block mb-6 tech-hologram-text"
                style={{ color: 'var(--tech-primary)' }}
              >
                {searchText || statusFilter !== 'all' ? '没有找到匹配的集群' : '暂无集群数据'}
              </Text>
              {!searchText && statusFilter === 'all' && (
                <button 
                  className="tech-btn-primary flex items-center space-x-2"
                  style={{ margin: '0 auto' }}
                  onClick={handleCreateCluster}
                >
                  <PlusOutlined />
                  <span>添加第一个集群</span>
                </button>
              )}
            </div>
          )}
        </div>

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
        {messageContextHolder}
      </div>
    </ScrollContainer>
  );
};

export default ClusterManagePage;
