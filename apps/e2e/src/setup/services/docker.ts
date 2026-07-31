import { execFileSync } from 'node:child_process';
import { CONFIG } from '../../constants/config';

function compose(args: string[]) {
  execFileSync(
    'docker',
    [
      'compose',
      '-f',
      CONFIG.paths.composeFile,
      '-p',
      CONFIG.docker.project,
      ...args,
    ],
    { stdio: 'inherit' },
  );
}

export const docker = {
  up() {
    compose(['up', '-d', '--wait']);
  },
  down() {
    compose(['down', '-v']);
  },
  /** Stop one compose service, leaving the rest of the stack alone. */
  stopService(name: string) {
    compose(['stop', name]);
  },
  /** Bring a stopped service back and wait for its health check. */
  startService(name: string) {
    compose(['up', '-d', '--wait', name]);
  },
};
