import Panel from '@/components/panel';
import { ConfigKind } from '@/services/base.ts';
import QueryFilter from './components/query-filter';
import ConfigMapTable from './components/configmap-table';
import { stringify } from 'yaml';
import { useTagNum, useNamespace } from '@/hooks/index';
import ConfigEditorModal from './components/config-editor-modal';
import { useStore } from './store.ts';
import { message } from 'antd';
import { DeleteResource } from '@/services/unstructured.ts';
import { useQueryClient } from '@tanstack/react-query';

const ConfigPage = () => {
  const { nsOptions, isNsDataLoading } = useNamespace({});
  const { tagNum } = useTagNum();
  const filter = useStore((state) => state.filter);
  const { setFilter } = useStore((state) => {
    return {
      setFilter: state.setFilter,
    };
  });
  const editor = useStore((state) => state.editor);
  const { editConfig, viewConfig, createConfig, hideEditor } = useStore(
    (state) => {
      return {
        editConfig: state.editConfig,
        viewConfig: state.viewConfig,
        createConfig: state.createConfig,
        hideEditor: state.hideEditor,
      };
    },
  );
  const queryClient = useQueryClient();
  const [messageApi, messageContextHolder] = message.useMessage();
  return (
    <Panel>
      <QueryFilter
        filter={filter}
        setFilter={(v) => {
          setFilter(v);
        }}
        onNewConfig={createConfig}
        nsOptions={nsOptions}
        isNsDataLoading={isNsDataLoading}
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
                await messageApi.error('删除配置失败');
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

          const msg = editor.mode === 'edit' ? '修改' : '新增';
          if (ret.code === 200) {
            await messageApi.success(`${msg}配置成功`);
            hideEditor();
            if (editor.mode === 'create') {
              await queryClient.invalidateQueries({
                queryKey: ['GetConfigMaps'],
                exact: false,
              });
            }
          } else {
            await messageApi.error(`${msg}配置失败`);
          }
        }}
        onCancel={hideEditor}
      />
      {messageContextHolder}
    </Panel>
  );
};

export default ConfigPage;
