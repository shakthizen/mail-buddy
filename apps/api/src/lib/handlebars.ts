import Handlebars from 'handlebars';
import { eq } from 'drizzle-orm';
import { db } from '../db/client';
import { templates } from '../db/schema';

const EMBED_REGEX = /\{\{embed\s+"([^"]+)"\s*\}\}/g;
const RESERVED_NAMES = new Set(['this', 'embed']);

/** Walks the Handlebars AST to extract simple vars, {{#if x}}, and {{#each x}} variable names. */
export function extractPlaceholders(html: string): string[] {
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
}

export class TemplateEmbedError extends Error {}

/** Recursively inlines {{embed "uuid"}} references, throwing on missing templates or cycles. */
export async function resolveEmbeds(html: string, visited: Set<string> = new Set()): Promise<string> {
  const matches = [...html.matchAll(EMBED_REGEX)];
  if (matches.length === 0) return html;

  let result = html;
  for (const [full, uuid] of matches) {
    if (visited.has(uuid)) {
      throw new TemplateEmbedError(`Cycle detected: template ${uuid} embeds itself (directly or indirectly)`);
    }
    const embedded = db.select().from(templates).where(eq(templates.id, uuid)).get();
    if (!embedded) {
      throw new TemplateEmbedError(`Embedded template ${uuid} not found`);
    }
    const inner = await resolveEmbeds(embedded.htmlContent, new Set([...visited, uuid]));
    result = result.split(full).join(inner);
  }
  return result;
}

/** Resolves embeds and merges placeholders once, returning a reusable compiled renderer -
 * lets a batch send compile the template tree a single time and render per-recipient.
 * {{var}} is escaped by default (Handlebars' native behavior); {{{var}}} is raw/unescaped
 * and is an explicit opt-in by the template author. */
export async function prepareTemplate(html: string) {
  const resolved = await resolveEmbeds(html);
  const placeholders = extractPlaceholders(resolved);
  const compiled = Handlebars.compile(resolved, { noEscape: false });
  return {
    placeholders,
    render: (variables: Record<string, unknown>) => compiled(variables),
  };
}
