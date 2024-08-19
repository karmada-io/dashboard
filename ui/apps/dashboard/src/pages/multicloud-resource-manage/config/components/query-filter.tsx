import { Button, Input, Segmented, Select } from 'antd';
import { Icons } from '@/components/icons';
import { FC } from 'react';
import { FilterState } from '../types';
import { ConfigKind } from '@/services/base.ts';

interface QueryFilterProps {
  filter: FilterState;
  setFilter: (d: Partial<FilterState>) => void;
  onNewConfig: () => void;
  nsOptions: { title: string; value: string }[];
  isNsDataLoading: boolean;
}

const QueryFilter: FC<QueryFilterProps> = (props) => {
  const { filter, setFilter, onNewConfig, nsOptions, isNsDataLoading } = props;
  return (
    <>
      <div className={'flex flex-row justify-between mb-4'}>
        <div>
          <Segmented
            value={filter.kind}
            style={{ marginBottom: 8 }}
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
        <Button
          type={'primary'}
          icon={<Icons.add width={16} height={16} />}
          className="flex flex-row items-center"
          onClick={onNewConfig}
        >
          新增配置
        </Button>
      </div>
      <div className={'flex flex-row space-x-4 mb-4'}>
        <h3 className={'leading-[32px]'}>命名空间</h3>
        <Select
          options={nsOptions}
          className={'min-w-[200px]'}
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
          placeholder={'按名称搜索'}
          className={'w-[300px]'}
          value={filter.searchText}
          onChange={(e) => {
            const input = e.currentTarget.value;
            setFilter({
              ...filter,
              searchText: input,
            });
          }}
          onPressEnter={(e) => {
            const input = e.currentTarget.value;
            setFilter({
              ...filter,
              searchText: input,
            });
          }}
        />
      </div>
    </>
  );
};

export default QueryFilter;
