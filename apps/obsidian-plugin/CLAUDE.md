# Obsidian Plugin Conventions

## Testing

Every source change must be accompanied by corresponding test changes in the same commit.

| Change type | Required test action |
|---|---|
| New setting field added to `SheskaSettings` | Add `DEFAULT_SETTINGS` default value test + `getSettingDefinitions()` entry test in `settings.spec.ts` |
| New plugin lifecycle behavior (command, interval, hook) | Add behavior test in `main.spec.ts` |
| New API client method | Add test in `api/client.spec.ts` |
| Existing behavior changed | Update affected tests; do not leave stale assertions |

Tests live next to source files as `*.spec.ts`. The Obsidian SDK is mocked at `__mocks__/obsidian.ts` — extend the mock when new SDK methods are used.

Run tests with `pnpm test`.