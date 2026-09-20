const docs = {
  structure: 'apps/ui/docs/ko/structure.md',
};

// FSD 레이어는 디렉터리 접두사 번호가 곧 순위다. 상위 번호가 상위 레이어.
const LAYERS = [
  '01_app',
  '02_pages',
  '03_widgets',
  '04_features',
  '05_entities',
  '06_shared',
];

const SLICED_LAYERS = ['02_pages', '03_widgets', '04_features', '05_entities'];

function upwardImportRules() {
  return LAYERS.flatMap((layer, index) => {
    const upperLayers = LAYERS.slice(0, index);
    if (upperLayers.length === 0) return [];

    return [
      {
        name: `ui-${layer}-not-to-upper-layer`,
        severity: 'error',
        comment:
          `FSD dependencies point downward only (app -> pages -> widgets -> features -> entities -> shared). ` +
          `See ${docs.structure}#레이어-모델.`,
        from: {
          path: `^src/${layer}/`,
          pathNot: '\\.(spec|stories)\\.tsx?$',
        },
        to: {
          path: `^src/(${upperLayers.join('|')})/`,
        },
      },
    ];
  });
}

function sliceIsolationRules() {
  return SLICED_LAYERS.map((layer) => ({
    name: `ui-${layer}-slices-stay-isolated`,
    severity: 'error',
    comment:
      'Slices in the same layer must not import each other; move shared code to a lower layer. ' +
      `See ${docs.structure}#슬라이스와-세그먼트.`,
    from: {
      path: `^src/${layer}/([^/]+)/`,
      pathNot: '\\.(spec|stories)\\.tsx?$',
    },
    to: {
      path: `^src/${layer}/(?!$1/)[^/]+/`,
    },
  }));
}

function publicApiRules() {
  return SLICED_LAYERS.map((layer) => ({
    name: `ui-${layer}-only-through-slice-public-api`,
    severity: 'error',
    comment:
      "A slice exposes its public API from its root index.ts; do not import another slice's internals. " +
      `See ${docs.structure}#슬라이스와-세그먼트.`,
    from: {
      path: '^src/',
      pathNot: [`^src/${layer}/([^/]+)/`, '\\.(spec|stories)\\.tsx?$'],
    },
    to: {
      path: `^src/${layer}/[^/]+/.+`,
      pathNot: `^src/${layer}/[^/]+/index\\.tsx?$`,
    },
  }));
}

module.exports = [
  ...upwardImportRules(),
  ...sliceIsolationRules(),
  ...publicApiRules(),
];
