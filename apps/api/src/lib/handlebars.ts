import Handlebars from 'handlebars';
import { eq } from 'drizzle-orm';
import { db } from '../db/client';
import { templates } from '../db/schema';

const EMBED_REGEX = /\{\{embed\s+"([^"]+)"\s*\}\}/g;
const RESERVED_NAMES = new Set(['this', 'embed']);

/** Walks the Handlebars AST to extract simple vars, {{#if x}}, and {{#each x}} variable names. */
export function extractPlaceholders(html: string): string[] {
  try {
    const ast = Handlebars.parse(html);
    const names = new Set<string>();

    function walk(node: any): void {
      if (!node) return;
      switch (node.type) {
        case 'Program':
          node.body.forEach(walk);
          break;
        case 'MustacheStatement':
          if (node.path?.type === 'PathExpression' && node.path.parts.length > 0) {
            names.add(node.path.parts[0]);
          }
          (node.params ?? []).forEach(walk);
          break;
        case 'BlockStatement':
          if (node.params?.[0]?.type === 'PathExpression' && node.params[0].parts.length > 0) {
            names.add(node.params[0].parts[0]);
          }
          walk(node.program);
          if (node.inverse) walk(node.inverse);
          break;
        default:
          break;
      }
    }

    walk(ast);
    return [...names].filter((name) => !RESERVED_NAMES.has(name));
  } catch {
    // If HTML/Handlebars has unclosed tags during mid-typing, fallback to regex
    const matches = [...html.matchAll(/\{\{\{?([a-zA-Z0-9_]+)\}?\}\}/g)];
    const set = new Set<string>();
    for (const match of matches) {
      if (match[1] && !RESERVED_NAMES.has(match[1])) {
        set.add(match[1]);
      }
    }
    return [...set];
  }
}

export class TemplateEmbedError extends Error {}

export interface EmbedInfo {
  id: string;
  name: string;
}

/** Recursively inlines {{embed "uuid"}} references, tracking resolved metadata. */
export async function resolveEmbedsWithMetadata(
  html: string,
  visited: Set<string> = new Set(),
): Promise<{ resolvedHtml: string; embeds: EmbedInfo[] }> {
  const matches = [...html.matchAll(EMBED_REGEX)];
  if (matches.length === 0) return { resolvedHtml: html, embeds: [] };

  let result = html;
  const collectedEmbeds: EmbedInfo[] = [];

  for (const [full, uuid] of matches) {
    if (visited.has(uuid)) {
      throw new TemplateEmbedError(`Cycle detected: template ${uuid} embeds itself (directly or indirectly)`);
    }
    const embedded = db.select().from(templates).where(eq(templates.id, uuid)).get();
    if (!embedded) {
      throw new TemplateEmbedError(`Embedded template ${uuid} not found`);
    }

    collectedEmbeds.push({ id: embedded.id, name: embedded.name });

    const inner = await resolveEmbedsWithMetadata(embedded.htmlContent, new Set([...visited, uuid]));
    collectedEmbeds.push(...inner.embeds);
    result = result.split(full).join(inner.resolvedHtml);
  }

  // Deduplicate embeds by ID
  const uniqueEmbeds = Array.from(new Map(collectedEmbeds.map((e) => [e.id, e])).values());

  return { resolvedHtml: result, embeds: uniqueEmbeds };
}

/** Recursively inlines {{embed "uuid"}} references, throwing on missing templates or cycles. */
export async function resolveEmbeds(html: string, visited: Set<string> = new Set()): Promise<string> {
  const { resolvedHtml } = await resolveEmbedsWithMetadata(html, visited);
  return resolvedHtml;
}

/** Extracts placeholders across the entire embed hierarchy (parent + all embedded partials).
 * If an embed is unresolvable during drafting, it extracts as much as possible without crashing. */
export async function extractResolvedPlaceholders(html: string): Promise<string[]> {
  try {
    const resolved = await resolveEmbeds(html);
    return extractPlaceholders(resolved);
  } catch {
    // If embed fails (e.g. invalid UUID during active typing), extract directly from current HTML
    return extractPlaceholders(html);
  }
}

/** Generates realistic default sample variable values for live preview testing */
export function generateDefaultSampleVariables(placeholders: string[]): Record<string, string> {
  const result: Record<string, string> = {};
  for (const p of placeholders) {
    const lower = p.toLowerCase();
    if (lower.includes('email') || lower === 'to') {
      result[p] = 'alex.smith@example.com';
    } else if (lower.includes('name') || lower === 'username' || lower === 'recipient') {
      result[p] = 'Alex Smith';
    } else if (lower.includes('company') || lower.includes('organization') || lower === 'brand') {
      result[p] = 'Acme Global';
    } else if (lower.includes('order') || lower.includes('invoice') || lower.includes('ticket')) {
      result[p] = 'ORD-98432';
    } else if (lower.includes('amount') || lower.includes('price') || lower.includes('total') || lower.includes('cost')) {
      result[p] = '$149.00';
    } else if (lower.includes('date') || lower.includes('time')) {
      result[p] = new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    } else if (lower.includes('code') || lower.includes('otp') || lower.includes('pin')) {
      result[p] = '849201';
    } else if (lower.includes('url') || lower.includes('link')) {
      result[p] = 'https://example.com/action';
    } else {
      result[p] = `Sample ${p.replace(/_/g, ' ')}`;
    }
  }
  return result;
}

/** Resolves embeds and merges placeholders once, returning a reusable compiled renderer. */
export async function prepareTemplate(html: string) {
  const { resolvedHtml } = await resolveEmbedsWithMetadata(html);
  const placeholders = extractPlaceholders(resolvedHtml);
  const compiled = Handlebars.compile(resolvedHtml, { noEscape: false });
  return {
    placeholders,
    render: (variables: Record<string, unknown>) => compiled(variables),
  };
}
