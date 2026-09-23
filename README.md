# enne-pik

> Claude kalt Heëlesj/Kirchröadsj straattaal, enne. Sjeng plant, sjaffer bouwt.

Een Claude Code plugin die Claude de hele sessie laat praten in Parkstad-straattaal uit Heerlen en Kerkrade ("enne", "auch enne", "enne pik"), en die het werk verdeelt over twee agents: **sjeng** (planner) en **sjaffer** (uitvoerder).

## Wat is dit, enne?

Twee dingen in één plugin:

1. **Een persona.** Claude antwoordt in Heerlens/Kerkraads straatdialect, elk antwoord, ook na lange sessies en na `/compact`. Er zijn drie niveaus en een uit-knop. Code, commits, PR's, CLI-commando's en security-waarschuwingen blijven gewoon normaal.
2. **Een two-tier agent-opzet.** De hoofd-agent **sjeng** verkent, plant, reviewt en rapporteert, maar schrijft zelf nooit bestanden. Al het bouwwerk gaat naar **sjaffer**.

Voor en na, op de vraag *"Waarom faalt `npm test` met `Cannot find module`?"*

**Gewone Claude:**

> Meestal is een dependency niet geïnstalleerd of klopt het importpad niet. Controleer of het pakket in `package.json` staat en draai `npm install`. Is dat in orde, kijk dan of het pad in je import precies overeenkomt met de bestandsnaam, inclusief hoofdletters.

**enne-pik, niveau `vol`:**

> Joa, kump good enne. Meestal zit de pratsj neet in je code, pik: 'ne dependency is neet geïnstalleerd of 't importpad klopt neet. Loer ens of 't pakket in `package.json` staat en draai `npm install`. Is dat allemaal jód, kiek dan effe of 't pad in je import precies de bestandsnaam volgt, hoofdletters ook, enne. Node kalt soms kwatsj, maar dit is meestal get simpels. Wils doe dat sjaffer 't fikst? Dan geet hae effe sjaffe.

Op `vol` en `plat` wordt er gevloekt zoals in de kroeg in Parkstad (godverdomme, verrek, sjtrónt), gedoseerd en vooral bij fouten en frustratie. Nooit discriminerende scheldwoorden en geen ziekte-vloeken: die zijn Randstads, niet Limburgs. `lite` is een stuk braver.

## Installatie, allé

Vereisten: Claude Code met plugin-ondersteuning (ontwikkeld op 2.1.280) en Node.js in je `PATH`, want de hooks zijn Node-scripts.

In Claude Code:

```text
/plugin marketplace add Martijn91/enne-pik
/plugin install enne-pik@enne-pik
```

Of vanaf de command line:

```bash
claude plugin marketplace add Martijn91/enne-pik
claude plugin install enne-pik@enne-pik
```

Start daarna een nieuwe sessie. De header toont `@sjeng` als hoofd-agent en het eerste antwoord komt in dialect.

## Lokaal testen: loer ens

```bash
git clone https://github.com/Martijn91/enne-pik.git
cd enne-pik
claude plugin validate .claude-plugin/plugin.json          # plugin-manifest en componenten
claude plugin validate .claude-plugin/plugin.json --strict # strenger (warnings = fouten)
claude plugin validate .                                   # marketplace-manifest
node hooks/test/run-tests.js        # hook-tests
claude --plugin-dir .               # sessie met de plugin uit deze map
```

> **Let op:** combineer `--plugin-dir .` niet met een marketplace-install van enne-pik. Dan zijn er twee plugins met dezelfde naam `enne-pik` en is onduidelijk welke hooks, skills en agents winnen. Zet de geïnstalleerde versie eerst uit via `/plugin` of `claude plugin disable enne-pik@enne-pik` (verwijderen: `claude plugin uninstall enne-pik@enne-pik`).

## Niveaus

