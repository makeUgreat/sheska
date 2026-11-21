import { ValueObject, type DomainPrimitive } from '@kernels/domain';

const UNKNOWN = 'unknown';

export class PostViewClient extends ValueObject<string> {
  private constructor(props: DomainPrimitive<string>) {
    super(props);
  }

  static of(userAgent: string | undefined): PostViewClient {
    const value = userAgent?.trim();
    if (!value) return new PostViewClient({ value: UNKNOWN });

    return new PostViewClient({ value });
  }

  protected validate(): void {}
}
