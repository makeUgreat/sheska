import { fromPromise, type ResultAsync } from '@core/result';
import {
  mapPostgresPersistenceFailure,
  type PostgresInfrastructureFailure,
} from './postgres.failure';

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
  ): ResultAsync<T, PostgresInfrastructureFailure<Owner, Adapter>> {
    return fromPromise(Promise.resolve().then(operation), (error) =>
      mapPostgresPersistenceFailure(error, {
        owner: this.owner,
        adapter: this.adapter,
      }),
    );
  }
}
