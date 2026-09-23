#!/usr/bin/env node
// enne-pik hook tests. Plain Node, no dependencies.
//
//   node hooks/test/run-tests.js
//
// Runs every hook as a child process with piped stdin JSON against an isolated
// CLAUDE_CONFIG_DIR (never the real ~/.claude) and a stub SKILL.md (via the
// ENNE_PIK_TEST_SKILL_PATH seam). Set ENNE_PIK_TEST_DIR to choose the scratch
// directory; otherwise a fresh temp directory is created.
//
// If skills/enne-pik/SKILL.md exists, a few format checks run against it too.

const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawnSync } = require('child_process');

const HOOKS_DIR = path.resolve(__dirname, '..');
const REPO_ROOT = path.resolve(HOOKS_DIR, '..');
const REAL_SKILL = path.join(REPO_ROOT, 'skills', 'enne-pik', 'SKILL.md');

const BASE_DIR = process.env.ENNE_PIK_TEST_DIR
  ? path.resolve(process.env.ENNE_PIK_TEST_DIR)
  : fs.mkdtempSync(path.join(os.tmpdir(), 'enne-pik-hooktest-'));
const CONFIG_DIR = path.join(BASE_DIR, 'config');
const FLAG_FILE = path.join(CONFIG_DIR, '.enne-pik-level');
const STUB_SKILL = path.join(BASE_DIR, 'SKILL.stub.md');
const STUB_SKILL_DEFAULT_ROW = path.join(BASE_DIR, 'SKILL.stub-default-row.md');
const MISSING_SKILL = path.join(BASE_DIR, 'does-not-exist', 'SKILL.md');
const FAKE_PLUGIN_ROOT = path.join(BASE_DIR, 'fake-plugin-root');

// Safety: never touch the real config dir.
const REAL_CLAUDE_DIR = path.join(os.homedir(), '.claude');
if (path.resolve(CONFIG_DIR).toLowerCase().startsWith(path.resolve(REAL_CLAUDE_DIR).toLowerCase())) {
  console.error('Refusing to run: test config dir is inside the real ~/.claude');
  process.exit(2);
}

fs.rmSync(CONFIG_DIR, { recursive: true, force: true });
fs.mkdirSync(CONFIG_DIR, { recursive: true });

const PLACEHOLDER = '${CLAUDE_PLUGIN_ROOT}';

fs.writeFileSync(STUB_SKILL, [
  '---',
  'name: enne-pik',
  'description: >',
  '  FRONTMATTER-MARKER stub persona for hook tests.',
  'user-invocable: true',
  '---',
  '',
  'Je kalt Heerlens/Kerkraads straattaal. STUB-OPENING',
  '',
  '<!-- skill-only -->',
  '## Aanroep',
  '',
  'SKILL-ONLY-SECRET $ARGUMENTS',
  '| **lite** | ROW-INSIDE-SKILL-ONLY |',
  '<!-- /skill-only -->',
  '',
  '## Regels',
  '',
  '| Nederlands | Dialect | Voorbeeld |',
  '|---|---|---|',
  '| ja | joa | Joa, kump good enne. |',
  '| werken | sjaffe | Ich sjaff hei. |',
  '',
  '## Niveaus',
  '',
  '| Niveau | Wat verandert |',
  '|---|---|',
  '| **lite** | LITE-ROW |',
  '| **vol** | VOL-ROW |',
  '| **plat** | PLAT-ROW |',
  '',
  'Voorbeeld 1:',
  '- lite: LITE-EX-1',
  '- vol: VOL-EX-1',
  '- plat: PLAT-EX-1',
  '- geen niveau: GENERIC-LIST-ITEM',
  '',
  '## Meer woorden',
  '',
  'Lees `' + PLACEHOLDER + '/skills/enne-pik/lexicon.md` alleen als je een woord mist.',
  '',
].join('\r\n')); // CRLF on purpose: the reader must normalise line endings.

fs.writeFileSync(STUB_SKILL_DEFAULT_ROW, [
  '| Niveau | Wat verandert |',
  '|---|---|',
  '| **lite** | LITE-ROW |',
  '| **vol** (default) | VOL-DEFAULT-ROW |',
  '| **plat** | PLAT-ROW |',
  '',
].join('\n'));

// ---------------------------------------------------------------------------
// Harness

const results = { pass: 0, fail: 0, skip: 0 };
const failures = [];

function test(name, fn) {
  try {
    const r = fn();
    if (r === 'skip') {
      results.skip++;
      console.log('  skip  ' + name);
      return;
    }
    results.pass++;
    console.log('  ok    ' + name);
  } catch (e) {
    results.fail++;
    failures.push({ name, e });
    console.log('  FAIL  ' + name + '\n        ' + String(e && e.message || e).split('\n').join('\n        '));
  }
}

