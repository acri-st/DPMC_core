import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from '@tanstack/react-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeftIcon,
  ClipboardListIcon,
  Loader2Icon,
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
import { Badge } from '@/shared/components/ui/badge';
import { Input } from '@/shared/components/ui/input';
import { Label } from '@/shared/components/ui/label';
import { Textarea } from '@/shared/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/shared/components/ui/radio-group';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/shared/components/ui/select';
import {
  SearchableSelect,
  type SearchableSelectOption,
} from '@/shared/components/ui/searchable-select';
import { Switch } from '@/shared/components/ui/switch';
import { useDebouncedValue } from '@/shared/hooks/use-debounced-value';
import { useCurrentUser } from '@/features/auth/hooks/use-current-user';
import { useCurrentProject } from '@/features/project/hooks/use-current-project';
import { useDatasetList } from '@/features/dataset/hooks/use-dataset-list';
import { useProductionChainGraph } from '@/features/production-chain/hooks/use-production-chain-graph';
import { createTask } from '@/features/task/services/task.service';
import {
  listProcessorVersionsLookup,
  listProductionChainsLookup,
} from '@/features/task/services/lookup.service';
import {
  DynamicParameters,
  buildDefaults,
  coerceForSubmit,
  extractParameters,
  findMissingRequired,
  type ParameterValues,
} from '@/features/task/components/dynamic-parameters';
import {
  RecurrenceFields,
  resolveCron,
  type RecurrenceValue,
} from '@/features/schedule/components/recurrence-fields';
import { useCreateSchedule } from '@/features/schedule/hooks/use-schedule-mutations';
import { describeCron } from '@/features/schedule/libs/cron-describe';
import type { CreateTaskBody, CreateTaskScheduleBody } from '@dpmc/client';

type TaskKindForm = 'Chain' | 'Standalone';

