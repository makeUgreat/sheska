import bash from 'highlight.js/lib/languages/bash';
import css from 'highlight.js/lib/languages/css';
import diff from 'highlight.js/lib/languages/diff';
import javascript from 'highlight.js/lib/languages/javascript';
import json from 'highlight.js/lib/languages/json';
import markdown from 'highlight.js/lib/languages/markdown';
import python from 'highlight.js/lib/languages/python';
import sql from 'highlight.js/lib/languages/sql';
import typescript from 'highlight.js/lib/languages/typescript';
import xml from 'highlight.js/lib/languages/xml';
import yaml from 'highlight.js/lib/languages/yaml';
import { type Options } from 'react-markdown';
import rehypeHighlight from 'rehype-highlight';

export type RehypePlugins = NonNullable<Options['rehypePlugins']>;

/**
 * Highlighter의 기본 language set은 쓰지 않는 문법까지 전부 번들에 넣는다.
 * 등록하지 않은 언어와 언어를 적지 않은 fence는 추측하지 않고 원문 그대로 둔다.
 */
const LANGUAGES = {
  bash,
  css,
  diff,
  javascript,
  json,
  markdown,
  python,
  sql,
  typescript,
  xml,
  yaml,
};

/** 이 module은 gzip 기준 70KB에 가깝다. Entry bundle에서 떼어내 필요할 때만 받는다. */
export const highlightPlugin: RehypePlugins[number] = [
  rehypeHighlight,
  { languages: LANGUAGES },
];
