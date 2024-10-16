import {Button, Popconfirm, Space, Table, TableColumnProps, Tag} from "antd";
import {extractPropagationPolicy, GetServices, Service} from "@/services/service.ts";
import i18nInstance from "@/utils/i18n.tsx";
import TagList from "@/components/tag-list";
import {FC} from "react";
import {useQuery} from "@tanstack/react-query";
import {GetResource} from "@/services/unstructured.ts";

interface ServiceTableProps {
    labelTagNum?: number
    selectedWorkSpace: string;
    searchText: string;
    onViewServiceContent: (r:any) => void
    onDeleteServiceContent: (r:Service) => void
}

const ServiceTable: FC<ServiceTableProps> = (props) => {
    const {
        labelTagNum, selectedWorkSpace, searchText,
        onViewServiceContent, onDeleteServiceContent} = props
    const columns: TableColumnProps<Service>[] = [
        {
            title: i18nInstance.t('a4b28a416f0b6f3c215c51e79e517298'),
            key: 'namespaceName',
            width: 200,
            render: (_, r) => {
                return r.objectMeta.namespace;
            },
        },
        {
            title: '服务名称',
            key: 'servicename',
            width: 300,
            render: (_, r) => {
                return r.objectMeta.name;
            },
        },
        {
            title: i18nInstance.t('1f7be0a924280cd098db93c9d81ecccd'),
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
                return (
                    <TagList
                        tags={params}
                        maxLen={labelTagNum}
                    />
                );
            },
        },
        {
            title: i18nInstance.t('8a99082b2c32c843d2241e0ba60a3619'),
            key: 'propagationPolicies',
            render: (_, r) => {
                const pp = extractPropagationPolicy(r)
                return pp ? <Tag>{pp}</Tag>: '-';
            },
        },
        {
            title: i18nInstance.t('eaf8a02d1b16fcf94302927094af921f'),
            key: 'overridePolicies',
            width: 150,
            render: () => {
                return '-';
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
                                    kind: r.typeMeta.kind,
                                    name: r.objectMeta.name,
                                    namespace: r.objectMeta.namespace,
                                });
                                onViewServiceContent(ret?.data)
                            }}
                        >
                            {i18nInstance.t('607e7a4f377fa66b0b28ce318aab841f')}
                        </Button>
                        <Button
                            size={'small'}
                            type="link"
                            onClick={async () => {
                                onDeleteServiceContent(r)
                            }}
                        >
                            {i18nInstance.t('95b351c86267f3aedf89520959bce689')}
                        </Button>

                        <Popconfirm
                            placement="topRight"
                            title={`确认要删除${r.objectMeta.name}工作负载么`}
                            onConfirm={async () => {

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
    const {data, isLoading} = useQuery({
        queryKey: ['GetServices', selectedWorkSpace, searchText],
        queryFn: async () => {
            const services = await GetServices({
                namespace: selectedWorkSpace,
                keyword: searchText,
            });
            return services.data || {};
        },
    });
    return (
        <Table
            rowKey={(r: Service) => `${r.objectMeta.namespace}-${r.objectMeta.name}` || ''}
            columns={columns}
            loading={isLoading}
            dataSource={data?.services || []}
        />
    )
}

export default ServiceTable;