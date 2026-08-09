/** Bun's `server.requestIP()` reports IPv4 connections as IPv4-mapped IPv6
 * addresses (e.g. "::ffff:127.0.0.1"), not plain "127.0.0.1" - strip that
 * prefix so IPv4 allowlist entries and CIDR ranges still match. */
function normalizeIp(ip: string): string {
  const match = /^::ffff:(\d+\.\d+\.\d+\.\d+)$/i.exec(ip);
  return match ? match[1] : ip;
}

function ipv4ToInt(ip: string): number | null {
  const parts = ip.split('.').map(Number);
  if (parts.length !== 4 || parts.some((p) => Number.isNaN(p) || p < 0 || p > 255)) return null;
  return parts.reduce((acc, part) => (acc << 8) + part, 0) >>> 0;
}

function matchesEntry(rawIp: string, rawEntry: string): boolean {
  const ip = normalizeIp(rawIp);
  const entry = normalizeIp(rawEntry);
  if (!entry.includes('/')) return ip === entry;

  const [range, prefixStr] = entry.split('/');
  const prefix = Number(prefixStr);
  const ipInt = ipv4ToInt(ip);
  const rangeInt = ipv4ToInt(range);
  if (ipInt === null || rangeInt === null || Number.isNaN(prefix) || prefix < 0 || prefix > 32) {
    return false;
  }

  const mask = prefix === 0 ? 0 : (0xffffffff << (32 - prefix)) >>> 0;
  return (ipInt & mask) === (rangeInt & mask);
}

/** Matches a source IP against an allowlist of exact IPs or IPv4 CIDR ranges. */
export function ipMatchesAllowlist(ip: string, allowlist: string[]): boolean {
  return allowlist.some((entry) => matchesEntry(ip, entry));
}
