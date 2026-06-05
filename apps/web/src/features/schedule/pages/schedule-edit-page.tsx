import { useState } from 'react';
import { Link, useNavigate, useParams } from '@tanstack/react-router';
import { useQuery } from '@tanstack/react-query';
import {
  AlertCircleIcon,
  ArrowLeftIcon,
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
import {
  getSchedule,
  type Schedule,
} from '@/features/schedule/services/schedule.service';
import { useUpdateSchedule } from '@/features/schedule/hooks/use-schedule-mutations';
import { scheduleGetKey } from '@/features/schedule/hooks/use-schedule-list';
import {
  RecurrenceFields,
  resolveCron,
  type RecurrenceValue,
} from '@/features/schedule/components/recurrence-fields';
import { describeCron } from '@/features/schedule/libs/cron-describe';
import {
  CRON_CUSTOM,
  CRON_PRESETS,
} from '@/features/schedule/libs/cron-presets';

function toRecurrence(cron: string): RecurrenceValue {
  const preset = CRON_PRESETS.find((p) => p.value === cron);
  return preset
    ? { preset: preset.value, custom: '' }
    : { preset: CRON_CUSTOM, custom: cron };
}

export function ScheduleEditPage() {
  const { id: idParam } = useParams({ from: '/schedules/$id' });
  const id = Number(idParam);
  const query = useQuery({
    queryKey: scheduleGetKey(id),
    queryFn: () => getSchedule(id),
  });

  if (query.isLoading) {
    return (
      <div className="text-muted-foreground flex flex-1 items-center justify-center gap-2 text-sm">
        <Loader2Icon className="size-4 animate-spin" />
        Loading schedule…
      </div>
    );
  }

  if (query.isError || !query.data) {
    return (
      <div className="text-destructive flex items-start gap-2 rounded-md border p-4 text-sm">
        <AlertCircleIcon className="size-4 shrink-0" />
        <span>{query.error?.message ?? 'Failed to load schedule'}</span>
      </div>
    );
  }

  // Keyed by id so the form state is freshly initialised from the loaded
  // schedule (no useEffect seeding — the controlled Select reflects the saved
  // recurrence on first render).
  return <ScheduleEditForm key={query.data.id} schedule={query.data} />;
}

function ScheduleEditForm({ schedule }: { schedule: Schedule }) {
  const navigate = useNavigate();
  const update = useUpdateSchedule();

  const [name, setName] = useState(schedule.name);
  const [priority, setPriority] = useState(schedule.priority);
  const [recurrence, setRecurrence] = useState<RecurrenceValue>(() =>
    toRecurrence(schedule.cronExpression),
  );

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    const cronExpression = resolveCron(recurrence);
    const described = describeCron(cronExpression);
    if (!cronExpression || !described.ok) {
      toast.error('Invalid cron expression');
      return;
    }
    update.mutate(
      {
        id: schedule.id,
        body: { name: name.trim() || schedule.name, priority, cronExpression },
      },
      { onSuccess: () => void navigate({ to: '/schedules' }) },
    );
  };

  return (
    <div className="flex flex-1 flex-col gap-4">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" asChild>
          <Link to="/schedules">
            <ArrowLeftIcon />
            Back
          </Link>
        </Button>
        <h1 className="text-lg font-semibold">Edit schedule</h1>
        <Badge variant="outline">{schedule.kind}</Badge>
      </div>

      <form onSubmit={handleSave} className="max-w-lg">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Schedule</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Name</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Nightly calibration"
              />
            </div>
            <RecurrenceFields value={recurrence} onChange={setRecurrence} />
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
            <Button type="submit" disabled={update.isPending}>
              {update.isPending ? (
                <Loader2Icon className="animate-spin" />
              ) : (
                <SaveIcon />
              )}
              Save
            </Button>
          </CardContent>
        </Card>
      </form>
    </div>
  );
}
