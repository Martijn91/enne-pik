#!/usr/bin/env node
// enne-pik — shared configuration, flag I/O and SKILL.md reader/filter.
//
// Everything here is best-effort and silent-fail: hooks must never break a
// Claude Code session, so every function returns a safe fallback on error.
//
// Default level resolution:
//   1. ENNE_PIK_DEFAULT_LEVEL environment variable
//   2. EVAL_ENNE_PIK_DEFAULT_LEVEL environment variable (eval seam)
//   3. 'vol'
//
// The active level lives in a flag file: $CLAUDE_CONFIG_DIR/.enne-pik-level
// (falls back to ~/.claude/.enne-pik-level).

const fs = require('fs');
const path = require('path');
const os = require('os');

const VALID_LEVELS = ['off', 'lite', 'vol', 'plat'];

// Slash-command argument aliases. 'on' is resolved by the caller:
// prev === 'off' ? default : prev. Null-prototype object so that prompts like
// "/enne-pik constructor" never resolve to an inherited property.
const ARG_ALIASES = Object.freeze(Object.assign(Object.create(null), {
  lite: 'lite',
  vol: 'vol',
  plat: 'plat',
  uit: 'off',
  off: 'off',
  stop: 'off',
  aan: 'on',
  on: 'on',
  '': 'on',
}));

// Maps a slash-command argument to a level, 'on', or null (unknown argument).
function resolveArg(arg) {
  const key = String(arg == null ? '' : arg).trim().toLowerCase();
  return Object.prototype.hasOwnProperty.call(ARG_ALIASES, key) ? ARG_ALIASES[key] : null;
}

function normalizeLevel(value) {
  if (typeof value !== 'string') return null;
  const v = value.trim().toLowerCase();
  return VALID_LEVELS.includes(v) ? v : null;
}

function getDefaultLevel() {
  try {
    return normalizeLevel(process.env.ENNE_PIK_DEFAULT_LEVEL)
      || normalizeLevel(process.env.EVAL_ENNE_PIK_DEFAULT_LEVEL)
      || 'vol';
  } catch (e) {
    return 'vol';
  }
}

// Level used when the persona is switched back "on". Never resolves to 'off',
// even when the configured default level is 'off'.
function getOnLevel() {
  const d = getDefaultLevel();
  return d === 'off' ? 'vol' : d;
}

function claudeDir() {
  return process.env.CLAUDE_CONFIG_DIR || path.join(os.homedir(), '.claude');
}

function flagPath() {
  return path.join(claudeDir(), '.enne-pik-level');
}

function pluginRoot() {
  return process.env.CLAUDE_PLUGIN_ROOT || path.resolve(__dirname, '..');
}

// Symlink-safe flag file write (adapted from caveman-config.js).
// Refuses symlinks at the target file and at the immediate parent directory,
// uses O_NOFOLLOW where available, writes atomically via temp + rename with
// 0600 permissions. Protects against local attackers replacing the predictable
// flag path with a symlink to clobber other files.
//
// Does NOT walk the full ancestor chain: many legitimate setups route through
// symlinked home dirs, so a full walk produces false positives. The attack
// surface requires write access to the immediate parent, which is what we check.
//
// Call forms: safeWriteFlag(level)             -> writes to flagPath()
//             safeWriteFlag(targetPath, level) -> writes to targetPath
// Only whitelisted levels are ever written. Silent-fails on any error.
function safeWriteFlag(a, b) {
  let tempPath;
  try {
    const target = b === undefined ? flagPath() : a;
    const content = normalizeLevel(b === undefined ? a : b);
    if (!target || !content) return;

    const flagDir = path.dirname(target);
    fs.mkdirSync(flagDir, { recursive: true });

    // Refuse if the parent directory itself is a symlink (attacker redirect).
    try {
      if (fs.lstatSync(flagDir).isSymbolicLink()) return;
    } catch (e) {
      return;
    }

    // Refuse if the target already exists as a symlink.
    try {
      if (fs.lstatSync(target).isSymbolicLink()) return;
    } catch (e) {
      if (e.code !== 'ENOENT') return;
    }

    tempPath = path.join(flagDir, `.enne-pik-level.${process.pid}.${Date.now()}`);
    const O_NOFOLLOW = typeof fs.constants.O_NOFOLLOW === 'number' ? fs.constants.O_NOFOLLOW : 0;
    const flags = fs.constants.O_WRONLY | fs.constants.O_CREAT | fs.constants.O_EXCL | O_NOFOLLOW;
    let fd;
    try {
      fd = fs.openSync(tempPath, flags, 0o600);
      fs.writeSync(fd, String(content));
      try { fs.fchmodSync(fd, 0o600); } catch (e) { /* best-effort on Windows */ }
    } finally {
      if (fd !== undefined) fs.closeSync(fd);
    }
    fs.renameSync(tempPath, target);
    tempPath = undefined;
  } catch (e) {
    // Silent fail: the flag is best-effort. Clean up a stray temp file.
    if (tempPath) {
      try { fs.unlinkSync(tempPath); } catch (e2) { /* ignore */ }
    }
  }
}

