---
type: regex
# Looks only inside fenced blocks. The opener must carry an info string (```python); a closing fence never
# has one, so a closing fence can never act as an opener. From the opener the match may only step over lines
# that do NOT start with ```, so it stops at the closing fence and prose between two fences is unreachable.
# Blind spot: a block opened with a bare ``` (no language) is not inspected; code-schoon-llm covers that.
pattern: '^[ \t]*`{3,}[ \t]*[\w+#.-]+[^\n]*\n(?:(?![ \t]*```)[^\n]*\n)*?(?![ \t]*```)[^\n]*?\b(enne|joa|jao|neet|nit|sjaffe\w*|pik|iech|ich|dich)\b'
flags: im
match: not_contains
weight: 2
---
