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

import { useState, useCallback } from 'react';
import { 
  Row, 
  Col, 
  Typography, 
  Button, 
  Input, 
  Select, 
  Statistic,
  Card,
  Segmented,
  Flex,
  message,
  Popconfirm,
} from 'antd';
import { useQuery } from '@tanstack/react-query';
import { GetWorkloads } from '@/services/workload';
import { DeleteResource, GetResource } from '@/services/unstructured';
import { WorkloadCard } from '@/components/workload';
import { 
  PlusOutlined, 
  SearchOutlined, 
  ReloadOutlined,
  AppstoreOutlined,
} from '@ant-design/icons';
import { WorkloadKind } from '@/services/base';
import useNamespace from '@/hooks/use-namespace';
import NewWorkloadEditorModal from './new-workload-editor-modal';
import WorkloadDetailDrawer, { WorkloadDetailDrawerProps } from './workload-detail-drawer';
import { useToggle } from '@uidotdev/usehooks';
import { stringify } from 'yaml';
import type { DeploymentWorkload } from '@/services/workload';

const { Title, Text } = Typography;
const { Search } = Input;
const { Option } = Select;

const WorkloadPage = () => {
  const [messageApi, messageContextHolder] = message.useMessage();
  const navigate = useNavigate();
  
  const [filter, setFilter] = useState<{
    kind: WorkloadKind;
    selectedWorkSpace: string;
    searchText: string;
  }>({
    kind: WorkloadKind.Deployment,
    selectedWorkSpace: '',
    searchText: '',
  });

  const { nsOptions, isNsDataLoading } = useNamespace({});
  
  const { data, isLoading, refetch } = useQuery({
    queryKey: ['GetWorkloads', JSON.stringify(filter)],
    queryFn: async () => {
      const clusters = await GetWorkloads({
        kind: filter.kind,
        namespace: filter.selectedWorkSpace,
        keyword: filter.searchText,
      });
      return clusters.data || {};
    },
  });

  const [drawerData, setDrawerData] = useState<
    Omit<WorkloadDetailDrawerProps, 'onClose'>
  >({
    open: false,
    kind: WorkloadKind.Unknown,
    namespace: '',
    name: '',
  });

  const [showModal, toggleShowModal] = useToggle(false);
  const [editorState, setEditorState] = useState<{
    mode: 'create' | 'edit';
    content: string;
  }>({
    mode: 'create',
    content: '',
  });

  const resetEditorState = useCallback(() => {
    setEditorState({
      mode: 'create',
      content: '',
    });
  }, []);

  // 转换API数据为组件需要的格式
  const transformWorkloadData = (workloads: DeploymentWorkload[]) => {
    return workloads.map(workload => ({
      name: workload.objectMeta.name,
      namespace: workload.objectMeta.namespace,
      type: workload.typeMeta.kind as 'Deployment' | 'StatefulSet' | 'DaemonSet' | 'Job' | 'CronJob' | 'Pod',
      status: getWorkloadStatus(workload),
      replicas: getWorkloadReplicas(workload),
      clusters: getWorkloadClusters(workload),
      images: getWorkloadImages(workload),
      createTime: workload.objectMeta.creationTimestamp,
      labels: workload.objectMeta.labels,
      originalData: workload,
    }));
  };

  const getWorkloadStatus = (workload: DeploymentWorkload): 'Running' | 'Pending' | 'Failed' | 'Succeeded' | 'Unknown' => {
    // 暂时返回Running状态，后续根据实际API数据结构调整
    return 'Running';
  };

  const getWorkloadReplicas = (workload: DeploymentWorkload) => {
    if (workload.typeMeta.kind === 'Pod') {
      return undefined;
    }
    return {
      ready: 1,
      desired: 1,
    };
  };

  const getWorkloadClusters = (workload: DeploymentWorkload): string[] => {
    // 从标签或注解中获取集群信息
    const clusters = [];
    if (workload.objectMeta.annotations?.['cluster.karmada.io/name']) {
      clusters.push(workload.objectMeta.annotations['cluster.karmada.io/name']);
    }
    // 模拟多集群部署
    return clusters.length > 0 ? clusters : ['master', 'member1'];
  };

  const getWorkloadImages = (workload: DeploymentWorkload): string[] => {
    // 暂时返回模拟数据，后续根据实际API数据结构调整
    return ['nginx:latest'];
  };

  const workloadData = data?.items ? transformWorkloadData(data.items) : [];

  // 统计数据
  const stats = {
    total: workloadData.length,
    running: workloadData.filter(w => w.status === 'Running').length,
    pending: workloadData.filter(w => w.status === 'Pending').length,
    failed: workloadData.filter(w => w.status === 'Failed').length,
  };

  const handleCreateWorkload = () => {
    setEditorState({
      mode: 'create',
      content: '',
    });
    toggleShowModal(true);
  };

  const handleEditWorkload = async (workload: any) => {
    try {
      const ret = await GetResource({
        kind: workload.type,
        name: workload.name,
        namespace: workload.namespace,
      });
      setEditorState({
        mode: 'edit',
        content: stringify(ret.data),
      });
      toggleShowModal(true);
    } catch (error) {
      messageApi.error('获取工作负载详情失败');
    }
  };

  const handleDeleteWorkload = async (workload: any) => {
    try {
      await DeleteResource({
        kind: workload.type,
        name: workload.name,
        namespace: workload.namespace,
      });
      messageApi.success('工作负载删除成功');
      refetch();
    } catch (error) {
      messageApi.error('工作负载删除失败');
    }
  };

  const handleViewWorkload = (workload: any) => {
    setDrawerData({
      open: true,
      kind: workload.type as WorkloadKind,
      name: workload.name,
      namespace: workload.namespace,
    });
  };

  const workloadTypes = [
    { label: 'Deployment', value: WorkloadKind.Deployment },
    { label: 'StatefulSet', value: WorkloadKind.Statefulset },
    { label: 'DaemonSet', value: WorkloadKind.Daemonset },
    { label: 'Job', value: WorkloadKind.Job },
    { label: 'CronJob', value: WorkloadKind.Cronjob },
  ];

  return (
    <div style={{ padding: '24px', backgroundColor: '#f0f2f5', minHeight: '100vh' }}>
      {messageContextHolder}
      
      {/* 页面标题和操作栏 */}
      <div style={{ marginBottom: '24px' }}>
        <Flex justify="space-between" align="center" style={{ marginBottom: '16px' }}>
          <div>
            <Title level={2} style={{ margin: 0 }}>
              多云工作负载
            </Title>
            <Text type="secondary">
              管理和监控跨集群的应用工作负载
            </Text>
          </div>
          <Button 
            type="primary" 
            icon={<PlusOutlined />} 
            onClick={handleCreateWorkload}
            size="large"
          >
            创建工作负载
          </Button>
        </Flex>

        {/* 过滤和搜索栏 */}
        <Flex gap={16} align="center" wrap="wrap">
          <div>
            <Text style={{ marginRight: '8px' }}>工作负载类型:</Text>
            <Segmented
              value={filter.kind}
              onChange={(value) => setFilter(prev => ({ ...prev, kind: value as WorkloadKind }))}
              options={workloadTypes}
            />
          </div>
          <Select
            placeholder="选择命名空间"
            value={filter.selectedWorkSpace || undefined}
            onChange={(value) => setFilter(prev => ({ ...prev, selectedWorkSpace: value || '' }))}
            style={{ width: 200 }}
            allowClear
            loading={isNsDataLoading}
          >
            {nsOptions.map(ns => (
              <Option key={ns.value} value={ns.value}>{ns.title}</Option>
            ))}
          </Select>
          <Search
            placeholder="搜索工作负载名称"
            allowClear
            value={filter.searchText}
            onChange={(e) => setFilter(prev => ({ ...prev, searchText: e.target.value }))}
            style={{ width: 300 }}
            prefix={<SearchOutlined />}
          />
          <Button 
            icon={<ReloadOutlined />} 
            onClick={() => refetch()}
            loading={isLoading}
          >
            刷新
          </Button>
        </Flex>
      </div>

      {/* 统计信息卡片 */}
      <Row gutter={[16, 16]} style={{ marginBottom: '24px' }}>
        <Col xs={24} sm={6}>
          <Card>
            <Statistic
              title="总工作负载"
              value={stats.total}
              valueStyle={{ color: '#1890ff' }}
              prefix={<AppstoreOutlined />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={6}>
          <Card>
            <Statistic
              title="运行中"
              value={stats.running}
              valueStyle={{ color: '#52c41a' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={6}>
          <Card>
            <Statistic
              title="待启动"
              value={stats.pending}
              valueStyle={{ color: '#faad14' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={6}>
          <Card>
            <Statistic
              title="异常"
              value={stats.failed}
              valueStyle={{ color: '#ff4d4f' }}
            />
          </Card>
        </Col>
      </Row>

      {/* 工作负载卡片网格 */}
      <Row gutter={[16, 16]}>
        {workloadData.map((workload) => (
          <Col xs={24} lg={12} xl={8} key={`${workload.namespace}-${workload.name}`}>
            <Popconfirm
              title="确认删除"
              description={`确定要删除工作负载 "${workload.name}" 吗？此操作不可恢复。`}
              onConfirm={() => handleDeleteWorkload(workload)}
              okText="确认删除"
              cancelText="取消"
              okType="danger"
            >
              <WorkloadCard
                name={workload.name}
                namespace={workload.namespace}
                type={workload.type}
                status={workload.status}
                replicas={workload.replicas}
                clusters={workload.clusters}
                images={workload.images}
                createTime={workload.createTime}
                labels={workload.labels}
                onView={() => handleViewWorkload(workload)}
                onEdit={() => handleEditWorkload(workload)}
                onDelete={() => {}} // 删除由Popconfirm处理
                onScale={() => {
                  // TODO: 实现扩缩容功能
                  messageApi.info('扩缩容功能开发中');
                }}
                onRestart={() => {
                  // TODO: 实现重启功能
                  messageApi.info('重启功能开发中');
                }}
              />
            </Popconfirm>
          </Col>
        ))}
      </Row>

      {/* 空状态 */}
      {workloadData.length === 0 && !isLoading && (
        <div style={{ 
          textAlign: 'center', 
          padding: '60px 0',
          backgroundColor: '#ffffff',
          borderRadius: '8px',
          marginTop: '24px',
        }}>
          <AppstoreOutlined style={{ fontSize: '48px', color: '#d9d9d9', marginBottom: '16px' }} />
          <Text type="secondary" style={{ fontSize: '16px', display: 'block', marginBottom: '16px' }}>
            暂无工作负载数据
          </Text>
          <Button type="primary" icon={<PlusOutlined />} onClick={handleCreateWorkload}>
            创建第一个工作负载
          </Button>
        </div>
      )}

      {/* 工作负载编辑器模态框 */}
      <NewWorkloadEditorModal
        mode={editorState.mode}
        open={showModal}
        kind={filter.kind}
        workloadContent={editorState.content}
        onOk={async (ret) => {
          if (ret.code === 200) {
            messageApi.success(editorState.mode === 'create' ? '工作负载创建成功' : '工作负载更新成功');
            await refetch();
            toggleShowModal(false);
            resetEditorState();
          } else {
            messageApi.error(editorState.mode === 'create' ? '工作负载创建失败' : '工作负载更新失败');
          }
        }}
        onCancel={() => {
          toggleShowModal(false);
          resetEditorState();
        }}
      />

      {/* 工作负载详情抽屉 */}
      <WorkloadDetailDrawer
        {...drawerData}
        onClose={() => setDrawerData(prev => ({ ...prev, open: false }))}
      />
    </div>
  );
};

export default WorkloadPage;
