import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { SessionGuard } from './session.guard';

type Mocked<T> = { [K in keyof T]: jest.Mock };

function makeContext(
  req: Partial<Express.Request> & Record<string, unknown>,
): ExecutionContext {
  return {
    switchToHttp: () => ({
      getRequest: () => req,
      getResponse: () => ({}),
      getNext: () => undefined,
    }),
  } as unknown as ExecutionContext;
}

describe('SessionGuard', () => {
  let config: { get: jest.Mock };
  let authService: Mocked<{ verifyAccessToken: jest.Mock }>;
  let sessionService: Mocked<{
    load: jest.Mock;
    ensureFresh: jest.Mock;
    touch: jest.Mock;
  }>;
  let userService: Mocked<{ syncFromClaims: jest.Mock }>;
  let guard: SessionGuard;

  beforeEach(() => {
    config = { get: jest.fn().mockReturnValue('dpmc.sid') };
    authService = { verifyAccessToken: jest.fn() };
    sessionService = {
      load: jest.fn(),
      ensureFresh: jest.fn(),
      touch: jest.fn(),
    };
    userService = { syncFromClaims: jest.fn() };
    guard = new SessionGuard(
      config as never,
      authService as never,
      sessionService as never,
      userService as never,
    );
  });

  describe('bearer path', () => {
    it('accepts a valid Authorization: Bearer header and populates req.user/appUser', async () => {
      const claims = { sub: 'kc-user-1', roles: ['operator'] };
      const appUser = { id: 'u-1', email: 'a@b' };
      authService.verifyAccessToken.mockResolvedValue(claims);
      userService.syncFromClaims.mockResolvedValue(appUser);

      const req: Record<string, unknown> = {
        headers: { authorization: 'Bearer abc.def.ghi' },
        cookies: { 'dpmc.sid': 'should-be-ignored' },
      };

      await expect(guard.canActivate(makeContext(req))).resolves.toBe(true);

      expect(authService.verifyAccessToken).toHaveBeenCalledWith('abc.def.ghi');
      expect(sessionService.load).not.toHaveBeenCalled();
      expect(req.user).toEqual(claims);
      expect(req.appUser).toEqual(appUser);
      expect(req.session).toBeNull();
    });

    it('rejects an invalid bearer token with 401', async () => {
      authService.verifyAccessToken.mockRejectedValue(
        new UnauthorizedException('bad'),
      );
      const req = { headers: { authorization: 'Bearer bad' }, cookies: {} };
      await expect(guard.canActivate(makeContext(req))).rejects.toBeInstanceOf(
        UnauthorizedException,
      );
    });
  });

  describe('cookie path', () => {
    it('rejects when no cookie is present and no bearer is set', async () => {
      const req = { headers: {}, cookies: {} };
      await expect(guard.canActivate(makeContext(req))).rejects.toThrow(
        'No session cookie',
      );
    });

    it('loads the session, refreshes if needed, and populates req.user', async () => {
      const loaded = {
        id: 's-1',
        userId: 'u-1',
        accessToken: 'at',
        refreshToken: 'rt',
      };
      sessionService.load.mockResolvedValue(loaded);
      sessionService.ensureFresh.mockResolvedValue(loaded);
      const claims = { sub: 'kc-user-1', roles: ['operator'] };
      authService.verifyAccessToken.mockResolvedValue(claims);
      userService.syncFromClaims.mockResolvedValue({ id: 'u-1' });

      const req: Record<string, unknown> = {
        headers: {},
        cookies: { 'dpmc.sid': 's-1' },
      };
      await expect(guard.canActivate(makeContext(req))).resolves.toBe(true);

      expect(req.user).toEqual(claims);
      expect(req.session).toEqual({ sessionId: 's-1', userId: 'u-1' });
      expect(sessionService.touch).toHaveBeenCalledWith('s-1');
    });
  });
});
