import { useState } from 'react';
import { Link, useParams } from '@tanstack/react-router';
import {
  AlertCircleIcon,
  ArrowLeftIcon,
  InfoIcon,
  Loader2Icon,
  PlusIcon,
  ScrollTextIcon,
  WorkflowIcon,
} from 'lucide-react';
import { toast } from 'sonner';

import { Badge } from '@/shared/components/ui/badge';
import { Button } from '@/shared/components/ui/button';
import { ProductionChainGraph } from '@/features/production-chain/components/production-chain-graph';
import { ChainParametersDrawer } from '@/features/production-chain/components/chain-parameters-drawer';
import { ChainMetadataDrawer } from '@/features/production-chain/components/chain-metadata-drawer';
import { NodeDrawer } from '@/features/production-chain/components/node-drawer';
import { useProductionChainGraph } from '@/features/production-chain/hooks/use-production-chain-graph';

export function ProductionChainDetailPage() {
  const { id } = useParams({ from: '/production-chain/$id' });
  const [metadataOpen, setMetadataOpen] = useState(false);
  const [paramsOpen, setParamsOpen] = useState(false);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const { data, isLoading, isError, error } = useProductionChainGraph(id);

  const selectedNode =
    data?.scripts.find((s) => s.id === selectedNodeId) ?? null;
  const paramCount = countParams(data?.configuration ?? null);

  const onComingSoon = (label: string) =>
    toast.info(`${label}: editor coming soon`);

  return (
    <div className="flex flex-1 flex-col gap-3">
      <div className="flex flex-wrap items-center gap-3">
        <Button variant="ghost" size="sm" asChild>
          <Link to="/production-chain">
            <ArrowLeftIcon />
            Back
          </Link>
        </Button>
        {data ? (
          <>
            <div className="min-w-0 flex-1">
              <h1 className="truncate text-lg font-semibold leading-tight">
                {data.name}
              </h1>
              {data.comment ? (
                <p className="text-muted-foreground line-clamp-1 text-xs">
                  {data.comment}
                </p>
              ) : null}
            </div>
            <div className="text-muted-foreground flex shrink-0 flex-wrap items-center gap-2 text-[11px]">
              <Badge variant="outline" className="gap-1">
                <WorkflowIcon className="size-3" />
                {data.scripts.length} chain
                {data.scripts.length === 1 ? '' : 's'}
              </Badge>
              <Badge variant="outline">
                {data.edges.length} edge{data.edges.length === 1 ? '' : 's'}
              </Badge>
            </div>
          </>
        ) : null}
      </div>

      {isLoading ? (
        <div className="flex flex-1 items-center justify-center rounded-md border">
          <div className="text-muted-foreground flex items-center gap-2 text-sm">
            <Loader2Icon className="size-4 animate-spin" />
            Loading graph…
          </div>
        </div>
      ) : null}

      {isError ? (
        <div className="text-destructive flex items-start gap-2 rounded-md border p-4 text-sm">
          <AlertCircleIcon className="size-4 shrink-0" />
          <span>{error?.message ?? 'Failed to load production chain'}</span>
        </div>
      ) : null}

      {data ? (
        <>
          <div className="bg-muted/20 relative h-[calc(100vh-160px)] min-h-[520px] overflow-hidden rounded-md border">
            <ProductionChainGraph
              graph={data}
              onNodeClick={(nodeId) => setSelectedNodeId(nodeId)}
            />
            <div className="absolute left-2 top-2 z-10 flex flex-wrap gap-2">
              <Button
                size="sm"
                variant="outline"
                className="bg-card/80 backdrop-blur"
                onClick={() => setMetadataOpen(true)}
              >
                <InfoIcon />
                Metadata
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="bg-card/80 backdrop-blur"
                onClick={() => setParamsOpen(true)}
              >
                <ScrollTextIcon />
                Parameters
                {paramCount > 0 ? (
                  <Badge variant="secondary" className="ml-1 text-[10px]">
                    {paramCount}
                  </Badge>
                ) : null}
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="bg-card/80 backdrop-blur"
                onClick={() => onComingSoon('Add ProcessingChain')}
              >
                <PlusIcon /> Chain
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="bg-card/80 backdrop-blur"
                onClick={() => onComingSoon('Add Edge')}
              >
                <PlusIcon /> Edge
              </Button>
            </div>
          </div>

          <ChainMetadataDrawer
            open={metadataOpen}
            onOpenChange={setMetadataOpen}
            chain={data}
          />
          <ChainParametersDrawer
            open={paramsOpen}
            onOpenChange={setParamsOpen}
            configuration={data.configuration}
          />
          <NodeDrawer
            node={selectedNode}
            onOpenChange={(open) => {
              if (!open) setSelectedNodeId(null);
            }}
          />
        </>
      ) : null}
    </div>
  );
}

function countParams(configuration: Record<string, unknown> | null): number {
  if (!configuration) return 0;
  const raw = (configuration as { parameters?: unknown }).parameters;
  return Array.isArray(raw) ? raw.length : 0;
}
