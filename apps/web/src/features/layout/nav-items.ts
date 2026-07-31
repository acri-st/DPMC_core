import {
  BoxIcon,
  BoxesIcon,
  CalendarClockIcon,
  DatabaseIcon,
  FileCode2Icon,
  FolderIcon,
  LayersIcon,
  LayoutDashboardIcon,
  ListChecksIcon,
  PackageIcon,
  PlayCircleIcon,
  ServerIcon,
  TagsIcon,
  UsersIcon,
  WorkflowIcon,
} from 'lucide-react';

import type { NavItem } from '@/features/layout/types';

export type DashboardNavItem = NavItem & {
  icon: typeof BoxIcon;
};

export const NAV_ITEMS: DashboardNavItem[] = [
  {
    to: '/overview',
    label: 'Overview',
    icon: LayoutDashboardIcon,
    matchPath: (p) => p === '/overview',
  },
  {
    to: '/production-chain',
    label: 'Production Chain',
    icon: WorkflowIcon,
    matchPath: (p) =>
      p === '/production-chain' || p.startsWith('/production-chain/'),
  },
  {
    to: '/batches',
    label: 'Batches',
    icon: LayersIcon,
    matchPath: (p) => p === '/batches' || p.startsWith('/batches/'),
  },
  {
    to: '/tasks',
    label: 'Tasks',
    icon: ListChecksIcon,
    matchPath: (p) => p === '/tasks' || p.startsWith('/tasks/'),
  },
  {
    to: '/schedules',
    label: 'Schedules',
    icon: CalendarClockIcon,
    matchPath: (p) => p === '/schedules' || p.startsWith('/schedules/'),
  },
  {
    to: '/jobs',
    label: 'Jobs',
    icon: PlayCircleIcon,
    matchPath: (p) => p === '/jobs' || p.startsWith('/jobs/'),
  },
  {
    to: '/processor-versions',
    label: 'Processor Versions',
    icon: PackageIcon,
    matchPath: (p) =>
      p === '/processor-versions' || p.startsWith('/processor-versions/'),
  },
  {
    to: '/processing-scripts',
    label: 'Processing Scripts',
    icon: FileCode2Icon,
    matchPath: (p) =>
      p === '/processing-scripts' || p.startsWith('/processing-scripts/'),
  },
  {
    to: '/products',
    label: 'Products',
    icon: BoxesIcon,
    matchPath: (p) => p === '/products' || p.startsWith('/products/'),
  },
  {
    to: '/product-types',
    label: 'Product Types',
    icon: TagsIcon,
    matchPath: (p) => p === '/product-types' || p.startsWith('/product-types/'),
  },
  {
    to: '/datasets',
    label: 'Datasets',
    icon: DatabaseIcon,
    matchPath: (p) => p === '/datasets' || p.startsWith('/datasets/'),
  },
  {
    to: '/hosts',
    label: 'Hosts',
    icon: ServerIcon,
    matchPath: (p) => p === '/hosts',
  },
  {
    to: '/data-center',
    label: 'Data Center',
    icon: BoxIcon,
    matchPath: (p) => p === '/data-center' || p.startsWith('/data-center/'),
  },
  {
    to: '/pools',
    label: 'Pools',
    icon: ServerIcon,
    matchPath: (p) => p === '/pools' || p.startsWith('/pools/'),
  },
  {
    to: '/users',
    label: 'Users',
    icon: UsersIcon,
    matchPath: (p) => p === '/users',
    requiresAdmin: true,
  },
  {
    to: '/admin/projects',
    label: 'Projects',
    icon: FolderIcon,
    matchPath: (p) =>
      p === '/admin/projects' || p.startsWith('/admin/projects/'),
    requiresAdmin: true,
  },
];
