import { describe, expect, it, vi } from 'vitest';
import { err, ok, type Result } from '../result';

describe('Result', () => {
  describe('ok', () => {
    it('성공 값을 저장한다', () => {
      const result = ok('spring');

      expect(result.isOk()).toBe(true);

      if (result.isOk()) {
        expect(result.value).toBe('spring');
      }
    });

    it('성공 값을 변환한다', () => {
      const result = ok(1).map((value) => value + 1);

      expect(result.isOk()).toBe(true);

      if (result.isOk()) {
        expect(result.value).toBe(2);
      }
    });

    it('map mapper에 성공 값을 전달한다', () => {
      const mapper = vi.fn((value: number) => value + 1);

      ok(1).map(mapper);

      expect(mapper).toHaveBeenCalledWith(1);
    });

    it('성공 값을 다음 Result로 연결한다', () => {
      const result = ok(1).andThen((value): Result<number, string> => {
        return ok(value + 1);
      });

      expect(result.isOk()).toBe(true);

      if (result.isOk()) {
        expect(result.value).toBe(2);
      }
    });

    it('andThen mapper에 성공 값을 전달한다', () => {
      const mapper = vi.fn((value: number): Result<number, string> => {
        return ok(value + 1);
      });

      ok(1).andThen(mapper);

      expect(mapper).toHaveBeenCalledWith(1);
    });

    it('andThen mapper가 반환한 실패 Result를 유지한다', () => {
      const result = ok(1).andThen((): Result<number, string> => {
        return err('failed');
      });

      expect(result.isErr()).toBe(true);

      if (result.isErr()) {
        expect(result.error).toBe('failed');
      }
    });
  });

  describe('err', () => {
    it('실패 값을 저장한다', () => {
      const result = err('failed');

      expect(result.isErr()).toBe(true);

      if (result.isErr()) {
        expect(result.error).toBe('failed');
      }
    });

    it('실패 값에서는 map 변환을 건너뛴다', () => {
      const result = err('failed').map(() => 'mapped');

      expect(result.isErr()).toBe(true);

      if (result.isErr()) {
        expect(result.error).toBe('failed');
      }
    });

    it('실패 값에서는 map mapper를 호출하지 않는다', () => {
      const mapper = vi.fn(() => 'mapped');

      err('failed').map(mapper);

      expect(mapper).not.toHaveBeenCalled();
    });

    it('실패 값에서는 andThen 연결을 건너뛴다', () => {
      const result = err('failed').andThen(() => ok('mapped'));

      expect(result.isErr()).toBe(true);

      if (result.isErr()) {
        expect(result.error).toBe('failed');
      }
    });

    it('실패 값에서는 andThen mapper를 호출하지 않는다', () => {
      const mapper = vi.fn((): Result<string, never> => ok('mapped'));

      err('failed').andThen(mapper);

      expect(mapper).not.toHaveBeenCalled();
    });
  });
});
