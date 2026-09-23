---
type: regex
# Not dialect use, so excluded: the plugin name "enne-pik" and the quoted re-enable commands
# "enne aan" / "enne pik terug" that the hook's off-confirmation may make Claude echo.
pattern: '\b(enne(?!-pik)(?!\s+(?:pik\s+)?(?:aan|terug)\b)|joa|neet|nit|sjaffe\w*|auch\s+enne)\b'
flags: i
match: not_contains
weight: 2
---
