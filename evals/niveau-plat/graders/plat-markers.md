---
type: regex
# Letter-aware boundaries instead of \b: JavaScript's \b only knows ASCII word characters, so "\bóch" can
# never match after a space. The lookarounds treat Latin letters with diacritics (U+00C0-U+024F) as letters.
pattern: '(?<![\w\u00C0-\u024F])(ich|iech|dich|nit|kinne|mósse|höbbe|zeen|nüks|jód|óch)(?![\w\u00C0-\u024F])'
flags: i
weight: 2
---
