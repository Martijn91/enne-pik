# enne-pik: regels voor bijdragers

Claude Code plugin: Parkstad-dialect persona (skill + hooks) en de agents sjeng (planner) en sjaffer (uitvoerder).

## Persona en SKILL.md

- `skills/enne-pik/SKILL.md` is de single source of truth voor de persona. De SessionStart-hook leest het bestand runtime in en filtert het op niveau; er bestaat geen tweede kopie in de hooks.
- De hook-filter is formaat-gekoppeld. Houd je aan deze regels, anders lekt of verdwijnt tekst:
  - Alleen de Niveaus-tabel mag vette eerste cellen hebben (`| **lite** |`, `| **vol** |`, `| **plat** |`). De hook filtert élke regel die zo begint, dus een vette eerste cel in een andere tabel valt weg.
  - Voorbeeldregels per niveau beginnen met `- lite:`, `- vol:` of `- plat:`. Geen enkele andere regel mag zo beginnen.
  - Het blok tussen `<!-- skill-only -->` en `<!-- /skill-only -->` wordt door de hooks gestript. Zet daar alleen wat bij een expliciete skill-aanroep hoort.
- Laat de placeholder `${CLAUDE_PLUGIN_ROOT}` in SKILL.md staan; de hooks vullen hem in.
- Nieuwe woorden eerst in `skills/enne-pik/lexicon.md`; alleen kernwoorden horen in de SKILL.md-tabel.

## Hooks

- Node CommonJS (`hooks/package.json`), aangeroepen als `node "${CLAUDE_PLUGIN_ROOT}/hooks/<script>.js"` (quotes verplicht, het pad kan spaties bevatten).
- Silent-fail: een hook gooit nooit een zichtbare fout, eindigt met exit 0 en print niets als er niets te injecteren valt (ook geen "OK").
- Elke write van het flag-bestand gaat via `safeWriteFlag` in `hooks/enne-pik-config.js`. Nooit zelf naar het flag-bestand schrijven.
- Respecteer `CLAUDE_CONFIG_DIR`: het flag-pad is `join(CLAUDE_CONFIG_DIR || ~/.claude, '.enne-pik-level')`, nooit hardcoded.
- Hook-tests: `node hooks/test/run-tests.js`. Test met een scratch `CLAUDE_CONFIG_DIR`, nooit met je echte config.

## Agents

- sjeng schrijft nooit: houd Write, Edit en NotebookEdit in zijn `disallowedTools` en geef hem geen `memory:` (dat zet Write/Edit weer aan).
- Geen `${user_config.*}` in agent-frontmatter: wordt in 2.1.280 niet gesubstitueerd (getest; sessie start dan niet). sjeng `model: inherit`, sjaffer `model: claude-opus-5-5`.

## Valideren en testen

- `claude plugin validate .claude-plugin/plugin.json --strict` en `claude plugin validate .` (marketplace) moeten schoon zijn.
- Lokaal draaien met `claude --plugin-dir .`. Nooit tegelijk met een marketplace-install van enne-pik: dan bestaan er twee plugins met dezelfde naam. Zet de geïnstalleerde versie eerst uit via `/plugin`.
- Op native Windows nooit `claude plugin eval` met `--allow-tools Bash` (geen sandbox).

## Git

- Commit messages in het Engels, Conventional Commits (`feat:`, `fix:`, `docs:`, `test:`, `chore:`).
