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
import { useState } from 'react';
import Panel from '@/components/panel';
import {
  Button,
  Input,
  message,
  Popconfirm,
  Segmented,
  Select,
  Space,
  Table,
  TableColumnProps,
  Tag,
} from 'antd';
import { Icons } from '@/components/icons';
import { useQuery } from '@tanstack/react-query';
import type { PropagationPolicy } from '@/services/propagationpolicy.ts';
import {
  ClusterPropagationPolicy,
  DeletePropagationPolicy,
  GetClusterPropagationPolicies,
  GetPropagationPolicies,
} from '@/services/propagationpolicy.ts';
import PropagationPolicyEditorDrawer, {
  PropagationPolicyEditorDrawerProps,
} from './propagation-policy-editor-drawer';
import { stringify } from 'yaml';
import { GetResource } from '@/services/unstructured.ts';
import { useDebounce } from '@uidotdev/usehooks';
import { getPolicyKey, PolicyScope } from '@/services/base.ts';
import useNamespace from '@/hooks/use-namespace.ts';


const PropagationPolicyManage = () => {
  const [filter, setFilter] = useState<{
    policyScope: PolicyScope;
    selectedNamespace: string;
    searchText: string;
  }>({
    policyScope: PolicyScope.Namespace,
    selectedNamespace: '',
    searchText: '',
  });
  const [deletingNames, setDeletingNames] = useState<Set<string>>(new Set());
  const debouncedSearchText = useDebounce(filter.searchText, 300);
  const { data, isLoading, refetch } = useQuery({
    queryKey: [
      'GetPropagationPolicies',
      filter.selectedNamespace,
      filter.policyScope,
      debouncedSearchText,
    ],
    queryFn: async () => {
      if (filter.policyScope === PolicyScope.Cluster) {
        const ret = await GetClusterPropagationPolicies({
          keyword: filter.searchText,
        });
        return ret?.data?.clusterPropagationPolicies || [];
      } else {
        const ret = await GetPropagationPolicies({
          namespace: filter.selectedNamespace,
          keyword: filter.searchText,
        });
        return ret?.data?.propagationpolicys || [];
      }
    },
  });
  const { nsOptions, isNsDataLoading } = useNamespace({});
  const [editorDrawerData, setEditorDrawerData] = useState<
    Omit<
      PropagationPolicyEditorDrawerProps,
      'onClose' | 'onUpdate' | 'onCreate'
    >
  >({
    open: false,
    mode: 'detail',
    name: '',
    namespace: '',
    propagationContent: '',
  });
  const columns = [
    filter.policyScope === PolicyScope.Namespace && {
      title: i18nInstance.t('a4b28a416f0b6f3c215c51e79e517298', '命名空间'),
      key: 'namespaceName',
      width: 200,
      render: (_v: string, r: PropagationPolicy) => {
        return r.objectMeta.namespace;
      },
    },
    {
      title: i18nInstance.t('53cf41060c577315071a7c14bb612852', '策略名称'),
      key: 'policyName',
      width: 200,
      render: (_v: string, r: PropagationPolicy) => {
        return r.objectMeta.name;
      },
    },
    {
      title: i18nInstance.t('915f48c8fcbe25e3dc5875c471b0ce3e', '调度器名称'),
      key: 'schedulerName',
      dataIndex: 'schedulerName',
      width: 200,
    },
    {
      title: i18nInstance.t('ab7e397dd8c88360e441f1c1525a5758', '关联集群'),
      key: 'cluster',
      render: (_v: string, r: PropagationPolicy) => {
        if (!r?.clusterAffinity?.clusterNames) {
          return '-';
        }
        return (
          <div>
            {r.clusterAffinity.clusterNames.map((key) => (
              <Tag key={`${r.objectMeta.name}-${key}`}>{key}</Tag>
            ))}
          </div>
        );
      },
    },
    {
      title: i18nInstance.t('8c0921045b741bc4e19d61426b99c938', '关联资源'),
      key: 'deployments',
      render: (_v: string, r: PropagationPolicy) => {
        return r?.relatedResources?.map((resource) => (
          <Tag key={`${r.objectMeta.name}-${resource}`}>{resource}</Tag>
        ));
      },
    },
    {
      title: i18nInstance.t('2b6bc0f293f5ca01b006206c2535ccbc', '操作'),
      key: 'op',
      width: 200,
      render: (_v: string, r: PropagationPolicy) => {
        return (
          <Space.Compact>
            <Button
              size={'small'}
              type="link"
              onClick={async () => {
                const ret = await GetResource({
                  name: r.objectMeta.name,
                  namespace: r.objectMeta.namespace,
                  kind:
                    filter.policyScope === PolicyScope.Namespace
                      ? 'propagationpolicy'
                      : 'clusterpropagationpolicy',
                });
                const content = stringify(ret.data);
                setEditorDrawerData({
                  open: true,
                  mode: 'detail',
                  name: r.objectMeta.name,
                  namespace: r.objectMeta.namespace,
                  propagationContent: content,
                });
              }}
            >
              {i18nInstance.t('607e7a4f377fa66b0b28ce318aab841f', '查看')}
            </Button>
            <Button
              size={'small'}
              type="link"
              onClick={async () => {
                const ret = await GetResource({
                  name: r.objectMeta.name,
                  namespace: r.objectMeta.namespace,
                  kind:
                    filter.policyScope === PolicyScope.Namespace
                      ? 'propagationpolicy'
                      : 'clusterpropagationpolicy',
                });
                const content = stringify(ret.data);
                setEditorDrawerData({
                  open: true,
                  mode: 'edit',
                  name: r.objectMeta.name,
                  namespace: r.objectMeta.namespace,
                  propagationContent: content,
                });
              }}
            >
              {i18nInstance.t('95b351c86267f3aedf89520959bce689', '编辑')}
            </Button>
            <Popconfirm
              placement="topRight"
              title={i18nInstance.t('b13c676134d8ab066d62e9ea5bdf796c', {
                name: r.objectMeta.name,
              })}
              onConfirm={async () => {
                const ret = await DeletePropagationPolicy({
                  isClusterScope: filter.policyScope === PolicyScope.Cluster,
                  namespace: r.objectMeta.namespace,
                  name: r.objectMeta.name,
                });
                if (ret.code === 200) {
                  await messageApi.success(
                    i18nInstance.t(
                      '0007d170de017dafc266aa03926d7f00',
                      '删除成功',
                    ),
                  );
                  setDeletingNames((prev) => {
                    const key = getPolicyKey(r, filter.policyScope);
                    return new Set(prev).add(key);
                  });
                  await refetch();
                } else {
                  await messageApi.error(
                    i18nInstance.t(
                      'acf0664a54dc58d9d0377bb56e162092',
                      '删除失败',
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
  ].filter(Boolean) as TableColumnProps<
    PropagationPolicy | ClusterPropagationPolicy
  >[];
  const [messageApi, messageContextHolder] = message.useMessage();

  function resetEditorDrawerData() {
    setEditorDrawerData({
      open: false,
      mode: 'detail',
      name: '',
      namespace: '',
      propagationContent: '',
    });
  }

  return (
    <Panel>
      <Segmented
        value={filter.policyScope}
        style={{
          marginBottom: 8,
        }}
        onChange={(value) => {
          setFilter({
            ...filter,
            searchText: '',
            selectedNamespace: '',
            policyScope: value as PolicyScope,
          });
        }}
        options={[
          {
            label: i18nInstance.t(
              'bf15e71b2553d369585ace795d15ac3b',
              '命名空间级别',
            ),
            value: PolicyScope.Namespace,
          },
          {
            label: i18nInstance.t(
              '860f29d8fc7a68113902db52885111d4',
              '集群级别',
            ),
            value: PolicyScope.Cluster,
          },
        ]}
      />

      <div className={'flex flex-row mb-4 justify-between'}>
        <div className={'flex flex-row space-x-4'}>
          {filter.policyScope === PolicyScope.Namespace && (
            <>
              <h3 className={'leading-[32px]'}>
                {i18nInstance.t('a4b28a416f0b6f3c215c51e79e517298', '命名空间')}
              </h3>
              <Select
                options={nsOptions}
                className={'min-w-[200px]'}
                value={filter.selectedNamespace}
                loading={isNsDataLoading}
                showSearch
                allowClear
                placeholder={''}
                onChange={(v) => {
                  setFilter({
                    ...filter,
                    selectedNamespace: v,
                  });
                }}
              />
            </>
          )}
          <Input.Search
            placeholder={i18nInstance.t(
              '88270824e97355ca21f4101e5f1b73a0',
              '按名称检索，按下回车开始搜索',
            )}
            className={'w-[400px]'}
            value={filter.searchText}
            onChange={(e) => {
              setFilter({
                ...filter,
                searchText: e.target.value,
              });
            }}
          />
        </div>
        <div>
          <Button
            type={'primary'}
            icon={<Icons.add width={16} height={16} />}
            className="flex flex-row items-center"
            onClick={() => {
              setEditorDrawerData({
                open: true,
                mode: 'create',
              });
            }}
          >
            {filter.policyScope === PolicyScope.Namespace
              ? i18nInstance.t(
                  '5ac6560da4f54522d590c5f8e939691b',
                  '新增调度策略',
                )
              : i18nInstance.t(
                  '929e0cda9f7fdc960dafe6ef742ab088',
                  '新增集群调度策略',
                )}
          </Button>
        </div>
      </div>

      <Table
        rowKey={(r: PropagationPolicy | ClusterPropagationPolicy) =>
          getPolicyKey(r, filter.policyScope)
        }

        columns={columns}
        loading={isLoading}
        dataSource={(data || []).filter(
          (r: PropagationPolicy | ClusterPropagationPolicy) => {
            const key = getPolicyKey(r, filter.policyScope);

          return !deletingNames.has(key);
        })}
      />

      <PropagationPolicyEditorDrawer
        open={editorDrawerData.open}
        name={editorDrawerData.name}
        namespace={editorDrawerData.namespace}
        mode={editorDrawerData.mode}
        propagationContent={editorDrawerData.propagationContent}
        onClose={() => {
          setEditorDrawerData({
            open: false,
            mode: 'detail',
            name: '',
            namespace: '',
            propagationContent: '',
          });
        }}
        onCreate={async (ret) => {
          if (ret.code === 200) {
            await messageApi.success(
              `${i18nInstance.t('8233550b23ab7acc2a9c3b2623c371dd', '新增调度策略成功')}`,
            );
            resetEditorDrawerData();
            await refetch();
          } else {
            await messageApi.error(
              `${i18nInstance.t('40eae6f51d50abb0f0132d7638682093', '新增调度策略失败')}`,
            );
          }
        }}
        onUpdate={async (ret) => {
          if (ret.code === 200) {
            await messageApi.success(
              `${i18nInstance.t('f2224910b0d022374967254002eb756f', '编辑调度策略成功')}`,
            );
            resetEditorDrawerData();
            await refetch();
          } else {
            await messageApi.error(
              `${i18nInstance.t('5863fd1d291adf46d804f5801a79d0e1', '编辑调度策略失败')}`,
            );
          }
        }}
      />

      {messageContextHolder}
    </Panel>
  );
};
export default PropagationPolicyManage;
