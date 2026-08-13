# Luna Teacher Usability Release — 13 August 2026

## Decision

The private Conversational Teacher uses OpenAI GPT-5.6 Luna as its configured
production model. Luna is a model identifier, not a credential. The OpenAI API
base URL and model identifier are hosted runtime settings; the separately
issued API key must be stored only as the private `LAB_AI_API_KEY` secret.

The learner now begins from four plain-language goals instead of an undifferentiated
list of 18 record types: do today's work, think through a company, source or
recruit, or improve judgment. Every original workflow remains available inside
those goals.

An active conversation shows a three-step path: Talk, Review, Preserve. Rough
notes and explicit natural-language corrections are encouraged. Earlier turns
collapse after the conversation grows, while the full visible transcript
remains available. The review surface hides internal operation fields, labels
the intended record in plain language, and reiterates that nothing is permanent
until explicit confirmation.

## Release evidence

The production build, 62 unit and contract tests, type check, unchanged API
smoke suite, and full conversational round trip passed. Sites version 7 was
released privately to the owner-only Lab at:

https://venture-judgment-lab.sahsumit4545.chatgpt.site

The hosted base URL and Luna model are configured. The Teacher remains in its
safe, non-committing setup state until the learner adds the separately issued
OpenAI API key as the private `LAB_AI_API_KEY` setting.
