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

import { useMemo, useState, useCallback } from 'react';
import {
  ReactFlow,
  Background,
  Controls,
  type Node,
  type Edge,
  MarkerType,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { useQuery } from '@tanstack/react-query';
import { Spin, Alert, Empty } from 'antd';
import { GetResourceTopology } from '@/services/topology';
import type { TopologyNodeData } from './types';
import TopologyNodeComponent from './topology-node';
import LabeledEdge from './labeled-edge';
import { useLayout } from './use-layout';
import WorkloadDetailDrawer from '@/pages/multicloud-resource-manage/workload/workload-detail-drawer';
import { WorkloadKind } from '@/services/base';
import PropagationPolicyEditorDrawer from '@/pages/multicloud-policy-manage/propagation-policy/propagation-policy-editor-drawer';
import OverridePolicyEditorDrawer from '@/pages/multicloud-policy-manage/override-policy/override-policy-editor-drawer';
import ResourceBindingDetailDrawer from '@/pages/multicloud-resource-manage/resource-binding/resource-binding-detail-drawer';
import WorkDetailDrawer from '@/pages/multicloud-resource-manage/work/work-detail-drawer';
import { GetResource } from '@/services/unstructured';
import { stringify } from 'yaml';

const nodeTypes = { topologyNode: TopologyNodeComponent };
const edgeTypes = { labeled: LabeledEdge };

interface TopologyGraphProps {
  namespace: string;
  kind: string;
  name: string;
}

interface PolicyDrawerState {
  open: boolean;
  name: string;
  namespace: string;
  content: string;
}

const closedPolicyDrawer: PolicyDrawerState = { open: false, name: '', namespace: '', content: '' };

interface EdgePolicyInfo {
  type: 'pp' | 'op';
  name: string;
  namespace: string;
  isClusterScope: boolean;
}

const TopologyGraph = ({ namespace, kind, name }: TopologyGraphProps) => {
  const [drawerState, setDrawerState] = useState<{
    open: boolean;
    kind: WorkloadKind;
    namespace: string;
    name: string;
  }>({ open: false, kind: '' as WorkloadKind, namespace: '', name: '' });

  const [ppDrawerState, setPpDrawerState] = useState<PolicyDrawerState>(closedPolicyDrawer);
  const [opDrawerState, setOpDrawerState] = useState<PolicyDrawerState>(closedPolicyDrawer);
  const [rbDrawerState, setRbDrawerState] = useState<PolicyDrawerState>(closedPolicyDrawer);
  const [workDrawerState, setWorkDrawerState] = useState<PolicyDrawerState>(closedPolicyDrawer);

  const onNodeClick = useCallback(async (_: React.MouseEvent, node: Node) => {
    const d = node.data as unknown as TopologyNodeData;
    if (d.nodeType === 'ResourceTemplate' && d.kind && d.namespace && d.name) {
      setDrawerState({
        open: true,
        kind: d.kind.toLowerCase() as WorkloadKind,
        namespace: d.namespace,
        name: d.name,
      });
    } else if (d.nodeType === 'ResourceBinding' && d.name) {
      try {
        const ret = await GetResource({
          kind: 'resourcebinding',
          namespace: d.namespace || '',
          name: d.name,
        });
        const content = stringify(ret.data);
        setRbDrawerState({ open: true, name: d.name, namespace: d.namespace || '', content });
      } catch (err) {
        console.error('Failed to fetch ResourceBinding detail', err);
      }
    } else if (d.nodeType === 'Work' && d.name) {
      try {
        const ret = await GetResource({
          kind: 'work',
          namespace: d.namespace || '',
          name: d.name,
        });
        const content = stringify(ret.data);
        setWorkDrawerState({ open: true, name: d.name, namespace: d.namespace || '', content });
      } catch (err) {
        console.error('Failed to fetch Work detail', err);
      }
    }
  }, []);

  const { data, isLoading, error } = useQuery({
    queryKey: ['GetResourceTopology', namespace, kind, name],
    queryFn: async () => {
      const resp = await GetResourceTopology(namespace, kind, name);
      return resp.data;
    },
    enabled: !!namespace && !!kind && !!name,
  });

  const onPolicyClick = useCallback(async (policy: EdgePolicyInfo) => {
    try {
      let resourceKind: string;
      if (policy.type === 'pp') {
        resourceKind = policy.isClusterScope ? 'clusterpropagationpolicy' : 'propagationpolicy';
      } else {
        resourceKind = policy.isClusterScope ? 'clusteroverridepolicy' : 'overridepolicy';
      }
      const ret = await GetResource({
        kind: resourceKind,
        name: policy.name,
        namespace: policy.isClusterScope ? undefined : policy.namespace,
      });
      const content = stringify(ret.data);
      if (policy.type === 'pp') {
        setPpDrawerState({ open: true, name: policy.name, namespace: policy.namespace, content });
      } else {
        setOpDrawerState({ open: true, name: policy.name, namespace: policy.namespace, content });
      }
    } catch (err) {
      console.error('Failed to fetch policy detail', err);
    }
  }, []);

  const rawNodes = useMemo<Node[]>(() => {
    if (!data?.nodes) return [];
    return data.nodes.map((n) => ({
      id: n.id,
      type: 'topologyNode',
      position: { x: 0, y: 0 },
      data: {
        label: n.name,
        nodeType: n.type,
        name: n.name,
        namespace: n.namespace,
        kind: n.kind,
        cluster: n.cluster,
        status: n.status,
      } satisfies TopologyNodeData,
    }));
  }, [data]);

  const rawEdges = useMemo<Edge[]>(() => {
    if (!data?.edges) return [];
    return data.edges.map((e, i) => {
      const policies: EdgePolicyInfo[] = [];
      if (e.data?.propagationPolicy) {
        const pp = e.data.propagationPolicy;
        policies.push({ type: 'pp', name: pp.name, namespace: pp.namespace || '', isClusterScope: pp.isClusterScope });
      }
      if (e.data?.overridePolicies) {
        for (const op of e.data.overridePolicies) {
          policies.push({ type: 'op', name: op.name, namespace: op.namespace || '', isClusterScope: op.isClusterScope });
        }
      }
      return {
        id: `edge-${i}`,
        source: e.source,
        target: e.target,
        type: 'labeled',
        animated: true,
        label: e.label || undefined,
        markerEnd: { type: MarkerType.ArrowClosed },
        data: {
          policies,
          onPolicyClick,
        },
      };
    });
  }, [data, onPolicyClick]);

  const { nodes, edges } = useLayout(rawNodes, rawEdges);

  if (isLoading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
        <Spin size="large" />
      </div>
    );
  }

  if (error) {
    return <Alert type="error" message="Failed to load topology" description={String(error)} />;
  }

  if (!data || nodes.length === 0) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
        <Empty description="No topology data" />
      </div>
    );
  }

  return (
    <>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        fitView
        nodesDraggable
        nodesConnectable={false}
        onNodeClick={onNodeClick}
        proOptions={{ hideAttribution: true }}
      >
        <Background />
        <Controls />
      </ReactFlow>
      <WorkloadDetailDrawer
        open={drawerState.open}
        kind={drawerState.kind}
        namespace={drawerState.namespace}
        name={drawerState.name}
        onClose={() => setDrawerState((s) => ({ ...s, open: false }))}
      />
      <PropagationPolicyEditorDrawer
        open={ppDrawerState.open}
        mode="detail"
        name={ppDrawerState.name}
        namespace={ppDrawerState.namespace}
        propagationContent={ppDrawerState.content}
        onClose={() => setPpDrawerState(closedPolicyDrawer)}
        onUpdate={() => {}}
        onCreate={() => {}}
      />
      <OverridePolicyEditorDrawer
        open={opDrawerState.open}
        mode="detail"
        name={opDrawerState.name}
        namespace={opDrawerState.namespace}
        overrideContent={opDrawerState.content}
        onClose={() => setOpDrawerState(closedPolicyDrawer)}
        onUpdate={() => {}}
        onCreate={() => {}}
      />
      <ResourceBindingDetailDrawer
        open={rbDrawerState.open}
        name={rbDrawerState.name}
        namespace={rbDrawerState.namespace}
        content={rbDrawerState.content}
        onClose={() => setRbDrawerState(closedPolicyDrawer)}
      />
      <WorkDetailDrawer
        open={workDrawerState.open}
        name={workDrawerState.name}
        namespace={workDrawerState.namespace}
        content={workDrawerState.content}
        onClose={() => setWorkDrawerState(closedPolicyDrawer)}
      />
    </>
  );
};

export default TopologyGraph;
