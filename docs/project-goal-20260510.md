# CreatorMesh Project Goal

Version: 20260510

## Mission

CreatorMesh is a personal agent operating system and super workbench for independent creators.

It helps independent creators capture thoughts, process messages, structure knowledge, make plans, generate actions, coordinate workflows, and ship products — all through a controllable, extensible, human-in-the-loop platform.

## Target Users

CreatorMesh is not only for software developers.

It is designed for independent creators across domains, including:

- developers
- lawyers
- writers
- influencers
- financial professionals
- consultants
- educators
- researchers
- designers
- solo founders
- and any other knowledge workers or independent professionals who need leverage over their ideas, messages, workflows, and outputs

Independent creators often work across many roles at once. They think, write, communicate, plan, build, publish, respond, and improve continuously. Their most valuable inputs are often scattered across notes, messages, conversations, documents, tasks, and tools.

CreatorMesh aims to connect these inputs and help turn them into structured, actionable, and shippable outcomes.

## Core Input Primitives

CreatorMesh starts from two core input primitives.

### Thoughts

Thoughts are internally generated inputs.

They include:

- ideas
- reflections
- notes
- insights
- plans
- observations
- decisions
- personal thinking
- creative sparks

### Messages

Messages are externally triggered inputs.

They include:

- opportunities
- feedback
- requests
- conversations
- client messages
- user responses
- collaboration updates
- work items
- tasks

## Core Transformation

CreatorMesh helps transform thoughts and messages into:

- structured knowledge
- plans
- actions
- workflows
- shipped products

Each step should remain controllable. Human review, correction, approval, rejection, and intervention should be supported by default.

## Product Vision

CreatorMesh should eventually become a personal super workbench that connects:

- daily thoughts and personal knowledge
- external messages and opportunities
- notes and structured knowledge assets
- projects and planning
- career and life planning
- startup ideas and product concepts
- user feedback and external signals
- agent workflows and automation
- coding agents and execution environments
- external tools and knowledge systems
- final shipped outputs and products

The long-term product vision is a platform that grows with the creator — learning from their thinking patterns, supporting their workflows, and helping them produce more with less friction.

## Design Strategy: Own the Core, Reuse the Ecosystem

CreatorMesh should own its product and domain abstractions. External ecosystems should be reused through replaceable adapters, not absorbed into the architecture.

### What CreatorMesh Should Own

- Core product and domain model
- Thoughts and Messages as input primitives
- Knowledge structure and planning abstractions
- Workflow semantics: WorkflowDefinition, WorkflowStep, WorkflowRun, WorkflowPort
- Human-in-the-loop governance and approval model
- Audit model
- ConnectorPort and CapabilityRegistry
- RunnerPort
- Normalized external resource model
- Project-specific quality and cost harness

### What CreatorMesh Should Reuse or Adapt

- SaaS APIs and provider SDKs (e.g. Notion SDK)
- OAuth-heavy long-tail integrations
- External tool protocols such as MCP
- Background job and durable workflow execution backends (e.g. Trigger.dev)
- Agent orchestration backends (e.g. Mastra, LangGraph)
- Low-code or graph UI components (e.g. React Flow)
- Community adapters and optional integration hubs

### Key Principle

External ecosystems can be reused.
Internal abstraction must remain owned.
Protocols can be compatible.
The product core must not be outsourced.

CreatorMesh should be MCP-compatible where useful, but not MCP-locked.
External integration hubs may be optional providers, not core dependencies.
Workflow engines may be execution backends, not product models.
Agent frameworks may be runners or orchestration backends, not the system brain.

## What CreatorMesh Is Not

**It is not only a coding assistant.**
CreatorMesh is a platform for all independent creators, not only developers. Coding is one kind of output, not the whole product.

**It is not only a Notion tool.**
Notion is one planned connector. CreatorMesh's architecture is tool-agnostic. The system should work across multiple knowledge systems, communication tools, and execution environments.

**It is not only a harness project.**
The quality and cost harness — documentation layers, agent rules, context briefs, and development skills — is an engineering discipline that helps build CreatorMesh. It is not the product itself.

**It is not only for programmers.**
The target user is any independent professional who creates knowledge, manages messages, and produces outputs in their domain.

**It is not a fully autonomous black box.**
CreatorMesh is human-in-the-loop by design. The creator should be able to review, correct, approve, reject, pause, or redirect meaningful actions at every step.

**It is not a generic SaaS integration hub.**
CreatorMesh should not hand-write or maintain hundreds of full SaaS SDK wrappers. Long-tail app integrations should be handled through connector adapters, MCP-compatible backends, or optional integration hubs.

