import {
  ArrowDownToLineIcon,
  ArrowUpFromLineIcon,
  ContainerIcon,
  CpuIcon,
  HardDriveIcon,
  ZapIcon,
} from 'lucide-react';

import { Badge } from '@/shared/components/ui/badge';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/shared/components/ui/sheet';
import { formatBytes } from '@/features/production-chain/libs/format-bytes';
import type { ProcessingScriptNode } from '@/features/production-chain/types';

type NodeDrawerProps = {
  node: ProcessingScriptNode | null;
  onOpenChange: (open: boolean) => void;
};

export function NodeDrawer({ node, onOpenChange }: NodeDrawerProps) {
  return (
    <Sheet open={node !== null} onOpenChange={onOpenChange}>
      <SheetContent className="overflow-y-auto">
        {node ? (
          <>
            <SheetHeader>
              <SheetTitle className="flex items-center gap-2">
                <span className="font-mono">{node.acronym}</span>
                <Badge variant="secondary" className="text-[10px]">
                  v{node.version}
                </Badge>
              </SheetTitle>
              <SheetDescription>{node.name}</SheetDescription>
            </SheetHeader>

            <div className="flex flex-col gap-4 p-4 pt-0 text-xs">
              {/* Resources */}
              <Section title="Resources">
                <div className="grid grid-cols-3 gap-2">
                  <Spec icon={<CpuIcon className="size-3" />} label="vCPU">
                    {node.requiredCpu}
                  </Spec>
                  <Spec icon={<ZapIcon className="size-3" />} label="RAM">
                    {formatBytes(node.requiredRam)}
                  </Spec>
                  <Spec
                    icon={<HardDriveIcon className="size-3" />}
                    label="Disk"
                  >
                    {formatBytes(node.requiredDisk)}
                  </Spec>
                </div>
                {node.isInDocker ? (
                  <p className="text-muted-foreground mt-2 flex items-center gap-1 break-all">
                    <ContainerIcon className="size-3 shrink-0" />
                    <span className="font-mono">
                      {node.dockerImage ?? 'container'}
                    </span>
                  </p>
                ) : null}
              </Section>

              {/* IO */}
              <Section
                title="Inputs"
                icon={<ArrowDownToLineIcon className="size-3.5" />}
                count={node.inputs.length}
              >
                <IoList
                  items={node.inputs}
                  tone="info"
                  empty="No declared inputs."
                />
              </Section>
              <Section
                title="Outputs"
                icon={<ArrowUpFromLineIcon className="size-3.5" />}
                count={node.outputs.length}
              >
                <IoList
                  items={node.outputs}
                  tone="ok"
                  empty="No declared outputs."
                />
              </Section>

              {/* Executables */}
              {node.executables.length > 0 ? (
                <Section title="Executables" count={node.executables.length}>
                  <ul className="flex flex-col gap-1">
                    {node.executables.map((e) => (
                      <li
                        key={e.id}
                        className="bg-muted/40 rounded-md p-2 font-mono text-[11px]"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span>{e.name}</span>
                          <span className="text-muted-foreground text-[10px]">
                            {e.stage} · {e.scriptType}
                          </span>
                        </div>
                        <p className="text-muted-foreground mt-0.5 break-all text-[10px]">
                          {e.path}
                          {e.args ? ` ${e.args}` : ''}
                        </p>
                      </li>
                    ))}
                  </ul>
                </Section>
              ) : null}
            </div>
          </>
        ) : null}
      </SheetContent>
    </Sheet>
  );
}

function Section({
  title,
  icon,
  count,
  children,
}: {
  title: string;
  icon?: React.ReactNode;
  count?: number;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div className="text-muted-foreground mb-1.5 flex items-center gap-1.5 text-[10px] font-medium uppercase tracking-wider">
        {icon}
        <span>{title}</span>
        {typeof count === 'number' ? (
          <Badge variant="outline" className="text-[9px]">
            {count}
          </Badge>
        ) : null}
      </div>
      {children}
    </div>
  );
}

function Spec({
  icon,
  label,
  children,
}: {
  icon: React.ReactNode;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-muted/40 flex flex-col gap-0.5 rounded-md p-2">
      <span className="text-muted-foreground flex items-center gap-1 text-[10px]">
        {icon}
        {label}
      </span>
      <span className="font-mono text-xs">{children}</span>
    </div>
  );
}

function IoList({
  items,
  tone,
  empty,
}: {
  items: { keyword: string }[];
  tone: 'info' | 'ok';
  empty: string;
}) {
  if (items.length === 0) {
    return (
      <p className="text-muted-foreground rounded-md border border-dashed p-3 text-center text-[11px]">
        {empty}
      </p>
    );
  }
  const toneClass =
    tone === 'ok'
      ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/30'
      : 'bg-sky-500/10 text-sky-700 dark:text-sky-400 border-sky-500/30';
  return (
    <div className="flex flex-wrap gap-1">
      {items.map((io) => (
        <span
          key={io.keyword}
          className={`rounded-md border px-1.5 py-0.5 font-mono text-[11px] ${toneClass}`}
        >
          {io.keyword}
        </span>
      ))}
    </div>
  );
}
