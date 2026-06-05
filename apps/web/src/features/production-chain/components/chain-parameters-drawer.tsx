import { ScrollTextIcon } from 'lucide-react';

import { Badge } from '@/shared/components/ui/badge';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/shared/components/ui/sheet';

type ChainParam = {
  key: string;
  label: string;
  type: string;
  required?: boolean;
  default?: string | number | null;
};

type ChainParametersDrawerProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  configuration: Record<string, unknown> | null;
};

export function ChainParametersDrawer({
  open,
  onOpenChange,
  configuration,
}: ChainParametersDrawerProps) {
  const params = extractParams(configuration);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <ScrollTextIcon className="size-4" />
            Chain parameters
            <Badge variant="outline" className="ml-1 text-[10px]">
              {params.length}
            </Badge>
          </SheetTitle>
          <SheetDescription>
            Declared on the latest version. Pre-fill values for new tasks
            launched against this chain.
          </SheetDescription>
        </SheetHeader>

        <div className="flex flex-col gap-3 p-4 pt-0">
          {params.length === 0 ? (
            <p className="text-muted-foreground rounded-md border border-dashed p-6 text-center text-xs">
              No parameters declared on this chain.
            </p>
          ) : (
            <ul className="flex flex-col gap-2">
              {params.map((p) => (
                <li key={p.key} className="rounded-md border p-2.5 text-xs">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-mono font-medium">{p.key}</span>
                    <Badge variant="outline" className="text-[10px]">
                      {p.type}
                    </Badge>
                    {p.required ? (
                      <Badge variant="outline" className="text-[10px]">
                        required
                      </Badge>
                    ) : null}
                  </div>
                  {p.label && p.label !== p.key ? (
                    <p className="text-muted-foreground mt-1">{p.label}</p>
                  ) : null}
                  <p className="text-muted-foreground mt-1.5 flex items-center gap-1">
                    <span>Default:</span>
                    <span className="font-mono">
                      {p.default === undefined || p.default === null
                        ? '—'
                        : String(p.default)}
                    </span>
                  </p>
                </li>
              ))}
            </ul>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}

function extractParams(
  configuration: Record<string, unknown> | null,
): ChainParam[] {
  if (!configuration) return [];
  const raw = (configuration as { parameters?: unknown }).parameters;
  if (!Array.isArray(raw)) return [];
  const out: ChainParam[] = [];
  for (const p of raw) {
    if (!p || typeof p !== 'object') continue;
    const o = p as Record<string, unknown>;
    if (typeof o.key !== 'string') continue;
    out.push({
      key: o.key,
      label: typeof o.label === 'string' ? o.label : o.key,
      type: typeof o.type === 'string' ? o.type : 'string',
      required: typeof o.required === 'boolean' ? o.required : undefined,
      default:
        typeof o.default === 'string' || typeof o.default === 'number'
          ? o.default
          : undefined,
    });
  }
  return out;
}
