import { Link, useRouterState } from '@tanstack/react-router';
import {
  CheckCircle2Icon,
  ChevronsUpDownIcon,
  LogOutIcon,
  SettingsIcon,
  XCircleIcon,
} from 'lucide-react';

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarSeparator,
  SidebarTrigger,
} from '@/shared/components/ui/sidebar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/shared/components/ui/dropdown-menu';
import {
  useCurrentUser,
  useLogout,
} from '@/features/auth/hooks/use-current-user';
import { useIsAdmin } from '@/features/auth/hooks/use-is-admin';
import { UserAvatar } from '@/features/auth/components/user-avatar';
import { NAV_ITEMS } from '@/features/layout/nav-items';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/shared/components/ui/tooltip';
import { useApiStatus } from '../hooks/use-api-status';

function ServicesBadge() {
  const { data } = useApiStatus();
  if (!data) return null;
  const healthy = data.status === 'OK';
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button className="text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground flex w-full cursor-default items-center gap-2 rounded-md px-2 py-1.5 text-xs transition-colors">
          {healthy ? (
            <CheckCircle2Icon className="size-3.5 shrink-0 text-emerald-500" />
          ) : (
            <XCircleIcon className="size-3.5 shrink-0 text-amber-500" />
          )}
          <span
            className={`truncate font-medium ${healthy ? 'text-emerald-600' : 'text-amber-600'}`}
          >
            {healthy ? 'Services healthy' : 'Degraded'}
          </span>
        </button>
      </TooltipTrigger>
      <TooltipContent
        side="right"
        className="flex flex-col items-start gap-1.5 p-2.5"
      >
        {data.services.map((svc) => (
          <div key={svc.name} className="flex items-center gap-2">
            <span
              className={`size-1.5 shrink-0 rounded-full ${svc.status === 'OK' ? 'bg-emerald-400' : 'bg-rose-400'}`}
            />
            <span className="capitalize text-zinc-200">{svc.name}</span>
            <span
              className={`font-mono text-[10px] ${svc.status === 'OK' ? 'text-emerald-400' : 'text-rose-400'}`}
            >
              {svc.status}
            </span>
          </div>
        ))}
      </TooltipContent>
    </Tooltip>
  );
}

const HEADER_HEIGHT_PX = 56;
const NAV_SECTIONS = [
  {
    label: 'Orchestration',
    items: ['/production-chain', '/batches', '/tasks', '/schedules'],
  },
  {
    label: 'Catalog',
    items: ['/products', '/product-types', '/processing-scripts', '/datasets'],
  },
  {
    label: 'Infrastructure',
    items: ['/data-center', '/pools', '/hosts'],
  },
  {
    label: 'Workspace',
    items: ['/admin/projects', '/users'],
  },
] as const;

export function DashboardSidebar() {
  const pathname = useRouterState({
    select: (s) => s.location.pathname,
  });
  const isAdmin = useIsAdmin();
  const logoutMutation = useLogout();
  const { data: user } = useCurrentUser();
  const visibleItems = NAV_ITEMS.filter(
    (item) => !item.requiresAdmin || isAdmin,
  );
  const overviewItem = visibleItems.find((item) => item.to === '/overview');
  const navSections = NAV_SECTIONS.map((section) => ({
    label: section.label,
    items: visibleItems.filter((item) =>
      section.items.some((to) => to === item.to),
    ),
  })).filter((section) => section.items.length > 0);

  return (
    <Sidebar
      collapsible="icon"
      style={
        {
          top: `${HEADER_HEIGHT_PX}px`,
          height: `calc(100svh - ${HEADER_HEIGHT_PX}px)`,
        } as React.CSSProperties
      }
    >
      <SidebarTrigger className="bg-background text-foreground hover:bg-accent hover:text-accent-foreground absolute top-1/8 right-0 z-20 hidden size-8 translate-x-1/2 -translate-y-1/2 cursor-pointer rounded-full border shadow-sm transition-[background-color,color,border-color,box-shadow] duration-150 ease-out active:not-aria-[haspopup]:-translate-y-1/2 md:inline-flex" />

      <SidebarContent>
        {overviewItem ? (
          <SidebarGroup className="pt-3">
            <SidebarGroupContent>
              <SidebarMenu>
                <SidebarMenuItem>
                  <SidebarMenuButton
                    asChild
                    isActive={overviewItem.matchPath(pathname)}
                    tooltip={overviewItem.label}
                  >
                    <Link to={overviewItem.to}>
                      <overviewItem.icon />
                      <span>{overviewItem.label}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ) : null}

        {overviewItem && navSections.length > 0 ? <SidebarSeparator /> : null}

        <SidebarGroup className="gap-2 pt-2">
          <SidebarGroupContent>
            {navSections.map((section) => (
              <div key={section.label}>
                <SidebarGroupLabel>{section.label}</SidebarGroupLabel>
                <SidebarMenu>
                  {section.items.map((item) => (
                    <SidebarMenuItem key={item.to}>
                      <SidebarMenuButton
                        asChild
                        isActive={item.matchPath(pathname)}
                        tooltip={item.label}
                      >
                        <Link to={item.to}>
                          <item.icon />
                          <span>{item.label}</span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  ))}
                </SidebarMenu>
              </div>
            ))}
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <div className="px-2 pb-1">
        <ServicesBadge />
      </div>

      <SidebarSeparator />

      <SidebarFooter>
        <SidebarMenu>
          {user ? (
            <SidebarMenuItem>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <SidebarMenuButton
                    tooltip={`${user.displayName} · ${user.email}`}
                    size="lg"
                  >
                    <UserAvatar
                      src={user.avatarUrl}
                      displayName={user.displayName}
                    />
                    <div className="grid flex-1 text-left text-sm leading-tight">
                      <span className="truncate font-medium">
                        {user.displayName}
                      </span>
                      <span className="text-muted-foreground truncate text-xs">
                        {user.email}
                      </span>
                    </div>
                    <ChevronsUpDownIcon className="ml-auto size-4 opacity-60" />
                  </SidebarMenuButton>
                </DropdownMenuTrigger>
                <DropdownMenuContent
                  side="right"
                  align="end"
                  sideOffset={8}
                  className="min-w-56"
                >
                  <DropdownMenuItem asChild>
                    <Link to="/settings">
                      <SettingsIcon />
                      <span>Settings</span>
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    variant="destructive"
                    onSelect={() => {
                      logoutMutation.mutate(undefined, {
                        onSuccess: () => window.location.assign('/'),
                      });
                    }}
                  >
                    <LogOutIcon />
                    <span>Sign out</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </SidebarMenuItem>
          ) : null}
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
