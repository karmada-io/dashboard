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

import i18nInstance from '@/utils/i18n';
import Panel from '@/components/panel';
import { useQuery } from '@tanstack/react-query';
import {
  App,
  Button,
  Input,
  Popconfirm,
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
import TagList, { convertLabelToTags } from '@/components/tag-list';

const NamespacePage = () => {
  const [searchFilter, setSearchFilter] = useState('');
  const [deletingNames, setDeletingNames] = useState<Set<string>>(new Set());
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
  const columns: TableColumnProps<Namespace>[] = [
    {
      title: i18nInstance.t('06ff2e9eba7ae422587c6536e337395f', '命名空间名称'),
      key: 'namespaceName',
      width: 200,
      render: (_, r) => {
        return r.objectMeta.name;
      },
    },
    {
      title: i18nInstance.t('14d342362f66aa86e2aa1c1e11aa1204', '标签'),
      key: 'label',
      align: 'left',
      render: (_, r) => (
        <TagList
          tags={convertLabelToTags(r?.objectMeta?.name, r?.objectMeta?.labels)}
          maxLen={size && size.width! > 1800 ? undefined : 1}
        />
      ),
    },
    {
      title: i18nInstance.t(
        '1d5fc011c19d35d08186afc4bad14be9',
        '是否跳过自动调度',
      ),
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
      title: i18nInstance.t('e4b51d5cd0e4f199e41c25be1c7591d3', '运行状态'),
      key: 'phase',
      dataIndex: 'phase',
    },
    {
      title: i18nInstance.t('eca37cb0726c51702f70c486c1c38cf3', '创建时间'),
      key: 'creationTimestamp',
      render: (_, r) => {
        return dayjs(r.objectMeta.creationTimestamp).format(
          'YYYY/MM/DD HH:mm:ss',
        );
      },
    },
    {
      title: i18nInstance.t('2b6bc0f293f5ca01b006206c2535ccbc', '操作'),
      key: 'op',
      width: 200,
      render: (_, r) => {
        return (
          <Space.Compact>
            <Button size={'small'} type="link" disabled={true}>
              {i18nInstance.t('607e7a4f377fa66b0b28ce318aab841f', '查看')}
            </Button>
            <Button size={'small'} type="link" disabled={true}>
              {i18nInstance.t('95b351c86267f3aedf89520959bce689', '编辑')}
            </Button>
            <Popconfirm
              placement="topRight"
              title={i18nInstance.t('b410105ce63c464d55d0b139912476e1', {
                name: r.objectMeta.name,
              })}
              onConfirm={async () => {
                const ret = await DeleteResource({
                  kind: 'namespace',
                  name: r.objectMeta.name,
                });
                if (ret.code === 200) {
                  await messageApi.success(
                    i18nInstance.t(
                      '919994bf077d49f68f016811ffb5600e',
                      '删除命名空间成功',
                    ),
                  );
                  setDeletingNames((prev) => new Set(prev).add(r.objectMeta.name));
                  await refetch();
                } else {
                  await messageApi.error(
                    i18nInstance.t(
                      '9cdd00dbaa024d64a8b8134ae57974a6',
                      '删除命名空间失败',
                    ),
                  );
                }
              }}
              okText={i18nInstance.t(
                'e83a256e4f5bb4ff8b3d804b5473217a',
                '确认',
              )}
              cancelText={i18nInstance.t(
                '625fb26b4b3340f7872b411f401e754c',
                '取消',
              )}
            >
              <Button size={'small'} type="link" danger>
                {i18nInstance.t('2f4aaddde33c9b93c36fd2503f3d122b', '删除')}
              </Button>
            </Popconfirm>
          </Space.Compact>
        );
      },
    },
  ];

  const [showModal, toggleShowModal] = useToggle(false);
  const { message: messageApi } = App.useApp();
  return (
    <Panel>
      <div className={'flex flex-row justify-between mb-4'}>
        <Input.Search
          placeholder={i18nInstance.t(
            'cfaff3e369b9bd51504feb59bf0972a0',
            '按命名空间搜索',
          )}
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
          {i18nInstance.t('ac2f01145a5c4a9aaaf2f828650d91a3', '新增命名空间')}
        </Button>
      </div>
      <Table
        rowKey={(r: Namespace) => r.objectMeta.name || ''}
        columns={columns}
        loading={isLoading}
        dataSource={
          (data?.namespaces || []).filter(
            (n: Namespace) => !deletingNames.has(n.objectMeta.name),
          )
        }
      />

      <NewNamespaceModal
        open={showModal}
        onOk={async (ret) => {
          if (ret.code === 200) {
            await messageApi.success(
              i18nInstance.t(
                '03b7ea4ba52a71e18764013f4696afe0',
                '创建命名空间成功',
              ),
            );
            toggleShowModal(false);
            await refetch();
          } else {
            await messageApi.error(
              i18nInstance.t(
                'ca0f9765a014b2d0bcaef7b90c6eddd9',
                '创建命名空间失败',
              ),
            );
          }
        }}
        onCancel={() => {
          toggleShowModal(false);
        }}
      />
    </Panel>
  );
};

export default NamespacePage;
