import type { ColumnDef } from '@tanstack/react-table';
import { formatDistanceToNow } from 'date-fns';
import { ExternalLinkIcon } from 'lucide-react';

import { RowActions } from '@/shared/components/row-actions';
import { UserAvatar } from '@/features/auth/components/user-avatar';
import { getKeycloakAdminUserUrl } from '@/features/user/utils/keycloak-admin-url';
import type { AppUser } from '@/features/user/types';

export function buildUserColumns(): ColumnDef<AppUser>[] {
  return [
    {
      id: 'identity',
      header: 'User',
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          <UserAvatar
            src={row.original.avatarUrl}
            displayName={row.original.displayName}
          />
          <div className="flex flex-col leading-tight">
            <span className="text-sm font-medium">
              {row.original.displayName}
            </span>
            <span className="text-muted-foreground text-xs">
              {row.original.email}
            </span>
          </div>
        </div>
      ),
    },
    {
      accessorKey: 'lastLoginAt',
      header: 'Last login',
      cell: ({ row }) => {
        const v = row.original.lastLoginAt;
        if (!v) return <span className="text-muted-foreground">never</span>;
        return (
          <span className="text-xs">
            {formatDistanceToNow(new Date(v), { addSuffix: true })}
          </span>
        );
      },
    },
    {
      accessorKey: 'createdAt',
      header: 'First seen',
      cell: ({ row }) => (
        <span className="text-muted-foreground text-xs">
          {formatDistanceToNow(new Date(row.original.createdAt), {
            addSuffix: true,
          })}
        </span>
      ),
    },
    {
      id: 'actions',
      header: () => <span className="sr-only">Actions</span>,
      enableSorting: false,
      cell: ({ row }) => (
        <RowActions
          label={`Actions for ${row.original.displayName}`}
          actions={[
            {
              label: 'Open in Keycloak',
              icon: ExternalLinkIcon,
              href: getKeycloakAdminUserUrl(String(row.original.id)),
            },
          ]}
        />
      ),
    },
  ];
}
