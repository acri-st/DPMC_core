import { useMemo, useState } from 'react';
import { Loader2Icon, PlusIcon, SearchIcon, XIcon } from 'lucide-react';

import { Button } from '@/shared/components/ui/button';
import { Input } from '@/shared/components/ui/input';
import { useProcessingScriptOptions } from '@/features/production-chain/hooks/use-processing-script-options';

type ScriptPaletteProps = {
  existingNames: string[];
  disabled?: boolean;
  onAdd: (input: { processingScriptId: number; name: string }) => void;
  onClose: () => void;
};

export function uniqueNodeName(acronym: string, existing: string[]): string {
  const taken = new Set(existing);
  if (!taken.has(acronym)) return acronym;
  let i = 2;
  while (taken.has(`${acronym}-${i}`)) i += 1;
  return `${acronym}-${i}`;
}

export function ScriptPalette({
  existingNames,
  disabled,
  onAdd,
  onClose,
}: ScriptPaletteProps) {
  const [q, setQ] = useState('');
  const { data, isLoading } = useProcessingScriptOptions();

  const filtered = useMemo(() => {
    const items = data ?? [];
    const needle = q.trim().toLowerCase();
    if (!needle) return items;
    return items.filter(
      (s) =>
        s.acronym.toLowerCase().includes(needle) ||
        s.name.toLowerCase().includes(needle),
    );
  }, [data, q]);

  return (
    <div className="bg-card flex h-full w-72 flex-col gap-2 border-l p-3">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold">Add a node</h2>
        <Button variant="ghost" size="icon" className="size-7" onClick={onClose} aria-label="Close">
          <XIcon className="size-4" />
        </Button>
      </div>
      <div className="relative">
        <SearchIcon className="text-muted-foreground absolute left-2 top-1/2 size-3.5 -translate-y-1/2" />
        <Input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search scripts…"
          className="h-8 pl-7 text-xs"
        />
      </div>
      <div className="-mr-1 flex flex-1 flex-col gap-1 overflow-y-auto pr-1">
        {isLoading ? (
          <div className="text-muted-foreground flex items-center gap-2 p-2 text-xs">
            <Loader2Icon className="size-3.5 animate-spin" /> Loading…
          </div>
        ) : filtered.length === 0 ? (
          <p className="text-muted-foreground p-2 text-xs">No scripts found.</p>
        ) : (
          filtered.map((s) => (
            <button
              key={s.id}
              type="button"
              disabled={disabled}
              onClick={() =>
                onAdd({
                  processingScriptId: s.id,
                  name: uniqueNodeName(s.acronym, existingNames),
                })
              }
              className="hover:bg-accent flex items-center justify-between gap-2 rounded-md border p-2 text-left text-xs disabled:opacity-50"
            >
              <span className="min-w-0">
                <span className="block truncate font-mono font-medium">
                  {s.acronym}
                </span>
                <span className="text-muted-foreground block truncate text-[11px]">
                  {s.name}
                </span>
              </span>
              <PlusIcon className="text-muted-foreground size-4 shrink-0" />
            </button>
          ))
        )}
      </div>
    </div>
  );
}
