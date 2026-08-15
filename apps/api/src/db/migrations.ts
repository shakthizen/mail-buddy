import migration0000 from '../../drizzle/0000_worried_the_fallen.sql' with { type: 'text' };
import migration0001 from '../../drizzle/0001_even_jocasta.sql' with { type: 'text' };

/**
 * Migrations are embedded as text imports so `bun build --compile` bundles
 * them directly into the executable — no external `drizzle/` folder needed
 * at runtime. Add new entries here (in order) each time `drizzle-kit generate`
 * produces a new migration file.
 */
export const migrations: { tag: string; sql: string }[] = [
  { tag: '0000_worried_the_fallen', sql: migration0000 },
  { tag: '0001_even_jocasta', sql: migration0001 },
];
