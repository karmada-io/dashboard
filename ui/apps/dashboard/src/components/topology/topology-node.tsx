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

import { Handle, Position, type NodeProps } from '@xyflow/react';
import { Tag } from 'antd';
import type { TopologyNodeData } from './types';

const statusColorMap: Record<string, { border: string; bg: string; tag: string; text: string }> = {
  healthy: { border: '#52c41a', bg: '#f6ffed', tag: 'success', text: 'Healthy' },
  progressing: { border: '#faad14', bg: '#fffbe6', tag: 'warning', text: 'Progressing' },
  abnormal: { border: '#ff4d4f', bg: '#fff2f0', tag: 'error', text: 'Abnormal' },
};

const nodeTypeLabels: Record<string, string> = {
  ResourceTemplate: 'Resource Template',
  ResourceBinding: 'Resource Binding',
  Work: 'Work',
  MemberClusterWorkload: 'Member Workload',
  Pod: 'Pod',
};

function TopologyNodeComponent({ data }: NodeProps) {
  const nodeData = data as unknown as TopologyNodeData;
  const colors = statusColorMap[nodeData.status] || statusColorMap.healthy;
  const isClickable = nodeData.nodeType === 'ResourceTemplate';

  return (
    <div
      style={{
        border: `2px solid ${colors.border}`,
        backgroundColor: colors.bg,
        borderRadius: 8,
        padding: '12px 16px',
        width: 240,
        boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
        cursor: isClickable ? 'pointer' : 'default',
      }}
    >
      <Handle type="target" position={Position.Top} style={{ visibility: 'hidden' }} />
      <div style={{ marginBottom: 4, fontSize: 11, color: '#8c8c8c' }}>
        {nodeTypeLabels[nodeData.nodeType] || nodeData.nodeType}
      </div>
      <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 6 }}>
        {nodeData.name}
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
        <Tag color={colors.tag}>{colors.text}</Tag>
        {nodeData.kind && <Tag>{nodeData.kind}</Tag>}
        {nodeData.cluster && <Tag color="blue">{nodeData.cluster}</Tag>}
        {nodeData.namespace && (
          <Tag color="default" style={{ fontSize: 11 }}>
            {nodeData.namespace}
          </Tag>
        )}
      </div>
      <Handle type="source" position={Position.Bottom} style={{ visibility: 'hidden' }} />
    </div>
  );
}

export default TopologyNodeComponent;
