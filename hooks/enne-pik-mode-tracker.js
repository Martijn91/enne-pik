#!/usr/bin/env node
// enne-pik — UserPromptSubmit hook.
//
// Tracks the active level from the user's prompt and injects a per-turn
// reminder while the persona is active:
//   - Slash command: /enne-pik [lite|vol|plat|uit|off|stop|aan|on]
//     (also /enne-pik:enne-pik; the lookahead excludes /enne-pik-help).
//     Unknown arguments change nothing.
//   - Otherwise Dutch natural-language on/off phrases. A phrase only counts
//     when it is anchored (match index <= 3) or the prompt is loose (no '?'
//     and at most 80 characters), so "wat is normaal doen?" is not a switch.
//
// Output: JSON hookSpecificOutput.additionalContext. Prints nothing when the
// persona is off and nothing changed. Silent-fails, never exits non-zero.

let cfg;
try { cfg = require('./enne-pik-config'); } catch (e) { process.exit(0); }
const {
  getDefaultLevel,
  getOnLevel,
  resolveArg,
  safeWriteFlag,
  readFlag,
  readStdin,
  safeOut,
  levelRow,
} = cfg;

const CMD_RE = /^\s*\/enne-pik(?::enne-pik)?(?=\s|$)\s*([a-z]*)/i;

const NL_OFF = new RegExp(
  '\\b(?:' + [
    'normaal\\s+doen',
    'doe\\s+(?:effe|even)\\s+normaal',
    'praat\\s+normaal',
    'gewoon\\s+nederlands',
    'stop\\s+(?:met\\s+)?(?:enne(?:\\s+pik)?|dialect|plat|heerlens|kerkraads)',
    'enne(?:\\s+pik)?\\s+(?:uit|stop|af)',
    'geen\\s+dialect(?:\\s+meer)?',
  ].join('|') + ')\\b',
  'i'
);

const NL_ON = new RegExp(
  '\\b(?:' + [
    'enne(?:\\s+pik)?\\s+(?:aan|terug)',
    '(?:praat|kal|doe)\\s+(?:weer\\s+)?(?:plat|heerlens|kerkraads|limburgs|enne(?:\\s+pik)?)',
    '(?:zet|doe)\\s+(?:enne(?:\\s+pik)?|dialect)\\s+(?:weer\\s+)?aan',
  ].join('|') + ')\\b',
  'i'
);

const ANCHOR_MAX_INDEX = 3;
const LOOSE_MAX_LENGTH = 80;

// Returns the match index when `re` matches in a way that counts, else -1.
function countedMatch(re, prompt) {
  const m = re.exec(prompt);
  if (!m) return -1;
  const anchored = m.index <= ANCHOR_MAX_INDEX;
  const loose = !prompt.includes('?') && prompt.length <= LOOSE_MAX_LENGTH;
  return anchored || loose ? m.index : -1;
}

// Returns 'off', 'on', or null when the prompt contains no counted phrase.
// If both an off and an on phrase count, the earliest one wins (off on ties).
function detectNaturalLanguage(prompt) {
  const off = countedMatch(NL_OFF, prompt);
  const on = countedMatch(NL_ON, prompt);
  if (off < 0 && on < 0) return null;
  if (on < 0) return 'off';
  if (off < 0) return 'on';
  return off <= on ? 'off' : 'on';
}

async function main() {
  const data = await readStdin();
  const prompt = typeof data.prompt === 'string' ? data.prompt.trim() : '';

  const stored = readFlag();
  const prev = stored || getDefaultLevel();

  let action = null;
  const cmd = CMD_RE.exec(prompt);
  if (cmd) {
    action = resolveArg(cmd[1]); // null for unknown arguments
  } else if (prompt) {
    action = detectNaturalLanguage(prompt);
  }

  let next = prev;
  if (action === 'on') {
    next = prev === 'off' ? getOnLevel() : prev;
  } else if (action) {
    next = action;
  }

  const changed = next !== prev;
  // Persist on change; also persist an explicit choice when no flag exists yet.
  if (changed || (action && !stored)) safeWriteFlag(next);

  let context = '';
  if (next === 'off') {
    if (!changed) return;
    context =
      'ENNE-PIK UIT. Antwoord vanaf nu in gewoon Nederlands, zonder dialect, tussenwerpsels of dialect-aanspreekvormen. ' +
      'Bevestig in één korte normale zin. Weer aan: `/enne-pik` of "enne aan".';
  } else {
    const lines = [];
    if (changed) {
      lines.push('ENNE-PIK niveau → ' + next + '. Bevestig in één regel in dit niveau.');
      const row = levelRow(next);
      if (row) lines.push(row);
    }
    lines.push(
      'ENNE-PIK ACTIEF (' + next + '). Antwoord in Heerlens/Kerkraads straattaal. ' +
      "Code/commits/PR's/security: normaal. " +
      'Delegaties aan sjaffer beginnen met `[enne-pik: ' + next + ']`.'
    );
    context = lines.join('\n');
  }

  safeOut(JSON.stringify({
    hookSpecificOutput: {
      hookEventName: 'UserPromptSubmit',
      additionalContext: context,
    },
  }));
}

main().catch(() => { /* silent fail */ });
