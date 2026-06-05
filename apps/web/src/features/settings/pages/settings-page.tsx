import {
  ExpandIcon,
  MaximizeIcon,
  MonitorIcon,
  MoonIcon,
  SettingsIcon,
  SunIcon,
} from 'lucide-react';
import type { ReactNode } from 'react';

import { PageHeader } from '@/shared/components/page-header';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/shared/components/ui/card';
import { Label } from '@/shared/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/shared/components/ui/radio-group';
import {
  useSettingsStore,
  type ContainerSize,
  type ThemeSetting,
} from '@/shared/stores/settings-store';

export function SettingsPage() {
  const theme = useSettingsStore((s) => s.theme);
  const setTheme = useSettingsStore((s) => s.setTheme);
  const containerSize = useSettingsStore((s) => s.containerSize);
  const setContainerSize = useSettingsStore((s) => s.setContainerSize);

  return (
    <div className="flex flex-1 flex-col gap-4">
      <PageHeader
        icon={SettingsIcon}
        title="Settings"
        subtitle="Preferences are stored in cookies and shared across tabs."
      />

      <Card>
        <CardHeader>
          <CardTitle>Appearance</CardTitle>
          <CardDescription>Choose how the dashboard looks.</CardDescription>
        </CardHeader>
        <CardContent>
          <RadioGroup
            value={theme}
            onValueChange={(value) => setTheme(value as ThemeSetting)}
            className="grid grid-cols-1 gap-3 md:grid-cols-3"
          >
            <OptionCard
              value="light"
              icon={<SunIcon className="size-4" />}
              title="Light"
              description="Always use the light theme."
            />
            <OptionCard
              value="dark"
              icon={<MoonIcon className="size-4" />}
              title="Dark"
              description="Always use the dark theme."
            />
            <OptionCard
              value="system"
              icon={<MonitorIcon className="size-4" />}
              title="System"
              description="Follow the OS preference."
            />
          </RadioGroup>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Page width</CardTitle>
          <CardDescription>
            Constrained keeps content readable on wide screens; full uses every
            pixel.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <RadioGroup
            value={containerSize}
            onValueChange={(value) => setContainerSize(value as ContainerSize)}
            className="grid grid-cols-1 gap-3 md:grid-cols-2"
          >
            <OptionCard
              value="constrained"
              icon={<MaximizeIcon className="size-4" />}
              title="Constrained"
              description="Centered content, max-width 6xl (~72rem)."
            />
            <OptionCard
              value="full"
              icon={<ExpandIcon className="size-4" />}
              title="Full"
              description="Stretch content to the whole viewport width."
            />
          </RadioGroup>
        </CardContent>
      </Card>
    </div>
  );
}

type OptionCardProps = {
  value: string;
  icon: ReactNode;
  title: string;
  description: string;
};

function OptionCard({ value, icon, title, description }: OptionCardProps) {
  return (
    <Label
      htmlFor={`settings-${value}`}
      className="hover:border-primary/40 flex cursor-pointer items-start gap-3 rounded-md border p-3 transition-colors has-[[data-state=checked]]:border-primary has-[[data-state=checked]]:ring-primary/30 has-[[data-state=checked]]:ring-2"
    >
      <RadioGroupItem
        id={`settings-${value}`}
        value={value}
        className="mt-0.5"
      />
      <div className="flex flex-col gap-0.5">
        <span className="inline-flex items-center gap-1.5 text-sm font-medium">
          {icon}
          {title}
        </span>
        <span className="text-muted-foreground text-xs font-normal">
          {description}
        </span>
      </div>
    </Label>
  );
}