| Niveau | Wat verandert |
|---|---|
| `lite` | Standaardnederlands, met enne/auch enne/wa als tag, aanspreekvormen "pik" en "jong", losse dialectwoorden (sjaffe, kieke, jód, kwatsj). Geen dialectgrammatica. |
| `vol` (standaard) | Nederlandse zinsbouw met een dikke laag plat: ich/doe/veer, joa/nae, neet/nit, dialectwerkwoorden en -bijwoorden, tags op ongeveer een derde van de zinnen, vloeken bij frustratie. |
| `plat` | Volledig Heëlesj/Kirchröadsj: dialectgrammatica (ich bin, doe bis, vier junt), Kerkraadse klankregels, nüks/tsiet/jód. Alleen technische termen en code blijven Nederlands/Engels. |

Wisselen doe je met `/enne-pik lite`, `/enne-pik vol` of `/enne-pik plat`. Het niveau blijft staan, ook in volgende sessies, tot je het weer verandert.

Op elk niveau schakelt Claude tijdelijk over op gewoon Nederlands bij security-waarschuwingen, onomkeerbare acties, exacte foutmeldingen en stappenplannen waar de volgorde telt, of als je "wat?" zegt. Daarna gaat het weer verder in dialect.

## Aan en uit

| Wat | Hoe |
|---|---|
| Uit | `/enne-pik uit`, of zeg "normaal doen" of "stop enne" |
| Aan | `/enne-pik`, of zeg "enne aan" of "kal plat" |
| Niveau kiezen | `/enne-pik lite`, `/enne-pik vol`, `/enne-pik plat` |
| Spiekbriefje | `/enne-pik-help` (toont alleen de kaart, verandert niets) |

"Aan" zet de persona vanuit "uit" terug op het standaardniveau (`vol`, of wat in `ENNE_PIK_DEFAULT_LEVEL` staat); staat hij al aan, dan verandert er niets. Ook "kal plat" zet hem alleen aan en kiest dus niet het niveau `plat`: daarvoor is `/enne-pik plat`.

Zinnen als "normaal doen" tellen alleen aan het begin van je bericht, of in een kort bericht (tot 80 tekens) zonder vraagteken. "Wat betekent normaal doen?" zet de persona dus niet uit.

## Agents: sjeng en sjaffer

**sjeng** is de hoofd-agent. De plugin zet hem via zijn eigen `settings.json` (`{"agent": "sjeng"}`), dus zodra de plugin aan staat praat je met sjeng. Hij verkent de code, plant met een takenlijst, splitst het werk in afgebakende opdrachten, delegeert die aan sjaffer, reviewt het resultaat met `git diff` en tests, en rapporteert in dialect. Hij schrijft zelf nooit: Write, Edit en NotebookEdit zijn voor hem uitgeschakeld en Bash gebruikt hij alleen lezend. Uitleg- en kennisvragen beantwoordt hij zelf.

**sjaffer** is de uitvoerder. Hij krijgt één opdracht, leest eerst, bouwt, test, commit alleen als dat in de opdracht staat (Conventional Commits in het Engels) en rapporteert kort in dialect onder Gedaan / Gewijzigd / Getest / Open punten. Zelf verder delegeren kan hij niet. Je kunt hem ook rechtstreeks aanroepen met `@agent-enne-pik:sjaffer`.

**Zo werkt de delegatie.** Hooks draaien niet in subagents, dus sjaffer krijgt de persona op twee manieren: de skill `enne-pik` wordt voor hem vooraf geladen, en elke opdracht van sjeng begint met een kopregel met het actieve niveau:

```text
[enne-pik: vol]
Doel: ...
Context: ...
Acceptatiecriteria: ...
Grenzen: ...
Rapporteer: gedaan / gewijzigde bestanden / getest / open punten
```

Ontbreekt die kopregel, dan rapporteert sjaffer op `vol`; bij `[enne-pik: off]` in gewoon Nederlands.

**Modellen kiezen.** sjeng heeft `model: inherit`: het planner-model is het model dat je met `/model` kiest of dat als `model` in je settings staat. Aanbevolen is `claude-fable-5-1[1m]` (Fable 5.1). sjaffer heeft ook `model: inherit` in `agents/sjaffer.md` en draait dus standaard op hetzelfde model als de sessie.

