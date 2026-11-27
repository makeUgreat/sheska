import type { NoteRejection } from '@/storage';

const BANNER_CLASS = 'sheska-rejection-banner';
const HOST_CLASS = 'sheska-has-rejection';

/**
 * 거부 이유를 노트 화면 맨 위에 둔다. 파일에 쓰면 그 글자까지 동기화되므로 화면에만 그린다.
 * 같은 이유면 그대로 두어 화면 낭독기가 알림을 되풀이하지 않게 한다.
 */
export function renderRejectionBanner(container: HTMLElement, rejection: NoteRejection | null): void {
  const current = container.querySelector<HTMLElement>(`:scope > .${BANNER_CLASS}`);
  if (current && rejection && current.dataset.rejection === keyOf(rejection)) return;

  current?.remove();
  container.classList.toggle(HOST_CLASS, rejection !== null);
  if (!rejection) return;

  const doc = container.ownerDocument;
  const banner = doc.createElement('div');
  banner.className = BANNER_CLASS;
  banner.dataset.rejection = keyOf(rejection);
  banner.setAttribute('role', 'alert');

  const title = doc.createElement('p');
  title.className = `${BANNER_CLASS}-title`;
  title.textContent = 'Sheska rejected this note, so it is not synced. Fix it and save to upload again.';
  banner.append(title);

  const message = doc.createElement('p');
  message.className = `${BANNER_CLASS}-message`;
  message.textContent = rejection.message;
  banner.append(message);

  if (rejection.code) {
    const code = doc.createElement('code');
    code.className = `${BANNER_CLASS}-code`;
    code.textContent = rejection.code;
    banner.append(code);
  }

  container.prepend(banner);
}

function keyOf(rejection: NoteRejection): string {
  return `${rejection.code ?? ''}\n${rejection.message}`;
}