function section(title) {
  console.log('\n' + title);
}

function setFlag(value) {
  if (value === null) {
    fs.rmSync(FLAG_FILE, { force: true });
  } else {
    fs.writeFileSync(FLAG_FILE, value);
  }
}

function getFlag() {
  try {
    return fs.readFileSync(FLAG_FILE, 'utf8');
  } catch (e) {
    return null;
  }
}

const SCRUBBED_ENV = [
  'ENNE_PIK_DEFAULT_LEVEL',
  'EVAL_ENNE_PIK_DEFAULT_LEVEL',
  'ENNE_PIK_PLANNER_MODEL',
  'CLAUDE_PLUGIN_ROOT',
  'ENNE_PIK_TEST_SKILL_PATH',
];

function childEnv(extra) {
  const env = Object.assign({}, process.env);
  for (const k of SCRUBBED_ENV) delete env[k];
  env.CLAUDE_CONFIG_DIR = CONFIG_DIR;
  env.ENNE_PIK_TEST_SKILL_PATH = STUB_SKILL;
  for (const [k, v] of Object.entries(extra || {})) {
    if (v === undefined) delete env[k];
    else env[k] = v;
  }
  return env;
}

// Runs a hook script. `input` is an object (JSON-encoded) or a raw string.
function run(script, input, opts) {
  opts = opts || {};
  if (Object.prototype.hasOwnProperty.call(opts, 'flag')) setFlag(opts.flag);
  const res = spawnSync(process.execPath, [path.join(HOOKS_DIR, script)], {
    input: typeof input === 'string' ? input : JSON.stringify(input || {}),
    env: childEnv(opts.env),
    encoding: 'utf8',
    timeout: 10000,
  });
  assert.strictEqual(res.error, undefined, 'spawn error: ' + (res.error && res.error.message));
  assert.strictEqual(res.status, 0, script + ' exited with ' + res.status + '\nstderr: ' + res.stderr);
  assert.strictEqual(res.stderr, '', script + ' wrote to stderr: ' + res.stderr);
  return { stdout: res.stdout, flag: getFlag() };
}

const activate = (input, opts) => run('enne-pik-activate.js', input, opts);
const tracker = (prompt, opts) => run('enne-pik-mode-tracker.js', { prompt }, opts);
const modelWatch = (input, opts) => run('enne-pik-model-watch.js', input, opts);

// Parses tracker output; returns additionalContext ('' when stdout is empty).
function trackerContext(stdout) {
  if (stdout === '') return '';
  const obj = JSON.parse(stdout);
  assert.strictEqual(obj.hookSpecificOutput.hookEventName, 'UserPromptSubmit');
  assert.strictEqual(typeof obj.hookSpecificOutput.additionalContext, 'string');
  return obj.hookSpecificOutput.additionalContext;
}

function reminder(level) {
  return 'ENNE-PIK ACTIEF (' + level + '). Antwoord in Heerlens/Kerkraads straattaal. ' +
    "Code/commits/PR's/security: normaal. " +
    'Delegaties aan sjaffer beginnen met `[enne-pik: ' + level + ']`.';
}

// In-process helpers need the same env isolation as the children.
function withEnv(extra, fn) {
  const saved = {};
  const keys = SCRUBBED_ENV.concat(['CLAUDE_CONFIG_DIR'], Object.keys(extra || {}));
  for (const k of keys) saved[k] = process.env[k];
  try {
    for (const k of SCRUBBED_ENV) delete process.env[k];
    process.env.CLAUDE_CONFIG_DIR = CONFIG_DIR;
    for (const [k, v] of Object.entries(extra || {})) {
      if (v === undefined) delete process.env[k];
      else process.env[k] = v;
    }
    return fn();
  } finally {
    for (const k of keys) {
      if (saved[k] === undefined) delete process.env[k];
      else process.env[k] = saved[k];
    }
  }
}

const cfg = require(path.join(HOOKS_DIR, 'enne-pik-config.js'));

console.log('enne-pik hook tests');
console.log('scratch dir: ' + BASE_DIR);

// ---------------------------------------------------------------------------
section('config');

test('VALID_LEVELS', () => {
  assert.deepStrictEqual(cfg.VALID_LEVELS, ['off', 'lite', 'vol', 'plat']);
});

test('resolveArg aliases and unknown args', () => {
  assert.strictEqual(cfg.resolveArg('lite'), 'lite');
  assert.strictEqual(cfg.resolveArg('VOL'), 'vol');
  assert.strictEqual(cfg.resolveArg('plat'), 'plat');
  assert.strictEqual(cfg.resolveArg('uit'), 'off');
  assert.strictEqual(cfg.resolveArg('off'), 'off');
  assert.strictEqual(cfg.resolveArg('stop'), 'off');
  assert.strictEqual(cfg.resolveArg('aan'), 'on');
  assert.strictEqual(cfg.resolveArg('on'), 'on');
  assert.strictEqual(cfg.resolveArg(''), 'on');
  assert.strictEqual(cfg.resolveArg('ultra'), null);
  assert.strictEqual(cfg.resolveArg('constructor'), null);
  assert.strictEqual(cfg.resolveArg('__proto__'), null);
});

