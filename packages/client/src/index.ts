import * as routes from '@/libs';
import { initClient } from '@ts-rest/core';

export * from '@/constants';
export * from '@/libs';
export * from '@/schemas';

export const client = (apiUrl: string, headers?: Record<string, string>) => {
  const baseHeaders = {
    'Content-Type': 'application/json',
    ...headers,
  };

  const opts = {
    baseUrl: apiUrl,
    baseHeaders,
    credentials: 'include' as RequestCredentials,
  };

  return {
    status: initClient(routes.status, opts),
    batch: initClient(routes.batch, opts),
    job: initClient(routes.job, opts),
    productionChain: initClient(routes.productionChain, opts),
    processingScript: initClient(routes.processingScript, opts),
    dataset: initClient(routes.dataset, opts),
    dataCenter: initClient(routes.dataCenter, opts),
    host: initClient(routes.host, opts),
    auth: initClient(routes.auth, opts),
    me: initClient(routes.me, opts),
    project: initClient(routes.project, opts),
    product: initClient(routes.product, opts),
    productType: initClient(routes.productType, opts),
    pool: initClient(routes.pool, opts),
    auxiliaryConfiguration: initClient(routes.auxiliaryConfiguration, opts),
    processorVersion: initClient(routes.processorVersion, opts),
    task: initClient(routes.task, opts),
    taskSchedule: initClient(routes.taskSchedule, opts),
  };
};
