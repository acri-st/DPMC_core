import { useNavigate } from '@tanstack/react-router';
import { AlertCircleIcon, Loader2Icon } from 'lucide-react';

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/shared/components/ui/alert-dialog';
import { useDeletePool } from '@/features/pool/hooks/use-delete-pool';
import type { PoolDetailFE } from '@/features/pool/types';

type DeletePoolDialogProps = {
  pool: PoolDetailFE;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function DeletePoolDialog({
  pool,
  open,
  onOpenChange,
}: DeletePoolDialogProps) {
  const navigate = useNavigate();
  const deletePool = useDeletePool();

  function handleDelete() {
    deletePool.mutate(pool.id, {
      onSuccess: () => navigate({ to: '/pools' }),
    });
  }

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete pool "{pool.name}"?</AlertDialogTitle>
          <AlertDialogDescription>
            {pool.hosts.length > 0
              ? `This pool has ${pool.hosts.length} ${pool.hosts.length === 1 ? 'host' : 'hosts'}. They will be unassigned.`
              : 'This action cannot be undone.'}
          </AlertDialogDescription>
        </AlertDialogHeader>
        {deletePool.isError && (
          <p className="text-destructive flex items-center gap-1.5 text-sm">
            <AlertCircleIcon className="size-4 shrink-0" />
            {deletePool.error?.message ?? 'Failed to delete pool.'}
          </p>
        )}
        <AlertDialogFooter>
          <AlertDialogCancel disabled={deletePool.isPending}>
            Cancel
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={handleDelete}
            disabled={deletePool.isPending}
          >
            {deletePool.isPending ? (
              <Loader2Icon className="size-4 animate-spin" />
            ) : null}
            Delete
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
