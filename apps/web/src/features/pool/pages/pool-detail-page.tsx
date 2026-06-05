import { useState } from 'react';
import { Link, useNavigate, useParams } from '@tanstack/react-router';
import {
  AlertCircleIcon,
  ArrowLeftIcon,
  Loader2Icon,
  PencilIcon,
  PlusIcon,
  ServerIcon,
  Trash2Icon,
  XIcon,
} from 'lucide-react';

import { Badge } from '@/shared/components/ui/badge';
import { Button } from '@/shared/components/ui/button';
import { Card, CardHeader, CardTitle } from '@/shared/components/ui/card';
import { DataTable } from '@/shared/components/data-table';
import { ViewModeToggle } from '@/shared/components/view-mode-toggle';
import { useViewMode } from '@/shared/hooks/use-view-mode';
import { HostCard } from '@/features/host/components/host-card';
import { buildHostColumns } from '@/features/host/components/host-columns';
import { EditPoolDialog } from '@/features/pool/components/edit-pool-dialog';
import { DeletePoolDialog } from '@/features/pool/components/delete-pool-dialog';
import { AddHostsDialog } from '@/features/pool/components/add-hosts-dialog';
import { usePool } from '@/features/pool/hooks/use-pool';
import { useRemoveHostFromPool } from '@/features/pool/hooks/use-remove-host-from-pool';

function RemoveHostButton({
  poolId,
  hostId,
}: {
  poolId: number;
  hostId: number;
}) {
  const removeHost = useRemoveHostFromPool(poolId);
  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      aria-label="Remove from pool"
      className="text-muted-foreground hover:text-destructive bg-card absolute top-2 right-2 size-7"
      onClick={() => removeHost.mutate(hostId)}
      disabled={removeHost.isPending}
    >
      {removeHost.isPending ? (
        <Loader2Icon className="size-3.5 animate-spin" />
      ) : (
        <XIcon className="size-3.5" />
      )}
    </Button>
  );
}

export function PoolDetailPage() {
  const { id: idParam } = useParams({ from: '/pools/$id' });
  const id = Number(idParam);
  const navigate = useNavigate();
  const [viewMode, setViewMode] = useViewMode('pool-hosts', 'list');
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [addHostsOpen, setAddHostsOpen] = useState(false);

  const { data, isLoading, isError, error } = usePool(id);

  const goToHost = (hostId: number) =>
    navigate({ to: '/hosts/$id', params: { id: String(hostId) } });

  const assignedIds = new Set(data?.hosts.map((h) => h.id) ?? []);

  const removeHost = useRemoveHostFromPool(id);
  const hostColumns = buildHostColumns({
    onView: goToHost,
    extraActions: (host) => [
      {
        label: 'Remove from pool',
        icon: XIcon,
        variant: 'destructive',
        separatorBefore: true,
        disabled: removeHost.isPending,
        onSelect: () => removeHost.mutate(host.id),
      },
    ],
  });

  return (
    <div className="flex flex-1 flex-col gap-4">
      <div>
        <Button variant="ghost" size="sm" asChild>
          <Link to="/pools">
            <ArrowLeftIcon />
            Back to list
          </Link>
        </Button>
      </div>

      {isLoading ? (
        <div className="bg-card flex h-40 items-center justify-center rounded-md border">
          <div className="text-muted-foreground flex items-center gap-2 text-sm">
            <Loader2Icon className="size-4 animate-spin" />
            Loading pool…
          </div>
        </div>
      ) : null}

      {isError ? (
        <div className="text-destructive flex items-start gap-2 rounded-md border p-4 text-sm">
          <AlertCircleIcon className="size-4 shrink-0" />
          <span>{error?.message ?? 'Failed to load pool'}</span>
        </div>
      ) : null}

      {data ? (
        <>
          <Card>
            <CardHeader>
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <CardTitle className="truncate">{data.name}</CardTitle>
                  {data.comment ? (
                    <p className="text-muted-foreground mt-1 text-sm">
                      {data.comment}
                    </p>
                  ) : null}
                  <div className="mt-2 flex flex-wrap gap-2">
                    <Badge
                      variant="outline"
                      className="inline-flex items-center gap-1"
                    >
                      <ServerIcon className="size-3" />
                      {data.hosts.length}{' '}
                      {data.hosts.length === 1 ? 'host' : 'hosts'}
                    </Badge>
                  </div>
                </div>
                <div className="flex shrink-0 gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setEditOpen(true)}
                  >
                    <PencilIcon />
                    Edit
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-destructive hover:bg-destructive/10"
                    onClick={() => setDeleteOpen(true)}
                  >
                    <Trash2Icon />
                    Delete
                  </Button>
                </div>
              </div>
            </CardHeader>
          </Card>

          <div className="flex items-end justify-between gap-4">
            <div>
              <h2 className="text-base font-semibold">Hosts</h2>
              <p className="text-muted-foreground text-xs">
                Workers assigned to this pool.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => setAddHostsOpen(true)}
              >
                <PlusIcon />
                Add hosts
              </Button>
              <ViewModeToggle value={viewMode} onChange={setViewMode} />
            </div>
          </div>

          {viewMode === 'list' ? (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {data.hosts.length === 0 ? (
                <div className="text-muted-foreground rounded-md border p-6 text-center text-sm sm:col-span-2 xl:col-span-3">
                  No hosts assigned. Click "Add hosts" to get started.
                </div>
              ) : (
                data.hosts.map((host) => (
                  <div key={host.id} className="relative">
                    <HostCard host={host} onSelect={() => goToHost(host.id)} />
                    <RemoveHostButton poolId={id} hostId={host.id} />
                  </div>
                ))
              )}
            </div>
          ) : (
            <DataTable
              data={data.hosts}
              columns={hostColumns}
              onRowClick={(row) => goToHost(row.id)}
              emptyMessage="No hosts assigned."
            />
          )}

          <EditPoolDialog
            pool={data}
            open={editOpen}
            onOpenChange={setEditOpen}
          />
          <DeletePoolDialog
            pool={data}
            open={deleteOpen}
            onOpenChange={setDeleteOpen}
          />
          <AddHostsDialog
            poolId={id}
            assignedHostIds={assignedIds}
            open={addHostsOpen}
            onOpenChange={setAddHostsOpen}
          />
        </>
      ) : null}
    </div>
  );
}
