#!/usr/bin/env node

/**
 * TypeScript validation hook (asyncRewake)
 * Runs `tsc --noEmit` after code changes and wakes Claude on type errors.
 *
 * Exit codes:
 *   0 - No errors, Claude stays idle
 *   2 - Type errors found, Claude is woken and shown the output
 *
 * Usage: PostToolUse hook on Write|Edit with asyncRewake: true
 */

const { execSync } = require('child_process');

async function validateTypeScript() {
  // Read hook input from stdin
  let input = '';
  for await (const chunk of process.stdin) {
    input += chunk;
  }

  // Parse hook input (available for future filtering by file path, tool name, etc.)
  const _hookData = JSON.parse(input);

  try {
    execSync('tsc --noEmit', {
      stdio: 'pipe',
      cwd: process.cwd(),
      encoding: 'utf-8',
    });

    // Clean — exit 0, Claude stays idle
    process.exit(0);
  } catch (error) {
    // Type errors found — print output so Claude sees it when woken, then exit 2
    const output = (error.stdout || error.message || '').trimEnd();
    process.stdout.write(output + '\n');
    process.exit(2);
  }
}

validateTypeScript().catch((error) => {
  // Unexpected failure (e.g. tsc not found) — write to stderr and exit 1
  process.stderr.write(`tsc hook error: ${error.message}\n`);
  process.exit(1);
});
