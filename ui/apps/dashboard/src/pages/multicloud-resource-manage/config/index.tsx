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
import { ConfigKind } from '@/services/base.ts';
import QueryFilter from './components/query-filter';
import ConfigMapTable from './components/configmap-table';
import { stringify } from 'yaml';
import { useTagNum, useNamespace } from '@/hooks/index';
import ConfigEditorModal from './components/config-editor-modal';
import { useStore } from './store.ts';
import { message, Alert } from 'antd';
import { DeleteResource } from '@/services/unstructured.ts';
import { useQueryClient } from '@tanstack/react-query';
import SecretTable from '@/pages/multicloud-resource-manage/config/components/secret-table.tsx';
import NewConfigWizardModal from './components/new-config-wizard-modal';

const ConfigPage = () => {
  const { nsOptions, isNsDataLoading } = useNamespace({});
  const { tagNum } = useTagNum();
  const filter = useStore((state) => state.filter);
  const editor = useStore((state) => state.editor);
  const wizard = useStore((state) => state.wizard);
  const useWizard = useStore((state) => state.useWizard);
  
  const { 
    setFilter, 
    editConfig, 
    viewConfig, 
    createConfig, 
    hideEditor, 
    hideWizard, 
    setUseWizard 
  } = useStore((state) => {
    return {
      setFilter: state.setFilter,
      editConfig: state.editConfig,
      viewConfig: state.viewConfig,
      createConfig: state.createConfig,
      hideEditor: state.hideEditor,
      hideWizard: state.hideWizard,
      setUseWizard: state.setUseWizard
    };
  });
  
  const queryClient = useQueryClient();
  const [messageApi, messageContextHolder] = message.useMessage();
  const configKindDescriptions: Record<string, string> = {
    configmap: 'ConfigMap 用于存储非敏感的配置信息，支持多集群分发和集中管理。',
    secret: 'Secret 用于存储敏感数据（如密码、密钥），安全分发到多集群，保障数据安全。',
  };
  
  // 刷新配置列表
  const refreshConfigList = async () => {
    await queryClient.invalidateQueries({
      queryKey: [
        filter.kind === ConfigKind.ConfigMap
          ? 'GetConfigMaps'
          : 'GetSecrets',
      ],
      exact: false,
    });
  };
  
  return (
    <Panel>
      <Alert message="配置管理用于多集群下 ConfigMap、Secret 等配置的集中管理与分发。" type="info" showIcon style={{ marginBottom: 16 }} />
      <QueryFilter
        filter={filter}
        setFilter={(v) => {
          setFilter(v);
        }}
        onNewConfig={createConfig}
        nsOptions={nsOptions}
        isNsDataLoading={isNsDataLoading}
        useWizard={useWizard}
        setUseWizard={setUseWizard}
      />

      {filter.kind === ConfigKind.ConfigMap && (
        <ConfigMapTable
          labelTagNum={tagNum}
          searchText={filter.searchText}
          selectedWorkSpace={filter.selectedWorkspace}
          onViewConfigMapContent={(r) => {
            viewConfig(stringify(r));
          }}
          onEditConfigMapContent={(r) => {
            editConfig(stringify(r));
          }}
          onDeleteConfigMapContent={async (r) => {
            try {
              const ret = await DeleteResource({
                kind: r.typeMeta.kind,
                name: r.objectMeta.name,
                namespace: r.objectMeta.namespace,
              });
              if (ret.code !== 200) {
                await messageApi.error(
                  i18nInstance.t(
                    'f8484c9d3de78566f9e255360977f12c',
                    '删除配置失败',
                  ),
                );
              }
              await queryClient.invalidateQueries({
                queryKey: ['GetConfigMaps'],
                exact: false,
              });
            } catch (e) {
              console.log('error', e);
            }
          }}
        />
      )}
      {filter.kind === ConfigKind.Secret && (
        <SecretTable
          labelTagNum={tagNum}
          searchText={filter.searchText}
          selectedWorkSpace={filter.selectedWorkspace}
          onViewSecret={(r) => {
            viewConfig(stringify(r));
          }}
          onEditSecret={(r) => {
            editConfig(stringify(r));
          }}
          onDeleteSecretContent={async (r) => {
            try {
              const ret = await DeleteResource({
                kind: r.typeMeta.kind,
                name: r.objectMeta.name,
                namespace: r.objectMeta.namespace,
              });
              if (ret.code !== 200) {
                await messageApi.error(
                  i18nInstance.t(
                    '1de397f628eb5943bdb6861ad667ff0a',
                    '删除秘钥失败',
                  ),
                );
              }
              await queryClient.invalidateQueries({
                queryKey: ['GetSecrets'],
                exact: false,
              });
            } catch (e) {
              console.log('error', e);
            }
          }}
        />
      )}

      {/* YAML编辑器模态框 */}
      <ConfigEditorModal
        mode={editor.mode}
        workloadContent={editor.content}
        open={editor.show}
        kind={filter.kind}
        onOk={async (ret) => {
          if (editor.mode === 'read') {
            hideEditor();
            return;
          }
          const msg =
            editor.mode === 'edit'
              ? i18nInstance.t('8347a927c09a4ec2fe473b0a93f667d0', '修改')
              : i18nInstance.t('66ab5e9f24c8f46012a25c89919fb191', '新增');
          if (ret.code === 200) {
            await messageApi.success(
              `${msg}${i18nInstance.t('a6d38572262cb1b1238d449b4098f002', '配置成功')}`,
            );
            hideEditor();
            await refreshConfigList();
          } else {
            await messageApi.error(
              `${msg}${i18nInstance.t('03d3b00687bbab3e9a7e1bd3aeeaa0a4', '配置失败')}`,
            );
          }
        }}
        onCancel={hideEditor}
      />
      
      {/* 配置向导模态框 */}
      <NewConfigWizardModal
        visible={wizard.show}
        onClose={hideWizard}
        onSuccess={refreshConfigList}
        configType={wizard.kind}
      />
      
      {messageContextHolder}
    </Panel>
  );
};
export default ConfigPage;
