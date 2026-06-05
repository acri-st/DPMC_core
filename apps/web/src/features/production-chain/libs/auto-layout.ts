import dagre from '@dagrejs/dagre';
import type { Edge, Node } from '@xyflow/react';

/**
 * Lay out a directed graph using dagre with a left-to-right flow.
 * Returns the input nodes/edges with computed positions.
 */
export function layoutGraph<
  TData extends Record<string, unknown> = Record<string, unknown>,
>(
  nodes: Node<TData>[],
  edges: Edge[],
  options: {
    rankdir?: 'LR' | 'TB';
    nodeWidth?: number;
    nodeHeight?: number;
  } = {},
): { nodes: Node<TData>[]; edges: Edge[] } {
  const { rankdir = 'LR', nodeWidth = 288, nodeHeight = 168 } = options;
  const g = new dagre.graphlib.Graph();
  g.setGraph({ rankdir, nodesep: 32, ranksep: 64, marginx: 24, marginy: 24 });
  g.setDefaultEdgeLabel(() => ({}));

  for (const n of nodes) {
    g.setNode(n.id, { width: nodeWidth, height: nodeHeight });
  }
  for (const e of edges) {
    g.setEdge(e.source, e.target);
  }

  dagre.layout(g);

  const laidOutNodes = nodes.map((n) => {
    const pos = g.node(n.id);
    if (!pos) return n;
    return {
      ...n,
      position: {
        x: pos.x - nodeWidth / 2,
        y: pos.y - nodeHeight / 2,
      },
    };
  });

  return { nodes: laidOutNodes, edges };
}
