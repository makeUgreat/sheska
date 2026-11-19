import { newId } from '@core/id';
import { AggregateRoot } from '@kernels/domain';
import { ApiTokenName } from './api-token-name.vo';
import { type ApiTokenSecret } from './api-token-secret.vo';

interface ApiTokenProps {
  name: ApiTokenName;
  secretHash: string;
  hint: string;
  lastUsedAt: Date | null;
}

const USE_RECORD_INTERVAL_MS = 60 * 1000;

export class ApiToken extends AggregateRoot<ApiTokenProps> {
  static create(params: ApiTokenCreateParams): ApiToken {
    const { name, secret } = params;

    return new ApiToken({
      id: newId(),
      props: {
        name,
        secretHash: secret.hash(),
        hint: secret.hint(),
        lastUsedAt: null,
      },
    });
  }

  static restore(params: ApiTokenRestoreParams): ApiToken {
    const { id, name, secretHash, hint, lastUsedAt, createdAt } = params;

    return new ApiToken({
      id,
      props: {
        name: ApiTokenName.of(name),
        secretHash,
        hint,
        lastUsedAt,
      },
      createdAt,
    });
  }

  tryRecordUse(at: Date): boolean {
    const last = this.props.lastUsedAt;
    if (last && at.getTime() - last.getTime() < USE_RECORD_INTERVAL_MS) {
      return false;
    }
    this.props.lastUsedAt = at;
    return true;
  }

  public validate(): void {}
}

interface ApiTokenCreateParams {
  name: ApiTokenName;
  secret: ApiTokenSecret;
}

interface ApiTokenRestoreParams {
  id: string;
  name: string;
  secretHash: string;
  hint: string;
  lastUsedAt: Date | null;
  createdAt?: Date;
}
