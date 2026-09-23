#!/usr/bin/env node
// enne-pik — PostModelSwitch hook.
//
// When the session model is switched away from the expected planner model,
// print a short notice so sjeng can mention it once.
//
// Expected planner model: env ENNE_PIK_PLANNER_MODEL (set in the shell or in
// Claude Code settings `env`), default 'claude-fable-5-1'. A trailing '[1m]'
// is ignored on both sides.
//
// Silent when:
//   - from_model === to_model, or to_model is missing
//   - the persona is off or no flag exists
//   - ENNE_PIK_PLANNER_MODEL is 'inherit', 'off', 'none' or set but empty
//     (sjeng follows /model on purpose; the notice is disabled)
//   - to_model matches the planner model (family aliases fable/opus/sonnet/haiku
//     match any id containing that family name)
// Silent-fails, never exits non-zero.

let cfg;
try { cfg = require('./enne-pik-config'); } catch (e) { process.exit(0); }
const { readFlag, readStdin, safeOut } = cfg;

const FAMILY_ALIASES = ['fable', 'opus', 'sonnet', 'haiku'];
const DEFAULT_PLANNER = 'claude-fable-5-1';
const DISABLED_VALUES = ['', 'inherit', 'off', 'none'];

// Expected planner model: unset -> default; set (even to '') -> its value.
function wantedPlanner() {
  const raw = process.env.ENNE_PIK_PLANNER_MODEL;
  return norm(raw === undefined ? DEFAULT_PLANNER : raw);
}

function norm(s) {
  return String(s == null ? '' : s).trim().toLowerCase().replace(/\[1m\]$/, '');
}

// Printable, bounded version of an externally supplied model id.
function display(s) {
  return String(s == null ? '' : s).replace(/[\u0000-\u001f\u007f]/g, '').trim().slice(0, 100);
}

function modelMatches(a, b) {
  if (!a || !b) return false;
  if (a === b) return true;
  if (FAMILY_ALIASES.includes(a) && b.includes(a)) return true;
  if (FAMILY_ALIASES.includes(b) && a.includes(b)) return true;
  return false;
}

async function main() {
  const data = await readStdin();
  const from = norm(data.from_model);
  const to = norm(data.to_model);
  if (!to || from === to) return;

  const level = readFlag();
  if (!level || level === 'off') return;

  const wanted = wantedPlanner();
  if (DISABLED_VALUES.includes(wanted)) return;
  if (modelMatches(to, wanted)) return;

  safeOut(
    'Let op: model gewisseld ' + (display(data.from_model) || 'onbekend') + ' → ' + display(data.to_model) +
    '; sjeng is ingesteld op ' + display(wanted) + '. ' +
    'Delegatie aan enne-pik:sjaffer blijft werken. Meld dit één keer kort in dialect.'
  );
}

main().catch(() => { /* silent fail */ });
