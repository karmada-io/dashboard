import i18nInstance from '@/utils/i18n';
import { useState } from 'react';
import Panel from '@/components/panel';
import {
  Input,
  Button,
  Segmented,
  TableColumnProps,
  Tag,
  Space,
  Table,
  message,
  Popconfirm,
} from 'antd';
import { Icons } from '@/components/icons';
import { useQuery } from '@tanstack/react-query';
import {
  GetPropagationPolicies,
  DeletePropagationPolicy,
} from '@/services/propagationpolicy.ts';
import type { PropagationPolicy } from '@/services/propagationpolicy.ts';
import PropagationPolicyEditorDrawer, {
  PropagationPolicyEditorDrawerProps,
} from './propagation-policy-editor-drawer';
import { stringify } from 'yaml';
import { GetResource } from '@/services/unstructured.ts';

export type PolicyScope = 'namespace-scope' | 'cluster-scope';

const PropagationPolicyManage = () => {
  const [policyScope, setPolicyScope] =
    useState<PolicyScope>('namespace-scope');
  const { data, isLoading, refetch } = useQuery({
    queryKey: ['GetPropagationPolicies', policyScope],
    queryFn: async () => {
      if (policyScope === 'cluster-scope')
        return {
          propagationpolicys: [],
        };
      const ret = await GetPropagationPolicies();
      return ret.data || {};
    },
  });
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
  const columns: TableColumnProps<PropagationPolicy>[] = [
    {
      title: i18nInstance.t('a4b28a416f0b6f3c215c51e79e517298'),
      key: 'namespaceName',
      width: 200,
      render: (_, r) => {
        return r.objectMeta.namespace;
      },
    },
    {
      title: i18nInstance.t('53cf41060c577315071a7c14bb612852'),
      key: 'policyName',
      width: 200,
      render: (_, r) => {
        return r.objectMeta.name;
      },
    },
    {
      title: i18nInstance.t('915f48c8fcbe25e3dc5875c471b0ce3e'),
      key: 'schedulerName',
      dataIndex: 'schedulerName',
      width: 200,
    },
    {
      title: i18nInstance.t('ab7e397dd8c88360e441f1c1525a5758'),
      key: 'cluster',
      render: (_, r) => {
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
      title: i18nInstance.t('8c0921045b741bc4e19d61426b99c938'),
      key: 'deployments',
      render: (_, r) => {
        return r.deployments.map((d) => (
          <Tag key={`${r.objectMeta.name}-${d}`}>{d}</Tag>
        ));
      },
    },
    {
      title: i18nInstance.t('2b6bc0f293f5ca01b006206c2535ccbc'),
      key: 'op',
      width: 200,
      render: (_, r) => {
        return (
          <Space.Compact>
            <Button
              size={'small'}
              type="link"
              onClick={async () => {
                const ret = await GetResource({
                  name: r.objectMeta.name,
                  namespace: r.objectMeta.namespace,
                  kind: 'propagationpolicy',
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
              {i18nInstance.t('607e7a4f377fa66b0b28ce318aab841f')}
            </Button>
            <Button
              size={'small'}
              type="link"
              onClick={async () => {
                const ret = await GetResource({
                  name: r.objectMeta.name,
                  namespace: r.objectMeta.namespace,
                  kind: 'propagationpolicy',
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
              {i18nInstance.t('95b351c86267f3aedf89520959bce689')}
            </Button>
            <Popconfirm
              placement="topRight"
              title={`确认要删除${r.objectMeta.name}调度策略么`}
              onConfirm={async () => {
                const ret = await DeletePropagationPolicy({
                  isClusterScope: policyScope === 'cluster-scope',
                  namespace: r.objectMeta.namespace,
                  name: r.objectMeta.name,
                });
                if (ret.code === 200) {
                  messageApi.success(
                    i18nInstance.t('0007d170de017dafc266aa03926d7f00'),
                  );
                  refetch();
                } else {
                  messageApi.error(
                    i18nInstance.t('acf0664a54dc58d9d0377bb56e162092'),
                  );
                }
              }}
              okText={i18nInstance.t('e83a256e4f5bb4ff8b3d804b5473217a')}
              cancelText={i18nInstance.t('625fb26b4b3340f7872b411f401e754c')}
            >
              <Button size={'small'} type="link" danger>
                {i18nInstance.t('2f4aaddde33c9b93c36fd2503f3d122b')}
              </Button>
            </Popconfirm>
          </Space.Compact>
        );
      },
    },
  ];

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
        value={policyScope}
        style={{ marginBottom: 8 }}
        onChange={(value) => setPolicyScope(value as PolicyScope)}
        options={[
          {
            label: i18nInstance.t('bf15e71b2553d369585ace795d15ac3b'),
            value: 'namespace-scope',
          },
          {
            label: i18nInstance.t('860f29d8fc7a68113902db52885111d4'),
            value: 'cluster-scope',
          },
        ]}
      />

      <div className={'flex flex-row justify-between mb-4'}>
        <Input.Search
          placeholder={i18nInstance.t('cfaff3e369b9bd51504feb59bf0972a0')}
          className={'w-[400px]'}
        />
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
          {policyScope === 'namespace-scope'
            ? i18nInstance.t('5ac6560da4f54522d590c5f8e939691b')
            : i18nInstance.t('929e0cda9f7fdc960dafe6ef742ab088')}
        </Button>
      </div>
      <Table
        rowKey={(r: PropagationPolicy) => r.objectMeta.name || ''}
        columns={columns}
        loading={isLoading}
        dataSource={data?.propagationpolicys || []}
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
        onCreate={(ret) => {
          if (ret.code === 200) {
            messageApi.success(`新增调度策略成功`);
            resetEditorDrawerData();
            refetch();
          } else {
            messageApi.error(`新增调度策略失败`);
          }
        }}
        onUpdate={(ret) => {
          if (ret.code === 200) {
            messageApi.success(`编辑调度策略成功`);
            resetEditorDrawerData();
            refetch();
          } else {
            messageApi.error(`编辑调度策略失败`);
          }
        }}
      />

      {messageContextHolder}
    </Panel>
  );
};

export default PropagationPolicyManage;
