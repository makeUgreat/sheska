import { InvariantViolationError } from '@core/errors';
import { ValueObject } from '@kernels/domain';
import { ALL_PERMISSIONS, isPermission, type Permission } from './permission';

export class ApiTokenPermissions extends ValueObject<Permission[]> {
  private constructor(props: Permission[]) {
    super(props);
  }

  static of(values: readonly string[]): ApiTokenPermissions {
    const unique = [...new Set(values)];
    if (unique.length === 0 || !unique.every(isPermission)) {
      throw new InvariantViolationError({
        code: 'api_token.invalid_permissions',
        message: `API token permissions must be one or more of ${ALL_PERMISSIONS.join(', ')}`,
        details: { fields: ['permissions'] },
      });
    }

    return new ApiTokenPermissions(unique);
  }

  grants(permission: Permission): boolean {
    return this.props.includes(permission);
  }

  protected validate(): void {}
}
