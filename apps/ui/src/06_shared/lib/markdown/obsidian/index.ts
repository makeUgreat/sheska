import remarkGfm from 'remark-gfm';
import { type PluggableList } from 'unified';
import { remarkBlockAnchor } from './remark-block-anchor';
import { remarkWikiLink } from './remark-wiki-link';

/**
 * Vault 본문은 GFM 위에 Obsidian 확장을 얹은 문법이다.
 * `~` 하나는 취소선이 아니다. 켜 두면 `1~2장 그리고 3~4장`의 `~2장 그리고 3~`가 지워진 글자로 보인다.
 * Wiki link는 같은 본문 block 참조를 판정하려고 block anchor가 모두 정해진 뒤에 돈다.
 */
export const OBSIDIAN_SYNTAX: PluggableList = [
  [remarkGfm, { singleTilde: false }],
  remarkBlockAnchor,
  remarkWikiLink,
];

export { blockAnchorId } from './remark-block-anchor';
export { WIKI_LINK_ELEMENT } from './remark-wiki-link';
