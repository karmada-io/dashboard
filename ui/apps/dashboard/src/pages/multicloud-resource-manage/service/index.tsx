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
import { App, Button, Input, Segmented, Select, Alert } from 'antd';
import { ServiceKind } from '@/services/base';
import { Icons } from '@/components/icons';
import { useCallback, useState } from 'react';
import { useToggle, useWindowSize } from '@uidotdev/usehooks';
import ServiceTable from './components/service-table';
import ServiceEditorModal from './components/service-editor-modal';
import { stringify } from 'yaml';
import IngressTable from '@/pages/multicloud-resource-manage/service/components/ingress-table';
import useNamespace from '@/hooks/use-namespace.ts';
import { useQueryClient } from '@tanstack/react-query';
import { DeleteResource } from '@/services/unstructured.ts';
import NewServiceWizardModal from './components/new-service-wizard-modal';

const ServicePage = () => {
  const [filter, setFilter] = useState<{
    selectedWorkSpace: string;
    searchText: string;
    kind: ServiceKind;
  }>({
    selectedWorkSpace: '',
    searchText: '',
    kind: ServiceKind.Service,
  });
  const { nsOptions, isNsDataLoading } = useNamespace({});
  const size = useWindowSize();
  const labelTagNum = size && size.width! > 1800 ? undefined : 1;
  const [editorState, setEditorState] = useState<{
    mode: 'create' | 'edit' | 'detail';
    content: string;
  }>({
    mode: 'create',
    content: '',
  });
  const [showModal, toggleShowModal] = useToggle(false);
  // 新增服务向导模态框状态
  const [showWizardModal, setShowWizardModal] = useState(false);
  // 编辑器模式
  const [useWizard, setUseWizard] = useState(true);

  const resetEditorState = useCallback(() => {
    setEditorState({
      mode: 'create',
      content: '',
    });
  }, []);
  const { message: messageApi } = App.useApp();
  const queryClient = useQueryClient();
  const serviceKindDescriptions: Record<string, string> = {
    service: '服务 (Service) 用于集群内外部服务的统一暴露与访问，支持负载均衡和服务发现。',
    ingress: 'Ingress 用于 HTTP/HTTPS 路由和七层流量管理，实现外部流量接入集群服务。',
  };

  // 刷新服务列表
  const refreshServiceList = async () => {
    await queryClient.invalidateQueries({
      queryKey: [
        filter.kind === ServiceKind.Service
          ? 'GetServices'
          : 'GetIngress',
      ],
      exact: false,
    });
  };

  // 处理点击新增服务按钮
  const handleAddService = () => {
    if (useWizard) {
      // 使用向导模式 - 根据当前选择的服务类型决定创建什么服务
      setShowWizardModal(true);
    } else {
      // 使用编辑器模式
      setEditorState({
        mode: 'create',
        content: '',
      });
      toggleShowModal(true);
    }
  };

  return (
    <Panel>
      <Alert message="服务管理用于跨集群服务的统一发布、暴露与治理。" type="info" showIcon style={{ marginBottom: 16 }} />
      <div className={'flex flex-row justify-between mb-4'}>
        <div>
          <Segmented
            style={{
              marginBottom: 8,
            }}
            options={[
              {
                label: 'Service',
                value: ServiceKind.Service,
              },
              {
                label: 'Ingress',
                value: ServiceKind.Ingress,
              },
            ]}
            value={filter.kind}
            onChange={(value) => {
              // reset filter when switch workload kind
              if (value !== filter.kind) {
                setFilter({
                  ...filter,
                  kind: value,
                  selectedWorkSpace: '',
                  searchText: '',
                });
              } else {
                setFilter({
                  ...filter,
                  kind: value,
                });
              }
            }}
          />
        </div>
        <div className="flex space-x-2">
          <Select
            options={[
              { label: '使用向导创建', value: true },
              { label: '使用YAML创建', value: false }
            ]}
            value={useWizard}
            style={{ width: 140 }}
            onChange={(value) => setUseWizard(value)}
          />
          <Button
            type={'primary'}
            icon={<Icons.add width={16} height={16} />}
            className="flex flex-row items-center"
            onClick={handleAddService}
          >
            {filter.kind === ServiceKind.Service 
              ? i18nInstance.t('新增服务', '新增服务')
              : i18nInstance.t('新增Ingress', '新增Ingress')}
          </Button>
        </div>
      </div>
      <div style={{ marginBottom: 16, fontSize: 15, color: '#555' }}>
        {serviceKindDescriptions[String(filter.kind).toLowerCase()]}
      </div>
      <div className={'flex flex-row space-x-4 mb-4'}>
        <h3 className={'leading-[32px]'}>
          {i18nInstance.t('280c56077360c204e536eb770495bc5f', '命名空间')}
        </h3>
        <Select
          options={nsOptions}
          className={'min-w-[200px]'}
          value={filter.selectedWorkSpace}
          loading={isNsDataLoading}
          showSearch
          allowClear
          onChange={(v) => {
            setFilter({
              ...filter,
              selectedWorkSpace: v,
            });
          }}
        />
        <Input.Search
          placeholder={i18nInstance.t(
            'cfaff3e369b9bd51504feb59bf0972a0',
            '按命名空间搜索',
          )}
          className={'w-[300px]'}
          onPressEnter={(e) => {
            const input = e.currentTarget.value;
            setFilter({
              ...filter,
              searchText: input,
            });
          }}
        />
      </div>
      {filter.kind === ServiceKind.Service && (
        <ServiceTable
          labelTagNum={labelTagNum}
          searchText={filter.searchText}
          selectedWorkSpace={filter.selectedWorkSpace}
          onViewServiceContent={(r) => {
            setEditorState({
              mode: 'detail',
              content: stringify(r),
            });
            toggleShowModal(true);
          }}
          onEditServiceContent={(r) => {
            setEditorState({
              mode: 'edit',
              content: stringify(r),
            });
            toggleShowModal(true);
          }}
          onDeleteServiceContent={async (r) => {
            try {
              const ret = await DeleteResource({
                kind: r.typeMeta.kind,
                name: r.objectMeta.name,
                namespace: r.objectMeta.namespace,
              });
              if (ret.code !== 200) {
                await messageApi.error(
                  i18nInstance.t(
                    '1ed71b1211f5d2ba41e4a23331985c7c',
                    '删除服务失败',
                  ),
                );
              }
              await queryClient.invalidateQueries({
                queryKey: ['GetServices'],
                exact: false,
              });
            } catch (e) {
              console.log('error', e);
            }
          }}
        />
      )}
      {filter.kind === ServiceKind.Ingress && (
        <IngressTable
          labelTagNum={labelTagNum}
          searchText={filter.searchText}
          selectedWorkSpace={filter.selectedWorkSpace}
          onViewIngressContent={(r) => {
            setEditorState({
              mode: 'edit',
              content: stringify(r),
            });
            toggleShowModal(true);
          }}
          onDeleteIngressContent={async (r) => {
            try {
              const ret = await DeleteResource({
                kind: r.typeMeta.kind,
                name: r.objectMeta.name,
                namespace: r.objectMeta.namespace,
              });
              if (ret.code !== 200) {
                await messageApi.error(
                  i18nInstance.t(
                    '1ed71b1211f5d2ba41e4a23331985c7c',
                    '删除服务失败',
                  ),
                );
              }
              await queryClient.invalidateQueries({
                queryKey: ['GetIngress'],
                exact: false,
              });
            } catch (e) {
              console.log('error', e);
            }
          }}
        />
      )}

      {/* YAML编辑器模态框 */}
      <ServiceEditorModal
        mode={editorState.mode}
        open={showModal}
        serviceContent={editorState.content}
        kind={filter.kind}
        onOk={async (ret) => {
          if (ret.code === 200) {
            await messageApi.success(
              editorState.mode === 'edit'
                ? i18nInstance.t('55aa6366c0d09a392d8acf54c4c4b837', '更新成功')
                : i18nInstance.t(
                    '04a691b377c91da599d5b4b62b0cb114',
                    '创建成功',
                  ),
            );
            toggleShowModal(false);
            resetEditorState();
            // invalidate react query
            await refreshServiceList();
          }
        }}
        onCancel={() => {
          toggleShowModal(false);
          resetEditorState();
        }}
      />

      {/* 服务向导模态框 */}
      <NewServiceWizardModal
        visible={showWizardModal}
        onClose={() => setShowWizardModal(false)}
        onSuccess={refreshServiceList}
        serviceType={filter.kind === ServiceKind.Service ? 'Service' : 'Ingress'}
      />
    </Panel>
  );
};
export default ServicePage;
