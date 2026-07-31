import { useState } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeftIcon,
  ArrowRightIcon,
  CheckIcon,
  CircleAlertIcon,
  FilePlus2Icon,
  Loader2Icon,
  PlusIcon,
  ScrollTextIcon,
  UploadCloudIcon,
  WorkflowIcon,
} from 'lucide-react';
import { toast } from 'sonner';

import { Badge } from '@/shared/components/ui/badge';
import { Button } from '@/shared/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/shared/components/ui/dialog';
import { Input } from '@/shared/components/ui/input';
import { Label } from '@/shared/components/ui/label';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/shared/components/ui/tabs';
import { Textarea } from '@/shared/components/ui/textarea';
import {
  createProductionChain,
  importAcsProductionChain,
  importProductionChainFromTaskTable,
  isAcsTaskTableContent,
  previewAcsProductionChain,
  previewProductionChainFromTaskTable,
  type AcsChainImportPreview,
  type AcsTaskTableFile,
  type ChainImportPreview,
} from '@/features/production-chain/services/production-chain.service';

type Mode = 'scratch' | 'task-table';
type WizardStep = 'upload' | 'preview';

const DEFAULT_ACS_INSTALL_ROOT = '/dpmc/scripts/cryosat_ocean_baseline_d';

export function CreateChainDialog() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<Mode>('scratch');

  // Scratch
  const [name, setName] = useState('');
  const [comment, setComment] = useState('');

  // Wizard
  const [step, setStep] = useState<WizardStep>('upload');
  const [content, setContent] = useState('');
  const [fileName, setFileName] = useState<string | null>(null);
  const [preview, setPreview] = useState<ChainImportPreview | null>(null);
  // Old-ACS (CryoSat) multi-file flow — several task tables → one chain.
  const [files, setFiles] = useState<AcsTaskTableFile[]>([]);
  const [installRoot, setInstallRoot] = useState(DEFAULT_ACS_INSTALL_ROOT);
  const [imageOverrides, setImageOverrides] = useState<Record<string, string>>(
    {},
  );
  const [acsPreview, setAcsPreview] = useState<AcsChainImportPreview | null>(
    null,
  );

  const acsFiles: AcsTaskTableFile[] =
    files.length > 0
      ? files
      : content.trim()
        ? [{ name: fileName ?? 'task-table.xml', content }]
        : [];
  const isAcs =
    acsFiles.length > 1 ||
    (acsFiles.length === 1 && isAcsTaskTableContent(acsFiles[0].content));

  const reset = () => {
    setMode('scratch');
    setName('');
    setComment('');
    setStep('upload');
    setContent('');
    setFileName(null);
    setPreview(null);
    setFiles([]);
    setInstallRoot(DEFAULT_ACS_INSTALL_ROOT);
    setImageOverrides({});
    setAcsPreview(null);
  };

  const acsOptions = () => ({
    installRoot: installRoot.trim() || undefined,
    images: Object.fromEntries(
      Object.entries(imageOverrides)
        .filter(([, url]) => url.trim())
        .map(([acronym, url]) => [acronym, { imageUrl: url.trim() }]),
    ),
  });

  const onCreated = (chainId: number, msg: string) => {
    toast.success(msg);
    queryClient.invalidateQueries({ queryKey: ['production-chain', 'list'] });
    setOpen(false);
    reset();
    void navigate({
      to: '/production-chain/$id',
      params: { id: String(chainId) },
    });
  };

  const create = useMutation({
    mutationFn: () =>
      createProductionChain({
        name: name.trim(),
        comment: comment.trim() || null,
      }),
    onSuccess: (res) => onCreated(res.id, 'Production chain created'),
    onError: (e: Error) => toast.error(e.message),
  });

  const previewMutation = useMutation({
    mutationFn: () =>
      previewProductionChainFromTaskTable({ adapter: 'ipf', content }),
    onSuccess: (ir) => {
      setPreview(ir);
      setStep('preview');
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const importMutation = useMutation({
    mutationFn: () =>
      importProductionChainFromTaskTable({ adapter: 'ipf', content }),
    onSuccess: (res) =>
      onCreated(
        res.chainId,
        `Imported chain (${res.nodeCount} script${
          res.nodeCount === 1 ? '' : 's'
        }, ${res.edgeCount} edge${res.edgeCount === 1 ? '' : 's'})`,
      ),
    onError: (e: Error) => toast.error(e.message),
  });

  const acsPreviewMutation = useMutation({
    mutationFn: () =>
      previewAcsProductionChain({ files: acsFiles, options: acsOptions() }),
    onSuccess: (plan) => {
      setAcsPreview(plan);
      setStep('preview');
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const acsImportMutation = useMutation({
    mutationFn: () =>
      importAcsProductionChain({ files: acsFiles, options: acsOptions() }),
    onSuccess: (res) =>
      onCreated(
        res.chainId,
        `Imported chain (${res.nodeCount} node${
          res.nodeCount === 1 ? '' : 's'
        }, ${res.edgeCount} edge${res.edgeCount === 1 ? '' : 's'})`,
      ),
    onError: (e: Error) => toast.error(e.message),
  });

  const handleFiles = async (list: FileList | null | undefined) => {
    if (!list || list.length === 0) return;
    const loaded = await Promise.all(
      Array.from(list).map(async (f) => ({
        name: f.name,
        content: await f.text(),
      })),
    );
    setFiles(loaded);
    // Keep the single-file states in sync so the Sentinel-style `ipf` flow
    // is untouched when one non-ACS table is uploaded.
    setContent(loaded.length === 1 ? loaded[0].content : '');
    setFileName(
      loaded.length === 1
        ? loaded[0].name
        : `${loaded.length} files (${loaded.map((f) => f.name).join(', ')})`,
    );
  };

  const handleScratchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error('Name is required');
      return;
    }
    create.mutate();
  };

  const handlePreview = () => {
    if (acsFiles.length === 0) {
      toast.error('Paste or upload a Task Table');
      return;
    }
    if (isAcs) {
      acsPreviewMutation.mutate();
    } else if (acsFiles.length > 1) {
      toast.error(
        'Multi-file import is only supported for ACS <Task_Table> documents',
      );
    } else {
      previewMutation.mutate();
    }
  };

  const pending =
    create.isPending ||
    previewMutation.isPending ||
    importMutation.isPending ||
    acsPreviewMutation.isPending ||
    acsImportMutation.isPending;

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) reset();
      }}
    >
      <DialogTrigger asChild>
        <Button size="sm">
          <PlusIcon />
          Create
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Create production chain</DialogTitle>
          <DialogDescription>
            {mode === 'task-table' && step === 'preview'
              ? 'Review what will be created, then confirm.'
              : 'Start from an empty chain or import an IPF Task Table.'}
          </DialogDescription>
        </DialogHeader>

        <Tabs
          value={mode}
          onValueChange={(v) => {
            setMode(v as Mode);
            setStep('upload');
            setPreview(null);
            setAcsPreview(null);
          }}
        >
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="scratch">
              <FilePlus2Icon className="size-3.5" />
              From scratch
            </TabsTrigger>
            <TabsTrigger value="task-table">
              <UploadCloudIcon className="size-3.5" />
              From Task Table
            </TabsTrigger>
          </TabsList>

          <TabsContent value="scratch" className="pt-3">
            <form
              onSubmit={handleScratchSubmit}
              className="flex flex-col gap-3"
            >
              <div className="space-y-1.5">
                <Label htmlFor="chain-name">Name</Label>
                <Input
                  id="chain-name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Sentinel-3 OLCI L1"
                  autoFocus
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="chain-comment">Comment</Label>
                <Textarea
                  id="chain-comment"
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  rows={2}
                  placeholder="Optional"
                />
              </div>
              <DialogFooter className="pt-2">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setOpen(false)}
                  disabled={pending}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={pending}>
                  {create.isPending ? (
                    <Loader2Icon className="animate-spin" />
                  ) : (
                    <FilePlus2Icon />
                  )}
                  Create
                </Button>
              </DialogFooter>
            </form>
          </TabsContent>

          <TabsContent value="task-table" className="pt-3">
            <WizardStepIndicator step={step} />
            {step === 'upload' ? (
              <div className="flex flex-col gap-3 pt-3">
                <div className="space-y-1.5">
                  <Label htmlFor="chain-tt-file">
                    Upload one or more Task Tables
                  </Label>
                  <Input
                    id="chain-tt-file"
                    type="file"
                    multiple
                    accept=".xml,.tt,text/xml"
                    onChange={(e) => void handleFiles(e.target.files)}
                  />
                  {fileName ? (
                    <p className="text-muted-foreground text-xs">
                      Loaded <span className="font-mono">{fileName}</span>
                    </p>
                  ) : null}
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="chain-tt-content">…or paste one</Label>
                  <Textarea
                    id="chain-tt-content"
                    value={content}
                    onChange={(e) => {
                      setContent(e.target.value);
                      setFileName(null);
                      setFiles([]);
                    }}
                    rows={8}
                    placeholder="<Ipf_Task_Table>…</Ipf_Task_Table> or <Task_Table>…</Task_Table>"
                    className="font-mono text-xs"
                  />
                </div>
                {isAcs ? (
                  <div className="space-y-1.5">
                    <Label htmlFor="chain-acs-root">
                      Install root (ACS deliveries)
                    </Label>
                    <Input
                      id="chain-acs-root"
                      value={installRoot}
                      onChange={(e) => setInstallRoot(e.target.value)}
                      className="font-mono text-xs"
                    />
                    <p className="text-muted-foreground text-xs">
                      Old-ACS <code>&lt;Task_Table&gt;</code> detected: each
                      table becomes one node with its pools as sequenced
                      executables; binary paths are re-rooted onto this
                      container path (everything before <code>/Binaries/</code>{' '}
                      is replaced).
                    </p>
                  </div>
                ) : (
                  <p className="text-muted-foreground text-xs">
                    Sentinel-style tables: each <code>&lt;Task&gt;</code>{' '}
                    becomes a node; edges are inferred by matching{' '}
                    <code>Output.Type</code> with downstream{' '}
                    <code>Input.Alternative.File_Type</code>. Old-ACS (CryoSat)
                    tables can be uploaded several at once to build one chain.
                  </p>
                )}
                <DialogFooter className="pt-2">
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => setOpen(false)}
                    disabled={pending}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="button"
                    onClick={handlePreview}
                    disabled={pending || acsFiles.length === 0}
                  >
                    {previewMutation.isPending ||
                    acsPreviewMutation.isPending ? (
                      <Loader2Icon className="animate-spin" />
                    ) : (
                      <ArrowRightIcon />
                    )}
                    Preview
                  </Button>
                </DialogFooter>
              </div>
            ) : acsPreview ? (
              <AcsPreviewStep
                preview={acsPreview}
                imageOverrides={imageOverrides}
                onImageChange={(acronym, url) =>
                  setImageOverrides((prev) => ({ ...prev, [acronym]: url }))
                }
                onBack={() => {
                  setStep('upload');
                  setAcsPreview(null);
                }}
                onConfirm={() => acsImportMutation.mutate()}
                confirming={acsImportMutation.isPending}
              />
            ) : preview ? (
              <PreviewStep
                preview={preview}
                onBack={() => setStep('upload')}
                onConfirm={() => importMutation.mutate()}
                confirming={importMutation.isPending}
              />
            ) : null}
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}

