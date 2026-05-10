/*
Copyright 2026 The Karmada Authors.

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

import { Input, Table, Tag, Space, Tooltip, Button } from 'antd';
import { Icons } from '@/components/icons';
import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useMemberClusterContext } from '@/hooks';
import {
  Event as ClusterEvent,
  GetMemberClusterEvents,
} from '@/services/member-cluster/event';

export default function MemberClusterEvents() {
  const { memberClusterName } = useMemberClusterContext();

  const [filter, setFilter] = useState<{
    namespace: string;
    searchText: string;
  }>({
    namespace: '',
    searchText: '',
  });

  const { data, isLoading } = useQuery({
    queryKey: ['GetMemberClusterEvents', memberClusterName, filter],
    queryFn: async () => {
      const ret = await GetMemberClusterEvents({
        memberClusterName,
        namespace: filter.namespace || undefined,
        keyword: filter.searchText,
      });
      return ret.data;
    },
  });

  const getTypeTag = (type: string) => {
    const typeConfig: Record<string, { color: string; icon: React.ReactNode }> = {
      'Normal': { color: 'success', icon: <Icons.checkCircle width={16} height={16} /> },
      'Warning': { color: 'warning', icon: <Icons.warning width={16} height={16} /> },
      'Error': { color: 'error', icon: <Icons.exclamation width={16} height={16} /> }
    };

    const config = typeConfig[type] || { color: 'default', icon: <Icons.info width={16} height={16} /> };
    return (
      <Tag color={config.color} icon={config.icon}>
        {type}
      </Tag>
    );
  };

  const getReasonTag = (reason: string, _type: string) => {
    const reasonColors: Record<string, string> = {
      'Pulling': 'blue',
      'Pulled': 'green',
      'Failed': 'red',
      'Scheduled': 'green',
      'Created': 'green',
      'Started': 'green',
      'Unhealthy': 'orange',
      'Killing': 'red',
      'FailedScheduling': 'red'
    };

    return (
      <Tag color={reasonColors[reason] || 'default'}>
        {reason}
      </Tag>
    );
  };

  const formatObject = (object: string) => {
    const [kind, name] = object.split('/');
    return (
      <div className="flex items-center gap-1">
        <Tag color="geekblue">{kind}</Tag>
        <code className="text-xs">{name}</code>
      </div>
    );
  };

  const formatMessage = (message: string) => {
    if (message.length <= 50) {
      return <span className="text-sm">{message}</span>;
    }

    return (
      <Tooltip title={message}>
        <span className="text-sm">{message.substring(0, 50)}...</span>
      </Tooltip>
    );
  };

  const getCountTag = (count: number) => {
    if (count === 1) {
      return <Tag color="default">1</Tag>;
    }

    const color = count > 10 ? 'red' : count > 5 ? 'orange' : 'blue';
    return <Tag color={color}>{count}</Tag>;
  };

  const columns = [
    {
      title: 'Type',
      dataIndex: 'type',
      key: 'type',
      render: (type: string) => getTypeTag(type),
      width: 100
    },
    {
      title: 'Reason',
      dataIndex: 'reason',
      key: 'reason',
      render: (reason: string, record: any) => {
        return getReasonTag(reason, record.type)
      },
      width: 120
    },
    {
      title: 'Object',
      dataIndex: 'object',
      key: 'object',
      render: (object: string) => formatObject(object),
      width: 200
    },
    {
      title: 'Namespace',
      dataIndex: 'objectNamespace',
      key: 'namespace',
      width: 120
    },
    {
      title: 'Source',
      dataIndex: 'sourceComponent',
      key: 'source',
      render: (source: string) => <code className="text-xs">{source}</code>,
      width: 120
    },
    {
      title: 'Message',
      dataIndex: 'message',
      key: 'message',
      render: (message: string) => formatMessage(message)
    },
    {
      title: 'Count',
      dataIndex: 'count',
      key: 'count',
      render: (count: number) => getCountTag(count),
      width: 80
    },
    {
      title: 'First Seen',
      dataIndex: 'firstSeen',
      key: 'firstSeen',
      width: 100
    },
    {
      title: 'Last Seen',
      dataIndex: 'lastSeen',
      key: 'lastSeen',
      width: 100
    },
    {
      title: 'Actions',
      key: 'actions',
      render: () => (
        <Space>
          <Button icon={<Icons.eye width={16} height={16} />} title="View event details">
            View
          </Button>
        </Space>
      ),
      width: 80
    }
  ];

  return (
    <div className="h-full w-full flex flex-col p-4">
      <div className="flex flex-row space-x-4 mb-4">
        <Input.Search
          placeholder="Search by reason or message"
          className="w-[300px]"
          onPressEnter={(e) => {
            const input = e.currentTarget.value;
            setFilter({
              ...filter,
              searchText: input,
            });
          }}
        />
      </div>

      <div className="flex-1 flex flex-col">
        <Table
          columns={columns}
          dataSource={data?.events || []}
          rowKey={(record: ClusterEvent, index) =>
            `${record.object}-${record.firstSeen}-${index}`
          }
          pagination={{
            pageSize: 20,
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total, range) =>
              `${range[0]}-${range[1]} of ${total} events`,
          }}
          loading={isLoading}
          scroll={{ x: 1200 }}
        />
      </div>
    </div>
  );
}
