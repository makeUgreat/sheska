import { type ConfigType, registerAs } from '@nestjs/config';
import { z } from 'zod';
import { withFileSecrets } from '@kernels/infrastructure';

const attachmentContentR2EnvSchema = z.object({
  /** S3 API 주소. 예: `https://<account id>.r2.cloudflarestorage.com` */
  ATTACHMENT_STORAGE_ENDPOINT: z.url(),
  ATTACHMENT_STORAGE_BUCKET: z.string().min(1),
  /** 비밀값. `_FILE`로도 받는다. */
  ATTACHMENT_STORAGE_ACCESS_KEY_ID: z.string().min(1),
  /** 비밀값. `_FILE`로도 받는다. */
  ATTACHMENT_STORAGE_SECRET_ACCESS_KEY: z.string().min(1),
});

export const attachmentContentR2Config = registerAs('attachmentContentR2', () => {
  const result = attachmentContentR2EnvSchema.safeParse(
    withFileSecrets(process.env, ['ATTACHMENT_STORAGE_ACCESS_KEY_ID', 'ATTACHMENT_STORAGE_SECRET_ACCESS_KEY']),
  );
  if (!result.success) {
    throw new Error(`Invalid attachment storage configuration.\n${z.prettifyError(result.error)}`);
  }

  return {
    endpoint: result.data.ATTACHMENT_STORAGE_ENDPOINT,
    bucket: result.data.ATTACHMENT_STORAGE_BUCKET,
    accessKeyId: result.data.ATTACHMENT_STORAGE_ACCESS_KEY_ID,
    secretAccessKey: result.data.ATTACHMENT_STORAGE_SECRET_ACCESS_KEY,
  };
});

export type AttachmentContentR2Config = ConfigType<typeof attachmentContentR2Config>;