test('getDefaultLevel: env -> eval env -> vol, whitelist-checked', () => {
  withEnv({}, () => assert.strictEqual(cfg.getDefaultLevel(), 'vol'));
  withEnv({ ENNE_PIK_DEFAULT_LEVEL: 'PLAT' }, () => assert.strictEqual(cfg.getDefaultLevel(), 'plat'));
  withEnv({ ENNE_PIK_DEFAULT_LEVEL: 'off' }, () => assert.strictEqual(cfg.getDefaultLevel(), 'off'));
  withEnv({ EVAL_ENNE_PIK_DEFAULT_LEVEL: 'lite' }, () => assert.strictEqual(cfg.getDefaultLevel(), 'lite'));
  withEnv({ ENNE_PIK_DEFAULT_LEVEL: 'plat', EVAL_ENNE_PIK_DEFAULT_LEVEL: 'lite' },
    () => assert.strictEqual(cfg.getDefaultLevel(), 'plat'));
  withEnv({ ENNE_PIK_DEFAULT_LEVEL: 'ultra', EVAL_ENNE_PIK_DEFAULT_LEVEL: 'lite' },
    () => assert.strictEqual(cfg.getDefaultLevel(), 'lite'));
  withEnv({ ENNE_PIK_DEFAULT_LEVEL: 'bogus' }, () => assert.strictEqual(cfg.getDefaultLevel(), 'vol'));
});

test('flagPath respects CLAUDE_CONFIG_DIR', () => {
  withEnv({}, () => assert.strictEqual(cfg.flagPath(), FLAG_FILE));
});

test('safeWriteFlag / readFlag round trip and whitelist', () => {
  withEnv({}, () => {
    setFlag(null);
    assert.strictEqual(cfg.readFlag(), null);
    cfg.safeWriteFlag('plat');
    assert.strictEqual(getFlag(), 'plat');
    assert.strictEqual(cfg.readFlag(), 'plat');
    cfg.safeWriteFlag(FLAG_FILE, 'lite');
    assert.strictEqual(cfg.readFlag(FLAG_FILE), 'lite');
    cfg.safeWriteFlag('not-a-level');
    assert.strictEqual(getFlag(), 'lite', 'invalid level must not be written');
    setFlag('  VOL \n');
    assert.strictEqual(cfg.readFlag(), 'vol');
    setFlag('garbage');
    assert.strictEqual(cfg.readFlag(), null);
    setFlag('x'.repeat(cfg.MAX_FLAG_BYTES + 1));
    assert.strictEqual(cfg.readFlag(), null);
    const leftovers = fs.readdirSync(CONFIG_DIR).filter((f) => f.startsWith('.enne-pik-level.'));
    assert.deepStrictEqual(leftovers, [], 'no temp files left behind');
  });
});

test('skillBody strips frontmatter and skill-only block', () => {
  const body = withEnv({ CLAUDE_PLUGIN_ROOT: FAKE_PLUGIN_ROOT }, () => cfg.skillBody('vol', STUB_SKILL));
  assert.ok(body.startsWith('Je kalt Heerlens/Kerkraads straattaal. STUB-OPENING'), body.slice(0, 80));
  assert.ok(!body.includes('FRONTMATTER-MARKER'));
  assert.ok(!body.includes('user-invocable'));
  assert.ok(!body.includes('SKILL-ONLY-SECRET'));
  assert.ok(!body.includes('ROW-INSIDE-SKILL-ONLY'));
  assert.ok(!body.includes('skill-only'));
  assert.ok(!body.includes('\r'));
});

test('skillBody keeps only the active level row and example line', () => {
  const expect = {
    lite: ['LITE-ROW', 'LITE-EX-1'],
    vol: ['VOL-ROW', 'VOL-EX-1'],
    plat: ['PLAT-ROW', 'PLAT-EX-1'],
  };
  for (const level of Object.keys(expect)) {
    const body = withEnv({}, () => cfg.skillBody(level, STUB_SKILL));
    for (const [other, markers] of Object.entries(expect)) {
      for (const m of markers) {
        assert.strictEqual(body.includes(m), other === level, level + ': marker ' + m);
      }
    }
  }
});

