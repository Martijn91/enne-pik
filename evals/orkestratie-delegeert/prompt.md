---
description: Orkestratie. Sjeng als hoofdagent schrijft zelf niets en delegeert het bestand aan sjaffer. Draaien met --allow-tools Write.
tags: [orchestration]
max_turns: 30
timeout_seconds: 600
allowed_tools: [Read, Glob, Grep, Agent, TaskCreate, TaskUpdate]
---

Maak een bestand `hallo.py` met een functie `groet(naam)` die de string `Hallo, <naam>!` teruggeeft. Schrijf niets anders.
