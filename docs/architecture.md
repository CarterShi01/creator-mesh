# CreatorMesh Architecture

CreatorMesh is a personal creator operating system. It helps independent creators turn thoughts, messages, and intentions into structured objects, actions, artifacts, and feedback.

CreatorMesh keeps its internal model below the surface. Users interact with a simple creator-facing mental model — Quest, Object, Action, Output, and Review — while the system internally expands this into runtime execution, creation semantics, knowledge assets, agents, workflows, capabilities, governance, storage, and outputs.

CreatorMesh is not merely:
- a workflow automation tool
- a generic multi-agent framework
- a project management app
- a knowledge base
- a Copilot wrapper

It is a creator operating system that helps users turn intention into objects, actions, artifacts, and feedback.

---

## 1. User-Facing Mental Model

The user-facing mental model has five concepts. These are intentional simplifications. The internal architecture is deeper, but the UI should not expose unnecessary implementation complexity.

### Quest
What am I pursuing?

A Quest is the user-facing expression of a creator's active intention — a project, goal, investigation, or creative pursuit that spans time and produces objects, actions, and artifacts.

### Object
What am I maintaining or evolving?

An Object is anything the creator cares about tracking, growing, and returning to — a document, a codebase, a relationship, a body of work, a skill, or a decision.

### Action
What should happen next?

An Action is a proposed next move — something the system has identified, the creator has decided on, or an agent has produced as a recommendation. Actions may trigger workflow steps, agent runs, or external tool calls.

### Output
What has been produced?

An Output is a materialized artifact — a document, a code change, a note, a slide, a report, or any concrete result the system has produced or the creator has approved.

### Review
How should this be judged, corrected, and evolved?

A Review is feedback applied to an output, action, or object. It closes the loop between what was produced and what was intended. Reviews shape how the creator's knowledge and routines evolve over time.

---

## 2. Full Architecture Panorama

```
User UI / Creator Mental Interface
├── Quest View
├── Object View
├── Action View
├── Output View
└── Review View

triggers / Interaction Entry Layer
├── User Input
├── Thought
├── Message
├── User Action
├── System Signal
├── External Event
└── Input Normalization

runtime / Runtime Execution Loop
├── Runtime Session [placeholder]
├── Context Manager [placeholder]
├── Context Builder [placeholder]
├── Context Compression [placeholder]
├── LLM Loop [placeholder]
├── Tool Invocation Gateway [placeholder]
├── Pause / Resume
├── Permission Gate
├── Runtime Event Log [placeholder]
└── Runtime Recovery [placeholder]

creation / Worldview and Methodological Kernel
├── Subject [placeholder]
├── Desire / Will [placeholder]
├── Quest
├── Value Criteria [placeholder]
├── Language Grounding [placeholder]
├── Object
├── Object Property [placeholder]
├── Object State [placeholder]
├── Object Interface [placeholder]
├── Relation
├── Causal Value Chain [placeholder]
├── Approximation Tree [placeholder]
├── Action
├── Decision [placeholder]
├── ArtifactRef
├── Feedback
├── Object Event [placeholder]
├── Artifact Lineage [placeholder]
└── Creation Methodology [placeholder]

knowledge / Soft Knowledge Layer
├── Domain Knowledge
├── Principles
├── Skills
├── Patterns
├── Examples
├── Checklists
├── Rubrics
├── Prompt Patterns
├── Context Briefs [placeholder]
└── Knowledge Evolution [placeholder]

agents / Role-Based Execution Subjects
├── Research Agent
├── Code Agent
├── Writing Agent
├── Review Agent
├── Career Agent [placeholder]
├── Teaching Agent [placeholder]
├── Product Agent [placeholder]
└── Agent Capability Binding [placeholder]

workflows / Stable Creator Routines
├── Weekly Review
├── Idea Evaluation
├── Book Note Distillation
├── Project Planning
├── Career Decision Review [placeholder]
├── Lesson Plan Generation [placeholder]
├── Code Change Review [placeholder]
└── Workflow Registry [placeholder]

capabilities / Callable Physical and Provider Capabilities
├── runners
│   ├── Claude Code Runner
│   ├── Script Runner [placeholder]
│   ├── Human Runner [placeholder]
│   ├── Codex Runner [placeholder]
│   └── OpenHands / Aider Runner [placeholder]
├── connectors
│   ├── Notion Connector
│   ├── GitHub Connector [placeholder]
│   ├── Gmail Connector [placeholder]
│   ├── Calendar Connector [placeholder]
│   ├── File System Connector [placeholder]
│   ├── Database Connector [placeholder]
│   └── MCP Connector [placeholder]
└── models
    ├── Model Provider Capabilities [placeholder]
    ├── Inference Capabilities [placeholder]
    └── Embedding / Reranking / Vision Models [placeholder]

governance / Policy and Safety Layer
├── Permission Policy
├── Approval Policy
├── Safety Boundary
├── Cost Control [placeholder]
├── Audit Policy [placeholder]
└── Governance Evaluator

storage / Persistence Layer
├── Quest Store [placeholder]
├── Object Store [placeholder]
├── Relation Store [placeholder]
├── Action Store [placeholder]
├── Artifact Store [placeholder]
├── Feedback Store [placeholder]
├── Session Store [placeholder]
├── Event Log Store [placeholder]
└── Audit Store [placeholder]

outputs / Artifact Materialization Layer
├── Document Output
├── Code Output
├── Slide Output [placeholder]
├── Email / Message Draft Output [placeholder]
├── Table / Report Output [placeholder]
├── Image / Visual Output [placeholder]
├── External Write-back Payload [placeholder]
└── Artifact Materializer [placeholder]

shared / Shared Utilities
├── ids
├── time
├── errors
├── validation
└── testing helpers
```

