import { Link } from '@tanstack/react-router';
import { ArrowRightIcon, BoxIcon, ServerIcon } from 'lucide-react';

import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/shared/components/ui/card';
import { Badge } from '@/shared/components/ui/badge';
import type { Pool } from '@dpmc/client';

type PoolCardProps = {
  pool: Pool;
};

export function PoolCard({ pool }: PoolCardProps) {
  return (
    <Link
      to="/pools/$id"
      params={{ id: String(pool.id) }}
      className="group focus-visible:ring-ring/50 rounded-md focus-visible:outline-none focus-visible:ring-2"
    >
      <Card className="hover:border-primary/40 hover:shadow-sm h-full transition-colors">
        <CardHeader>
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0 flex-1">
              <CardTitle className="truncate">{pool.name}</CardTitle>
              {pool.comment ? (
                <CardDescription className="line-clamp-2">
                  {pool.comment}
                </CardDescription>
              ) : null}
              {pool.hostCount !== undefined ||
              pool.dataCenterCount !== undefined ? (
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {pool.hostCount !== undefined ? (
                    <Badge
                      variant="outline"
                      className="inline-flex items-center gap-1 text-xs"
                    >
                      <ServerIcon className="size-3" />
                      {pool.hostCount} {pool.hostCount === 1 ? 'host' : 'hosts'}
                    </Badge>
                  ) : null}
                  {pool.dataCenterCount !== undefined ? (
                    <Badge
                      variant="outline"
                      className="inline-flex items-center gap-1 text-xs"
                    >
                      <BoxIcon className="size-3" />
                      {pool.dataCenterCount}{' '}
                      {pool.dataCenterCount === 1
                        ? 'data center'
                        : 'data centers'}
                    </Badge>
                  ) : null}
                </div>
              ) : null}
            </div>
            <ArrowRightIcon className="text-muted-foreground group-hover:text-foreground mt-1 size-4 shrink-0 transition-colors" />
          </div>
        </CardHeader>
      </Card>
    </Link>
  );
}
