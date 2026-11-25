import { readFile, writeFile } from 'node:fs/promises';

// JSON Schema maxLength counts Unicode code points. Zod's string.max counts
// UTF-16 units; align this generated Support text contract with the API.
const path = new URL('../src/api/generated/zod/support/support.ts', import.meta.url);
let source;
try { source = await readFile(path, 'utf8'); }
catch (error) { if (error.code === 'ENOENT') process.exit(0); throw error; }
const names = [...source.matchAll(/export const (\w+) = 4000;/g)].map(match => match[1]);
let count = 0;
for (const name of names) {
  const pattern = new RegExp(`\\.max\\(${name}\\)`, 'g');
  source = source.replace(pattern, () => {
    count++;
    return `.refine((value) => Array.from(value).length <= ${name}, 'Tin nhắn tối đa 4.000 ký tự.')`;
  });
}
if (!count) throw new Error('Support Unicode normalization: expected generated maxLength 4000.');
await writeFile(path, source);
console.log(`Normalized ${count} generated Support Unicode text limits.`);
