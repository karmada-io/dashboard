import Panel from '@/components/panel'
import {Badge, Descriptions, DescriptionsProps, Statistic} from 'antd'

const Overview = () => {
    const basicItems: DescriptionsProps['items'] = [
        {
            key: 'karmada-version',
            label: 'Karmada版本',
            children: '1.9.0',
        },
        {
            key: 'karmada-status',
            label: '状态',
            children: <Badge color={'green'} text={'运行中'}/>,
        },
        {
            key: 'karmada-createtime',
            label: '创建时间',
            children: '2024-01-01',
        },
        {
            key: 'cluster-info',
            label: '工作集群信息',
            children: (
                <>
                    <div>
                        <span>节点数量：</span>
                        <span>20/20</span>
                    </div>
                    <div>
                        <span>CPU使用情况：</span>
                        <span>10000m/20000m</span>
                    </div>
                    <div>
                        <span>Memory使用情况：</span>
                        <span>50GiB/500GiB</span>
                    </div>
                    <div>
                        <span>Pod分配情况：</span>
                        <span>300/1000</span>
                    </div>
                </>

            ),
            span: 3
        },
    ]
    const resourceItems: DescriptionsProps['items'] = [
        {
            key: 'policy-info',
            label: '策略信息',
            children: <div className='flex flex-row space-x-4'>
                <Statistic title="调度策略" value={3}/>
                <Statistic title="差异化策略" value={1}/>
            </div>,
            span: 3
        },
        {
            key: 'multicloud-resources-info',
            label: '多云资源信息',
            children: <div className='flex flex-row space-x-4'>
                <Statistic title="多云命名空间" value={12}/>
                <Statistic title="多云工作负载" value={100}/>
                <Statistic title="多云服务与路由" value={200}/>
                <Statistic title="多云配置与秘钥" value={300}/>
            </div>,
            span: 3
        },
    ]
    return <Panel>
        <Descriptions
            className={'mt-8'}
            title="基本信息"
            bordered
            items={basicItems}
        />
        <Descriptions
            className={'mt-8'}
            title="资源信息"
            bordered
            items={resourceItems}
            labelStyle={{width: '150px'}}
        />
    </Panel>
}

export default Overview;