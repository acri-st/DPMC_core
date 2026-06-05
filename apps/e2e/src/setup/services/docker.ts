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
};
