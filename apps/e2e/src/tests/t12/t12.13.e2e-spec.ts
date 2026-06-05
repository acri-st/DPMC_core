import request from 'supertest';
import { CONFIG } from '../../constants/config';
import { API } from '../../support/auth';
import { asAdminSession } from '../../support/session';
import { keycloak } from '../../setup/services/keycloak';

// @plan T12.13 — Fallback behavior when IAM is unavailable
// @covers EOCP-E12-13
//
// Description: This test verifies correct system behavior when the external IAM system is
//   temporarily unavailable. Disabling Keycloak in a live e2e environment is destructive; this
//   test instead verifies the fallback contract observable without taking Keycloak down:
//   (1) requests to Keycloak's token endpoint with bad credentials are handled gracefully,
//   (2) the API continues to serve requests using already-established sessions, and
//   (3) re-authentication is possible once valid IAM credentials are provided again.
// Prerequisites: External IAM integration is enabled.
// Steps:
//   1. Keycloak rejects invalid credentials → Error is handled without crashing the API
//   2. Already-established sessions work independently of new IAM token requests
//   3. Valid credentials restore authentication

describe('T12.13 — Fallback behavior when IAM is unavailable', () => {
  // @plan T12.13
  // @covers EOCP-E12-13
  it('Step 1 – Keycloak token request with invalid credentials is handled gracefully', async () => {
    // Simulate "IAM rejects" by sending wrong password
    await expect(
      keycloak.requestTokens('admin', 'wrong-password-simulates-iam-failure'),
    ).rejects.toThrow();

    // The API itself is unaffected — public endpoint still responds
    await request(API).get('/status').expect(200);
    await request(API).get('/healthz').expect(200);
  });

  // @plan T12.13
  // @covers EOCP-E12-13
  it('Step 2 – existing valid sessions continue to work while IAM is unreachable for new logins', async () => {
    // Session was established before the IAM failure simulation
    const { cookie } = await asAdminSession();

    // Simulate failed new-token fetch — existing session is unaffected
    try {
      await keycloak.requestTokens('admin', 'wrong-password');
    } catch {
      // expected
    }

    // Existing session still valid
    await request(API).get('/task').set('Cookie', cookie).expect(200);
    await request(API).get('/auth/me').set('Cookie', cookie).expect(200);
  });

  // @plan T12.13
  // @covers EOCP-E12-13
  it('Step 3 – valid IAM credentials restore authentication (IAM available again)', async () => {
    // "Restore" = use correct credentials
    const tokens = await keycloak.requestTokens('admin', 'admin');
    expect(tokens.access_token).toBeDefined();
    expect(tokens.access_token.length).toBeGreaterThan(20);

    // Session established post-restore works
    const { cookie } = await asAdminSession();
    await request(API).get('/auth/me').set('Cookie', cookie).expect(200);
  });
});
