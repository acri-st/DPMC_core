import { initContract } from '@ts-rest/core';
import * as $ from './routes';
export * from './routes';
export * from './schemas';

const c = initContract();

export const productionChain = c.router({
  list: $.ListProductionChainRoute,
  get: $.GetProductionChainRoute,
  create: $.CreateProductionChainRoute,
  update: $.UpdateProductionChainRoute,
  delete: $.DeleteProductionChainRoute,
  addEdge: $.AddEdgeRoute,
  updateEdge: $.UpdateEdgeRoute,
  deleteEdge: $.DeleteEdgeRoute,
  addProcessingChain: $.AddProcessingChainRoute,
  updateProcessingChain: $.UpdateProcessingChainRoute,
  deleteProcessingChain: $.DeleteProcessingChainRoute,
  linkProductType: $.LinkProductTypeRoute,
  unlinkProductType: $.UnlinkProductTypeRoute,
});