// Symlink-safe, size-capped, whitelist-validated flag file read (adapted from
// caveman-config.js). Refuses symlinks at the target, caps the read, and
// rejects anything that isn't a known level. Returns null on any anomaly, so
// untrusted bytes are never injected into model context.
//
// MAX_FLAG_BYTES is a hard cap. The longest legitimate value is 4 bytes;
// 64 leaves slack for whitespace without enabling exfil.
const MAX_FLAG_BYTES = 64;

// readFlag() reads flagPath(); readFlag(targetPath) reads targetPath.
function readFlag(target) {
  try {
    const p = target || flagPath();
    let st;
    try {
      st = fs.lstatSync(p);
    } catch (e) {
      return null;
    }
    if (st.isSymbolicLink() || !st.isFile()) return null;
    if (st.size > MAX_FLAG_BYTES) return null;

    const O_NOFOLLOW = typeof fs.constants.O_NOFOLLOW === 'number' ? fs.constants.O_NOFOLLOW : 0;
    const flags = fs.constants.O_RDONLY | O_NOFOLLOW;
    let fd;
    let out;
    try {
      fd = fs.openSync(p, flags);
      const buf = Buffer.alloc(MAX_FLAG_BYTES);
      const n = fs.readSync(fd, buf, 0, MAX_FLAG_BYTES, 0);
      out = buf.slice(0, n).toString('utf8');
    } finally {
      if (fd !== undefined) fs.closeSync(fd);
    }

    return normalizeLevel(out);
  } catch (e) {
    return null;
  }
}

// Reads all of stdin and parses it as a JSON object. Resolves to {} on empty
// input, invalid JSON, a TTY stdin, or when stdin does not close in time.
function readStdin(timeoutMs) {
  return new Promise((resolve) => {
    let settled = false;
    let input = '';
    let timer;
    const finish = () => {
      if (settled) return;
      settled = true;
      if (timer) clearTimeout(timer);
      let data = {};
      try {
        const parsed = JSON.parse(input.replace(/^﻿/, ''));
        if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) data = parsed;
      } catch (e) { /* not JSON: use {} */ }
      try { process.stdin.pause(); } catch (e) { /* ignore */ }
      resolve(data);
    };
    try {
      if (process.stdin.isTTY) {
        finish();
        return;
      }
      timer = setTimeout(finish, typeof timeoutMs === 'number' ? timeoutMs : 3000);
      process.stdin.setEncoding('utf8');
      process.stdin.on('data', (chunk) => {
        input += chunk;
        if (input.length > 1024 * 1024) finish(); // hard cap: 1 MiB
      });
      process.stdin.on('end', finish);
      process.stdin.on('error', finish);
    } catch (e) {
      finish();
    }
  });
}

