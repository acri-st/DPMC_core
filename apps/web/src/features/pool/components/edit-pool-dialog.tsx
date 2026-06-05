import { useEffect, useState } from 'react';
import { Loader2Icon } from 'lucide-react';

import { Button } from '@/shared/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/shared/components/ui/dialog';
import { Input } from '@/shared/components/ui/input';
import { Label } from '@/shared/components/ui/label';
import { Textarea } from '@/shared/components/ui/textarea';
import { useUpdatePool } from '@/features/pool/hooks/use-update-pool';
import type { Pool } from '@dpmc/client';

type EditPoolDialogProps = {
  pool: Pool;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function EditPoolDialog({
  pool,
  open,
  onOpenChange,
}: EditPoolDialogProps) {
  const [name, setName] = useState(pool.name);
  const [comment, setComment] = useState(pool.comment ?? '');
  const { mutate, isPending, error } = useUpdatePool(pool.id);

  useEffect(() => {
    if (open) {
      setName(pool.name);
      setComment(pool.comment ?? '');
    }
  }, [open, pool]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    mutate(
      { name: name.trim(), comment: comment.trim() || null },
      { onSuccess: () => onOpenChange(false) },
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Edit pool</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="edit-pool-name">Name *</Label>
            <Input
              id="edit-pool-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={120}
              required
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="edit-pool-comment">Comment</Label>
            <Textarea
              id="edit-pool-comment"
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              maxLength={2000}
              rows={3}
            />
          </div>
          {error ? (
            <p className="text-destructive text-sm">{error.message}</p>
          ) : null}
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isPending || !name.trim()}>
              {isPending ? (
                <Loader2Icon className="size-4 animate-spin" />
              ) : null}
              Save
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