Note on `models`: models provide future callable inference/provider capability. They are not the system brain. The system brain is the combination of creation worldview, runtime loop, session/context, knowledge, agents, capabilities, and feedback.

---

## 3. Layer Responsibilities

### User UI
Exposes the creator-facing mental model: Quest, Object, Action, Output, Review.
It hides low-level runtime and capability details from the user.
The console client (`clients/creator-console`) is the current implementation surface.

### triggers
Receives input from users, external systems, internal thoughts, system events, and scheduled signals.
Turns outside-world events into normalized CreatorMesh trigger signals.
Defines stable input primitives: `Thought` and `Message`.
Does not interpret quests, execute tools, or own workflow logic.
`triggers` has a zero-dependency invariant: it must not import from any higher-level module.

### runtime
Runs the execution loop.
Owns session/context, LLM loop, tool invocation, pause/resume, and permission gating.
Receives already-framed work from workflows and creation-facing flows.
Dispatches steps to agents, runners, and connectors.
Applies governance checks before side effects.
Does not own the worldview, semantic model, or quest framing.

### creation
Owns the worldview and methodological kernel.
Frames intention as Quest, turns language into Objects, maps Relations, proposes Actions, tracks ArtifactRefs, and absorbs Feedback.
Is the semantic and philosophical core of CreatorMesh.
Does not execute tools, dispatch steps, or own runtime session state.

### knowledge
Provides soft reasoning assets: domain knowledge, principles, skills, examples, checklists, rubrics, prompt patterns, and context.
Callable by agents and creation-facing flows.
Is not storage and not the execution loop.
Does not own the worldview — creation does.

### agents
Defines role-based execution subjects.
Agents apply knowledge and request capabilities through runtime.
Agents produce structured outputs within workflow steps.
Agents do not own the worldview and must not bypass governance.

### workflows
Stores stable creator routines — repeatable ways of handling work the creator has decided are worth preserving.
Workflows are not exhaustive per-tool automations and not a replacement for dynamic agent execution.
Dynamic tool choice belongs to the runtime/agent execution path.

### capabilities
Groups callable physical and provider-backed capabilities.
Contains three submodules:
- `runners`: execution environment adapters (Claude Code, human, future Codex/OpenHands)
- `connectors`: external system integrations (Notion, future GitHub, MCP)
- `models`: future inference/provider capabilities [placeholder]

Capabilities are the toolbox, not the brain.
Provider SDKs are isolated inside adapter implementations.
Capabilities do not own the worldview, LLM loop, or session/context.

### governance
Defines safety, approval, permission, cost, and audit policies.
Runtime invokes governance checks on the execution path before side effects.
Governance does not run workflows or dispatch agents.

### storage
Persists long-term state (quests, objects, artifacts, feedback) and runtime state (sessions, events, audit records).
Does not define semantic meaning.
Storage adapters are isolated behind port interfaces.

### outputs
Materializes artifacts produced by agents, workflows, and runtime steps.
Connectors may later deliver or sync outputs to external systems.
Outputs does not own execution logic.

### shared
Contains small reusable utilities only: id generation, time helpers, error utilities, validation, and testing helpers.
Must not become a product or execution layer.

---

## 4. Key Boundaries

### creation vs runtime
Creation owns worldview and semantic direction: framing quests, constructing objects, mapping relations, proposing actions, tracking artifacts, and absorbing feedback.
Runtime owns execution lifecycle: session/context, LLM loop, tool invocation, pause/resume, and permission gating.

### runtime vs agents
Runtime runs the loop and enforces governance.
Agents perform role-based domain reasoning inside the loop.
Runtime dispatches to agents; agents do not call runtime directly.

### agents vs capabilities
Agents decide what they need.
Capabilities provide callable physical/provider abilities.
Runtime mediates execution and governance between agents and capabilities.

### knowledge vs storage
Knowledge defines reusable reasoning assets: principles, skills, examples, checklists, rubrics.
Storage persists knowledge assets and other long-term and runtime state.

### outputs vs connectors
Outputs materializes artifacts into concrete deliverables.
Connectors sync, write, or read from external systems.
A connector may deliver an output, but connectors do not materialize artifacts.

### governance vs runtime permission gate
Governance defines the policy: what is allowed, what requires approval, what is denied.
Runtime invokes governance policy checks on the execution path before side effects occur.

### workflows vs dynamic tool use
Workflows preserve stable creator-approved routines.
Dynamic tool choice and agent-driven decision-making remain part of runtime/agent execution.
Workflows are not exhaustive tool automations.

