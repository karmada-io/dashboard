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
import { Row, Col, Typography, Button, Card, Progress, Space } from 'antd';
import TechStatusBadge from '@/components/status-badge/TechStatusBadge';
import TechProgressBar from '@/components/resource-usage/TechProgressBar';

import TechLayout from '@/layout/TechLayout';
import { 
  RocketOutlined, 
  ThunderboltOutlined, 
  DatabaseOutlined,
  CloudServerOutlined 
} from '@ant-design/icons';
import '@/styles/tech-theme.css';

const { Title, Text } = Typography;

const TechDemo: React.FC = () => {
  return (
    <TechLayout>
      <div className="tech-background min-h-screen">
        {/* 粒子背景 */}
        <div className="tech-particles-container">
          {Array.from({ length: 15 }, (_, i) => (
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
              className="tech-hologram-text m-0 text-5xl font-bold"
              style={{ color: 'var(--tech-primary)' }}
            >
              🚀 KARMADA TECH DESIGN SHOWCASE
            </Title>
            <Text className="text-gray-600 text-lg">
              炫酷科技风格设计系统 - 亮色主题版本
            </Text>
          </div>

          {/* 状态徽章展示 */}
          <div className="mb-8">
            <Title level={2} className="text-2xl font-bold mb-6 text-gray-800">
              🎯 STATUS BADGES
            </Title>
            <div className="tech-card">
              <Space wrap size="large">
                <TechStatusBadge status="success" text="SUCCESS" pulse />
                <TechStatusBadge status="error" text="ERROR" pulse />
                <TechStatusBadge status="warning" text="WARNING" />
                <TechStatusBadge status="info" text="PROCESSING" />
                <TechStatusBadge status="success" text="ONLINE" size="large" />
                <TechStatusBadge status="error" text="OFFLINE" size="small" />
              </Space>
            </div>
          </div>

          {/* 进度条展示 */}
          <div className="mb-8">
            <Title level={2} className="text-2xl font-bold mb-6 text-gray-800">
              ⚡ PROGRESS BARS
            </Title>
            <Row gutter={[24, 24]}>
              <Col span={12}>
                <div className="tech-card">
                  <TechProgressBar
                    label="CPU Usage"
                    percentage={75}
                    status="normal"
                    size="large"
                  />
                </div>
              </Col>
              <Col span={12}>
                <div className="tech-card">
                  <TechProgressBar
                    label="Memory Usage"
                    percentage={90}
                    status="error"
                    size="large"
                  />
                </div>
              </Col>
              <Col span={12}>
                <div className="tech-card">
                  <TechProgressBar
                    label="Disk Usage"
                    percentage={45}
                    status="success"
                    size="medium"
                  />
                </div>
              </Col>
              <Col span={12}>
                <div className="tech-card">
                  <TechProgressBar
                    label="Network Usage"
                    percentage={65}
                    status="warning"
                    size="medium"
                  />
                </div>
              </Col>
            </Row>
          </div>

          {/* 按钮展示 */}
          <div className="mb-8">
            <Title level={2} className="text-2xl font-bold mb-6 text-gray-800">
              🎮 TECH BUTTONS
            </Title>
            <div className="tech-card">
              <Space wrap size="large">
                <button className="tech-btn-primary">
                  <RocketOutlined className="mr-2" />
                  PRIMARY BUTTON
                </button>
                <Button type="primary" icon={<ThunderboltOutlined />}>
                  Ant Design Primary
                </Button>
                <Button danger icon={<DatabaseOutlined />}>
                  Danger Button
                </Button>
                <Button type="default" icon={<CloudServerOutlined />}>
                  Default Button
                </Button>
              </Space>
            </div>
          </div>

          {/* 科技卡片展示 */}
          <div className="mb-8">
            <Title level={2} className="text-2xl font-bold mb-6 text-gray-800">
              🌟 TECH CARDS
            </Title>
            <Row gutter={[24, 24]}>
              <Col xs={24} sm={12} lg={8}>
                <div className="tech-card tech-energy-flow">
                  <div className="flex items-center justify-between mb-4">
                    <RocketOutlined 
                      className="text-3xl"
                      style={{ color: 'var(--tech-primary)' }}
                    />
                    <TechStatusBadge status="success" text="ACTIVE" pulse />
                  </div>
                  <Title level={3} className="tech-hologram-text mb-2">
                    ENERGY CARD
                  </Title>
                  <Text className="text-gray-600">
                    This card has energy flow effects
                  </Text>
                </div>
              </Col>
              <Col xs={24} sm={12} lg={8}>
                <div className="tech-card tech-hover-scale">
                  <div className="flex items-center justify-between mb-4">
                    <ThunderboltOutlined 
                      className="text-3xl"
                      style={{ color: 'var(--warning-color)' }}
                    />
                    <TechStatusBadge status="warning" text="WARNING" />
                  </div>
                  <Title level={3} className="mb-2">
                    HOVER SCALE
                  </Title>
                  <Text className="text-gray-600">
                    This card scales on hover
                  </Text>
                </div>
              </Col>
              <Col xs={24} sm={12} lg={8}>
                <div className="tech-card">
                  <div className="flex items-center justify-between mb-4">
                    <DatabaseOutlined 
                      className="text-3xl"
                      style={{ color: 'var(--success-color)' }}
                    />
                    <TechStatusBadge status="info" text="INFO" />
                  </div>
                  <Title level={3} className="mb-2">
                    STANDARD CARD
                  </Title>
                  <Text className="text-gray-600">
                    Standard tech card with glow effects
                  </Text>
                </div>
              </Col>
            </Row>
          </div>

          {/* 加载动画展示 */}
          <div className="mb-8">
            <Title level={2} className="text-2xl font-bold mb-6 text-gray-800">
              ⏳ LOADING ANIMATIONS
            </Title>
            <div className="tech-card">
              <Space size="large" align="center">
                <div className="text-center">
                  <div className="tech-loading-spinner mb-2" />
                  <Text className="text-sm text-gray-600">Tech Spinner</Text>
                </div>
                <div className="tech-pulse p-4 rounded-lg bg-blue-50">
                  <Text>Pulsing Element</Text>
                </div>
                <div className="tech-energy-flow p-4 rounded-lg bg-purple-50">
                  <Text>Energy Flow</Text>
                </div>
              </Space>
            </div>
          </div>

          {/* 全息文字效果 */}
          <div className="mb-8">
            <Title level={2} className="text-2xl font-bold mb-6 text-gray-800">
              ✨ HOLOGRAM EFFECTS
            </Title>
            <div className="tech-card text-center py-8">
              <Title 
                level={1} 
                className="tech-hologram-text mb-4"
                style={{ color: 'var(--tech-primary)' }}
              >
                HOLOGRAPHIC TEXT EFFECT
              </Title>
              <Text className="tech-hologram-text text-lg">
                This text has a holographic flicker animation
              </Text>
            </div>
          </div>

          {/* Ant Design 组件展示 */}
          <div className="mb-8">
            <Title level={2} className="text-2xl font-bold mb-6 text-gray-800">
              🎨 ANT DESIGN INTEGRATION
            </Title>
            <Row gutter={[24, 24]}>
              <Col span={12}>
                <Card title="Themed Card" extra={<TechStatusBadge status="success" text="READY" />}>
                  <Progress percent={75} status="active" />
                  <br />
                  <br />
                  <Progress type="circle" percent={60} />
                </Card>
              </Col>
              <Col span={12}>
                <Card title="System Metrics">
                  <Space direction="vertical" style={{ width: '100%' }}>
                    <div>
                      <Text>CPU Usage</Text>
                      <Progress percent={85} strokeColor="var(--tech-primary)" />
                    </div>
                    <div>
                      <Text>Memory Usage</Text>
                      <Progress percent={70} strokeColor="var(--warning-color)" />
                    </div>
                    <div>
                      <Text>Disk Usage</Text>
                      <Progress percent={45} strokeColor="var(--success-color)" />
                    </div>
                  </Space>
                </Card>
              </Col>
            </Row>
          </div>
        </div>
      </div>
    </TechLayout>
  );
};

export default TechDemo; 