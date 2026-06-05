import { Injectable } from '@nestjs/common';
import { ConfigService } from '../config/config.service';
import { ApiService } from '@dpmc/client';
import axios, { AxiosInstance } from 'axios';

@Injectable()
export class KeycloakService {
  private readonly client: AxiosInstance;

  constructor(private readonly configService: ConfigService) {
    this.client = axios.create({
      baseURL: this.configService.get('KEYCLOAK_URL'),
      headers: {
        'Content-Type': 'application/json',
      },
    });
  }

  async getStatus(): Promise<ApiService> {
    const result: ApiService = {
      name: 'Keycloak',
      status: 'KO',
    };

    try {
      await this.client.get('/realms/master');
      result.status = 'OK';
    } catch {
      result.status = 'KO';
    }

    return result;
  }
}
