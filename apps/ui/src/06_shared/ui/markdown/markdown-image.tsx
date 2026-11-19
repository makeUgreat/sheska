import { useState } from 'react';
import { type Components } from 'react-markdown';
import { useAttachmentBaseUrl } from './attachment-base-url';
import imageUnavailable from './image-unavailable.svg';

const URL_SCHEME = /^[a-z][a-z\d+.-]*:/i;
const OBSIDIAN_SIZE = /^(.*)\|(\d+)(?:x(\d+))?$/;

/** Obsidian은 `![설명|300](a.png)`처럼 alt 끝의 `|폭` 또는 `|폭x높이`로 크기를 정한다. */
function readObsidianSize(alt: string) {
  const match = OBSIDIAN_SIZE.exec(alt);
  if (!match) return { text: alt };

  const [, text, width, height] = match;
  return {
    text: text.trim(),
    width: Number(width),
    height: height ? Number(height) : undefined,
  };
}

/**
 * Scheme이 없는 `src`는 vault 절대 경로다. 첨부 파일 저장소는 object를 `vault/<경로>`에 둔다.
 * Markdown의 `src`는 이미 `%20`처럼 인코딩되어 있어 다시 인코딩하지 않는다.
 */
export const MarkdownImage: Components['img'] = function MarkdownImage({ src, alt, title }) {
  const attachmentBaseUrl = useAttachmentBaseUrl();
  const [failedSrc, setFailedSrc] = useState<string>();
  const { text, width, height } = readObsidianSize(alt ?? '');
  const resolvedSrc = src && !URL_SCHEME.test(src) ? `${attachmentBaseUrl}/vault/${src}` : src;
  const unavailable = !resolvedSrc || failedSrc === resolvedSrc;

  return (
    <img
      src={unavailable ? imageUnavailable : resolvedSrc}
      alt={unavailable ? text || 'Image unavailable' : text}
      title={title}
      width={width}
      height={height}
      loading="lazy"
      decoding="async"
      onError={() => setFailedSrc(resolvedSrc)}
      className="inline-block"
    />
  );
};
