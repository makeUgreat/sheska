import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import { ZodValidationPipe } from '../zod-validation.pipe';
import { ValidationFailedError } from '@core/errors';

const schema = z.object({ name: z.string() });

describe('ZodValidationPipe', () => {
  describe('유효한 값인 경우', () => {
    it('파싱된 값을 반환한다', () => {
      const pipe = new ZodValidationPipe(schema);

      const result = pipe.transform({ name: 'hello' });

      expect(result).toEqual({ name: 'hello' });
    });

    it('zod가 변환한 값을 반환한다', () => {
      const pipe = new ZodValidationPipe(
        z.object({ count: z.coerce.number() }),
      );

      const result = pipe.transform({ count: '42' });

      expect(result).toEqual({ count: 42 });
    });
  });

  describe('유효하지 않은 값인 경우', () => {
    it('ValidationFailedError를 던진다', () => {
      const pipe = new ZodValidationPipe(schema);

      expect(() => pipe.transform({ name: 123 })).toThrow(
        ValidationFailedError,
      );
    });

    it('기본 error code를 사용한다', () => {
      const pipe = new ZodValidationPipe(schema);

      try {
        pipe.transform({ name: 123 });
      } catch (e) {
        expect((e as ValidationFailedError).code).toBe(
          'request.validation_failed',
        );
      }
    });

    it('기본 error message를 사용한다', () => {
      const pipe = new ZodValidationPipe(schema);

      try {
        pipe.transform({ name: 123 });
      } catch (e) {
        expect((e as ValidationFailedError).message).toBe('Invalid request');
      }
    });

    describe('validation details', () => {
      it('실패한 필드의 path를 details.fields에 포함한다', () => {
        const pipe = new ZodValidationPipe(schema);

        try {
          pipe.transform({ name: 123 });
        } catch (e) {
          const { details } = e as ValidationFailedError;
          expect(details.fields[0].path).toBe('name');
        }
      });

      it('최상위 필드 누락 시 path를 "body"로 설정한다', () => {
        const pipe = new ZodValidationPipe(z.string());

        try {
          pipe.transform(123);
        } catch (e) {
          const { details } = e as ValidationFailedError;
          expect(details.fields[0].path).toBe('body');
        }
      });

      it('같은 path의 여러 issue를 하나의 field entry로 합친다', () => {
        const pipe = new ZodValidationPipe(
          z
            .object({ value: z.string().min(3).max(10) })
            .superRefine((data, ctx) => {
              ctx.addIssue({
                code: z.ZodIssueCode.custom,
                path: ['value'],
                message: 'custom error',
              });
            }),
        );

        try {
          pipe.transform({ value: 'ab' });
        } catch (e) {
          const { details } = e as ValidationFailedError;
          const valueField = details.fields.find((f) => f.path === 'value');
          expect(valueField?.messages.length).toBeGreaterThan(1);
        }
      });
    });
  });
});
