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
      title: '命名空间',
      key: 'namespaceName',
      width: 200,
      render: (_, r) => {
        return r.objectMeta.namespace;
      },
    },
    {
      title: '配置名称',
      key: 'configmapName',
      width: 300,
      render: (_, r) => {
        return r.objectMeta.name;
      },
    },
    {
      title: '标签信息',
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
      title: '分发策略',
      key: 'propagationPolicies',
      render: (_, r) => {
        const pp = extractPropagationPolicy(r);
        return pp ? <Tag>{pp}</Tag> : '-';
      },
    },
    {
      title: '覆盖策略',
      key: 'overridePolicies',
      width: 150,
      render: () => {
        return '-';
      },
    },
    {
      title: '操作',
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
              查看
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
              编辑
            </Button>

            <Popconfirm
              placement="topRight"
              title={`确认要删除${r.objectMeta.name}配置么`}
              onConfirm={() => {
                onDeleteConfigMapContent(r);
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
