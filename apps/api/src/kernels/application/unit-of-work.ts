export interface UnitOfWork<TResources> {
  execute<TResult>(
    work: (resources: TResources) => Promise<TResult>,
  ): Promise<TResult>;
}
