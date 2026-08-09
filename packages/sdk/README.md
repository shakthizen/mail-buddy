# mail-buddy-sdk

Typed Node.js client for [Mail Buddy](https://github.com/shakthizen/mail-buddy) - a self-hostable email template manager and delivery API.

Zero runtime dependencies (uses native `fetch`, Node 18+). Ships both ESM and CJS builds with full TypeScript types.

## Install

```bash
npm install mail-buddy-sdk
```

## Usage

```ts
import { MailBuddyClient } from 'mail-buddy-sdk';

const client = new MailBuddyClient({
  baseUrl: 'https://mail.example.com',
  apiKey: process.env.MAIL_BUDDY_API_KEY!,
});

// Send a single transactional email
await client.send({
  to: 'user@example.com',
  subject: 'Reset your password',
  templateUuid: '123e4567-e89b-12d3-a456-426614174000',
  variables: { username: 'Jane', reset_link: 'https://example.com/reset?token=abc' },
});

// Batch/personalized send - one call, many recipients, each with their own variables
const { results } = await client.send({
  subject: 'Your weekly digest',
  templateUuid: '123e4567-e89b-12d3-a456-426614174000',
  recipients: [
    { to: 'a@example.com', variables: { username: 'Alice' } },
    { to: 'b@example.com', variables: { username: 'Bob' } },
  ],
});
// results[i].status is 'queued' | 'skipped' (suppressed) | 'rejected' (missing variables)
```

### Templates

```ts
await client.templates.list({ limit: 20, offset: 0 });
await client.templates.get(id);
await client.templates.create({ name: 'Welcome', htmlContent: '<p>Hi {{username}}</p>' });
await client.templates.update(id, { htmlContent: '<p>Updated</p>' });
await client.templates.delete(id);
```

### Assets

```ts
await client.assets.list();
await client.assets.upload(fileOrBlob); // returns the created Asset, including its public urlPath
await client.assets.delete(id);
```

### Settings & API keys (`admin` scope only)

```ts
await client.settings.get();
await client.settings.update({ smtp: { host: 'smtp.example.com', port: 587 } });

await client.apiKeys.list();
const created = await client.apiKeys.create({ name: 'CI integration', scope: 'send_only' });
console.log(created.key); // plaintext - shown only once
await client.apiKeys.revoke(created.id);
```

### Suppressions

```ts
await client.suppressions.check('user@example.com', { templateId: 't1' });
await client.suppressions.add({ email: 'user@example.com', reason: 'bounced' }); // omit templateId for a global suppression
await client.suppressions.remove('user@example.com', { templateId: 't1' });
```

Note: the one-click unsubscribe link embedded in outgoing emails is generated and signed server-side at send time - the SDK never constructs it.

### Errors

Non-2xx responses throw `MailBuddyApiError` with `.status` (HTTP status) and `.code` (the server's `error` field):

```ts
import { MailBuddyApiError } from 'mail-buddy-sdk';

try {
  await client.templates.get('missing-id');
} catch (err) {
  if (err instanceof MailBuddyApiError && err.status === 404) {
    // handle not-found
  }
}
```

## Development

```bash
bun run build      # tsup -> dist/ (ESM + CJS + .d.ts)
bun run typecheck  # tsc --noEmit
bun test            # unit tests, no live network calls
```
