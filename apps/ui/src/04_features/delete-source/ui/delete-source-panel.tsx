import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDeleteSource } from '@/entities/source';
import { ACTION_BUTTON, Spinner } from '@/shared/ui';

const DESCRIPTION = 'mt-1.5 text-body-sm text-text-secondary';

export function DeleteSourcePanel({ sourceId }: { sourceId: string }) {
  const deleteSource = useDeleteSource();
  const navigate = useNavigate();
  const [confirming, setConfirming] = useState(false);

  function remove() {
    deleteSource.mutate(sourceId, { onSuccess: () => void navigate('/sources') });
  }

  function stopConfirming() {
    deleteSource.reset();
    setConfirming(false);
  }

  return (
    <section aria-labelledby="delete-source-heading">
      <h2 id="delete-source-heading" className="mb-3 font-mono text-label-sm uppercase text-text-muted">
        Source 삭제
      </h2>

      {confirming ? (
        <div role="alertdialog" aria-labelledby="delete-source-question">
          {deleteSource.isError ? (
            <>
              <p id="delete-source-question" role="alert" className="text-body-sm font-semibold text-text-primary">
                <span aria-hidden="true" className="font-mono">
                  ✕{' '}
                </span>
                source를 지우지 못했습니다.
              </p>
              <p className={DESCRIPTION}>{deleteSource.error.message}</p>
            </>
          ) : (
            <>
              <p id="delete-source-question" className="text-body-sm font-semibold text-text-primary">
                이 source를 지울까요?
              </p>
              <p className={DESCRIPTION}>
                포스트, 조회수, 방문 기록, AI 요약, 임베딩이 모두 지워집니다. 되돌릴 수 없습니다. vault 노트는 그대로이고, 노트를 다시
                고치면 새 source로 올라옵니다.
              </p>
            </>
          )}
          <div className="mt-3.5 grid gap-2">
            <button type="button" onClick={remove} disabled={deleteSource.isPending} className={ACTION_BUTTON.ink}>
              {deleteSource.isPending && <Spinner />}
              {deleteSource.isPending ? '지우는 중...' : deleteSource.isError ? '다시 시도' : 'Source 삭제하기'}
            </button>
            <button type="button" onClick={stopConfirming} disabled={deleteSource.isPending} className={ACTION_BUTTON.outline}>
              그만두기
            </button>
          </div>
        </div>
      ) : (
        <>
          <p className="text-body-sm text-text-secondary">vault 파일과 연결이 끊긴 source를 지울 때 씁니다.</p>
          <div className="mt-3.5 grid">
            <button type="button" onClick={() => setConfirming(true)} className={ACTION_BUTTON.outline}>
              Source 삭제
            </button>
          </div>
        </>
      )}
    </section>
  );
}
