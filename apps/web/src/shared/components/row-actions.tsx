import { Fragment, useState } from 'react';
import { MoreVerticalIcon, type LucideIcon } from 'lucide-react';

import { Button } from '@/shared/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/shared/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/shared/components/ui/alert-dialog';

export type RowAction = {
  /** Visible item label, also used as React key — keep unique within a menu. */
  label: string;
  icon?: LucideIcon;
  /** Run when the item is selected (or confirmed, when `confirm` is set). */
  onSelect?: () => void;
  /** Render the item as an external link instead of a button. */
  href?: string;
  variant?: 'default' | 'destructive';
  disabled?: boolean;
  /** Draw a separator above this item (ignored for the first item). */
  separatorBefore?: boolean;
  /** When set, selecting the item opens a confirmation dialog before `onSelect`. */
  confirm?: {
    title: string;
    description?: string;
    /** Confirm button label (default "Confirm"). */
    confirmLabel?: string;
  };
};

type RowActionsProps = {
  actions: RowAction[];
  /** Accessible label for the trigger button. */
  label?: string;
};

/**
 * Standard three-dots (⋮) row action menu for data tables.
 * Renders a popover of actions; destructive/confirmable actions open an
 * AlertDialog before running. Stops row-click propagation on its own.
 */
export function RowActions({
  actions,
  label = 'Open actions menu',
}: RowActionsProps) {
  const [pending, setPending] = useState<RowAction | null>(null);

  if (actions.length === 0) return null;

  return (
    <div className="flex justify-end" onClick={(e) => e.stopPropagation()}>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon-sm" aria-label={label}>
            <MoreVerticalIcon className="size-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-44">
          {actions.map((action, i) => {
            const Icon = action.icon;
            const content = (
              <>
                {Icon ? <Icon /> : null}
                {action.label}
              </>
            );
            return (
              <Fragment key={action.label}>
                {action.separatorBefore && i > 0 ? (
                  <DropdownMenuSeparator />
                ) : null}
                {action.href ? (
                  <DropdownMenuItem
                    asChild
                    variant={action.variant}
                    disabled={action.disabled}
                  >
                    <a href={action.href} target="_blank" rel="noreferrer">
                      {content}
                    </a>
                  </DropdownMenuItem>
                ) : (
                  <DropdownMenuItem
                    variant={action.variant}
                    disabled={action.disabled}
                    onSelect={() => {
                      if (action.confirm) setPending(action);
                      else action.onSelect?.();
                    }}
                  >
                    {content}
                  </DropdownMenuItem>
                )}
              </Fragment>
            );
          })}
        </DropdownMenuContent>
      </DropdownMenu>

      <AlertDialog
        open={pending !== null}
        onOpenChange={(open) => {
          if (!open) setPending(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{pending?.confirm?.title}</AlertDialogTitle>
            {pending?.confirm?.description ? (
              <AlertDialogDescription>
                {pending.confirm.description}
              </AlertDialogDescription>
            ) : null}
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              variant={
                pending?.variant === 'destructive' ? 'destructive' : 'default'
              }
              onClick={() => {
                pending?.onSelect?.();
                setPending(null);
              }}
            >
              {pending?.confirm?.confirmLabel ?? 'Confirm'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
