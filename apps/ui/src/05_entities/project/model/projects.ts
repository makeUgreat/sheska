import homeClusterPreview from '../assets/home-cluster.webp';
import nocapPreview from '../assets/nocap.webp';
import sheskaPreview from '../assets/sheska.webp';
import siruPreview from '../assets/siru.webp';
import npmLogo from '../assets/logos/npm.svg';
import serverLogo from '../assets/logos/server.svg';
import sheskaLogo from '../assets/logos/sheska.svg';
import siruLogo from '../assets/logos/siru.svg';

export interface ProjectLink {
  kind: 'site' | 'npm' | 'github';
  href: string;
}

export interface Project {
  slug: string;
  name: string;
  logo: { src: string; alt: string };
  category: string;
  tagline: string;
  description: string;
  preview: string;
  previewStyle: 'window' | 'diagram';
  links: readonly ProjectLink[];
}

export const PROJECTS: readonly Project[] = [
  {
    slug: 'sheska',
    name: 'Sheska',
    logo: { src: sheskaLogo, alt: '' },
    category: 'Blog',
    tagline: 'Obsidian에 쓴 노트를 동기화해 보여 주는, 지금 보고 계신 블로그예요.',
    description: '웹에 보여 주는 데서 그치지 않고 노트를 임베딩해 검색에도 활용해요.',
    preview: sheskaPreview,
    previewStyle: 'diagram',
    links: [
      { kind: 'site', href: 'https://hash.meogle.co.kr' },
      { kind: 'github', href: 'https://github.com/makeUgreat/sheska' },
    ],
  },
  {
    slug: 'siru',
    name: 'Siru',
    logo: { src: siruLogo, alt: '' },
    category: 'ERP',
    tagline: '부모님 회사의 주문·유통·재고관리 업무를 위해 만든 서비스예요.',
    description: '쓰던 상용 제품의 아쉬운 점을 실제 업무 흐름에 맞게 채워 가고 있어요.',
    preview: siruPreview,
    previewStyle: 'window',
    links: [{ kind: 'site', href: 'https://siru-demo.hyunjin.kr' }],
  },
  {
    slug: 'nocap',
    name: 'Nocap',
    logo: { src: npmLogo, alt: 'npm 패키지' },
    category: 'npm',
    tagline: '문서에 적힌 도메인 동작이 테스트로 구현됐는지 추적하는 라이브러리예요.',
    description: 'AI Agent의 토큰 낭비는 줄이고 산출물 품질은 높이려고 만들었어요.',
    preview: nocapPreview,
    previewStyle: 'window',
    links: [
      { kind: 'npm', href: 'https://www.npmjs.com/package/@makehash/nocap' },
      { kind: 'github', href: 'https://github.com/makeUgreat/nocap' },
    ],
  },
  {
    slug: 'home-cluster',
    name: 'Home Cluster',
    logo: { src: serverLogo, alt: '' },
    category: 'Infra',
    tagline: 'N97·N100·N150 미니 PC 3대를 k3s로 묶어 운영하는 홈서버예요.',
    description: 'Sheska와 Siru가 배포되어 있고 새 기술과 인프라를 실험하는 공간이에요.',
    preview: homeClusterPreview,
    previewStyle: 'diagram',
    links: [],
  },
];

export function findProject(slug: string): Project | undefined {
  return PROJECTS.find((project) => project.slug === slug);
}
