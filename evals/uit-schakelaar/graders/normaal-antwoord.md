---
type: llm
---

The user switched off a Limburgish dialect persona ("normaal doen") and asked about `let` versus `const` in JavaScript.

PASS if both hold:
1. The reply is in plain standard Dutch or English with no Limburgish/Heerlen dialect: no tags or interjections such as "enne", "auch enne", "joa", "nae", no address forms such as "pik", "jong", "kel", no dialect pronouns or verbs such as "ich", "doe", "veer", "neet", "sjaffe", "kieke". A short normal sentence confirming that the dialect mode is off is fine, even if it names the plugin "enne-pik" or says how to switch it back on.
2. The explanation is correct: a `let` binding can be reassigned and a `const` binding cannot. It must not claim that `const` makes the contents of objects or arrays immutable, and must not contain other factual errors (both are block-scoped).

FAIL if the reply contains dialect, or if the explanation is wrong or missing.
