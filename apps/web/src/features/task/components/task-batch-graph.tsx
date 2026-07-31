import { useEffect, useMemo } from 'react';
import { useNavigate } from '@tanstack/react-router';
import {
  Background,
  BackgroundVariant,
  Controls,
  Handle,
  MarkerType,
  Position,
  ReactFlow,
  ReactFlowProvider,
  useEdgesState,
  useNodesState,
  useReactFlow,
  type Edge,
  type Node,
  type NodeProps,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { AlertCircleIcon, Loader2Icon } from 'lucide-react';
import type { BatchStatus } from '@dpmc/client';

import { Badge } from '@/shared/components/ui/badge';
import { cn } from '@/shared/utils';
import { useResolvedTheme } from '@/shared/components/theme-applier';
import { BatchStatusBadge } from '@/features/batch/components/batch-status-badge';
import { useProductionChainGraph } from '@/features/production-chain/hooks/use-production-chain-graph';
import { layoutGraph } from '@/features/production-chain/libs/auto-layout';
import type { ProductionChainGraphEdge } from '@/features/production-chain/types';
import type { TaskBatch } from '@/features/task/services/task.service';

const NODE_WIDTH = 224;
const NODE_HEIGHT = 72;

const EDGE_STROKE: Record<
  ProductionChainGraphEdge['dependencyMode'],
  { stroke: string; dashed: boolean }
> = {
  OnSuccess: { stroke: 'oklch(0.6 0.18 150)', dashed: false },
  OnFailure: { stroke: 'oklch(0.6 0.22 25)', dashed: false },
  OnCompletion: { stroke: 'oklch(0.65 0 0)', dashed: false },
  OnDataAvailable: { stroke: 'oklch(0.6 0.15 230)', dashed: false },
  Optional: { stroke: 'oklch(0.65 0 0)', dashed: true },
};

const STATUS_BORDER: Record<BatchStatus, string> = {
  Pending: 'border-slate-300 dark:border-slate-700',
  Running: 'border-sky-400',
  Success: 'border-emerald-400',
  Failed: 'border-rose-400',
  Cancelled: 'border-amber-400',
};

type BatchNodeData = {
  batch: TaskBatch;
  [key: string]: unknown;
};

function BatchFlowNode({ data }: NodeProps & { data: BatchNodeData }) {
  const { batch } = data;
  const primary = batch.scripts[0];
  return (
    <div
      className={cn(
        'bg-card w-56 cursor-pointer rounded-md border-2 px-3 py-2 shadow-sm',
        STATUS_BORDER[batch.status],
      )}
    >
      <Handle type="target" position={Position.Left} className="!bg-border" />
      <div className="flex items-center gap-2">
        {primary ? (
          <Badge variant="secondary" className="font-mono text-[10px]">
            {primary.acronym}
          </Badge>
        ) : null}
        <span className="text-muted-foreground ml-auto font-mono text-[10px]">
          {String(batch.id).slice(0, 8)}
        </span>
      </div>
      <div className="mt-1.5 flex items-center justify-between gap-2">
        <span className="truncate text-xs font-medium">
          {primary?.name ?? '—'}
        </span>
        <BatchStatusBadge status={batch.status} />
      </div>
      <Handle type="source" position={Position.Right} className="!bg-border" />
    </div>
  );
}

const NODE_TYPES = { batch: BatchFlowNode };

type TaskBatchGraphProps = {
  productionChainId: number;
  batches: TaskBatch[];
};

export function TaskBatchGraph(props: TaskBatchGraphProps) {
  return (
    <ReactFlowProvider>
      <TaskBatchGraphInner {...props} />
    </ReactFlowProvider>
  );
}

function TaskBatchGraphInner({
  productionChainId,
  batches,
}: TaskBatchGraphProps) {
  const navigate = useNavigate();
  const resolvedTheme = useResolvedTheme();
  const chain = useProductionChainGraph(String(productionChainId));

  const initial = useMemo(() => {
    if (!chain.data) return { nodes: [], edges: [] };

    const nodes: Node<BatchNodeData>[] = batches.map((b) => ({
      id: String(b.id),
      type: 'batch',
      position: { x: 0, y: 0 },
      data: { batch: b },
    }));

    // A fan-out task builds one chain instance per input product; batches of
    // one instance share an executionTag, so the chain edges are replayed
    // inside each tag group to connect that instance's batches.
    const byTagAndNode = new Map<string, number>();
    for (const b of batches) {
      if (b.processingChainId == null) continue;
      byTagAndNode.set(`${b.executionTag}:${b.processingChainId}`, b.id);
    }
    const tags = [...new Set(batches.map((b) => b.executionTag))];
    const edges: Edge[] = [];
    for (const edge of chain.data.edges) {
      const tone = EDGE_STROKE[edge.dependencyMode];
      for (const tag of tags) {
        const source = byTagAndNode.get(`${tag}:${edge.source}`);
        const target = byTagAndNode.get(`${tag}:${edge.target}`);
        if (source === undefined || target === undefined) continue;
        const targetBatch = batches.find((b) => b.id === target);
        edges.push({
          id: `${tag}:${edge.id}`,
          source: String(source),
          target: String(target),
          type: 'smoothstep',
          animated: targetBatch?.status === 'Running',
          style: {
            stroke: tone.stroke,
            strokeWidth: 2,
            strokeDasharray: tone.dashed ? '6 4' : undefined,
          },
          markerEnd: { type: MarkerType.ArrowClosed, color: tone.stroke },
        });
      }
    }
    return layoutGraph(nodes, edges, {
      nodeWidth: NODE_WIDTH,
      nodeHeight: NODE_HEIGHT,
    });
  }, [chain.data, batches]);

  const [nodes, setNodes, onNodesChange] = useNodesState(initial.nodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initial.edges);
  const { fitView } = useReactFlow();

  useEffect(() => {
    setNodes(initial.nodes);
    setEdges(initial.edges);
    requestAnimationFrame(() => {
      fitView({ padding: 0.2, duration: 250 });
    });
  }, [initial, setNodes, setEdges, fitView]);

  if (chain.isLoading) {
    return (
      <div className="text-muted-foreground flex h-64 items-center justify-center gap-2 text-sm">
        <Loader2Icon className="size-3.5 animate-spin" />
        Loading chain graph…
      </div>
    );
  }
  if (chain.isError) {
    return (
      <div className="text-destructive flex items-start gap-2 p-4 text-sm">
        <AlertCircleIcon className="size-4 shrink-0" />
        <span>{chain.error?.message ?? 'Failed to load the chain graph'}</span>
      </div>
    );
  }

  return (
    <div className="h-[26rem] rounded-md border">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onNodeClick={(_, node) =>
          void navigate({ to: '/batches/$id', params: { id: node.id } })
        }
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
        <Controls position="bottom-left" showInteractive={false} />
      </ReactFlow>
    </div>
  );
}
