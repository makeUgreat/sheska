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

function startsWithPath(value, prefix) {
  return value === prefix || value.startsWith(`${prefix}/`);
}

function getExpectedAlias(sourcePath, targetPath) {
  if (startsWithPath(targetPath, 'src/core')) {
    if (startsWithPath(sourcePath, 'src/core')) {
      return null;
    }

    return targetPath.replace(/^src\/core/, '@core');
  }

  const kernelMatch = targetPath.match(/^src\/kernels\/([^/]+)(?:\/.*)?$/);

  if (kernelMatch) {
    const sourceKernelPrefix = `src/kernels/${kernelMatch[1]}`;

    if (startsWithPath(sourcePath, sourceKernelPrefix)) {
      return null;
    }

    return targetPath.replace(/^src\/kernels/, '@kernels');
  }

  const domainMatch = targetPath.match(
    /^src\/contexts\/([^/]+)\/domain(?:\/.*)?$/,
  );

  if (domainMatch) {
    const domainPrefix = `src/contexts/${domainMatch[1]}/domain`;

    if (startsWithPath(sourcePath, domainPrefix)) {
      return null;
    }

    return `@contexts/${domainMatch[1]}/domain`;
  }

  const portsMatch = targetPath.match(
    /^src\/contexts\/([^/]+)\/application\/ports(?:\/.*)?$/,
  );

  if (portsMatch) {
    const portsPrefix = `src/contexts/${portsMatch[1]}/application/ports`;

    if (startsWithPath(sourcePath, portsPrefix)) {
      return null;
    }

    return `@contexts/${portsMatch[1]}/application/ports`;
  }

  const contextLayerMatch = targetPath.match(
    /^src\/contexts\/([^/]+)\/(application|infrastructure|presentation)(?:\/.*)?$/,
  );

  if (contextLayerMatch) {
    const sourceLayerPrefix = `src/contexts/${contextLayerMatch[1]}/${contextLayerMatch[2]}`;

    if (startsWithPath(sourcePath, sourceLayerPrefix)) {
      return null;
    }

    return targetPath.replace(/^src\/contexts/, '@contexts');
  }

  if (startsWithPath(targetPath, 'src/platform')) {
    if (startsWithPath(sourcePath, 'src/platform')) {
      return null;
    }

    return targetPath.replace(/^src\/platform/, '@platform');
  }

  return null;
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

  if (!startsWithPath(sourcePath, 'src')) {
    return;
  }

  const targetPath = toProjectPath(
    path.resolve(path.dirname(toAbsolutePath(sourcePath)), importPath),
  );
  const expectedAlias = getExpectedAlias(sourcePath, targetPath);

  if (!expectedAlias) {
    return;
  }

  context.report({
    node: node.source,
    messageId: 'useAlias',
    data: {
      expectedAlias,
    },
  });
}

export default {
  meta: {
    type: 'suggestion',
    docs: {
      description:
        'Require tsconfig path aliases when production imports cross source boundaries.',
    },
    messages: {
      useAlias:
        'Use the public path alias "{{ expectedAlias }}" for this cross-boundary import.',
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
