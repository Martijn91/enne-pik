#!/usr/bin/env node
// enne-pik — SessionStart hook.
//
// Fires on startup, resume, clear, compact and fork (no matcher in hooks.json):
//   1. Resolves the level from the flag file. Only when the flag is missing is
//      the default level resolved and written, so a chosen level persists
//      across sessions.
//   2. 'off' -> main agent: one explicit "ENNE-PIK UIT" line, because sjeng
//      falls back to 'vol' when no ENNE-PIK context is present at all.
//      Subagent (agent_id present): prints nothing.
//   3. Subagent (agent_id present) -> one short reminder line.
//   4. Otherwise -> header + SKILL.md body filtered to the active level
//      (hardcoded fallback ruleset when SKILL.md is missing).
//
// stdout on exit 0 becomes session context. Silent-fails, never exits non-zero.

let cfg;
try { cfg = require('./enne-pik-config'); } catch (e) { process.exit(0); }
const {
  getDefaultLevel,
  safeWriteFlag,
  readFlag,
  readStdin,
  safeOut,
  skillBody,
} = cfg;

const FALLBACK_LEVELS = {
  lite: 'lite: Standaardnederlands, met enne/auch enne/wa als tag, aanspreek "pik/jong", losse dialectwoorden (sjaffe, kieke, jód, kwatsj). Geen dialectgrammatica.',
  vol: 'vol: Nederlandse zinsbouw met dikke laag plat: ich/doe/veer, joa/nae, neet/nit, dialectwerkwoorden en -bijwoorden, tags op ~1/3 van de zinnen, vloeken bij frustratie.',
  plat: 'plat: Volledig Heëlesj/Kirchröadsj: dialectgrammatica (ich bin, doe bis, vier junt), Kerkraadse klankregels, nüks/tsiet/jód; alleen technische termen en code blijven Nederlands/Engels.',
};

// Minimal ruleset used when skills/enne-pik/SKILL.md cannot be read.
function fallbackRules(level) {
  return [
    'Je kalt Heerlens/Kerkraads straattaal. Inhoud blijft 100% technisch correct; alleen toon en woorden veranderen.',
    '',
    '## Persistentie',
    '',
    'ACTIEF ELK ANTWOORD. Niet terugvallen na lange sessies of compaction; bij twijfel actief. ' +
      'Uit alleen bij "normaal doen", "stop enne" of `/enne-pik uit`. Wisselen: `/enne-pik lite|vol|plat`.',
    '',
    '## Niveau',
    '',
    '- ' + (FALLBACK_LEVELS[level] || FALLBACK_LEVELS.vol),
    '',
    '## Regels',
    '',
    'Tag "enne" op ongeveer één op de drie zinnen, niet elke. "joa"/"nae". Aanspreekvormen "pik", "jong", "kel". ' +
      'Heerlense basis (ich, veer, neet, sjoen) met Kerkraadse kruiden (jód, nit, óch, jek).',
    '',
    '## Grenzen',
    '',
    'Code, comments, identifiers, commit messages, PR-titels en -bodies, bestandsinhoud, CLI-commando\'s en foutmeldingen: normaal. ' +
      'Nooit dialect in code fences. Technische termen exact. ' +
      'Security-waarschuwingen, onomkeerbare acties en meerstaps-instructies in gewoon Nederlands, daarna terug in dialect. ' +
      'Nooit discriminerende scheldwoorden of ziekte-vloeken.',
    '',
    'Uit: "normaal doen", "stop enne" of `/enne-pik uit`. Weer aan: `/enne-pik` of "enne aan".',
  ].join('\n');
}

async function main() {
  const data = await readStdin();

  let level = readFlag();
  if (!level) {
    level = getDefaultLevel();
    safeWriteFlag(level);
  }

  if (level === 'off') {
    if (!data.agent_id) {
      safeOut('ENNE-PIK UIT. Antwoord in gewoon Nederlands, zonder dialect. Weer aan: `/enne-pik` of "enne aan".');
    }
    return;
  }

  if (data.agent_id) {
    safeOut('ENNE-PIK ACTIEF (' + level + ') — je bent subagent: rapporteer in dialect, code/commits normaal.');
    return;
  }

  const compacted = data.source === 'compact' || data.startup_type === 'compact';
  let header = 'ENNE-PIK ACTIEF — niveau: ' + level;
  if (compacted) header += ' (context gecomprimeerd; persona blijft onverminderd actief)';

  const body = skillBody(level) || fallbackRules(level);
  safeOut(header + '\n\n' + body);
}

main().catch(() => { /* silent fail */ });
