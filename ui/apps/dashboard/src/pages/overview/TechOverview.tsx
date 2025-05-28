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
import { Row, Col, Typography } from 'antd';
import { useQuery } from '@tanstack/react-query';
import { GetOverview } from '@/services/overview';
import { GetClusters } from '@/services/cluster';
import TechStatusBadge from '@/components/status-badge/TechStatusBadge';
import TechProgressBar from '@/components/resource-usage/TechProgressBar';
import { 
  CloudServerOutlined, 
  RocketOutlined,
  ThunderboltOutlined,
  NodeIndexOutlined
} from '@ant-design/icons';
import dayjs from 'dayjs';
import '@/styles/tech-theme.css';

const { Title, Text } = Typography;

// 粒子背景组件
const ParticlesBackground: React.FC = () => {
  const [particles, setParticles] = useState<Array<{ id: number; left: number; delay: number }>>([]);

  useEffect(() => {
    const particleArray = Array.from({ length: 20 }, (_, i) => ({
      id: i,
      left: Math.random() * 100,
      delay: Math.random() * 20
    }));
    setParticles(particleArray);
  }, []);

  return (
    <div className="tech-particles-container">
      {particles.map(particle => (
        <div
          key={particle.id}
          className="tech-particle"
          style={{
            left: `${particle.left}%`,
            animationDelay: `${particle.delay}s`
          }}
        />
      ))}
    </div>
  );
};

// 科技感指标卡片
const TechMetricCard: React.FC<{
  title: string;
  value: string | number;
  suffix?: string;
  icon: React.ReactNode;
  status?: 'success' | 'warning' | 'error' | 'info';
  description?: string;
  loading?: boolean;
  energyFlow?: boolean;
}> = ({ title, value, suffix, icon, status = 'info', description, loading, energyFlow = false }) => {
  return (
    <div className={`tech-card tech-hover-scale ${energyFlow ? 'tech-energy-flow' : ''}`}>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-3">
          <div 
            className="w-12 h-12 rounded-lg flex items-center justify-center text-2xl"
            style={{ 
              background: 'var(--tech-primary)',
              boxShadow: '0 0 20px rgba(0, 212, 255, 0.4)',
              color: 'white'
            }}
          >
            {icon}
          </div>
          <div>
            <Text className="text-sm text-gray-600 uppercase tracking-wider font-semibold">
              {title}
            </Text>
          </div>
        </div>
        {status && (
          <TechStatusBadge 
            status={status} 
            text={status.toUpperCase()} 
            size="small"
            pulse={status === 'error'}
          />
        )}
      </div>
      
      <div className="mb-2">
        {loading ? (
          <div className="flex items-center justify-center py-4">
            <div className="tech-loading-spinner" />
          </div>
        ) : (
          <div className="flex items-baseline space-x-2">
            <span 
              className="text-4xl font-bold tech-hologram-text"
              style={{ color: 'var(--tech-primary)' }}
            >
              {value}
            </span>
            {suffix && (
              <span className="text-lg text-gray-500 font-medium">
                {suffix}
              </span>
            )}
          </div>
        )}
      </div>
      
      {description && (
        <Text className="text-sm text-gray-500">
          {description}
        </Text>
      )}
    </div>
  );
};

