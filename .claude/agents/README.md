# Agents

Project-specific sub-agents for TriageX. Claude Code can spawn these automatically or on demand.

## Available agents

| File | Trigger description |
|---|---|
| `test-runner.md` | Run backend (Jest) and frontend (ESLint) tests, report failures with fix suggestions |
| `pr-reviewer.md` | Review a PR or staged diff against CLAUDE.md conventions, security, and correctness |
| `sonar-issues.md` | Static quality sweep — bugs, security hotspots, code smells, duplication (SonarQube-style) |

## Format

Each `.md` file uses frontmatter:

```markdown
---
name: agent-name
description: When to use this agent (used for automatic selection)
model: sonnet | opus | haiku
---

System prompt / instructions for the agent.
```
