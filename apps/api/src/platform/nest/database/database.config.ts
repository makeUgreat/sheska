import { registerAs } from '@nestjs/config';
import { z } from 'zod';
import { withFileSecrets } from '../../config/secret-file.loader';

const databaseEnvSchema = z.object({
  /**
   * PostgreSQL 접속 주소다. 비밀번호가 들어가므로 production에서는 비밀값이다.
   * 비밀값이라 `DATABASE_URL_FILE`로 이 값이 든 파일의 경로를 대신 줄 수 있다.
   */
  DATABASE_URL: z.url(),
});

export const databaseConfig = registerAs('database', () => {
  const result = databaseEnvSchema.safeParse(
    withFileSecrets(process.env, ['DATABASE_URL']),
  );
  if (!result.success) {
    throw new Error(
      `Invalid database configuration.\n${z.prettifyError(result.error)}`,
    );
  }
  return { databaseUrl: result.data.DATABASE_URL };
});
