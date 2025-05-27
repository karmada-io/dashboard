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
import { Card, Statistic, Badge, Progress, Flex, Typography } from 'antd';
import { CheckCircleOutlined, ExclamationCircleOutlined, InfoCircleOutlined } from '@ant-design/icons';

const { Text } = Typography;

interface StatusCardProps {
  title: string;
  value?: string | number;
  description?: string;
  status?: 'success' | 'warning' | 'error' | 'info';
  icon?: React.ReactNode;
  extra?: React.ReactNode;
  loading?: boolean;
  percentage?: number;
  showProgress?: boolean;
  suffix?: string;
  style?: React.CSSProperties;
}

const StatusCard: React.FC<StatusCardProps> = ({
  title,
  value,
  description,
  status = 'info',
  icon,
  extra,
  loading = false,
  percentage,
  showProgress = false,
  suffix,
  style,
}) => {
  const getStatusColor = () => {
    switch (status) {
      case 'success':
        return '#52c41a';
      case 'warning':
        return '#faad14';
      case 'error':
        return '#ff4d4f';
      default:
        return '#1890ff';
    }
  };

  const getStatusIcon = () => {
    if (icon) return icon;
    
    switch (status) {
      case 'success':
        return <CheckCircleOutlined style={{ color: getStatusColor(), fontSize: '16px' }} />;
      case 'warning':
        return <ExclamationCircleOutlined style={{ color: getStatusColor(), fontSize: '16px' }} />;
      case 'error':
        return <ExclamationCircleOutlined style={{ color: getStatusColor(), fontSize: '16px' }} />;
      default:
        return <InfoCircleOutlined style={{ color: getStatusColor(), fontSize: '16px' }} />;
    }
  };

  return (
    <Card
      loading={loading}
      style={{
        borderRadius: '8px',
        border: `1px solid ${getStatusColor()}20`,
        ...style,
      }}
      bodyStyle={{ padding: '20px' }}
    >
      <Flex vertical gap={16}>
        <Flex justify="space-between" align="flex-start">
          <Flex gap={8} align="center">
            {getStatusIcon()}
            <Text strong style={{ fontSize: '14px', color: '#000000d9' }}>
              {title}
            </Text>
          </Flex>
          {extra}
        </Flex>

        <Flex vertical gap={8}>
          <Statistic
            value={value}
            suffix={suffix}
            valueStyle={{
              fontSize: '28px',
              fontWeight: 600,
              color: getStatusColor(),
              lineHeight: '36px',
            }}
          />
          
          {showProgress && percentage !== undefined && (
            <Progress
              percent={percentage}
              strokeColor={getStatusColor()}
              size="small"
              showInfo={false}
              style={{ margin: 0 }}
            />
          )}
          
          {description && (
            <Text type="secondary" style={{ fontSize: '12px' }}>
              {description}
            </Text>
          )}
        </Flex>
      </Flex>
    </Card>
  );
};

export default StatusCard; 