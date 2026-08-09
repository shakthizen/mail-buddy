import { describe, expect, test } from 'bun:test';
import { ipMatchesAllowlist } from '../../src/lib/ipMatch';

describe('ipMatchesAllowlist', () => {
  test('matches an exact IP', () => {
    expect(ipMatchesAllowlist('203.0.113.5', ['203.0.113.5'])).toBe(true);
    expect(ipMatchesAllowlist('203.0.113.6', ['203.0.113.5'])).toBe(false);
  });

  test('matches within a CIDR range', () => {
    expect(ipMatchesAllowlist('10.0.0.42', ['10.0.0.0/24'])).toBe(true);
    expect(ipMatchesAllowlist('10.0.1.42', ['10.0.0.0/24'])).toBe(false);
  });

  test('matches a /0 CIDR against anything valid', () => {
    expect(ipMatchesAllowlist('8.8.8.8', ['0.0.0.0/0'])).toBe(true);
  });

  test('matches against any entry in a multi-entry allowlist', () => {
    const allowlist = ['203.0.113.5', '10.0.0.0/8'];
    expect(ipMatchesAllowlist('10.5.5.5', allowlist)).toBe(true);
    expect(ipMatchesAllowlist('203.0.113.5', allowlist)).toBe(true);
    expect(ipMatchesAllowlist('192.168.1.1', allowlist)).toBe(false);
  });

  test('rejects malformed IPs and CIDR entries', () => {
    expect(ipMatchesAllowlist('not-an-ip', ['10.0.0.0/8'])).toBe(false);
    expect(ipMatchesAllowlist('10.0.0.1', ['not-a-cidr/8'])).toBe(false);
  });

  test('empty allowlist matches nothing', () => {
    expect(ipMatchesAllowlist('10.0.0.1', [])).toBe(false);
  });

  test('normalizes IPv4-mapped IPv6 addresses (as reported by Bun for IPv4 connections)', () => {
    expect(ipMatchesAllowlist('::ffff:127.0.0.1', ['127.0.0.0/8'])).toBe(true);
    expect(ipMatchesAllowlist('::ffff:127.0.0.1', ['127.0.0.1'])).toBe(true);
    expect(ipMatchesAllowlist('::ffff:10.0.0.1', ['127.0.0.0/8'])).toBe(false);
  });
});
