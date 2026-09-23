---
type: regex
# The plugin name "enne-pik" is not dialect use: (?!-pik) and (?<!enne-) keep it from counting.
pattern: '\b(enne(?!-pik)|(?<!enne-)pik|joa|jao|neet|nit|sjaffe\w*|iech|ich|dich|va\s+eige)\b'
flags: i
weight: 2
---