function WizardStepIndicator({ step }: { step: WizardStep }) {
  return (
    <div className="text-muted-foreground flex items-center gap-2 pt-2 text-[11px]">
      <span
        className={
          step === 'upload'
            ? 'text-foreground font-medium'
            : 'inline-flex items-center gap-1'
        }
      >
        {step === 'upload' ? (
          '1. Upload'
        ) : (
          <>
            <CheckIcon className="size-3 text-emerald-500" />
            1. Upload
          </>
        )}
      </span>
      <span aria-hidden>→</span>
      <span className={step === 'preview' ? 'text-foreground font-medium' : ''}>
        2. Preview &amp; confirm
      </span>
    </div>
  );
}

function PreviewStep({
  preview,
  onBack,
  onConfirm,
  confirming,
}: {
  preview: ChainImportPreview;
  onBack: () => void;
  onConfirm: () => void;
  confirming: boolean;
}) {
  const orphanNodes = preview.nodes.filter((n) => {
    const hasEdge = preview.edges.some(
      (e) => e.parentAcronym === n.acronym || e.childAcronym === n.acronym,
    );
    return !hasEdge && preview.nodes.length > 1;
  });

  return (
    <div className="flex flex-col gap-3 pt-3">
      <div className="rounded-md border p-3">
        <div className="flex items-center gap-2 text-sm font-semibold">
          <WorkflowIcon className="size-4" />
          {preview.name}
        </div>
        {preview.comment ? (
          <p className="text-muted-foreground mt-1 text-xs">
            {preview.comment}
          </p>
        ) : null}
        <div className="text-muted-foreground mt-2 flex flex-wrap items-center gap-3 text-[11px]">
          <Badge variant="outline">
            {preview.nodes.length} node
            {preview.nodes.length === 1 ? '' : 's'}
          </Badge>
          <Badge variant="outline">
            {preview.edges.length} edge
            {preview.edges.length === 1 ? '' : 's'}
          </Badge>
          <Badge variant="outline">
            {preview.parameters.length} param
            {preview.parameters.length === 1 ? '' : 's'}
          </Badge>
        </div>
      </div>

      {orphanNodes.length > 0 ? (
        <div className="border-amber-500/40 bg-amber-500/5 text-amber-700 dark:text-amber-400 flex items-start gap-2 rounded-md border p-2 text-xs">
          <CircleAlertIcon className="size-3.5 shrink-0" />
          <span>
            {orphanNodes.length} node
            {orphanNodes.length === 1 ? '' : 's'} aren't connected to anything
            (no matching <code>Output.Type</code> / <code>Input.File_Type</code>
            ):{' '}
            <span className="font-mono">
              {orphanNodes.map((n) => n.acronym).join(', ')}
            </span>
            .
          </span>
        </div>
      ) : null}

      <Section
        icon={<WorkflowIcon className="size-3.5" />}
        title={`Nodes (${preview.nodes.length})`}
      >
        <ul className="flex flex-col divide-y">
          {preview.nodes.map((n) => (
            <li key={n.acronym} className="py-2">
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="secondary" className="font-mono text-[10px]">
                  {n.acronym}
                </Badge>
                <span className="text-sm">{n.name}</span>
              </div>
              <p className="text-muted-foreground mt-0.5 break-all font-mono text-[10px]">
                {n.path}
              </p>
              <div className="mt-1.5 grid grid-cols-1 gap-1 text-[11px] sm:grid-cols-2">
                <TypeList label="Inputs" types={n.inputTypes} tone="info" />
                <TypeList label="Outputs" types={n.outputTypes} tone="ok" />
              </div>
            </li>
          ))}
        </ul>
      </Section>

      {preview.edges.length > 0 ? (
        <Section
          icon={<ArrowRightIcon className="size-3.5" />}
          title={`Edges (${preview.edges.length})`}
        >
          <ul className="flex flex-col gap-1.5">
            {preview.edges.map((e, i) => (
              <li
                key={`${e.parentAcronym}-${e.childAcronym}-${e.matchType}-${i}`}
                className="flex flex-wrap items-center gap-1.5 text-xs"
              >
                <Badge variant="secondary" className="font-mono text-[10px]">
                  {e.parentAcronym}
                </Badge>
                <ArrowRightIcon className="text-muted-foreground size-3" />
                <Badge variant="secondary" className="font-mono text-[10px]">
                  {e.childAcronym}
                </Badge>
                <span className="text-muted-foreground">via</span>
                <code className="font-mono text-[10px]">{e.matchType}</code>
              </li>
            ))}
          </ul>
        </Section>
      ) : null}

      {preview.parameters.length > 0 ? (
        <Section
          icon={<ScrollTextIcon className="size-3.5" />}
          title={`Parameters (${preview.parameters.length})`}
        >
          <ul className="flex flex-col divide-y">
            {preview.parameters.map((p) => (
              <li
                key={p.key}
                className="flex items-center justify-between gap-2 py-1.5 text-xs"
              >
                <div>
                  <span className="font-mono">{p.key}</span>
                  <Badge variant="outline" className="ml-2 text-[10px]">
                    {p.type}
                  </Badge>
                </div>
                <span className="text-muted-foreground font-mono">
                  default: {p.default ?? '—'}
                </span>
              </li>
            ))}
          </ul>
        </Section>
      ) : null}

      <DialogFooter className="pt-2">
        <Button
          type="button"
          variant="ghost"
          onClick={onBack}
          disabled={confirming}
        >
          <ArrowLeftIcon />
          Back
        </Button>
        <Button type="button" onClick={onConfirm} disabled={confirming}>
          {confirming ? (
            <Loader2Icon className="animate-spin" />
          ) : (
            <UploadCloudIcon />
          )}
          Create chain
        </Button>
      </DialogFooter>
    </div>
  );
}

