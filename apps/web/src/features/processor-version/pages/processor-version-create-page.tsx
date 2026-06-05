import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from '@tanstack/react-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  AlertCircleIcon,
  ArrowLeftIcon,
  Loader2Icon,
  PackageIcon,
  PlusIcon,
  SaveIcon,
} from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/shared/components/ui/button';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/shared/components/ui/card';
import { Input } from '@/shared/components/ui/input';
import { Label } from '@/shared/components/ui/label';
import { Textarea } from '@/shared/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/shared/components/ui/select';
import { useCurrentUser } from '@/features/auth/hooks/use-current-user';
import {
  createAuxiliaryConfiguration,
  createProcessorVersion,
  listAuxiliaryConfigurations,
  listProcessingScriptVersions,
  listProcessingScripts,
} from '@/features/processor-version/services/processor-version.service';

export function ProcessorVersionCreatePage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { status } = useCurrentUser();
  const enabled = status === 'authenticated';

  const scripts = useQuery({
    queryKey: ['processing-script', 'list'],
    queryFn: listProcessingScripts,
    enabled,
  });
  const auxConfigs = useQuery({
    queryKey: ['auxiliary-configuration', 'list'],
    queryFn: listAuxiliaryConfigurations,
    enabled,
  });

  const [scriptId, setScriptId] = useState<string>('');
  const [versionId, setVersionId] = useState<string>('');
  const [auxConfigId, setAuxConfigId] = useState<string>('');
  const [auxMode, setAuxMode] = useState<'existing' | 'new'>('existing');
  const [newAuxName, setNewAuxName] = useState('');
  const [newAuxBaseline, setNewAuxBaseline] = useState('');
  const [newAuxComment, setNewAuxComment] = useState('');

  const [baseline, setBaseline] = useState('');
  const [comment, setComment] = useState('');
  const [parametersText, setParametersText] = useState('');
  const [parseError, setParseError] = useState<string | null>(null);

  const versions = useQuery({
    queryKey: ['processing-script-version', scriptId],
    queryFn: () => listProcessingScriptVersions(scriptId),
    enabled: enabled && Boolean(scriptId),
  });

  // Reset version when script changes
  useEffect(() => {
    setVersionId('');
  }, [scriptId]);

  const createAux = useMutation({
    mutationFn: createAuxiliaryConfiguration,
  });

  const create = useMutation({
    mutationFn: createProcessorVersion,
    onSuccess: () => {
      toast.success('Processor version created');
      queryClient.invalidateQueries({ queryKey: ['processor-version'] });
      queryClient.invalidateQueries({ queryKey: ['auxiliary-configuration'] });
      void navigate({ to: '/processor-versions' });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const auxOptions = useMemo(() => auxConfigs.data ?? [], [auxConfigs.data]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setParseError(null);

    let parameters: unknown = undefined;
    if (parametersText.trim()) {
      try {
        parameters = JSON.parse(parametersText);
      } catch {
        setParseError('Parameters must be valid JSON');
        return;
      }
    }

    if (!versionId) {
      toast.error('Pick a script and version');
      return;
    }
    if (!baseline.trim()) {
      toast.error('Baseline is required');
      return;
    }

    let resolvedAuxId: number | null = auxConfigId ? Number(auxConfigId) : null;
    try {
      if (auxMode === 'new') {
        if (!newAuxName.trim()) {
          toast.error('New aux config name is required');
          return;
        }
        const aux = await createAux.mutateAsync({
          name: newAuxName.trim(),
          baseline: newAuxBaseline.trim() || null,
          comment: newAuxComment.trim() || null,
        });
        resolvedAuxId = aux.id;
      }
      if (resolvedAuxId == null) {
        toast.error('Auxiliary configuration is required');
        return;
      }

      create.mutate({
        processingScriptVersionId: Number(versionId),
        auxiliaryConfigurationId: resolvedAuxId,
        baseline: baseline.trim(),
        comment: comment.trim() || null,
        parameters: parameters ?? null,
      });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to create');
    }
  };

  return (
    <div className="flex flex-1 flex-col gap-4">
      <div className="flex flex-wrap items-center gap-3">
        <Button variant="ghost" size="sm" asChild>
          <Link to="/processor-versions">
            <ArrowLeftIcon />
            Back
          </Link>
        </Button>
        <div className="min-w-0 flex-1">
          <h1 className="flex items-center gap-2 text-lg font-semibold leading-tight">
            <PackageIcon className="size-4" />
            New processor version
          </h1>
          <p className="text-muted-foreground text-xs">
            Pair a script version with an auxiliary configuration.
          </p>
        </div>
      </div>

      <form
        onSubmit={handleSubmit}
        className="grid grid-cols-1 gap-4 lg:grid-cols-2"
      >
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Script version</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Script</Label>
              <Select value={scriptId} onValueChange={setScriptId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a script" />
                </SelectTrigger>
                <SelectContent>
                  {(scripts.data ?? []).map((s) => (
                    <SelectItem key={s.id} value={String(s.id)}>
                      {s.acronym} — {s.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Version</Label>
              <Select
                value={versionId}
                onValueChange={setVersionId}
                disabled={!scriptId}
              >
                <SelectTrigger>
                  <SelectValue
                    placeholder={
                      scriptId ? 'Select a version' : 'Pick a script first'
                    }
                  />
                </SelectTrigger>
                <SelectContent>
                  {(versions.data ?? []).map((v) => (
                    <SelectItem key={v.id} value={String(v.id)}>
                      v{v.version}
                      {v.isLatest ? ' · latest' : ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Auxiliary configuration</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-2">
              <Button
                type="button"
                size="sm"
                variant={auxMode === 'existing' ? 'default' : 'outline'}
                onClick={() => setAuxMode('existing')}
              >
                Use existing
              </Button>
              <Button
                type="button"
                size="sm"
                variant={auxMode === 'new' ? 'default' : 'outline'}
                onClick={() => setAuxMode('new')}
              >
                <PlusIcon />
                Create new
              </Button>
            </div>
            {auxMode === 'existing' ? (
              <div className="space-y-2">
                <Label>Auxiliary configuration</Label>
                <Select value={auxConfigId} onValueChange={setAuxConfigId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a configuration" />
                  </SelectTrigger>
                  <SelectContent>
                    {auxOptions.map((a) => (
                      <SelectItem key={a.id} value={String(a.id)}>
                        {a.name}
                        {a.baseline ? ` · ${a.baseline}` : ''}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            ) : (
              <div className="space-y-3 rounded-md border p-3">
                <div className="space-y-2">
                  <Label htmlFor="aux-name">Name</Label>
                  <Input
                    id="aux-name"
                    value={newAuxName}
                    onChange={(e) => setNewAuxName(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="aux-baseline">Baseline</Label>
                  <Input
                    id="aux-baseline"
                    value={newAuxBaseline}
                    onChange={(e) => setNewAuxBaseline(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="aux-comment">Comment</Label>
                  <Textarea
                    id="aux-comment"
                    rows={2}
                    value={newAuxComment}
                    onChange={(e) => setNewAuxComment(e.target.value)}
                  />
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-sm">Processor version</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="baseline">Baseline</Label>
                <Input
                  id="baseline"
                  value={baseline}
                  onChange={(e) => setBaseline(e.target.value)}
                  placeholder="e.g. 2025.04-staging"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="comment">Comment</Label>
                <Input
                  id="comment"
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="parameters">Parameters (JSON)</Label>
              <Textarea
                id="parameters"
                value={parametersText}
                onChange={(e) => setParametersText(e.target.value)}
                rows={5}
                className="font-mono text-xs"
                placeholder='{"flag": true}'
              />
              {parseError ? (
                <p className="text-destructive flex items-center gap-1.5 text-xs">
                  <AlertCircleIcon className="size-3.5" />
                  {parseError}
                </p>
              ) : null}
            </div>
          </CardContent>
        </Card>

        <div className="lg:col-span-2 flex justify-end">
          <Button type="submit" size="lg" disabled={create.isPending}>
            {create.isPending || createAux.isPending ? (
              <Loader2Icon className="animate-spin" />
            ) : (
              <SaveIcon />
            )}
            Create
          </Button>
        </div>
      </form>
    </div>
  );
}
