import { readFileSync } from 'fs';
import { join } from 'path';
let yaml: any;
try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  yaml = require('yaml');
} catch {
  yaml = { parse: (str: string) => JSON.parse(JSON.stringify(str)) };
}

const cache: Record<string, any> = {};

export function loadPrompt<T = any>(name: string): T {
  if (cache[name]) return cache[name];
  const filePath = join(__dirname, '..', '..', '..', 'prompts', `${name}.yaml`);
  const raw = readFileSync(filePath, 'utf-8');
  const parsed = yaml.parse(raw);
  cache[name] = parsed;
  return parsed;
}
