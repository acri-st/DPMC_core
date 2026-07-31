import { useEffect, useRef, useState } from 'react';
import { PlusIcon, ScrollTextIcon, Trash2Icon } from 'lucide-react';

import { Badge } from '@/shared/components/ui/badge';
import { Button } from '@/shared/components/ui/button';
import { Input } from '@/shared/components/ui/input';
import { Label } from '@/shared/components/ui/label';
import { Switch } from '@/shared/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/shared/components/ui/select';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/shared/components/ui/sheet';

type ParamType = 'string' | 'number' | 'boolean';
const PARAM_TYPES: ParamType[] = ['string', 'number', 'boolean'];

type ChainParam = {
  key: string;
  label: string;
  type: string;
  required?: boolean;
  default?: string | number | boolean | null;
};

/** Editable row — keeps a stable local id and the raw `default` as text. */
type EditableParam = {
  id: string;
  key: string;
  label: string;
  type: ParamType;
  required: boolean;
  default: string;
};

type ChainParametersDrawerProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  configuration: Record<string, unknown> | null;
  canEdit?: boolean;
  disabled?: boolean;
  onSave?: (configuration: Record<string, unknown>) => void;
};

export function ChainParametersDrawer({
  open,
  onOpenChange,
  configuration,
  canEdit,
  disabled,
  onSave,
}: ChainParametersDrawerProps) {
  const editable = Boolean(canEdit && onSave);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="flex flex-col gap-0 overflow-hidden p-0 sm:max-w-lg">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <ScrollTextIcon className="size-4" />
            Chain parameters
          </SheetTitle>
          <SheetDescription>
            Pre-fill values for new tasks launched against this chain.
          </SheetDescription>
        </SheetHeader>

        {editable ? (
          <ParametersEditor
            configuration={configuration}
            open={open}
            disabled={disabled}
            onSave={onSave!}
          />
        ) : (
          <ParametersReadOnly configuration={configuration} />
        )}
      </SheetContent>
    </Sheet>
  );
}

