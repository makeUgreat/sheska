import 'katex/dist/katex.min.css';
import rehypeKatex from 'rehype-katex';
import { type RehypePlugins } from './markdown-highlight';

/** KaTeX는 gzip 기준 JS 75KB에 CSS와 font가 더 붙는다. Entry bundle에서 떼어내 수식이 있는 글에서만 받는다. */
export const mathPlugin: RehypePlugins[number] = [rehypeKatex, { throwOnError: false }];