// Writes to stdout without ever throwing (e.g. EPIPE when the reader is gone).
function safeOut(text) {
  try {
    if (!text) return;
    process.stdout.on('error', () => {});
    process.stdout.write(text);
  } catch (e) {
    // Silent fail
  }
}

// SKILL.md location. ENNE_PIK_TEST_SKILL_PATH is a test seam only, used by
// hooks/test/run-tests.js to run the hooks against a stub SKILL.md.
function skillPath() {
  return process.env.ENNE_PIK_TEST_SKILL_PATH
    || path.join(__dirname, '..', 'skills', 'enne-pik', 'SKILL.md');
}

function readSkill(overridePath) {
  try {
    return fs.readFileSync(overridePath || skillPath(), 'utf8')
      .replace(/^﻿/, '')
      .replace(/\r\n?/g, '\n');
  } catch (e) {
    return '';
  }
}

// Level-table rows: `| **lite** | ... |`. This format is coupled to SKILL.md
// (see CLAUDE.md): only the Niveaus table may have a bold first cell.
// Also tolerates trailing text in the first cell, e.g. `| **vol** (default) |`.
const LEVEL_ROW_RE = /^\|\s*\*\*(\S+?)\*\*[^|]*\|/;
// Example lines: `- lite: ...`, `- vol: ...`, `- plat: ...`.
const EXAMPLE_LINE_RE = /^- (lite|vol|plat):\s/;

// SKILL.md content as the hooks see it: YAML frontmatter stripped and
// <!-- skill-only --> ... <!-- /skill-only --> blocks removed (inclusive).
function hookVisibleSkill(overridePath) {
  const text = readSkill(overridePath);
  if (!text) return '';
  return text
    // Frontmatter: first line `---` up to the next line that is `---`.
    .replace(/^---[ \t]*\n[\s\S]*?\n---[ \t]*(?:\n|$)/, '')
    .replace(/<!--\s*skill-only\s*-->[\s\S]*?<!--\s*\/skill-only\s*-->/g, '');
}

// Returns the SKILL.md body filtered for `level`:
//   - YAML frontmatter stripped
//   - <!-- skill-only --> ... <!-- /skill-only --> blocks removed (inclusive)
//   - level-table rows and example lines of other levels removed
//   - every literal ${CLAUDE_PLUGIN_ROOT} replaced with the plugin root
// `overridePath` reads another file instead of skills/enne-pik/SKILL.md.
// Returns '' when the file is missing or unreadable.
function skillBody(level, overridePath) {
  try {
    const text = hookVisibleSkill(overridePath);
    if (!text) return '';

    const kept = [];
    for (const line of text.split('\n')) {
      const row = line.match(LEVEL_ROW_RE);
      if (row) {
        if (row[1] === level) kept.push(line);
        continue;
      }
      const ex = line.match(EXAMPLE_LINE_RE);
      if (ex) {
        if (ex[1] === level) kept.push(line);
        continue;
      }
      kept.push(line);
    }

    return kept.join('\n')
      .split('${CLAUDE_PLUGIN_ROOT}').join(pluginRoot())
      .replace(/\n{3,}/g, '\n\n')
      .trim();
  } catch (e) {
    return '';
  }
}

// Returns the single `| **<level>** | ... |` row from SKILL.md (outside
// frontmatter and skill-only blocks), or ''.
function levelRow(level, overridePath) {
  try {
    for (const line of hookVisibleSkill(overridePath).split('\n')) {
      const row = line.match(LEVEL_ROW_RE);
      if (row && row[1] === level) return line.trim();
    }
    return '';
  } catch (e) {
    return '';
  }
}

module.exports = {
  VALID_LEVELS,
  ARG_ALIASES,
  MAX_FLAG_BYTES,
  resolveArg,
  normalizeLevel,
  getDefaultLevel,
  getOnLevel,
  claudeDir,
  flagPath,
  pluginRoot,
  safeWriteFlag,
  readFlag,
  readStdin,
  safeOut,
  skillPath,
  skillBody,
  levelRow,
};
