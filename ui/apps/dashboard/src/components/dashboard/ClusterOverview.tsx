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
import { Table, Tag, Progress, Button, Space, Badge, Typography } from 'antd';
import { SettingOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import { useNavigate } from 'react-router-dom';

const { Text } = Typography;

interface ClusterData {
  name: string;
  status: 'ready' | 'notReady' | 'unknown';
  nodes: {
    ready: number;
    total: number;
  };
  cpu: {
    used: number;
    total: number;
  };
  memory: {
    used: number;
    total: number;
  };
  pods: {
    used: number;
    total: number;
  };
  version: string;
  syncMode: string;
}

interface ClusterOverviewProps {
  data?: ClusterData[];
  loading?: boolean;
}

const ClusterOverview: React.FC<ClusterOverviewProps> = ({
  data = [],
  loading = false,
}) => {
  const navigate = useNavigate();

  // 添加内联样式
  const tableStyles = `
    .cluster-overview-table .ant-table-thead > tr > th {
      font-size: 16px !important;
      font-weight: bold !important;
      padding: 16px 12px !important;
      background-color: #fafafa !important;
    }
    .cluster-overview-table .ant-table-tbody > tr > td {
      padding: 16px 12px !important;
      font-size: 14px !important;
    }
    .cluster-overview-table .ant-table-tbody > tr {
      height: 60px !important;
    }
    .cluster-overview-table .ant-progress-text {
      font-size: 14px !important;
    }
    .cluster-overview-table .ant-badge-status-text {
      font-size: 14px !important;
    }
    .cluster-overview-table .ant-table-measure-row {
      display: none !important;
    }
    .cluster-overview-table .ant-table-tbody > .ant-table-measure-row {
      display: none !important;
      height: 0 !important;
      visibility: hidden !important;
    }
  `;

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'ready':
        return <Badge color="#52c41a" text="Ready" />;
      case 'notReady':
        return <Badge color="#ff4d4f" text="NotReady" />;
      default:
        return <Badge color="#d9d9d9" text="Unknown" />;
    }
  };

  const getResourceProgress = (used: number, total: number) => {
    const percentage = total > 0 ? Math.round((used / total) * 100) : 0;
    let status: 'success' | 'active' | 'exception' = 'success';
    
    if (percentage >= 90) status = 'exception';
    else if (percentage >= 70) status = 'active';
    
    return (
      <div style={{ width: '100px' }}>
        <Progress 
          percent={percentage} 
          size="small" 
          status={status}
          format={() => `${percentage}%`}
        />
      </div>
    );
  };

  const columns: ColumnsType<ClusterData> = [
    {
      title: '集群名称',
      dataIndex: 'name',
      key: 'name',
      width: 150,
      render: (text) => (
        <Text strong style={{ color: '#1890ff', fontSize: '16px' }}>
          {text}
        </Text>
      ),
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 100,
      render: (status) => (
        <div style={{ fontSize: '14px' }}>
          {getStatusBadge(status)}
        </div>
      ),
    },
    {
      title: '节点数',
      dataIndex: 'nodes',
      key: 'nodes',
      width: 100,
      render: (nodes) => (
        <Space direction="vertical" size={0}>
          <Text style={{ fontSize: '16px', fontWeight: 'bold' }}>{nodes.ready}/{nodes.total}</Text>
          <Text type="secondary" style={{ fontSize: '14px' }}>
            Ready
          </Text>
        </Space>
      ),
    },
    {
      title: 'CPU使用率',
      dataIndex: 'cpu',
      key: 'cpu',
      width: 140,
      render: (cpu) => (
        <Space direction="vertical" size={4}>
          {getResourceProgress(cpu.used, cpu.total)}
          <Text type="secondary" style={{ fontSize: '14px' }}>
            {cpu.used.toFixed(1)}/{cpu.total} Core
          </Text>
        </Space>
      ),
    },
    {
      title: '内存使用率',
      dataIndex: 'memory',
      key: 'memory',
      width: 140,
      render: (memory) => (
        <Space direction="vertical" size={4}>
          {getResourceProgress(memory.used, memory.total)}
          <Text type="secondary" style={{ fontSize: '14px' }}>
            {memory.used.toFixed(1)}/{memory.total.toFixed(1)} GB
          </Text>
        </Space>
      ),
    },
    {
      title: 'Pod分配率',
      dataIndex: 'pods',
      key: 'pods',
      width: 140,
      render: (pods) => (
        <Space direction="vertical" size={4}>
          {getResourceProgress(pods.used, pods.total)}
          <Text type="secondary" style={{ fontSize: '14px' }}>
            {pods.used}/{pods.total}
          </Text>
        </Space>
      ),
    },
    {
      title: 'K8s版本',
      dataIndex: 'version',
      key: 'version',
      width: 120,
      render: (version) => (
        <Tag color="blue" style={{ fontSize: '14px', padding: '4px 8px' }}>{version}</Tag>
      ),
    },
    {
      title: '同步模式',
      dataIndex: 'syncMode',
      key: 'syncMode',
      width: 100,
      render: (mode) => (
        <Tag color={mode === 'Push' ? 'green' : 'orange'} style={{ fontSize: '14px', padding: '4px 8px' }}>
          {mode}
        </Tag>
      ),
    },
    {
      title: '操作',
      key: 'action',
      width: 120,
      render: (_, record) => (
        <Button 
          type="link" 
          size="middle" 
          icon={<SettingOutlined />}
          onClick={() => navigate(`/cluster-manage/${record.name}`)}
          style={{ fontSize: '14px' }}
        >
          管理
        </Button>
      ),
    },
  ];

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: tableStyles }} />
      <Table
        columns={columns}
        dataSource={data.filter(item => 
          item && 
          item.name && 
          item.name.trim() !== '' &&
          item.status &&
          item.nodes &&
          item.cpu &&
          item.memory &&
          item.pods
        )}
        loading={loading}
        rowKey="name"
        pagination={false}
        size="large"
        style={{
          backgroundColor: '#ffffff',
          borderRadius: '8px',
          fontSize: '16px'
        }}
        scroll={{ x: 1200 }}
        className="cluster-overview-table"
        locale={{
          emptyText: loading ? '加载中...' : '暂无集群数据'
        }}
        showSorterTooltip={false}
      />
    </>
  );
};

export default ClusterOverview; 