**It is not a replacement for n8n, Zapier, Pipedream, or other workflow automation platforms.**
CreatorMesh may integrate with external automation platforms, but its goal is not to become a generic automation product.

**It is not a low-code workflow canvas first.**
A visual canvas may become useful later, but the project should first define workflow semantics, execution boundaries, governance, and auditability before building UI.

**It is not a generic agent orchestration framework.**
CreatorMesh may use agent frameworks such as Mastra or LangGraph as backends later, but the product should not expose an external agent framework as its own core model.

**It is not a full Notion API wrapper.**
Notion is a reference knowledge workspace connector. CreatorMesh should only expose the Notion capabilities needed by its product workflows, not re-implement the full Notion API.

## Architectural Direction

CreatorMesh is organized into conceptual layers:

### Triggers

The system starts from inputs. The most important triggers are thoughts and messages. Other triggers include scheduled reviews and system events.

### Intake

Raw inputs are normalized into internal capture items, making them consistent enough for the rest of the system to process.

### Knowledge

Captured inputs are structured into thoughts, notes, ideas, plans, reflections, and other personal knowledge assets. The knowledge layer is tool-agnostic — it is not tied to Notion or any other single system.

### Orchestrator

The orchestrator coordinates what happens next. It routes inputs toward knowledge, planning, action, workflow execution, agent reasoning, or output generation. It coordinates all layers without performing every task directly.

### Agents

Agents are domain-specific reasoning roles. Over time, CreatorMesh may grow into an agent tree or agent mesh, including roles such as:

- Thought Agent
- Message Agent
- Knowledge Agent
- Life Planning Agent
- Career Agent
- Startup Agent
- Research Agent
- Engineering Agent
- Review Agent
- Governance Agent

### Runners

Runners execute tasks through specific execution engines. Runners are replaceable behind **RunnerPort**.

Claude Code is the first planned development runner. Future runners may include:

- Claude Code
- Codex
- OpenHands
- Aider
- local scripts
- manual human execution
- browser agents
- agent framework adapters (e.g. Mastra, LangGraph as backends)
- other execution environments

Claude Code should be treated as the first development runner, not as a connector and not as the system brain.

### Connectors

Connectors integrate external systems and are designed around **ConnectorPort** and **CapabilityRegistry**.

Connector backends may include:

1. Direct API adapters (e.g. Notion SDK)
2. MCP-compatible adapters
3. Optional external integration hub adapters

The connector layer exposes normalized capabilities:

- read
- search
- create
- update
- append
- delete
- sync
- subscribe
- execute

Each connector carries: permission level, approval requirement, and audit trail. The internal system depends on normalized capabilities, not provider-specific APIs.

Notion is the first reference connector, but not the center of the architecture.

### Workflows

Workflows define end-to-end transformations from inputs to outputs. They express CreatorMesh's main value: turning thoughts and messages into knowledge, plans, actions, and shipped products.

CreatorMesh owns its workflow semantics. Core workflow concepts include:

- WorkflowDefinition
- WorkflowStep
- WorkflowRun
- WorkflowContext
- WorkflowResult
- HumanReviewStep
- ConnectorAction
- RunnerAction
- AuditRecord

CreatorMesh should not build a full durable workflow engine from scratch. The first version uses a minimal **LocalWorkflowRunner** to validate the model. When durable execution becomes necessary, a backend such as Trigger.dev may be introduced behind **WorkflowRunnerPort**. Complex agent graph execution may be supported through Mastra or LangGraph as runner backends, not as the product core.

### Governance

Governance keeps CreatorMesh controllable, auditable, and safe. The creator should be able to review, approve, reject, or pause meaningful actions — especially as the system grows more powerful and connects to personal notes, messages, code, and external tools.

Meaningful external side effects are reviewable and auditable. These include:

- writing to Notion
- sending messages
- opening pull requests
- modifying files
- executing commands
- deleting external resources

Permission levels will include:

- safe-read
- write
- destructive
- external-side-effect

The creator stays in control.

### Storage

Storage persists system state. This includes:

- workflow run state
- knowledge references
- agent runs
- approval records
- audit logs
- external resource snapshots
- connector execution records
- references to secrets (not raw secrets)

CreatorMesh aims to be local-first where possible, but should support multiple storage backends over time.

### Outputs

Outputs are the final artifacts CreatorMesh returns to the creator or writes back to connected tools.

Outputs should often be reviewable plans before they become external side effects. Examples:

- proposed Notion restructuring plan
- proposed response draft
- proposed GitHub issue
- proposed code change
- proposed knowledge tree update