export function TaskCreatePage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { status } = useCurrentUser();
  const project = useCurrentProject();
  const enabled = status === 'authenticated' && Boolean(project.data);

  const chains = useQuery({
    queryKey: [
      'lookup',
      'production-chains',
      { projectId: project.data?.id ?? null },
    ],
    queryFn: listProductionChainsLookup,
    enabled,
  });
  const processors = useQuery({
    queryKey: ['lookup', 'processor-versions'],
    queryFn: listProcessorVersionsLookup,
    enabled,
  });

  const [kind, setKind] = useState<TaskKindForm>('Chain');
  const [productionChainId, setProductionChainId] = useState<string>('');
  const [processorVersionId, setProcessorVersionId] = useState<string>('');
  const [useExistingDataset, setUseExistingDataset] = useState<boolean>(false);
  const [inputDataset, setInputDataset] =
    useState<SearchableSelectOption | null>(null);
  const [datasetSearch, setDatasetSearch] = useState<string>('');
  const debouncedDatasetSearch = useDebouncedValue(datasetSearch, 300);
  const [scheduledStartTime, setScheduledStartTime] = useState<string>(() => {
    const now = new Date();
    now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
    return now.toISOString().slice(0, 16);
  });
  const [priority, setPriority] = useState<number>(0);
  const [comment, setComment] = useState<string>('');
  const [paramOverrides, setParamOverrides] = useState<ParameterValues>({});
  const [scheduled, setScheduled] = useState<boolean>(false);
  const [scheduleName, setScheduleName] = useState<string>('');
  const [recurrence, setRecurrence] = useState<RecurrenceValue>({
    preset: '0 0 * * *', // every day at midnight
    custom: '',
  });
  const createScheduleMutation = useCreateSchedule();

  const chainGraph = useProductionChainGraph(
    kind === 'Chain' && productionChainId ? productionChainId : null,
  );

  const datasetsQuery = useDatasetList({
    pageSize: 50,
    name: debouncedDatasetSearch.trim() || undefined,
  });
  const datasetOptions: SearchableSelectOption[] = (
    datasetsQuery.data?.items ?? []
  ).map((d) => ({
    value: String(d.id),
    label: d.name ?? String(d.id).slice(0, 8),
  }));

  const paramDefs = useMemo(
    () => extractParameters(chainGraph.data?.selectedVersion?.configuration),
    [chainGraph.data?.selectedVersion?.configuration],
  );

  const paramValues = useMemo<ParameterValues>(
    () => ({ ...buildDefaults(paramDefs), ...paramOverrides }),
    [paramDefs, paramOverrides],
  );

  useEffect(() => {
    setParamOverrides({});
  }, [productionChainId]);

  const paramJson = useMemo(
    () => (paramDefs.length ? coerceForSubmit(paramDefs, paramValues) : null),
    [paramDefs, paramValues],
  );

  const create = useMutation({
    mutationFn: (body: CreateTaskBody) => createTask(body),
    onSuccess: (task) => {
      toast.success('Task created');
      queryClient.invalidateQueries({ queryKey: ['task'] });
      void navigate({ to: '/tasks/$id', params: { id: String(task.id) } });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!project.data) {
      toast.error('No active project. Pick one in the header.');
      return;
    }

    if (scheduled) {
      const cronExpression = resolveCron(recurrence);
      const described = describeCron(cronExpression);
      if (!cronExpression || !described.ok) {
        toast.error('Invalid cron expression');
        return;
      }
      if (kind === 'Chain') {
        if (!productionChainId) {
          toast.error('Production chain is required');
          return;
        }
        const missing = findMissingRequired(paramDefs, paramValues);
        if (missing) {
          toast.error(`Missing required parameter: ${missing.label}`);
          return;
        }
      } else if (!processorVersionId) {
        toast.error('Processor version is required');
        return;
      }
      const chainName = chains.data?.find(
        (c) => c.id === Number(productionChainId),
      )?.name;
      const processorName = processors.data?.find(
        (p) => p.id === Number(processorVersionId),
      )?.baseline;
      const body: CreateTaskScheduleBody =
        kind === 'Chain'
          ? {
              kind: 'Chain',
              name: scheduleName.trim() || chainName || 'Scheduled chain',
              cronExpression,
              productionChainId: Number(productionChainId),
              productionMode: 'Generic',
              priority,
              comment: comment.trim() || null,
              parameters: paramJson,
            }
          : {
              kind: 'Standalone',
              name:
                scheduleName.trim() || processorName || 'Scheduled standalone',
              cronExpression,
              processorVersionId: Number(processorVersionId),
              productionMode: 'Generic',
              priority,
              comment: comment.trim() || null,
              parameters: null,
            };
      createScheduleMutation.mutate(body, {
        onSuccess: () => void navigate({ to: '/schedules' }),
      });
      return;
    }

    if (useExistingDataset && !inputDataset) {
      toast.error('Pick an existing dataset or disable the toggle');
      return;
    }
    const datasetIdToSend =
      useExistingDataset && inputDataset
        ? Number(inputDataset.value)
        : undefined;

    if (kind === 'Chain') {
      if (!productionChainId) {
        toast.error('Production chain is required');
        return;
      }
      const missing = findMissingRequired(paramDefs, paramValues);
      if (missing) {
        toast.error(`Missing required parameter: ${missing.label}`);
        return;
      }
      const body: CreateTaskBody = {
        kind: 'Chain',
        productionChainId: Number(productionChainId),
        scheduledStartTime: new Date(scheduledStartTime),
        productionMode: 'Generic',
        priority,
        comment: comment.trim() || null,
        parameters: paramJson,
        inputDatasetId: datasetIdToSend,
      };
      create.mutate(body);
    } else {
      if (!processorVersionId) {
        toast.error('Processor version is required');
        return;
      }
      const body: CreateTaskBody = {
        kind: 'Standalone',
        processorVersionId: Number(processorVersionId),
        scheduledStartTime: new Date(scheduledStartTime),
        productionMode: 'Generic',
        priority,
        comment: comment.trim() || null,
        parameters: null,
        inputDatasetId: datasetIdToSend,
      };
      create.mutate(body);
    }
  };

  return (
    <div className="flex flex-1 flex-col gap-4">
      <div className="flex flex-wrap items-center gap-3">
        <Button variant="ghost" size="sm" asChild>
          <Link to="/tasks">
            <ArrowLeftIcon />
            Back
          </Link>
        </Button>
        <div className="min-w-0 flex-1">
          <h1 className="flex items-center gap-2 text-lg font-semibold leading-tight">
            <ClipboardListIcon className="size-4" />
            New task
          </h1>
          <p className="text-muted-foreground flex items-center gap-2 text-xs">
            Schedule a chain or a single processor in
            {project.data ? (
              <Badge variant="outline">{project.data.name}</Badge>
            ) : (
              <span className="text-destructive">no active project</span>
            )}
          </p>
        </div>
      </div>

      <form
        onSubmit={handleSubmit}
        className="grid grid-cols-1 gap-4 lg:grid-cols-[2fr_1fr]"
      >
        <div className="flex flex-col gap-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Target</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Kind</Label>
                <RadioGroup
                  value={kind}
                  onValueChange={(v) => setKind(v as TaskKindForm)}
                  className="grid grid-cols-1 gap-3 sm:grid-cols-2"
                >
                  <Label
                    htmlFor="kind-chain"
                    className="hover:bg-accent/50 has-[:checked]:border-primary has-[:checked]:bg-primary/5 flex cursor-pointer items-start gap-3 rounded-md border p-3 font-normal transition-colors"
                  >
                    <RadioGroupItem
                      value="Chain"
                      id="kind-chain"
                      className="mt-0.5"
                    />
                    <span className="space-y-0.5">
                      <span className="block text-sm font-medium">Chain</span>
                      <span className="text-muted-foreground block text-xs">
                        Runs a full production chain
                      </span>
                    </span>
                  </Label>
                  <Label
                    htmlFor="kind-standalone"
                    className="hover:bg-accent/50 has-[:checked]:border-primary has-[:checked]:bg-primary/5 flex cursor-pointer items-start gap-3 rounded-md border p-3 font-normal transition-colors"
                  >
                    <RadioGroupItem
                      value="Standalone"
                      id="kind-standalone"
                      className="mt-0.5"
                    />
                    <span className="space-y-0.5">
                      <span className="block text-sm font-medium">
                        Standalone
                      </span>
                      <span className="text-muted-foreground block text-xs">
                        Runs a single processor
                      </span>
                    </span>
                  </Label>
                </RadioGroup>
              </div>

              {kind === 'Chain' ? (
                <div className="space-y-2">
                  <Label>Production chain</Label>
                  <Select
                    value={productionChainId}
                    onValueChange={setProductionChainId}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select a production chain" />
                    </SelectTrigger>
                    <SelectContent>
                      {(chains.data ?? []).map((c) => (
                        <SelectItem key={c.id} value={String(c.id)}>
                          {c.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              ) : (
                <div className="space-y-2">
                  <Label>Processor version</Label>
                  <Select
                    value={processorVersionId}
                    onValueChange={setProcessorVersionId}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select a processor version" />
                    </SelectTrigger>
                    <SelectContent>
                      {(processors.data ?? []).map((p) => (
                        <SelectItem key={p.id} value={String(p.id)}>
                          {p.baseline} ·{' '}
                          {String(p.processingScriptVersionId).slice(0, 6)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Input</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between">
                <Label htmlFor="use-existing-dataset">
                  Use existing Dataset as input
                </Label>
                <Switch
                  id="use-existing-dataset"
                  checked={useExistingDataset}
                  onCheckedChange={(v) => {
                    setUseExistingDataset(v);
                    if (!v) setInputDataset(null);
                  }}
                  disabled={scheduled}
                />
              </div>
              {scheduled ? (
                <p className="text-muted-foreground text-xs">
                  Scheduled tasks build their input dataset per run; pinning an
                  existing one is not supported here.
                </p>
              ) : useExistingDataset ? (
                <div className="space-y-2">
                  <SearchableSelect
                    value={inputDataset}
                    onValueChange={setInputDataset}
                    items={datasetOptions}
                    onSearchChange={setDatasetSearch}
                    placeholder="Select a dataset"
                    searchPlaceholder="Search datasets…"
                    emptyText="No datasets found."
                    loading={datasetsQuery.isFetching}
                  />
                  <p className="text-muted-foreground text-xs">
                    The selected Dataset will be reused as the task's input
                    rather than being built from the trigger job.
                  </p>
                </div>
              ) : (
                <p className="text-muted-foreground text-xs">
                  Default: the trigger job builds the input dataset from
                  discovered Products.
                </p>
              )}
            </CardContent>
          </Card>

          {kind === 'Chain' && productionChainId ? (
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Parameters</CardTitle>
              </CardHeader>
              <CardContent>
                <DynamicParameters
                  loading={chainGraph.isLoading}
                  defs={paramDefs}
                  values={paramValues}
                  onChange={(key, v) =>
                    setParamOverrides((prev) => ({ ...prev, [key]: v }))
                  }
                  recap={paramJson}
                />
              </CardContent>
            </Card>
          ) : null}

          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Comment</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <Label htmlFor="comment">Comment</Label>
                <Textarea
                  id="comment"
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  rows={3}
                  placeholder="Optional context or note for this run"
                />
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="flex flex-col gap-4 lg:sticky lg:top-4 lg:self-start">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Schedule</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <Label htmlFor="recurring">Recurring</Label>
                <Switch
                  id="recurring"
                  checked={scheduled}
                  onCheckedChange={setScheduled}
                />
              </div>
              {scheduled ? (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="schedule-name">Name</Label>
                    <Input
                      id="schedule-name"
                      value={scheduleName}
                      onChange={(e) => setScheduleName(e.target.value)}
                      placeholder="e.g. Nightly calibration"
                    />
                    <p className="text-muted-foreground text-xs">
                      Defaults to the selected chain/processor name if left
                      blank.
                    </p>
                  </div>
                  <RecurrenceFields
                    value={recurrence}
                    onChange={setRecurrence}
                  />
                </>
              ) : (
                <div className="space-y-2">
                  <Label htmlFor="schedule">Scheduled start time</Label>
                  <Input
                    id="schedule"
                    type="datetime-local"
                    value={scheduledStartTime}
                    onChange={(e) => setScheduledStartTime(e.target.value)}
                    required={!scheduled}
                  />
                </div>
              )}
              <div className="space-y-2">
                <Label htmlFor="priority">Priority</Label>
                <Input
                  id="priority"
                  type="number"
                  value={priority}
                  onChange={(e) => setPriority(Number(e.target.value))}
                />
                <p className="text-muted-foreground text-xs">
                  Higher values run first.
                </p>
              </div>
            </CardContent>
          </Card>

          <Button
            type="submit"
            disabled={
              create.isPending || createScheduleMutation.isPending || !enabled
            }
            size="lg"
          >
            {create.isPending || createScheduleMutation.isPending ? (
              <Loader2Icon className="animate-spin" />
            ) : (
              <SaveIcon />
            )}
            {scheduled ? 'Create schedule' : 'Create task'}
          </Button>
        </div>
      </form>
    </div>
  );
}
