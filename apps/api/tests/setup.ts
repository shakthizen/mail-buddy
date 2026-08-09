/**
 * Runs before any test file (see bunfig.toml [test] preload). Must set env
 * vars here, before app code is imported anywhere, since db/client.ts opens
 * the database as a module-level side effect on first import.
 */
process.env.DATABASE_PATH = ':memory:';
process.env.UPLOADS_DIR = '.test-uploads';
process.env.LOG_LEVEL = 'silent';
process.env.PUBLIC_URL = 'http://localhost:3000';
// Small on purpose so the "file too large" path is testable without generating huge buffers.
process.env.MAX_UPLOAD_SIZE_BYTES = '1024';
// Small on purpose so the delivery worker's batch-size limit is testable without inserting many rows.
process.env.DELIVERY_WORKER_BATCH_SIZE = '2';
process.env.DELIVERY_WORKER_BASE_DELAY_MS = '1000';
process.env.DELIVERY_WORKER_MAX_DELAY_MS = '5000';
