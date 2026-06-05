import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Loader2Icon, PlusIcon, TrashIcon } from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/shared/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/shared/components/ui/dialog';
import { Input } from '@/shared/components/ui/input';
import { Label } from '@/shared/components/ui/label';
import {
  SearchableSelect,
  type SearchableSelectOption,
} from '@/shared/components/ui/searchable-select';
import { useDebouncedValue } from '@/shared/hooks/use-debounced-value';
import { useProductList } from '@/features/product/hooks/use-product-list';
import { createDataset } from '@/features/dataset/services/dataset.service';

type ProductRow = { product: SearchableSelectOption | null; role: string };

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const EMPTY_ROW: ProductRow = { product: null, role: 'input' };

export function DatasetCreateDialog({ open, onOpenChange }: Props) {
  const [name, setName] = useState('');
  const [rows, setRows] = useState<ProductRow[]>([{ ...EMPTY_ROW }]);
  const [productSearch, setProductSearch] = useState('');
  const debouncedProductSearch = useDebouncedValue(productSearch, 300);
  const queryClient = useQueryClient();
  const productsQuery = useProductList({
    page: 1,
    pageSize: 50,
    q: debouncedProductSearch.trim() || undefined,
  });
  const productOptions: SearchableSelectOption[] = (
    productsQuery.data?.items ?? []
  ).map((p) => ({
    value: String(p.id),
    label: p.version ? `${p.name} · ${p.version}` : p.name,
  }));

  const reset = () => {
    setName('');
    setRows([{ ...EMPTY_ROW }]);
    setProductSearch('');
  };

  const mutation = useMutation({
    mutationFn: () =>
      createDataset({
        name: name.trim() ? name.trim() : undefined,
        products: rows
          .filter((r) => r.product && r.role.trim())
          .map((r, i) => ({
            productId: Number(r.product!.value),
            role: r.role.trim(),
            sequence: i,
          })),
      }),
    onSuccess: (created) => {
      toast.success(
        created.name ? `Dataset "${created.name}" created` : 'Dataset created',
      );
      void queryClient.invalidateQueries({ queryKey: ['dataset', 'list'] });
      reset();
      onOpenChange(false);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const validRows = rows.filter((r) => r.product && r.role.trim());
  const canSubmit = validRows.length > 0 && !mutation.isPending;

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!o) reset();
        onOpenChange(o);
      }}
    >
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>New Dataset</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="dataset-name">Name</Label>
            <Input
              id="dataset-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Optional descriptive label"
            />
          </div>

          <div className="space-y-2">
            <Label>Products</Label>
            <div className="space-y-2">
              {rows.map((row, i) => (
                <div
                  key={i}
                  className="grid grid-cols-[1fr_auto_auto] items-center gap-2"
                >
                  <SearchableSelect
                    value={row.product}
                    onValueChange={(value) =>
                      setRows((rs) =>
                        rs.map((r, j) =>
                          j === i ? { ...r, product: value } : r,
                        ),
                      )
                    }
                    items={productOptions}
                    onSearchChange={setProductSearch}
                    placeholder="Select a product"
                    searchPlaceholder="Search products…"
                    emptyText="No products found."
                    loading={productsQuery.isFetching}
                  />
                  <Input
                    className="w-32"
                    value={row.role}
                    onChange={(e) =>
                      setRows((rs) =>
                        rs.map((r, j) =>
                          j === i ? { ...r, role: e.target.value } : r,
                        ),
                      )
                    }
                    placeholder="role"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    aria-label="Remove product"
                    disabled={rows.length === 1}
                    onClick={() =>
                      setRows((rs) => rs.filter((_, j) => j !== i))
                    }
                  >
                    <TrashIcon className="size-4" />
                  </Button>
                </div>
              ))}
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setRows((rs) => [...rs, { ...EMPTY_ROW }])}
            >
              <PlusIcon />
              Add product
            </Button>
            <p className="text-muted-foreground text-xs">
              Role labels (e.g. <code>input</code>, <code>reference</code>) are
              passed through to the processor script.
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
          <Button
            type="button"
            disabled={!canSubmit}
            onClick={() => mutation.mutate()}
          >
            {mutation.isPending ? (
              <Loader2Icon className="animate-spin" />
            ) : null}
            Create
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
