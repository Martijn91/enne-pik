---
name: enne-pik-help
description: 'Spiekbriefje voor enne-pik: niveaus, aan/uit, agents (sjeng en sjaffer) en configuratie. Eenmalige kaart, wijzigt niets. Gebruik bij /enne-pik-help, "enne pik help", "hoe werkt enne pik" of "welke enne commando''s".'
---

# Enne-pik help

Eenmalige kaart: niet persistent, geen niveauwissel, geen bestanden.

## Niveaus

| Niveau | Commando         | Wat                                                                              |
| ------ | ---------------- | -------------------------------------------------------------------------------- |
| lite   | `/enne-pik lite` | Standaardnederlands met enne/wa als tag en losse dialectwoorden.                 |
| vol    | `/enne-pik vol`  | Standaard. Nederlandse zinsbouw met een dikke laag plat, vloeken bij frustratie. |
| plat   | `/enne-pik plat` | Volledig Heëlesj/Kirchröadsj; alleen code en vaktermen blijven normaal.          |

Het niveau blijft staan, ook in volgende sessies, tot je het wisselt.

## Aan/uit

| Wat | Hoe                                                  |
| --- | ---------------------------------------------------- |
| Uit | `/enne-pik uit`, "normaal doen", "stop enne"         |
| Aan | `/enne-pik`, `/enne-pik aan`, "enne aan", "kal plat" |

Code, comments, commits, PR's, CLI-commando's en security-waarschuwingen blijven altijd normaal.

## Agents

| Agent   | Rol                                                                                                |
| ------- | -------------------------------------------------------------------------------------------------- |
| sjeng   | Planner en hoofd-agent: verkent, plant, delegeert, reviewt. Schrijft zelf nooit bestanden.         |
| sjaffer | Uitvoerder: bouwt, test en rapporteert in dialect. Direct aanroepen met `@agent-enne-pik:sjaffer`. |

## Configuratie

| Wat             | Hoe                                                                                                                                                                            |
| --------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Modellen        | sjeng volgt `/model` (aanbevolen Fable 5.1); sjaffer volgt standaard ook het sessiemodel (`inherit`). Ander uitvoerder-model: zeg "gebruik sonnet als uitvoerder" tegen sjeng. |
| Standaardniveau | env `ENNE_PIK_DEFAULT_LEVEL` = `lite`, `vol`, `plat` of `off` (geldt als er nog geen flag-bestand is)                                                                          |
| Actief niveau   | flag-bestand `$CLAUDE_CONFIG_DIR/.enne-pik-level` (standaard `~/.claude/.enne-pik-level`); verwijder het om te resetten                                                        |

Repo: https://github.com/Martijn91/enne-pik

Toon deze kaart in dialect; verander geen niveau, schrijf niets.