function AcsPreviewStep({
  preview,
  imageOverrides,
  onImageChange,
  onBack,
  onConfirm,
  confirming,
}: {
  preview: AcsChainImportPreview;
  imageOverrides: Record<string, string>;
  onImageChange: (acronym: string, url: string) => void;
  onBack: () => void;
  onConfirm: () => void;
  confirming: boolean;
}) {
  return (
    <div className="flex flex-col gap-3 pt-3">
      <div className="rounded-md border p-3">
        <div className="flex items-center gap-2 text-sm font-semibold">
          <WorkflowIcon className="size-4" />
          {preview.name}
        </div>
        <div className="text-muted-foreground mt-2 flex flex-wrap items-center gap-3 text-[11px]">
          <Badge variant="outline">
            {preview.nodes.length} node{preview.nodes.length === 1 ? '' : 's'}
          </Badge>
          <Badge variant="outline">
            {preview.edges.length} edge{preview.edges.length === 1 ? '' : 's'}
          </Badge>
          {preview.detectedSourceRoot ? (
            <span>
              re-rooted from{' '}
              <code className="font-mono">{preview.detectedSourceRoot}</code>
            </span>
          ) : null}
        </div>
      </div>

      {preview.warnings.map((w) => (
        <div
          key={w}
          className="border-amber-500/40 bg-amber-500/5 text-amber-700 dark:text-amber-400 flex items-start gap-2 rounded-md border p-2 text-xs"
        >
          <CircleAlertIcon className="size-3.5 shrink-0" />
          <span>{w}</span>
        </div>
      ))}

      <Section
        icon={<WorkflowIcon className="size-3.5" />}
        title={`Nodes (${preview.nodes.length})`}
      >
        <ul className="flex flex-col divide-y">
          {preview.nodes.map((n) => (
            <li key={n.acronym} className="py-2">
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="secondary" className="font-mono text-[10px]">
                  {n.acronym}
                </Badge>
                <span className="text-muted-foreground text-xs">
                  v{n.version} — {n.taskCount} task
                  {n.taskCount === 1 ? '' : 's'} (
                  {n.executables.map((e) => e.name).join(' → ')})
                </span>
              </div>
              <div className="mt-1.5 grid grid-cols-1 gap-1 text-[11px]">
                <TypeList label="Products" types={n.dbOutputTypes} tone="ok" />
                <TypeList
                  label="External aux"
                  types={n.externalInputTypes}
                  tone="info"
                />
              </div>
              <div className="mt-1.5 flex items-center gap-2">
                <Label
                  htmlFor={`acs-image-${n.acronym}`}
                  className="text-muted-foreground shrink-0 text-[11px]"
                >
                  Image
                </Label>
                <Input
                  id={`acs-image-${n.acronym}`}
                  value={imageOverrides[n.acronym] ?? n.suggestedImageUrl ?? ''}
                  onChange={(e) => onImageChange(n.acronym, e.target.value)}
                  placeholder="harbor…/cryosat-ocean-ipf1"
                  className="h-7 font-mono text-[11px]"
                />
              </div>
            </li>
          ))}
        </ul>
      </Section>

      {preview.edges.length > 0 ? (
        <Section
          icon={<ArrowRightIcon className="size-3.5" />}
          title={`Edges (${preview.edges.length})`}
        >
          <ul className="flex flex-col gap-1.5">
            {preview.edges.map((e, i) => (
              <li
                key={`${e.parentAcronym}-${e.childAcronym}-${i}`}
                className="flex flex-wrap items-center gap-1.5 text-xs"
              >
                <Badge variant="secondary" className="font-mono text-[10px]">
                  {e.parentAcronym}
                </Badge>
                <ArrowRightIcon className="text-muted-foreground size-3" />
                <Badge variant="secondary" className="font-mono text-[10px]">
                  {e.childAcronym}
                </Badge>
                <Badge
                  variant="outline"
                  className={
                    e.dependencyMode === 'OnCompletion'
                      ? 'text-amber-600 dark:text-amber-400 text-[10px]'
                      : 'text-[10px]'
                  }
                >
                  {e.dependencyMode}
                </Badge>
                <span className="text-muted-foreground">via</span>
                <code className="font-mono text-[10px]">
                  {e.viaTypes.join(', ')}
                </code>
              </li>
            ))}
          </ul>
        </Section>
      ) : null}

      <DialogFooter className="pt-2">
        <Button
          type="button"
          variant="ghost"
          onClick={onBack}
          disabled={confirming}
        >
          <ArrowLeftIcon />
          Back
        </Button>
        <Button type="button" onClick={onConfirm} disabled={confirming}>
          {confirming ? (
            <Loader2Icon className="animate-spin" />
          ) : (
            <UploadCloudIcon />
          )}
          Create chain
        </Button>
      </DialogFooter>
    </div>
  );
}

function Section({
  icon,
  title,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-md border">
      <div className="text-muted-foreground border-b px-3 py-1.5 text-[11px] font-medium uppercase tracking-wide">
        <span className="inline-flex items-center gap-1.5">
          {icon}
          {title}
        </span>
      </div>
      <div className="max-h-56 overflow-auto px-3 py-2">{children}</div>
    </div>
  );
}

function TypeList({
  label,
  types,
  tone,
}: {
  label: string;
  types: string[];
  tone: 'info' | 'ok';
}) {
  return (
    <div className="flex flex-wrap items-center gap-1">
      <span className="text-muted-foreground">{label}:</span>
      {types.length === 0 ? (
        <span className="text-muted-foreground">—</span>
      ) : (
        types.map((t) => (
          <span
            key={t}
            className={
              tone === 'ok'
                ? 'rounded-sm bg-emerald-500/10 px-1 font-mono text-[10px] text-emerald-700 dark:text-emerald-400'
                : 'rounded-sm bg-sky-500/10 px-1 font-mono text-[10px] text-sky-700 dark:text-sky-400'
            }
          >
            {t}
          </span>
        ))
      )}
    </div>
  );
}
