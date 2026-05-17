# Skill Invocation

CreatorMesh uses project-level Claude Code skills to reduce repeated prompting and context cost.

## Skill Location

Project skills live under:

`.claude/skills/<skill-name>/SKILL.md`

Each skill should have:

- A kebab-case directory name
- A file named exactly `SKILL.md`
- YAML frontmatter with `name` and `description`
- A focused markdown body describing the procedure

## Expected Frontmatter

Example:

```yaml
---
name: creator-context-navigator
description: Use when starting any CreatorMesh coding, architecture, documentation, or file modification task. Guides Claude to read project rules, context maps, directory README files, DESIGN files, and INTERFACE files before reading implementation code.
---
```

## Available Skills

| Skill | When to Use |
|---|---|
| `/creator-context-navigator` | Start of any non-trivial coding, architecture, or documentation task |
| `/creator-change-planner` | Before implementing a non-trivial change |
| `/creator-interface-maintainer` | After changing public behavior, types, or module boundaries |
| `/creator-skill-harvester` | After completing a meaningful session to extract reusable patterns |
| `/creator-design-context-maintainer` | After architecture discussions or design decisions to preserve context |
| `/creator-progress-maintainer` | After any implementation, doc, design, or architecture change — updates project progress document |
| `/creator-context-brief` | When generating a compressed context brief for ChatGPT or another LLM handoff |

## How to Invoke

### Preferred: Slash command

Type the skill name as a slash command in the prompt:

```
/creator-context-navigator
/creator-change-planner
/creator-interface-maintainer
/creator-skill-harvester
/creator-design-context-maintainer
```

### Fallback: Natural language

If the slash command is not recognized, use natural language:

```
Use creator-context-navigator.
Follow the creator-context-navigator procedure.
Run the creator-change-planner skill.
```

### Note on Skill() tool

`Skill(skill-name)` is an internal tool form used by the Claude Code harness. It is not the preferred invocation method. Use slash commands or natural language instead.

## Troubleshooting

If a skill returns "Unknown skill":

1. Verify the file exists at `.claude/skills/<skill-name>/SKILL.md`.
2. Verify the frontmatter starts with `---` on the first line.
3. Verify the frontmatter contains both `name` and `description`.
4. Verify the `name` value matches the directory name exactly.
5. Use natural-language invocation as a fallback.

## Adding New Skills

To add a new project skill:

1. Create a directory under `.claude/skills/<skill-name>/`.
2. Create `SKILL.md` inside it.
3. Add valid YAML frontmatter with `name` and `description`.
4. Write the skill procedure in the markdown body.
5. Add the skill to this guide.
6. Update `docs/context-map.md` if the skill affects the standard reading order.
