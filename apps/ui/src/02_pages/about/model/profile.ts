import homeClusterPreview from '../assets/home-cluster.webp';
import nocapPreview from '../assets/nocap.webp';
import sheskaPreview from '../assets/sheska.webp';
import siruPreview from '../assets/siru.webp';
import npmLogo from '../assets/logos/npm.svg';
import serverLogo from '../assets/logos/server.svg';
import sheskaLogo from '../assets/logos/sheska.svg';
import siruLogo from '../assets/logos/siru.svg';

export interface ServiceLink {
  kind: 'site' | 'npm' | 'github';
  href: string;
}

export interface Service {
  slug: string;
  name: string;
  logo: { src: string; alt: string };
  summary: string;
  preview: string;
  previewStyle: 'window' | 'diagram';
  links: readonly ServiceLink[];
}

export const PROFILE = {
  name: '김진명',
  role: '서비스를 만들고 직접 운영하는 백엔드 개발자',
  bio: '직접 만든 서비스를 집 서버에서 직접 운영합니다.',
} as const;

export const SERVICES: readonly Service[] = [
  {
    slug: 'sheska',
    name: 'Sheska',
    logo: { src: sheskaLogo, alt: '' },
    summary: 'Obsidian vault의 노트를 공개 라이브러리로 바꿉니다. 글마다 AI 요약이 붙습니다.',
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
    summary: '재고관리 ERP 서비스입니다.',
    preview: siruPreview,
    previewStyle: 'window',
    links: [{ kind: 'site', href: 'https://siru-demo.hyunjin.kr' }],
  },
  {
    slug: 'nocap',
    name: 'Nocap',
    logo: { src: npmLogo, alt: 'npm 패키지' },
    summary: '명세 문서와 테스트를 ID로 연결해 아직 검증되지 않은 명세를 찾습니다.',
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
    summary: 'k3s와 ArgoCD로 운영하는 집 서버입니다. Sheska가 여기서 돌아갑니다.',
    preview: homeClusterPreview,
    previewStyle: 'diagram',
    links: [],
  },
];
