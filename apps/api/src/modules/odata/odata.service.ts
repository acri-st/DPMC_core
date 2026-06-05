import {
  ForbiddenException,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
} from '@nestjs/common';

import { isNotFoundError, serializeBigInt } from '@/common/utils';
import { PrismaService } from '@/core/prisma';

import { parseODataQuery } from './query-parser';
import { ODATA_RESOURCES, type ODataResource } from './resource-registry';
import { pickString } from './odata.utils';

type PrismaModelDelegate = {
  findMany: (args: unknown) => Promise<unknown[]>;
  findUnique: (args: unknown) => Promise<unknown>;
  count: (args: unknown) => Promise<number>;
  create: (args: unknown) => Promise<unknown>;
  update: (args: unknown) => Promise<unknown>;
  delete: (args: unknown) => Promise<unknown>;
};

/**
 * OData v4 read-only service. Routes a `<resource>` URL slug onto the
 * matching Prisma delegate, applies the parsed query, and shapes the
 * response in the OData JSON envelope (`@odata.context`, `@odata.count`,
 * `value`).
 */
@Injectable()
export class ODataService {
  private readonly logger = new Logger(ODataService.name);

  constructor(private readonly prisma: PrismaService) {}

  async list(
    resourceName: string,
    qs: Record<string, string | string[] | undefined>,
  ): Promise<{
    '@odata.context': string;
    '@odata.count'?: number;
    value: unknown[];
  }> {
    const resource = this.resolveResource(resourceName);
    const query = parseODataQuery(qs, resource);
    const includesCount = pickString(qs.$count) === 'true';
    const model = this.getDelegate(resource);

    const findArgs: Record<string, unknown> = {};
    if (query.where) findArgs.where = query.where;
    if (query.select) findArgs.select = query.select;
    // `select` and `include` are mutually exclusive in Prisma, so only
    // honour `include` when no `$select` was provided.
    if (query.include && !query.select) findArgs.include = query.include;
    if (query.orderBy) findArgs.orderBy = query.orderBy;
    if (typeof query.skip === 'number') findArgs.skip = query.skip;
    if (typeof query.take === 'number') findArgs.take = query.take;

    const [data, count] = await Promise.all([
      model.findMany(findArgs),
      includesCount
        ? model.count(query.where ? { where: query.where } : {})
        : Promise.resolve(undefined),
    ]);

    const envelope: {
      '@odata.context': string;
      '@odata.count'?: number;
      value: unknown[];
    } = {
      '@odata.context': `$metadata#${resource.name}`,
      value: serializeBigInt(data) as unknown[],
    };
    if (count !== undefined) {
      envelope['@odata.count'] = count;
    }
    return envelope;
  }

  async getOne(
    resourceName: string,
    id: number,
    qs: Record<string, string | string[] | undefined>,
  ): Promise<Record<string, unknown>> {
    const resource = this.resolveResource(resourceName);
    const query = parseODataQuery(qs, resource);
    const model = this.getDelegate(resource);

    const findArgs: Record<string, unknown> = { where: { id } };
    if (query.select) findArgs.select = query.select;
    if (query.include && !query.select) findArgs.include = query.include;

    const item = await model.findUnique(findArgs);
    if (!item) {
      throw new NotFoundException(`${resourceName}(${id}) not found`);
    }
    return {
      '@odata.context': `$metadata#${resource.name}/$entity`,
      ...(serializeBigInt(item) as Record<string, unknown>),
    };
  }

  async create(
    resourceName: string,
    body: Record<string, unknown>,
  ): Promise<unknown> {
    const resource = this.resolveResource(resourceName);
    if (!resource.writable) {
      throw new ForbiddenException(
        `Resource '${resourceName}' is read-only via OData`,
      );
    }
    const sanitized = this.pickWritableFields(resource, body);
    const model = this.getDelegate(resource);
    const created = await model.create({ data: sanitized });
    return serializeBigInt(created);
  }

  async update(
    resourceName: string,
    id: number,
    body: Record<string, unknown>,
  ): Promise<unknown> {
    const resource = this.resolveResource(resourceName);
    if (!resource.writable) {
      throw new ForbiddenException(
        `Resource '${resourceName}' is read-only via OData`,
      );
    }
    const sanitized = this.pickWritableFields(resource, body);
    const model = this.getDelegate(resource);
    try {
      const updated = await model.update({ where: { id }, data: sanitized });
      return serializeBigInt(updated);
    } catch (err) {
      if (isNotFoundError(err))
        throw new NotFoundException(`${resourceName} ${id} not found`);
      throw err;
    }
  }

  async delete(resourceName: string, id: number): Promise<{ ok: true }> {
    const resource = this.resolveResource(resourceName);
    if (!resource.writable) {
      throw new ForbiddenException(
        `Resource '${resourceName}' is read-only via OData`,
      );
    }
    const model = this.getDelegate(resource);
    try {
      await model.delete({ where: { id } });
      return { ok: true };
    } catch (err) {
      if (isNotFoundError(err))
        throw new NotFoundException(`${resourceName} ${id} not found`);
      throw err;
    }
  }

  private resolveResource(resourceName: string): ODataResource {
    const resource = ODATA_RESOURCES[resourceName];
    if (!resource) {
      throw new NotFoundException(`Unknown OData resource: ${resourceName}`);
    }
    return resource;
  }

  private getDelegate(resource: ODataResource): PrismaModelDelegate {
    const model = (this.prisma as unknown as Record<string, unknown>)[
      resource.prismaModel
    ];
    if (!model || typeof model !== 'object') {
      this.logger.error(
        `Prisma delegate '${resource.prismaModel}' missing for OData resource '${resource.name}'`,
      );
      throw new InternalServerErrorException(
        `Resource ${resource.prismaModel} not found in PrismaService`,
      );
    }
    return model as PrismaModelDelegate;
  }

  /**
   * Strip the incoming body down to the fields declared in
   * `selectableFields`. This reuses the existing registry allow-list as the
   * writable-field surface, preventing clients from touching internal columns
   * (`createdBy`, `deletedAt`, etc.) that are not part of the public API.
   */
  private pickWritableFields(
    resource: ODataResource,
    body: Record<string, unknown>,
  ): Record<string, unknown> {
    const allowed: Record<string, unknown> = {};
    for (const key of resource.selectableFields) {
      if (key in body) allowed[key] = body[key];
    }
    return allowed;
  }
}
