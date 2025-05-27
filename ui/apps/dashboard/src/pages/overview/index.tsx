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

import React from 'react';
import { Row, Col, Typography, Space, Divider, Card } from 'antd';
import { useQuery } from '@tanstack/react-query';
import { GetOverview } from '@/services/overview';
import { GetClusters } from '@/services/cluster';
import { StatusCard, ResourceUsage, ClusterOverview, ResourceRadialOverview } from '@/components/dashboard';
import { 
  CloudServerOutlined, 
  ClusterOutlined, 
  SettingOutlined,
  AppstoreOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import i18nInstance from '@/utils/i18n';

const { Title, Text } = Typography;

const Overview = () => {
  const { data, isLoading } = useQuery({
    queryKey: ['GetOverview'],
    queryFn: async () => {
      const ret = await GetOverview();
      return ret.data;
    },
  });

  // 获取成员集群列表用于集群状态概览
  const { data: clusterListData, isLoading: clusterListLoading } = useQuery({
    queryKey: ['GetClusters'],
    queryFn: async () => {
      const ret = await GetClusters();
      return ret.data;
    },
  });

  // 转换集群列表数据为组件需要的格式
  const transformClusterData = () => {
    if (!clusterListData?.clusters) return [];
    
    return clusterListData.clusters.map(cluster => ({
      name: cluster.objectMeta.name,
      status: cluster.ready ? 'ready' as const : 'notReady' as const,
      nodes: {
        ready: cluster.nodeSummary?.readyNum || 0,
        total: cluster.nodeSummary?.totalNum || 0,
      },
      cpu: {
        used: (cluster.allocatedResources?.cpuCapacity || 0) * (cluster.allocatedResources?.cpuFraction || 0) / 100,
        total: cluster.allocatedResources?.cpuCapacity || 0,
      },
      memory: {
        used: (cluster.allocatedResources?.memoryCapacity || 0) * (cluster.allocatedResources?.memoryFraction || 0) / 100 / (1024 * 1024 * 1024),
        total: (cluster.allocatedResources?.memoryCapacity || 0) / (1024 * 1024 * 1024),
      },
      pods: {
        used: cluster.allocatedResources?.allocatedPods || 0,
        total: cluster.allocatedResources?.podCapacity || 0,
      },
      version: cluster.kubernetesVersion,
      syncMode: cluster.syncMode,
    }));
  };

  const clusterData = transformClusterData();

  return (
    <div style={{ padding: '24px', backgroundColor: '#f0f2f5', minHeight: '100vh' }}>
      {/* 页面标题 */}
      <div style={{ marginBottom: '24px' }}>
        <Title level={2} style={{ margin: 0, color: '#000000d9' }}>
          Karmada-Manager 概览
        </Title>
        <Text type="secondary">
          多云应用管理平台总控面板 - 最后更新: {dayjs().format('YYYY-MM-DD HH:mm:ss')}
        </Text>
      </div>

      {/* Karmada控制面状态卡片 */}
      <Row gutter={[16, 16]} style={{ marginBottom: '24px' }}>
        <Col xs={24} sm={12} lg={8}>
          <StatusCard
            title="Karmada版本"
            value={data?.karmadaInfo?.version?.gitVersion || 'v1.13.2'}
            status="info"
            icon={<CloudServerOutlined style={{ fontSize: '16px' }} />}
            loading={isLoading}
          />
        </Col>
        <Col xs={24} sm={12} lg={8}>
          <StatusCard
            title="运行状态"
            value={data?.karmadaInfo?.status === 'running' ? '运行中' : '未知状态'}
            status={data?.karmadaInfo?.status === 'running' ? 'success' : 'warning'}
            icon={<ClusterOutlined style={{ fontSize: '16px' }} />}
            loading={isLoading}
          />
        </Col>
        <Col xs={24} sm={12} lg={8}>
          <StatusCard
            title="运行时长"
            value={data?.karmadaInfo?.createTime ? dayjs().diff(dayjs(data.karmadaInfo.createTime), 'day') : 0}
            suffix="天"
            description={data?.karmadaInfo?.createTime ? 
              `创建于 ${dayjs(data.karmadaInfo.createTime).format('YYYY-MM-DD')}` : 
              '创建时间未知'
            }
            status="info"
            loading={isLoading}
          />
        </Col>
      </Row>

      {/* 成员集群资源概览 */}
      <div style={{ marginBottom: '24px' }}>
        <Title level={3} style={{ marginBottom: '16px', color: '#000000d9' }}>
          成员集群资源概览
        </Title>
        <ResourceRadialOverview
          nodeStats={{
            used: data?.memberClusterStatus?.nodeSummary?.readyNum || 0,
            total: data?.memberClusterStatus?.nodeSummary?.totalNum || 0,
          }}
          cpuStats={{
            used: data?.memberClusterStatus?.cpuSummary?.allocatedCPU || 0,
            total: data?.memberClusterStatus?.cpuSummary?.totalCPU || 0,
          }}
          memoryStats={{
            used: (data?.memberClusterStatus?.memorySummary?.allocatedMemory || 0) / (1024 * 1024 * 1024),
            total: (data?.memberClusterStatus?.memorySummary?.totalMemory || 0) / (1024 * 1024 * 1024),
          }}
          podStats={{
            used: data?.memberClusterStatus?.podSummary?.allocatedPod || 0,
            total: data?.memberClusterStatus?.podSummary?.totalPod || 0,
          }}
          loading={isLoading}
        />
      </div>

      {/* 策略和资源统计 */}
      <Row gutter={[16, 16]} style={{ marginBottom: '24px' }}>
        <Col xs={24} lg={12}>
          <Card 
            title="策略信息" 
            style={{ borderRadius: '8px', height: '200px' }}
            bodyStyle={{ display: 'flex', justifyContent: 'space-around', alignItems: 'center' }}
          >
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '32px', fontWeight: 600, color: '#1890ff', marginBottom: '8px' }}>
                {data?.clusterResourceStatus?.propagationPolicyNum || 0}
              </div>
              <Text type="secondary">调度策略</Text>
            </div>
            <Divider type="vertical" style={{ height: '60px' }} />
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '32px', fontWeight: 600, color: '#52c41a', marginBottom: '8px' }}>
                {data?.clusterResourceStatus?.overridePolicyNum || 0}
              </div>
              <Text type="secondary">差异化策略</Text>
            </div>
          </Card>
        </Col>
        <Col xs={24} lg={12}>
          <Card 
            title="多云资源信息" 
            style={{ borderRadius: '8px', height: '200px' }}
            bodyStyle={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-around', alignItems: 'center' }}
          >
            <div style={{ textAlign: 'center', margin: '8px' }}>
              <div style={{ fontSize: '24px', fontWeight: 600, color: '#722ed1', marginBottom: '4px' }}>
                {data?.clusterResourceStatus?.namespaceNum || 0}
              </div>
              <Text type="secondary" style={{ fontSize: '12px' }}>命名空间</Text>
            </div>
            <div style={{ textAlign: 'center', margin: '8px' }}>
              <div style={{ fontSize: '24px', fontWeight: 600, color: '#fa541c', marginBottom: '4px' }}>
                {data?.clusterResourceStatus?.workloadNum || 0}
              </div>
              <Text type="secondary" style={{ fontSize: '12px' }}>工作负载</Text>
            </div>
            <div style={{ textAlign: 'center', margin: '8px' }}>
              <div style={{ fontSize: '24px', fontWeight: 600, color: '#13c2c2', marginBottom: '4px' }}>
                {data?.clusterResourceStatus?.serviceNum || 0}
              </div>
              <Text type="secondary" style={{ fontSize: '12px' }}>服务与路由</Text>
            </div>
            <div style={{ textAlign: 'center', margin: '8px' }}>
              <div style={{ fontSize: '24px', fontWeight: 600, color: '#faad14', marginBottom: '4px' }}>
                {data?.clusterResourceStatus?.configNum || 0}
              </div>
              <Text type="secondary" style={{ fontSize: '12px' }}>配置与秘钥</Text>
            </div>
          </Card>
        </Col>
      </Row>

      {/* 集群状态概览表格 */}
      <div>
        <Title level={3} style={{ marginBottom: '16px', color: '#000000d9' }}>
          集群状态概览
        </Title>
        <ClusterOverview data={clusterData} loading={clusterListLoading} />
      </div>
    </div>
  );
};

export default Overview;
