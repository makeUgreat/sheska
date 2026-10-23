const declaredErrorCodes = new WeakMap<object, readonly string[]>();

export function ErrorCodes(codes: readonly string[]): MethodDecorator {
  return (_target, _propertyKey, descriptor) => {
    declaredErrorCodes.set(descriptor.value as object, codes);
  };
}

export function declaredErrorCodesOf(handler: object): readonly string[] {
  return declaredErrorCodes.get(handler) ?? [];
}
