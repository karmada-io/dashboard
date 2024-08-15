import i18nInstance from '@/utils/i18n';
import { FC, useMemo } from 'react';
import {
  Drawer,
  Card,
  Statistic,
  Tag,
  Table,
  TableColumnProps,
  Typography,
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
      title: i18nInstance.t('383a6d166f8f60e16e726ccc9c483631'),
      key: 'type',
      dataIndex: 'type',
    },
    {
      title: i18nInstance.t('26ca20b161c33362d88eb0ba0bc90751'),
      key: 'sourceComponent',
      dataIndex: 'sourceComponent',
    },
    {
      title: i18nInstance.t('03663386e7d82f847634a6ee9111a32b'),
      key: 'lastSeen',
      dataIndex: 'lastSeen',
    },
    {
      title: i18nInstance.t('41dfb0bf6167ca035b93caf3e06d6c95'),
      key: 'reason',
      dataIndex: 'reason',
    },
    {
      title: i18nInstance.t('d8c7e04c8e2be23dd3b81a31db6e04f1'),
      key: 'message',
      dataIndex: 'message',
    },
  ];

  return (
    <Drawer
      title={i18nInstance.t('0af9d9af618327e912ac9f91bbe6a30f')}
      placement="right"
      open={open}
      width={800}
      loading={isDetailDataLoading}
      onClose={onClose}
    >
      <Card title={i18nInstance.t('9e5ffa068ed435ced73dc9bf5dd8e09c')} bordered>
        <div className="flex flex-row space-x-4 mb-4">
          <Statistic
            title={i18nInstance.t('d7ec2d3fea4756bc1642e0f10c180cf5')}
            value={detailData?.objectMeta?.name || '-'}
          />
          <Statistic
            title={i18nInstance.t('a4b28a416f0b6f3c215c51e79e517298')}
            value={detailData?.objectMeta?.namespace || '-'}
          />

          {/*'2024-01-01'*/}
          <Statistic
            title={i18nInstance.t('eca37cb0726c51702f70c486c1c38cf3')}
            value={
              detailData?.objectMeta?.creationTimestamp
                ? dayjs(detailData?.objectMeta?.creationTimestamp).format(
                    'YYYY-MM-DD',
                  )
                : '-'
            }
          />

          <Statistic
            title={i18nInstance.t('4a6341a8bcc68e0b7120dbc89014b6a2')}
            value="2h"
          />
          <Statistic
            className={styles['no-value']}
            title={i18nInstance.t('70e6882e567e3dbc86df3ef2fb2f65e4')}
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
        </div>

        <div className="mb-4">
          <div className="text-base text-gray-500 mb-2">
            {i18nInstance.t('14d342362f66aa86e2aa1c1e11aa1204')}
          </div>
          <div>
            <Tag>k8s-app:vpc-nginx</Tag>
            <Tag>app:vpc-nginx</Tag>
            <Tag>controlled-by:helm-client</Tag>
          </div>
        </div>
        <div>
          <div className="text-base text-gray-500 mb-2">
            {i18nInstance.t('c11db1c192a765494c8859d854199085')}
          </div>
          <div>
            <Tag>deployment.kubernetes.io/revision:2</Tag>
            <Tag>kubectl.kubernetes.io/last-applied-configuration</Tag>
          </div>
        </div>
      </Card>
      <Card
        title={i18nInstance.t('be41a5333fef1e665214254aaf11f4fd')}
        bordered
        className={styles['schedule-container']}
      >
        <Table
          columns={columns}
          pagination={false}
          dataSource={eventsData?.events || []}
        />
      </Card>
    </Drawer>
  );
};

export default WorkloadDetailDrawer;
