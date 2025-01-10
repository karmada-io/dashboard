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

export type PolicyScope = 'namespace-scope' | 'cluster-scope';
const OverridePolicyManage = () => {
  const [filter, setFilter] = useState<{
    policyScope: PolicyScope;
    selectedWorkSpace: string;
    searchText: string;
  }>({
    policyScope: 'namespace-scope',
    selectedWorkSpace: '',
    searchText: '',
  });
  const { data, isLoading, refetch } = useQuery({
    queryKey: ['GetOverridePolicies', JSON.stringify(filter)],
    queryFn: async () => {
      if (filter.policyScope === 'cluster-scope') {
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
    isClusterScope: filter.policyScope === 'cluster-scope',
  });
  const columns = [
    filter.policyScope === 'namespace-scope' && {
      title: '命名空间',
      key: 'namespaceName',
      width: 200,
      render: (_v: string, r: OverridePolicy | ClusterOverridePolicy) => {
        return r.objectMeta.namespace;
      },
    },
    {
      title: '策略名称',
      key: 'policyName',
      width: 200,
      render: (_v: string, r: OverridePolicy | ClusterOverridePolicy) => {
        return r.objectMeta.name;
      },
    },
    {
      title: '差异化策略类型',
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
      title: '关联集群',
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
      title: '操作',
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
                    filter.policyScope === 'namespace-scope'
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
              查看
            </Button>
            <Button
              size={'small'}
              type="link"
              onClick={async () => {
                const ret = await GetResource({
                  name: r.objectMeta.name,
                  namespace: r.objectMeta.namespace,
                  kind:
                    filter.policyScope === 'namespace-scope'
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
              编辑
            </Button>
            <Popconfirm
              placement="topRight"
              title={`确认要删除${r.objectMeta.name}覆盖策略么`}
              onConfirm={async () => {
                const ret = await DeleteOverridePolicy({
                  isClusterScope: filter.policyScope === 'cluster-scope',
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
                删除
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
            label: '命名空间级别',
            value: 'namespace-scope',
          },
          {
            label: '集群级别',
            value: 'cluster-scope',
          },
        ]}
      />

      <div className={'flex flex-row mb-4 justify-between'}>
        <div className={'flex flex-row space-x-4'}>
          {filter.policyScope === 'namespace-scope' && (
            <>
              <h3 className={'leading-[32px]'}>命名空间</h3>
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
            placeholder={'按名称检索，按下回车开始搜索'}
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
                isClusterScope: filter.policyScope === 'cluster-scope',
              });
            }}
          >
            {filter.policyScope === 'namespace-scope'
              ? '新增差异化策略'
              : '新增集群差异化策略'}
          </Button>
        </div>
      </div>
      <Table
        rowKey={(r: OverridePolicy) => r.objectMeta.name || ''}
        columns={columns}
        loading={isLoading}
        dataSource={data || []}
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
