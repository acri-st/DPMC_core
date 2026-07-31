import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

import type { DependencyMode } from '@dpmc/client';
import { productionChainGraphKey } from '@/features/production-chain/hooks/use-production-chain-graph';
import {
  addEdge,
  addProcessingChain,
  deleteEdge,
  deleteProcessingChain,
  updateEdge,
  updateProcessingChain,
  updateProductionChain,
} from '@/features/production-chain/services/production-chain.service';

export function useChainEditor(chainId: string) {
  const queryClient = useQueryClient();
  const invalidate = () =>
    queryClient.invalidateQueries({
      queryKey: productionChainGraphKey(chainId),
    });
  const onError = (e: Error) => toast.error(e.message);

  // Success toasts are intentional only for palette add / node removal — these
  // place or remove a node elsewhere on the auto-laid-out canvas, so a toast
  // confirms them. Edge create/edit and rename are immediately visible on the
  // canvas (edge drawn/restyled, label updated), so they skip the toast noise.
  const addNode = useMutation({
    mutationFn: (input: { processingScriptId: number; name: string }) =>
      addProcessingChain(chainId, input),
    onSuccess: () => {
      toast.success('Node added');
      void invalidate();
    },
    onError,
  });

  const renameNode = useMutation({
    mutationFn: (input: { pcId: string; name: string }) =>
      updateProcessingChain(chainId, input.pcId, { name: input.name }),
    onSuccess: () => void invalidate(),
    onError,
  });

  const removeNode = useMutation({
    mutationFn: (pcId: string) => deleteProcessingChain(chainId, pcId),
    onSuccess: () => {
      toast.success('Node removed');
      void invalidate();
    },
    onError,
  });

  const createEdge = useMutation({
    mutationFn: (input: { parentChainId: number; childChainId: number }) =>
      addEdge(chainId, input),
    onSuccess: () => void invalidate(),
    onError,
  });

  const editEdge = useMutation({
    mutationFn: (input: {
      edgeId: string;
      dependencyMode?: DependencyMode;
      isFanOut?: boolean;
    }) =>
      updateEdge(chainId, input.edgeId, {
        dependencyMode: input.dependencyMode,
        isFanOut: input.isFanOut,
      }),
    onSuccess: () => void invalidate(),
    onError,
  });

  const removeEdge = useMutation({
    mutationFn: (edgeId: string) => deleteEdge(chainId, edgeId),
    onSuccess: () => void invalidate(),
    onError,
  });

  const saveParameters = useMutation({
    mutationFn: (configuration: Record<string, unknown>) =>
      updateProductionChain(chainId, { configuration }),
    onSuccess: () => {
      toast.success('Parameters saved');
      void invalidate();
    },
    onError,
  });

  const isMutating =
    addNode.isPending ||
    renameNode.isPending ||
    removeNode.isPending ||
    createEdge.isPending ||
    editEdge.isPending ||
    removeEdge.isPending ||
    saveParameters.isPending;

  return {
    addNode,
    renameNode,
    removeNode,
    createEdge,
    editEdge,
    removeEdge,
    saveParameters,
    isMutating,
  };
}
