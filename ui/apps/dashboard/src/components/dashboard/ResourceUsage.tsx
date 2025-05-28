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
import { Card, Progress, Typography, Flex, Space } from 'antd';
import { 
  DatabaseOutlined, 
  CloudServerOutlined, 
  HddOutlined, 
  TagsOutlined 
} from '@ant-design/icons';

const { Text } = Typography;

interface ResourceUsageProps {
  title: string;
  used: number;
  total: number;
  unit: string;
  type?: 'cpu' | 'memory' | 'storage' | 'pod';
  loading?: boolean;
}

const ResourceUsage: React.FC<ResourceUsageProps> = ({
  title,
  used,
  total,
  unit,
  type = 'cpu',
  loading = false,
}) => {
  const percentage = total > 0 ? Math.round((used / total) * 100) : 0;
  
  const getUsageStatus = () => {
    if (percentage >= 90) return 'exception';
    if (percentage >= 70) return 'active';
    return 'success';
  };

  const getIcon = () => {
    switch (type) {
      case 'cpu':
        return <CloudServerOutlined style={{ color: '#1890ff', fontSize: '20px' }} />;
      case 'memory':
        return <DatabaseOutlined style={{ color: '#52c41a', fontSize: '20px' }} />;
      case 'storage':
        return <HddOutlined style={{ color: '#faad14', fontSize: '20px' }} />;
      case 'pod':
        return <TagsOutlined style={{ color: '#722ed1', fontSize: '20px' }} />;
      default:
        return null;
    }
  };

  const formatValue = (value: number) => {
    if (type === 'memory' && unit === 'GB') {
      return value.toFixed(1);
    }
    if (type === 'cpu' && unit === 'Core') {
      return value.toFixed(2);
    }
    return Math.round(value).toString();
  };

  return (
    <Card
      loading={loading}
      style={{
        borderRadius: '8px',
        height: '180px',
      }}
      styles={{ 
        body: {
          padding: '20px',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
        }
      }}
    >
      <Flex vertical gap={16} style={{ height: '100%' }}>
        {/* Header */}
        <Flex justify="space-between" align="center">
          <Flex gap={8} align="center">
            {getIcon()}
            <Text strong style={{ fontSize: '14px' }}>
              {title}
            </Text>
          </Flex>
          <Text type="secondary" style={{ fontSize: '12px' }}>
            {percentage}%
          </Text>
        </Flex>

        {/* Progress */}
        <Flex vertical gap={8} style={{ flex: 1, justifyContent: 'center' }}>
          <Progress
            percent={percentage}
            status={getUsageStatus()}
            strokeWidth={8}
            style={{ margin: 0 }}
          />
          
          {/* Values */}
          <Flex justify="space-between" align="center">
            <Space size={4}>
              <Text style={{ fontSize: '18px', fontWeight: 600 }}>
                {formatValue(used)}
              </Text>
              <Text type="secondary" style={{ fontSize: '14px' }}>
                / {formatValue(total)} {unit}
              </Text>
            </Space>
          </Flex>
        </Flex>

        {/* Status Text */}
        <Text 
          type="secondary" 
          style={{ 
            fontSize: '12px',
            textAlign: 'center',
          }}
        >
          {percentage >= 90 ? '使用率过高' : 
           percentage >= 70 ? '使用率较高' : 
           '使用率正常'}
        </Text>
      </Flex>
    </Card>
  );
};

export default ResourceUsage; 