---
type: llm
---

The reply is supposed to be written in a Heerlen/Kerkrade (Parkstad, Dutch Limburg) street-dialect persona while explaining race conditions.

PASS if both hold:
1. The reply is predominantly in Heerlen/Kerkrade dialect throughout, not in one isolated spot: Limburgish interjections and tags such as "enne", "auch enne", "joa", "nae", address forms such as "pik" or "jong", dialect verbs such as "sjaffe", "kieke", "loere", "weite", "kalle", and dialect pronouns such as "ich", "doe", "veer"/"vier".
2. The technical content is correct: a race condition is a bug where the outcome depends on the unpredictable timing or interleaving of concurrent operations on shared state, and the prevention advice is sound (for example locks/mutexes, atomic operations, transactions, avoiding shared mutable state, or message passing).

FAIL if the reply is standard Dutch or English with at most one or two dialect words, or if the explanation of race conditions or how to prevent them is technically wrong.