test('skillBody keeps non-bold table rows, headers and other list items', () => {
  const body = withEnv({}, () => cfg.skillBody('plat', STUB_SKILL));
  assert.ok(body.includes('| Nederlands | Dialect | Voorbeeld |'));
  assert.ok(body.includes('| ja | joa | Joa, kump good enne. |'));
  assert.ok(body.includes('| werken | sjaffe | Ich sjaff hei. |'));
  assert.ok(body.includes('| Niveau | Wat verandert |'));
  assert.ok(body.includes('- geen niveau: GENERIC-LIST-ITEM'));
});

test('skillBody replaces ${CLAUDE_PLUGIN_ROOT} with env value', () => {
  const body = withEnv({ CLAUDE_PLUGIN_ROOT: FAKE_PLUGIN_ROOT }, () => cfg.skillBody('vol', STUB_SKILL));
  assert.ok(!body.includes(PLACEHOLDER));
  assert.ok(body.includes('`' + FAKE_PLUGIN_ROOT + '/skills/enne-pik/lexicon.md`'));
});

test('skillBody replaces ${CLAUDE_PLUGIN_ROOT} with repo root when env unset', () => {
  const body = withEnv({}, () => cfg.skillBody('vol', STUB_SKILL));
  assert.ok(!body.includes(PLACEHOLDER));
  assert.ok(body.includes('`' + REPO_ROOT + '/skills/enne-pik/lexicon.md`'));
});

test('skillBody returns empty string for a missing file', () => {
  assert.strictEqual(withEnv({}, () => cfg.skillBody('vol', MISSING_SKILL)), '');
});

test('levelRow returns the single bold row or empty string', () => {
  withEnv({}, () => {
    assert.strictEqual(cfg.levelRow('plat', STUB_SKILL), '| **plat** | PLAT-ROW |');
    assert.strictEqual(cfg.levelRow('lite', STUB_SKILL), '| **lite** | LITE-ROW |');
    assert.strictEqual(cfg.levelRow('off', STUB_SKILL), '');
    assert.strictEqual(cfg.levelRow('vol', MISSING_SKILL), '');
  });
});

test('level rows with trailing text in the first cell are filtered too', () => {
  withEnv({}, () => {
    assert.strictEqual(cfg.levelRow('vol', STUB_SKILL_DEFAULT_ROW), '| **vol** (default) | VOL-DEFAULT-ROW |');
    const lite = cfg.skillBody('lite', STUB_SKILL_DEFAULT_ROW);
    assert.ok(!lite.includes('VOL-DEFAULT-ROW'));
    assert.ok(lite.includes('LITE-ROW'));
  });
});

// ---------------------------------------------------------------------------
section('enne-pik-activate.js (SessionStart)');

test('no flag -> writes default vol, prints header + filtered body', () => {
  const r = activate({ source: 'startup' }, { flag: null });
  assert.strictEqual(r.flag, 'vol');
  assert.ok(r.stdout.startsWith('ENNE-PIK ACTIEF — niveau: vol\n\n'), r.stdout.slice(0, 80));
  assert.ok(r.stdout.includes('STUB-OPENING'));
  assert.ok(r.stdout.includes('| **vol** | VOL-ROW |'));
  assert.ok(!r.stdout.includes('LITE-ROW') && !r.stdout.includes('PLAT-ROW'));
  assert.ok(!r.stdout.includes('SKILL-ONLY-SECRET'));
  assert.ok(!r.stdout.includes('context gecomprimeerd'));
});

test('flag plat -> stays plat, plat body', () => {
  const r = activate({ source: 'resume' }, { flag: 'plat' });
  assert.strictEqual(r.flag, 'plat');
  assert.ok(r.stdout.startsWith('ENNE-PIK ACTIEF — niveau: plat\n\n'));
  assert.ok(r.stdout.includes('PLAT-EX-1') && !r.stdout.includes('VOL-EX-1'));
});

test('existing flag wins over ENNE_PIK_DEFAULT_LEVEL', () => {
  const r = activate({}, { flag: 'plat', env: { ENNE_PIK_DEFAULT_LEVEL: 'lite' } });
  assert.strictEqual(r.flag, 'plat');
  assert.ok(r.stdout.startsWith('ENNE-PIK ACTIEF — niveau: plat'));
});

test('no flag + ENNE_PIK_DEFAULT_LEVEL=lite -> writes lite', () => {
  const r = activate({}, { flag: null, env: { ENNE_PIK_DEFAULT_LEVEL: 'lite' } });
  assert.strictEqual(r.flag, 'lite');
  assert.ok(r.stdout.startsWith('ENNE-PIK ACTIEF — niveau: lite'));
});

test('no flag + EVAL_ENNE_PIK_DEFAULT_LEVEL=plat -> writes plat', () => {
  const r = activate({}, { flag: null, env: { EVAL_ENNE_PIK_DEFAULT_LEVEL: 'plat' } });
  assert.strictEqual(r.flag, 'plat');
});

