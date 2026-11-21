import { InvariantViolationError } from '@core/errors';
import { PostSummary, SourceFingerprint } from '@contexts/library/domain';
import { describe, expect, it } from 'vitest';

const FINISHED_AT = new Date('2026-11-21T10:00:00Z');

describe('PostSummary', () => {
  it('완료한 요약은 post 식별자, 본문 fingerprint, 문장, 응답한 모델을 담는다', () => {
    const summary = PostSummary.complete({
      postId: 'source-1',
      fingerprint: SourceFingerprint.of('fingerprint-1'),
      sentences: ['첫째 문장', '둘째 문장'],
      model: 'claude-haiku-5-5',
      finishedAt: FINISHED_AT,
    });

    const props = summary.getProps();
    expect(summary.id).toBe('source-1');
    expect(props.fingerprint.unpack()).toBe('fingerprint-1');
    expect(props.outcome).toEqual({ kind: 'completed', sentences: ['첫째 문장', '둘째 문장'], model: 'claude-haiku-5-5' });
    expect(props.finishedAt).toBe(FINISHED_AT);
  });

  it('완료한 요약의 문장은 넘겨준 배열을 바꿔도 따라 바뀌지 않는다', () => {
    const sentences = ['첫째 문장'];
    const summary = PostSummary.complete({
      postId: 'source-1',
      fingerprint: SourceFingerprint.of('fingerprint-1'),
      sentences,
      model: 'claude-haiku-5-5',
      finishedAt: FINISHED_AT,
    });

    sentences.push('나중에 넣은 문장');

    expect(summary.getProps().outcome).toEqual({ kind: 'completed', sentences: ['첫째 문장'], model: 'claude-haiku-5-5' });
  });

  it('문장이 하나도 없으면 완료한 요약을 만들 수 없다', () => {
    expect(() =>
      PostSummary.complete({
        postId: 'source-1',
        fingerprint: SourceFingerprint.of('fingerprint-1'),
        sentences: [],
        model: 'claude-haiku-5-5',
        finishedAt: FINISHED_AT,
      }),
    ).toThrow(InvariantViolationError);
  });

  it('실패한 요약은 결과만 실패로 담는다', () => {
    const summary = PostSummary.fail({
      postId: 'source-1',
      fingerprint: SourceFingerprint.of('fingerprint-1'),
      finishedAt: FINISHED_AT,
    });

    expect(summary.getProps().outcome).toEqual({ kind: 'failed' });
  });

  it.each([
    { name: '완료한', outcome: { kind: 'completed', sentences: ['첫째 문장'], model: 'claude-haiku-5-5' } as const },
    { name: '실패한', outcome: { kind: 'failed' } as const },
  ])('저장된 $name 요약을 그대로 복원한다', ({ outcome }) => {
    const summary = PostSummary.restore({
      postId: 'source-1',
      fingerprint: 'fingerprint-1',
      outcome,
      finishedAt: FINISHED_AT,
    });

    const props = summary.getProps();
    expect(summary.id).toBe('source-1');
    expect(props.fingerprint.unpack()).toBe('fingerprint-1');
    expect(props.outcome).toEqual(outcome);
    expect(props.finishedAt).toBe(FINISHED_AT);
  });

  it('저장된 문장 목록이 비어 있으면 복원할 수 없다', () => {
    expect(() =>
      PostSummary.restore({
        postId: 'source-1',
        fingerprint: 'fingerprint-1',
        outcome: { kind: 'completed', sentences: [], model: 'claude-haiku-5-5' },
        finishedAt: FINISHED_AT,
      }),
    ).toThrow(InvariantViolationError);
  });
});
