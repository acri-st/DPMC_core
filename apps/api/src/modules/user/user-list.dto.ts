import { ListUsersResponse200Schema } from '@dpmc/client';
import { createZodDto } from 'nestjs-zod';

export const ListUsersResponseSchema = ListUsersResponse200Schema;
export class ListUsersResponse extends createZodDto(ListUsersResponseSchema) {}
