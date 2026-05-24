/*
Copyright 2026 The Karmada Authors.

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

import { FC, ReactNode } from 'react';
import { Input, Segmented, Select } from 'antd';
import { WorkloadKind } from '@/services/base';
import i18nInstance from '@/utils/i18n';

export interface WorkloadFilterProps {
  kind: WorkloadKind;
  namespace: string;
  searchText?: string;
  onKindChange: (kind: WorkloadKind) => void;
  onNamespaceChange: (ns: string) => void;
  onSearch: (text: string) => void;
  onSearchChange?: (text: string) => void;
  nsOptions: { title?: string; label?: string; value: string }[];
  isNsDataLoading: boolean;
  extra?: ReactNode;
}

const kindOptions = [
  { label: 'Deployment', value: WorkloadKind.Deployment },
  { label: 'Statefulset', value: WorkloadKind.Statefulset },
  { label: 'Daemonset', value: WorkloadKind.Daemonset },
  { label: 'Cronjob', value: WorkloadKind.Cronjob },
  { label: 'Job', value: WorkloadKind.Job },
];

const WorkloadFilter: FC<WorkloadFilterProps> = ({
  kind,
  namespace,
  onKindChange,
  onNamespaceChange,
  onSearch,
  onSearchChange,
  nsOptions,
  isNsDataLoading,
  extra,
}) => {
  return (
    <>
      <div className={'flex flex-row justify-between mb-4'}>
        <div>
          <Segmented
            value={kind}
            onChange={(value) => onKindChange(value as WorkloadKind)}
            options={kindOptions}
          />
        </div>
        {extra}
      </div>
      <div className={'flex flex-row space-x-4 mb-4'}>
        <h3 className={'leading-[32px]'}>
          {i18nInstance.t('280c56077360c204e536eb770495bc5f', '命名空间')}：
        </h3>
        <Select
          options={nsOptions}
          className={'min-w-[200px]'}
          value={namespace}
          loading={isNsDataLoading}
          showSearch
          allowClear
          onChange={(v) => onNamespaceChange(v || '')}
        />
        <Input.Search
          placeholder={i18nInstance.t(
            'cfaff3e369b9bd51504feb59bf0972a0',
            '按命名空间搜索',
          )}
          className={'w-[300px]'}
          onChange={onSearchChange ? (e) => onSearchChange(e.target.value) : undefined}
          onPressEnter={(e) => onSearch(e.currentTarget.value)}
        />
      </div>
    </>
  );
};

export default WorkloadFilter;
