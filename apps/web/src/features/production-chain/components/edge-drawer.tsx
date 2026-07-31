import { Trash2Icon } from 'lucide-react';

import type { DependencyMode } from '@dpmc/client';
import { Button } from '@/shared/components/ui/button';
import { Label } from '@/shared/components/ui/label';
import { Switch } from '@/shared/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/shared/components/ui/select';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/shared/components/ui/sheet';
import type { ProductionChainGraphEdge } from '@/features/production-chain/types';

const DEPENDENCY_MODES: DependencyMode[] = [
  'OnSuccess',
  'OnFailure',
  'OnCompletion',
  'OnDataAvailable',
  'Optional',
];

type EdgeDrawerProps = {
  edge: ProductionChainGraphEdge | null;
  disabled?: boolean;
  onOpenChange: (open: boolean) => void;
  onChangeMode: (mode: DependencyMode) => void;
  onToggleFanOut: (isFanOut: boolean) => void;
  onDelete: () => void;
};

export function EdgeDrawer({
  edge,
  disabled,
  onOpenChange,
  onChangeMode,
  onToggleFanOut,
  onDelete,
}: EdgeDrawerProps) {
  return (
    <Sheet open={edge !== null} onOpenChange={onOpenChange}>
      <SheetContent className="overflow-y-auto">
        {edge ? (
          <>
            <SheetHeader>
              <SheetTitle>Edge</SheetTitle>
              <SheetDescription>Dependency between two nodes.</SheetDescription>
            </SheetHeader>
            <div className="flex flex-col gap-4 p-4 pt-0 text-sm">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="dependency-mode" className="text-xs">Dependency mode</Label>
                <Select
                  value={edge.dependencyMode}
                  onValueChange={(v) => onChangeMode(v as DependencyMode)}
                  disabled={disabled}
                >
                  <SelectTrigger id="dependency-mode" className="h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {DEPENDENCY_MODES.map((m) => (
                      <SelectItem key={m} value={m} className="text-xs">
                        {m}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center justify-between">
                <Label htmlFor="fan-out" className="text-xs">
                  Fan-out (×N)
                </Label>
                <Switch
                  id="fan-out"
                  checked={edge.isFanOut}
                  onCheckedChange={onToggleFanOut}
                  disabled={disabled}
                />
              </div>
              <Button
                variant="destructive"
                size="sm"
                disabled={disabled}
                onClick={onDelete}
              >
                <Trash2Icon /> Delete edge
              </Button>
            </div>
          </>
        ) : null}
      </SheetContent>
    </Sheet>
  );
}