test('source compact -> header mentions compaction', () => {
  const r = activate({ source: 'compact' }, { flag: 'vol' });
  assert.ok(r.stdout.startsWith(
    'ENNE-PIK ACTIEF — niveau: vol (context gecomprimeerd; persona blijft onverminderd actief)\n\n'
  ), r.stdout.slice(0, 120));
  assert.ok(r.stdout.includes('VOL-ROW'));
});

test('startup_type compact -> header mentions compaction', () => {
  const r = activate({ startup_type: 'compact' }, { flag: 'lite' });
  assert.ok(r.stdout.startsWith(
    'ENNE-PIK ACTIEF — niveau: lite (context gecomprimeerd; persona blijft onverminderd actief)'
  ));
});

test('agent_id -> single subagent line', () => {
  const r = activate({ agent_id: 'x', agent_type: 'enne-pik:sjaffer' }, { flag: 'vol' });
  assert.strictEqual(r.stdout,
    'ENNE-PIK ACTIEF (vol) — je bent subagent: rapporteer in dialect, code/commits normaal.');
});

const ACTIVATE_OFF_LINE =
  'ENNE-PIK UIT. Antwoord in gewoon Nederlands, zonder dialect. Weer aan: `/enne-pik` of "enne aan".';

test('flag off -> exactly the one UIT line, flag stays off', () => {
  const r = activate({ source: 'startup' }, { flag: 'off' });
  assert.strictEqual(r.stdout, ACTIVATE_OFF_LINE);
  assert.strictEqual(r.flag, 'off');
});

test('flag off + source compact -> same single UIT line', () => {
  const r = activate({ source: 'compact' }, { flag: 'off' });
  assert.strictEqual(r.stdout, ACTIVATE_OFF_LINE);
});

test('flag off + agent_id -> empty', () => {
  const r = activate({ agent_id: 'x', agent_type: 'enne-pik:sjaffer' }, { flag: 'off' });
  assert.strictEqual(r.stdout, '');
  assert.strictEqual(r.flag, 'off');
});

test('default off with no flag -> writes off, prints the UIT line', () => {
  const r = activate({}, { flag: null, env: { ENNE_PIK_DEFAULT_LEVEL: 'off' } });
  assert.strictEqual(r.stdout, ACTIVATE_OFF_LINE);
  assert.strictEqual(r.flag, 'off');
});

test('corrupt flag -> treated as missing, default written', () => {
  const r = activate({}, { flag: 'ultra' });
  assert.strictEqual(r.flag, 'vol');
  assert.ok(r.stdout.startsWith('ENNE-PIK ACTIEF — niveau: vol'));
});

test('missing SKILL.md -> hardcoded Dutch fallback ruleset', () => {
  const r = activate({}, { flag: 'plat', env: { ENNE_PIK_TEST_SKILL_PATH: MISSING_SKILL } });
  assert.ok(r.stdout.startsWith('ENNE-PIK ACTIEF — niveau: plat\n\n'));
  assert.ok(r.stdout.includes('ACTIEF ELK ANTWOORD'));
  assert.ok(r.stdout.includes('- plat: Volledig'));
  assert.ok(!r.stdout.includes('- vol:'));
  assert.ok(r.stdout.includes('## Grenzen'));
  assert.ok(r.stdout.includes('normaal doen'));
});

test('invalid / empty stdin -> still works, exit 0', () => {
  let r = activate('this is not json', { flag: 'vol' });
  assert.ok(r.stdout.startsWith('ENNE-PIK ACTIEF — niveau: vol'));
  r = activate('', { flag: 'vol' });
  assert.ok(r.stdout.startsWith('ENNE-PIK ACTIEF — niveau: vol'));
});

// ---------------------------------------------------------------------------
section('enne-pik-mode-tracker.js (UserPromptSubmit)');

test('/enne-pik plat -> flag plat, level change + row + reminder', () => {
  const r = tracker('/enne-pik plat', { flag: 'vol' });
  assert.strictEqual(r.flag, 'plat');
  const ctx = trackerContext(r.stdout);
  assert.strictEqual(ctx, [
    'ENNE-PIK niveau → plat. Bevestig in één regel in dit niveau.',
    '| **plat** | PLAT-ROW |',
    reminder('plat'),
  ].join('\n'));
});

test('/enne-pik:enne-pik uit -> off + UIT message', () => {
  const r = tracker('/enne-pik:enne-pik uit', { flag: 'plat' });
  assert.strictEqual(r.flag, 'off');
  const ctx = trackerContext(r.stdout);
  assert.ok(ctx.startsWith('ENNE-PIK UIT. Antwoord vanaf nu in gewoon Nederlands'), ctx);
  assert.ok(ctx.includes('Bevestig in één korte normale zin.'));
  assert.ok(ctx.includes('Weer aan: `/enne-pik` of "enne aan".'));
  assert.ok(!ctx.includes('ENNE-PIK ACTIEF'));
});

