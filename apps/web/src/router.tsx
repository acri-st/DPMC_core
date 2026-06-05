import {
  Outlet,
  createRootRoute,
  createRoute,
  createRouter,
  redirect,
} from '@tanstack/react-router';

import { DashboardLayout } from '@/features/layout/components/dashboard-layout';
import { OverviewPage } from '@/features/overview/components/overview-page';
import { HostListPage } from '@/features/host/pages/host-list-page';
import { HostDetailPage } from '@/features/host/pages/host-detail-page';
import { DataCenterListPage } from '@/features/data-center/pages/data-center-list-page';
import { DataCenterDetailPage } from '@/features/data-center/pages/data-center-detail-page';
import { ProductionChainListPage } from '@/features/production-chain/pages/production-chain-list-page';
import { ProductionChainDetailPage } from '@/features/production-chain/pages/production-chain-detail-page';
import { BatchListPage } from '@/features/batch/pages/batch-list-page';
import { BatchDetailPage } from '@/features/batch/pages/batch-detail-page';
import { TaskListPage } from '@/features/task/pages/task-list-page';
import { TaskDetailPage } from '@/features/task/pages/task-detail-page';
import { TaskCreatePage } from '@/features/task/pages/task-create-page';
import { JobListPage } from '@/features/job/pages/job-list-page';
import { JobDetailPage } from '@/features/job/pages/job-detail-page';
import { ProcessorVersionListPage } from '@/features/processor-version/pages/processor-version-list-page';
import { ProcessorVersionCreatePage } from '@/features/processor-version/pages/processor-version-create-page';
import { UserListRouteGuard } from '@/features/user/pages/user-list-route-guard';
import { SettingsPage } from '@/features/settings/pages/settings-page';
import { ProjectListPage } from '@/features/project/pages/project-list-page';
import { ProjectCreatePage } from '@/features/project/pages/project-create-page';
import { ProjectEditPage } from '@/features/project/pages/project-edit-page';
import { ProductListPage } from '@/features/product/pages/product-list-page';
import { ProductTypeListPage } from '@/features/product-type/pages/product-type-list-page';
import { DatasetListPage } from '@/features/dataset/pages/dataset-list-page';
import { DatasetDetailPage } from '@/features/dataset/pages/dataset-detail-page';
import { PoolListPage } from '@/features/pool/pages/pool-list-page';
import { PoolDetailPage } from '@/features/pool/pages/pool-detail-page';
import { ScheduleListPage } from '@/features/schedule/pages/schedule-list-page';
import { ScheduleEditPage } from '@/features/schedule/pages/schedule-edit-page';

const rootRoute = createRootRoute({
  component: () => (
    <DashboardLayout>
      <Outlet />
    </DashboardLayout>
  ),
});

const indexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/',
  beforeLoad: () => {
    throw redirect({ to: '/overview' });
  },
});

const overviewRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/overview',
  component: OverviewPage,
});

const productionChainRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/production-chain',
  component: ProductionChainListPage,
});

const productionChainDetailRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/production-chain/$id',
  component: ProductionChainDetailPage,
});

const batchesRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/batches',
  component: BatchListPage,
});

const batchDetailRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/batches/$id',
  component: BatchDetailPage,
});

const tasksRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/tasks',
  component: TaskListPage,
});

const taskDetailRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/tasks/$id',
  component: TaskDetailPage,
});

const taskCreateRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/tasks/new',
  component: TaskCreatePage,
});

const jobsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/jobs',
  component: JobListPage,
});

const jobDetailRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/jobs/$id',
  component: JobDetailPage,
});

const processorVersionsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/processor-versions',
  component: ProcessorVersionListPage,
});

const processorVersionsCreateRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/processor-versions/new',
  component: ProcessorVersionCreatePage,
});

const hostsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/hosts',
  component: HostListPage,
});

const hostDetailRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/hosts/$id',
  component: HostDetailPage,
});

const dataCenterRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/data-center',
  component: DataCenterListPage,
});

const dataCenterDetailRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/data-center/$id',
  component: DataCenterDetailPage,
});

const poolsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/pools',
  component: PoolListPage,
});

const poolDetailRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/pools/$id',
  component: PoolDetailPage,
});

const schedulesRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/schedules',
  component: ScheduleListPage,
});

const scheduleEditRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/schedules/$id',
  component: ScheduleEditPage,
});

const usersRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/users',
  component: UserListRouteGuard,
});

const settingsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/settings',
  component: SettingsPage,
});

const productsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/products',
  component: ProductListPage,
});

const productTypesRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/product-types',
  component: ProductTypeListPage,
});

const datasetListRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/datasets',
  component: DatasetListPage,
});

const datasetDetailRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/datasets/$datasetId',
  component: DatasetDetailPage,
});

const adminProjectsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/admin/projects',
  component: ProjectListPage,
});

const adminProjectCreateRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/admin/projects/new',
  component: ProjectCreatePage,
});

const adminProjectEditRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/admin/projects/$id/edit',
  component: ProjectEditPage,
});

const routeTree = rootRoute.addChildren([
  indexRoute,
  overviewRoute,
  productionChainRoute,
  productionChainDetailRoute,
  batchesRoute,
  batchDetailRoute,
  tasksRoute,
  taskDetailRoute,
  taskCreateRoute,
  jobsRoute,
  jobDetailRoute,
  processorVersionsRoute,
  processorVersionsCreateRoute,
  hostsRoute,
  hostDetailRoute,
  dataCenterRoute,
  dataCenterDetailRoute,
  poolsRoute,
  poolDetailRoute,
  schedulesRoute,
  scheduleEditRoute,
  productsRoute,
  productTypesRoute,
  datasetListRoute,
  datasetDetailRoute,
  usersRoute,
  settingsRoute,
  adminProjectsRoute,
  adminProjectCreateRoute,
  adminProjectEditRoute,
]);

export const router = createRouter({
  routeTree,
  defaultPreload: 'intent',
});

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router;
  }
}
