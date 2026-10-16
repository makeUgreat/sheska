import { InvariantViolationError } from '@core/errors';
import { ValueObject, type DomainPrimitive } from '@kernels/domain';

export class KnowledgeFolder extends ValueObject<string> {
  private constructor(props: DomainPrimitive<string>) {
    super(props);
  }

  static of(value: string): KnowledgeFolder {
    return new KnowledgeFolder({
      value: value.trim().replace(/^\/+|\/+$/g, ''),
    });
  }

  get pathPrefix(): string {
    return `${this.props.value}/`;
  }

  protected validate(props: DomainPrimitive<string>): void {
    if (props.value.length === 0) {
      throw new InvariantViolationError({
        code: 'library.empty_knowledge_folder',
        message: 'Knowledge folder cannot be empty',
        details: { fields: ['knowledgeFolder'] },
      });
    }
  }
}
