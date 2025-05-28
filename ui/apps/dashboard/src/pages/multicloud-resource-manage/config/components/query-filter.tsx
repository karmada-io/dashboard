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
import { Button, Input, Segmented, Select } from 'antd';
import { Icons } from '@/components/icons';
import { FC } from 'react';
import { FilterState } from '../types';
import { ConfigKind } from '@/services/base.ts';
import '@/styles/tech-theme.css';
interface QueryFilterProps {
  filter: FilterState;
  setFilter: (d: Partial<FilterState>) => void;
  onNewConfig: () => void;
  nsOptions: {
    title: string;
    value: string;
  }[];
  isNsDataLoading: boolean;
}
const QueryFilter: FC<QueryFilterProps> = (props) => {
  const { filter, setFilter, onNewConfig, nsOptions, isNsDataLoading } = props;
  return (
    <>
      <div className={'flex flex-row justify-between mb-6'}>
        <div className="tech-segmented-override">
          <Segmented
            className="tech-segmented"
            value={filter.kind}
            style={{
              marginBottom: 8,
              fontSize: '16px',
              height: '40px',
              background: '#ffffff !important'
            }}
            onChange={(value) => {
              // reset filter when switch workload kind
              const k = value as ConfigKind;
              if (k !== filter.kind) {
                setFilter({
                  kind: k,
                  selectedWorkspace: '',
                  searchText: '',
                });
              } else {
                setFilter({
                  kind: k,
                });
              }
            }}
            options={[
              {
                label: 'ConfigMap',
                value: ConfigKind.ConfigMap,
              },
              {
                label: 'Secret',
                value: ConfigKind.Secret,
              },
            ]}
          />
        </div>
        <button
          className="tech-btn-primary flex items-center space-x-2"
          onClick={onNewConfig}
        >
          <Icons.add width={16} height={16} />
          <span>
            {filter.kind === ConfigKind.ConfigMap
              ? i18nInstance.t('80e2ca37eabd710ead8581de48a54fed', '新增配置')
              : i18nInstance.t('12f9985489b76f8cd0775f5757b293d4', '新增秘钥')}
          </span>
        </button>
      </div>
      <div className={'flex flex-row space-x-4 mb-6'}>
        <h3 className={'leading-[40px] text-lg font-semibold'} style={{ color: 'var(--text-color)' }}>
          {i18nInstance.t('a4b28a416f0b6f3c215c51e79e517298', '命名空间')}
        </h3>
        <Select
          options={nsOptions}
          className={'min-w-[200px]'}
          style={{ fontSize: '16px', height: '40px' }}
          value={filter.selectedWorkspace}
          loading={isNsDataLoading}
          showSearch
          allowClear
          onChange={(v) => {
            setFilter({
              ...filter,
              selectedWorkspace: v,
            });
          }}
        />
        <Input.Search
          placeholder={i18nInstance.t(
            '6fb6674001277533ddf8fa605a981009',
            '搜索配置名称',
          )}
          className={'w-[350px] tech-search-input'}
          style={{ 
            fontSize: '16px',
            height: '40px'
          }}
          allowClear
          value={filter.searchText}
          onChange={(e) => {
            setFilter({
              ...filter,
              searchText: e.target.value,
            });
          }}
        />
      </div>
    </>
  );
};
export default QueryFilter;
