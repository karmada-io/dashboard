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
import { Row, Col, Typography, Card, Statistic, Progress } from 'antd';
import { useQuery } from '@tanstack/react-query';
import { GetOverview } from '@/services/overview';
import { GetClusters } from '@/services/cluster';
import { ClusterOverview } from '@/components/dashboard';
import { 
  CloudServerOutlined, 
  ClusterOutlined,
  DatabaseOutlined,
  ThunderboltOutlined,
  NodeIndexOutlined,
  RocketOutlined,
  DashboardOutlined,
  SafetyOutlined,
  ApiOutlined,
  SettingOutlined,
  CloudOutlined,
  GlobalOutlined,
} from '@ant-design/icons';
import ScrollContainer from '@/components/common/ScrollContainer';

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
    
    return clusterListData.clusters
      .filter(cluster => 
        cluster?.objectMeta?.name && // 必须有名称
        cluster.objectMeta.name.trim() !== '' // 名称不能为空
      )
      .map(cluster => ({
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
        version: cluster.kubernetesVersion || 'Unknown',
        syncMode: cluster.syncMode || 'Push',
      }));
  };

  const clusterData = transformClusterData();

  return (
    <div style={{ height: '100vh', overflow: 'hidden' }}>
      <ScrollContainer
        height="calc(100vh - 60px)"
        padding="0"
        background="transparent"
      >
        <div style={{ padding: '24px' }}>
          {/* 主要内容区域 - 改为三列布局 */}
          <Row gutter={[24, 24]} style={{ marginBottom: '24px' }}>
            {/* 控制平面状态 */}
            <Col xs={24} lg={8}>
              <Card 
                title={
                  <div style={{ display: 'flex', alignItems: 'center' }}>
                    <DashboardOutlined style={{ marginRight: '8px', color: '#1890ff' }} />
                    <span style={{ fontSize: '16px' }}>控制平面状态</span>
                  </div>
                }
                style={{ 
                  borderRadius: '16px',
                  border: '1px solid #f0f0f0',
                  boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)',
                  height: '200px'
                }}
                bodyStyle={{ padding: '24px' }}
              >
                <div style={{ textAlign: 'center', marginBottom: '16px' }}>
                  <Text style={{ 
                    fontSize: '24px', 
                    fontWeight: 'bold',
                    color: '#52c41a',
                    display: 'block'
                  }}>
                    运行中
                  </Text>
                  <Text style={{ fontSize: '14px', color: '#666' }}>
                    版本: {
                      typeof data?.karmadaInfo?.version === 'string' 
                        ? data.karmadaInfo.version
                        : data?.karmadaInfo?.version?.gitVersion || 'v1.8.0'
                    }
                  </Text>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px' }}>
                  <span>副本: 3/3</span>
                  <span style={{ color: '#52c41a' }}>健康</span>
                </div>
              </Card>
            </Col>

            {/* 集群概况 */}
            <Col xs={24} lg={8}>
              <Card 
                title={
                  <div style={{ display: 'flex', alignItems: 'center' }}>
                    <ClusterOutlined style={{ marginRight: '8px', color: '#52c41a' }} />
                    <span style={{ fontSize: '16px' }}>集群概况</span>
                  </div>
                }
                style={{ 
                  borderRadius: '16px',
                  border: '1px solid #f0f0f0',
                  boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)',
                  height: '200px'
                }}
                bodyStyle={{ padding: '16px' }}
              >
                <Row gutter={[12, 12]}>
                  <Col span={12}>
                    <div style={{ textAlign: 'center' }}>
                      <Text style={{ fontSize: '20px', fontWeight: 'bold', color: '#1890ff', display: 'block' }}>
                        {clusterListData?.clusters?.length || 0}
                      </Text>
                      <Text style={{ fontSize: '11px', color: '#666' }}>成员集群</Text>
                    </div>
                  </Col>
                  <Col span={12}>
                    <div style={{ textAlign: 'center' }}>
                      <Text style={{ fontSize: '20px', fontWeight: 'bold', color: '#52c41a', display: 'block' }}>
                        {clusterListData?.clusters?.filter(c => String(c.ready) === 'True' || c.ready === true).length || 0}
                      </Text>
                      <Text style={{ fontSize: '11px', color: '#666' }}>就绪集群</Text>
                    </div>
                  </Col>
                  <Col span={12}>
                    <div style={{ textAlign: 'center' }}>
                      <Text style={{ fontSize: '20px', fontWeight: 'bold', color: '#722ed1', display: 'block' }}>
                        {data?.memberClusterStatus?.nodeSummary?.totalNum || 0}
                      </Text>
                      <Text style={{ fontSize: '11px', color: '#666' }}>总节点</Text>
                    </div>
                  </Col>
                  <Col span={12}>
                    <div style={{ textAlign: 'center' }}>
                      <Text style={{ fontSize: '20px', fontWeight: 'bold', color: '#fa541c', display: 'block' }}>
                        {data?.clusterResourceStatus?.workloadNum || 0}
                      </Text>
                      <Text style={{ fontSize: '11px', color: '#666' }}>工作负载</Text>
                    </div>
                  </Col>
                </Row>
              </Card>
            </Col>

            {/* 资源使用率 */}
            <Col xs={24} lg={8}>
              <Card 
                title={
                  <div style={{ display: 'flex', alignItems: 'center' }}>
                    <DatabaseOutlined style={{ marginRight: '8px', color: '#faad14' }} />
                    <span style={{ fontSize: '16px' }}>资源使用率</span>
                  </div>
                }
                style={{
                  borderRadius: '16px',
                  border: '1px solid #f0f0f0',
                  boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)',
                  height: '200px'
                }}
                bodyStyle={{ padding: '16px' }}
              >
                <div style={{ marginBottom: '12px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                    <Text style={{ fontSize: '12px' }}>CPU</Text>
                    <Text style={{ fontSize: '12px', color: '#1890ff' }}>
                      {data?.memberClusterStatus?.cpuSummary ? 
                        `${((data.memberClusterStatus.cpuSummary.allocatedCPU / data.memberClusterStatus.cpuSummary.totalCPU) * 100).toFixed(1)}%` : 
                        '0%'}
                    </Text>
                  </div>
                  <Progress 
                    percent={data?.memberClusterStatus?.cpuSummary ? 
                      (data.memberClusterStatus.cpuSummary.allocatedCPU / data.memberClusterStatus.cpuSummary.totalCPU) * 100 : 
                      0}
                    strokeColor="#1890ff" 
                    showInfo={false}
                    size="small"
                  />
                </div>
                <div style={{ marginBottom: '12px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                    <Text style={{ fontSize: '12px' }}>内存</Text>
                    <Text style={{ fontSize: '12px', color: '#52c41a' }}>
                      {data?.memberClusterStatus?.memorySummary ? 
                        `${((data.memberClusterStatus.memorySummary.allocatedMemory / data.memberClusterStatus.memorySummary.totalMemory) * 100).toFixed(1)}%` : 
                        '0%'}
                    </Text>
                  </div>
                  <Progress 
                    percent={data?.memberClusterStatus?.memorySummary ? 
                      (data.memberClusterStatus.memorySummary.allocatedMemory / data.memberClusterStatus.memorySummary.totalMemory) * 100 : 
                      0}
                    strokeColor="#52c41a" 
                    showInfo={false}
                    size="small"
                  />
                </div>
              </Card>
            </Col>
          </Row>

          {/* 集群状态概览表格 */}
          <div style={{ marginBottom: '40px' }}>
            <ClusterOverview data={clusterData} loading={clusterListLoading} />
          </div>

          {/* 策略和资源统计 - 优化样式 */}
          <Row gutter={[24, 24]} style={{ marginBottom: '40px' }}>
            <Col xs={24} lg={12}>
              <Card 
                title={
                  <div style={{ display: 'flex', alignItems: 'center' }}>
                    <ApiOutlined style={{ marginRight: '12px', color: '#13c2c2', fontSize: '18px' }} />
                    <span style={{ fontSize: '16px', fontWeight: 'bold' }}>调度策略统计</span>
                  </div>
                }
                style={{ 
                  borderRadius: '16px',
                  border: '1px solid #f0f0f0',
                  boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)',
                  height: '280px'
                }}
                bodyStyle={{ padding: '28px' }}
              >
                <Row gutter={[24, 24]}>
                  <Col span={12}>
                    <div style={{ textAlign: 'center' }}>
                      <Statistic
                        title="传播策略"
                        value={data?.clusterResourceStatus?.propagationPolicyNum || 0}
                        prefix={<ThunderboltOutlined style={{ color: '#1890ff' }} />}
                        valueStyle={{ color: '#1890ff', fontSize: '28px', fontWeight: 'bold' }}
                      />
                      <Progress 
                        percent={Math.min((data?.clusterResourceStatus?.propagationPolicyNum || 0) * 10, 100)} 
                        strokeColor="#1890ff" 
                        showInfo={false}
                        style={{ marginTop: '12px' }}
                        strokeWidth={8}
                      />
                    </div>
                  </Col>
                  <Col span={12}>
                    <div style={{ textAlign: 'center' }}>
                      <Statistic
                        title="覆盖策略"
                        value={data?.clusterResourceStatus?.overridePolicyNum || 0}
                        prefix={<SafetyOutlined style={{ color: '#52c41a' }} />}
                        valueStyle={{ color: '#52c41a', fontSize: '28px', fontWeight: 'bold' }}
                      />
                      <Progress 
                        percent={Math.min((data?.clusterResourceStatus?.overridePolicyNum || 0) * 20, 100)} 
                        strokeColor="#52c41a" 
                        showInfo={false}
                        style={{ marginTop: '12px' }}
                        strokeWidth={8}
                      />
                    </div>
                  </Col>
                </Row>
              </Card>
            </Col>
            <Col xs={24} lg={12}>
              <Card 
                title={
                  <div style={{ display: 'flex', alignItems: 'center' }}>
                    <DatabaseOutlined style={{ marginRight: '12px', color: '#fa541c', fontSize: '18px' }} />
                    <span style={{ fontSize: '16px', fontWeight: 'bold' }}>资源规模统计</span>
                  </div>
                }
                style={{ 
                  borderRadius: '16px',
                  border: '1px solid #f0f0f0',
                  boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)',
                  height: '280px'
                }}
                bodyStyle={{ padding: '28px' }}
              >
                <Row gutter={[16, 20]}>
                  <Col span={12}>
                    <div style={{ textAlign: 'center' }}>
                      <Statistic
                        title="命名空间"
                        value={data?.clusterResourceStatus?.namespaceNum || 0}
                        prefix={<GlobalOutlined style={{ color: '#722ed1' }} />}
                        valueStyle={{ color: '#722ed1', fontSize: '24px', fontWeight: 'bold' }}
                      />
                    </div>
                  </Col>
                  <Col span={12}>
                    <div style={{ textAlign: 'center' }}>
                      <Statistic
                        title="服务数量"
                        value={data?.clusterResourceStatus?.serviceNum || 0}
                        prefix={<CloudOutlined style={{ color: '#13c2c2' }} />}
                        valueStyle={{ color: '#13c2c2', fontSize: '24px', fontWeight: 'bold' }}
                      />
                    </div>
                  </Col>
                  <Col span={12}>
                    <div style={{ textAlign: 'center' }}>
                      <Statistic
                        title="工作负载"
                        value={data?.clusterResourceStatus?.workloadNum || 0}
                        prefix={<RocketOutlined style={{ color: '#fa541c' }} />}
                        valueStyle={{ color: '#fa541c', fontSize: '24px', fontWeight: 'bold' }}
                      />
                    </div>
                  </Col>
                  <Col span={12}>
                    <div style={{ textAlign: 'center' }}>
                      <Statistic
                        title="配置项"
                        value={data?.clusterResourceStatus?.configNum || 0}
                        prefix={<SettingOutlined style={{ color: '#faad14' }} />}
                        valueStyle={{ color: '#faad14', fontSize: '24px', fontWeight: 'bold' }}
                      />
                    </div>
                  </Col>
                </Row>
              </Card>
            </Col>
          </Row>
        </div>
      </ScrollContainer>
    </div>
  );
};

export default Overview;
