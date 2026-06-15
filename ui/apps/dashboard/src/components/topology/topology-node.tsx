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
import { Button, Tooltip } from 'antd';
import { Icons } from '@/components/icons';
import type { TopologyNodeData } from './types';

const statusConfig: Record<string, { color: string; text: string }> = {
  healthy: { color: '#52c41a', text: 'Healthy' },
  progressing: { color: '#faad14', text: 'Progressing' },
  abnormal: { color: '#ff4d4f', text: 'Abnormal' },
};

const nodeTypeConfig: Record<string, { color: string; bg: string; label: string; icon: typeof Icons.deployment }> = {
  ResourceTemplate: { color: '#1677ff', bg: '#e6f4ff', label: 'Resource Template', icon: Icons.deployment },
  ResourceBinding: { color: '#722ed1', bg: '#f9f0ff', label: 'Resource Binding', icon: Icons.link },
  Work: { color: '#13c2c2', bg: '#e6fffb', label: 'Work', icon: Icons.container },
  MemberClusterWorkload: { color: '#389e0d', bg: '#f6ffed', label: 'Member Workload', icon: Icons.cloudServer },
  Pod: { color: '#d46b08', bg: '#fff7e6', label: 'Pod', icon: Icons.node },
};

function TopologyNodeComponent({ data }: NodeProps) {
  const nodeData = data as unknown as TopologyNodeData;
  const status = statusConfig[nodeData.status] || statusConfig.healthy;
  const typeConf = nodeTypeConfig[nodeData.nodeType] || nodeTypeConfig.ResourceTemplate;
  const isClickable = nodeData.nodeType === 'ResourceTemplate';
  const TypeIcon = typeConf.icon;

  return (
    <div
      style={{
        border: '1px solid #e8e8e8',
        borderLeft: `3px solid ${typeConf.color}`,
        backgroundColor: '#fff',
        borderRadius: 6,
        width: 240,
        boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
        cursor: isClickable ? 'pointer' : 'default',
        overflow: 'hidden',
        transition: 'box-shadow 0.2s',
      }}
      onMouseEnter={(e) => {
        if (isClickable) {
          (e.currentTarget as HTMLElement).style.boxShadow = '0 3px 10px rgba(22,119,255,0.12)';
        }
      }}
      onMouseLeave={(e) => {
        if (isClickable) {
          (e.currentTarget as HTMLElement).style.boxShadow = '0 1px 3px rgba(0,0,0,0.06)';
        }
      }}
    >
      <Handle type="target" position={Position.Top} style={{ visibility: 'hidden' }} />

      {/* Header — type badge + status */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '6px 12px',
        background: typeConf.bg,
        borderBottom: '1px solid #f0f0f0',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
          <TypeIcon width={13} height={13} style={{ color: typeConf.color, flexShrink: 0 }} />
          <span style={{ fontSize: 11, fontWeight: 500, color: typeConf.color, lineHeight: 1 }}>
            {typeConf.label}
          </span>
        </div>
        <Tooltip title={status.text}>
          <span style={{
            width: 7,
            height: 7,
            borderRadius: '50%',
            backgroundColor: status.color,
            display: 'inline-block',
            flexShrink: 0,
          }} />
        </Tooltip>
      </div>

      {/* Name */}
      <div style={{ padding: '10px 12px 6px' }}>
        <Tooltip title={nodeData.name}>
          <div style={{
            fontWeight: 600,
            fontSize: 13,
            color: '#262626',
            lineHeight: 1.4,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}>
            {nodeData.name}
          </div>
        </Tooltip>
      </div>

      {/* Metadata */}
      <div style={{
        padding: '0 12px 8px',
        display: 'flex',
        flexWrap: 'wrap',
        gap: 4,
        alignItems: 'center',
      }}>
        {nodeData.kind && (
          <span style={{
            fontSize: 11,
            color: '#595959',
            background: '#fafafa',
            border: '1px solid #f0f0f0',
            borderRadius: 4,
            padding: '1px 6px',
            lineHeight: '18px',
          }}>
            {nodeData.kind}
          </span>
        )}
        {nodeData.namespace && (
          <span style={{
            fontSize: 11,
            color: '#595959',
            background: '#fafafa',
            border: '1px solid #f0f0f0',
            borderRadius: 4,
            padding: '1px 6px',
            lineHeight: '18px',
          }}>
            {nodeData.namespace}
          </span>
        )}
        {nodeData.cluster && (
          <span style={{
            fontSize: 11,
            color: '#1677ff',
            background: '#e6f4ff',
            border: '1px solid #91caff',
            borderRadius: 4,
            padding: '1px 6px',
            lineHeight: '18px',
          }}>
            {nodeData.cluster}
          </span>
        )}
      </div>

      {/* Pod Actions */}
      {nodeData.nodeType === 'Pod' && (
        <div style={{
          display: 'flex',
          gap: 4,
          padding: '6px 12px 8px',
          borderTop: '1px solid #f5f5f5',
        }}>
          <Button
            size="small"
            type="text"
            icon={<Icons.post width={13} height={13} />}
            onClick={(e) => { e.stopPropagation(); nodeData.onLogClick?.(); }}
            style={{ fontSize: 11, padding: '0 6px', height: 24, color: '#595959' }}
          >
            Logs
          </Button>
          <Button
            size="small"
            type="text"
            icon={<Icons.terminal width={13} height={13} />}
            onClick={(e) => { e.stopPropagation(); nodeData.onAttachClick?.(); }}
            style={{ fontSize: 11, padding: '0 6px', height: 24, color: '#595959' }}
          >
            Attach
          </Button>
        </div>
      )}

      <Handle type="source" position={Position.Bottom} style={{ visibility: 'hidden' }} />
    </div>
  );
}

export default TopologyNodeComponent;