Output formatting and delivery are distinct concerns. The creator reviews and approves before external write-back occurs.

## Representative Workflows

CreatorMesh is a multi-workflow platform. The following are representative examples, not the complete product.

**Thought to structured note**
A creator records a thought. CreatorMesh normalizes it, classifies it, structures it as a knowledge asset, and optionally syncs it to a knowledge workspace like Notion.

**Cognitive tree maintenance**
A creator has a large personal knowledge tree. A new thought arrives. CreatorMesh decides where it belongs, whether to link it to existing notes, whether to merge or split it, whether to revisit older ideas, and how to visualize the evolving structure.

**Message to response and action**
An external message arrives. CreatorMesh classifies it, extracts action items, drafts a response, and connects it to relevant plans or workflows.

**Idea revival and productization**
A creator has many dormant ideas. CreatorMesh periodically re-evaluates them and helps decide whether to archive, merge, research, develop, or ship each one.

**Idea to project plan**
An idea is selected for development. CreatorMesh structures it into a project, generates a plan, breaks it into tasks, and routes tasks toward execution through runners and connectors.

**Project to shipped product**
A structured project moves through planning, task generation, coding agent execution, review, feedback loops, and output delivery — ending in a shipped product.

**Career and life planning**
A creator reflects on their professional trajectory. CreatorMesh helps structure career plans, identify next steps, connect them to ongoing work, and track progress over time.

**Weekly review**
CreatorMesh generates a weekly review by pulling together recent thoughts, completed tasks, open messages, and pending ideas — giving the creator a structured summary and reflection prompt.

**Notion knowledge tree reorganization**
A creator selects a Notion scope (a page, database, or workspace area). CreatorMesh reads relevant Notion content through the Notion connector, normalizes it into internal knowledge resources, asks a reasoning runner to propose a knowledge tree restructuring plan, presents the plan for human review, applies only approved changes back to Notion, and records the audit trail.

Workflow steps:

1. select_notion_scope
2. read_notion_pages
3. normalize_content
4. generate_structure_plan
5. human_review
6. apply_approved_changes
7. audit_result

The first version should not perform destructive Notion changes. It should prefer creating new pages, appending content, or generating reviewable change plans. Deletion, merge, or irreversible operations require explicit approval.

## First Phase Focus

The first implementation phase should not try to build the full vision.

It should focus on:

1. Implementing the minimal core primitives: Thought and Message.
2. Establishing the architecture foundation and documentation layers.
3. Designing ConnectorPort and CapabilityRegistry before implementing full connectors.
4. Designing Notion as the first reference connector, using a thin Direct API adapter first.
5. Designing RunnerPort and treating Claude Code as the first development runner.
6. Designing WorkflowPort and lightweight workflow semantics before adopting durable workflow frameworks.
7. Using a minimal LocalWorkflowRunner only to validate workflow abstractions.
8. Deferring Trigger.dev integration until background jobs, retries, queues, scheduling, or observability are truly needed.
9. Deferring Mastra or LangGraph until dynamic agent graph orchestration is truly needed.
10. Keeping all external framework dependencies behind adapters.
11. Maintaining human review, permission, and audit as first-class design constraints.
12. Using the quality and cost harness as engineering support, not as the product deliverable.

The first phase should prove the product abstractions before committing to heavy execution frameworks.

## Role of Notion

Notion is the first planned external knowledge workspace connector.

It serves as:

- the first reference connector, used to validate ConnectorPort
- a knowledge source
- an output target
- a future trigger source

**Initial Notion scope (MVP):**

- search pages
- read page metadata
- read page blocks
- create page
- append blocks
- manual sync

**Deferred Notion scope:**

- public OAuth
- webhook subscription
- full database sync
- conflict resolution
- background continuous sync
- destructive actions
- full Notion API wrapper

The goal is to validate the connector abstraction, not to fully clone the Notion API. Notion should remain a connector. It is not the architectural center. CreatorMesh should work independently of Notion and be extensible to other knowledge systems over time.

## Role of Claude Code

Claude Code is the first planned development execution environment.

It serves as:

- the first development runner
- a task execution environment
- a coding worker and collaborator
- a backend behind RunnerPort

It should not be treated as:

- a connector
- the system brain
- the only execution environment
- the product architecture itself

Claude Code may support:

- reading architecture context
- planning changes
- implementing small features
- running verification commands
- updating interface documents
- preserving design context
- generating handoff briefs

CreatorMesh should remain runner-agnostic. The architecture should work across multiple runners and execution environments over time.

## Role of Workflow and Agent Frameworks

