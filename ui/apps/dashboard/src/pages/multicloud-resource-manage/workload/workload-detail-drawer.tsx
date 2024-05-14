import {FC, useMemo} from 'react';
import {Drawer, Card, Statistic, Tag, Table, TableColumnProps, Typography} from 'antd';
import {GetWorkloadDetail, GetWorkloadEvents, WorkloadEvent} from "@/services/workload.ts";
import {useQuery} from "@tanstack/react-query";
import dayjs from "dayjs";
import styles from './index.module.less'

export interface WorkloadDetailDrawerProps {
    open: boolean;
    kind: string;
    namespace: string;
    name: string;
    onClose: () => void
}

const WorkloadDetailDrawer: FC<WorkloadDetailDrawerProps> = (props) => {
    const {open, kind, namespace, name,onClose} = props;
    const enableFetch = useMemo(() => {
        return !!(kind && name && namespace)
    }, [kind, name, namespace]);
    const {data: detailData, isLoading: isDetailDataLoading} = useQuery({
        queryKey: ['GetWorkloadDetail', kind, name, name],
        queryFn: async () => {
            const workloadDetailRet = await GetWorkloadDetail({
                namespace, name
            })
            return workloadDetailRet.data || {}
        },
        enabled: enableFetch
    })
    const {data: eventsData} = useQuery({
        queryKey: ['GetWorkloadEvents', kind, name, name],
        queryFn: async () => {
            const workloadEventsRet = await GetWorkloadEvents({
                namespace, name
            })
            return workloadEventsRet.data || {}
        },
        enabled: enableFetch
    })
    const columns: TableColumnProps<WorkloadEvent>[] = [
        {
            title: '类别',
            key: 'type',
            dataIndex: 'type',
        },
        {
            title: '来源',
            key: 'sourceComponent',
            dataIndex: 'sourceComponent',
        },
        {
            title: '最后检测时间',
            key: 'lastSeen',
            dataIndex: 'lastSeen',
        },
        {
            title: '原因',
            key: 'reason',
            dataIndex: 'reason',
        },
        {
            title: '信息',
            key: 'message',
            dataIndex: 'message',
        },
    ]
    return <Drawer
        title="工作负载详情"
        placement="right"
        open={open}
        width={800}
        loading={isDetailDataLoading}
        onClose={onClose}
    >
        <Card title={'基本信息'} bordered>
            <div className='flex flex-row space-x-4 mb-4'>
                <Statistic title='名称' value={detailData?.objectMeta?.name || '-'}/>
                <Statistic title='命名空间' value={detailData?.objectMeta?.namespace || '-'}/>
                {/*'2024-01-01'*/}
                <Statistic
                    title='创建时间'
                    value={
                        detailData?.objectMeta?.creationTimestamp ?
                            dayjs(detailData?.objectMeta?.creationTimestamp).format('YYYY-MM-DD') :
                            '-'
                    }
                />
                <Statistic
                    title='持续时间'
                    value='2h'
                />
                <Statistic
                    className={styles['no-value']}
                    title='资源UID'
                    prefix={
                        <Typography.Text ellipsis={{tooltip: detailData?.objectMeta?.uid || '-'}}
                                         className={'w-[260px]'}>
                            {detailData?.objectMeta?.uid || '-'}
                        </Typography.Text>
                    }
                />
            </div>

            <div className='mb-4'>
                <div className='text-base text-gray-500 mb-2'>标签</div>
                <div>
                    <Tag>k8s-app:vpc-nginx</Tag>
                    <Tag>app:vpc-nginx</Tag>
                    <Tag>controlled-by:helm-client</Tag>
                </div>
            </div>
            <div>
                <div className='text-base text-gray-500 mb-2'>注解</div>
                <div>
                    <Tag>deployment.kubernetes.io/revision:2</Tag>
                    <Tag>kubectl.kubernetes.io/last-applied-configuration</Tag>
                </div>
            </div>
        </Card>
        <Card title={'调度信息'} bordered className={styles['schedule-container']}>
            <Table
                columns={columns}
                pagination={false}
                dataSource={eventsData?.events || []}
            />
        </Card>
    </Drawer>
}

export default WorkloadDetailDrawer;