// 资源使用率圆形指示器
const TechCircularProgress: React.FC<{
  percentage: number;
  label: string;
  used: number;
  total: number;
  unit: string;
  color?: string;
}> = ({ percentage, label, used, total, unit, color = 'var(--tech-primary)' }) => {
  const radius = 45;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (percentage / 100) * circumference;

  return (
    <div className="tech-card text-center tech-hover-scale">
      <div className="relative inline-block mb-4">
        <svg width="120" height="120" className="transform -rotate-90">
          <defs>
            <linearGradient id={`techGradient-${label}`} x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor={color} stopOpacity="0.3" />
              <stop offset="50%" stopColor={color} stopOpacity="0.8" />
              <stop offset="100%" stopColor={color} stopOpacity="1" />
            </linearGradient>
          </defs>
          <circle
            cx="60"
            cy="60"
            r={radius}
            fill="none"
            stroke="rgba(0, 212, 255, 0.1)"
            strokeWidth="8"
          />
          <circle
            cx="60"
            cy="60"
            r={radius}
            fill="none"
            stroke={`url(#techGradient-${label})`}
            strokeWidth="8"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            style={{
              transition: 'stroke-dashoffset 1s ease-in-out',
              filter: `drop-shadow(0 0 8px ${color})`
            }}
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-center">
            <div 
              className="text-2xl font-bold tech-hologram-text"
              style={{ color }}
            >
              {Math.round(percentage)}%
            </div>
          </div>
        </div>
      </div>
      
      <div className="space-y-1">
        <div className="text-lg font-semibold text-gray-800">{label}</div>
        <div className="text-sm text-gray-600">
          <span className="font-medium" style={{ color }}>{used.toFixed(1)}</span>
          <span className="mx-1">/</span>
          <span>{total.toFixed(1)} {unit}</span>
        </div>
      </div>
    </div>
  );
};

