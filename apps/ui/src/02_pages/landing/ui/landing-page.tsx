import { LandingHero } from '@/widgets/landing-hero';

export function LandingPage() {
  return (
    <main>
      <LandingHero articlesHref="/posts" aboutHref="/about" githubHref="https://github.com/makeUgreat" />
    </main>
  );
}
