import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/shared/components/ui/select';
import { Button } from '@/shared/components/ui/button';

const DEFAULT_PAGE_SIZE_OPTIONS = [10, 25, 50, 100] as const;

type Props = {
  page: number;
  pageSize: number;
  total: number;
  onPageChange: (page: number) => void;
  onPageSizeChange?: (pageSize: number) => void;
  pageSizeOptions?: number[];
  noun?: string;
  nounPlural?: string;
  isFetching?: boolean;
};

export function PagePagination({
  page,
  pageSize,
  total,
  onPageChange,
  onPageSizeChange,
  pageSizeOptions = DEFAULT_PAGE_SIZE_OPTIONS as unknown as number[],
  noun = 'item',
  nounPlural,
  isFetching = false,
}: Props) {
  const totalPages = total === 0 ? 1 : Math.ceil(total / pageSize);
  const fromIndex = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const toIndex = Math.min(page * pageSize, total);
  const pluralLabel = nounPlural ?? `${noun}s`;

  const goToPage = (next: number) => {
    if (next < 1 || next > totalPages) return;
    onPageChange(next);
  };

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 text-sm">
      <div className="text-muted-foreground">
        {total === 0
          ? `0 ${pluralLabel}`
          : `Showing ${fromIndex.toLocaleString()}–${toIndex.toLocaleString()} of ${total.toLocaleString()} ${pluralLabel}`}
      </div>
      <div className="flex items-center gap-2">
        {onPageSizeChange ? (
          <>
            <span className="text-muted-foreground">Rows per page</span>
            <Select
              value={String(pageSize)}
              onValueChange={(v) => {
                onPageSizeChange(Number(v));
                onPageChange(1);
              }}
            >
              <SelectTrigger className="w-[88px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {pageSizeOptions.map((n) => (
                  <SelectItem key={n} value={String(n)}>
                    {n}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </>
        ) : null}
        <div className="ml-2 flex items-center gap-1">
          <Button
            variant="outline"
            size="sm"
            onClick={() => goToPage(1)}
            disabled={page <= 1 || isFetching}
          >
            «
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => goToPage(page - 1)}
            disabled={page <= 1 || isFetching}
          >
            Prev
          </Button>
          <span className="text-muted-foreground px-2 text-xs tabular-nums">
            Page {page.toLocaleString()} / {totalPages.toLocaleString()}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => goToPage(page + 1)}
            disabled={page >= totalPages || isFetching}
          >
            Next
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => goToPage(totalPages)}
            disabled={page >= totalPages || isFetching}
          >
            »
          </Button>
        </div>
      </div>
    </div>
  );
}
