import Panel from '@/components/panel';
import { Badge, Descriptions, DescriptionsProps, Statistic } from 'antd';
import { useQuery } from '@tanstack/react-query';
import { GetOverview } from '@/services/overview.ts';
import dayjs from 'dayjs';

const Overview = () => {
  const { data } = useQuery({
    queryKey: ['GetOverview'],
    queryFn: async () => {
      const ret = await GetOverview();
      return ret.data;
    },
  });
  const basicItems: DescriptionsProps['items'] = [
    {
      key: 'karmada-version',
      label: 'Karmada版本',
      children: data?.karmadaInfo.version.gitVersion || '-',
    },
    {
      key: 'karmada-status',
      label: '状态',
      children:
        data?.karmadaInfo.status === 'running' ? (
          <Badge color={'green'} text={'运行中'} />
        ) : (
          <Badge color={'red'} text={'未知状态'} />
        ),
    },
    {
      key: 'karmada-createtime',
      label: '创建时间',
      children:
        (data?.karmadaInfo.createTime &&
          dayjs(data?.karmadaInfo.createTime).format('YYYY-MM-DD HH:mm:ss')) ||
        '-',
    },
    {
      key: 'cluster-info',
      label: '工作集群信息',
      children: (
        <>
          <div>
            <span>节点数量：</span>
            <span>
              {data?.memberClusterStatus.nodeSummary.readyNum}/
              {data?.memberClusterStatus.nodeSummary.totalNum}
            </span>
          </div>
          <div>
            <span>CPU使用情况：</span>
            <span>
              {data?.memberClusterStatus.cpuSummary.allocatedCPU &&
                data?.memberClusterStatus.cpuSummary.allocatedCPU.toFixed(2)}
              /{data?.memberClusterStatus.cpuSummary.totalCPU}
            </span>
          </div>
          <div>
            <span>Memory使用情况：</span>
            <span>
              {data?.memberClusterStatus?.memorySummary?.allocatedMemory &&
                (
                  data.memberClusterStatus.memorySummary.allocatedMemory /
                  8 /
                  1024 /
                  1024
                ).toFixed(2)}
              GiB /
              {data?.memberClusterStatus?.memorySummary?.totalMemory &&
                data.memberClusterStatus.memorySummary.totalMemory /
                  8 /
                  1024 /
                  1024}
              GiB
            </span>
          </div>
          <div>
            <span>Pod分配情况：</span>
            <span>
              {data?.memberClusterStatus?.podSummary?.allocatedPod}/
              {data?.memberClusterStatus?.podSummary?.totalPod}
            </span>
          </div>
        </>
      ),
      span: 3,
    },
  ];
  const resourceItems: DescriptionsProps['items'] = [
    {
      key: 'policy-info',
      label: '策略信息',
      children: (
        <div className="flex flex-row space-x-4">
          <Statistic
            title="调度策略"
            value={data?.clusterResourceStatus.propagationPolicyNum}
          />
          <Statistic
            title="差异化策略"
            value={data?.clusterResourceStatus.overridePolicyNum}
          />
        </div>
      ),
      span: 3,
    },
    {
      key: 'multicloud-resources-info',
      label: '多云资源信息',
      children: (
        <div className="flex flex-row space-x-4">
          <Statistic
            title="多云命名空间"
            value={data?.clusterResourceStatus.namespaceNum}
          />
          <Statistic
            title="多云工作负载"
            value={data?.clusterResourceStatus.workloadNum}
          />
          <Statistic
            title="多云服务与路由"
            value={data?.clusterResourceStatus.serviceNum}
          />
          <Statistic
            title="多云配置与秘钥"
            value={data?.clusterResourceStatus.configNum}
          />
        </div>
      ),
      span: 3,
    },
  ];
  return (
    <Panel>
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
        labelStyle={{ width: '150px' }}
      />
    </Panel>
  );
};

export default Overview;
