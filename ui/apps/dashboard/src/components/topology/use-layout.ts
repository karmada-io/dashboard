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

import { useMemo } from 'react';
import dagre from 'dagre';
import type { Node, Edge } from '@xyflow/react';

const NODE_WIDTH = 240;
const NODE_HEIGHT = 90;
const SIBLING_GAP = 60;

function centerChildren(nodes: Node[], edges: Edge[]): Node[] {
  // Build parent -> children mapping
  const childrenOf = new Map<string, string[]>();
  for (const e of edges) {
    const list = childrenOf.get(e.source) || [];
    list.push(e.target);
    childrenOf.set(e.source, list);
  }

  const nodeMap = new Map(nodes.map((n) => [n.id, n]));
  const result = nodes.map((n) => ({ ...n, position: { ...n.position } }));

  for (const [parentId, childIds] of childrenOf) {
    if (childIds.length <= 1) continue;

    const parent = nodeMap.get(parentId);
    if (!parent) continue;

    const parentCenterX = parent.position.x + NODE_WIDTH / 2;

    // Get children, preserving left-to-right order
    const children = childIds
      .map((id) => result.find((n) => n.id === id))
      .filter((n): n is Node => !!n)
      .sort((a, b) => a.position.x - b.position.x);

    // Compute total group width and center the group under the parent
    const totalWidth = children.length * NODE_WIDTH + (children.length - 1) * SIBLING_GAP;
    const startX = parentCenterX - totalWidth / 2;

    children.forEach((child, i) => {
      child.position = {
        ...child.position,
        x: startX + i * (NODE_WIDTH + SIBLING_GAP),
      };
    });
  }

  return result;
}

export function useLayout(nodes: Node[], edges: Edge[]) {
  return useMemo(() => {
    if (nodes.length === 0) return { nodes: [], edges };

    const g = new dagre.graphlib.Graph();
    g.setDefaultEdgeLabel(() => ({}));
    g.setGraph({ rankdir: 'TB', nodesep: 60, ranksep: 130, marginx: 80, marginy: 60 });

    nodes.forEach((node) => {
      g.setNode(node.id, { width: NODE_WIDTH, height: NODE_HEIGHT });
    });
    edges.forEach((edge) => {
      g.setEdge(edge.source, edge.target);
    });

    dagre.layout(g);

    const layoutedNodes = nodes.map((node) => {
      const pos = g.node(node.id);
      return {
        ...node,
        position: {
          x: pos.x - NODE_WIDTH / 2,
          y: pos.y - NODE_HEIGHT / 2,
        },
      };
    });

    // Center sibling groups under their parent node
    const centeredNodes = centerChildren(layoutedNodes, edges);

    return { nodes: centeredNodes, edges };
  }, [nodes, edges]);
}
