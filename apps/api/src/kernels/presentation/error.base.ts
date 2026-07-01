export const PRESENTATION_ERROR_KIND = {
  VALIDATION_FAILED: 'validation_failed',
} as const;

export type PresentationErrorKind =
  (typeof PRESENTATION_ERROR_KIND)[keyof typeof PRESENTATION_ERROR_KIND];

export type PresentationErrorCode<
  Owner extends string,
  Reason extends string,
> = `${Owner}.${Reason}`;

export interface PresentationErrorBase<
  Kind extends PresentationErrorKind = PresentationErrorKind,
  Code extends string = string,
  Details = unknown,
> {
  readonly kind: Kind;
  readonly code: Code;
  readonly message: string;
  readonly details: Details;
}

export type PresentationErrorOf<
  Kind extends PresentationErrorKind,
  Owner extends string,
  Reason extends string,
  Details = PresentationErrorDetailsFor<Kind>,
> = PresentationErrorBase<Kind, PresentationErrorCode<Owner, Reason>, Details>;

export type PresentationValidationFieldDetail = {
  readonly path: string;
  readonly messages: string[];
};

export type PresentationValidationDetails = {
  readonly fields: PresentationValidationFieldDetail[];
};

export type PresentationErrorDetailsFor<Kind extends PresentationErrorKind> =
  Kind extends typeof PRESENTATION_ERROR_KIND.VALIDATION_FAILED
    ? PresentationValidationDetails
    : unknown;

export interface HttpErrorEnvelope<
  Code extends string = string,
  Details = unknown,
> {
  readonly statusCode: number;
  readonly code: Code;
  readonly message: string;
  readonly details: Details;
}
