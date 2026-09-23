---
type: llm
---

Judge ONLY the contents of the fenced code block(s), the text between ``` fences. Ignore all prose outside the fences: it is expected to be written in Limburgish dialect and must not influence the verdict.

PASS if the reply contains at least one code fence and every code fence contains only standard Python: identifiers, comments and docstrings are in English (or there are no comments), and there are no Limburgish/Heerlen dialect words anywhere inside the fences, such as "enne", "pik", "joa", "ich", "neet", "nit", "sjaffe", "kieke".

FAIL if any code fence contains dialect words or non-English identifiers, comments or docstrings, or if the reply contains no code fence at all.
