import { Button, Popconfirm, Space, Table, TableColumnProps, Tag } from 'antd';
import { extractPropagationPolicy } from '@/services/base';
import TagList from '@/components/tag-list';
import { FC } from 'react';
import { useQuery } from '@tanstack/react-query';
import { GetResource } from '@/services/unstructured.ts';
import { Config, GetSecrets, Secret } from '@/services/config.ts';

interface SecretTableProps {
  labelTagNum?: number;
  selectedWorkSpace: string;
  searchText: string;
  onViewSecret: (r: any) => void;
  onEditSecret: (r: Secret) => void;
  onDeleteSecretContent: (r: Secret) => void;
}

const SecretTable: FC<SecretTableProps> = (props) => {
  const {
    labelTagNum,
    selectedWorkSpace,
    searchText,
    onViewSecret,
    onEditSecret,
    onDeleteSecretContent,
  } = props;
  const { data, isLoading } = useQuery({
    queryKey: ['GetSecrets', selectedWorkSpace, searchText],
    queryFn: async () => {
      const services = await GetSecrets({
        namespace: selectedWorkSpace,
        keyword: searchText,
      });
      return services.data || {};
    },
  });
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
      title: '秘钥名称',
      key: 'secretName',
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
                onViewSecret(ret?.data);
              }}
            >
              查看
            </Button>
            <Button
              size={'small'}
              type="link"
              onClick={() => {
                onEditSecret(r);
              }}
            >
              编辑
            </Button>

            <Popconfirm
              placement="topRight"
              title={`确认要删除${r.objectMeta.name}秘钥么`}
              onConfirm={() => {
                onDeleteSecretContent(r);
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

  return (
    <Table
      rowKey={(r: Config) =>
        `${r.objectMeta.namespace}-${r.objectMeta.name}` || ''
      }
      columns={columns}
      loading={isLoading}
      dataSource={data?.secrets || []}
    />
  );
};

export default SecretTable;