| Wat | Hoe |
|---|---|
| Planner-model (sjeng) | `/model`, of `"model"` in je `settings.json`. Aanbevolen: `claude-fable-5-1[1m]`. |
| Uitvoerder-model, voor deze sessie | Zeg het tegen sjeng: "gebruik sonnet als uitvoerder". Hij geeft dan bij elke delegatie de `model`-parameter mee (`sonnet`, `opus`, `haiku` of `fable`). |
| Uitvoerder-model, permanent | Pas `model:` aan in `agents/sjaffer.md`. Bij een marketplace-install: fork de repo, of draai een aangepaste kopie met `--plugin-dir`. |

De PostModelSwitch-hook kan één keer melden dat je met `/model` wegwisselt van een vast planner-model. Die melding is opt-in: standaard staat `ENNE_PIK_PLANNER_MODEL` op `inherit` en komt er geen melding. Zet de omgevingsvariabele op een model-id of alias (bijvoorbeeld `claude-fable-5-1` of `fable`) om de melding aan te zetten; `inherit` of `off` zet hem weer uit.

> **Waarom geen opties in `/config`?** Claude Code 2.1.280 vult `${user_config.*}`-placeholders in agent-frontmatter niet in: het model blijft dan letterlijk de placeholder en de sessie start niet. Daarom staat het model letterlijk in de agent-bestanden: beide agents hebben `model: inherit`.

**Sjeng liever niet als hoofd-agent?**

- Voor één sessie: `claude --agent <andere-agent>`.
- Permanent: zet een eigen `"agent"` in je user- of project-`settings.json`. Die wint van de plugin (volgorde: `--agent` > project settings > user settings > plugin).
- Helemaal niet: zet de plugin uit via `/plugin`.

Zonder sjeng als hoofd-agent blijft de persona werken, want de hooks draaien in elke hoofdsessie, en kun je sjaffer nog steeds als subagent gebruiken.

## Onder de motorkap

- **SessionStart** (`hooks/enne-pik-activate.js`): leest het niveau uit het flag-bestand en injecteert het bijbehorende deel van `skills/enne-pik/SKILL.md`, ook na `/compact`, `/clear` en resume.
- **UserPromptSubmit** (`hooks/enne-pik-mode-tracker.js`): herkent `/enne-pik ...` en de aan/uit-zinnen, werkt het flag-bestand bij en geeft elke beurt een korte herinnering mee.
- **PostModelSwitch** (`hooks/enne-pik-model-watch.js`): één melding als je wegwisselt van het planner-model in `ENNE_PIK_PLANNER_MODEL`. Standaard uit (`inherit`).

## Configuratie

| Wat | Waar | Effect |
|---|---|---|
| `ENNE_PIK_DEFAULT_LEVEL` | omgevingsvariabele | Standaardniveau: `lite`, `vol`, `plat` of `off`. Zonder deze variabele is dat `vol`. |
| `ENNE_PIK_PLANNER_MODEL` | omgevingsvariabele | Model waarvoor de wissel-melding geldt. Standaard `inherit`: geen melding. Een model-id of alias (bijvoorbeeld `claude-fable-5-1`) zet de melding aan; `inherit` of `off` zet hem uit. |
| Flag-bestand | `$CLAUDE_CONFIG_DIR/.enne-pik-level`, standaard `~/.claude/.enne-pik-level` | Bevat het actieve niveau (`lite`, `vol`, `plat` of `off`). Wordt bijgewerkt door `/enne-pik` en de aan/uit-zinnen. |

Het niveau blijft staan over sessies heen: de SessionStart-hook schrijft het flag-bestand alleen als het nog niet bestaat. `ENNE_PIK_DEFAULT_LEVEL` telt dus alleen bij de eerste start, na een reset en bij "aan" vanuit "uit". Resetten doe je door het flag-bestand te verwijderen:

