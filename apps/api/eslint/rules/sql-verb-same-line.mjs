// @ts-check

function isSqlTaggedTemplate(node) {
  return (
    node?.type === 'TaggedTemplateExpression' &&
    node.tag.type === 'Identifier' &&
    node.tag.name === 'sql'
  );
}

function isExecuteCall(node) {
  return (
    node.callee.type === 'MemberExpression' &&
    !node.callee.computed &&
    node.callee.property.type === 'Identifier' &&
    node.callee.property.name === 'execute'
  );
}

// Mirrors @opentelemetry/instrumentation-pg's parseNormalizedOperationName:
// trim, then slice up to the first literal space character. A newline is
// not treated as a delimiter, so a verb alone on its own line produces
// "SELECT\n" instead of "SELECT".
function parseNormalizedOperationName(queryText) {
  const trimmed = queryText.trim();
  const indexOfFirstSpace = trimmed.indexOf(' ');
  return indexOfFirstSpace === -1 ? trimmed : trimmed.slice(0, indexOfFirstSpace);
}

function checkExecuteCall(context, node) {
  if (!isExecuteCall(node)) {
    return;
  }

  for (const arg of node.arguments) {
    if (!isSqlTaggedTemplate(arg)) {
      continue;
    }

    const text = arg.quasi.quasis[0]?.value.raw ?? '';
    if (text.trim() === '') {
      continue;
    }

    const operationName = parseNormalizedOperationName(text);
    if (operationName.includes('\n')) {
      context.report({
        node: arg,
        messageId: 'verbNotSameLine',
        data: { operation: JSON.stringify(operationName) },
      });
    }
  }
}

export default {
  meta: {
    type: 'problem',
    docs: {
      description:
        'Require the leading SQL verb in a raw sql`` query passed to .execute() to share its line with the next token, so @opentelemetry/instrumentation-pg does not fragment db.operation.name.',
    },
    messages: {
      verbNotSameLine:
        'Keep the leading SQL verb and the next token on the same line — @opentelemetry/instrumentation-pg parses this query\'s operation name as {{ operation }}, fragmenting the Prometheus db_operation_name/span-name label. See apps/api/docs/en/persistence.md.',
    },
    schema: [],
  },
  create(context) {
    return {
      CallExpression(node) {
        checkExecuteCall(context, node);
      },
    };
  },
};