Workflow and agent frameworks may be useful execution backends, but they should not define CreatorMesh's product model.

CreatorMesh should first define its own WorkflowPort and workflow semantics. A minimal local runner is used to validate early workflows.

**Trigger.dev** may be introduced as a future durable workflow backend when the project needs:

- long-running tasks
- retries and queues
- scheduled jobs
- observability
- background execution
- self-hostable TypeScript workflow execution

**Mastra, LangGraph, or similar frameworks** may be introduced later when the project needs:

- dynamic agent graphs
- multi-agent collaboration
- checkpointed agent state
- complex human-in-the-loop agent reasoning
- agent memory and tool routing

All such frameworks should enter through adapters, not replace CreatorMesh's internal workflow model.

## Role of the Quality and Cost Harness

The quality and cost harness is the engineering foundation that helps build CreatorMesh safely and affordably.

It includes:

- `AGENTS.md` and `CLAUDE.md` for agent rules and development discipline
- `docs/context-map.md` and `docs/architecture.md` for structural orientation
- `README.md`, `DESIGN.md`, and `INTERFACE.md` layers for documentation-first development
- context briefs for LLM handoff
- project goal and progress documents for session continuity
- project-level skills for repeatable development patterns

This harness reduces context debt, improves development quality, and makes AI-assisted development more predictable and affordable.

It is engineering infrastructure. It is not the product mission.

## Ecosystem Reuse Strategy

CreatorMesh's framework selection philosophy is: define abstractions first, adopt frameworks as adapters second.

### Strategic First-Party Adapters

These are important enough to build as thin adapters:

- Notion as the first knowledge workspace connector
- Claude Code as the first development runner
- Local file system or local scripts if needed early
- GitHub later, if it becomes central to project execution

These adapters should be thin wrappers over provider SDKs or execution tools. They should not become full re-implementations of provider APIs.

### Long-Tail SaaS Integrations

For many external apps, prefer:

- MCP-compatible adapters
- Optional integration hubs
- Community adapters
- External automation tools

CreatorMesh should not hand-write full OAuth and API support for every app.

### Workflow Execution

CreatorMesh defines workflow semantics itself. Execution starts with a minimal local runner.

If durable execution is needed, Trigger.dev is a strong future candidate: TypeScript-native, supports background jobs, retries, queues, long-running tasks, observability, and self-hosting.

Temporal may be considered later for heavier distributed durable execution, but is likely too heavy for the early phase.

### Agent Orchestration

Do not introduce a generic agent orchestration framework as the first dependency.

If workflows later require dynamic agent graphs, multi-agent coordination, checkpointed agent state, or complex human-in-the-loop agent reasoning, then Mastra or LangGraph may be introduced as adapter-backed runners.

### Low-Code Canvas

Do not start with a visual workflow canvas.

If a visual graph editor is needed later, React Flow or a similar UI library may be used only as a presentation and editing layer. The UI canvas should not define the workflow execution model.

## Success Criteria

### Near-Term Success

- Clear architecture boundaries maintained across all layers
- `Thought` and `Message` domain primitives implemented
- Project goal and progress documents kept current
- Context brief handoff validated between Claude Code and ChatGPT
- Claude Code development workflow validated on small features
- ConnectorPort and CapabilityRegistry design completed
- Notion reference connector design completed with clear MVP and deferred scope
- RunnerPort design completed
- Claude Code runner design completed
- WorkflowPort design completed
- First Notion + runner workflow designed
- Framework reuse strategy documented
- External framework dependencies remain behind adapters
- Human approval and audit included in connector and workflow design
- No full SaaS SDK hub, full Notion wrapper, generic workflow engine, or low-code canvas prematurely built

### Long-Term Success

- Creators can capture thoughts and messages through CreatorMesh
- Creators can organize personal knowledge through connected tools
- Creators can turn ideas into structured projects and actionable plans
- Creators can use agents and workflows to produce outputs across domains
- Creators can ship products with less friction and more control
- Multiple external tools can be connected through consistent connector capabilities
- Multiple runners can execute tasks through a stable RunnerPort
- Workflows can move from local execution to durable execution backends without rewriting product semantics
- Long-tail integrations can be supported through MCP-compatible adapters or optional integration hubs
- CreatorMesh remains product-driven rather than framework-driven
- The platform remains extensible, auditable, and controllable as it grows

## One-Sentence Summary

CreatorMesh is a personal agent operating system for independent creators, turning thoughts and messages into structured knowledge, plans, actions, workflows, and shipped products through a controllable, extensible, human-in-the-loop creator workbench — owning its product abstractions while reusing external ecosystems through replaceable adapters.
