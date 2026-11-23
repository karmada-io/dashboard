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
import { useMemo, useState } from 'react';
import Panel from '@/components/panel';
import {
  Input,
  Button,
  Segmented,
  TableColumnProps,
  Space,
  Table,
  message,
  Popconfirm,
  Tag,
  Select,
} from 'antd';
import { Icons } from '@/components/icons';
import { useQuery } from '@tanstack/react-query';
import {
  DeleteOverridePolicy,
  extractClusterNames,
  extractRuleTypes,
  GetClusterOverridePolicies,
} from '@/services/overridepolicy.ts';
import { stringify } from 'yaml';
import { GetResource } from '@/services/unstructured.ts';
import {
  GetOverridePolicies,
  OverridePolicy,
  ClusterOverridePolicy,
} from '@/services/overridepolicy.ts';
import OverridePolicyEditorDrawer, {
  OverridePolicyEditorDrawerProps,
} from './override-policy-editor-drawer.tsx';
import { GetNamespaces } from '@/services/namespace.ts';
import { getPolicyKey, PolicyScope } from '@/services/base.ts';

const OverridePolicyManage = () => {
  const [filter, setFilter] = useState<{
    policyScope: PolicyScope;
    selectedWorkSpace: string;
    searchText: string;
  }>({
    policyScope: PolicyScope.Namespace,
    selectedWorkSpace: '',
    searchText: '',
  });
  const [deletingNames, setDeletingNames] = useState<Set<string>>(new Set());
  const { data, isLoading, refetch } = useQuery({
    queryKey: ['GetOverridePolicies', JSON.stringify(filter)],
    queryFn: async () => {
      if (filter.policyScope === PolicyScope.Cluster) {
        console.log('x');
        const ret = await GetClusterOverridePolicies({
          keyword: filter.searchText,
        });
        return ret?.data?.clusterOverridePolicies || [];
      } else {
        const ret = await GetOverridePolicies({
          namespace: filter.selectedWorkSpace,
          keyword: filter.searchText,
        });
        return ret?.data?.overridepolicys || [];
      }
    },
  });
  const { data: nsData, isLoading: isNsDataLoading } = useQuery({
    queryKey: ['GetNamespaces'],
    queryFn: async () => {
      const clusters = await GetNamespaces({});
      return clusters.data || {};
    },
  });
  const nsOptions = useMemo(() => {
    if (!nsData?.namespaces) return [];
    return nsData.namespaces.map((item) => {
      return {
        title: item.objectMeta.name,
        value: item.objectMeta.name,
      };
    });
  }, [nsData]);
  const [editorDrawerData, setEditorDrawerData] = useState<
    Omit<OverridePolicyEditorDrawerProps, 'onClose' | 'onUpdate' | 'onCreate'>
  >({
    open: false,
    mode: 'detail',
    name: '',
    namespace: '',
    overrideContent: '',
    isClusterScope: filter.policyScope === PolicyScope.Cluster,
  });
  const columns = [
    filter.policyScope === PolicyScope.Namespace && {
      title: i18nInstance.t('a4b28a416f0b6f3c215c51e79e517298', '命名空间'),
      key: 'namespaceName',
      width: 200,
      render: (_v: string, r: OverridePolicy | ClusterOverridePolicy) => {
        return r.objectMeta.namespace;
      },
    },
    {
      title: i18nInstance.t('53cf41060c577315071a7c14bb612852', '策略名称'),
      key: 'policyName',
      width: 200,
      render: (_v: string, r: OverridePolicy | ClusterOverridePolicy) => {
        return r.objectMeta.name;
      },
    },
    {
      title: i18nInstance.t(
        '8a59b316f11d99f01ebe9b1b466ba8de',
        '差异化策略类型',
      ),
      key: 'ruleTypes',
      dataIndex: 'ruleTypes',
      render: (_v: string, r: OverridePolicy | ClusterOverridePolicy) => {
        const ruleTypes = extractRuleTypes(r);
        if (ruleTypes.length === 0) return '-';
        return (
          <div>
            {ruleTypes.map((key) => (
              <Tag key={`${r.objectMeta.name}-${key}`}>{key}</Tag>
            ))}
          </div>
        );
      },
    },
    {
      title: i18nInstance.t('ab7e397dd8c88360e441f1c1525a5758', '关联集群'),
      key: 'cluster',
      render: (_v: string, r: OverridePolicy | ClusterOverridePolicy) => {
        const clusters = extractClusterNames(r);
        if (clusters.length === 0) return '-';
        return (
          <div>
            {clusters.map((key) => (
              <Tag key={`${r.objectMeta.name}-${key}`}>{key}</Tag>
            ))}
          </div>
        );
      },
    },
    {
      title: i18nInstance.t('2b6bc0f293f5ca01b006206c2535ccbc', '操作'),
      key: 'op',
      width: 200,
      render: (_v: string, r: OverridePolicy | ClusterOverridePolicy) => {
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
                      ? 'overridepolicy'
                      : 'clusteroverridepolicy',
                });
                const content = stringify(ret.data);
                setEditorDrawerData({
                  open: true,
                  mode: 'detail',
                  name: r.objectMeta.name,
                  namespace: r.objectMeta.namespace,
                  overrideContent: content,
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
                      ? 'overridepolicy'
                      : 'clusteroverridepolicy',
                });
                const content = stringify(ret.data);
                setEditorDrawerData({
                  open: true,
                  mode: 'edit',
                  name: r.objectMeta.name,
                  namespace: r.objectMeta.namespace,
                  overrideContent: content,
                });
              }}
            >
              {i18nInstance.t('95b351c86267f3aedf89520959bce689', '编辑')}
            </Button>
            <Popconfirm
              placement="topRight"
              title={i18nInstance.t('1af8d577b89a4caf0e4b30734bbf7143', {
                name: r.objectMeta.name,
              })}
              onConfirm={async () => {
                const ret = await DeleteOverridePolicy({
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
              okText={'确认'}
              cancelText={'取消'}
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
    OverridePolicy | ClusterOverridePolicy
  >[];
  const [messageApi, messageContextHolder] = message.useMessage();

  function resetEditorDrawerData() {
    setEditorDrawerData({
      open: false,
      mode: 'detail',
      name: '',
      namespace: '',
      overrideContent: '',
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
                value={filter.selectedWorkSpace}
                loading={isNsDataLoading}
                showSearch
                allowClear
                placeholder={''}
                onChange={(v) => {
                  setFilter({
                    ...filter,
                    selectedWorkSpace: v,
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
            onPressEnter={(e) => {
              const input = e.currentTarget.value;
              setFilter({
                ...filter,
                searchText: input,
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
                isClusterScope: filter.policyScope === PolicyScope.Cluster,
              });
            }}
          >
            {filter.policyScope === PolicyScope.Namespace
              ? i18nInstance.t(
                  '7c7e4becc6e9b2be2a196ed506cdc518',
                  '新增差异化策略',
                )
              : i18nInstance.t(
                  'd4e6e1153ed42d2b2482f22ee04ac05a',
                  '新增集群差异化策略',
                )}
          </Button>
        </div>
      </div>
      <Table
        rowKey={(r: OverridePolicy | ClusterOverridePolicy) =>
          getPolicyKey(r, filter.policyScope)
        }

        columns={columns}
        loading={isLoading}
        dataSource={(data || []).filter(
          (r: OverridePolicy | ClusterOverridePolicy) => {
            const key = getPolicyKey(r, filter.policyScope);

            return !deletingNames.has(key);
          },
        )}
      />
      <OverridePolicyEditorDrawer
        open={editorDrawerData.open}
        name={editorDrawerData.name}
        namespace={editorDrawerData.namespace}
        mode={editorDrawerData.mode}
        overrideContent={editorDrawerData.overrideContent}
        isClusterScope={editorDrawerData.isClusterScope}
        onClose={() => {
          setEditorDrawerData({
            open: false,
            mode: 'detail',
            name: '',
            namespace: '',
            overrideContent: '',
          });
        }}
        onCreate={async (ret) => {
          if (ret.code === 200) {
            await messageApi.success('新增覆盖策略成功');
            resetEditorDrawerData();
            await refetch();
          } else {
            await messageApi.error('新增覆盖策略失败');
          }
        }}
        onUpdate={async (ret) => {
          if (ret.code === 200) {
            await messageApi.success('编辑覆盖策略成功');
            resetEditorDrawerData();
            await refetch();
          } else {
            await messageApi.error('编辑覆盖策略失败');
          }
        }}
      />
      {messageContextHolder}
    </Panel>
  );
};
export default OverridePolicyManage;
