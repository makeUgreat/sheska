import { type RefObject, useEffect } from 'react';

const SECTION_HEADING = 'section > :is(h2, h3, h4, h5)';

const PIN_ATTRIBUTE = 'data-pin-section';

/**
 * 본문 밖의 요소가 누르면 섹션을 고정하게 하는 속성이다. 값은 섹션 제목의 id다.
 * 예: AI 답 아래의 근거 링크. 본문 밖 click은 원래 고정을 풀기 때문에 별도 표시가 필요하다.
 */
export function pinSectionOnClick(headingId: string) {
  return { [PIN_ATTRIBUTE]: headingId };
}

/**
 * Hover한 제목의 섹션을 미리 보이고, 누른 제목의 섹션을 고정한다. 미리 보기가 고정보다 앞선다.
 * 강조는 DOM data 속성으로만 남긴다. React state로 두면 hover할 때마다 본문 전체를 다시 그린다.
 * Hover를 CSS로 두지 않는 이유는 터치 기기가 누른 제목을 계속 `:hover`로 보아서 다시 눌러도 풀리지 않기 때문이다.
 */
export function useSectionFocus(root: RefObject<HTMLElement | null>, body: string) {
  useEffect(() => {
    const article = root.current;
    if (!article) return;

    let pinned: Element | null = null;
    let previewed: Element | null = null;
    let shown: Element | null = null;

    const sectionOf = (target: EventTarget | null) => {
      if (!(target instanceof Element)) return null;

      const heading = target.closest(SECTION_HEADING);
      return heading && article.contains(heading) ? heading.parentElement : null;
    };

    /** 고정을 요청한 요소가 아니면 `undefined`다. 요청했지만 그 제목이 이 본문의 섹션 제목이 아니면 `null`이다. */
    const requestedSection = (target: EventTarget | null) => {
      if (!(target instanceof Element)) return undefined;

      const id = target.closest(`[${PIN_ATTRIBUTE}]`)?.getAttribute(PIN_ATTRIBUTE);
      if (id === undefined || id === null) return undefined;

      const heading = document.getElementById(id);
      return heading?.matches(SECTION_HEADING) && article.contains(heading) ? heading.parentElement : null;
    };

    const show = () => {
      const active = previewed ?? pinned;
      if (active === shown) return;

      shown?.removeAttribute('data-focus');
      active?.setAttribute('data-focus', '');
      article.toggleAttribute('data-focusing', active !== null);
      shown = active;
    };

    const onPointerOver = (event: PointerEvent) => {
      if (event.pointerType !== 'mouse') return;

      previewed = sectionOf(event.target);
      show();
    };

    const onPointerLeave = () => {
      previewed = null;
      show();
    };

    /** 글자를 드래그해 선택한 동작도 click으로 끝나지만, 고정한 섹션을 복사하려는 것이므로 풀지 않는다. */
    const onClick = (event: MouseEvent) => {
      if (window.getSelection()?.isCollapsed === false) return;

      const requested = requestedSection(event.target);
      if (requested !== undefined) {
        pinned = requested;
        show();
        return;
      }

      const section = sectionOf(event.target);
      pinned = section === pinned ? null : section;
      show();
    };

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;

      pinned = null;
      show();
    };

    article.addEventListener('pointerover', onPointerOver);
    article.addEventListener('pointerleave', onPointerLeave);
    document.addEventListener('click', onClick);
    document.addEventListener('keydown', onKeyDown);

    return () => {
      article.removeEventListener('pointerover', onPointerOver);
      article.removeEventListener('pointerleave', onPointerLeave);
      document.removeEventListener('click', onClick);
      document.removeEventListener('keydown', onKeyDown);
      shown?.removeAttribute('data-focus');
      article.removeAttribute('data-focusing');
    };
  }, [root, body]);
}
