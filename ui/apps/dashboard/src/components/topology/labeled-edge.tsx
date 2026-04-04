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
import {
  getSmoothStepPath,
  EdgeLabelRenderer,
  Position,
  type EdgeProps,
} from '@xyflow/react';
import { Tag } from 'antd';

interface PolicyInfo {
  type: 'pp' | 'op';
  name: string;
  namespace: string;
  isClusterScope: boolean;
}

interface LabeledEdgeData {
  policies?: PolicyInfo[];
  onPolicyClick?: (policy: PolicyInfo) => void;
}

// Parse label text like "PP: my-policy" or "OP: op1, COP: op2"
function parsePolicyLabel(label: string): { type: string; name: string }[] {
  const regex = /(CPP|PP|COP|OP):\s*([^,]+)/g;
  const entries: { type: string; name: string }[] = [];
  let match;
  while ((match = regex.exec(label)) !== null) {
    entries.push({ type: match[1], name: match[2].trim() });
  }
  return entries;
}

function getTagColor(type: string): string {
  if (type === 'pp' || type === 'PP' || type === 'CPP') return 'blue';
  return 'purple';
}

function getTagLabel(policy: PolicyInfo): string {
  if (policy.type === 'pp') return policy.isClusterScope ? 'CPP' : 'PP';
  return policy.isClusterScope ? 'COP' : 'OP';
}

function PolicyCard({
  tagLabel,
  tagColor,
  name,
  clickable,
  onClick,
}: {
  tagLabel: string;
  tagColor: string;
  name: string;
  clickable: boolean;
  onClick?: () => void;
}) {
  const [hovered, setHovered] = useState(false);

  return (
    <div
      style={{
        background: '#fff',
        border: `1px solid ${hovered && clickable ? '#1677ff' : '#e8e8e8'}`,
        borderRadius: 6,
        padding: '4px 8px',
        boxShadow:
          hovered && clickable
            ? '0 3px 10px rgba(22,119,255,0.12)'
            : '0 2px 6px rgba(0,0,0,0.06)',
        cursor: clickable ? 'pointer' : 'default',
        transition: 'border-color 0.2s, box-shadow 0.2s',
        display: 'flex',
        alignItems: 'center',
        gap: 6,
        whiteSpace: 'nowrap' as const,
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onClick={(e) => {
        if (clickable && onClick) {
          e.stopPropagation();
          onClick();
        }
      }}
    >
      <Tag
        color={tagColor}
        style={{ margin: 0, fontSize: 10, lineHeight: '18px', padding: '0 4px' }}
      >
        {tagLabel}
      </Tag>
      <span style={{ fontSize: 12, color: '#262626' }}>{name}</span>
    </div>
  );
}

function LabeledEdge({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  label,
  markerEnd,
  style,
  data,
}: EdgeProps) {
  const edgeData = data as unknown as LabeledEdgeData | undefined;
  const policies = edgeData?.policies || [];
  const onPolicyClick = edgeData?.onPolicyClick;

  const [edgePath, labelX, labelY] = getSmoothStepPath({
    sourceX,
    sourceY,
    targetX,
    targetY,
    sourcePosition: Position.Bottom,
    targetPosition: Position.Top,
    borderRadius: 0,
  });

  const labelStr = typeof label === 'string' ? label : '';
  const parsed = labelStr ? parsePolicyLabel(labelStr) : [];
  const hasPolicyCards = policies.length > 0 && parsed.length > 0;

  return (
    <>
      <path
        id={id}
        className="react-flow__edge-path"
        d={edgePath}
        markerEnd={markerEnd}
        style={{ ...style, strokeWidth: 1.5 }}
      />
      {label && (
        <EdgeLabelRenderer>
          {hasPolicyCards ? (
            <div
              style={{
                position: 'absolute',
                transform: `translate(${labelX + 8}px, ${labelY - 8}px)`,
                pointerEvents: 'all',
                display: 'flex',
                flexDirection: 'column',
                gap: 6,
              }}
              className="nodrag nopan"
            >
              {policies.map((policy, idx) => (
                <PolicyCard
                  key={idx}
                  tagLabel={getTagLabel(policy)}
                  tagColor={getTagColor(policy.type)}
                  name={policy.name}
                  clickable={!!onPolicyClick}
                  onClick={() => onPolicyClick?.(policy)}
                />
              ))}
            </div>
          ) : (
            <div
              style={{
                position: 'absolute',
                transform: `translate(${labelX + 8}px, ${labelY - 8}px)`,
                fontSize: 11,
                color: '#595959',
                background: 'rgba(255,255,255,0.85)',
                padding: '2px 6px',
                borderRadius: 4,
                pointerEvents: 'all',
                whiteSpace: 'nowrap',
              }}
              className="nodrag nopan"
            >
              {label}
            </div>
          )}
        </EdgeLabelRenderer>
      )}
    </>
  );
}

export default LabeledEdge;
