import { Handle, Position, type NodeProps } from '@xyflow/react';
import { ContainerIcon, CpuIcon, HardDriveIcon, ZapIcon } from 'lucide-react';

import { Badge } from '@/shared/components/ui/badge';
import { cn } from '@/shared/utils';
import { formatBytes } from '@/features/production-chain/libs/format-bytes';
import type {
  ProcessingScriptExecutableInfo,
  ProcessingScriptNode,
} from '@/features/production-chain/types';

export type ScriptNodeData = ProcessingScriptNode & {
  isSelected?: boolean;
};

type ScriptFlowNodeProps = NodeProps & {
  data: ScriptNodeData;
};

const SCRIPT_TYPE_DOT: Record<ProcessingScriptNode['scriptType'], string> = {
  Bash: 'bg-amber-500',
  Python: 'bg-blue-500',
  Node: 'bg-emerald-500',
  Binary: 'bg-purple-500',
  PgBash: 'bg-cyan-500',
  PlSql: 'bg-rose-500',
  Sql: 'bg-sky-500',
};

const STAGE_LABEL: Record<'Pre' | 'Exe' | 'Post', string> = {
  Pre: 'pre',
  Exe: 'exe',
  Post: 'post',
};

export function ScriptFlowNode({ data, selected }: ScriptFlowNodeProps) {
  const isTemplate = data.isFanOutTarget;
  const groupedExecs = groupByStage(data.executables);

  return (
    <div
      className={cn(
        'bg-card text-card-foreground w-72 overflow-hidden rounded-md border shadow-sm transition-shadow',
        selected && 'ring-ring/60 ring-2',
        isTemplate && 'border-dashed border-violet-400',
      )}
    >
      <Handle
        type="target"
        position={Position.Left}
        className="!bg-muted-foreground !size-2.5 !border-2 !border-background"
      />
      <Handle
        type="source"
        position={Position.Right}
        className="!bg-primary !size-2.5 !border-2 !border-background"
      />

      {/* Header — acronym dominant, name as subtitle, version + runtime in a thin top-right corner */}
      <div
        className={cn(
          'flex items-start justify-between gap-3 px-3 pb-1 pt-2.5',
          isTemplate && 'bg-violet-500/5',
        )}
      >
        <div className="min-w-0">
          <p className="font-mono text-sm font-semibold leading-tight">
            {data.acronym}
          </p>
          <p className="text-muted-foreground truncate text-[11px] leading-tight">
            {data.name}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          {isTemplate && (
            <Badge
              variant="outline"
              className="border-violet-400 text-violet-500 px-1.5 py-0 text-[10px]"
            >
              TEMPLATE
            </Badge>
          )}
          {data.isInDocker ? (
            <span
              title={data.dockerImage ?? 'container'}
              className="text-muted-foreground inline-flex items-center"
            >
              <ContainerIcon className="size-3.5" />
            </span>
          ) : null}
          <Badge
            variant="secondary"
            className="px-1.5 py-0 font-mono text-[10px]"
          >
            v{data.version}
          </Badge>
        </div>
      </div>

      {/* Resources — single compact line, monospaced numbers, equal column rhythm */}
      <div className="text-muted-foreground grid grid-cols-3 gap-1 px-3 pb-2 pt-1 text-[11px]">
        <Spec icon={<CpuIcon className="size-3" />} label="vCPU">
          {data.requiredCpu}
        </Spec>
        <Spec icon={<ZapIcon className="size-3" />} label="RAM">
          {formatBytes(data.requiredRam)}
        </Spec>
        <Spec icon={<HardDriveIcon className="size-3" />} label="Disk">
          {formatBytes(data.requiredDisk)}
        </Spec>
      </div>

      {/* IO types — concise list of declared input/output keywords */}
      {data.inputs.length === 0 && data.outputs.length === 0 ? null : (
        <div className="bg-muted/30 grid grid-cols-2 gap-2 border-t px-3 py-1.5 text-[10px]">
          <IoColumn label="In" items={data.inputs} tone="info" />
          <IoColumn label="Out" items={data.outputs} tone="ok" />
        </div>
      )}

      {/* Executables — grouped by stage with a left rail label, no badge clutter */}
      {data.executables.length === 0 ? null : (
        <div className="bg-muted/30 border-t">
          {(['Pre', 'Exe', 'Post'] as const).map((stage) => {
            const list = groupedExecs[stage];
            if (!list.length) return null;
            return (
              <div
                key={stage}
                className="grid grid-cols-[34px_1fr] items-start gap-1 border-b px-2 py-1.5 last:border-b-0"
              >
                <span className="text-muted-foreground/80 mt-0.5 font-mono text-[9px] uppercase tracking-wider">
                  {STAGE_LABEL[stage]}
                </span>
                <ul className="space-y-0.5">
                  {list.map((e) => (
                    <li
                      key={e.id}
                      className="flex min-w-0 items-center gap-1.5 text-[11px]"
                      title={`${e.path}${e.args ? ` ${e.args}` : ''}`}
                    >
                      <span
                        className={cn(
                          'size-1.5 shrink-0 rounded-full',
                          SCRIPT_TYPE_DOT[e.scriptType],
                        )}
                      />
                      <span className="truncate font-mono">{e.name}</span>
                      <span className="text-muted-foreground/70 ml-auto shrink-0 text-[9px] uppercase">
                        {e.scriptType}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function IoColumn({
  label,
  items,
  tone,
}: {
  label: string;
  items: { keyword: string }[];
  tone: 'info' | 'ok';
}) {
  const toneClass =
    tone === 'ok'
      ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400'
      : 'bg-sky-500/10 text-sky-700 dark:text-sky-400';
  return (
    <div className="flex flex-col gap-0.5 min-w-0">
      <span className="text-muted-foreground/80 font-mono uppercase tracking-wider text-[9px]">
        {label}
      </span>
      <div className="flex flex-wrap gap-0.5">
        {items.length === 0 ? (
          <span className="text-muted-foreground">—</span>
        ) : (
          items.map((io) => (
            <span
              key={io.keyword}
              className={cn('rounded-sm px-1 font-mono', toneClass)}
            >
              {io.keyword}
            </span>
          ))
        )}
      </div>
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
    <div
      className="flex items-center gap-1.5 truncate"
      title={`${label}: ${String(children)}`}
    >
      {icon}
      <span className="truncate font-mono">{children}</span>
    </div>
  );
}

function groupByStage(
  list: ProcessingScriptExecutableInfo[],
): Record<'Pre' | 'Exe' | 'Post', ProcessingScriptExecutableInfo[]> {
  const out: Record<'Pre' | 'Exe' | 'Post', ProcessingScriptExecutableInfo[]> =
    { Pre: [], Exe: [], Post: [] };
  for (const e of list) out[e.stage].push(e);
  return out;
}
