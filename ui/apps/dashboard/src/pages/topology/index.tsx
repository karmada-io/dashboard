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
import { Button } from 'antd';
import Panel from '@/components/panel';
import { TopologyGraph } from '@/components/topology';
import useNamespace from '@/hooks/use-namespace';
import { WorkloadKind } from '@/services/base';
import WorkloadFilter from '@/components/workload-filter';

const kindToApiKind: Record<string, string> = {
  [WorkloadKind.Deployment]: 'Deployment',
  [WorkloadKind.Statefulset]: 'StatefulSet',
  [WorkloadKind.Daemonset]: 'DaemonSet',
  [WorkloadKind.Job]: 'Job',
  [WorkloadKind.Cronjob]: 'CronJob',
};

const TopologyPage = () => {
  const { nsOptions, isNsDataLoading } = useNamespace({});
  const [kind, setKind] = useState<WorkloadKind>(WorkloadKind.Deployment);
  const [namespace, setNamespace] = useState('');
  const [name, setName] = useState('');
  const [query, setQuery] = useState({ namespace: '', kind: '', name: '' });

  const handleSearch = () => {
    if (namespace && kind && name) {
      setQuery({ namespace, kind: kindToApiKind[kind] || kind, name });
    }
  };

  return (
    <Panel>
      <div className="flex flex-col h-full">
        <WorkloadFilter
          kind={kind}
          namespace={namespace}
          onKindChange={(k) => setKind(k)}
          onNamespaceChange={(v) => {
            setNamespace(v);
            setName('');
          }}
          onSearch={(text) => setName(text)}
          onSearchChange={(text) => setName(text)}
          nsOptions={nsOptions}
          isNsDataLoading={isNsDataLoading}
          extra={
            <Button type="primary" onClick={handleSearch}>
              Query
            </Button>
          }
        />
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
