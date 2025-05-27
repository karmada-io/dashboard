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
import { Card, Typography, Flex } from 'antd';
import { Progress } from 'antd';
import { 
  CloudServerOutlined, 
  DatabaseOutlined, 
  HddOutlined, 
  TagsOutlined,
  NodeIndexOutlined,
} from '@ant-design/icons';

const { Text, Title } = Typography;

interface ResourceData {
  title: string;
  used: number;
  total: number;
  unit: string;
  color: string;
  icon: React.ReactNode;
}

interface ResourceRadialOverviewProps {
  nodeStats: { used: number; total: number };
  cpuStats: { used: number; total: number };
  memoryStats: { used: number; total: number };
  podStats: { used: number; total: number };
  loading?: boolean;
}

const ResourceRadialOverview: React.FC<ResourceRadialOverviewProps> = ({
  nodeStats,
  cpuStats,
  memoryStats,
  podStats,
  loading = false,
}) => {
  const resources: ResourceData[] = [
    {
      title: '节点统计',
      used: nodeStats.used,
      total: nodeStats.total,
      unit: 'Ready',
      color: '#1890ff',
      icon: <NodeIndexOutlined style={{ fontSize: '24px', color: '#1890ff' }} />,
    },
    {
      title: 'CPU使用情况',
      used: cpuStats.used,
      total: cpuStats.total,
      unit: 'Core',
      color: '#52c41a',
      icon: <CloudServerOutlined style={{ fontSize: '24px', color: '#52c41a' }} />,
    },
    {
      title: '内存使用情况',
      used: memoryStats.used,
      total: memoryStats.total,
      unit: 'GB',
      color: '#faad14',
      icon: <DatabaseOutlined style={{ fontSize: '24px', color: '#faad14' }} />,
    },
    {
      title: 'Pod分配情况',
      used: podStats.used,
      total: podStats.total,
      unit: 'Pod',
      color: '#722ed1',
      icon: <TagsOutlined style={{ fontSize: '24px', color: '#722ed1' }} />,
    },
  ];

  const formatValue = (value: number, unit: string) => {
    if (unit === 'GB') {
      return value.toFixed(1);
    }
    if (unit === 'Core') {
      return value.toFixed(2);
    }
    return Math.round(value).toString();
  };

  const getPercentage = (used: number, total: number) => {
    return total > 0 ? Math.round((used / total) * 100) : 0;
  };

  return (
    <Card
      loading={loading}
      style={{
        borderRadius: '12px',
        background: 'linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)',
        minHeight: '400px',
      }}
      bodyStyle={{ 
        padding: '32px',
        height: '100%',
      }}
    >
      <div style={{ 
        position: 'relative', 
        width: '100%', 
        height: '350px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}>
        {/* 中心的Karmada图标 */}
        <div style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          zIndex: 10,
          background: '#ffffff',
          borderRadius: '50%',
          width: '120px',
          height: '120px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.12)',
          border: '3px solid #1890ff',
        }}>
          <CloudServerOutlined style={{ 
            fontSize: '36px', 
            color: '#1890ff',
            marginBottom: '8px',
          }} />
          <Text strong style={{ 
            fontSize: '14px', 
            color: '#1890ff',
            textAlign: 'center',
            lineHeight: '1.2',
          }}>
            Karmada
          </Text>
        </div>

        {/* 连接线 */}
        {resources.map((_, index) => {
          const angle = (index * 90) - 45; // 45度间隔，从右上角开始
          const radians = (angle * Math.PI) / 180;
          const lineLength = 80;
          const startX = 60; // 中心圆半径
          const startY = 60;
          const endX = startX + lineLength * Math.cos(radians);
          const endY = startY + lineLength * Math.sin(radians);
          
          return (
            <svg
              key={`line-${index}`}
              style={{
                position: 'absolute',
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
                pointerEvents: 'none',
                zIndex: 1,
              }}
              width="300"
              height="300"
            >
              <line
                x1="150"
                y1="150"
                x2={150 + lineLength * Math.cos(radians)}
                y2={150 + lineLength * Math.sin(radians)}
                stroke="#d9d9d9"
                strokeWidth="2"
                strokeDasharray="5,5"
              />
            </svg>
          );
        })}

        {/* 四个资源指标卡片 */}
        {resources.map((resource, index) => {
          const positions = [
            { top: '10%', right: '5%' },  // 右上
            { bottom: '10%', right: '5%' }, // 右下
            { bottom: '10%', left: '5%' },  // 左下
            { top: '10%', left: '5%' },     // 左上
          ];
          
          const percentage = getPercentage(resource.used, resource.total);
          
          return (
            <div
              key={resource.title}
              style={{
                position: 'absolute',
                ...positions[index],
                background: '#ffffff',
                borderRadius: '12px',
                padding: '16px',
                boxShadow: '0 4px 16px rgba(0, 0, 0, 0.08)',
                border: `2px solid ${resource.color}`,
                minWidth: '140px',
                zIndex: 5,
              }}
            >
              <Flex vertical gap={8} align="center">
                {/* 图标 */}
                <div>{resource.icon}</div>
                
                {/* 标题 */}
                <Text strong style={{ 
                  fontSize: '12px', 
                  textAlign: 'center',
                  color: '#000000d9',
                }}>
                  {resource.title}
                </Text>
                
                {/* 圆形进度条 */}
                <Progress
                  type="circle"
                  percent={percentage}
                  size={60}
                  strokeColor={resource.color}
                  strokeWidth={8}
                  format={() => (
                    <Text style={{ 
                      fontSize: '10px', 
                      fontWeight: 600,
                      color: resource.color,
                    }}>
                      {percentage}%
                    </Text>
                  )}
                />
                
                {/* 数值 */}
                <div style={{ textAlign: 'center' }}>
                  <Text style={{ fontSize: '12px', fontWeight: 600 }}>
                    {formatValue(resource.used, resource.unit)}
                  </Text>
                  <Text type="secondary" style={{ fontSize: '10px', marginLeft: '2px' }}>
                    /{formatValue(resource.total, resource.unit)}
                  </Text>
                  <br />
                  <Text type="secondary" style={{ fontSize: '10px' }}>
                    {resource.unit}
                  </Text>
                </div>
              </Flex>
            </div>
          );
        })}
      </div>
    </Card>
  );
};

export default ResourceRadialOverview; 