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
import React from 'react';
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
  Modal,
  Dropdown,
  MenuProps,
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
  DownOutlined,
  FormOutlined,
  CodeOutlined,
} from '@ant-design/icons';
import { WorkloadKind } from '@/services/base';
import useNamespace from '@/hooks/use-namespace';
import NewWorkloadEditorModal from './new-workload-editor-modal';
import WorkloadWizardModal from './workload-wizard-modal';
import WorkloadDetailDrawer, { WorkloadDetailDrawerProps } from './workload-detail-drawer';
import { useToggle } from '@uidotdev/usehooks';
import { stringify } from 'yaml';
import type { DeploymentWorkload } from '@/services/workload';
import ScrollContainer from '@/components/common/ScrollContainer';

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
      console.log('Getting workloads with filter:', filter);
      const clusters = await GetWorkloads({
        kind: filter.kind,
        namespace: filter.selectedWorkSpace || undefined,
        keyword: filter.searchText,
      });
      console.log('Workloads API response:', clusters);
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
  const [showWizardModal, toggleShowWizardModal] = useToggle(false);
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

  // 辅助函数定义
  const getWorkloadStatus = (workload: DeploymentWorkload): 'Running' | 'Pending' | 'Failed' | 'Succeeded' | 'Unknown' => {
    const wl = workload as any;
    
    // 根据新的API数据结构，从pods字段获取状态信息
    if (wl.pods) {
      const { current, desired, pending, failed, succeeded } = wl.pods;
      
      // 如果有失败的Pod，显示Failed状态
      if (failed > 0) {
        return 'Failed';
      }
      
      // 对于Job类型，如果成功数量达到期望值，显示Succeeded
      if (workload.typeMeta?.kind === 'Job' && succeeded >= desired) {
        return 'Succeeded';
      }
      
      // 如果当前数量等于期望数量，显示Running状态
      if (current >= desired && desired > 0) {
        return 'Running';
      }
      
      // 如果有待启动的Pod或当前数量小于期望数量，显示Pending状态
      if (pending > 0 || (current < desired && desired > 0)) {
        return 'Pending';
      }
      
      // 如果期望数量为0，显示Unknown状态
      if (desired === 0) {
        return 'Unknown';
      }
    }
    
    // 默认返回Running状态（兼容性）
    return 'Running';
  };

  const getWorkloadReplicas = (workload: DeploymentWorkload) => {
    if (workload.typeMeta?.kind === 'Pod') {
      return undefined;
    }
    
    // 从实际的工作负载数据中获取副本信息
    const wl = workload as any; // 使用any类型避免类型检查问题
    
    // 根据新的API数据结构，副本信息在pods字段中
    if (wl.pods) {
      return {
        ready: wl.pods.current || 0, // 使用current作为ready状态
        desired: wl.pods.desired || 0,
      };
    }
    
    // 兼容旧的数据结构（如果存在的话）
    if (workload.typeMeta?.kind === 'Deployment') {
      return {
        ready: wl.status?.readyReplicas || 0,
        desired: wl.spec?.replicas || 0,
      };
    } else if (workload.typeMeta?.kind === 'StatefulSet') {
      return {
        ready: wl.status?.readyReplicas || 0,
        desired: wl.spec?.replicas || 0,
      };
    } else if (workload.typeMeta?.kind === 'DaemonSet') {
      return {
        ready: wl.status?.numberReady || 0,
        desired: wl.status?.desiredNumberScheduled || 0,
      };
    } else if (workload.typeMeta?.kind === 'Job') {
      return {
        ready: wl.status?.succeeded || 0,
        desired: wl.spec?.completions || 1,
      };
    } else if (workload.typeMeta?.kind === 'CronJob') {
      // CronJob 不显示副本数
      return undefined;
    }
    
    // 默认返回
    return {
      ready: 0,
      desired: 1,
    };
  };

  const getWorkloadClusters = (workload: DeploymentWorkload): string[] => {
    // 从标签或注解中获取集群信息
    const clusters = [];
    if (workload.objectMeta?.annotations?.['cluster.karmada.io/name']) {
      clusters.push(workload.objectMeta.annotations['cluster.karmada.io/name']);
    }
    // 模拟多集群部署
    return clusters.length > 0 ? clusters : ['master', 'member1'];
  };

  const getWorkloadImages = (workload: DeploymentWorkload): string[] => {
    // 从实际的API数据中获取容器镜像信息
    const wl = workload as any;
    
    if (wl.containerImages && Array.isArray(wl.containerImages)) {
      // 处理"docker pull registry.example.com/library/nginx:latest"格式的镜像
      return wl.containerImages.map((imageStr: string) => {
        // 提取镜像名称，去掉"docker pull "前缀
        const imageName = imageStr.replace(/^docker pull\s+/, '');
        return imageName;
      });
    }
    
    // 兼容其他可能的镜像字段名
    if (wl.images && Array.isArray(wl.images)) {
      return wl.images;
    }
    
    // 默认返回空数组
    return [];
  };

  // 转换API数据为组件需要的格式
  const transformWorkloadData = (workloads: DeploymentWorkload[]) => {
    console.log('Transforming workload data:', workloads);
    if (!Array.isArray(workloads)) {
      console.warn('Workloads data is not an array:', workloads);
      return [];
    }
    
    return workloads.map(workload => {
      console.log('Processing workload:', workload);
      
      return {
        name: workload.objectMeta?.name || 'Unknown',
        namespace: workload.objectMeta?.namespace || 'default',
        type: workload.typeMeta?.kind as 'Deployment' | 'StatefulSet' | 'DaemonSet' | 'Job' | 'CronJob' | 'Pod',
        status: getWorkloadStatus(workload),
        replicas: getWorkloadReplicas(workload),
        clusters: getWorkloadClusters(workload),
        images: getWorkloadImages(workload),
        createTime: workload.objectMeta?.creationTimestamp,
        labels: workload.objectMeta?.labels || {},
        originalData: workload,
      };
    });
  };

  const workloadData = React.useMemo(() => {
    console.log('Processing data:', data);
    
    if (!data) {
      console.log('No data available');
      return [];
    }
    
    // 尝试不同的数据路径
    let items: DeploymentWorkload[] = [];
    
    if (data.items && Array.isArray(data.items)) {
      items = data.items;
    } else if (data.deployments && Array.isArray(data.deployments)) {
      items = data.deployments;
    } else if (data.statefulSets && Array.isArray(data.statefulSets)) {
      items = data.statefulSets;
    } else if (data.daemonSets && Array.isArray(data.daemonSets)) {
      items = data.daemonSets;
    } else if (data.jobs && Array.isArray(data.jobs)) {
      items = data.jobs;
    } else if (Array.isArray(data)) {
      items = data;
    }
    
    console.log('Found items:', items);
    return transformWorkloadData(items);
  }, [data]);

  // 统计数据
  const stats = {
    total: workloadData.length,
    running: workloadData.filter((w: any) => w.status === 'Running').length,
    pending: workloadData.filter((w: any) => w.status === 'Pending').length,
    failed: workloadData.filter((w: any) => w.status === 'Failed').length,
  };

  const handleCreateWorkload = () => {
    setEditorState({
      mode: 'create',
      content: '',
    });
    toggleShowModal(true);
  };

  const handleCreateWorkloadWizard = () => {
    toggleShowWizardModal(true);
  };

  const createMenuItems: MenuProps['items'] = [
    {
      key: 'wizard',
      label: '图形化向导',
      icon: <FormOutlined />,
      onClick: handleCreateWorkloadWizard,
    },
    {
      key: 'yaml',
      label: 'YAML 编辑器',
      icon: <CodeOutlined />,
      onClick: handleCreateWorkload,
    },
  ];

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
    <ScrollContainer
      height="100vh"
      padding="0"
      background="transparent"
    >
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
              <Dropdown
                menu={{ items: createMenuItems }}
                placement="bottomRight"
              >
                <Button 
                  className="tech-btn-primary flex items-center space-x-2"
                >
                  <PlusOutlined />
                  <span>创建工作负载</span>
                  <DownOutlined />
                </Button>
              </Dropdown>
            </Flex>

            {/* 过滤和搜索栏 */}
            <Flex gap={16} align="center" wrap="wrap">
              <div className="tech-segmented-override">
                <Text style={{ marginRight: '8px', fontWeight: '600' }}>工作负载类型:</Text>
                <Segmented
                  className="tech-segmented"
                  value={filter.kind}
                  onChange={(value) => setFilter(prev => ({ ...prev, kind: value as WorkloadKind }))}
                  options={workloadTypes}
                  style={{
                    background: '#ffffff !important',
                    border: '1px solid var(--glow-border)',
                    fontSize: '16px',
                    height: '40px'
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
            {/* 调试信息面板 */}
            {process.env.NODE_ENV === 'development' && (
              <details style={{ marginBottom: '16px', border: '1px solid #e8e8e8', padding: '12px', borderRadius: '6px' }}>
                <summary style={{ cursor: 'pointer', fontWeight: 'bold', color: '#1890ff' }}>
                  🔍 调试信息面板
                </summary>
                <div style={{ marginTop: '12px', fontSize: '12px' }}>
                  <p><strong>当前过滤器:</strong> {JSON.stringify(filter, null, 2)}</p>
                  <p><strong>API是否加载中:</strong> {isLoading ? '是' : '否'}</p>
                  <p><strong>原始数据存在:</strong> {data ? '是' : '否'}</p>
                  <p><strong>转换后工作负载数量:</strong> {workloadData.length}</p>
                  {data && (
                    <details style={{ marginTop: '8px' }}>
                      <summary>原始API响应</summary>
                      <pre style={{ background: '#f8f8f8', padding: '8px', borderRadius: '4px', marginTop: '8px', overflow: 'auto', maxHeight: '200px' }}>
                        {JSON.stringify(data, null, 2)}
                      </pre>
                    </details>
                  )}
                </div>
              </details>
            )}
            
            <Row gutter={[24, 24]}>
              {workloadData.map((workload) => (
                <Col xs={24} lg={12} xl={8} key={`${workload.namespace}-${workload.name}`}>
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
                    onDelete={() => {
                      // 显示删除确认对话框
                      Modal.confirm({
                        title: '确认删除',
                        content: `确定要删除工作负载 "${workload.name}" 吗？此操作不可恢复。`,
                        onOk: async () => {
                          await handleDeleteWorkload(workload);
                        },
                        onCancel() {
                          // 取消删除
                        },
                        okText: '确认删除',
                        cancelText: '取消',
                        okType: 'danger',
                      });
                    }}
                    onScale={() => {
                      // TODO: 实现扩缩容功能
                      messageApi.info('扩缩容功能开发中');
                    }}
                    onRestart={() => {
                      // TODO: 实现重启功能
                      messageApi.info('重启功能开发中');
                    }}
                  />
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
              
              {/* 调试信息 */}
              {process.env.NODE_ENV === 'development' && data && (
                <details style={{ textAlign: 'left', margin: '20px auto', maxWidth: '800px' }}>
                  <summary style={{ cursor: 'pointer', marginBottom: '10px' }}>
                    📊 查看原始API响应数据（调试用）
                  </summary>
                  <pre style={{ 
                    background: '#f5f5f5', 
                    padding: '15px', 
                    borderRadius: '5px',
                    fontSize: '12px',
                    overflow: 'auto',
                    maxHeight: '300px',
                    textAlign: 'left'
                  }}>
                    {JSON.stringify(data, null, 2)}
                  </pre>
                </details>
              )}
              
              <Dropdown
                menu={{ items: createMenuItems }}
                placement="bottomRight"
              >
                <Button 
                  className="tech-btn-primary flex items-center space-x-2"
                  style={{ margin: '0 auto' }}
                >
                  <PlusOutlined />
                  <span>创建第一个工作负载</span>
                  <DownOutlined />
                </Button>
              </Dropdown>
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

        {/* 工作负载图形化向导模态框 */}
        <WorkloadWizardModal
          open={showWizardModal}
          kind={filter.kind}
          onOk={async (ret) => {
            if (ret.code === 200) {
              messageApi.success('工作负载创建成功');
              await refetch();
              toggleShowWizardModal(false);
            } else {
              messageApi.error('工作负载创建失败');
            }
          }}
          onCancel={() => {
            toggleShowWizardModal(false);
          }}
        />

        {/* 工作负载详情抽屉 */}
        <WorkloadDetailDrawer
          {...drawerData}
          onClose={() => setDrawerData(prev => ({ ...prev, open: false }))}
        />
      </div>
    </ScrollContainer>
  );
};

export default WorkloadPage;