function ParametersReadOnly({
  configuration,
}: {
  configuration: Record<string, unknown> | null;
}) {
  const params = extractParams(configuration);
  return (
    <div className="flex flex-col gap-3 overflow-y-auto p-4 pt-0">
      {params.length === 0 ? (
        <EmptyHint />
      ) : (
        <ul className="flex flex-col gap-2">
          {params.map((p) => (
            <li key={p.key} className="rounded-md border p-2.5 text-xs">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-mono font-medium">{p.key}</span>
                <Badge variant="outline" className="text-[10px]">
                  {p.type}
                </Badge>
                {p.required ? (
                  <Badge variant="outline" className="text-[10px]">
                    required
                  </Badge>
                ) : null}
              </div>
              {p.label && p.label !== p.key ? (
                <p className="text-muted-foreground mt-1">{p.label}</p>
              ) : null}
              <p className="text-muted-foreground mt-1.5 flex items-center gap-1">
                <span>Default:</span>
                <span className="font-mono">
                  {p.default === undefined || p.default === null
                    ? '—'
                    : String(p.default)}
                </span>
              </p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function ParametersEditor({
  configuration,
  open,
  disabled,
  onSave,
}: {
  configuration: Record<string, unknown> | null;
  open: boolean;
  disabled?: boolean;
  onSave: (configuration: Record<string, unknown>) => void;
}) {
  const [params, setParams] = useState<EditableParam[]>([]);
  const [snapshot, setSnapshot] = useState('');
  const idRef = useRef(0);
  const nextId = () => `p${(idRef.current += 1)}`;

  // Sync from the (refetched) configuration whenever the drawer opens or the
  // saved configuration changes. Mid-edit there is no refetch, so local edits
  // are preserved until an explicit Save.
  useEffect(() => {
    if (!open) return;
    const initial = toEditable(configuration, nextId);
    setParams(initial);
    setSnapshot(serialize(initial));
  }, [open, configuration]);

  const keys = params.map((p) => p.key.trim());
  const hasEmptyKey = keys.some((k) => k === '');
  const hasDuplicateKey = new Set(keys).size !== keys.length;
  const hasInvalidNumberDefault = params.some(numberDefaultInvalid);
  const valid = !hasEmptyKey && !hasDuplicateKey && !hasInvalidNumberDefault;
  const dirty = serialize(params) !== snapshot;

  const update = (id: string, patch: Partial<EditableParam>) =>
    setParams((prev) =>
      prev.map((p) => (p.id === id ? { ...p, ...patch } : p)),
    );
  const remove = (id: string) =>
    setParams((prev) => prev.filter((p) => p.id !== id));
  const add = () =>
    setParams((prev) => [
      ...prev,
      {
        id: nextId(),
        key: '',
        label: '',
        type: 'string',
        required: false,
        default: '',
      },
    ]);

  const save = () => {
    const built = params.map(buildParam);
    onSave({ ...(configuration ?? {}), parameters: built });
  };

  return (
    <>
      <div className="flex flex-col gap-2 overflow-y-auto p-4 pt-0">
        {params.length === 0 ? (
          <EmptyHint />
        ) : (
          params.map((p) => (
            <div
              key={p.id}
              className="flex flex-col gap-2 rounded-md border p-3"
            >
              <div className="flex items-end gap-2">
                <Field label="Key" className="flex-1">
                  <Input
                    value={p.key}
                    onChange={(e) => update(p.id, { key: e.target.value })}
                    placeholder="parameter_key"
                    className="h-8 font-mono text-xs"
                    disabled={disabled}
                  />
                </Field>
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-8 shrink-0"
                  aria-label="Remove parameter"
                  disabled={disabled}
                  onClick={() => remove(p.id)}
                >
                  <Trash2Icon className="size-4" />
                </Button>
              </div>
              <Field label="Label">
                <Input
                  value={p.label}
                  onChange={(e) => update(p.id, { label: e.target.value })}
                  placeholder="Human-readable label"
                  className="h-8 text-xs"
                  disabled={disabled}
                />
              </Field>
              <div className="flex items-end gap-2">
                <Field label="Type" className="w-32">
                  <Select
                    value={p.type}
                    onValueChange={(v) =>
                      update(p.id, { type: v as ParamType })
                    }
                    disabled={disabled}
                  >
                    <SelectTrigger className="h-8 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {PARAM_TYPES.map((t) => (
                        <SelectItem key={t} value={t} className="text-xs">
                          {t}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>
                <Field label="Default" className="flex-1">
                  <Input
                    value={p.default}
                    onChange={(e) => update(p.id, { default: e.target.value })}
                    placeholder={
                      p.type === 'boolean' ? 'true / false' : 'optional'
                    }
                    aria-invalid={numberDefaultInvalid(p) || undefined}
                    className={`h-8 font-mono text-xs ${
                      numberDefaultInvalid(p) ? 'border-destructive' : ''
                    }`}
                    disabled={disabled}
                  />
                </Field>
                <label className="flex h-8 items-center gap-1.5 text-[11px]">
                  <Switch
                    checked={p.required}
                    onCheckedChange={(v) => update(p.id, { required: v })}
                    disabled={disabled}
                  />
                  required
                </label>
              </div>
            </div>
          ))
        )}

        <Button
          variant="outline"
          size="sm"
          className="self-start"
          disabled={disabled}
          onClick={add}
        >
          <PlusIcon /> Add parameter
        </Button>
      </div>

      <div className="flex items-center justify-between gap-3 border-t p-4">
        <p className="text-muted-foreground text-[11px]">
          {hasEmptyKey || hasDuplicateKey
            ? 'Keys must be unique and non-empty.'
            : hasInvalidNumberDefault
              ? 'Number parameters need a numeric default.'
              : dirty
                ? 'Unsaved changes.'
                : 'No changes.'}
        </p>
        <Button
          size="sm"
          disabled={disabled || !dirty || !valid}
          onClick={save}
        >
          Save
        </Button>
      </div>
    </>
  );
}

function Field({
  label,
  className,
  children,
}: {
  label: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={`flex flex-col gap-1 ${className ?? ''}`}>
      <Label className="text-[10px] uppercase tracking-wider">{label}</Label>
      {children}
    </div>
  );
}

function EmptyHint() {
  return (
    <p className="text-muted-foreground rounded-md border border-dashed p-6 text-center text-xs">
      No parameters declared on this chain.
    </p>
  );
}

/** A non-empty default that cannot be parsed as a number for a `number` param. */
function numberDefaultInvalid(p: EditableParam): boolean {
  const raw = p.default.trim();
  return p.type === 'number' && raw !== '' && !Number.isFinite(Number(raw));
}

/** Build the persisted parameter object, coercing the default by type. */
function buildParam(p: EditableParam): Record<string, unknown> {
  const out: Record<string, unknown> = {
    key: p.key.trim(),
    label: p.label.trim() || p.key.trim(),
    type: p.type,
    required: p.required,
  };
  const raw = p.default.trim();
  if (raw !== '') {
    if (p.type === 'number') {
      // Save is gated on `numberDefaultInvalid`, so `raw` parses here.
      out.default = Number(raw);
    } else if (p.type === 'boolean') {
      out.default = raw.toLowerCase() === 'true';
    } else {
      out.default = raw;
    }
  }
  return out;
}

function toEditable(
  configuration: Record<string, unknown> | null,
  nextId: () => string,
): EditableParam[] {
  return extractParams(configuration).map((p) => ({
    id: nextId(),
    key: p.key,
    label: p.label === p.key ? '' : p.label,
    type: (PARAM_TYPES as string[]).includes(p.type)
      ? (p.type as ParamType)
      : 'string',
    required: p.required ?? false,
    default:
      p.default === undefined || p.default === null ? '' : String(p.default),
  }));
}

function serialize(params: EditableParam[]): string {
  return JSON.stringify(params.map(({ id: _id, ...rest }) => rest));
}

function extractParams(
  configuration: Record<string, unknown> | null,
): ChainParam[] {
  if (!configuration) return [];
  const raw = (configuration as { parameters?: unknown }).parameters;
  if (!Array.isArray(raw)) return [];
  const out: ChainParam[] = [];
  for (const p of raw) {
    if (!p || typeof p !== 'object') continue;
    const o = p as Record<string, unknown>;
    if (typeof o.key !== 'string') continue;
    out.push({
      key: o.key,
      label: typeof o.label === 'string' ? o.label : o.key,
      type: typeof o.type === 'string' ? o.type : 'string',
      required: typeof o.required === 'boolean' ? o.required : undefined,
      default:
        typeof o.default === 'string' ||
        typeof o.default === 'number' ||
        typeof o.default === 'boolean'
          ? o.default
          : undefined,
    });
  }
  return out;
}
