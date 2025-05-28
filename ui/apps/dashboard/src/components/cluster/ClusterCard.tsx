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
import { Card, Badge, Progress, Tag, Button, Space, Typography, Flex, Divider, Popconfirm } from 'antd';
import { EyeOutlined, SettingOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons';
import { ClusterOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';

const { Text, Title } = Typography;

interface ClusterCardProps {
  name: string;
  status: 'ready' | 'notReady' | 'unknown';
  kubernetesVersion: string;
  syncMode: 'Push' | 'Pull';
  nodeStatus: {
    ready: number;
    total: number;
  };
  resources: {
    cpu: {
      used: number;
      total: number;
      percentage: number;
    };
    memory: {
      used: number;
      total: number;
      percentage: number;
    };
    pods: {
      used: number;
      total: number;
      percentage: number;
    };
  };
  createTime?: string;
  onView?: () => void;
  onEdit?: () => void;
  onManage?: () => void;
  onDelete?: () => void;
}

const ClusterCard: React.FC<ClusterCardProps> = ({
  name,
  status,
  kubernetesVersion,
  syncMode,
  nodeStatus,
  resources,
  createTime,
  onView,
  onEdit,
  onManage,
  onDelete,
}) => {
  const getStatusBadge = () => {
    switch (status) {
      case 'ready':
        return <Badge status="success" text="Ready" />;
      case 'notReady':
        return <Badge status="error" text="Not Ready" />;
      default:
        return <Badge status="default" text="Unknown" />;
    }
  };

  const getProgressColor = (percentage: number) => {
    if (percentage >= 90) return '#ff4d4f';
    if (percentage >= 70) return '#faad14';
    return '#52c41a';
  };

  return (
    <Card
      style={{
        borderRadius: '12px',
        boxShadow: '0 2px 8px 0 rgba(0, 0, 0, 0.1)',
        transition: 'all 0.3s ease',
        cursor: 'pointer',
      }}
      styles={{ body: { padding: '20px' } }}
      hoverable
      onClick={onView}
    >
      <Flex vertical gap={16}>
        {/* Header */}
        <Flex justify="space-between" align="flex-start">
          <Flex gap={12} align="center">
            <ClusterOutlined style={{ fontSize: '20px', color: '#1890ff' }} />
            <div>
              <Title level={4} style={{ margin: 0, fontSize: '18px', fontWeight: 600 }}>
                {name}
              </Title>
              <Text type="secondary" style={{ fontSize: '12px' }}>
                集群 • {createTime ? dayjs(createTime).format('MM-DD HH:mm') : '未知时间'}
              </Text>
            </div>
          </Flex>
          <div>
            {getStatusBadge()}
          </div>
        </Flex>

        {/* Basic Info */}
        <Flex justify="space-between" align="center">
          <Space size={16}>
            <div>
              <Text type="secondary" style={{ fontSize: '12px', display: 'block' }}>
                K8s版本
              </Text>
              <Tag color="blue" style={{ margin: 0, fontSize: '12px' }}>
                {kubernetesVersion}
              </Tag>
            </div>
            <div>
              <Text type="secondary" style={{ fontSize: '12px', display: 'block' }}>
                同步模式
              </Text>
              <Tag color={syncMode === 'Push' ? 'green' : 'orange'} style={{ margin: 0, fontSize: '12px' }}>
                {syncMode}
              </Tag>
            </div>
            <div>
              <Text type="secondary" style={{ fontSize: '12px', display: 'block' }}>
                节点状态
              </Text>
              <Text strong style={{ color: '#000000d9' }}>
                {nodeStatus.ready}/{nodeStatus.total} Ready
              </Text>
            </div>
          </Space>
        </Flex>

        <Divider style={{ margin: '8px 0' }} />

        {/* Resource Usage */}
        <div>
          <Text strong style={{ fontSize: '14px', marginBottom: '8px', display: 'block' }}>
            资源使用情况
          </Text>
          <Space direction="vertical" size={8} style={{ width: '100%' }}>
            <Flex justify="space-between" align="center">
              <Text style={{ fontSize: '12px' }}>
                CPU: {resources.cpu.used.toFixed(1)}/{resources.cpu.total} Core
              </Text>
              <Text style={{ fontSize: '12px', color: getProgressColor(resources.cpu.percentage) }}>
                {resources.cpu.percentage.toFixed(1)}%
              </Text>
            </Flex>
            <Progress
              percent={resources.cpu.percentage}
              strokeColor={getProgressColor(resources.cpu.percentage)}
              size="small"
              showInfo={false}
            />

            <Flex justify="space-between" align="center">
              <Text style={{ fontSize: '12px' }}>
                内存: {resources.memory.used.toFixed(1)}/{resources.memory.total.toFixed(1)} GB
              </Text>
              <Text style={{ fontSize: '12px', color: getProgressColor(resources.memory.percentage) }}>
                {resources.memory.percentage.toFixed(1)}%
              </Text>
            </Flex>
            <Progress
              percent={resources.memory.percentage}
              strokeColor={getProgressColor(resources.memory.percentage)}
              size="small"
              showInfo={false}
            />

            <Flex justify="space-between" align="center">
              <Text style={{ fontSize: '12px' }}>
                Pod: {resources.pods.used}/{resources.pods.total}
              </Text>
              <Text style={{ fontSize: '12px', color: getProgressColor(resources.pods.percentage) }}>
                {resources.pods.percentage.toFixed(1)}%
              </Text>
            </Flex>
            <Progress
              percent={resources.pods.percentage}
              strokeColor={getProgressColor(resources.pods.percentage)}
              size="small"
              showInfo={false}
            />
          </Space>
        </div>

        {/* Actions */}
        <Flex justify="flex-end" gap={8} onClick={(e) => e.stopPropagation()}>
          <Button size="small" type="text" icon={<EyeOutlined />} onClick={onView}>
            查看详情
          </Button>
          <Button size="small" type="text" icon={<SettingOutlined />} onClick={onManage}>
            管理节点
          </Button>
          <Button size="small" type="text" icon={<EditOutlined />} onClick={onEdit}>
            编辑
          </Button>
          <Popconfirm
            title="确认删除"
            description={`确定要删除集群 "${name}" 吗？此操作不可恢复。`}
            onConfirm={onDelete}
            okText="确认删除"
            cancelText="取消"
            okType="danger"
          >
            <Button 
              size="small" 
              type="text" 
              icon={<DeleteOutlined />} 
              danger
            >
              删除
            </Button>
          </Popconfirm>
        </Flex>
      </Flex>
    </Card>
  );
};

export default ClusterCard; 