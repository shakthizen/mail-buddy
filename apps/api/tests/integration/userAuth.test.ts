import { describe, expect, test, beforeEach } from 'bun:test';
import { buildTestApp, jsonRequest, resetDb } from '../helpers';

beforeEach(resetDb);

describe('User Authentication & Setup', () => {
  test('GET /api/auth/status returns initialized: false when no users exist', async () => {
    const app = buildTestApp();
    const { status, body } = await jsonRequest(app, 'GET', '/api/auth/status');
    expect(status).toBe(200);
    expect(body.initialized).toBe(false);
    expect(body.user).toBeNull();
  });

  test('POST /api/auth/setup creates the initial admin user and returns token', async () => {
    const app = buildTestApp();
    const { status, body } = await jsonRequest(app, 'POST', '/api/auth/setup', {
      body: {
        name: 'Admin User',
        email: 'admin@example.com',
        password: 'Password123!',
      },
    });
    expect(status).toBe(200);
    expect(body.user.name).toBe('Admin User');
    expect(body.user.email).toBe('admin@example.com');
    expect(body.user.role).toBe('admin');
    expect(body.token).toStartWith('mbs_');

    // Status now reports initialized: true
    const statusRes = await jsonRequest(app, 'GET', '/api/auth/status');
    expect(statusRes.body.initialized).toBe(true);

    // Second setup call fails
    const secondSetup = await jsonRequest(app, 'POST', '/api/auth/setup', {
      body: { name: 'Other', email: 'other@example.com', password: 'Password123!' },
    });
    expect(secondSetup.status).toBe(400);
    expect(secondSetup.body.error).toBe('already_initialized');
  });

  test('POST /api/auth/login verifies credentials and returns token', async () => {
    const app = buildTestApp();
    await jsonRequest(app, 'POST', '/api/auth/setup', {
      body: { name: 'Admin User', email: 'admin@example.com', password: 'Password123!' },
    });

    // Wrong password fails
    const failedLogin = await jsonRequest(app, 'POST', '/api/auth/login', {
      body: { email: 'admin@example.com', password: 'WrongPassword' },
    });
    expect(failedLogin.status).toBe(401);

    // Correct password succeeds
    const successfulLogin = await jsonRequest(app, 'POST', '/api/auth/login', {
      body: { email: 'admin@example.com', password: 'Password123!' },
    });
    expect(successfulLogin.status).toBe(200);
    expect(successfulLogin.body.token).toStartWith('mbs_');

    // Token works for authenticated routes
    const token = successfulLogin.body.token;
    const meRes = await jsonRequest(app, 'GET', '/api/auth/me', {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(meRes.status).toBe(200);
    expect(meRes.body.user.email).toBe('admin@example.com');

    // Token works for admin templates route
    const templatesRes = await jsonRequest(app, 'GET', '/api/templates', {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(templatesRes.status).toBe(200);
  });

  test('POST /api/auth/logout invalidates the session', async () => {
    const app = buildTestApp();
    const setupRes = await jsonRequest(app, 'POST', '/api/auth/setup', {
      body: { name: 'Admin', email: 'admin@example.com', password: 'Password123!' },
    });
    const token = setupRes.body.token;

    const logoutRes = await jsonRequest(app, 'POST', '/api/auth/logout', {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(logoutRes.status).toBe(200);

    // After logout, token no longer works
    const meRes = await jsonRequest(app, 'GET', '/api/auth/me', {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(meRes.status).toBe(401);
  });
});

describe('Team User Management', () => {
  test('Admin can list, create additional users, and delete them', async () => {
    const app = buildTestApp();
    const setupRes = await jsonRequest(app, 'POST', '/api/auth/setup', {
      body: { name: 'Primary Admin', email: 'primary@example.com', password: 'Password123!' },
    });
    const adminToken = setupRes.body.token;
    const adminId = setupRes.body.user.id;

    // Create a new team member
    const createUserRes = await jsonRequest(app, 'POST', '/api/users', {
      headers: { Authorization: `Bearer ${adminToken}` },
      body: {
        name: 'Jane Colleague',
        email: 'jane@example.com',
        password: 'GeneratedPass123!',
        role: 'member',
      },
    });
    expect(createUserRes.status).toBe(200);
    expect(createUserRes.body.user.name).toBe('Jane Colleague');
    expect(createUserRes.body.user.role).toBe('member');

    // List users
    const listRes = await jsonRequest(app, 'GET', '/api/users', {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    expect(listRes.status).toBe(200);
    expect(listRes.body.users).toHaveLength(2);

    // Cannot delete self
    const deleteSelfRes = await jsonRequest(app, 'DELETE', `/api/users/${adminId}`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    expect(deleteSelfRes.status).toBe(400);

    // Delete created user
    const deleteJaneRes = await jsonRequest(app, 'DELETE', `/api/users/${createUserRes.body.user.id}`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    expect(deleteJaneRes.status).toBe(204);

    // List reflects 1 remaining user
    const listAfterDelete = await jsonRequest(app, 'GET', '/api/users', {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    expect(listAfterDelete.body.users).toHaveLength(1);
  });
});
