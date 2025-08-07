import React, { useEffect } from 'react';
import { Table, Spin } from 'antd';
import { useStorageStore } from '../../stores/storage';
import { StorageClass } from '../../types/storage';
import { formatDistanceToNow } from 'date-fns';

const StorageClassesPage: React.FC = () => {
  const { storageClasses, loading, fetchStorageClasses } = useStorageStore();

  useEffect(() => {
    fetchStorageClasses();
  }, [fetchStorageClasses]);

  const columns = [
    {
      title: 'Name',
      dataIndex: ['objectMeta', 'name'],
      key: 'name',
    },
    {
      title: 'Provisioner',
      dataIndex: 'provisioner',
      key: 'provisioner',
    },
    {
      title: 'Reclaim Policy',
      dataIndex: 'reclaimPolicy',
      key: 'reclaimPolicy',
    },
    {
      title: 'Age',
      dataIndex: ['objectMeta', 'creationTimestamp'],
      key: 'age',
      render: (timestamp: string) => {
        return formatDistanceToNow(new Date(timestamp), { addSuffix: true });
      },
    },
  ];

  return (
    <div>
      <h1>Storage Classes</h1>
      <Spin spinning={loading}>
        <Table
          dataSource={storageClasses}
          columns={columns}
          rowKey={(record) => record.objectMeta.name}
        />
      </Spin>
    </div>
  );
};

export default StorageClassesPage;
