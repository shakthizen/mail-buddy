# Mail Buddy

[![Tests](https://github.com/shakthizen/mail-buddy/actions/workflows/ci.yml/badge.svg)](https://github.com/shakthizen/mail-buddy/actions/workflows/ci.yml)
[![Build and Release](https://github.com/shakthizen/mail-buddy/actions/workflows/build-and-release.yml/badge.svg)](https://github.com/shakthizen/mail-buddy/actions/workflows/build-and-release.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](./LICENSE)

**Mail Buddy** is an open-source, self-hosted email template manager and delivery API. It compiles into a single, self-contained executable binary that embeds the Elysia (Bun) API server and the React administrative dashboard—zero external database processes, zero Docker requirements, and zero mandatory `.env` configuration files.

---

## 🌟 Key Features

- **📦 Single Self-Contained Executable**: Runs everywhere (Linux, macOS, Windows) with embedded web dashboard, SQLite database migrations, and background delivery queue worker.
- **⚡ Zero-Config Startup**: Starts instantly with sensible defaults without requiring `.env` files. All operational settings are managed dynamically from the Web UI and persisted in SQLite.
- **👥 User Authentication & Team Management**:
  - Initial first-run setup wizard for the primary administrator account.
  - Public registration disabled by default for maximum security.
  - Administrators can directly create team members (`admin` or `member` roles) with an integrated secure random password generator.
- **🔑 Scoped API Keys**: Create `admin` and `send_only` API keys with optional domain Origin or IP/CIDR restrictions for microservices, webhooks, and backend applications.
- **🎨 Handlebars Templates & Nested Embeds**:
  - Real-time placeholder auto-extraction (`{{var}}` and `{{{unescaped_var}}}`).
  - Recursive partial template embedding (`{{embed "template_id"}}`) with automatic circular dependency detection.
  - Integrated Asset & Embed pickers inside the template editor toolbar.
- **🖼️ Asset Library & Storage Drivers**:
  - Drag-and-drop upload zone supporting PNG, JPEG, GIF, and WEBP.
  - Grid & List view modes, search filters, and one-click copy for public URLs and `<img ... />` HTML snippets.
  - **Local Filesystem** & **Amazon S3 / S3-Compatible** backends (AWS S3, LocalStack, MinIO, Cloudflare R2) with path-style addressing and live bucket verification.
- **📬 Reliable Delivery Queue & Workers**:
  - SQLite-backed retry queue with exponential backoff and jitter.
  - Live SMTP verification and **"Send Test Email"** tool in the dashboard.
- **🛡️ Suppressions & One-Click Unsubscribe**:
  - HMAC SHA-256 signed tamper-proof unsubscribe links.
  - Global and per-template suppression management.
- **✨ Modern HeroUI & Ambient Mesh Aesthetic**:
  - Toned-down slate/zinc dark mode surfaces with glassmorphism.
  - Subtle ambient mesh background gradients.
  - Clean grouped sidebar with status badges, user profile dock, and one-click logout.
- **💻 Typed TypeScript SDK**: Complete published client library (`mail-buddy-sdk`) for Node.js, Bun, Deno, and browser environments.

---

## 🚀 Quickstart

### Option 1: Run Prebuilt Single Binary

Download the executable for your platform from the [Releases](https://github.com/shakthizen/mail-buddy/releases) page:

```bash
# Make executable (macOS / Linux)
chmod +x mail-buddy

# Run on default port 3000 (or PORT=3001 ./mail-buddy)
./mail-buddy
```

Open **[http://localhost:3000](http://localhost:3000)** in your browser:
1. Complete the **Initial Admin Setup** form on your first visit (`Name`, `Email`, `Password`).
2. Log in and configure your SMTP and Storage settings under **Configuration → SMTP & Storage**.
3. Use the **"Send Test Email"** tool to verify your outbound mail connection!

---

### Option 2: Run from Source

Requires [Bun](https://bun.sh/) 1.x.

```bash
# 1. Clone repository and install dependencies
git clone https://github.com/shakthizen/mail-buddy.git
cd mail-buddy
bun install

# 2. Build the web dashboard SPA
bun run web:build

# 3. Start the API server
bun run api:start
```

---

## 🛠️ Compiling into Single Binary

To compile the entire application (API server + embedded React SPA + SQLite migrations) into a single standalone binary:

```bash
# Build web assets and compile standalone executable
bun run web:build
bun run api:compile
```

The resulting `./mail-buddy` binary is ~60MB and requires no external node_modules or asset folders at runtime.

---

## ⚙️ Configuration & Environment

Mail Buddy persists all operational settings directly into SQLite via the dashboard UI (**Settings → SMTP & Storage**). However, you may optionally provide environment variables to override startup defaults:

| Variable | Default | Purpose |
| :--- | :--- | :--- |
| `PORT` | `3000` | HTTP port |
| `DATABASE_PATH` | `./mail-buddy.sqlite` | SQLite database file location |
| `UPLOADS_DIR` | `./uploads` | Local asset storage directory (when local storage is active) |
| `STORAGE_PROVIDER` | `local` | Default storage mode (`local` or `s3`) |
| `S3_BUCKET_NAME` | `""` | S3 bucket name (when `STORAGE_PROVIDER=s3`) |
| `S3_REGION` | `us-east-1` | AWS S3 region |
| `S3_ENDPOINT` | `""` | Custom S3 endpoint (e.g. `http://localhost:4566` for LocalStack / MinIO / Cloudflare R2) |
| `S3_ACCESS_KEY_ID` | `""` | S3 access key ID |
| `S3_SECRET_ACCESS_KEY` | `""` | S3 secret access key |
| `S3_FORCE_PATH_STYLE` | `false` | Enable path-style S3 URLs (required for LocalStack/MinIO) |
| `S3_PUBLIC_URL` | `""` | Optional CDN or public asset base URL |
| `PUBLIC_URL` | `""` | Public server domain for unsubscribe tokens and links |
| `SMTP_FROM` | `""` | Default sender email address |
| `MAX_UPLOAD_SIZE_BYTES` | `5242880` (5MB) | Maximum upload file size in bytes |
| `DELIVERY_WORKER_INTERVAL_MS`| `5000` (5s) | Delivery queue worker polling interval |
| `DELIVERY_WORKER_BATCH_SIZE` | `10` | Delivery queue batch size per tick |
| `LOG_LEVEL` | `info` | Logging verbosity (`fatal`, `error`, `warn`, `info`, `debug`, `silent`) |

---

## 📦 TypeScript SDK Usage

Install the official client SDK:

```bash
npm install mail-buddy-sdk
# or
bun add mail-buddy-sdk
```

### Initializing & Sending Emails

```ts
import { MailBuddyClient } from 'mail-buddy-sdk';

const client = new MailBuddyClient({
  baseUrl: 'http://localhost:3000',
  apiKey: 'mb_...', // Your admin or send_only API key (or session token)
});

// Single Recipient Send
const response = await client.send({
  to: 'alice@example.com',
  subject: 'Welcome to our platform!',
  templateId: '15d5a3f8-8245-4034-aa82-1dd9513760d5',
  variables: {
    username: 'Alice',
    company_name: 'Acme Corp',
  },
});

console.log(response.results); // [{ to: "alice@example.com", status: "queued" }]
```

### Batch Personalized Send

```ts
const batchResponse = await client.send({
  templateId: '15d5a3f8-8245-4034-aa82-1dd9513760d5',
  subject: 'Monthly Newsletter',
  recipients: [
    { to: 'alice@example.com', variables: { username: 'Alice', company_name: 'Acme' } },
    { to: 'bob@example.com', variables: { username: 'Bob', company_name: 'Beta' } },
  ],
});
```

---

## 🧪 Testing & Verification

Mail Buddy includes a comprehensive unit and integration test suite covering 100% of core business logic:

```bash
# Run full monorepo test suite (113+ tests across 15 test files)
bun test

# Run S3 integration tests against live LocalStack
bun test apps/api/tests/integration/storageS3.test.ts

# Run SDK tests
bun test packages/sdk
```

---

## 🏗️ Monorepo Structure

```
.
├── apps/
│   ├── api/          # Elysia (Bun) API server, SQLite database, SMTP & S3 drivers, delivery worker
│   └── web/          # React + Vite + Tailwind CSS admin dashboard with HeroUI styling
├── packages/
│   └── sdk/          # Typed TypeScript SDK (mail-buddy-sdk)
├── drizzle/          # Database migrations
└── bunfig.toml       # Monorepo test preload configuration
```

---

## 🤝 Contributing

Contributions are welcome! Please feel free to open a Pull Request or file an issue.
See [`CONTRIBUTING.md`](./CONTRIBUTING.md) and [`CODE_OF_CONDUCT.md`](./CODE_OF_CONDUCT.md) for details.

---

## 📄 License

[MIT](./LICENSE) © 2026 ShakthiZen
