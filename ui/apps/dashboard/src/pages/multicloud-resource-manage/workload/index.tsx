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
  Segmented,
  Flex,
  message,
  Popconfirm,
} from 'antd';
import { useQuery } from '@tanstack/react-query';

import '@/styles/tech-theme.css';
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

  const getWorkloadStatus = (_workload: DeploymentWorkload): 'Running' | 'Pending' | 'Failed' | 'Succeeded' | 'Unknown' => {
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

  const getWorkloadImages = (_workload: DeploymentWorkload): string[] => {
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
    <div className="tech-background min-h-screen">
      {messageContextHolder}
      
      {/* 粒子背景效果 */}
      <div className="tech-particles-container">
        {Array.from({ length: 20 }, (_, i) => (
          <div
            key={i}
            className="tech-particle"
            style={{
              left: `${Math.random() * 100}%`,
              animationDelay: `${Math.random() * 20}s`
            }}
          />
        ))}
      </div>

      <div className="relative z-10 p-6">
        {/* 页面标题 */}
        <div className="mb-8">
          <Title 
            level={1} 
            className="tech-hologram-text m-0 text-4xl font-bold"
            style={{ color: 'var(--tech-primary)' }}
          >
            🚀 WORKLOAD MANAGEMENT
          </Title>
          <Text className="text-gray-600 text-lg">
            多云工作负载管理与监控中心
          </Text>
        </div>

        {/* 操作和过滤区域 */}
        <div className="tech-card mb-6">
          <Flex justify="space-between" align="center" style={{ marginBottom: '16px' }}>
            <div>
              <Title level={3} style={{ margin: 0, color: 'var(--text-color)' }}>
                工作负载概览
              </Title>
              <Text type="secondary">
                当前显示 {workloadData.length} 个工作负载
              </Text>
            </div>
            <button 
              className="tech-btn-primary flex items-center space-x-2"
              onClick={handleCreateWorkload}
            >
              <PlusOutlined />
              <span>创建工作负载</span>
            </button>
          </Flex>

          {/* 过滤和搜索栏 */}
          <Flex gap={16} align="center" wrap="wrap">
            <div>
              <Text style={{ marginRight: '8px', fontWeight: '600' }}>工作负载类型:</Text>
              <Segmented
                value={filter.kind}
                onChange={(value) => setFilter(prev => ({ ...prev, kind: value as WorkloadKind }))}
                options={workloadTypes}
                style={{
                  background: 'rgba(255, 255, 255, 0.9)',
                  border: '1px solid var(--glow-border)',
                }}
              />
            </div>
            <Select
              placeholder="选择命名空间"
              value={filter.selectedWorkSpace || undefined}
              onChange={(value) => setFilter(prev => ({ ...prev, selectedWorkSpace: value || '' }))}
              style={{ 
                width: 200,
              }}
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
              className="tech-search-input"
              prefix={<SearchOutlined />}
            />
            <Button 
              icon={<ReloadOutlined />} 
              onClick={() => refetch()}
              loading={isLoading}
              style={{
                borderColor: 'var(--tech-primary)',
                color: 'var(--tech-primary)',
              }}
            >
              刷新
            </Button>
          </Flex>
        </div>

        {/* 统计信息卡片 */}
        <Row gutter={[24, 24]} style={{ marginBottom: '32px' }}>
          <Col xs={24} sm={6}>
            <div className="tech-card tech-hover-scale">
              <div className="flex items-center justify-between mb-4">
                <AppstoreOutlined 
                  className="text-3xl"
                  style={{ color: 'var(--tech-primary)' }}
                />
              </div>
              <div className="text-center">
                <div 
                  className="text-4xl font-bold mb-2 tech-hologram-text"
                  style={{ color: 'var(--tech-primary)' }}
                >
                  {stats.total}
                </div>
                <Text className="text-gray-600 font-semibold uppercase tracking-wide">
                  总工作负载
                </Text>
              </div>
            </div>
          </Col>
          <Col xs={24} sm={6}>
            <div className="tech-card tech-hover-scale">
              <div className="flex items-center justify-between mb-4">
                <div 
                  className="w-3 h-3 rounded-full animate-pulse"
                  style={{ background: 'var(--success-color)' }}
                />
              </div>
              <div className="text-center">
                <div 
                  className="text-4xl font-bold mb-2 tech-hologram-text"
                  style={{ color: 'var(--success-color)' }}
                >
                  {stats.running}
                </div>
                <Text className="text-gray-600 font-semibold uppercase tracking-wide">
                  运行中
                </Text>
              </div>
            </div>
          </Col>
          <Col xs={24} sm={6}>
            <div className="tech-card tech-hover-scale">
              <div className="flex items-center justify-between mb-4">
                <div 
                  className="w-3 h-3 rounded-full animate-pulse"
                  style={{ background: 'var(--warning-color)' }}
                />
              </div>
              <div className="text-center">
                <div 
                  className="text-4xl font-bold mb-2 tech-hologram-text"
                  style={{ color: 'var(--warning-color)' }}
                >
                  {stats.pending}
                </div>
                <Text className="text-gray-600 font-semibold uppercase tracking-wide">
                  待启动
                </Text>
              </div>
            </div>
          </Col>
          <Col xs={24} sm={6}>
            <div className="tech-card tech-hover-scale">
              <div className="flex items-center justify-between mb-4">
                <div 
                  className="w-3 h-3 rounded-full animate-pulse"
                  style={{ background: 'var(--error-color)' }}
                />
              </div>
              <div className="text-center">
                <div 
                  className="text-4xl font-bold mb-2 tech-hologram-text"
                  style={{ color: 'var(--error-color)' }}
                >
                  {stats.failed}
                </div>
                <Text className="text-gray-600 font-semibold uppercase tracking-wide">
                  异常
                </Text>
              </div>
            </div>
          </Col>
        </Row>

        {/* 工作负载卡片网格 */}
        <div className="tech-card mb-6">
          <Row gutter={[24, 24]}>
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
        </div>

        {/* 空状态 */}
        {workloadData.length === 0 && !isLoading && (
          <div className="tech-card text-center py-16">
            <AppstoreOutlined 
              className="text-6xl mb-6"
              style={{ color: 'var(--tech-primary)', opacity: 0.5 }}
            />
            <Text 
              className="text-xl block mb-6 tech-hologram-text"
              style={{ color: 'var(--tech-primary)' }}
            >
              暂无工作负载数据
            </Text>
            <button 
              className="tech-btn-primary flex items-center space-x-2 mx-auto"
              onClick={handleCreateWorkload}
            >
              <PlusOutlined />
              <span>创建第一个工作负载</span>
            </button>
          </div>
        )}
      </div>

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