### models vs system brain
Models provide inference capability as a callable provider resource.
They are not the CreatorMesh brain.
The system brain is the combination of creation worldview, runtime loop, session/context, knowledge, agents, capabilities, and feedback.

---

## 5. Team & Organization Intelligence [placeholder]

CreatorMesh starts as a personal creator operating system, but the same semantic model may later extend to teams and organizations.

The key expansion is:
- individual Subject → team or organization Subject
- personal Quest → shared or organizational Quest
- personal Object → shared work Object
- personal Action → assigned or reviewed Action
- personal Feedback → collaborative Feedback
- personal Review → team review, decision review, or organizational review

These concepts are intentionally centralized here as a future expansion placeholder. They should not be distributed into individual module responsibilities until the team and organization architecture is explicitly designed.

This section does not introduce implementation requirements for the current MVP.

### Team Collaboration [placeholder]
Future semantic extensions for multi-subject operation:
- Team Subject
- Organization Subject
- Shared Quest
- Shared Object
- Stakeholders
- Roles and Responsibilities
- Decision Rights
- Team Feedback
- Alignment State

These are not implemented. They are future semantic extensions. Their concrete module design is intentionally deferred.

### AI-Assisted Judgment [placeholder]
Future capabilities for AI-assisted evaluation and review:
- AI-assisted evaluation
- Judge Agent
- Arbiter Agent
- Critic Agent
- Evaluation Rubrics
- Decision Frameworks
- Decision Rationale
- Human Override

AI-assisted judgment does not mean AI becomes the final authority by default. AI may evaluate, compare, critique, or recommend. Governance and human review decide what can be accepted or executed.

### Transparency and Traceability [placeholder]
Future capabilities for making system behavior auditable and explainable:
- Decision Trace
- Tool Invocation Trace
- Context Snapshot
- Artifact Lineage
- Approval Record
- Audit Export
- Transparency Report

Transparency means the system should eventually explain:
- what context was used
- which agent or model produced a result
- which tools were invoked
- which criteria were applied
- who approved or rejected the outcome
- how feedback changed the system

### Organizational Leverage [placeholder]
Future capabilities for making work more explicit, reviewable, reusable, and improvable:
- Team Review
- Decision Review
- Cross-functional Planning
- Retrospective
- Organization Playbooks
- Organization Efficiency Report
- recurring bottleneck detection
- ownership clarity
- reduced repeated explanation
- reusable operating knowledge

Organizational leverage means making work more explicit, reviewable, reusable, auditable, and improvable.

---

## 6. Implementation Status

The following reflects the current state of the repository. Placeholder concepts are architectural direction, not current behavior.

**Implemented and tested:**
- `triggers` — `Thought` and `Message` primitives, input normalization, zero-dependency invariant enforced by harness
- `runtime` — `Runtime` class, step dispatch (agent/connector/runner steps), input mapping resolution, optional `GovernanceEvaluator` injection, pause/resume via `HumanReviewStep`
- `creation` — module documented and positioned as worldview kernel; implementation of domain types (`Quest`, `CreatorObject`, etc.) is deferred
- `knowledge` — module structured; no knowledge assets implemented yet
- `agents` — `AgentRole` interface defined; `ThoughtAgent` implemented (classifies thoughts via Anthropic API)
- `workflows` — `WorkflowRunnerPort` and `LocalWorkflowRunner` implemented; `ThoughtToNoteWorkflow` defined end-to-end
- `capabilities/runners` — `RunnerPort` defined; `ClaudeCodeRunnerAdapter` implemented (subprocess invocation)
- `capabilities/connectors` — `ConnectorPort` and `CapabilityRegistry` defined; `NotionConnectorAdapter` implemented (search, read, create, append)
- `capabilities/models` — scaffold only; no implementation
- `governance` — `GovernanceEvaluator` implemented (MVP conservative policy: safe-read auto-approved, destructive denied, write/execute gated on prior human review)
- `storage` — module structured; no adapters implemented yet
- `outputs` — module structured; no materializers implemented yet
- `shared` — small utilities present

**Console client (`clients/creator-console`):**
- Phase 1–7 complete: responsive web console, PWA, Tauri shell scaffold, governed runtime bridge, session bridge, architecture consolidation, test infrastructure
- 76 console tests passing
- Tauri native build blocked pending Rust installation

**Test suite (root package):**
- 242 tests passing across smoke, harness layers

Many concepts in the architecture panorama above are marked `[placeholder]`. These represent architectural intent and future direction. They are not implemented in the current codebase.

---

## 7. Architecture Summary

```
Creation decides what should be understood and evolved.
Runtime decides how the system safely runs the execution loop.
Knowledge provides soft reasoning assets.
Agents provide role-based execution subjects.
Workflows preserve stable creator routines.
Capabilities provide callable physical/provider abilities.
Governance provides safety boundaries.
Storage persists long-term and runtime state.
Outputs materializes deliverables.
```

The user sees Quest, Object, Action, Output, and Review.
The system maintains a deeper architecture that keeps these concepts coherent, executable, governed, and improvable over time.
