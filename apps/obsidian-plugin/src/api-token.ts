import { type App } from 'obsidian';

// data.json은 vault 백업과 Obsidian Sync를 따라 다른 곳으로 복사될 수 있어 SecretStorage에 둔다.
const SECRET_ID = 'sheska-api-token';

export function readApiToken(app: App): string | null {
  const token = app.secretStorage.getSecret(SECRET_ID)?.trim();
  return token ? token : null;
}

export function writeApiToken(app: App, token: string): void {
  app.secretStorage.setSecret(SECRET_ID, token.trim());
}
