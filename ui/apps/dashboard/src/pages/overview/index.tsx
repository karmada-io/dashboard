import i18nInstance from '@/utils/i18n';
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
      label: i18nInstance.t('66e8579fa53a0cdf402e882a3574a380'),
      children: data?.karmadaInfo.version.gitVersion || '-',
    },
    {
      key: 'karmada-status',
      label: i18nInstance.t('3fea7ca76cdece641436d7ab0d02ab1b'),
      children:
        data?.karmadaInfo.status === 'running' ? (
          <Badge
            color={'green'}
            text={i18nInstance.t('d679aea3aae1201e38c4baaaeef86efe')}
          />
        ) : (
          <Badge
            color={'red'}
            text={i18nInstance.t('903b25f64e1c0d9b7f56ed80c256a2e7')}
          />
        ),
    },
    {
      key: 'karmada-createtime',
      label: i18nInstance.t('eca37cb0726c51702f70c486c1c38cf3'),
      children:
        (data?.karmadaInfo.createTime &&
          dayjs(data?.karmadaInfo.createTime).format('YYYY-MM-DD HH:mm:ss')) ||
        '-',
    },
    {
      key: 'cluster-info',
      label: i18nInstance.t('a0d6cb39b547d45a530a3308dce79c86'),
      children: (
        <>
          <div>
            <span>{i18nInstance.t('6860e13ac48e930f8076ebfe37176b78')}</span>
            <span>
              {data?.memberClusterStatus.nodeSummary.readyNum}/
              {data?.memberClusterStatus.nodeSummary.totalNum}
            </span>
          </div>
          <div>
            <span>{i18nInstance.t('a1dacced95ddca3603110bdb1ae46af1')}</span>
            <span>
              {data?.memberClusterStatus.cpuSummary.allocatedCPU &&
                data?.memberClusterStatus.cpuSummary.allocatedCPU.toFixed(2)}
              /{data?.memberClusterStatus.cpuSummary.totalCPU}
            </span>
          </div>
          <div>
            <span>{i18nInstance.t('5eaa09de6e55b322fcc299f641d73ce7')}</span>
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
            <span>{i18nInstance.t('820c4003e23553b3124f1608916d5282')}</span>
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
      label: i18nInstance.t('85c6051762df2fe8f93ebc1083b7f6a4'),
      children: (
        <div className="flex flex-row space-x-4">
          <Statistic
            title={i18nInstance.t('a95abe7b8eeb55427547e764bf39f1c4')}
            value={data?.clusterResourceStatus.propagationPolicyNum}
          />

          <Statistic
            title={i18nInstance.t('0a7e9443c41575378d2db1e288d3f1cb')}
            value={data?.clusterResourceStatus.overridePolicyNum}
          />
        </div>
      ),

      span: 3,
    },
    {
      key: 'multicloud-resources-info',
      label: i18nInstance.t('612af712ef5ed7868a6b2f1d3d68530c'),
      children: (
        <div className="flex flex-row space-x-4">
          <Statistic
            title={i18nInstance.t('1200778cf86309309154ef88804fa22e')}
            value={data?.clusterResourceStatus.namespaceNum}
          />

          <Statistic
            title={i18nInstance.t('3692cf6a2e079d34e7e5035aa98b1335')}
            value={data?.clusterResourceStatus.workloadNum}
          />

          <Statistic
            title={i18nInstance.t('2030a6e845ad6476fecbc1711c9f139d')}
            value={data?.clusterResourceStatus.serviceNum}
          />

          <Statistic
            title={i18nInstance.t('0287028ec7eefa1333b56ee340d325a0')}
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
        title={i18nInstance.t('9e5ffa068ed435ced73dc9bf5dd8e09c')}
        bordered
        items={basicItems}
      />

      <Descriptions
        className={'mt-8'}
        title={i18nInstance.t('ba584c3d8a7e637efe00449e0c93900c')}
        bordered
        items={resourceItems}
        labelStyle={{ width: '150px' }}
      />
    </Panel>
  );
};

export default Overview;
