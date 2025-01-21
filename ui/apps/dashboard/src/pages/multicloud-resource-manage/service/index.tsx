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
import { Button, Input, Segmented, Select } from 'antd';
import { ServiceKind } from '@/services/base';
import { Icons } from '@/components/icons';
import { useCallback, useState } from 'react';
import { useToggle, useWindowSize } from '@uidotdev/usehooks';
import ServiceTable from './components/service-table';
import ServiceEditorModal from './components/service-editor-modal';
import { stringify } from 'yaml';
import IngressTable from '@/pages/multicloud-resource-manage/service/components/ingress-table';
import useNamespace from '@/hooks/use-namespace.ts';
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
  const resetEditorState = useCallback(() => {
    setEditorState({
      mode: 'create',
      content: '',
    });
  }, []);
  return (
    <Panel>
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
        <Button
          type={'primary'}
          icon={<Icons.add width={16} height={16} />}
          className="flex flex-row items-center"
          onClick={() => {
            toggleShowModal(true);
          }}
        >
          {i18nInstance.t('c7961c290ec86485d8692f3c09b4075b', '新增服务')}
        </Button>
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
          onDeleteServiceContent={() => {}}
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
          onDeleteIngressContent={() => {}}
        />
      )}

      <ServiceEditorModal
        mode={editorState.mode}
        open={showModal}
        serviceContent={editorState.content}
        onOk={(ret) => {
          console.log(ret);
        }}
        onCancel={() => {
          resetEditorState();
          toggleShowModal(false);
        }}
        kind={filter.kind}
      />
    </Panel>
  );
};
export default ServicePage;
