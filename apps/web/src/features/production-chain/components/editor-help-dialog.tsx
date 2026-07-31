import { HelpCircleIcon } from 'lucide-react';

import { Button } from '@/shared/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/shared/components/ui/dialog';

type EditorHelpDialogProps = {
  /** When true, show the editing instructions (admin/operator only). */
  canEdit?: boolean;
};

export function EditorHelpDialog({ canEdit }: EditorHelpDialogProps) {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button
          size="sm"
          variant="outline"
          className="bg-card/80 backdrop-blur"
          aria-label="Help"
        >
          <HelpCircleIcon />
          Help
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[80vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Using the production chain graph</DialogTitle>
          <DialogDescription>
            How to navigate{canEdit ? ' and edit' : ''} the dependency graph.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-5 text-sm">
          <HelpSection title="Navigate">
            <HelpItem term="Pan">
              Drag the empty background to move around.
            </HelpItem>
            <HelpItem term="Zoom">
              Scroll, or use the controls in the bottom-left corner.
            </HelpItem>
            <HelpItem term="Auto layout">
              Re-arranges the nodes automatically; <strong>Fit view</strong>{' '}
              recenters the whole graph (top-right buttons).
            </HelpItem>
            <HelpItem term="Inspect">
              Click a node to see its script, resources and I/O. Click an edge
              to see its dependency.
            </HelpItem>
            <HelpItem term="Legend">
              The colored lines in the bottom-right legend show each dependency
              type and the fan-out marker.
            </HelpItem>
          </HelpSection>

          {canEdit ? (
            <HelpSection title="Edit">
              <HelpItem term="Add a node">
                Click <strong>Node</strong> to open the palette, then click a
                processing script. It is added with a unique name.
              </HelpItem>
              <HelpItem term="Connect nodes">
                Drag from a node&apos;s right handle to another node&apos;s left
                handle to create a dependency (defaults to <em>On success</em>).
              </HelpItem>
              <HelpItem term="Edit an edge">
                Click the edge, then change its dependency mode, toggle{' '}
                <em>fan-out (×N)</em>, or delete it.
              </HelpItem>
              <HelpItem term="Rename / remove a node">
                Click the node, then use <strong>Rename</strong> or{' '}
                <strong>Delete node</strong> (deleting also removes its edges).
              </HelpItem>
              <HelpItem term="Not allowed">
                Self-links, cycles, and duplicate edges between the same two
                nodes are rejected.
              </HelpItem>
            </HelpSection>
          ) : null}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function HelpSection({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-2">
      <h3 className="text-muted-foreground text-[11px] font-semibold uppercase tracking-wider">
        {title}
      </h3>
      <dl className="flex flex-col gap-2">{children}</dl>
    </div>
  );
}

function HelpItem({
  term,
  children,
}: {
  term: string;
  children: React.ReactNode;
}) {
  return (
    <div className="grid grid-cols-[7.5rem_1fr] gap-3">
      <dt className="font-medium">{term}</dt>
      <dd className="text-muted-foreground">{children}</dd>
    </div>
  );
}
