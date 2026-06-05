import { format } from 'date-fns';
import { InfoIcon } from 'lucide-react';

import { Badge } from '@/shared/components/ui/badge';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/shared/components/ui/sheet';
import type { ProductionChainGraph } from '@/features/production-chain/types';

type ChainMetadataDrawerProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  chain: ProductionChainGraph;
};

export function ChainMetadataDrawer({
  open,
  onOpenChange,
  chain,
}: ChainMetadataDrawerProps) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <InfoIcon className="size-4" />
            Chain metadata
          </SheetTitle>
          <SheetDescription>
            Identity, lifecycle and raw configuration of this production chain.
          </SheetDescription>
        </SheetHeader>

        <div className="flex flex-col gap-3 p-4 pt-0 text-xs">
          <Row label="Name">{chain.name}</Row>
          <Row label="Active">
            <Badge
              variant="outline"
              className={
                chain.isActive
                  ? 'border-emerald-500/40 text-emerald-600'
                  : 'border-zinc-400/40 text-zinc-500'
              }
            >
              {chain.isActive ? 'yes' : 'no'}
            </Badge>
          </Row>
          <Row label="Version">
            {chain.selectedVersion ? (
              <span className="font-mono">
                v{chain.selectedVersion.version}
                {chain.selectedVersion.isLatest ? ' · latest' : ''}
              </span>
            ) : (
              '—'
            )}
          </Row>
          <Row label="Comment">{chain.comment ?? '—'}</Row>
          <Row label="Created">{format(new Date(chain.createdAt), 'PPpp')}</Row>
          <Row label="Updated">{format(new Date(chain.updatedAt), 'PPpp')}</Row>

          {chain.configuration ? (
            <div className="pt-2">
              <p className="text-muted-foreground mb-1 text-[11px] font-medium uppercase tracking-wider">
                Configuration
              </p>
              <pre className="bg-muted/40 max-h-80 overflow-auto rounded-md p-2 font-mono text-[10px]">
                {JSON.stringify(chain.configuration, null, 2)}
              </pre>
            </div>
          ) : null}
        </div>
      </SheetContent>
    </Sheet>
  );
}

function Row({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-start justify-between gap-3 border-b py-1.5 last:border-b-0">
      <span className="text-muted-foreground">{label}</span>
      <span className="text-right">{children}</span>
    </div>
  );
}
