import { useState, type FormEvent } from 'react';

import { Button } from '@/shared/components/ui/button';
import { Input } from '@/shared/components/ui/input';
import { Label } from '@/shared/components/ui/label';
import { Textarea } from '@/shared/components/ui/textarea';
import { Switch } from '@/shared/components/ui/switch';
import type { Project, CreateProjectBody } from '@dpmc/client';

export type ProjectFormValues = CreateProjectBody;

type Props = {
  initial?: Project;
  submitLabel: string;
  onSubmit: (values: ProjectFormValues) => void;
  isSubmitting?: boolean;
};

export function ProjectForm({
  initial,
  submitLabel,
  onSubmit,
  isSubmitting,
}: Props) {
  const [identifier, setIdentifier] = useState(initial?.identifier ?? '');
  const [name, setName] = useState(initial?.name ?? '');
  const [comment, setComment] = useState(initial?.comment ?? '');
  const [isActive, setIsActive] = useState(initial?.isActive ?? true);
  const [isDefault, setIsDefault] = useState(initial?.isDefault ?? false);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    onSubmit({
      identifier,
      name,
      comment: comment.trim() || null,
      isActive,
      isDefault,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4 max-w-xl">
      <div className="space-y-2">
        <Label htmlFor="identifier">Identifier</Label>
        <Input
          id="identifier"
          value={identifier}
          onChange={(e) => setIdentifier(e.target.value)}
          required
          placeholder="e.g. default, partner-x"
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="name">Name</Label>
        <Input
          id="name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="comment">Comment</Label>
        <Textarea
          id="comment"
          value={comment ?? ''}
          onChange={(e) => setComment(e.target.value)}
          rows={3}
        />
      </div>
      <div className="flex items-center gap-3">
        <Switch
          id="isActive"
          checked={isActive}
          onCheckedChange={setIsActive}
        />
        <Label htmlFor="isActive">Active</Label>
      </div>
      <div className="flex items-center gap-3">
        <Switch
          id="isDefault"
          checked={isDefault}
          onCheckedChange={setIsDefault}
        />
        <Label htmlFor="isDefault">Default project</Label>
      </div>
      <div className="flex justify-end gap-2">
        <Button type="submit" disabled={isSubmitting}>
          {submitLabel}
        </Button>
      </div>
    </form>
  );
}
