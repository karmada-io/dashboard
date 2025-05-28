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

import React, { useEffect, useState } from 'react';
import { Row, Col, Typography, Card, Statistic, Progress, Divider, Space, Tooltip } from 'antd';
import { useQuery } from '@tanstack/react-query';
import { GetOverview } from '@/services/overview';
import { GetClusters } from '@/services/cluster';
import { 
  Area, 
  Column, 
  Pie, 
  Gauge, 
  Radar, 
  Liquid,
  DualAxes,
  TinyArea,
  TinyColumn
} from '@ant-design/charts';
import { 
  CloudServerOutlined, 
  ClusterOutlined,
  DatabaseOutlined,
  ThunderboltOutlined,
  NodeIndexOutlined,
  RocketOutlined,
  BarChartOutlined,
  PieChartOutlined,
  RadarChartOutlined,
  HeatMapOutlined,
  LineChartOutlined,
  DashboardOutlined,
  SafetyOutlined,
  ApiOutlined,
  SettingOutlined,
  MonitorOutlined,
  CloudOutlined,
  GlobalOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';

const { Title, Text } = Typography;

// 数字动画组件
const AnimatedNumber: React.FC<{ value: number; duration?: number; formatter?: (value: number) => string }> = ({
  value,
  duration = 1000,
  formatter = (val) => val.toString()
}) => {
  const [displayValue, setDisplayValue] = useState(0);

  useEffect(() => {
    const startTime = Date.now();
    const startValue = displayValue;
    const valueChange = value - startValue;

    const animate = () => {
      const now = Date.now();
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      
      // 使用缓动函数
      const easeOutCubic = 1 - Math.pow(1 - progress, 3);
      const currentValue = startValue + valueChange * easeOutCubic;
      
      setDisplayValue(currentValue);
      
      if (progress < 1) {
        requestAnimationFrame(animate);
      }
    };
    
    requestAnimationFrame(animate);
  }, [value, duration]);

  return <span>{formatter(displayValue)}</span>;
};

// 科技感状态卡片
const TechStatusCard: React.FC<{
  title: string;
  value: number | string;
  suffix?: string;
  icon: React.ReactNode;
  status?: 'success' | 'warning' | 'error' | 'info';
  trend?: number[];
  loading?: boolean;
  color?: string;
}> = ({ title, value, suffix, icon, status = 'info', trend, loading, color }) => {
  const getStatusColor = () => {
    switch (status) {
      case 'success': return '#52c41a';
      case 'warning': return '#faad14';
      case 'error': return '#ff4d4f';
      default: return color || '#1890ff';
    }
  };

  const statusColor = getStatusColor();

  return (
    <Card
      className="tech-status-card"
      style={{
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        border: 'none',
        borderRadius: '16px',
        position: 'relative',
        overflow: 'hidden',
        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.1)',
      }}
      bodyStyle={{ padding: '24px' }}
    >
      {/* 背景装饰 */}
      <div 
        style={{
          position: 'absolute',
          top: 0,
          right: 0,
          width: '120px',
          height: '120px',
          background: `radial-gradient(circle, ${statusColor}20, transparent)`,
          borderRadius: '50%',
          transform: 'translate(30px, -30px)',
        }}
      />
      
      <div style={{ position: 'relative', zIndex: 1 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
          <div style={{ flex: 1 }}>
            <Text style={{ color: 'rgba(255, 255, 255, 0.8)', fontSize: '14px', fontWeight: 500 }}>
              {title}
            </Text>
          </div>
          <div 
            style={{
              width: '48px',
              height: '48px',
              background: statusColor,
              borderRadius: '12px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: `0 4px 20px ${statusColor}40`,
              fontSize: '20px',
              color: 'white',
            }}
          >
            {icon}
          </div>
        </div>
        
        <div style={{ marginBottom: '12px' }}>
          <Text style={{ fontSize: '28px', fontWeight: 'bold', color: 'white' }}>
            {typeof value === 'number' ? (
              <AnimatedNumber value={value} formatter={(val) => Math.round(val).toString()} />
            ) : (
              value
            )}
            {suffix && <span style={{ fontSize: '16px', marginLeft: '4px' }}>{suffix}</span>}
          </Text>
        </div>
        
        {/* 趋势小图表 */}
        {trend && (
          <div style={{ height: '40px', marginTop: '8px' }}>
            <TinyArea
              data={trend}
              smooth
              color={statusColor}
              areaStyle={{
                fill: `l(270) 0:${statusColor}00 1:${statusColor}80`,
              }}
              line={{
                color: statusColor,
                size: 2,
              }}
            />
          </div>
        )}
      </div>
    </Card>
  );
};

// 资源使用率饼图
const ResourcePieChart: React.FC<{ data: any[]; title: string }> = ({ data, title }) => {
  const config = {
    data,
    angleField: 'value',
    colorField: 'type',
    radius: 0.8,
    innerRadius: 0.6,
    color: ['#1890ff', '#52c41a', '#fa8c16', '#eb2f96', '#722ed1'],
    label: {
      type: 'inner',
      offset: '-50%',
      style: {
        textAlign: 'center',
        fontSize: 12,
        fontWeight: 'bold',
        fill: 'white',
      },
    },
    statistic: {
      title: {
        style: {
          fontSize: '14px',
          fontWeight: 'normal',
          color: '#8c8c8c',
        },
        content: title,
      },
      content: {
        style: {
          fontSize: '20px',
          fontWeight: 'bold',
          color: '#262626',
        },
        formatter: (datum: any) => `${datum ? Math.round((datum.value / data.reduce((sum, item) => sum + item.value, 0)) * 100) : 0}%`,
      },
    },
    tooltip: {
      formatter: (datum: any) => ({
        name: datum.type,
        value: `${datum.value} (${Math.round((datum.value / data.reduce((sum, item) => sum + item.value, 0)) * 100)}%)`,
      }),
    },
  };

  return (
    <div style={{ height: '300px' }}>
      <Pie {...config} />
    </div>
  );
};

// 资源趋势图
const ResourceTrendChart: React.FC<{ data: any[]; title: string }> = ({ data, title }) => {
  const config = {
    data,
    xField: 'time',
    yField: 'value',
    seriesField: 'type',
    smooth: true,
    color: ['#1890ff', '#52c41a', '#fa8c16'],
    areaStyle: {
      fillOpacity: 0.1,
    },
    legend: {
      position: 'top' as const,
    },
    tooltip: {
      showMarkers: true,
    },
    animation: {
      appear: {
        animation: 'path-in',
        duration: 1000,
      },
    },
  };

  return (
    <div style={{ height: '300px' }}>
      <Area {...config} />
    </div>
  );
};

// 集群对比柱状图
const ClusterComparisonChart: React.FC<{ data: any[] }> = ({ data }) => {
  const config = {
    data,
    xField: 'cluster',
    yField: ['cpu', 'memory'],
    geometryOptions: [
      {
        geometry: 'column',
        color: '#1890ff',
        label: {},
      },
      {
        geometry: 'line',
        color: '#52c41a',
        lineStyle: {
          lineWidth: 3,
        },
      },
    ],
    meta: {
      cpu: {
        alias: 'CPU使用率(%)',
      },
      memory: {
        alias: '内存使用率(%)',
      },
    },
  };

  return (
    <div style={{ height: '300px' }}>
      <DualAxes {...config} />
    </div>
  );
};

// 集群雷达图
const ClusterRadarChart: React.FC<{ data: any[] }> = ({ data }) => {
  const config = {
    data,
    xField: 'metric',
    yField: 'value',
    seriesField: 'cluster',
    meta: {
      value: {
        min: 0,
        max: 100,
      },
    },
    xAxis: {
      line: null,
      tickLine: null,
    },
    yAxis: {
      label: false,
      grid: {
        alternateColor: 'rgba(0, 0, 0, 0.04)',
      },
    },
    point: {
      size: 2,
    },
    area: {
      style: {
        fillOpacity: 0.2,
      },
    },
  };

  return (
    <div style={{ height: '400px' }}>
      <Radar {...config} />
    </div>
  );
};

const EnhancedOverview: React.FC = () => {
  const { data, isLoading } = useQuery({
    queryKey: ['GetOverview'],
    queryFn: async () => {
      const ret = await GetOverview();
      return ret.data;
    },
  });

  const { data: clusterListData, isLoading: clusterListLoading } = useQuery({
    queryKey: ['GetClusters'],
    queryFn: async () => {
      const ret = await GetClusters();
      return ret.data;
    },
  });

  // 模拟趋势数据
  const generateTrendData = (baseValue: number) => 
    Array.from({ length: 24 }, (_, i) => baseValue + Math.random() * 20 - 10);

  // 模拟历史数据
  const generateHistoryData = () => {
    const times = Array.from({ length: 12 }, (_, i) => dayjs().subtract(11 - i, 'hour').format('HH:mm'));
    return [
      ...times.map(time => ({ time, value: 40 + Math.random() * 30, type: 'CPU' })),
      ...times.map(time => ({ time, value: 50 + Math.random() * 25, type: '内存' })),
      ...times.map(time => ({ time, value: 30 + Math.random() * 20, type: 'Pod' })),
    ];
  };

  // 准备图表数据
  const resourcePieData = [
    { type: 'CPU', value: data?.memberClusterStatus?.cpuSummary?.allocatedCPU || 0 },
    { type: '内存', value: (data?.memberClusterStatus?.memorySummary?.allocatedMemory || 0) / (1024 * 1024 * 1024) },
    { type: 'Pod', value: data?.memberClusterStatus?.podSummary?.allocatedPod || 0 },
    { type: '存储', value: 200 + Math.random() * 100 },
  ];

  const clusterComparisonData = clusterListData?.clusters?.slice(0, 5).map(cluster => ({
    cluster: cluster.objectMeta.name,
    cpu: (cluster.allocatedResources?.cpuFraction || 0),
    memory: (cluster.allocatedResources?.memoryFraction || 0),
  })) || [];

  const clusterRadarData = clusterListData?.clusters?.slice(0, 3).flatMap(cluster => [
    { cluster: cluster.objectMeta.name, metric: 'CPU', value: cluster.allocatedResources?.cpuFraction || 0 },
    { cluster: cluster.objectMeta.name, metric: '内存', value: cluster.allocatedResources?.memoryFraction || 0 },
    { cluster: cluster.objectMeta.name, metric: '网络', value: 60 + Math.random() * 30 },
    { cluster: cluster.objectMeta.name, metric: '存储', value: 40 + Math.random() * 40 },
    { cluster: cluster.objectMeta.name, metric: '可用性', value: 85 + Math.random() * 15 },
  ]) || [];

  return (
    <div style={{ padding: '24px', backgroundColor: '#f0f2f5', minHeight: '100vh' }}>
      {/* 页面标题 */}
      <div style={{ marginBottom: '32px', textAlign: 'center' }}>
        <Title level={1} style={{ margin: 0, color: '#001529', fontWeight: 'bold' }}>
          <DashboardOutlined style={{ marginRight: '12px', color: '#1890ff' }} />
          Karmada 多云管理中心
        </Title>
        <Text type="secondary" style={{ fontSize: '16px' }}>
          实时监控 · 智能调度 · 统一管理 - 最后更新: {dayjs().format('YYYY-MM-DD HH:mm:ss')}
        </Text>
      </div>

      {/* 第一行：核心状态指标 */}
      <Row gutter={[24, 24]} style={{ marginBottom: '32px' }}>
        <Col xs={24} sm={12} lg={6}>
          <TechStatusCard
            title="集群总数"
            value={clusterListData?.clusters?.length || 0}
            suffix="个"
            icon={<ClusterOutlined />}
            status="info"
            trend={generateTrendData(clusterListData?.clusters?.length || 0)}
            color="#1890ff"
          />
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <TechStatusCard
            title="节点总数"
            value={data?.memberClusterStatus?.nodeSummary?.totalNum || 0}
            suffix="个"
            icon={<NodeIndexOutlined />}
            status="success"
            trend={generateTrendData(data?.memberClusterStatus?.nodeSummary?.totalNum || 0)}
            color="#52c41a"
          />
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <TechStatusCard
            title="运行负载"
            value={data?.clusterResourceStatus?.workloadNum || 0}
            suffix="个"
            icon={<RocketOutlined />}
            status="warning"
            trend={generateTrendData(data?.clusterResourceStatus?.workloadNum || 0)}
            color="#fa8c16"
          />
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <TechStatusCard
            title="活跃策略"
            value={(data?.clusterResourceStatus?.propagationPolicyNum || 0) + (data?.clusterResourceStatus?.overridePolicyNum || 0)}
            suffix="条"
            icon={<SettingOutlined />}
            status="error"
            trend={generateTrendData((data?.clusterResourceStatus?.propagationPolicyNum || 0) + (data?.clusterResourceStatus?.overridePolicyNum || 0))}
            color="#eb2f96"
          />
        </Col>
      </Row>

      {/* 第二行：资源概览和趋势 */}
      <Row gutter={[24, 24]} style={{ marginBottom: '32px' }}>
        <Col xs={24} lg={8}>
          <Card 
            title={
              <div style={{ display: 'flex', alignItems: 'center' }}>
                <PieChartOutlined style={{ marginRight: '8px', color: '#1890ff' }} />
                资源分布概览
              </div>
            }
            style={{ height: '400px', borderRadius: '16px' }}
            bodyStyle={{ padding: '16px' }}
          >
            <ResourcePieChart data={resourcePieData} title="资源分布" />
          </Card>
        </Col>
        <Col xs={24} lg={16}>
          <Card 
            title={
              <div style={{ display: 'flex', alignItems: 'center' }}>
                <LineChartOutlined style={{ marginRight: '8px', color: '#52c41a' }} />
                资源使用趋势
              </div>
            }
            style={{ height: '400px', borderRadius: '16px' }}
            bodyStyle={{ padding: '16px' }}
          >
            <ResourceTrendChart data={generateHistoryData()} title="12小时趋势" />
          </Card>
        </Col>
      </Row>

      {/* 第三行：集群对比和雷达图 */}
      <Row gutter={[24, 24]} style={{ marginBottom: '32px' }}>
        <Col xs={24} lg={14}>
          <Card 
            title={
              <div style={{ display: 'flex', alignItems: 'center' }}>
                <BarChartOutlined style={{ marginRight: '8px', color: '#fa8c16' }} />
                集群资源对比
              </div>
            }
            style={{ height: '400px', borderRadius: '16px' }}
            bodyStyle={{ padding: '16px' }}
          >
            <ClusterComparisonChart data={clusterComparisonData} />
          </Card>
        </Col>
        <Col xs={24} lg={10}>
          <Card 
            title={
              <div style={{ display: 'flex', alignItems: 'center' }}>
                <RadarChartOutlined style={{ marginRight: '8px', color: '#722ed1' }} />
                集群综合评估
              </div>
            }
            style={{ height: '400px', borderRadius: '16px' }}
            bodyStyle={{ padding: '16px' }}
          >
            <ClusterRadarChart data={clusterRadarData} />
          </Card>
        </Col>
      </Row>

      {/* 第四行：详细统计 */}
      <Row gutter={[24, 24]} style={{ marginBottom: '32px' }}>
        <Col xs={24} lg={12}>
          <Card 
            title={
              <div style={{ display: 'flex', alignItems: 'center' }}>
                <ApiOutlined style={{ marginRight: '8px', color: '#13c2c2' }} />
                调度策略统计
              </div>
            }
            style={{ borderRadius: '16px' }}
            bodyStyle={{ padding: '24px' }}
          >
            <Row gutter={[16, 16]}>
              <Col span={12}>
                <Statistic
                  title="传播策略"
                  value={data?.clusterResourceStatus?.propagationPolicyNum || 0}
                  prefix={<ThunderboltOutlined style={{ color: '#1890ff' }} />}
                  valueStyle={{ color: '#1890ff', fontSize: '24px' }}
                />
                <Progress 
                  percent={Math.min((data?.clusterResourceStatus?.propagationPolicyNum || 0) * 10, 100)} 
                  strokeColor="#1890ff" 
                  showInfo={false}
                  style={{ marginTop: '8px' }}
                />
              </Col>
              <Col span={12}>
                <Statistic
                  title="覆盖策略"
                  value={data?.clusterResourceStatus?.overridePolicyNum || 0}
                  prefix={<SafetyOutlined style={{ color: '#52c41a' }} />}
                  valueStyle={{ color: '#52c41a', fontSize: '24px' }}
                />
                <Progress 
                  percent={Math.min((data?.clusterResourceStatus?.overridePolicyNum || 0) * 20, 100)} 
                  strokeColor="#52c41a" 
                  showInfo={false}
                  style={{ marginTop: '8px' }}
                />
              </Col>
            </Row>
          </Card>
        </Col>
        <Col xs={24} lg={12}>
          <Card 
            title={
              <div style={{ display: 'flex', alignItems: 'center' }}>
                <DatabaseOutlined style={{ marginRight: '8px', color: '#fa541c' }} />
                资源规模统计
              </div>
            }
            style={{ borderRadius: '16px' }}
            bodyStyle={{ padding: '24px' }}
          >
            <Row gutter={[16, 16]}>
              <Col span={12}>
                <Statistic
                  title="命名空间"
                  value={data?.clusterResourceStatus?.namespaceNum || 0}
                  prefix={<GlobalOutlined style={{ color: '#722ed1' }} />}
                  valueStyle={{ color: '#722ed1', fontSize: '20px' }}
                />
              </Col>
              <Col span={12}>
                <Statistic
                  title="服务数量"
                  value={data?.clusterResourceStatus?.serviceNum || 0}
                  prefix={<CloudOutlined style={{ color: '#13c2c2' }} />}
                  valueStyle={{ color: '#13c2c2', fontSize: '20px' }}
                />
              </Col>
              <Col span={12}>
                <Statistic
                  title="工作负载"
                  value={data?.clusterResourceStatus?.workloadNum || 0}
                  prefix={<RocketOutlined style={{ color: '#fa541c' }} />}
                  valueStyle={{ color: '#fa541c', fontSize: '20px' }}
                />
              </Col>
              <Col span={12}>
                <Statistic
                  title="配置项"
                  value={data?.clusterResourceStatus?.configNum || 0}
                  prefix={<SettingOutlined style={{ color: '#faad14' }} />}
                  valueStyle={{ color: '#faad14', fontSize: '20px' }}
                />
              </Col>
            </Row>
          </Card>
        </Col>
      </Row>

      {/* 第五行：实时指标 */}
      <Row gutter={[24, 24]}>
        <Col xs={24} lg={8}>
          <Card 
            title={
              <div style={{ display: 'flex', alignItems: 'center' }}>
                <MonitorOutlined style={{ marginRight: '8px', color: '#eb2f96' }} />
                CPU 使用率
              </div>
            }
            style={{ height: '300px', borderRadius: '16px' }}
            bodyStyle={{ padding: '16px', display: 'flex', justifyContent: 'center', alignItems: 'center' }}
          >
            <Gauge
              percent={data?.memberClusterStatus?.cpuSummary ? 
                (data.memberClusterStatus.cpuSummary.allocatedCPU / data.memberClusterStatus.cpuSummary.totalCPU) * 100 : 
                45}
              color={['#F4664A', '#FAAD14', '#30BF78']}
              range={{ color: '#30BF78' }}
              indicator={{
                pointer: { style: { stroke: '#D0D0D0' } },
                pin: { style: { stroke: '#D0D0D0' } },
              }}
              statistic={{
                content: {
                  style: {
                    fontSize: '20px',
                    lineHeight: '20px',
                    fontWeight: 'bold',
                  },
                },
              }}
            />
          </Card>
        </Col>
        <Col xs={24} lg={8}>
          <Card 
            title={
              <div style={{ display: 'flex', alignItems: 'center' }}>
                <HeatMapOutlined style={{ marginRight: '8px', color: '#1890ff' }} />
                内存使用率
              </div>
            }
            style={{ height: '300px', borderRadius: '16px' }}
            bodyStyle={{ padding: '16px', display: 'flex', justifyContent: 'center', alignItems: 'center' }}
          >
            <Liquid
              percent={data?.memberClusterStatus?.memorySummary ? 
                (data.memberClusterStatus.memorySummary.allocatedMemory / data.memberClusterStatus.memorySummary.totalMemory) * 100 / 100 : 
                0.35}
              color="#1890ff"
              statistic={{
                content: {
                  style: {
                    fontSize: '20px',
                    fontWeight: 'bold',
                    color: 'white',
                  },
                },
              }}
            />
          </Card>
        </Col>
        <Col xs={24} lg={8}>
          <Card 
            title={
              <div style={{ display: 'flex', alignItems: 'center' }}>
                <DatabaseOutlined style={{ marginRight: '8px', color: '#52c41a' }} />
                存储使用率
              </div>
            }
            style={{ height: '300px', borderRadius: '16px' }}
            bodyStyle={{ padding: '16px', display: 'flex', justifyContent: 'center', alignItems: 'center' }}
          >
            <Gauge
              percent={60 + Math.random() * 25}
              color={['#F4664A', '#FAAD14', '#30BF78']}
              range={{ color: '#52c41a' }}
              indicator={{
                pointer: { style: { stroke: '#D0D0D0' } },
                pin: { style: { stroke: '#D0D0D0' } },
              }}
              statistic={{
                content: {
                  style: {
                    fontSize: '20px',
                    lineHeight: '20px',
                    fontWeight: 'bold',
                  },
                },
              }}
            />
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default EnhancedOverview; 