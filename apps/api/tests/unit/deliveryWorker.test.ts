import { describe, expect, test, mock, beforeEach } from 'bun:test';

// Must be registered before deliveryWorker.ts (or its mailer dependency) is
// ever imported, so the dynamic imports below happen only after the mock is
// in place - static top-of-file imports would resolve too early.
const sendMailMock = mock(async (_opts: { to: string; subject: string; html: string }) => ({}));
mock.module('../../src/smtp/mailer', () => ({
  sendMail: sendMailMock,
  createTransport: mock(() => ({})),
}));

const { tick, processJob, backoffDelayMs } = await import('../../src/worker/deliveryWorker');
const { db } = await import('../../src/db/client');
const { deliveryQueue, deliveryLogs } = await import('../../src/db/schema');
const { eq } = await import('drizzle-orm');
const { resetDb } = await import('../helpers');

beforeEach(() => {
  resetDb();
  sendMailMock.mockClear();
});

function insertJob(overrides: Partial<typeof deliveryQueue.$inferInsert> = {}) {
  const id = crypto.randomUUID();
  db.insert(deliveryQueue)
    .values({
      id,
      recipient: 'user@example.com',
      subject: 'Hi',
      htmlContent: '<p>Hi</p>',
      status: 'pending',
      attempts: 0,
      maxAttempts: 3,
      runAt: new Date(Date.now() - 1000).toISOString(), // already due
      ...overrides,
    })
    .run();
  return id;
}

describe('backoffDelayMs', () => {
  test('grows with the square of attempts', () => {
    // base=1000, max=5000 (set in tests/setup.ts)
    expect(backoffDelayMs(1)).toBe(1000);
    expect(backoffDelayMs(2)).toBe(4000);
  });

  test('is capped at the configured maximum', () => {
    expect(backoffDelayMs(10)).toBe(5000);
  });
});

describe('processJob', () => {
  test('on success: marks the job sent and writes a success delivery_log row', async () => {
    const id = insertJob();
    const job = db.select().from(deliveryQueue).where(eq(deliveryQueue.id, id)).get()!;

    await processJob(job);

    const updated = db.select().from(deliveryQueue).where(eq(deliveryQueue.id, id)).get();
    expect(updated?.status).toBe('sent');

    const log = db.select().from(deliveryLogs).where(eq(deliveryLogs.recipient, 'user@example.com')).get();
    expect(log?.status).toBe('success');
    expect(sendMailMock).toHaveBeenCalledTimes(1);
  });

  test('on failure below maxAttempts: reschedules with backoff instead of failing permanently', async () => {
    sendMailMock.mockImplementationOnce(async () => {
      throw new Error('SMTP timeout');
    });
    const id = insertJob({ attempts: 0, maxAttempts: 5 });
    const job = db.select().from(deliveryQueue).where(eq(deliveryQueue.id, id)).get()!;
    const before = Date.now();

    await processJob(job);

    const updated = db.select().from(deliveryQueue).where(eq(deliveryQueue.id, id)).get()!;
    expect(updated.status).toBe('pending');
    expect(updated.attempts).toBe(1);
    expect(updated.lastError).toBe('SMTP timeout');
    expect(new Date(updated.runAt).getTime()).toBeGreaterThan(before); // pushed into the future

    const log = db.select().from(deliveryLogs).where(eq(deliveryLogs.recipient, 'user@example.com')).get();
    expect(log).toBeUndefined(); // no delivery_log row yet - not a final outcome
  });

  test('on the final allowed attempt: marks failed and writes a failed delivery_log row', async () => {
    sendMailMock.mockImplementationOnce(async () => {
      throw new Error('Mailbox does not exist');
    });
    const id = insertJob({ attempts: 2, maxAttempts: 3 }); // this attempt is the 3rd
    const job = db.select().from(deliveryQueue).where(eq(deliveryQueue.id, id)).get()!;

    await processJob(job);

    const updated = db.select().from(deliveryQueue).where(eq(deliveryQueue.id, id)).get()!;
    expect(updated.status).toBe('failed');
    expect(updated.attempts).toBe(3);

    const log = db.select().from(deliveryLogs).where(eq(deliveryLogs.recipient, 'user@example.com')).get();
    expect(log?.status).toBe('failed');
    expect(log?.errorMessage).toBe('Mailbox does not exist');
  });
});

describe('tick', () => {
  test('only processes jobs that are pending and due, up to the configured batch size', async () => {
    const due1 = insertJob({ recipient: 'due1@example.com' });
    const due2 = insertJob({ recipient: 'due2@example.com' });
    const due3 = insertJob({ recipient: 'due3@example.com' }); // batch size is 2 - this one waits
    const future = insertJob({
      recipient: 'future@example.com',
      runAt: new Date(Date.now() + 60_000).toISOString(),
    });
    const alreadySent = insertJob({ recipient: 'sent@example.com', status: 'sent' });

    await tick();

    expect(sendMailMock).toHaveBeenCalledTimes(2);
    const statuses = Object.fromEntries(
      [due1, due2, due3, future, alreadySent].map((id) => [
        id,
        db.select().from(deliveryQueue).where(eq(deliveryQueue.id, id)).get()?.status,
      ]),
    );
    // exactly two of the three due jobs were picked up this tick
    const dueProcessed = [statuses[due1], statuses[due2], statuses[due3]].filter((s) => s === 'sent').length;
    expect(dueProcessed).toBe(2);
    expect(statuses[future]).toBe('pending'); // untouched - not due yet
    expect(statuses[alreadySent]).toBe('sent'); // untouched - wasn't pending
  });

  test('does nothing when the queue is empty', async () => {
    await tick();
    expect(sendMailMock).toHaveBeenCalledTimes(0);
  });
});
