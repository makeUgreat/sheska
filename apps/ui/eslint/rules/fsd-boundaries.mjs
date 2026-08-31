// @ts-check
import path from 'node:path';

const RELATIVE_IMPORT_PATTERN = /^\.{1,2}(?:\/|$)/;
const SOURCE_LAYERS = new Map([
  ['shared', 1],
  ['entities', 2],
  ['features', 3],
  ['widgets', 4],
  ['pages', 5],
  ['app', 6],
]);
const DIRECTORY_LAYER_NAMES = new Map([
  ['01_app', 'app'],
  ['02_pages', 'pages'],
  ['03_widgets', 'widgets'],
  ['04_features', 'features'],
  ['05_entities', 'entities'],
  ['06_shared', 'shared'],
]);
const SLICED_LAYERS = new Set(['entities', 'features', 'widgets', 'pages']);
const SEGMENTED_LAYERS = new Set(['app', 'shared']);
const SHARED_SEGMENTS = new Set(['api', 'config', 'lib', 'ui']);
const APP_SEGMENTS = new Set(['providers', 'router', 'shell']);

function toPosixPath(value) {
  return value.split(path.sep).join('/');
}

function toAbsolutePath(value) {
  return path.isAbsolute(value) ? value : path.join(process.cwd(), value);
}

function toProjectPath(value) {
  return toPosixPath(path.relative(process.cwd(), toAbsolutePath(value)));
}

function startsWithPath(value, prefix) {
  return value === prefix || value.startsWith(`${prefix}/`);
}

function parseSourcePath(projectPath) {
  const parts = projectPath.split('/');
  const srcIndex = parts.indexOf('src');

  if (srcIndex === -1) return null;

  const directoryLayer = parts[srcIndex + 1];
  const layer = DIRECTORY_LAYER_NAMES.get(directoryLayer) ?? directoryLayer;
  if (!SOURCE_LAYERS.has(layer)) return null;

  if (SLICED_LAYERS.has(layer)) {
    const slice = parts[srcIndex + 2];
    if (!slice) return null;

    return { layer, slice, segment: parts[srcIndex + 3] ?? null };
  }

  return { layer, slice: null, segment: parts[srcIndex + 2] ?? null };
}

function parseAlias(importPath) {
  if (!importPath.startsWith('@/')) return null;

  return parseSourcePath(importPath.replace('@/', 'src/'));
}

function parseRelativeImport(sourcePath, importPath) {
  if (!RELATIVE_IMPORT_PATTERN.test(importPath)) return null;

  const targetPath = toProjectPath(
    path.resolve(path.dirname(toAbsolutePath(sourcePath)), importPath),
  );

  return parseSourcePath(targetPath);
}

function isPublicAlias(importPath, target) {
  if (!importPath.startsWith('@/')) return false;

  if (SLICED_LAYERS.has(target.layer)) {
    return importPath === `@/${target.layer}/${target.slice}`;
  }

  if (target.layer === 'shared') {
    return target.segment
      ? importPath === `@/shared/${target.segment}` &&
          SHARED_SEGMENTS.has(target.segment)
      : importPath === '@/shared';
  }

  if (target.layer === 'app') {
    return target.segment
      ? importPath === `@/app/${target.segment}` &&
          APP_SEGMENTS.has(target.segment)
      : false;
  }

  return importPath === `@/${target.layer}`;
}

function isSameSlice(source, target) {
  return (
    source.layer === target.layer &&
    source.slice !== null &&
    source.slice === target.slice
  );
}

function isSameSegmentedLayerSegment(source, target) {
  return (
    source.layer === target.layer &&
    SEGMENTED_LAYERS.has(source.layer) &&
    source.segment !== null &&
    source.segment === target.segment
  );
}

function checkImport(context, node) {
  const importPath = node.source?.value;

  if (typeof importPath !== 'string') return;

  const sourcePath = toProjectPath(context.filename ?? context.getFilename());
  if (!startsWithPath(sourcePath, 'src')) return;

  const source = parseSourcePath(sourcePath);
  const target =
    parseAlias(importPath) ?? parseRelativeImport(sourcePath, importPath);

  if (!source || !target) return;

  const sourceRank = SOURCE_LAYERS.get(source.layer);
  const targetRank = SOURCE_LAYERS.get(target.layer);

  if (sourceRank !== undefined && targetRank !== undefined) {
    if (targetRank > sourceRank) {
      context.report({
        node: node.source,
        messageId: 'layerDirection',
        data: {
          sourceLayer: source.layer,
          targetLayer: target.layer,
        },
      });
      return;
    }
  }

  if (
    source.layer === target.layer &&
    SLICED_LAYERS.has(source.layer) &&
    source.slice !== target.slice
  ) {
    context.report({
      node: node.source,
      messageId: 'sameLayerSlice',
      data: {
        layer: source.layer,
      },
    });
    return;
  }

  if (isSameSlice(source, target)) return;

  if (isSameSegmentedLayerSegment(source, target)) return;

  if (target.layer === 'app' && target.segment === null) {
    context.report({
      node: node.source,
      messageId: 'appSegment',
    });
    return;
  }

  if (!isPublicAlias(importPath, target)) {
    context.report({
      node: node.source,
      messageId: 'publicApi',
      data: {
        publicPath: target.slice
          ? `@/${target.layer}/${target.slice}`
          : target.segment
            ? `@/${target.layer}/${target.segment}`
            : `@/${target.layer}`,
      },
    });
  }
}

export default {
  meta: {
    type: 'problem',
    docs: {
      description:
        'Enforce strict Feature-Sliced Design imports in production UI source.',
    },
    messages: {
      appSegment:
        'App layer imports must target a segment public API such as "@/app/shell".',
      layerDirection:
        '{{ sourceLayer }} code must not import the upper {{ targetLayer }} layer.',
      publicApi:
        'Cross-slice imports must use the public API "{{ publicPath }}".',
      sameLayerSlice:
        '{{ layer }} slices must not import each other directly; move shared code to a lower layer.',
    },
    schema: [],
  },
  create(context) {
    return {
      ExportAllDeclaration(node) {
        checkImport(context, node);
      },
      ExportNamedDeclaration(node) {
        checkImport(context, node);
      },
      ImportDeclaration(node) {
        checkImport(context, node);
      },
    };
  },
};
