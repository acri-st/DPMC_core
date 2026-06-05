import { useState } from 'react';
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
import { useCreatePool } from '@/features/pool/hooks/use-create-pool';

type CreatePoolDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function CreatePoolDialog({
  open,
  onOpenChange,
}: CreatePoolDialogProps) {
  const [name, setName] = useState('');
  const [comment, setComment] = useState('');
  const { mutate, isPending, error } = useCreatePool();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    mutate(
      { name: name.trim(), comment: comment.trim() || null },
      {
        onSuccess: () => {
          onOpenChange(false);
          setName('');
          setComment('');
        },
      },
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>New pool</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="pool-name">Name *</Label>
            <Input
              id="pool-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. europe-prod"
              maxLength={120}
              required
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="pool-comment">Comment</Label>
            <Textarea
              id="pool-comment"
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Optional description…"
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
              Create
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
