import { useCallback, useEffect, useMemo } from 'react';
import {
  Background,
  BackgroundVariant,
  Controls,
  MarkerType,
  Panel,
  ReactFlow,
  ReactFlowProvider,
  useEdgesState,
  useNodesState,
  useReactFlow,
  type Edge,
  type Node,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { LayoutGridIcon, MaximizeIcon } from 'lucide-react';

import { useResolvedTheme } from '@/shared/components/theme-applier';

import { Button } from '@/shared/components/ui/button';
import { layoutGraph } from '@/features/production-chain/libs/auto-layout';
import {
  ScriptFlowNode,
  type ScriptNodeData,
} from '@/features/production-chain/components/script-node';
import type {
  ProductionChainGraph,
  ProductionChainGraphEdge,
} from '@/features/production-chain/types';

const NODE_TYPES = {
  script: ScriptFlowNode,
};

const EDGE_STYLE: Record<
  ProductionChainGraphEdge['dependencyMode'] | 'FanOut',
  { stroke: string; dashed: boolean }
> = {
  OnSuccess: { stroke: 'oklch(0.6 0.18 150)', dashed: false },
  OnFailure: { stroke: 'oklch(0.6 0.22 25)', dashed: false },
  Optional: { stroke: 'oklch(0.65 0 0)', dashed: true },
  OnCompletion: { stroke: 'oklch(0.65 0 0)', dashed: false },
  OnDataAvailable: { stroke: 'oklch(0.65 0 0)', dashed: false },
  FanOut: { stroke: 'oklch(0.6 0.2 290)', dashed: true },
};

type ProductionChainGraphProps = {
  graph: ProductionChainGraph;
  onNodeClick?: (nodeId: string) => void;
};

export function ProductionChainGraph(props: ProductionChainGraphProps) {
  return (
    <ReactFlowProvider>
      <ProductionChainGraphInner {...props} />
    </ReactFlowProvider>
  );
}

function ProductionChainGraphInner({
  graph,
  onNodeClick,
}: ProductionChainGraphProps) {
  const resolvedTheme = useResolvedTheme();

  const initial = useMemo(() => buildInitialGraph(graph), [graph]);

  const [nodes, setNodes, onNodesChange] = useNodesState(initial.nodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initial.edges);
  const { fitView } = useReactFlow();

  // Reset graph when the underlying chain changes.
  useEffect(() => {
    setNodes(initial.nodes);
    setEdges(initial.edges);
    requestAnimationFrame(() => {
      fitView({ padding: 0.2, duration: 250 });
    });
  }, [initial, setNodes, setEdges, fitView]);

  const handleAutoLayout = useCallback(() => {
    setNodes((current) => {
      const laid = layoutGraph(current, edges);
      requestAnimationFrame(() => {
        fitView({ padding: 0.2, duration: 250 });
      });
      return laid.nodes;
    });
  }, [edges, fitView, setNodes]);

  const handleRecenter = useCallback(() => {
    fitView({ padding: 0.2, duration: 250 });
  }, [fitView]);

  return (
    <ReactFlow
      nodes={nodes}
      edges={edges}
      onNodesChange={onNodesChange}
      onEdgesChange={onEdgesChange}
      onNodeClick={(_, node) => onNodeClick?.(node.id)}
      nodeTypes={NODE_TYPES}
      fitView
      fitViewOptions={{ padding: 0.2 }}
      minZoom={0.2}
      maxZoom={1.5}
      nodesDraggable
      nodesConnectable={false}
      proOptions={{ hideAttribution: true }}
      colorMode={resolvedTheme === 'dark' ? 'dark' : 'light'}
    >
      <Background variant={BackgroundVariant.Dots} gap={16} size={1} />
      <Controls position="bottom-left" />
      <Panel
        position="bottom-right"
        className="flex flex-col gap-1.5 rounded-md border bg-card p-2 shadow-sm text-[11px]"
      >
        <LegendRow color="oklch(0.6 0.18 150)" label="On success" />
        <LegendRow color="oklch(0.6 0.22 25)" label="On failure" />
        <LegendRow color="oklch(0.6 0.2 290)" label="Fan-out" dashed />
      </Panel>
      <Panel position="top-right" className="flex items-center gap-2">
        <Button
          size="sm"
          variant="secondary"
          onClick={handleAutoLayout}
          className="shadow-sm"
        >
          <LayoutGridIcon />
          Auto layout
        </Button>
        <Button
          size="sm"
          variant="secondary"
          onClick={handleRecenter}
          className="shadow-sm"
        >
          <MaximizeIcon />
          Fit view
        </Button>
      </Panel>
    </ReactFlow>
  );
}

function LegendRow({
  color,
  label,
  dashed,
}: {
  color: string;
  label: string;
  dashed?: boolean;
}) {
  return (
    <div className="flex items-center gap-2">
      <svg width="24" height="10">
        <line
          x1="0"
          y1="5"
          x2="24"
          y2="5"
          stroke={color}
          strokeWidth="2"
          strokeDasharray={dashed ? '4 3' : undefined}
        />
      </svg>
      <span className="text-muted-foreground">{label}</span>
    </div>
  );
}

function buildInitialGraph(graph: ProductionChainGraph): {
  nodes: Node<ScriptNodeData>[];
  edges: Edge[];
} {
  const rawNodes: Node<ScriptNodeData>[] = graph.scripts.map((script) => ({
    id: script.id,
    type: 'script',
    position: { x: 0, y: 0 },
    data: script,
  }));
  const rawEdges: Edge[] = graph.edges.map((edge) => {
    const styleKey = edge.isFanOut ? 'FanOut' : edge.dependencyMode;
    const tone = EDGE_STYLE[styleKey];
    return {
      id: edge.id,
      source: edge.source,
      target: edge.target,
      type: 'smoothstep',
      animated: !edge.isFanOut && edge.dependencyMode === 'OnSuccess',
      label: edge.isFanOut ? '×N' : undefined,
      labelStyle: edge.isFanOut
        ? { fill: tone.stroke, fontWeight: 600, fontSize: 12 }
        : undefined,
      style: {
        stroke: tone.stroke,
        strokeWidth: edge.isFanOut ? 2.5 : 2,
        strokeDasharray: tone.dashed ? '6 4' : undefined,
      },
      markerEnd: { type: MarkerType.ArrowClosed, color: tone.stroke },
      data: { dependencyMode: edge.dependencyMode, isFanOut: edge.isFanOut },
    };
  });
  return layoutGraph(rawNodes, rawEdges);
}
