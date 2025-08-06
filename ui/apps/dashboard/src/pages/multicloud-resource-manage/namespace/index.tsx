import i18nInstance from '@/utils/i18n';
import Panel from '@/components/panel';
import { useQuery } from '@tanstack/react-query';
import {
  Button,
  Input,
  message,
  Space,
  Table,
  TableColumnProps,
  Tag,
} from 'antd';
import { GetNamespaces } from '@/services/namespace.ts';
import type { Namespace } from '@/services/namespace.ts';
import { Icons } from '@/components/icons';
import dayjs from 'dayjs';
import { useToggle, useWindowSize } from '@uidotdev/usehooks';
import NewNamespaceModal from './new-namespace-modal.tsx';
import { DeleteResource } from '@/services/unstructured';
import { useState } from 'react';
import { DataSelectQuery } from '@/services/base.ts';
import TagList from '@/components/tag-list';

const NamespacePage = () => {
  const [searchFilter, setSearchFilter] = useState('');
  const { data, isLoading, refetch } = useQuery({
    queryKey: ['GetNamespaces', searchFilter],
    queryFn: async () => {
      const query: DataSelectQuery = {};
      if (searchFilter) {
        query.filterBy = ['name', searchFilter];
      }
      const clusters = await GetNamespaces(query);
      return clusters.data || {};
    },
  });
  const size = useWindowSize();
  console.log('size.width', size?.width);
  const columns: TableColumnProps<Namespace>[] = [
    {
      title: i18nInstance.t('06ff2e9eba7ae422587c6536e337395f'),
      key: 'namespaceName',
      width: 200,
      render: (_, r) => {
        return r.objectMeta.name;
      },
    },
    {
      title: i18nInstance.t('14d342362f66aa86e2aa1c1e11aa1204'),
      key: 'label',
      align: 'left',
      render: (_, r) => {
        if (!r?.objectMeta?.labels) {
          return '-';
        }
        const params = Object.keys(r.objectMeta.labels).map((key) => {
          return {
            key: `${r.objectMeta.name}-${key}`,
            value: `${key}:${r.objectMeta.labels[key]}`,
          };
        });
        return (
          <TagList
            tags={params}
            maxLen={size && size.width! > 1800 ? undefined : 1}
          />
        );
      },
    },
    {
      title: i18nInstance.t('1d5fc011c19d35d08186afc4bad14be9'),
      key: 'skipAutoPropagation',
      render: (_, r) => {
        return r.skipAutoPropagation ? (
          <Tag color="blue">yes</Tag>
        ) : (
          <Tag color="purple">no</Tag>
        );
      },
    },
    {
      title: i18nInstance.t('e4b51d5cd0e4f199e41c25be1c7591d3'),
      key: 'phase',
      dataIndex: 'phase',
    },
    {
      title: i18nInstance.t('eca37cb0726c51702f70c486c1c38cf3'),
      key: 'creationTimestamp',
      render: (_, r) => {
        return dayjs(r.objectMeta.creationTimestamp).format(
          'YYYY/MM/DD HH:mm:ss',
        );
      },
    },
    {
      title: i18nInstance.t('2b6bc0f293f5ca01b006206c2535ccbc'),
      key: 'op',
      width: 200,
      render: (_, r) => {
        return (
          <Space.Compact>
            <Button size={'small'} type="link">
              {i18nInstance.t('607e7a4f377fa66b0b28ce318aab841f')}
            </Button>
            <Button size={'small'} type="link">
              {i18nInstance.t('95b351c86267f3aedf89520959bce689')}
            </Button>
            <Button
              size={'small'}
              type="link"
              danger
              onClick={async () => {
                const ret = await DeleteResource({
                  kind: 'namespace',
                  name: r.objectMeta.name,
                });
                if (ret.code === 200) {
                  await messageApi.error(
                    i18nInstance.t('919994bf077d49f68f016811ffb5600e'),
                  );
                  await refetch();
                } else {
                  await messageApi.error(
                    i18nInstance.t('9cdd00dbaa024d64a8b8134ae57974a6'),
                  );
                }
              }}
            >
              {i18nInstance.t('2f4aaddde33c9b93c36fd2503f3d122b')}
            </Button>
          </Space.Compact>
        );
      },
    },
  ];

  const [showModal, toggleShowModal] = useToggle(false);
  const [messageApi, messageContextHolder] = message.useMessage();

  return (
    <Panel>
      <div className={'flex flex-row justify-between mb-4'}>
        <Input.Search
          placeholder={i18nInstance.t('cfaff3e369b9bd51504feb59bf0972a0')}
          className={'w-[400px]'}
          onPressEnter={(e) => {
            const input = e.currentTarget.value;
            setSearchFilter(input);
          }}
        />
        <Button
          type={'primary'}
          icon={<Icons.add width={16} height={16} />}
          className="flex flex-row items-center"
          onClick={() => {
            toggleShowModal(true);
          }}
        >
          {i18nInstance.t('ac2f01145a5c4a9aaaf2f828650d91a3')}
        </Button>
      </div>
      <Table
        rowKey={(r: Namespace) => r.objectMeta.name || ''}
        columns={columns}
        loading={isLoading}
        dataSource={data?.namespaces || []}
      />

      <NewNamespaceModal
        open={showModal}
        onOk={async (ret) => {
          if (ret.code === 200) {
            await messageApi.success(
              i18nInstance.t('03b7ea4ba52a71e18764013f4696afe0'),
            );
            toggleShowModal(false);
            await refetch();
          } else {
            await messageApi.error(
              i18nInstance.t('ca0f9765a014b2d0bcaef7b90c6eddd9'),
            );
          }
        }}
        onCancel={() => {
          toggleShowModal(false);
        }}
      />

      {messageContextHolder}
    </Panel>
  );
};

export default NamespacePage;
