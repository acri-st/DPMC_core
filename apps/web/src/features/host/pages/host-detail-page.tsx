import {
  Link,
  useNavigate,
  useParams,
  useSearch,
} from '@tanstack/react-router';
import {
  AlertCircleIcon,
  ArrowLeftIcon,
  Loader2Icon,
  RefreshCwIcon,
  ServerIcon,
} from 'lucide-react';

import { Badge } from '@/shared/components/ui/badge';
import { Button } from '@/shared/components/ui/button';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/shared/components/ui/tabs';
import { HostStatusBadge } from '@/features/host/components/host-status-badge';
import { HostOverviewTab } from '@/features/host/components/host-overview-tab';
import { HostLogsTab } from '@/features/host/components/host-logs-tab';
import { useHost } from '@/features/host/hooks/use-host';

type TabKey = 'overview' | 'logs';

function isTabKey(value: unknown): value is TabKey {
  return value === 'overview' || value === 'logs';
}

export function HostDetailPage() {
  const { id } = useParams({ from: '/hosts/$id' });
  const search = useSearch({ from: '/hosts/$id' }) as { tab?: string };
  const navigate = useNavigate();
  const activeTab: TabKey = isTabKey(search.tab) ? search.tab : 'overview';

  const { data, isLoading, isError, error, refetch, isFetching } = useHost(
    Number(id),
  );

  return (
    <div className="flex flex-1 flex-col gap-4">
      <div className="flex flex-wrap items-center gap-3">
        <Button variant="ghost" size="sm" asChild>
          <Link to="/hosts">
            <ArrowLeftIcon />
            Back
          </Link>
        </Button>
        {data ? (
          <>
            <div className="min-w-0 flex-1">
              <h1 className="flex items-center gap-2 truncate text-lg font-semibold leading-tight">
                <ServerIcon className="text-muted-foreground size-4 shrink-0" />
                {data.hostname}
              </h1>
              <div className="text-muted-foreground mt-0.5 flex flex-wrap items-center gap-1.5 text-[11px]">
                <HostStatusBadge status={data.status} />
                <Badge variant="outline">
                  {data.osType} · {data.osVersion}
                </Badge>
                <Badge variant="outline">{data.containerRuntime}</Badge>
                <Badge variant="outline">
                  Priority: {data.schedulingPriority}
                </Badge>
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => void refetch()}
              disabled={isFetching}
            >
              <RefreshCwIcon
                className={isFetching ? 'animate-spin' : undefined}
              />
              Refresh
            </Button>
          </>
        ) : null}
      </div>

      {isLoading ? (
        <div className="flex flex-1 items-center justify-center rounded-md border">
          <div className="text-muted-foreground flex items-center gap-2 text-sm">
            <Loader2Icon className="size-4 animate-spin" />
            Loading host…
          </div>
        </div>
      ) : null}

      {isError ? (
        <div className="text-destructive flex items-start gap-2 rounded-md border p-4 text-sm">
          <AlertCircleIcon className="size-4 shrink-0" />
          <span>{error?.message ?? 'Failed to load host'}</span>
        </div>
      ) : null}

      {data ? (
        <Tabs
          value={activeTab}
          onValueChange={(v) =>
            navigate({
              to: '/hosts/$id',
              params: { id },
              search: { tab: isTabKey(v) ? v : undefined },
            })
          }
          className="flex flex-1 flex-col gap-3"
        >
          <TabsList className="self-start">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="logs">Logs</TabsTrigger>
          </TabsList>
          <TabsContent value="overview" className="m-0 flex-1">
            <HostOverviewTab host={data} />
          </TabsContent>
          <TabsContent value="logs" className="m-0 flex-1">
            <HostLogsTab hostId={data.id} />
          </TabsContent>
        </Tabs>
      ) : null}
    </div>
  );
}