test('/enne-pik when off -> back to default vol', () => {
  const r = tracker('/enne-pik', { flag: 'off' });
  assert.strictEqual(r.flag, 'vol');
  const ctx = trackerContext(r.stdout);
  assert.ok(ctx.startsWith('ENNE-PIK niveau → vol.'));
  assert.ok(ctx.includes('| **vol** | VOL-ROW |'));
  assert.ok(ctx.endsWith(reminder('vol')));
});

test('/enne-pik aan when off honours ENNE_PIK_DEFAULT_LEVEL', () => {
  const r = tracker('/enne-pik aan', { flag: 'off', env: { ENNE_PIK_DEFAULT_LEVEL: 'plat' } });
  assert.strictEqual(r.flag, 'plat');
});

test('/enne-pik when off and default is off -> vol (on never means off)', () => {
  const r = tracker('/enne-pik', { flag: 'off', env: { ENNE_PIK_DEFAULT_LEVEL: 'off' } });
  assert.strictEqual(r.flag, 'vol');
});

test('/enne-pik when already lite -> unchanged lite', () => {
  const r = tracker('/enne-pik', { flag: 'lite' });
  assert.strictEqual(r.flag, 'lite');
  assert.strictEqual(trackerContext(r.stdout), reminder('lite'));
});

test('/ENNE-PIK LITE with a follow-up question -> lite', () => {
  const r = tracker('/ENNE-PIK LITE\n\nWat doet `git rebase --onto`?', { flag: 'vol' });
  assert.strictEqual(r.flag, 'lite');
  assert.ok(trackerContext(r.stdout).startsWith('ENNE-PIK niveau → lite.'));
});

test('/enne-pik-help -> unchanged, no level change text', () => {
  const r = tracker('/enne-pik-help', { flag: 'vol' });
  assert.strictEqual(r.flag, 'vol');
  const ctx = trackerContext(r.stdout);
  assert.strictEqual(ctx, reminder('vol'));
  assert.ok(!ctx.includes('niveau →'));
});

test('/enne-pik <unknown arg> -> unchanged', () => {
  for (const p of ['/enne-pik ultra', '/enne-pik constructor', '/enne-pik platte']) {
    const r = tracker(p, { flag: 'vol' });
    assert.strictEqual(r.flag, 'vol', p);
    assert.strictEqual(trackerContext(r.stdout), reminder('vol'), p);
  }
});

test('"normaal doen" -> off', () => {
  const r = tracker('normaal doen', { flag: 'vol' });
  assert.strictEqual(r.flag, 'off');
  assert.ok(trackerContext(r.stdout).startsWith('ENNE-PIK UIT.'));
});

test('"normaal doen. <question>?" -> off (anchored despite ?)', () => {
  const r = tracker('normaal doen. Wat is het verschil tussen `let` en `const` in JavaScript?', { flag: 'vol' });
  assert.strictEqual(r.flag, 'off');
});

test('"wat is normaal doen?" -> unchanged', () => {
  const r = tracker('wat is normaal doen?', { flag: 'vol' });
  assert.strictEqual(r.flag, 'vol');
  assert.strictEqual(trackerContext(r.stdout), reminder('vol'));
});

test('"Stop met enne pik." -> off', () => {
  const r = tracker('Stop met enne pik.', { flag: 'plat' });
  assert.strictEqual(r.flag, 'off');
});

test('other off phrases -> off', () => {
  for (const p of [
    'stop enne', 'doe effe normaal', 'Doe even normaal pls', 'praat normaal', 'gewoon Nederlands graag',
    'stop met dialect', 'enne uit', 'enne pik af', 'geen dialect meer', 'kun je nu geen dialect gebruiken',
  ]) {
    const r = tracker(p, { flag: 'vol' });
    assert.strictEqual(r.flag, 'off', p);
  }
});

test('"kal plat" when off -> vol', () => {
  const r = tracker('kal plat', { flag: 'off' });
  assert.strictEqual(r.flag, 'vol');
  assert.ok(trackerContext(r.stdout).startsWith('ENNE-PIK niveau → vol.'));
});

test('other on phrases when off -> vol', () => {
  for (const p of ['enne aan', 'Enne pik terug!', 'praat weer heerlens', 'doe weer limburgs', 'zet dialect weer aan', 'zet enne pik aan']) {
    const r = tracker(p, { flag: 'off' });
    assert.strictEqual(r.flag, 'vol', p);
  }
});

test('on phrase while active -> level unchanged', () => {
  const r = tracker('kal plat', { flag: 'lite' });
  assert.strictEqual(r.flag, 'lite');
  assert.strictEqual(trackerContext(r.stdout), reminder('lite'));
});