const TechOverview: React.FC = () => {
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

  const currentTime = dayjs().format('YYYY-MM-DD HH:mm:ss');
  const runningDays = data?.karmadaInfo?.createTime 
    ? dayjs().diff(dayjs(data.karmadaInfo.createTime), 'day') 
    : 0;

  return (
    <div className="tech-background min-h-screen">
      <ParticlesBackground />
      
      <div className="relative z-10 p-6">
        {/* 页面标题区域 */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <Title 
                level={1} 
                className="tech-hologram-text m-0 text-5xl font-bold"
                style={{ color: 'var(--tech-primary)' }}
              >
                KARMADA CONTROL CENTER
              </Title>
              <div className="flex items-center space-x-4 mt-2">
                <Text className="text-gray-600 text-lg">
                  多云应用管理平台总控面板
                </Text>
                <TechStatusBadge status="success" text="ONLINE" pulse />
              </div>
            </div>
            <div className="text-right">
              <Text className="text-gray-500 text-sm">
                LAST UPDATE: {currentTime}
              </Text>
            </div>
          </div>
        </div>

        {/* Karmada 控制面状态 */}
        <div className="mb-8">
          <Title level={2} className="text-2xl font-bold mb-6 text-gray-800">
            🚀 KARMADA CONTROL PLANE STATUS
          </Title>
          <Row gutter={[24, 24]}>
            <Col xs={24} sm={12} lg={8}>
              <TechMetricCard
                title="Karmada Version"
                value={data?.karmadaInfo?.version?.gitVersion || 'v1.13.2'}
                icon={<CloudServerOutlined />}
                status="info"
                description="Current system version"
                loading={isLoading}
                energyFlow
              />
            </Col>
            <Col xs={24} sm={12} lg={8}>
              <TechMetricCard
                title="System Status"
                value={data?.karmadaInfo?.status === 'running' ? 'RUNNING' : 'UNKNOWN'}
                icon={<RocketOutlined />}
                status={data?.karmadaInfo?.status === 'running' ? 'success' : 'warning'}
                description="Control plane operational status"
                loading={isLoading}
                energyFlow
              />
            </Col>
            <Col xs={24} sm={12} lg={8}>
              <TechMetricCard
                title="Uptime"
                value={runningDays}
                suffix="DAYS"
                icon={<ThunderboltOutlined />}
                status="success"
                description={data?.karmadaInfo?.createTime 
                  ? `Since ${dayjs(data.karmadaInfo.createTime).format('YYYY-MM-DD')}` 
                  : 'Creation time unknown'
                }
                loading={isLoading}
                energyFlow
              />
            </Col>
          </Row>
        </div>

        {/* 资源概览 - 圆形进度指示器 */}
        <div className="mb-8">
          <Title level={2} className="text-2xl font-bold mb-6 text-gray-800">
            ⚡ CLUSTER RESOURCE OVERVIEW
          </Title>
          <Row gutter={[24, 24]}>
            <Col xs={24} sm={12} lg={6}>
              <TechCircularProgress
                percentage={
                  data?.memberClusterStatus?.nodeSummary?.totalNum 
                    ? (data.memberClusterStatus.nodeSummary.readyNum / data.memberClusterStatus.nodeSummary.totalNum) * 100 
                    : 0
                }
                label="节点统计"
                used={data?.memberClusterStatus?.nodeSummary?.readyNum || 0}
                total={data?.memberClusterStatus?.nodeSummary?.totalNum || 0}
                unit="nodes"
                color="var(--success-color)"
              />
            </Col>
            <Col xs={24} sm={12} lg={6}>
              <TechCircularProgress
                percentage={
                  data?.memberClusterStatus?.cpuSummary?.totalCPU 
                    ? (data.memberClusterStatus.cpuSummary.allocatedCPU / data.memberClusterStatus.cpuSummary.totalCPU) * 100 
                    : 0
                }
                label="CPU使用率"
                used={data?.memberClusterStatus?.cpuSummary?.allocatedCPU || 0}
                total={data?.memberClusterStatus?.cpuSummary?.totalCPU || 0}
                unit="cores"
                color="var(--tech-primary)"
              />
            </Col>
            <Col xs={24} sm={12} lg={6}>
              <TechCircularProgress
                percentage={
                  data?.memberClusterStatus?.memorySummary?.totalMemory 
                    ? (data.memberClusterStatus.memorySummary.allocatedMemory / data.memberClusterStatus.memorySummary.totalMemory) * 100 
                    : 0
                }
                label="内存使用率"
                used={(data?.memberClusterStatus?.memorySummary?.allocatedMemory || 0) / (1024 * 1024 * 1024)}
                total={(data?.memberClusterStatus?.memorySummary?.totalMemory || 0) / (1024 * 1024 * 1024)}
                unit="GB"
                color="var(--warning-color)"
              />
            </Col>
            <Col xs={24} sm={12} lg={6}>
              <TechCircularProgress
                percentage={
                  data?.memberClusterStatus?.podSummary?.totalPod 
                    ? (data.memberClusterStatus.podSummary.allocatedPod / data.memberClusterStatus.podSummary.totalPod) * 100 
                    : 0
                }
                label="Pod使用率"
                used={data?.memberClusterStatus?.podSummary?.allocatedPod || 0}
                total={data?.memberClusterStatus?.podSummary?.totalPod || 0}
                unit="pods"
                color="var(--tech-secondary)"
              />
            </Col>
          </Row>
        </div>

        {/* 策略和资源统计 */}
        <div className="mb-8">
          <Title level={2} className="text-2xl font-bold mb-6 text-gray-800">
            🎯 POLICY & RESOURCE METRICS
          </Title>
          <Row gutter={[24, 24]}>
            <Col xs={24} lg={12}>
              <div className="tech-card">
                <Title level={3} className="text-xl font-bold mb-6 text-gray-800">
                  策略管理统计
                </Title>
                <Row gutter={[16, 16]}>
                  <Col span={12}>
                    <div className="text-center">
                      <div 
                        className="text-5xl font-bold mb-2 tech-hologram-text"
                        style={{ color: 'var(--tech-primary)' }}
                      >
                        {data?.clusterResourceStatus?.propagationPolicyNum || 0}
                      </div>
                      <Text className="text-gray-600 font-semibold uppercase tracking-wide">
                        调度策略
                      </Text>
                      <TechProgressBar 
                        percentage={85} 
                        size="small" 
                        status="normal"
                        className="mt-2"
                      />
                    </div>
                  </Col>
                  <Col span={12}>
                    <div className="text-center">
                      <div 
                        className="text-5xl font-bold mb-2 tech-hologram-text"
                        style={{ color: 'var(--success-color)' }}
                      >
                        {data?.clusterResourceStatus?.overridePolicyNum || 0}
                      </div>
                      <Text className="text-gray-600 font-semibold uppercase tracking-wide">
                        差异化策略
                      </Text>
                      <TechProgressBar 
                        percentage={65} 
                        size="small" 
                        status="success"
                        className="mt-2"
                      />
                    </div>
                  </Col>
                </Row>
              </div>
            </Col>
            <Col xs={24} lg={12}>
              <div className="tech-card">
                <Title level={3} className="text-xl font-bold mb-6 text-gray-800">
                  多云资源分布
                </Title>
                <Row gutter={[16, 16]}>
                  <Col span={8}>
                    <div className="text-center">
                      <div 
                        className="text-3xl font-bold mb-2 tech-hologram-text"
                        style={{ color: 'var(--tech-secondary)' }}
                      >
                        {data?.clusterResourceStatus?.namespaceNum || 0}
                      </div>
                      <Text className="text-xs text-gray-600 font-semibold uppercase">
                        命名空间
                      </Text>
                    </div>
                  </Col>
                  <Col span={8}>
                    <div className="text-center">
                      <div 
                        className="text-3xl font-bold mb-2 tech-hologram-text"
                        style={{ color: 'var(--warning-color)' }}
                      >
                        {data?.clusterResourceStatus?.workloadNum || 0}
                      </div>
                      <Text className="text-xs text-gray-600 font-semibold uppercase">
                        工作负载
                      </Text>
                    </div>
                  </Col>
                  <Col span={8}>
                    <div className="text-center">
                      <div 
                        className="text-3xl font-bold mb-2 tech-hologram-text"
                        style={{ color: 'var(--tech-accent)' }}
                      >
                        {data?.clusterResourceStatus?.serviceNum || 0}
                      </div>
                      <Text className="text-xs text-gray-600 font-semibold uppercase">
                        服务路由
                      </Text>
                    </div>
                  </Col>
                </Row>
              </div>
            </Col>
          </Row>
        </div>

        {/* 集群状态概览 */}
        <div className="mb-8">
          <Title level={2} className="text-2xl font-bold mb-6 text-gray-800">
            🌐 MEMBER CLUSTERS STATUS
          </Title>
          <div className="tech-card">
            {clusterListLoading ? (
              <div className="flex items-center justify-center py-12">
                <div className="tech-loading-spinner mr-4" />
                <Text className="text-lg">加载集群数据中...</Text>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {clusterListData?.clusters?.map((cluster) => (
                  <div key={cluster.objectMeta.name} className="tech-card border border-gray-200">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center space-x-3">
                        <NodeIndexOutlined 
                          className="text-2xl"
                          style={{ color: 'var(--tech-primary)' }}
                        />
                        <div>
                          <Text className="text-lg font-bold text-gray-800">
                            {cluster.objectMeta.name}
                          </Text>
                          <br />
                          <Text className="text-sm text-gray-500">
                            {cluster.kubernetesVersion}
                          </Text>
                        </div>
                      </div>
                      <TechStatusBadge 
                        status={cluster.ready ? 'success' : 'error'}
                        text={cluster.ready ? 'READY' : 'NOT READY'}
                        pulse={!cluster.ready}
                      />
                    </div>
                    
                    <div className="space-y-3">
                      <TechProgressBar
                        label="CPU"
                        percentage={cluster.allocatedResources?.cpuFraction || 0}
                        showValue
                        size="small"
                        status={
                          (cluster.allocatedResources?.cpuFraction || 0) > 80 ? 'error' : 
                          (cluster.allocatedResources?.cpuFraction || 0) > 60 ? 'warning' : 'normal'
                        }
                      />
                      <TechProgressBar
                        label="Memory"
                        percentage={cluster.allocatedResources?.memoryFraction || 0}
                        showValue
                        size="small"
                        status={
                          (cluster.allocatedResources?.memoryFraction || 0) > 80 ? 'error' : 
                          (cluster.allocatedResources?.memoryFraction || 0) > 60 ? 'warning' : 'normal'
                        }
                      />
                      
                      <div className="flex justify-between items-center text-sm">
                        <span className="text-gray-600">节点: {cluster.nodeSummary?.readyNum}/{cluster.nodeSummary?.totalNum}</span>
                        <span className="text-gray-600">Pods: {cluster.allocatedResources?.allocatedPods}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default TechOverview; 