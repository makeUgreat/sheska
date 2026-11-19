import { createHash, timingSafeEqual } from 'node:crypto';
import { Inject, Injectable } from '@nestjs/common';
import { type OwnerPasswordVerifier } from '@contexts/iam/application/ports';
import { ownerPasswordSecretConfig, type OwnerPasswordSecretConfig } from './owner-password.secret.config';

@Injectable()
export class OwnerPasswordSecretVerifier implements OwnerPasswordVerifier {
  private readonly digest: Buffer;

  constructor(@Inject(ownerPasswordSecretConfig.KEY) config: OwnerPasswordSecretConfig) {
    this.digest = digestOf(config.password);
  }

  matches(password: string): Promise<boolean> {
    return Promise.resolve(timingSafeEqual(digestOf(password), this.digest));
  }
}

function digestOf(text: string): Buffer {
  return createHash('sha256').update(text, 'utf8').digest();
}
