import { ApiToken } from '@contexts/iam/domain';
import { type ApiTokenInsert, type ApiTokenRow } from './schema';

export class ApiTokenPgDrizzleMapper {
  static toDomain(this: void, row: ApiTokenRow): ApiToken {
    return ApiToken.restore({
      id: row.id,
      name: row.name,
      secretHash: row.secretHash,
      hint: row.hint,
      permissions: row.permissions,
      lastUsedAt: row.lastUsedAt,
      createdAt: row.createdAt,
    });
  }

  static toInsert(apiToken: ApiToken): ApiTokenInsert {
    const props = apiToken.getProps();

    return {
      id: apiToken.id,
      name: props.name.unpack(),
      secretHash: props.secretHash,
      hint: props.hint,
      permissions: props.permissions.unpack(),
      lastUsedAt: props.lastUsedAt,
      createdAt: apiToken.createdAt,
    };
  }
}
