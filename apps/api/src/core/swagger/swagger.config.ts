import { DocumentBuilder, OpenAPIObject } from '@nestjs/swagger';

export const swaggerConfig: Omit<OpenAPIObject, 'paths'> = new DocumentBuilder()
  .setTitle('DPMC API')
  .setVersion(process.env.npm_package_version || 'Unknown')
  .build();
