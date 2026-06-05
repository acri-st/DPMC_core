import { Link, useParams } from '@tanstack/react-router';
import { format } from 'date-fns';
import {
  AlertCircleIcon,
  ArrowLeftIcon,
  DatabaseIcon,
  LayersIcon,
  Loader2Icon,
} from 'lucide-react';

import { Badge } from '@/shared/components/ui/badge';
import { Button } from '@/shared/components/ui/button';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/shared/components/ui/card';
import { Separator } from '@/shared/components/ui/separator';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/shared/components/ui/table';
import { useDataset } from '@/features/dataset/hooks/use-dataset';

export function DatasetDetailPage() {
  const { datasetId } = useParams({ from: '/datasets/$datasetId' });
  const dataset = useDataset(Number(datasetId));

  if (dataset.isLoading) {
    return (
      <div className="flex flex-1 items-center justify-center rounded-md border">
        <div className="text-muted-foreground flex items-center gap-2 text-sm">
          <Loader2Icon className="size-4 animate-spin" />
          Loading dataset…
        </div>
      </div>
    );
  }

  if (dataset.isError || !dataset.data) {
    return (
      <div className="text-destructive flex items-start gap-2 rounded-md border p-4 text-sm">
        <AlertCircleIcon className="size-4 shrink-0" />
        <span>{dataset.error?.message ?? 'Failed to load dataset'}</span>
      </div>
    );
  }

  const ds = dataset.data;
  const products = ds.products ?? [];

  return (
    <div className="flex flex-1 flex-col gap-4">
      <div className="flex flex-wrap items-center gap-3">
        <Button variant="ghost" size="sm" asChild>
          <Link to="/datasets">
            <ArrowLeftIcon />
            Back
          </Link>
        </Button>
        <div className="min-w-0 flex-1">
          <h1 className="flex items-center gap-2 text-lg font-semibold leading-tight">
            <DatabaseIcon className="size-4" />
            <span className="truncate">
              {ds.name ?? <em className="text-muted-foreground">unnamed</em>}
            </span>
          </h1>
          <p className="text-muted-foreground line-clamp-1 font-mono text-xs">
            {ds.id}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {ds.producedByBatchId ? (
            <Badge variant="outline">Batch output</Badge>
          ) : (
            <Badge variant="secondary">Manual</Badge>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[2fr_1fr]">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">
              Products
              <span className="text-muted-foreground ml-1.5 text-xs font-normal">
                ({products.length})
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {products.length === 0 ? (
              <div className="text-muted-foreground rounded-md border border-dashed p-6 text-center text-sm">
                No products in this dataset.
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-24">Role</TableHead>
                    <TableHead>Product</TableHead>
                    <TableHead className="w-24 text-right">Sequence</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {products.map((p) => (
                    <TableRow
                      key={`${p.datasetId}-${p.productId}-${p.sequence}`}
                    >
                      <TableCell>
                        <Badge variant="outline" className="font-mono">
                          {p.role}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <code className="text-muted-foreground text-xs">
                          {p.productId}
                        </code>
                      </TableCell>
                      <TableCell className="text-right tabular-nums text-xs">
                        {p.sequence}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Metadata</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <Field label="Name">
              {ds.name ? (
                <span>{ds.name}</span>
              ) : (
                <span className="text-muted-foreground italic">unnamed</span>
              )}
            </Field>
            <Separator />
            <Field label="Origin">
              {ds.producedByBatchId ? (
                <Link
                  to="/batches/$id"
                  params={{ id: String(ds.producedByBatchId) }}
                  className="hover:text-primary inline-flex items-center gap-1 font-mono text-xs"
                >
                  <LayersIcon className="size-3" />
                  {String(ds.producedByBatchId).slice(0, 12)}
                </Link>
              ) : (
                <span className="text-muted-foreground">Manual</span>
              )}
            </Field>
            <Separator />
            <Field label="Created">
              <span className="text-xs">
                {format(new Date(ds.createdAt), 'PPpp')}
              </span>
            </Field>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-start justify-between gap-3">
      <span className="text-muted-foreground inline-flex items-center gap-1 text-xs">
        {label}
      </span>
      <span className="text-right">{children}</span>
    </div>
  );
}
