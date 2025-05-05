/*
Copyright 2024 The Karmada Authors.

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

    http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
*/

import i18nInstance from '@/utils/i18n';
import Panel from '@/components/panel';
import { Badge, Card, Col, Descriptions, DescriptionsProps, Progress, Row, Spin, Statistic, Tag } from 'antd';
import { useQuery } from '@tanstack/react-query';
import { GetClusters } from '@/services';
import { GetOverview } from '@/services/overview.ts';
import dayjs from 'dayjs';
import { Icons } from '@/components/icons';

const getPercentColor = (v: number): string => {
  // 0~60 #52C41A
  // 60~80 #FAAD14
  // > 80 #F5222D
  if (v <= 60) {
    return '#52C41A';
  } else if (v <= 80) {
    return '#FAAD14';
  } else {
    return '#F5222D';
  }
};

const Overview = () => {
  const { data, isLoading } = useQuery({
    queryKey: ['GetOverview'],
    queryFn: async () => {
      const ret = await GetOverview();
      return ret.data;
    },
  });

  const { data: clusterData, isLoading: isClusterLoading } = useQuery({
    queryKey: ['GetClusters'],
    queryFn: async () => {
      const ret = await GetClusters();
      return ret.data;
    },
  });

  const basicItems: DescriptionsProps['items'] = [
    {
      key: 'karmada-version',
      label: i18nInstance.t('66e8579fa53a0cdf402e882a3574a380', 'Karmada版本'),
      children: data?.karmadaInfo.version.gitVersion || '-',
    },
    {
      key: 'karmada-status',
      label: i18nInstance.t('3fea7ca76cdece641436d7ab0d02ab1b', '状态'),
      children:
        data?.karmadaInfo.status === 'running' ? (
          <Badge
            color={'green'}
            text={i18nInstance.t('d679aea3aae1201e38c4baaaeef86efe', '运行中')}
          />
        ) : (
          <Badge
            color={'red'}
            text={i18nInstance.t(
              '903b25f64e1c0d9b7f56ed80c256a2e7',
              '未知状态',
            )}
          />
        ),
    },
    {
      key: 'karmada-create-time',
      label: i18nInstance.t('eca37cb0726c51702f70c486c1c38cf3', '创建时间'),
      children:
        (data?.karmadaInfo.createTime &&
          dayjs(data?.karmadaInfo.createTime).format('YYYY-MM-DD HH:mm:ss')) ||
        '-',
    },
  ];

  const resourceItems: DescriptionsProps['items'] = [
    {
      key: 'policy-info',
      label: i18nInstance.t('85c6051762df2fe8f93ebc1083b7f6a4', '策略信息'),
      children: (
        <div className="flex flex-row space-x-4">
          <Statistic
            title={i18nInstance.t(
              'a95abe7b8eeb55427547e764bf39f1c4',
              '调度策略',
            )}
            value={data?.clusterResourceStatus.propagationPolicyNum}
          />

          <Statistic
            title={i18nInstance.t(
              '0a7e9443c41575378d2db1e288d3f1cb',
              '差异化策略',
            )}
            value={data?.clusterResourceStatus.overridePolicyNum}
          />
        </div>
      ),

      span: 3,
    },
    {
      key: 'resource-info',
      label: i18nInstance.t('1f3ad14abef7d52e60324c174da27ca2', '资源信息'),
      children: (
        <div className="flex flex-row space-x-4">
          <Statistic
            title={i18nInstance.t(
              '06ff2e9eba7ae422587c6536e337395f',
              '命名空间',
            )}
            value={data?.clusterResourceStatus.namespaceNum}
          />

          <Statistic
            title={i18nInstance.t(
              '1e02cae704efe124f1a6f1f8b112fd52',
              '工作负载',
            )}
            value={data?.clusterResourceStatus.workloadNum}
          />

          <Statistic
            title={i18nInstance.t(
              '61d4e9d7e94ce41f7697aab2bbe1ae4e',
              '服务与路由',
            )}
            value={data?.clusterResourceStatus.serviceNum}
          />

          <Statistic
            title={i18nInstance.t(
              '9f1f65c8c39bb0afe83f8f1d6e93bfe4',
              '配置与存储',
            )}
            value={data?.clusterResourceStatus.configNum}
          />
        </div>
      ),
      span: 3,
    },
  ];

  const mcResourceInfoItems: DescriptionsProps['items'] = [
    {
      key: 'ns',
      label: i18nInstance.t('5b4e3f2c5bf82e61e046bc883222bb47', '多云命名空间'),
      children: (
        <Statistic
          value={data?.clusterResourceStatus.namespaceNum}
          valueStyle={{ color: '#3f8600' }}
        />
      ),
    },
    {
      key: 'workload-num',
      label: i18nInstance.t('b1a8c384b64e1b7b15d33b93099fe148', '多云工作负载'),
      children: (
        <Statistic
          value={data?.clusterResourceStatus.workloadNum}
          valueStyle={{ color: '#3f8600' }}
        />
      ),
    },
    {
      key: 'service-num',
      label: i18nInstance.t(
        '35af2c02bbc5119edaedc6dde9c63f82',
        '多云服务与路由',
      ),
      children: (
        <Statistic
          value={data?.clusterResourceStatus.serviceNum}
          valueStyle={{ color: '#3f8600' }}
        />
      ),
    },
    {
      key: 'config-num',
      label: i18nInstance.t(
        'f14178f2f0cfd9a887abb5ef87a5bc9b',
        '多云配置与存储',
      ),
      children: (
        <Statistic
          value={data?.clusterResourceStatus.configNum}
          valueStyle={{ color: '#3f8600' }}
        />
      ),
    },
  ];

  return (
    <Panel>
      <div className="mb-8">
        <h2 className="text-lg font-medium mb-4">
          {i18nInstance.t('cf8a7f2456d7e99df632e6c081ca8a96', '基本信息')}
        </h2>
        <Descriptions
          bordered
          size={'middle'}
          items={basicItems}
          column={3}
          layout={'horizontal'}
        />
      </div>
      
      <div className="mb-8">
        <h2 className="text-lg font-medium mb-4">
          {i18nInstance.t('c1dc33b7b4649e28f142c6e609ee6c9c', 'Kubernetes 集群列表')}
        </h2>
        <Spin spinning={isClusterLoading}>
          <Row gutter={[16, 16]}>
            {clusterData?.clusters?.map((cluster) => (
              <Col xs={24} sm={12} md={8} lg={8} xl={6} key={cluster.objectMeta.name}>
                <Card 
                  hoverable 
                  className="h-full" 
                  title={
                    <div className="flex items-center">
                      <div className="flex items-center justify-center w-10 h-10 bg-blue-50 rounded-full mr-3">
                        <Icons.clusters width={24} height={24} />
                      </div>
                      <span className="font-medium">{cluster.objectMeta.name}</span>
                    </div>
                  }
                >
                  <div className="mb-2 pb-2 border-b border-gray-100">
                    <div className="text-xs text-gray-500 mb-1">
                      {cluster.objectMeta.creationTimestamp && 
                        `${i18nInstance.t('b55ea36e7cb0ca40c0d9ec5f40b4a80d', '已创建')} ${dayjs().diff(dayjs(cluster.objectMeta.creationTimestamp), 'year') > 0 ? `${dayjs().diff(dayjs(cluster.objectMeta.creationTimestamp), 'year')} ${i18nInstance.t('93cf1ebc3a9ae31bac4600e9e5b9a14a', '年')}` : `${dayjs().diff(dayjs(cluster.objectMeta.creationTimestamp), 'day')} ${i18nInstance.t('b0daf2a2d14aabfaa8f505a8b8d204b3', '天')}`}`
                      }
                    </div>
                    <div className="text-base font-medium">
                      {cluster.kubernetesVersion}
                    </div>
                  </div>
                  
                  <div className="mb-2">
                    <Tag color={cluster.ready ? "success" : "error"} className="mb-2">
                      {cluster.ready ? i18nInstance.t('96a27a13837269f929bbf3f449984ad9', '已就绪') : i18nInstance.t('5e742e851d1f58f97ea0ccedee59d0a0', '未就绪')}
                    </Tag>
                    <Tag color={cluster.syncMode === 'Push' ? "gold" : "blue"}>
                      {cluster.syncMode}
                    </Tag>
                  </div>
                  
                  <div className="mb-1 flex justify-between">
                    <span className="text-sm text-gray-600">{i18nInstance.t('b86224e030e5948f96b70a4c3600b33f', '节点状态')}</span>
                    <span className="text-sm font-medium">
                      {cluster.nodeSummary ? `${cluster.nodeSummary.readyNum}/${cluster.nodeSummary.totalNum}` : '-'}
                    </span>
                  </div>
                  
                  <div className="mb-3">
                    <div className="mb-1 flex justify-between">
                      <span className="text-sm text-gray-600">CPU</span>
                      <span className="text-sm">{`${parseFloat(cluster.allocatedResources.cpuFraction.toFixed(2))}%`}</span>
                    </div>
                    <Progress 
                      percent={parseFloat(cluster.allocatedResources.cpuFraction.toFixed(2))} 
                      strokeColor={getPercentColor(parseFloat(cluster.allocatedResources.cpuFraction.toFixed(2)))}
                      showInfo={false}
                      size="small"
                    />
                  </div>
                  
                  <div>
                    <div className="mb-1 flex justify-between">
                      <span className="text-sm text-gray-600">Memory</span>
                      <span className="text-sm">{`${parseFloat(cluster.allocatedResources.memoryFraction.toFixed(2))}%`}</span>
                    </div>
                    <Progress 
                      percent={parseFloat(cluster.allocatedResources.memoryFraction.toFixed(2))} 
                      strokeColor={getPercentColor(parseFloat(cluster.allocatedResources.memoryFraction.toFixed(2)))}
                      showInfo={false}
                      size="small"
                    />
                  </div>
                </Card>
              </Col>
            ))}
          </Row>
        </Spin>
      </div>

      <div className="mb-8">
        <h2 className="text-lg font-medium mb-4">
          {i18nInstance.t('1f3ad14abef7d52e60324c174da27ca2', '资源信息')}
        </h2>
        <Descriptions
          bordered
          size={'middle'}
          items={resourceItems}
          column={3}
          layout={'horizontal'}
        />
      </div>

      <h2 className="text-lg font-medium mb-4">
        {i18nInstance.t('16a0936770e82ce9a7f0c07f663c85fd', '多云资源信息')}
      </h2>
      <Descriptions
        bordered
        size={'middle'}
        items={mcResourceInfoItems}
        column={4}
        layout={'horizontal'}
      />
    </Panel>
  );
};

export default Overview;
