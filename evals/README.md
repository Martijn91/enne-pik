# Evals

Suite voor `claude plugin eval` (Claude Code ≥ 2.1.269). Per case: `evals/<case>/prompt.md` (frontmatter + prompt) en graders in `graders/*.md`. Elke run en elke `llm`-grader is een echte modelcall op jouw account.

## Draaien (vanuit de plugin-root)

- Itereren op één case, één run, zonder baseline: `claude plugin eval . --case persona-basis --runs 1 --ablation none`
- Volledige suite: `claude plugin eval . --allow-tools Write --threshold 0.8 --max-cost-usd 15`
- Goedkope subset (geen help, geen orkestratie, geen Write): `claude plugin eval . --tag persona niveau schakelaar`
- Wiebelen de `llm`-oordelen: `--judge-model sonnet`. Sandbox per run bewaren om te debuggen: `--keep-temp`.

Zet het doel (`.`) altijd vóór `--tag` en `--allow-tools`; die nemen een lijst. Op native Windows **nooit** `--allow-tools Bash`: er is geen sandbox-backend, dus elke run wordt geweigerd en scoort 0. Shell-cases alleen onder WSL2.

## Resultaten

Elke run schrijft `evals/results/<timestamp>/` met `aggregate-result.json` en `report.html` (staat in `.gitignore`). Met een claude.ai-abonnement wordt het rapport ook als privé-artifact gepubliceerd; `--no-publish` houdt het lokaal.

## Cases

`persona-basis` (persona, smoke) · `code-blijft-normaal` (persona, grenzen) · `uit-schakelaar` (schakelaar) · `niveau-plat` (niveau, zet `EVAL_ENNE_PIK_DEFAULT_LEVEL=plat`) · `niveau-lite-slash` (niveau, slash) · `help-kaart` (help) · `orkestratie-delegeert` (orchestration, heeft `--allow-tools Write` nodig).

## Kanttekeningen

- `orkestratie-delegeert` rekent erop dat de eval-harness de `agent`-instelling uit de plugin-`settings.json` (sjeng als hoofdagent) toepast. Dat is niet gedocumenteerd; sla de case over met een `--tag`-filter zonder `orchestration`.
- In een run met baseline tellen `arm: with-only`- en `tool_used: Skill`-graders niet mee in de score (alleen indicator). Wil je echt op delegatie toetsen: `claude plugin eval . --case orkestratie-delegeert --ablation none --allow-tools Write`.
- `uit-schakelaar` heeft een Δ rond 0 als verwachte uitkomst: zonder plugin praat Claude ook normaal. Die case bewaakt dat de uit-knop werkt, niet wat de plugin toevoegt.
- Het niveau-bestand `.enne-pik-level` hoort in de wegwerp-config van elke run te landen. Controleer dat een keer met `--keep-temp`; belandt het in je eigen `~/.claude`, dan lekken niveaus tussen cases.