```bash
rm ~/.claude/.enne-pik-level
```

```powershell
Remove-Item "$env:USERPROFILE\.claude\.enne-pik-level"
```

Gebruik je een eigen `CLAUDE_CONFIG_DIR`, verwijder het bestand dan daar.

## Evals

De map `evals/` bevat een suite voor `claude plugin eval`: persona-basis, code blijft normaal, de uit-schakelaar, niveau `plat`, niveau `lite` via het slash-command, de help-kaart en orkestratie (sjeng delegeert aan sjaffer).

```bash
# één case, snel itereren
claude plugin eval . --case persona-basis --runs 1

# goedkoop, zonder orkestratie
claude plugin eval . --tag persona --tag niveau --tag schakelaar

# volledige suite
claude plugin eval . --allow-tools Write --threshold 0.8 --max-cost-usd 15
```

- De orkestratie-case (tag `orchestration`) heeft `--allow-tools Write` nodig, omdat sjaffer een bestand moet aanmaken.
- Wiebelen de llm-oordelen, voeg dan `--judge-model sonnet` toe.
- Op native Windows nooit `--allow-tools Bash`: daar is geen sandbox.
- Resultaten komen in `evals/results/`, dat in `.gitignore` staat.

## Bekende beperkingen: dat geet neet

- **Eén globale flag.** Alle sessies delen hetzelfde flag-bestand. Zet je in de ene sessie `/enne-pik plat`, dan praten parallelle sessies vanaf hun volgende beurt ook plat.
- **Niveau blijft staan.** Een nieuwe sessie begint op het laatst gekozen niveau, niet op de standaard. Verwijder het flag-bestand om te resetten.
- **Sjeng vervangt de standaard system prompt.** Als hoofd-agent vervangt zijn prompt die van Claude Code; CLAUDE.md laadt nog wel. Mis je het standaardgedrag, kies dan een andere hoofd-agent (zie hierboven).
- **MCP-tools alleen bij sjaffer.** Sjeng heeft een vaste tool-allowlist en ziet je MCP-tools niet; sjaffer erft ze wel. Werk met MCP-tools loopt dus via sjaffer.
- **Bash-regel is een afspraak.** Dat sjeng Bash alleen lezend gebruikt, staat in zijn prompt maar wordt niet technisch afgedwongen. Write, Edit en NotebookEdit zijn wel echt uitgeschakeld.
- **Subagents krijgen geen hooks.** Sjaffer leunt op de vooraf geladen skill en de `[enne-pik: <niveau>]` kopregel. Roept iets anders hem aan zonder kopregel, dan rapporteert hij op `vol`.
- **Evals en hoofd-agent.** Hoe de eval-harness omgaat met een hoofd-agent die een plugin via `settings.json` zet, is niet gedocumenteerd. Daarom is de orkestratie-case apart getagd.

## Woordenlijst

De woorden, uitdrukkingen en grammatica zijn samengesteld uit publieke bronnen: mijnwoordenboek.nl (Heerlens en Kerkraads), het Nederlands-Kerkraads woordenboek van Jo Linden, Veldeke Limburg, Wikipedia (Heerlens Nederlands en Kerkraads), InLimburg ("Enne? Auch enne!") en de Limburgeringscursus van 3FM. Een check door een moedertaalspreker is nog nodig: sommige woorden of spellingen kunnen niet kloppen of uit het verkeerde dorp komen.

Verbeteren kan in `skills/enne-pik/lexicon.md`: de uitgebreide woordenlijst en plat-grammatica, die Claude alleen leest als hij een woord mist. De kerntabel staat in `skills/enne-pik/SKILL.md`; lees voordat je die aanpast de regels in [.claude/CLAUDE.md](.claude/CLAUDE.md). Correcties uit Heerlen, Kerkrade en de rest van Parkstad zijn zeer welkom, enne.

## Licentie

MIT, zie [LICENSE](LICENSE). © 2026 Martijn Wennekes.