test('long unrelated prompt with "dialect" mid-sentence -> unchanged', () => {
  const prompts = [
    'Kun je de parser zo aanpassen dat hij geen dialect meer herkent in de invoerbestanden van de gebruiker, en daarna de tests draaien',
    'Refactor de functie detectLanguage zodat het veld dialect optioneel wordt en schrijf er een unit test bij voor de lege invoer',
  ];
  for (const p of prompts) {
    assert.ok(p.length > 80);
    const r = tracker(p, { flag: 'vol' });
    assert.strictEqual(r.flag, 'vol', p);
    assert.strictEqual(trackerContext(r.stdout), reminder('vol'));
  }
});

test('words inside other words do not trigger (e.g. "enne aanpassen")', () => {
  const r = tracker('enne aanpassen', { flag: 'off' });
  assert.strictEqual(r.flag, 'off');
  assert.strictEqual(r.stdout, '');
});

test('active and unchanged -> JSON with only the reminder line', () => {
  const r = tracker('Leg uit wat een mutex is.', { flag: 'plat' });
  assert.strictEqual(r.flag, 'plat');
  assert.strictEqual(trackerContext(r.stdout), reminder('plat'));
});

test('off and unchanged -> empty stdout', () => {
  const r = tracker('Leg uit wat een mutex is.', { flag: 'off' });
  assert.strictEqual(r.flag, 'off');
  assert.strictEqual(r.stdout, '');
});

test('no flag + unrelated prompt -> default reminder, flag not written', () => {
  const r = tracker('Hoi', { flag: null });
  assert.strictEqual(r.flag, null);
  assert.strictEqual(trackerContext(r.stdout), reminder('vol'));
});

test('no flag + /enne-pik vol -> explicit choice persisted', () => {
  const r = tracker('/enne-pik vol', { flag: null });
  assert.strictEqual(r.flag, 'vol');
});

test('missing SKILL.md -> level change without row', () => {
  const r = tracker('/enne-pik plat', { flag: 'vol', env: { ENNE_PIK_TEST_SKILL_PATH: MISSING_SKILL } });
  assert.strictEqual(r.flag, 'plat');
  assert.strictEqual(trackerContext(r.stdout),
    'ENNE-PIK niveau → plat. Bevestig in één regel in dit niveau.\n' + reminder('plat'));
});

test('invalid / empty stdin -> silent-safe, exit 0', () => {
  let r = run('enne-pik-mode-tracker.js', 'not json', { flag: 'vol' });
  assert.strictEqual(trackerContext(r.stdout), reminder('vol'));
  r = run('enne-pik-mode-tracker.js', '', { flag: 'off' });
  assert.strictEqual(r.stdout, '');
  r = run('enne-pik-mode-tracker.js', { prompt: 42 }, { flag: 'vol' });
  assert.strictEqual(r.flag, 'vol');
});

// ---------------------------------------------------------------------------
section('enne-pik-model-watch.js (PostModelSwitch)');

test('from === to -> empty', () => {
  const r = modelWatch({ from_model: 'claude-opus-5-5', to_model: 'claude-opus-5-5' }, { flag: 'vol' });
  assert.strictEqual(r.stdout, '');
});

test('to claude-opus-5-5, flag vol, default planner -> notice', () => {
  const r = modelWatch({ from_model: 'claude-fable-5-1[1m]', to_model: 'claude-opus-5-5' }, { flag: 'vol' });
  assert.strictEqual(r.stdout,
    'Let op: model gewisseld claude-fable-5-1[1m] → claude-opus-5-5; sjeng is ingesteld op claude-fable-5-1. ' +
    'Delegatie aan enne-pik:sjaffer blijft werken. Meld dit één keer kort in dialect.');
});

test('ENNE_PIK_PLANNER_MODEL=inherit -> empty', () => {
  const r = modelWatch({ from_model: 'claude-fable-5-1', to_model: 'claude-opus-5-5' },
    { flag: 'vol', env: { ENNE_PIK_PLANNER_MODEL: 'inherit' } });
  assert.strictEqual(r.stdout, '');
});

test('ENNE_PIK_PLANNER_MODEL=off -> empty', () => {
  const r = modelWatch({ from_model: 'claude-fable-5-1', to_model: 'claude-opus-5-5' },
    { flag: 'vol', env: { ENNE_PIK_PLANNER_MODEL: 'off' } });
  assert.strictEqual(r.stdout, '');
});

test('ENNE_PIK_PLANNER_MODEL=none / blank -> empty', () => {
  for (const v of ['none', 'NONE', '   ']) {
    const r = modelWatch({ from_model: 'claude-fable-5-1', to_model: 'claude-opus-5-5' },
      { flag: 'vol', env: { ENNE_PIK_PLANNER_MODEL: v } });
    assert.strictEqual(r.stdout, '', JSON.stringify(v));
  }
});

