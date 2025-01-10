import i18nInstance from '@/utils/i18n';
import { Button, Popconfirm, Space, Table, TableColumnProps, Tag } from 'antd';
import TagList from '@/components/tag-list';
import { FC } from 'react';
import { useQuery } from '@tanstack/react-query';
import { GetResource } from '@/services/unstructured.ts';
import { Config, GetConfigMaps } from '@/services/config.ts';
import { extractPropagationPolicy } from '@/services/base.ts';
interface ConfigMapTableProps {
  labelTagNum?: number;
  selectedWorkSpace: string;
  searchText: string;
  onViewConfigMapContent: (r: any) => void;
  onEditConfigMapContent: (r: any) => void;
  onDeleteConfigMapContent: (r: Config) => void;
}
const ConfigMapTable: FC<ConfigMapTableProps> = (props) => {
  const {
    labelTagNum,
    selectedWorkSpace,
    searchText,
    onViewConfigMapContent,
    onEditConfigMapContent,
    onDeleteConfigMapContent,
  } = props;
  const columns: TableColumnProps<Config>[] = [
    {
      title: i18nInstance.t('a4b28a416f0b6f3c215c51e79e517298', '命名空间'),
      key: 'namespaceName',
      width: 200,
      render: (_, r) => {
        return r.objectMeta.namespace;
      },
    },
    {
      title: i18nInstance.t('4fcad1c9ba0732214679e13bd69d998b', '配置名称'),
      key: 'configmapName',
      width: 300,
      render: (_, r) => {
        return r.objectMeta.name;
      },
    },
    {
      title: i18nInstance.t('1f7be0a924280cd098db93c9d81ecccd', '标签信息'),
      key: 'labelName',
      align: 'left',
      width: '30%',
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
        return <TagList tags={params} maxLen={labelTagNum} />;
      },
    },
    {
      title: i18nInstance.t('8a99082b2c32c843d2241e0ba60a3619', '分发策略'),
      key: 'propagationPolicies',
      render: (_, r) => {
        const pp = extractPropagationPolicy(r);
        return pp ? <Tag>{pp}</Tag> : '-';
      },
    },
    {
      title: i18nInstance.t('eaf8a02d1b16fcf94302927094af921f', '覆盖策略'),
      key: 'overridePolicies',
      width: 150,
      render: () => {
        return '-';
      },
    },
    {
      title: i18nInstance.t('2b6bc0f293f5ca01b006206c2535ccbc', '操作'),
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
                  kind: r.typeMeta.kind,
                  name: r.objectMeta.name,
                  namespace: r.objectMeta.namespace,
                });
                onViewConfigMapContent(ret?.data);
              }}
            >
              {i18nInstance.t('607e7a4f377fa66b0b28ce318aab841f', '查看')}
            </Button>
            <Button
              size={'small'}
              type="link"
              onClick={async () => {
                const ret = await GetResource({
                  kind: r.typeMeta.kind,
                  name: r.objectMeta.name,
                  namespace: r.objectMeta.namespace,
                });
                onEditConfigMapContent(ret?.data);
              }}
            >
              {i18nInstance.t('95b351c86267f3aedf89520959bce689', '编辑')}
            </Button>

            <Popconfirm
              placement="topRight"
              title={i18nInstance.t('af57bb34df71db6c4a115ed7665faf5d', {
                name: r.objectMeta.name,
              })}
              onConfirm={() => {
                onDeleteConfigMapContent(r);
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
  const { data, isLoading } = useQuery({
    queryKey: ['GetConfigMaps', selectedWorkSpace, searchText],
    queryFn: async () => {
      const services = await GetConfigMaps({
        namespace: selectedWorkSpace,
        keyword: searchText,
      });
      return services.data || {};
    },
  });
  return (
    <Table
      rowKey={(r: Config) =>
        `${r.objectMeta.namespace}-${r.objectMeta.name}` || ''
      }
      columns={columns}
      loading={isLoading}
      dataSource={data?.items || []}
    />
  );
};
export default ConfigMapTable;
