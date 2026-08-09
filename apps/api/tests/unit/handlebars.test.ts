import { describe, expect, test } from 'bun:test';
import { db } from '../../src/db/client';
import { templates } from '../../src/db/schema';
import { extractPlaceholders, resolveEmbeds, prepareTemplate, TemplateEmbedError } from '../../src/lib/handlebars';

function insertTemplate(id: string, htmlContent: string) {
  db.insert(templates)
    .values({ id, name: id, htmlContent, placeholders: '[]' })
    .run();
}

describe('extractPlaceholders', () => {
  test('extracts simple {{var}} placeholders', () => {
    expect(extractPlaceholders('<p>Hi {{username}}, your code is {{code}}</p>')).toEqual([
      'username',
      'code',
    ]);
  });

  test('extracts the variable from {{#if x}}', () => {
    expect(extractPlaceholders('{{#if showDiscount}}Save 10%!{{/if}}')).toEqual(['showDiscount']);
  });

  test('extracts the variable from {{#each x}}', () => {
    expect(extractPlaceholders('{{#each items}}<li>{{this}}</li>{{/each}}')).toEqual(['items']);
  });

  test('deduplicates repeated placeholders', () => {
    expect(extractPlaceholders('{{username}} and again {{username}}')).toEqual(['username']);
  });

  test('excludes the embed helper name itself', () => {
    expect(extractPlaceholders('{{embed "some-uuid"}}')).toEqual([]);
  });

  test('handles a template with no placeholders', () => {
    expect(extractPlaceholders('<p>Static content only</p>')).toEqual([]);
  });
});

describe('resolveEmbeds', () => {
  test('inlines a single embedded template', async () => {
    insertTemplate('child-1', '<footer>Bye {{username}}</footer>');
    const resolved = await resolveEmbeds('<p>Hi</p>{{embed "child-1"}}');
    expect(resolved).toBe('<p>Hi</p><footer>Bye {{username}}</footer>');
  });

  test('inlines nested embeds recursively', async () => {
    insertTemplate('grandchild-1', '<span>gc</span>');
    insertTemplate('child-2', 'child-before {{embed "grandchild-1"}} child-after');
    const resolved = await resolveEmbeds('parent {{embed "child-2"}}');
    expect(resolved).toBe('parent child-before <span>gc</span> child-after');
  });

  test('throws a TemplateEmbedError for a missing embedded template', async () => {
    await expect(resolveEmbeds('{{embed "does-not-exist"}}')).rejects.toBeInstanceOf(TemplateEmbedError);
  });

  test('throws a TemplateEmbedError on a direct self-embed cycle', async () => {
    insertTemplate('self-cycle', 'loop {{embed "self-cycle"}}');
    await expect(resolveEmbeds('{{embed "self-cycle"}}')).rejects.toBeInstanceOf(TemplateEmbedError);
  });

  test('throws a TemplateEmbedError on an indirect A->B->A cycle', async () => {
    insertTemplate('cycle-a', 'a {{embed "cycle-b"}}');
    insertTemplate('cycle-b', 'b {{embed "cycle-a"}}');
    await expect(resolveEmbeds('{{embed "cycle-a"}}')).rejects.toBeInstanceOf(TemplateEmbedError);
  });

  test('does not false-positive a diamond (non-cyclic) embed shared by two siblings', async () => {
    insertTemplate('shared-leaf', 'leaf');
    insertTemplate('branch-a', 'A:{{embed "shared-leaf"}}');
    insertTemplate('branch-b', 'B:{{embed "shared-leaf"}}');
    const resolved = await resolveEmbeds('{{embed "branch-a"}} {{embed "branch-b"}}');
    expect(resolved).toBe('A:leaf B:leaf');
  });
});

describe('prepareTemplate', () => {
  test('merges placeholders across the embed tree and renders with escaping by default', async () => {
    insertTemplate('embed-with-var', '<em>{{extra}}</em>');
    const { placeholders, render } = await prepareTemplate('Hi {{username}} {{embed "embed-with-var"}}');
    expect(placeholders.sort()).toEqual(['extra', 'username']);
    expect(render({ username: '<b>Bob</b>', extra: 'ok' })).toBe('Hi &lt;b&gt;Bob&lt;/b&gt; <em>ok</em>');
  });

  test('renders raw/unescaped output for {{{var}}}', async () => {
    const { render } = await prepareTemplate('<a href="{{{link}}}">go</a>');
    expect(render({ link: 'https://example.com?a=1&b=2' })).toBe(
      '<a href="https://example.com?a=1&b=2">go</a>',
    );
  });
});
