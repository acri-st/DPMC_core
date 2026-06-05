import {
  AddPoolHostResponse200Schema,
  CreatePoolBodySchema,
  CreatePoolResponse201Schema,
  DeletePoolResponse204Schema,
  GetPoolResponse200Schema,
  ListPoolResponse200Schema,
  RemovePoolHostResponse204Schema,
  UpdatePoolBodySchema,
  UpdatePoolResponse200Schema,
} from '@dpmc/client';
import { createZodDto } from 'nestjs-zod';

export const ListPoolResponseSchema = ListPoolResponse200Schema;
export class ListPoolResponse extends createZodDto(ListPoolResponseSchema) {}

export const GetPoolResponseSchema = GetPoolResponse200Schema;
export class GetPoolResponse extends createZodDto(GetPoolResponseSchema) {}

export class CreatePoolBody extends createZodDto(CreatePoolBodySchema) {}
export const CreatePoolResponseSchema = CreatePoolResponse201Schema;
export class CreatePoolResponse extends createZodDto(
  CreatePoolResponseSchema,
) {}

export class UpdatePoolBody extends createZodDto(UpdatePoolBodySchema) {}
export const UpdatePoolResponseSchema = UpdatePoolResponse200Schema;
export class UpdatePoolResponse extends createZodDto(
  UpdatePoolResponseSchema,
) {}

export const DeletePoolResponseSchema = DeletePoolResponse204Schema;
export class DeletePoolResponse extends createZodDto(
  DeletePoolResponseSchema,
) {}

export const AddPoolHostResponseSchema = AddPoolHostResponse200Schema;
export class AddPoolHostResponse extends createZodDto(
  AddPoolHostResponseSchema,
) {}

export const RemovePoolHostResponseSchema = RemovePoolHostResponse204Schema;
export class RemovePoolHostResponse extends createZodDto(
  RemovePoolHostResponseSchema,
) {}
