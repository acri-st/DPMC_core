import {
  CreateAuxiliaryConfigurationBodySchema,
  CreateAuxiliaryConfigurationResponse201Schema,
  DeleteAuxiliaryConfigurationResponse204Schema,
  GetAuxiliaryConfigurationResponse200Schema,
  ListAuxiliaryConfigurationResponse200Schema,
  UpdateAuxiliaryConfigurationBodySchema,
  UpdateAuxiliaryConfigurationResponse200Schema,
} from '@dpmc/client';
import { createZodDto } from 'nestjs-zod';

export const ListAuxiliaryConfigurationResponseSchema =
  ListAuxiliaryConfigurationResponse200Schema;
export class ListAuxiliaryConfigurationResponse extends createZodDto(
  ListAuxiliaryConfigurationResponseSchema,
) {}

export const GetAuxiliaryConfigurationResponseSchema =
  GetAuxiliaryConfigurationResponse200Schema;
export class GetAuxiliaryConfigurationResponse extends createZodDto(
  GetAuxiliaryConfigurationResponseSchema,
) {}

export class CreateAuxiliaryConfigurationBody extends createZodDto(
  CreateAuxiliaryConfigurationBodySchema,
) {}
export const CreateAuxiliaryConfigurationResponseSchema =
  CreateAuxiliaryConfigurationResponse201Schema;
export class CreateAuxiliaryConfigurationResponse extends createZodDto(
  CreateAuxiliaryConfigurationResponseSchema,
) {}

export class UpdateAuxiliaryConfigurationBody extends createZodDto(
  UpdateAuxiliaryConfigurationBodySchema,
) {}
export const UpdateAuxiliaryConfigurationResponseSchema =
  UpdateAuxiliaryConfigurationResponse200Schema;
export class UpdateAuxiliaryConfigurationResponse extends createZodDto(
  UpdateAuxiliaryConfigurationResponseSchema,
) {}

export const DeleteAuxiliaryConfigurationResponseSchema =
  DeleteAuxiliaryConfigurationResponse204Schema;
export class DeleteAuxiliaryConfigurationResponse extends createZodDto(
  DeleteAuxiliaryConfigurationResponseSchema,
) {}
