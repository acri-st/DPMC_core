import { Link } from '@tanstack/react-router';
import { RocketIcon } from 'lucide-react';

import { Button } from '@/shared/components/ui/button';
import { ProjectSelector } from '@/features/project/components/project-selector';

export function DashboardHeader() {
  return (
    <header className="bg-background sticky top-0 z-10 flex h-14 shrink-0 items-center gap-3 border-b px-4">
      <Link
        to="/overview"
        className="flex shrink-0 items-center gap-2"
        aria-label="DPMC home"
      >
        <img
          src="/brand/logo-satellite.png"
          alt=""
          className="ring-border/60 size-8 rounded-md object-cover ring-1"
        />
        <div className="hidden flex-col text-sm leading-tight sm:flex">
          <span className="font-semibold">DPMC</span>
          <span className="text-muted-foreground text-xs">
            Data Processing Management Component
          </span>
        </div>
      </Link>

      <div className="ml-auto flex items-center gap-3">
        <Button size="sm" asChild>
          <Link to="/tasks/new">
            <RocketIcon />
            Launch task
          </Link>
        </Button>
        <div className="hidden md:block">
          <ProjectSelector />
        </div>
      </div>
    </header>
  );
}
