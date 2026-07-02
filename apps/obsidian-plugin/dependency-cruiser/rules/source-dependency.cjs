/** @type {import('dependency-cruiser').IForbiddenRuleType[]} */
module.exports = [
  {
    name: 'plugin-client-not-to-obsidian',
    severity: 'error',
    comment:
      'The API client must remain framework-independent. Move any Obsidian-specific logic to main.ts or a dedicated adapter.',
    from: {
      path: '^src/api/',
    },
    to: {
      path: 'node_modules/obsidian',
    },
  },
];