import { Reflector } from '@nestjs/core';

export const ErrorCodes = Reflector.createDecorator<readonly string[]>();
