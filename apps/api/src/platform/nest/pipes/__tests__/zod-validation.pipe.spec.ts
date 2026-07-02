import { type ArgumentMetadata } from '@nestjs/common';
import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import {
  PresentationException,
  PRESENTATION_ERROR_KIND,
} from '@kernels/presentation';
import { ZodValidationPipe } from '../zod-validation.pipe';

function buildMetadata(
  metatype?: ArgumentMetadata['metatype'],
): ArgumentMetadata {
  return { type: 'body', metatype };
}

class SchemaClass {
  static readonly zodSchema = z.object({ name: z.string() });
}

describe('ZodValidationPipe', () => {
  describe('metatype에 zodSchema가 없는 경우', () => {
    it('metatype이 undefined이면 값을 그대로 반환한다', () => {
      const pipe = new ZodValidationPipe();
      const value = { name: 'test' };

      const result = pipe.transform(value, buildMetadata(undefined));

      expect(result).toBe(value);
    });

    it('metatype에 zodSchema가 없으면 값을 그대로 반환한다', () => {
      const pipe = new ZodValidationPipe();
      const value = { name: 'test' };

      class NoSchema {}

      const result = pipe.transform(value, buildMetadata(NoSchema));

      expect(result).toBe(value);
    });

    it('zodSchema가 safeParse 메서드가 없는 값이면 값을 그대로 반환한다', () => {
      const pipe = new ZodValidationPipe();
      const value = { name: 'test' };

      class InvalidSchema {
        static readonly zodSchema = 'not-a-schema';
      }

      const result = pipe.transform(value, buildMetadata(InvalidSchema));

      expect(result).toBe(value);
    });
  });

  describe('유효한 값인 경우', () => {
    it('파싱된 값을 반환한다', () => {
      const pipe = new ZodValidationPipe();

      const result = pipe.transform(
        { name: 'hello' },
        buildMetadata(SchemaClass),
      );

      expect(result).toEqual({ name: 'hello' });
    });

    it('zod가 변환한 값을 반환한다', () => {
      class TransformSchema {
        static readonly zodSchema = z.object({ count: z.coerce.number() });
      }
      const pipe = new ZodValidationPipe();

      const result = pipe.transform(
        { count: '42' },
        buildMetadata(TransformSchema),
      );

      expect(result).toEqual({ count: 42 });
    });
  });

  describe('유효하지 않은 값인 경우', () => {
    it('VALIDATION_FAILED kind의 PresentationException을 던진다', () => {
      const pipe = new ZodValidationPipe();

      expect(() =>
        pipe.transform({ name: 123 }, buildMetadata(SchemaClass)),
      ).toThrow(PresentationException);

      try {
        pipe.transform({ name: 123 }, buildMetadata(SchemaClass));
      } catch (e) {
        expect((e as PresentationException).error.kind).toBe(
          PRESENTATION_ERROR_KIND.VALIDATION_FAILED,
        );
      }
    });

    it('기본 error code를 사용한다', () => {
      const pipe = new ZodValidationPipe();

      try {
        pipe.transform({ name: 123 }, buildMetadata(SchemaClass));
      } catch (e) {
        expect((e as PresentationException).error.code).toBe(
          'request.validation_failed',
        );
      }
    });

    it('기본 error message를 사용한다', () => {
      const pipe = new ZodValidationPipe();

      try {
        pipe.transform({ name: 123 }, buildMetadata(SchemaClass));
      } catch (e) {
        expect((e as PresentationException).error.message).toBe(
          'Invalid request',
        );
      }
    });

    describe('validation details', () => {
      it('실패한 필드의 path를 details.fields에 포함한다', () => {
        const pipe = new ZodValidationPipe();

        try {
          pipe.transform({ name: 123 }, buildMetadata(SchemaClass));
        } catch (e) {
          const details = (e as PresentationException).error.details as {
            fields: { path: string; messages: string[] }[];
          };
          expect(details.fields[0].path).toBe('name');
        }
      });

      it('최상위 필드 누락 시 path를 "body"로 설정한다', () => {
        class TopLevelSchema {
          static readonly zodSchema = z.string();
        }
        const pipe = new ZodValidationPipe();

        try {
          pipe.transform(123, buildMetadata(TopLevelSchema));
        } catch (e) {
          const details = (e as PresentationException).error.details as {
            fields: { path: string; messages: string[] }[];
          };
          expect(details.fields[0].path).toBe('body');
        }
      });

      it('같은 path의 여러 issue를 하나의 field entry로 합친다', () => {
        class MultiIssueSchema {
          static readonly zodSchema = z
            .object({ value: z.string().min(3).max(10) })
            .superRefine((data, ctx) => {
              ctx.addIssue({
                code: z.ZodIssueCode.custom,
                path: ['value'],
                message: 'custom error',
              });
            });
        }
        const pipe = new ZodValidationPipe();

        try {
          pipe.transform({ value: 'ab' }, buildMetadata(MultiIssueSchema));
        } catch (e) {
          const details = (e as PresentationException).error.details as {
            fields: { path: string; messages: string[] }[];
          };
          const valueField = details.fields.find((f) => f.path === 'value');
          expect(valueField?.messages.length).toBeGreaterThan(1);
        }
      });
    });
  });
});
