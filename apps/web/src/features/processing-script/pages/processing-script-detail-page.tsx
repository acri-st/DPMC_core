import type { ReactNode } from 'react';
import { Link, useParams } from '@tanstack/react-router';
import {
  AlertCircleIcon,
  ArrowLeftIcon,
  CpuIcon,
  FileCode2Icon,
  Loader2Icon,
} from 'lucide-react';
import type { ProcessingScriptVersionWithExecutables } from '@dpmc/client';

import { Badge } from '@/shared/components/ui/badge';
import { Button } from '@/shared/components/ui/button';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/shared/components/ui/card';
import { Separator } from '@/shared/components/ui/separator';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/shared/components/ui/table';
import { formatBytes } from '@/shared/libs/format-bytes';
import { useProcessingScript } from '@/features/processing-script/hooks/use-processing-script';

export function ProcessingScriptDetailPage() {
  const { id: idParam } = useParams({ from: '/processing-scripts/$id' });
  const id = Number(idParam);
  const { data, isLoading, isError, error } = useProcessingScript(id);

  if (isLoading) {
    return (
      <div className="flex flex-1 items-center justify-center rounded-md border">
        <div className="text-muted-foreground flex items-center gap-2 text-sm">
          <Loader2Icon className="size-4 animate-spin" />
          Loading processing script…
        </div>
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div className="text-destructive flex items-start gap-2 rounded-md border p-4 text-sm">
        <AlertCircleIcon className="size-4 shrink-0" />
        <span>{error?.message ?? 'Failed to load processing script'}</span>
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col gap-4">
      <div className="flex flex-wrap items-center gap-3">
        <Button variant="ghost" size="sm" asChild>
          <Link to="/processing-scripts">
            <ArrowLeftIcon />
            Back
          </Link>
        </Button>
        <div className="min-w-0 flex-1">
          <h1 className="flex items-center gap-2 text-lg font-semibold leading-tight">
            <FileCode2Icon className="size-4" />
            <span className="truncate">{data.name}</span>
          </h1>
          <p className="text-muted-foreground line-clamp-1 text-xs">
            Processing script <span className="font-mono">#{data.id}</span>
          </p>
        </div>
        <Badge variant="outline" className="font-mono">
          {data.acronym}
        </Badge>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[2fr_1fr]">
        <div className="flex flex-col gap-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">
                Versions
                <span className="text-muted-foreground ml-1.5 text-xs font-normal">
                  ({data.versions.length})
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              {data.versions.length === 0 ? (
                <div className="text-muted-foreground rounded-md border border-dashed p-6 text-center text-sm">
                  No versions registered for this script.
                </div>
              ) : (
                data.versions.map((version) => (
                  <VersionBlock
                    key={version.id}
                    version={version}
                    isDefault={version.id === data.defaultVersionId}
                  />
                ))
              )}
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Metadata</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <Field label="ID">
              <span className="font-mono text-xs">#{data.id}</span>
            </Field>
            <Separator />
            <Field label="Acronym">
              <span className="font-mono text-xs">{data.acronym}</span>
            </Field>
            <Separator />
            <Field label="Default version">
              {data.defaultVersionId ? (
                <span className="font-mono text-xs">
                  #{data.defaultVersionId}
                </span>
              ) : (
                '—'
              )}
            </Field>
            <Separator />
            <Field label="Versions">
              <Badge variant="secondary" className="font-mono">
                {data.versions.length}
              </Badge>
            </Field>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function VersionBlock({
  version,
  isDefault,
}: {
  version: ProcessingScriptVersionWithExecutables;
  isDefault: boolean;
}) {
  return (
    <div className="rounded-md border p-3">
      <div className="flex flex-wrap items-center gap-2">
        <CpuIcon className="text-muted-foreground size-4" />
        <span className="font-mono text-sm font-medium">{version.version}</span>
        {version.isLatest ? (
          <Badge variant="secondary" className="text-[10px]">
            latest
          </Badge>
        ) : null}
        {isDefault ? (
          <Badge variant="default" className="text-[10px]">
            default
          </Badge>
        ) : null}
        <Badge variant="outline" className="ml-auto text-[10px]">
          {version.runtime}
        </Badge>
      </div>

      <div className="mt-3 grid grid-cols-1 gap-x-6 gap-y-2 sm:grid-cols-2">
        <Field label="Image">
          {version.imageUrl ? (
            <span className="font-mono text-xs break-all">
              {version.imageUrl}
              {version.imageTag ? `:${version.imageTag}` : ''}
            </span>
          ) : (
            '—'
          )}
        </Field>
        <Field label="Checksum">
          {version.imageChecksum ? (
            <span className="font-mono text-xs break-all">
              {version.imageChecksum}
            </span>
          ) : (
            '—'
          )}
        </Field>
        <Field label="CPU">
          <span className="font-mono text-xs">{version.requiredCpu}</span>
        </Field>
        <Field label="RAM">
          <span className="font-mono text-xs">
            {formatBytes(version.requiredRam)}
          </span>
        </Field>
        <Field label="Disk">
          <span className="font-mono text-xs">
            {formatBytes(version.requiredDisk)}
          </span>
        </Field>
        <Field label="GPU">
          <span className="font-mono text-xs">
            {version.requiresGpu ? `Yes (${version.gpuCount})` : 'No'}
          </span>
        </Field>
      </div>

      <div className="mt-3">
        <p className="text-muted-foreground mb-1.5 text-xs font-medium uppercase tracking-wide">
          Executables ({version.executables.length})
        </p>
        {version.executables.length === 0 ? (
          <p className="text-muted-foreground text-xs">No executables.</p>
        ) : (
          <div className="overflow-hidden rounded-md border">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/30 hover:bg-muted/30">
                  <TableHead className="text-xs">Stage</TableHead>
                  <TableHead className="text-xs">Seq</TableHead>
                  <TableHead className="text-xs">Type</TableHead>
                  <TableHead className="text-xs">Name</TableHead>
                  <TableHead className="text-xs">Path</TableHead>
                  <TableHead className="text-xs">Args</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {version.executables.map((exe) => (
                  <TableRow key={exe.id}>
                    <TableCell className="text-xs">
                      <Badge variant="outline" className="text-[10px]">
                        {exe.stage}
                      </Badge>
                    </TableCell>
                    <TableCell className="font-mono text-xs">
                      {exe.sequence}
                    </TableCell>
                    <TableCell className="text-xs">{exe.scriptType}</TableCell>
                    <TableCell className="font-mono text-xs">
                      {exe.name}
                    </TableCell>
                    <TableCell className="font-mono text-xs break-all">
                      {exe.path}
                    </TableCell>
                    <TableCell className="font-mono text-xs break-all">
                      {exe.args ?? '—'}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-3">
      <span className="text-muted-foreground text-xs">{label}</span>
      <span className="text-right text-xs">{children}</span>
    </div>
  );
}
