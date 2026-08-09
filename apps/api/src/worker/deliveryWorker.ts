import { and, eq, lte } from 'drizzle-orm';
import { db } from '../db/client';
import { deliveryQueue, deliveryLogs } from '../db/schema';
import { sendMail } from '../smtp/mailer';
import { env } from '../env';
import { logger } from '../lib/logger';

const workerLogger = logger.withTag('delivery-worker');

const POLL_INTERVAL_MS = env.DELIVERY_WORKER_INTERVAL_MS;
const BATCH_SIZE = env.DELIVERY_WORKER_BATCH_SIZE;
const BASE_DELAY_MS = env.DELIVERY_WORKER_BASE_DELAY_MS;
const MAX_DELAY_MS = env.DELIVERY_WORKER_MAX_DELAY_MS;

/** Exported for unit testing - not part of the module's runtime public API otherwise. */
export function backoffDelayMs(attempts: number): number {
  return Math.min(BASE_DELAY_MS * attempts ** 2, MAX_DELAY_MS);
}

/** Exported for unit testing (with smtp/mailer mocked) - see tests/unit/deliveryWorker.test.ts. */
export async function processJob(job: typeof deliveryQueue.$inferSelect) {
  db.update(deliveryQueue).set({ status: 'processing' }).where(eq(deliveryQueue.id, job.id)).run();

  try {
    await sendMail({ to: job.recipient, subject: job.subject, html: job.htmlContent });

    db.update(deliveryQueue).set({ status: 'sent' }).where(eq(deliveryQueue.id, job.id)).run();
    db.insert(deliveryLogs)
      .values({
        id: crypto.randomUUID(),
        recipient: job.recipient,
        subject: job.subject,
        status: 'success',
      })
      .run();
  } catch (error) {
    const attempts = job.attempts + 1;
    const errorMessage = error instanceof Error ? error.message : String(error);

    if (attempts >= job.maxAttempts) {
      db.update(deliveryQueue)
        .set({ status: 'failed', attempts, lastError: errorMessage })
        .where(eq(deliveryQueue.id, job.id))
        .run();
      db.insert(deliveryLogs)
        .values({
          id: crypto.randomUUID(),
          recipient: job.recipient,
          subject: job.subject,
          status: 'failed',
          errorMessage,
        })
        .run();
      return;
    }

    const nextRunAt = new Date(Date.now() + backoffDelayMs(attempts)).toISOString();
    db.update(deliveryQueue)
      .set({ status: 'pending', attempts, lastError: errorMessage, runAt: nextRunAt })
      .where(eq(deliveryQueue.id, job.id))
      .run();
  }
}

/** Exported for unit testing. */
export async function tick() {
  const now = new Date().toISOString();
  const dueJobs = db
    .select()
    .from(deliveryQueue)
    .where(and(eq(deliveryQueue.status, 'pending'), lte(deliveryQueue.runAt, now)))
    .limit(BATCH_SIZE)
    .all();

  for (const job of dueJobs) {
    await processJob(job);
  }
}

let timer: ReturnType<typeof setInterval> | null = null;

export function startDeliveryWorker() {
  if (timer) return;
  timer = setInterval(() => {
    tick().catch((error) => workerLogger.error('tick failed', error));
  }, POLL_INTERVAL_MS);
  workerLogger.info(`polling every ${POLL_INTERVAL_MS}ms`);
}

export function stopDeliveryWorker() {
  if (timer) clearInterval(timer);
  timer = null;
}
