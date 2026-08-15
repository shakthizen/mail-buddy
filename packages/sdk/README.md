# mail-buddy-sdk

Typed Node.js / TypeScript client for [Mail Buddy](https://github.com/shakthizen/mail-buddy) — an open-source, self-hostable email template manager and delivery API.

Zero external runtime dependencies (uses native `fetch`, Node 18+). Ships dual ESM and CJS builds with full TypeScript types.

---

## 📦 Installation

```bash
npm install mail-buddy-sdk
# or
bun add mail-buddy-sdk
```

---

## 🚀 Quick Usage

```ts
import { MailBuddyClient } from 'mail-buddy-sdk';

const client = new MailBuddyClient({
  baseUrl: 'https://mail.example.com',
  apiKey: process.env.MAIL_BUDDY_API_KEY!, // API key or session token
});

// Send a single transactional email
await client.send({
  to: 'user@example.com',
  subject: 'Welcome to our platform',
  templateId: '123e4567-e89b-12d3-a456-426614174000',
  variables: { username: 'Jane', company_name: 'Acme Corp' },
});

// Batch personalized send - one call, many recipients with distinct variables
const { results } = await client.send({
  subject: 'Your weekly digest',
  templateId: '123e4567-e89b-12d3-a456-426614174000',
  recipients: [
    { to: 'a@example.com', variables: { username: 'Alice' } },
    { to: 'b@example.com', variables: { username: 'Bob' } },
  ],
});
// results[i].status is 'queued' | 'skipped' (suppressed) | 'rejected' (missing variables)
```

---

## 🛠️ API Modules

### Templates & Live Compilation

```ts
await client.templates.list({ limit: 20, offset: 0 });
await client.templates.get(id);
await client.templates.create({ name: 'Welcome', htmlContent: '<p>Hi {{username}}</p>' });
await client.templates.update(id, { htmlContent: '<p>Updated {{embed "header-id"}}</p>' });
await client.templates.delete(id);

// Live preview compilation with recursive embed resolution
const preview = await client.templates.preview({
  htmlContent: '{{embed "header-id"}}<p>Order #{{order_id}}</p>',
  variables: { order_id: 'ORD-12345' },
});
console.log(preview.renderedHtml);
console.log(preview.placeholders); // extracted from root + embedded sub-templates
```

### Assets

```ts
await client.assets.list();
await client.assets.upload(fileOrBlob); // returns the created Asset with public urlPath
await client.assets.delete(id);
```

### Authentication & Users

```ts
// Check instance setup status
const status = await client.auth.status(); // { initialized: boolean, user: User | null }

// Initial Admin setup
await client.auth.setup({ name: 'Admin', email: 'admin@domain.com', password: 'Password123!' });

// Login & Logout
const session = await client.auth.login({ email: 'admin@domain.com', password: 'Password123!' });
await client.auth.logout();

// Team User Management (Admin only)
await client.users.list();
await client.users.create({ name: 'Jordan', email: 'jordan@domain.com', password: 'GeneratedPassword', role: 'member' });
await client.users.delete(userId);
```

### Settings, Verification & API Keys

```ts
await client.settings.get();
await client.settings.update({
  smtp: { host: 'smtp.example.com', port: 587, user: 'smtp_user', password: '...' },
  storage: { provider: 's3', s3BucketName: 'my-bucket', s3Region: 'us-east-1' },
});

// Live Connection Testers
await client.settings.testEmail({ to: 'verify@example.com' });
await client.settings.testStorage();

// API Key Management
await client.apiKeys.list();
const created = await client.apiKeys.create({ name: 'Backend Microservice', scope: 'send_only' });
console.log(created.key); // plaintext key - shown only once
await client.apiKeys.revoke(created.id);
```

### Suppressions

```ts
await client.suppressions.check('user@example.com', { templateId: 't1' });
await client.suppressions.add({ email: 'user@example.com', reason: 'bounced' });
await client.suppressions.remove('user@example.com', { templateId: 't1' });
```

---

## 🚨 Error Handling

Non-2xx responses throw `MailBuddyApiError` with `.status` (HTTP status) and `.code`:

```ts
import { MailBuddyApiError } from 'mail-buddy-sdk';

try {
  await client.templates.get('missing-id');
} catch (err) {
  if (err instanceof MailBuddyApiError && err.status === 404) {
    console.error('Template not found');
  }
}
```

---

## 🧪 Development

```bash
bun run build      # tsup -> dist/ (ESM + CJS + .d.ts)
bun run typecheck  # tsc --noEmit
bun test           # unit tests
```

---

## 📄 License

MIT © 2026 ShakthiZen
