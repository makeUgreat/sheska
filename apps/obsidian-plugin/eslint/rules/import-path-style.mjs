// @ts-check
import path from 'node:path';

const RELATIVE_IMPORT_PATTERN = /^\.{1,2}(?:\/|$)/;

function toPosixPath(value) {
  return value.split(path.sep).join('/');
}

function toAbsolutePath(value) {
  return path.isAbsolute(value) ? value : path.join(process.cwd(), value);
}

function toProjectPath(value) {
  return toPosixPath(path.relative(process.cwd(), toAbsolutePath(value)));
}

/**
 * Returns the expected @/ alias if the import should use one, otherwise null.
 * Rule: any relative import between files within src/ must use the @/ alias.
 */
function getExpectedAlias(sourcePath, targetPath) {
  if (!sourcePath.startsWith('src/')) return null;
  if (!targetPath.startsWith('src/')) return null;

  return targetPath.replace(/^src\//, '@/');
}

function checkImportPathStyle(context, node) {
  const importPath = node.source?.value;

  if (
    typeof importPath !== 'string' ||
    !RELATIVE_IMPORT_PATTERN.test(importPath)
  ) {
    return;
  }

  const sourcePath = toProjectPath(context.filename ?? context.getFilename());
  const targetPath = toProjectPath(
    path.resolve(path.dirname(toAbsolutePath(sourcePath)), importPath),
  );
  const expectedAlias = getExpectedAlias(sourcePath, targetPath);

  if (!expectedAlias) return;

  context.report({
    node: node.source,
    messageId: 'useAlias',
    data: { expectedAlias },
  });
}

export default {
  meta: {
    type: 'suggestion',
    docs: {
      description:
        'Require the @/ path alias for all imports between files within src/.',
    },
    messages: {
      useAlias: 'Use the path alias "{{ expectedAlias }}" instead of a relative import.',
    },
    schema: [],
  },
  create(context) {
    return {
      ImportDeclaration(node) {
        checkImportPathStyle(context, node);
      },
      ExportAllDeclaration(node) {
        checkImportPathStyle(context, node);
      },
      ExportNamedDeclaration(node) {
        checkImportPathStyle(context, node);
      },
    };
  },
};