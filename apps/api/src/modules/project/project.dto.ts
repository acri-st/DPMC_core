import {
  CreateProjectBodySchema,
  CreateProjectResponse201Schema,
  DeleteProjectResponse204Schema,
  GetProjectResponse200Schema,
  ListProjectResponse200Schema,
  SetDefaultProjectResponse200Schema,
  UpdateProjectBodySchema,
  UpdateProjectResponse200Schema,
} from '@dpmc/client';
import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';
import {
  PaginationQuerySchema,
  optionalBoolean,
} from '@/common/utils/pagination';

// GET /project typed filters
export const ProjectListQuerySchema = PaginationQuerySchema.extend({
  isActive: optionalBoolean(),
  isDefault: optionalBoolean(),
});
export type ProjectListQuery = z.infer<typeof ProjectListQuerySchema>;
export class ProjectListQueryDto extends createZodDto(ProjectListQuerySchema) {}

// GET /project
export const ListProjectResponseSchema = ListProjectResponse200Schema;
export class ListProjectResponse extends createZodDto(
  ListProjectResponseSchema,
) {}

// GET /project/:id
export const GetProjectResponseSchema = GetProjectResponse200Schema;
export class GetProjectResponse extends createZodDto(
  GetProjectResponseSchema,
) {}

// POST /project
export class CreateProjectBody extends createZodDto(CreateProjectBodySchema) {}
export const CreateProjectResponseSchema = CreateProjectResponse201Schema;
export class CreateProjectResponse extends createZodDto(
  CreateProjectResponseSchema,
) {}

// PATCH /project/:id
export class UpdateProjectBody extends createZodDto(UpdateProjectBodySchema) {}
export const UpdateProjectResponseSchema = UpdateProjectResponse200Schema;
export class UpdateProjectResponse extends createZodDto(
  UpdateProjectResponseSchema,
) {}

// DELETE /project/:id
export const DeleteProjectResponseSchema = DeleteProjectResponse204Schema;
export class DeleteProjectResponse extends createZodDto(
  DeleteProjectResponseSchema,
) {}

// POST /project/:id/set-default
export const SetDefaultProjectResponseSchema =
  SetDefaultProjectResponse200Schema;
export class SetDefaultProjectResponse extends createZodDto(
  SetDefaultProjectResponseSchema,
) {}
