export interface QueueJobFailureLogContext {
  readonly queueName: string;
  readonly jobId: string | number | undefined;
  readonly attemptsMade: number;
}
