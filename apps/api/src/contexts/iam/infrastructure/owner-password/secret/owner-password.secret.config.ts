import { type ConfigType, registerAs } from '@nestjs/config';
import { z } from 'zod';
import { withFileSecrets } from '@kernels/infrastructure';

const ownerPasswordEnvSchema = z.object({
  /** 소유자 비밀번호다. 비밀값이고 `_FILE`로도 받는다. 8자보다 짧으면 시작하지 않는다. */
  OWNER_PASSWORD: z.string().min(8),
});

export const ownerPasswordSecretConfig = registerAs('ownerPasswordSecret', () => {
  const result = ownerPasswordEnvSchema.safeParse(withFileSecrets(process.env, ['OWNER_PASSWORD']));
  if (!result.success) {
    throw new Error(`Invalid owner password configuration.\n${z.prettifyError(result.error)}`);
  }
  return { password: result.data.OWNER_PASSWORD };
});

export type OwnerPasswordSecretConfig = ConfigType<typeof ownerPasswordSecretConfig>;
