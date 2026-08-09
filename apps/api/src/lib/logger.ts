import { createConsola } from 'consola';
import { env } from '../env';

const LEVELS = { fatal: 0, error: 0, warn: 1, info: 3, debug: 4, trace: 5 } as const;

export const logger = createConsola({
  level: env.LOG_LEVEL === 'silent' ? -999 : LEVELS[env.LOG_LEVEL as keyof typeof LEVELS],
});
