import {
  INFRASTRUCTURE_ERROR_KIND,
  type InfrastructureErrorCauseDetails,
  type InfrastructureErrorKind,
  type InfrastructureErrorOf,
} from '../error.base';
import { z } from 'zod';

export const POSTGRES_SQLSTATE = {
  FOREIGN_KEY_VIOLATION: '23503',
  UNIQUE_VIOLATION: '23505',
  CHECK_VIOLATION: '23514',
} as const;

const postgresSqlStateSchema = z.enum(POSTGRES_SQLSTATE);

export type PostgresSqlState = z.infer<typeof postgresSqlStateSchema>;

type PostgresConflictPayload = {
  readonly sqlState: PostgresSqlState;
  readonly constraint?: string;
};

const postgresConflictSchema = z
  .looseObject({
    code: postgresSqlStateSchema,
    constraint: z.unknown().optional(),
  })
  .transform(({ code, constraint }): PostgresConflictPayload => {
    return typeof constraint === 'string'
      ? { sqlState: code, constraint }
      : { sqlState: code };
  });
const causeSchema = z.looseObject({
  cause: z.unknown().optional(),
});

type PostgresPersistenceErrorOf<
  Kind extends InfrastructureErrorKind,
  Owner extends string,
  Reason extends string,
  Details extends InfrastructureErrorCauseDetails,
  Adapter extends string,
> = InfrastructureErrorOf<
  Kind,
  Owner,
  Reason,
  Details,
  {
    readonly boundary: 'persistence';
    readonly adapter: Adapter;
  }
>;

export type PostgresInfrastructureError<
  Owner extends string,
  Adapter extends string,
> =
  | PostgresPersistenceErrorOf<
      typeof INFRASTRUCTURE_ERROR_KIND.CONFLICT,
      Owner,
      'conflict',
      PostgresConflictPayload & InfrastructureErrorCauseDetails,
      Adapter
    >
  | PostgresPersistenceErrorOf<
      typeof INFRASTRUCTURE_ERROR_KIND.UNAVAILABLE,
      Owner,
      'unavailable',
      InfrastructureErrorCauseDetails,
      Adapter
    >;

export function mapPostgresPersistenceError<
  Owner extends string,
  Adapter extends string,
>(
  error: unknown,
  context: {
    readonly owner: Owner;
    readonly adapter: Adapter;
  },
): PostgresInfrastructureError<Owner, Adapter> {
  const conflict = findPostgresConflict(error);
  const source = {
    boundary: 'persistence',
    adapter: context.adapter,
  } as const;

  if (conflict) {
    return {
      kind: INFRASTRUCTURE_ERROR_KIND.CONFLICT,
      code: `${context.owner}.conflict`,
      source,
      message: 'Postgres persistence conflict',
      details: {
        ...conflict,
        cause: error,
      },
    };
  }

  return {
    kind: INFRASTRUCTURE_ERROR_KIND.UNAVAILABLE,
    code: `${context.owner}.unavailable`,
    source,
    message: 'Postgres persistence is unavailable',
    details: {
      cause: error,
    },
  };
}

function findPostgresConflict(error: unknown): PostgresConflictPayload | null {
  const visitedErrors = new Set<unknown>();
  let currentError = error;

  while (currentError !== undefined && !visitedErrors.has(currentError)) {
    visitedErrors.add(currentError);

    const parsedConflict = postgresConflictSchema.safeParse(currentError);

    if (parsedConflict.success) {
      return parsedConflict.data;
    }

    const parsedCause = causeSchema.safeParse(currentError);
    currentError = parsedCause.success ? parsedCause.data.cause : undefined;
  }

  return null;
}
