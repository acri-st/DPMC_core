import { CONFIG } from '../constants/config';

process.env.API_URL ??= CONFIG.api.url;
