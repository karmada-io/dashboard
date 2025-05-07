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

import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { 
  Card, 
  Col, 
  Descriptions, 
  DescriptionsProps, 
  Empty, 
  Progress, 
  Row, 
  Spin, 
  Statistic, 
  Tag 
} from 'antd';
import i18nInstance from '@/utils/i18n';
import Panel from '@/components/panel';
import { GetClusters } from '@/services';
import { GetClusterDetail } from '@/services/cluster';
import dayjs from 'dayjs';

// 与 Overview 组件中相同的颜色计算函数
const getPercentColor = (v: number): string => {
  if (v <= 60) {
    return '#52C41A';
  } else if (v <= 80) {
    return '#FAAD14';
  } else {
    return '#F5222D';
  }
};

const ClusterOverview = () => {
  const { clusterName } = useParams<{ clusterName: string }>();
  const navigate = useNavigate();
  const [selectedCluster, setSelectedCluster] = useState<string | null>(null);

  // 获取所有集群列表
  const { data: clusterData, isLoading: isClusterLoading } = useQuery({
    queryKey: ['GetAllClusters'],
    queryFn: async () => {
      const ret = await GetClusters();
      return ret.data;
    },
  });

  // 获取特定集群详情
  const { data: clusterDetail, isLoading: isDetailLoading } = useQuery({
    queryKey: ['GetClusterDetail', selectedCluster],
    queryFn: async () => {
      if (!selectedCluster) return null;
      const ret = await GetClusterDetail(selectedCluster);
      return ret.data;
    },
    enabled: !!selectedCluster,
  });

  // 处理集群参数
  useEffect(() => {
    if (isClusterLoading || !clusterData || !clusterData.clusters) return;
    
    // 如果没有集群数据
    if (clusterData.clusters.length === 0) {
      setSelectedCluster(null);
      return;
    }
    
    // 字面上的 :clusterName 或空参数，显示第一个集群
    if (!clusterName || clusterName === ':clusterName') {
      const firstCluster = clusterData.clusters[0].objectMeta.name;
      setSelectedCluster(firstCluster);
      // 重定向到实际集群URL
      navigate(`/cluster-manage/${firstCluster}/overview`, { replace: true });
      return;
    }
    
    // 检查请求的集群是否存在
    const clusterExists = clusterData.clusters.some(
      c => c.objectMeta.name === clusterName
    );
    
    if (clusterExists) {
      setSelectedCluster(clusterName);
    } else {
      // 集群不存在，使用第一个
      const firstCluster = clusterData.clusters[0].objectMeta.name;
      setSelectedCluster(firstCluster);
      // 重定向到实际集群URL
      navigate(`/cluster-manage/${firstCluster}/overview`, { replace: true });
    }
  }, [clusterName, clusterData, isClusterLoading, navigate]);

  // 找到当前选择的集群
  const currentCluster = clusterData?.clusters?.find(
    c => c.objectMeta.name === selectedCluster
  );

  // 基本信息描述项
  const basicItems: DescriptionsProps['items'] = [
    {
      key: 'cluster-name',
      label: i18nInstance.t('c3f28b34bbdec501802fa403584267e6', '集群名称'),
      children: currentCluster?.objectMeta.name || '-',
    },
    {
      key: 'kubernetes-version',
      label: i18nInstance.t('bd17297989ec345cbc03ae0b8a13dc0a', 'Kubernetes版本'),
      children: currentCluster?.kubernetesVersion || '-',
    },
    {
      key: 'sync-mode',
      label: i18nInstance.t('f0789e79d48f135e5d870753f7a85d05', '同步模式'),
      children: currentCluster ? (
        <Tag color={currentCluster.syncMode === 'Push' ? 'gold' : 'blue'}>
          {currentCluster.syncMode}
        </Tag>
      ) : '-',
    },
    {
      key: 'cluster-status',
      label: i18nInstance.t('ee00813361387a116d274c608ba8bb13', '集群状态'),
      children: currentCluster ? (
        <Tag color={currentCluster.ready ? 'success' : 'error'}>
          {currentCluster.ready 
            ? i18nInstance.t('96a27a13837269f929bbf3f449984ad9', '已就绪') 
            : i18nInstance.t('5e742e851d1f58f97ea0ccedee59d0a0', '未就绪')}
        </Tag>
      ) : '-',
    },
    {
      key: 'creation-time',
      label: i18nInstance.t('eca37cb0726c51702f70c486c1c38cf3', '创建时间'),
      children: currentCluster?.objectMeta.creationTimestamp 
        ? dayjs(currentCluster.objectMeta.creationTimestamp).format('YYYY-MM-DD HH:mm:ss')
        : '-',
    },
  ];

  // 资源统计描述项 - 根据可用数据调整
  const resourceItems: DescriptionsProps['items'] = [
    {
      key: 'node-status',
      label: i18nInstance.t('b86224e030e5948f96b70a4c3600b33f', '节点状态'),
      children: currentCluster?.nodeSummary 
        ? `${currentCluster.nodeSummary.readyNum}/${currentCluster.nodeSummary.totalNum}`
        : '-',
    },
    {
      key: 'pod-status',
      label: i18nInstance.t('f3a5da7a5dc22b3ee3c1aaa17bc47e8b', 'Pod状态'),
      children: currentCluster?.allocatedResources 
        ? `${currentCluster.allocatedResources.allocatedPods}/${currentCluster.allocatedResources.podCapacity} (${currentCluster.allocatedResources.podFraction.toFixed(2)}%)`
        : '-',
    },
    {
      key: 'taints',
      label: i18nInstance.t('b48b95ef13ecb71a28d900367a8c12ab', '污点'),
      children: clusterDetail?.taints && clusterDetail.taints.length > 0
        ? clusterDetail.taints.map((taint, index) => (
            <Tag key={`taint-${taint.key}-${taint.value}-${taint.effect}-${index}`} color="orange">
              {`${taint.key}=${taint.value}:${taint.effect}`}
            </Tag>
          ))
        : '-',
    },
  ];

  // 如果没有集群数据
  if (!isClusterLoading && (!clusterData?.clusters || clusterData.clusters.length === 0)) {
    return (
      <Panel>
        <Empty
          image={Empty.PRESENTED_IMAGE_SIMPLE}
          description={i18nInstance.t('f69618f8da7e328ff3c7af3cfcbd3578', '没有可用的成员集群')}
        />
      </Panel>
    );
  }

  return (
    <Panel>
      <Spin spinning={isClusterLoading || isDetailLoading}>
        {!selectedCluster ? (
          <Empty
            image={Empty.PRESENTED_IMAGE_SIMPLE}
            description={i18nInstance.t('f69618f8da7e328ff3c7af3cfcbd3578', '没有可用的成员集群')}
          />
        ) : (
          <>
            <div className="mb-8">
              <h2 className="text-lg font-medium mb-4">
                {i18nInstance.t('cf8a7f2456d7e99df632e6c081ca8a96', '基本信息')}
              </h2>
              <Descriptions
                bordered
                size={'middle'}
                items={basicItems}
                column={{xs: 1, sm: 2, md: 3}}
                layout={'horizontal'}
              />
            </div>

            <div className="mb-8">
              <h2 className="text-lg font-medium mb-4">
                {i18nInstance.t('1f3ad14abef7d52e60324c174da27ca2', '资源信息')}
              </h2>
              <Descriptions
                bordered
                size={'middle'}
                items={resourceItems}
                column={{xs: 1, sm: 2, md: 3}}
                layout={'horizontal'}
              />
            </div>

            <div className="mb-8">
              <h2 className="text-lg font-medium mb-4">
                {i18nInstance.t('11a9ed4dafabf15276f2274047febb95', '资源使用情况')}
              </h2>
              <Row gutter={[16, 16]}>
                <Col xs={24} sm={12}>
                  <Card title={i18nInstance.t('763a78a5fc84dbca6f0137a591587f5f', 'CPU用量')}>
                    {currentCluster ? (
                      <>
                        <Statistic
                          title={i18nInstance.t('8c440aada7c2fcf3cad2066e2b293a0a', '使用率')}
                          value={parseFloat(currentCluster.allocatedResources.cpuFraction.toFixed(2))}
                          suffix="%"
                          precision={2}
                        />
                        <div className="mt-4">
                          <Progress
                            percent={parseFloat(currentCluster.allocatedResources.cpuFraction.toFixed(2))}
                            strokeColor={getPercentColor(parseFloat(currentCluster.allocatedResources.cpuFraction.toFixed(2)))}
                          />
                        </div>
                        <div className="flex justify-between text-sm text-gray-500 mt-2">
                          <span>{i18nInstance.t('a5b8a1ef2e7f3a90a56875acb8cce86f', '总容量')}: {currentCluster.allocatedResources.cpuCapacity}</span>
                        </div>
                      </>
                    ) : '-'}
                  </Card>
                </Col>
                <Col xs={24} sm={12}>
                  <Card title={i18nInstance.t('8b2e672e8b847415a47cc2dd25a87a07', 'Memory用量')}>
                    {currentCluster ? (
                      <>
                        <Statistic
                          title={i18nInstance.t('8c440aada7c2fcf3cad2066e2b293a0a', '使用率')}
                          value={parseFloat(currentCluster.allocatedResources.memoryFraction.toFixed(2))}
                          suffix="%"
                          precision={2}
                        />
                        <div className="mt-4">
                          <Progress
                            percent={parseFloat(currentCluster.allocatedResources.memoryFraction.toFixed(2))}
                            strokeColor={getPercentColor(parseFloat(currentCluster.allocatedResources.memoryFraction.toFixed(2)))}
                          />
                        </div>
                        <div className="flex justify-between text-sm text-gray-500 mt-2">
                          <span>{i18nInstance.t('a5b8a1ef2e7f3a90a56875acb8cce86f', '总容量')}: {currentCluster.allocatedResources.memoryCapacity}</span>
                        </div>
                      </>
                    ) : '-'}
                  </Card>
                </Col>
              </Row>
            </div>
          </>
        )}
      </Spin>
    </Panel>
  );
};

export default ClusterOverview; 