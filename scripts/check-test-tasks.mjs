import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const MANUAL_ONLY = new Set(['test:ollama']);

const workspaces = ['apps', 'packages'].flatMap((root) =>
  readdirSync(root)
    .map((name) => join(root, name))
    .filter((dir) => existsSync(join(dir, 'package.json'))),
);

const testTasks = new Set(
  workspaces
    .flatMap((dir) => Object.keys(JSON.parse(readFileSync(join(dir, 'package.json'), 'utf8')).scripts ?? {}))
    .filter((name) => name.startsWith('test:')),
);

const registrations = {
  'turbo.json test': new Set(JSON.parse(readFileSync('turbo.json', 'utf8')).tasks.test.dependsOn),
  '.github/workflows/ci.yml': new Set(readFileSync('.github/workflows/ci.yml', 'utf8').match(/test:[a-z-]+/g) ?? []),
};

const problems = [...testTasks].sort().flatMap((task) => {
  const places = Object.keys(registrations).filter((place) => registrations[place].has(task));
  if (MANUAL_ONLY.has(task)) return places.length === 0 ? [] : [`${task} is manual only but registered in ${places.join(', ')}`];
  if (places.length === 0) return [`${task} is not registered, so CI never runs it`];
  if (places.length > 1) return [`${task} is registered in ${places.join(' and ')}, so CI runs it twice`];
  return [];
});

if (problems.length > 0) {
  console.error(['Test tasks must be registered in exactly one place:', ...problems.map((problem) => `- ${problem}`)].join('\n'));
  process.exit(1);
}
console.log(`${testTasks.size} test tasks registered`);
