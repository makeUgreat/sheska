import { fromPromise, type ResultAsync } from '@core/result';
import {
  mapPostgresPersistenceError,
  type PostgresInfrastructureError,
} from './postgres.error';

export abstract class PostgresRepositoryBase<
  Owner extends string,
  Adapter extends string,
> {
  protected constructor(
    private readonly owner: Owner,
    private readonly adapter: Adapter,
  ) {}

  protected runPostgres<T>(
    operation: () => Promise<T>,
  ): ResultAsync<T, PostgresInfrastructureError<Owner, Adapter>> {
    return fromPromise(Promise.resolve().then(operation), (error) =>
      mapPostgresPersistenceError(error, {
        owner: this.owner,
        adapter: this.adapter,
      }),
    );
  }
}