test('ENNE_PIK_PLANNER_MODEL set but empty -> empty', () => {
  const r = modelWatch({ from_model: 'claude-fable-5-1', to_model: 'claude-opus-5-5' },
    { flag: 'vol', env: { ENNE_PIK_PLANNER_MODEL: '' } });
  assert.strictEqual(r.stdout, '');
});

test('ENNE_PIK_PLANNER_MODEL=claude-opus-5-5, to fable -> notice names opus', () => {
  const r = modelWatch({ from_model: 'claude-opus-5-5', to_model: 'claude-fable-5-1' },
    { flag: 'vol', env: { ENNE_PIK_PLANNER_MODEL: 'claude-opus-5-5' } });
  assert.ok(r.stdout.startsWith(
    'Let op: model gewisseld claude-opus-5-5 → claude-fable-5-1; sjeng is ingesteld op claude-opus-5-5.'
  ), r.stdout);
});
test('to claude-fable-5-1[1m] -> empty', () => {
  const r = modelWatch({ from_model: 'claude-opus-5-5', to_model: 'claude-fable-5-1[1m]' }, { flag: 'vol' });
  assert.strictEqual(r.stdout, '');
});

test('planner claude-fable-5-1[1m], to claude-fable-5-1 -> empty', () => {
  const r = modelWatch({ from_model: 'claude-opus-5-5', to_model: 'claude-fable-5-1' },
    { flag: 'vol', env: { ENNE_PIK_PLANNER_MODEL: 'claude-fable-5-1[1m]' } });
  assert.strictEqual(r.stdout, '');
});

test('family alias matching (planner opus / to fable alias)', () => {
  let r = modelWatch({ from_model: 'claude-fable-5-1', to_model: 'claude-opus-5-5[1m]' },
    { flag: 'vol', env: { ENNE_PIK_PLANNER_MODEL: 'opus' } });
  assert.strictEqual(r.stdout, '');
  r = modelWatch({ from_model: 'claude-opus-5-5', to_model: 'fable' }, { flag: 'vol' });
  assert.strictEqual(r.stdout, '');
  r = modelWatch({ from_model: 'claude-opus-5-5', to_model: 'claude-sonnet-5' },
    { flag: 'vol', env: { ENNE_PIK_PLANNER_MODEL: 'opus' } });
  assert.ok(r.stdout.startsWith('Let op: model gewisseld claude-opus-5-5 → claude-sonnet-5; sjeng is ingesteld op opus.'));
});

test('flag off or missing -> empty', () => {
  let r = modelWatch({ from_model: 'claude-fable-5-1', to_model: 'claude-opus-5-5' }, { flag: 'off' });
  assert.strictEqual(r.stdout, '');
  r = modelWatch({ from_model: 'claude-fable-5-1', to_model: 'claude-opus-5-5' }, { flag: null });
  assert.strictEqual(r.stdout, '');
  assert.strictEqual(r.flag, null, 'model-watch never writes the flag');
});

test('invalid / empty stdin -> empty, exit 0', () => {
  let r = modelWatch('garbage', { flag: 'vol' });
  assert.strictEqual(r.stdout, '');
  r = modelWatch('', { flag: 'vol' });
  assert.strictEqual(r.stdout, '');
});

// ---------------------------------------------------------------------------
section('skills/enne-pik/SKILL.md format (skipped when absent)');

test('real SKILL.md: one level row per level, no markers or placeholders left', () => {
  if (!fs.existsSync(REAL_SKILL)) return 'skip';
  withEnv({}, () => {
    for (const level of ['lite', 'vol', 'plat']) {
      const body = cfg.skillBody(level, REAL_SKILL);
      assert.ok(body.length > 0, level + ': empty body');
      const rows = body.split('\n').filter((l) => /^\|\s*\*\*(\S+?)\*\*[^|]*\|/.test(l));
      assert.strictEqual(rows.length, 1, level + ': expected exactly one bold level row, got ' + rows.length);
      assert.ok(rows[0].includes('**' + level + '**'), level + ': wrong row ' + rows[0]);
      assert.ok(!/skill-only/.test(body), level + ': skill-only marker left');
      assert.ok(!body.includes(PLACEHOLDER), level + ': placeholder left');
      assert.ok(cfg.levelRow(level, REAL_SKILL), level + ': levelRow empty');
    }
  });
});

// ---------------------------------------------------------------------------
setFlag(null);
if (!process.env.ENNE_PIK_TEST_DIR) {
  try { fs.rmSync(BASE_DIR, { recursive: true, force: true }); } catch (e) { /* ignore */ }
}
const total = results.pass + results.fail;
console.log('\n' + results.pass + '/' + total + ' passed' +
  (results.skip ? ', ' + results.skip + ' skipped' : '') +
  (results.fail ? ', ' + results.fail + ' FAILED' : ''));
process.exitCode = results.fail ? 1 : 0;
