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

import { useState } from 'react';
import { Button, Select, Space } from 'antd';
import Panel from '@/components/panel';
import { TopologyGraph } from '@/components/topology';
import useNamespace from '@/hooks/use-namespace';

const kindOptions = [
  { label: 'Deployment', value: 'Deployment' },
  { label: 'StatefulSet', value: 'StatefulSet' },
  { label: 'DaemonSet', value: 'DaemonSet' },
  { label: 'Job', value: 'Job' },
  { label: 'CronJob', value: 'CronJob' },
];

const TopologyPage = () => {
  const { nsOptions, isNsDataLoading } = useNamespace({});
  const [namespace, setNamespace] = useState('');
  const [kind, setKind] = useState('Deployment');
  const [name, setName] = useState('');
  const [query, setQuery] = useState({ namespace: '', kind: '', name: '' });

  const handleSearch = () => {
    if (namespace && kind && name) {
      setQuery({ namespace, kind, name });
    }
  };

  return (
    <Panel>
      <div className="flex flex-col h-full">
        <div className="mb-4">
          <Space wrap>
            <Select
              placeholder="Namespace"
              options={nsOptions}
              loading={isNsDataLoading}
              showSearch
              allowClear
              className="min-w-[180px]"
              value={namespace || undefined}
              onChange={(v) => {
                setNamespace(v || '');
                setName('');
              }}
            />
            <Select
              placeholder="Kind"
              options={kindOptions}
              className="min-w-[150px]"
              value={kind}
              onChange={(v) => setKind(v)}
            />
            <Select
              placeholder="Resource Name"
              className="min-w-[220px]"
              showSearch
              allowClear
              value={name || undefined}
              onChange={(v) => setName(v || '')}
              options={[]}
              mode={undefined}
              searchValue={name}
              onSearch={(v) => setName(v)}
              notFoundContent={null}
            />
            <Button type="primary" onClick={handleSearch}>
              Query
            </Button>
          </Space>
        </div>
        <div className="flex-1" style={{ minHeight: 500 }}>
          <TopologyGraph
            namespace={query.namespace}
            kind={query.kind}
            name={query.name}
          />
        </div>
      </div>
    </Panel>
  );
};

export default TopologyPage;
