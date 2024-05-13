import Panel from '@/components/panel';
import {useQuery} from "@tanstack/react-query";
import {GetClusters} from '@/services';
import type {Cluster} from '@/services/cluster'
import {Badge, Tag, Table, TableColumnProps, Progress, Space, Button, Input} from 'antd'
import {Icons} from '@/components/icons'
import NewClusterModal from './new-cluster-modal';

function getPercentColor(v: number): string {
    // 0~60 #52C41A
    // 60~80 #FAAD14
    // > 80 #F5222D
    if (v <= 60) {
        return '#52C41A'
    } else if (v <= 80) {
        return '#FAAD14'
    } else {
        return '#F5222D'
    }
}

const ClusterManagePage = () => {
    const {data, isLoading} = useQuery({
        queryKey: ['GetClusters'],
        queryFn: async () => {
            const clusters = await GetClusters()
            return clusters.data
        }
    })
    const columns: TableColumnProps<Cluster>[] = [
        {
            title: '集群名称',
            key: 'clusterName',
            width: 150,
            render: (_, r) => {
                r.ready
                return r.objectMeta.name
            }
        },
        {
            title: 'kubernetes版本',
            dataIndex: 'kubernetesVersion',
            key: 'kubernetesVersion',
            width: 150,
            align: 'center'
        },
        {
            title: '集群状态',
            dataIndex: 'ready',
            key: 'ready',
            align: 'center',
            width: 150,
            render: (v) => {
                if (v) {
                    return <Badge color={'green'} text={<span style={{color: '#52c41a'}}>ready</span>}/>
                } else {
                    return <Badge color={'red'} text={<span style={{color: '#f5222d'}}>not ready</span>}/>
                }
            }
        },
        {
            title: '模式',
            dataIndex: 'syncMode',
            width: 150,
            align: 'center',
            render: (v) => {
                if (v === 'Push') {
                    return <Tag color={'gold'}>{v}</Tag>
                } else {
                    return <Tag color={'blue'}>{v}</Tag>
                }
            }
        },
        {
            title: '节点状态',
            dataIndex: "nodeStatus",
            align: 'center',
            width: 150,
            render: (_, r) => {
                if (r.nodeSummary) {
                    const {totalNum, readyNum} = r.nodeSummary
                    return <>{readyNum}/{totalNum}</>
                }
                return '-'
            }
        },
        {
            title: 'cpu用量',
            dataIndex: 'cpuFraction',
            width: '15%',
            render: (_, r) => {
                const fraction = parseFloat(r.allocatedResources.cpuFraction.toFixed(2))
                return <Progress percent={fraction} strokeColor={getPercentColor(fraction)}/>
            }
        },
        {
            title: 'memory用量',
            dataIndex: 'memoryFraction',
            width: '15%',
            render: (_, r) => {
                const fraction = parseFloat(r.allocatedResources.memoryFraction.toFixed(2))
                return <Progress percent={fraction} strokeColor={getPercentColor(fraction)}/>
            }
        },
        {
            title: '操作',
            key: 'op',
            width: 200,
            render: () => {
                return <Space.Compact>
                    <Button size={'small'} type='link'>查看</Button>
                    <Button size={'small'} type='link'>编辑</Button>
                    <Button size={'small'} type='link' danger>删除</Button>
                </Space.Compact>
            }
        }
    ]
    return <Panel>
        <div className={'flex flex-row justify-between mb-4'}>
            <Input.Search placeholder={'按集群名称搜索'} className={'w-[400px]'}/>
            <Button
                type={'primary'}
                icon={<Icons.add width={16} height={16}/>}
                className="flex flex-row items-center"
            >
                新增集群
            </Button>
        </div>
        <Table
            rowKey={(r: Cluster) => r.objectMeta.name || ''}
            columns={columns}
            loading={isLoading}
            dataSource={data?.clusters || []}
        />
        <NewClusterModal/>
    </Panel>
}

export default ClusterManagePage;