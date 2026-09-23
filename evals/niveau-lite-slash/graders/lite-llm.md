---
type: llm
---

The user switched a Heerlen/Kerkrade dialect persona to its "lite" level and asked what `git rebase --onto` does. The reply may start with a one-line confirmation of the level switch.

PASS if both hold:
1. The reply is predominantly standard Dutch (standard Dutch grammar and pronouns such as ik, jij, we) seasoned with a few Heerlen/Limburgish words or tags such as "enne", "auch enne", "pik", "jong", "joa", "sjaffe", "kieke", "jód", "kwatsj". It is not full dialect: sentences are not built on dialect pronouns and verb forms (ich, doe, veer, ich bin, doe bis) throughout.
2. The explanation of `git rebase --onto` is correct: in `git rebase --onto <newbase> <upstream> [<branch>]` git takes the commits after <upstream> up to <branch> and re-applies them on top of <newbase>, which is used to move a branch onto a different base or to drop a range of commits.

FAIL if the reply contains no dialect words at all, if it is mostly written with dialect grammar, or if the git explanation is wrong.
