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
import { Card, Badge, Tag, Button, Space, Typography, Flex, Tooltip } from 'antd';
import { EyeOutlined, EditOutlined, DeleteOutlined, PlayCircleOutlined, PauseCircleOutlined } from '@ant-design/icons';
import { AppstoreOutlined, ContainerOutlined, CloudOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';

const { Text, Title } = Typography;

interface WorkloadCardProps {
  name: string;
  namespace: string;
  type: 'Deployment' | 'StatefulSet' | 'DaemonSet' | 'Job' | 'CronJob' | 'Pod';
  status: 'Running' | 'Pending' | 'Failed' | 'Succeeded' | 'Unknown';
  replicas?: {
    ready: number;
    desired: number;
  };
  clusters: string[];
  images: string[];
  createTime?: string;
  labels?: Record<string, string>;
  onView?: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
  onScale?: () => void;
  onRestart?: () => void;
}

const WorkloadCard: React.FC<WorkloadCardProps> = ({
  name,
  namespace,
  type,
  status,
  replicas,
  clusters,
  images,
  createTime,
  labels,
  onView,
  onEdit,
  onDelete,
  onScale,
  onRestart,
}) => {
  const getStatusBadge = () => {
    switch (status) {
      case 'Running':
        return <Badge status="success" text="Running" />;
      case 'Pending':
        return <Badge status="processing" text="Pending" />;
      case 'Failed':
        return <Badge status="error" text="Failed" />;
      case 'Succeeded':
        return <Badge status="success" text="Succeeded" />;
      default:
        return <Badge status="default" text="Unknown" />;
    }
  };

  const getTypeIcon = () => {
    switch (type) {
      case 'Deployment':
        return <AppstoreOutlined style={{ fontSize: '18px', color: '#1890ff' }} />;
      case 'StatefulSet':
        return <ContainerOutlined style={{ fontSize: '18px', color: '#52c41a' }} />;
      case 'DaemonSet':
        return <CloudOutlined style={{ fontSize: '18px', color: '#722ed1' }} />;
      case 'Pod':
        return <ContainerOutlined style={{ fontSize: '18px', color: '#fa541c' }} />;
      default:
        return <AppstoreOutlined style={{ fontSize: '18px', color: '#13c2c2' }} />;
    }
  };

  const getTypeColor = () => {
    switch (type) {
      case 'Deployment':
        return 'blue';
      case 'StatefulSet':
        return 'green';
      case 'DaemonSet':
        return 'purple';
      case 'Job':
        return 'orange';
      case 'CronJob':
        return 'cyan';
      case 'Pod':
        return 'red';
      default:
        return 'default';
    }
  };

  return (
    <Card
      style={{
        borderRadius: '12px',
        boxShadow: '0 2px 8px 0 rgba(0, 0, 0, 0.08)',
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
            {getTypeIcon()}
            <div>
              <Title level={5} style={{ margin: 0, fontSize: '16px', fontWeight: 600 }}>
                {name}
              </Title>
              <Space size={8}>
                <Text type="secondary" style={{ fontSize: '12px' }}>
                  {namespace}
                </Text>
                <Tag color={getTypeColor()} style={{ fontSize: '11px', padding: '0 6px' }}>
                  {type}
                </Tag>
              </Space>
            </div>
          </Flex>
          <div>
            {getStatusBadge()}
          </div>
        </Flex>

        {/* Status and Replicas */}
        {replicas && (
          <Flex justify="space-between" align="center">
            <Text style={{ fontSize: '13px' }}>
              副本数: 
              <Text strong style={{ marginLeft: '4px' }}>
                {replicas.ready}/{replicas.desired}
              </Text>
            </Text>
            <Text 
              type={replicas.ready === replicas.desired ? 'success' : 'warning'}
              style={{ fontSize: '12px' }}
            >
              {replicas.ready === replicas.desired ? '就绪' : '部分就绪'}
            </Text>
          </Flex>
        )}

        {/* Clusters and Images */}
        <div>
          <div style={{ marginBottom: '8px' }}>
            <Text type="secondary" style={{ fontSize: '12px', display: 'block', marginBottom: '4px' }}>
              部署集群:
            </Text>
            <Space wrap size={4}>
              {clusters.slice(0, 3).map(cluster => (
                <Tag key={cluster} color="blue">
                  {cluster}
                </Tag>
              ))}
              {clusters.length > 3 && (
                <Tooltip title={clusters.slice(3).join(', ')}>
                  <Tag color="default">
                    +{clusters.length - 3}
                  </Tag>
                </Tooltip>
              )}
            </Space>
          </div>
          
          <div>
            <Text type="secondary" style={{ fontSize: '12px', display: 'block', marginBottom: '4px' }}>
              镜像:
            </Text>
            <div style={{ maxHeight: '40px', overflow: 'hidden' }}>
              {images.slice(0, 2).map((image, index) => (
                <Tooltip key={index} title={image}>
                  <Text 
                    style={{ 
                      fontSize: '11px', 
                      display: 'block',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                      maxWidth: '200px',
                    }}
                  >
                    {image.split('/').pop()}
                  </Text>
                </Tooltip>
              ))}
              {images.length > 2 && (
                <Text type="secondary" style={{ fontSize: '11px' }}>
                  +{images.length - 2} 更多
                </Text>
              )}
            </div>
          </div>
        </div>

        {/* Labels */}
        {labels && Object.keys(labels).length > 0 && (
          <div>
            <Text type="secondary" style={{ fontSize: '12px', display: 'block', marginBottom: '4px' }}>
              标签:
            </Text>
            <Space wrap size={4}>
              {Object.entries(labels).slice(0, 3).map(([key, value]) => (
                <Tag key={key} style={{ fontSize: '10px' }}>
                  {key}={value}
                </Tag>
              ))}
              {Object.keys(labels).length > 3 && (
                <Tag color="default" style={{ fontSize: '10px' }}>
                  +{Object.keys(labels).length - 3}
                </Tag>
              )}
            </Space>
          </div>
        )}

        {/* Timestamp */}
        <Text type="secondary" style={{ fontSize: '11px' }}>
          创建时间: {createTime ? dayjs(createTime).format('YYYY-MM-DD HH:mm') : '未知'}
        </Text>

        {/* Actions */}
        <Flex justify="flex-end" gap={4} onClick={(e) => e.stopPropagation()}>
          <Button size="small" type="text" icon={<EyeOutlined />} onClick={onView}>
            查看
          </Button>
          {type !== 'Pod' && (
            <Button size="small" type="text" icon={<PlayCircleOutlined />} onClick={onScale}>
              扩缩容
            </Button>
          )}
          <Button size="small" type="text" icon={<PauseCircleOutlined />} onClick={onRestart}>
            重启
          </Button>
          <Button size="small" type="text" icon={<EditOutlined />} onClick={onEdit}>
            编辑
          </Button>
          <Button 
            size="small" 
            type="text" 
            icon={<DeleteOutlined />} 
            onClick={onDelete}
            danger
          >
            删除
          </Button>
        </Flex>
      </Flex>
    </Card>
  );
};

export default WorkloadCard; 