import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/shared/components/ui/select';
import { Input } from '@/shared/components/ui/input';
import { Label } from '@/shared/components/ui/label';
import {
  CRON_CUSTOM,
  CRON_PRESETS,
} from '@/features/schedule/libs/cron-presets';
import { describeCron } from '@/features/schedule/libs/cron-describe';

export type RecurrenceValue = {
  preset: string; // a preset cron value, or CRON_CUSTOM
  custom: string; // the free-text expression when preset === CRON_CUSTOM
};

export function resolveCron(value: RecurrenceValue): string {
  return value.preset === CRON_CUSTOM ? value.custom.trim() : value.preset;
}

export function RecurrenceFields({
  value,
  onChange,
}: {
  value: RecurrenceValue;
  onChange: (next: RecurrenceValue) => void;
}) {
  const expression = resolveCron(value);
  const described = expression ? describeCron(expression) : null;

  return (
    <div className="space-y-3">
      <div className="space-y-2">
        <Label>Recurrence</Label>
        <Select
          value={value.preset}
          onValueChange={(preset) => onChange({ ...value, preset })}
        >
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Select a frequency" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={CRON_CUSTOM}>Custom…</SelectItem>
            {CRON_PRESETS.map((p) => (
              <SelectItem key={p.value} value={p.value}>
                {p.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="cron-custom">Cron expression</Label>
        <Input
          id="cron-custom"
          value={expression}
          onChange={(e) =>
            onChange({ preset: CRON_CUSTOM, custom: e.target.value })
          }
          placeholder="e.g. 0 0 * * *"
        />
      </div>

      {described ? (
        described.ok ? (
          <p className="text-muted-foreground text-xs">{described.text}</p>
        ) : (
          <p className="text-destructive text-xs">{described.error}</p>
        )
      ) : null}
    </div>
  );
}
