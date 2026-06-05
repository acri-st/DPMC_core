import { useEffect, useState } from 'react';
import { Loader2Icon, SearchIcon, ServerIcon } from 'lucide-react';

import { Button } from '@/shared/components/ui/button';
import { Checkbox } from '@/shared/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/shared/components/ui/dialog';
import { Input } from '@/shared/components/ui/input';
import { ScrollArea } from '@/shared/components/ui/scroll-area';
import { useHostList } from '@/features/host/hooks/use-host-list';
import { useAddHostToPool } from '@/features/pool/hooks/use-add-host-to-pool';
import type { Host } from '@/features/host/types';

type AddHostsDialogProps = {
  poolId: number;
  assignedHostIds: Set<number>;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function AddHostsDialog({
  poolId,
  assignedHostIds,
  open,
  onOpenChange,
}: AddHostsDialogProps) {
  const [q, setQ] = useState('');
  const [debouncedQ, setDebouncedQ] = useState('');
  const [selected, setSelected] = useState<Set<number>>(new Set());

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQ(q), 300);
    return () => clearTimeout(timer);
  }, [q]);

  const { data, isLoading } = useHostList({
    page: 1,
    pageSize: 500,
    q: debouncedQ || undefined,
  });
  const addHost = useAddHostToPool(poolId);

  const availableHosts: Host[] = (data?.items ?? []).filter(
    (h) => !assignedHostIds.has(h.id),
  );

  function toggleHost(id: number) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function handleAdd() {
    if (selected.size === 0) return;
    const succeeded = new Set<number>();
    try {
      for (const hostId of selected) {
        await addHost.mutateAsync(hostId);
        succeeded.add(hostId);
      }
      setSelected(new Set());
      onOpenChange(false);
    } catch {
      setSelected((prev) => {
        const next = new Set(prev);
        for (const id of succeeded) next.delete(id);
        return next;
      });
    }
  }

  function handleOpenChange(value: boolean) {
    if (!value) {
      setSelected(new Set());
      setQ('');
    }
    onOpenChange(value);
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add hosts to pool</DialogTitle>
        </DialogHeader>

        <div className="relative">
          <SearchIcon className="text-muted-foreground absolute top-2.5 left-2.5 size-4" />
          <Input
            className="pl-8"
            placeholder="Search by hostname or IP…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
        </div>

        <ScrollArea className="h-64 rounded-md border">
          {isLoading ? (
            <div className="flex h-full items-center justify-center">
              <Loader2Icon className="text-muted-foreground size-4 animate-spin" />
            </div>
          ) : availableHosts.length === 0 ? (
            <div className="text-muted-foreground p-6 text-center text-sm">
              No available hosts.
            </div>
          ) : (
            <div className="flex flex-col">
              {availableHosts.map((host) => (
                <label
                  key={host.id}
                  className="hover:bg-muted/50 flex cursor-pointer items-center gap-3 px-3 py-2.5"
                >
                  <Checkbox
                    checked={selected.has(host.id)}
                    onCheckedChange={() => toggleHost(host.id)}
                  />
                  <ServerIcon className="text-muted-foreground size-3.5 shrink-0" />
                  <div className="min-w-0">
                    <div className="truncate text-sm font-medium">
                      {host.hostname}
                    </div>
                    <div className="text-muted-foreground text-xs">
                      {host.ipAddress}
                    </div>
                  </div>
                </label>
              ))}
            </div>
          )}
        </ScrollArea>

        {addHost.isError ? (
          <p className="text-destructive text-sm">{addHost.error.message}</p>
        ) : null}

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => handleOpenChange(false)}
          >
            Cancel
          </Button>
          <Button
            onClick={handleAdd}
            disabled={selected.size === 0 || addHost.isPending}
          >
            {addHost.isPending ? (
              <Loader2Icon className="size-4 animate-spin" />
            ) : null}
            Add {selected.size > 0 ? `(${selected.size})` : ''}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
