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
import { FC, useMemo } from 'react';
import {
  Drawer,
  Card,
  Statistic,
  Table,
  TableColumnProps,
  Typography,
  Row,
  Col,
  Divider,
  Badge,
  Space,
  Progress,
  Tag,
  Tooltip,
} from 'antd';
import {
  GetWorkloadDetail,
  GetWorkloadEvents,
  WorkloadEvent,
} from '@/services/workload.ts';
import { useQuery } from '@tanstack/react-query';
import dayjs from 'dayjs';
import styles from './index.module.less';
import { WorkloadKind } from '@/services/base.ts';
import { cn } from '@/utils/cn';
import TagList, { convertLabelToTags } from '@/components/tag-list';
import { calculateDuration } from '@/utils/time.ts';

export interface WorkloadDetailDrawerProps {
  open: boolean;
  kind: WorkloadKind;
  namespace: string;
  name: string;
  onClose: () => void;
}

const WorkloadDetailDrawer: FC<WorkloadDetailDrawerProps> = (props) => {
  const { open, kind, namespace, name, onClose } = props;
  const enableFetch = useMemo(() => {
    return !!(kind && name && namespace);
  }, [kind, name, namespace]);
  const { data: detailData, isLoading: isDetailDataLoading } = useQuery({
    queryKey: ['GetWorkloadDetail', kind, name, namespace],
    queryFn: async () => {
      const workloadDetailRet = await GetWorkloadDetail({
        namespace,
        name,
        kind,
      });
      return workloadDetailRet.data || {};
    },
    enabled: enableFetch,
  });
  const { data: eventsData } = useQuery({
    queryKey: ['GetWorkloadEvents', kind, name, namespace],
    queryFn: async () => {
      const workloadEventsRet = await GetWorkloadEvents({
        namespace,
        name,
        kind,
      });
      return workloadEventsRet.data || {};
    },
    enabled: enableFetch,
  });
  const columns: TableColumnProps<WorkloadEvent>[] = [
    {
      title: i18nInstance.t('383a6d166f8f60e16e726ccc9c483631', '类别'),
      key: 'type',
      dataIndex: 'type',
    },
    {
      title: i18nInstance.t('26ca20b161c33362d88eb0ba0bc90751', '来源'),
      key: 'sourceComponent',
      dataIndex: 'sourceComponent',
    },
    {
      title: i18nInstance.t('03663386e7d82f847634a6ee9111a32b', '最后检测时间'),
      key: 'lastSeen',
      dataIndex: 'lastSeen',
    },
    {
      title: i18nInstance.t('41dfb0bf6167ca035b93caf3e06d6c95', '原因'),
      key: 'reason',
      dataIndex: 'reason',
    },
    {
      title: i18nInstance.t('d8c7e04c8e2be23dd3b81a31db6e04f1', '信息'),
      key: 'message',
      dataIndex: 'message',
    },
  ];

  return (
    <Drawer
      title={i18nInstance.t('0af9d9af618327e912ac9f91bbe6a30f', '工作负载详情')}
      placement="right"
      open={open}
      width={1100}
      loading={isDetailDataLoading}
      onClose={onClose}
      styles={{
        body: {
          padding: '16px',
          backgroundColor: '#f0f2f5',
        },
      }}
    >
      <Card
        title={
          <Space>
            <span className="text-lg font-medium">
              {i18nInstance.t('9e5ffa068ed435ced73dc9bf5dd8e09c', '基本信息')}
            </span>
          </Space>
        }
        bordered
        className="mb-4 shadow-sm"
      >
        <Row gutter={[24, 16]}>
          <Col span={8}>
          <Statistic
              title={<div className="font-medium">{i18nInstance.t('d7ec2d3fea4756bc1642e0f10c180cf5', '名称')}</div>}
              value={detailData?.objectMeta?.name || '-'}
              valueStyle={{ fontSize: '16px', fontWeight: 'normal' }}
          />
          </Col>
          <Col span={8}>
          <Statistic
              title={<div className="font-medium">{i18nInstance.t('a4b28a416f0b6f3c215c51e79e517298', '命名空间')}</div>}
            value={detailData?.objectMeta?.namespace || '-'}
          />
          </Col>
          <Col span={8}>
          <Statistic
              title={<div className="font-medium">{i18nInstance.t('eca37cb0726c51702f70c486c1c38cf3', '创建时间')}</div>}
            value={
              detailData?.objectMeta?.creationTimestamp
                ? dayjs(detailData?.objectMeta?.creationTimestamp).format(
                      'YYYY-MM-DD HH:mm:ss',
                  )
                : '-'
            }
          />
          </Col>
          <Col span={8}>
          <Statistic
              title={<div className="font-medium">{i18nInstance.t('4a6341a8bcc68e0b7120dbc89014b6a2', '持续时间')}</div>}
            value={calculateDuration(detailData?.objectMeta?.creationTimestamp)}
          />
          </Col>
          <Col span={16}>
          <Statistic
            className={styles['no-value']}
              title={<div className="font-medium">{i18nInstance.t('70e6882e567e3dbc86df3ef2fb2f65e4', '资源UID')}</div>}
            prefix={
              <Typography.Text
                ellipsis={{
                  tooltip: detailData?.objectMeta?.uid || '-',
                }}
                className={'w-[260px]'}
              >
                {detailData?.objectMeta?.uid || '-'}
              </Typography.Text>
            }
          />
          </Col>
        </Row>

        <Divider style={{ margin: '16px 0' }} />

        <div className="mb-4">
          <div className="text-base font-medium text-gray-500 mb-2">
            {i18nInstance.t('14d342362f66aa86e2aa1c1e11aa1204', '标签')}
          </div>
          <div>
            <TagList
              tags={convertLabelToTags(
                detailData?.objectMeta?.name || '',
                detailData?.objectMeta?.labels,
              )}
            />
          </div>
        </div>
        <div>
          <div className="text-base font-medium text-gray-500 mb-2">
            {i18nInstance.t('c11db1c192a765494c8859d854199085', '注解')}
          </div>
          <div>
            <TagList
              tags={convertLabelToTags(
                detailData?.objectMeta?.name || '',
                detailData?.objectMeta?.annotations,
              )}
            />
          </div>
        </div>
      </Card>
      
      <Card
        title={
          <Space>
            <span className="text-lg font-medium">
              {i18nInstance.t('副本状态信息', '副本状态信息')}
            </span>
          </Space>
        }
        bordered
        className="mb-4 shadow-sm"
      >
        <Row gutter={[24, 16]}>
          <Col span={8}>
            <Card bordered={false} className="bg-blue-50">
              <Statistic
                title={<div className="font-medium">{i18nInstance.t('期望Pod副本数量', '应用服务Pod部署数量')}</div>}
                value={detailData?.pods?.desired || 0}
                valueStyle={{ color: '#1677ff' }}
              />
              {detailData?.pods?.desired > 0 && (
                <Progress
                  percent={100}
                  showInfo={false}
                  strokeColor="#1677ff"
                  size="small"
                  className="mt-2"
                />
              )}
            </Card>
          </Col>
          <Col span={8}>
            <Card bordered={false} className="bg-green-50">
              <Statistic
                title={<div className="font-medium">{i18nInstance.t('当前副本数量', '当前副本数量')}</div>}
                value={detailData?.pods?.current || 0}
                valueStyle={{ color: '#52c41a' }}
              />
              {detailData?.pods?.desired > 0 && (
                <Progress
                  percent={Math.round((detailData?.pods?.current || 0) / (detailData?.pods?.desired || 1) * 100)}
                  showInfo={false}
                  strokeColor="#52c41a"
                  size="small"
                  className="mt-2"
                />
              )}
            </Card>
          </Col>
          <Col span={8}>
            <Card bordered={false} className="bg-cyan-50">
              <Statistic
                title={<div className="font-medium">{i18nInstance.t('运行中副本数量', '运行中副本数量')}</div>}
                value={detailData?.pods?.running || 0}
                valueStyle={{ color: '#13c2c2' }}
              />
              {detailData?.pods?.desired > 0 && (
                <Progress
                  percent={Math.round((detailData?.pods?.running || 0) / (detailData?.pods?.desired || 1) * 100)}
                  showInfo={false}
                  strokeColor="#13c2c2"
                  size="small"
                  className="mt-2"
                />
              )}
            </Card>
          </Col>
          <Col span={8}>
            <Card bordered={false} className="bg-volcano-50">
              <Statistic
                title={<div className="font-medium">{i18nInstance.t('总可用副本数量', '总可用副本数量')}</div>}
                value={detailData?.statusInfo?.available || 0}
                valueStyle={{ color: '#fa541c' }}
              />
              {detailData?.pods?.desired > 0 && (
                <Progress
                  percent={Math.round((detailData?.statusInfo?.available || 0) / (detailData?.pods?.desired || 1) * 100)}
                  showInfo={false}
                  strokeColor="#fa541c"
                  size="small"
                  className="mt-2"
                />
              )}
            </Card>
          </Col>
          <Col span={8}>
            <Card bordered={false} className="bg-gray-50">
              <Statistic
                title={<div className="font-medium">{i18nInstance.t('更新策略', '更新策略')}</div>}
                value={detailData?.strategy === 'RollingUpdate' ? '滚动更新' : 
                       detailData?.strategy === 'Recreate' ? '重新创建' : 
                       detailData?.strategy || '-'}
                valueStyle={{ color: '#8c8c8c' }}
              />
            </Card>
          </Col>
          <Col span={8}>
            <Card bordered={false} className="bg-gold-50">
              <Statistic
                title={<div className="font-medium">{i18nInstance.t('最大不可用副本数量', '最大不可用副本数量')}</div>}
                value={detailData?.rollingUpdateStrategy?.maxUnavailable || '-'}
                valueStyle={{ color: '#faad14' }}
              />
            </Card>
          </Col>
        </Row>
      </Card>

      <Card
        title={
          <Space>
            <span className="text-lg font-medium">
              {i18nInstance.t('be41a5333fef1e665214254aaf11f4fd', '调度信息')}
            </span>
          </Space>
        }
        bordered
        className="mb-4 shadow-sm"
      >
        <Table
          rowKey={(e) => e.objectMeta.uid}
          columns={[
            {
              title: i18nInstance.t('383a6d166f8f60e16e726ccc9c483631', '类别'),
              key: 'type',
              dataIndex: 'type',
              width: 100,
              render: (text) => {
                if (text === 'Normal') {
                  return <Tag color="success">正常</Tag>;
                } else if (text === 'Warning') {
                  return <Tag color="warning">警告</Tag>;
                } else if (text === 'Error') {
                  return <Tag color="error">错误</Tag>;
                }
                return <Tag>{text}</Tag>;
              }
            },
            {
              title: i18nInstance.t('26ca20b161c33362d88eb0ba0bc90751', '来源'),
              key: 'sourceComponent',
              dataIndex: 'sourceComponent',
              width: 180,
              ellipsis: true,
            },
            {
              title: i18nInstance.t('03663386e7d82f847634a6ee9111a32b', '检测时间'),
              key: 'lastSeen',
              dataIndex: 'lastSeen',
              width: 180,
              render: (text) => {
                if (text) {
                  const date = new Date(text);
                  return `${date.getMonth()+1}月${date.getDate()}日 ${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;
                }
                return text;
              }
            },
            {
              title: i18nInstance.t('41dfb0bf6167ca035b93caf3e06d6c95', '原因'),
              key: 'reason',
              dataIndex: 'reason',
              width: 200,
              render: (text) => {
                const reasonMap = {
                  'ApplyPolicySucceed': '策略应用成功',
                  'SyncWorkSucceed': '同步工作成功',
                  'SyncSucceed': '同步成功',
                  'ScheduleBindingFailed': '调度绑定失败',
                  'AggregateStatusSucceed': '状态聚合成功',
                  'ScheduleBindingSucceed': '调度绑定成功',
                  'Created': '创建完成',
                  'Pulled': '镜像拉取完成',
                  'Started': '启动完成',
                  'Failed': '操作失败',
                  'Killing': '终止中',
                  'BackOff': '回退',
                  'Unhealthy': '不健康',
                  'NodeNotReady': '节点未就绪',
                  'Evicted': '被驱逐',
                  'FailedMount': '挂载失败'
                };
                return reasonMap[text] || text;
              }
            },
            {
              title: i18nInstance.t('d8c7e04c8e2be23dd3b81a31db6e04f1', '详情'),
              key: 'message',
              dataIndex: 'message',
              render: (text) => {
                if (text && text.length > 60) {
                  return (
                    <Tooltip title={text}>
                      <span>{text.substring(0, 60)}...</span>
                    </Tooltip>
                  );
                }
                return text;
              }
            },
          ]}
          pagination={false}
          dataSource={eventsData?.events || []}
          className={cn(styles['schedule-container'])}
          locale={{ emptyText: '暂无调度信息' }}
          scroll={{ x: 'max-content' }}
        />
      </Card>
    </Drawer>
  );
};

export default WorkloadDetailDrawer;
