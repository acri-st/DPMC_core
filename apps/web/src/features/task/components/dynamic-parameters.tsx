import { Loader2Icon } from 'lucide-react';

import { Input } from '@/shared/components/ui/input';
import { Label } from '@/shared/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/shared/components/ui/select';

export type ParameterDefinition = {
  key: string;
  label: string;
  type: 'string' | 'number' | 'select' | 'color';
  required: boolean;
  default?: string | number;
  options?: string[];
};

export type ParameterValues = Record<string, string | number | null>;

function isParameterDefinition(value: unknown): value is ParameterDefinition {
  if (!value || typeof value !== 'object') return false;
  const o = value as Record<string, unknown>;
  return (
    typeof o.key === 'string' &&
    typeof o.label === 'string' &&
    (o.type === 'string' ||
      o.type === 'number' ||
      o.type === 'select' ||
      o.type === 'color') &&
    typeof o.required === 'boolean'
  );
}

export function extractParameters(
  configuration: Record<string, unknown> | null | undefined,
): ParameterDefinition[] {
  if (!configuration) return [];
  const raw = (configuration as { parameters?: unknown }).parameters;
  if (!Array.isArray(raw)) return [];
  return raw.filter(isParameterDefinition);
}

function initialValueFor(def: ParameterDefinition): string | number {
  if (def.default !== undefined && def.default !== null) return def.default;
  if (def.type === 'select') return def.options?.[0] ?? '';
  return '';
}

export function buildDefaults(defs: ParameterDefinition[]): ParameterValues {
  const out: ParameterValues = {};
  for (const d of defs) out[d.key] = initialValueFor(d);
  return out;
}

export function coerceForSubmit(
  defs: ParameterDefinition[],
  values: ParameterValues,
): Record<string, string | number | null> {
  const out: Record<string, string | number | null> = {};
  for (const d of defs) {
    const v = values[d.key];
    if (v === '' || v === null || v === undefined) {
      out[d.key] = null;
      continue;
    }
    if (d.type === 'number') {
      const n = typeof v === 'number' ? v : Number(v);
      out[d.key] = Number.isFinite(n) ? n : null;
    } else {
      out[d.key] = String(v);
    }
  }
  return out;
}

export function findMissingRequired(
  defs: ParameterDefinition[],
  values: ParameterValues,
): ParameterDefinition | null {
  return (
    defs.find(
      (d) =>
        d.required &&
        (values[d.key] === '' ||
          values[d.key] === null ||
          values[d.key] === undefined),
    ) ?? null
  );
}

export function DynamicParameters({
  loading,
  defs,
  values,
  onChange,
  recap,
  columns = 2,
}: {
  loading: boolean;
  defs: ParameterDefinition[];
  values: ParameterValues;
  onChange: (key: string, value: string | number | null) => void;
  recap: Record<string, string | number | null> | null;
  columns?: 1 | 2;
}) {
  if (loading) {
    return (
      <div className="text-muted-foreground flex items-center gap-2 text-sm">
        <Loader2Icon className="size-4 animate-spin" />
        Loading parameters…
      </div>
    );
  }
  if (defs.length === 0) {
    return (
      <p className="text-muted-foreground text-xs">
        This production chain has no declared parameters.
      </p>
    );
  }
  const gridClass =
    columns === 2
      ? 'grid grid-cols-1 gap-3 sm:grid-cols-2'
      : 'grid grid-cols-1 gap-3';
  return (
    <div className="space-y-3">
      <div className={gridClass}>
        {defs.map((def) => (
          <ParameterField
            key={def.key}
            def={def}
            value={values[def.key]}
            onChange={(v) => onChange(def.key, v)}
          />
        ))}
      </div>
      {recap ? (
        <div>
          <p className="text-muted-foreground mb-1 text-xs">JSON recap</p>
          <pre className="bg-muted/40 max-h-48 overflow-auto rounded-md p-2 font-mono text-[11px]">
            {JSON.stringify(recap, null, 2)}
          </pre>
        </div>
      ) : null}
    </div>
  );
}

function ParameterField({
  def,
  value,
  onChange,
}: {
  def: ParameterDefinition;
  value: string | number | null | undefined;
  onChange: (value: string | number | null) => void;
}) {
  const id = `param-${def.key}`;
  const labelNode = (
    <Label htmlFor={id} className="flex items-center gap-1">
      {def.label}
      {def.required ? <span className="text-destructive">*</span> : null}
    </Label>
  );

  if (def.type === 'select') {
    return (
      <div className="space-y-1.5">
        {labelNode}
        <Select
          value={value == null ? '' : String(value)}
          onValueChange={(v) => onChange(v)}
        >
          <SelectTrigger id={id}>
            <SelectValue placeholder="Select…" />
          </SelectTrigger>
          <SelectContent>
            {(def.options ?? []).map((opt) => (
              <SelectItem key={opt} value={opt}>
                {opt}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    );
  }

  if (def.type === 'number') {
    return (
      <div className="space-y-1.5">
        {labelNode}
        <Input
          id={id}
          type="number"
          value={value == null ? '' : String(value)}
          required={def.required}
          onChange={(e) =>
            onChange(e.target.value === '' ? '' : Number(e.target.value))
          }
        />
      </div>
    );
  }

  if (def.type === 'color') {
    const hex = typeof value === 'string' && value ? value : '#000000';
    return (
      <div className="space-y-1.5">
        {labelNode}
        <div className="flex items-center gap-2">
          <Input
            id={id}
            type="color"
            value={hex}
            onChange={(e) => onChange(e.target.value)}
            className="h-8 w-12 cursor-pointer p-1"
          />
          <Input
            type="text"
            value={hex}
            onChange={(e) => onChange(e.target.value)}
            required={def.required}
            placeholder="#rrggbb"
            className="font-mono"
          />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-1.5">
      {labelNode}
      <Input
        id={id}
        type="text"
        value={value == null ? '' : String(value)}
        required={def.required}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  );
}
