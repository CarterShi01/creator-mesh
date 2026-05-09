# Cost Control

This document explains why CreatorMesh follows a context-budget-first development style and what that means in practice.

## Context Debt

Every time an AI coding agent starts a session, it must rebuild an understanding of the codebase from scratch.

If the project has no structured entry points, the agent will read raw source files, explore directories, and reason from implementation details. This uses a large number of tokens and produces results that are not reusable in the next session.

This is called context debt.

Context debt grows as the codebase grows. Without a discipline for managing it, each session becomes more expensive than the last.

## Why Repeated Rediscovery Is Expensive

When an agent rediscovers the same information from raw source code in every session:

- More tokens are used than necessary.
- Time is spent reading code that could have been summarized once.
- The agent may miss important constraints or boundaries that are not visible from source code alone.
- Important decisions made in previous sessions are not carried forward.
- The project becomes harder to work on as it grows, not easier.

The solution is to invest once in structured documents that agents can read first.

## The Seven Cost Control Principles

### 1. Interfaces before implementation

Read `INTERFACE.md` before reading source files. A good interface document tells you what a module does without requiring you to read how it does it.

### 2. Plans before edits

Produce a short plan before making changes. Exploratory edits that are later thrown away are expensive. A plan that gets confirmed once is cheaper than three rounds of back-and-forth editing.

### 3. Skills before repeated prompting

If the same type of task is requested more than once, that pattern is a candidate for a reusable skill. Skills reduce the token cost of routine tasks by encoding the method once.

### 4. Summaries before long context

Prefer reading a summary, README, or interface document over loading a full implementation. A one-page summary of a module is almost always sufficient to complete a task in that module.

### 5. Scripts before token-heavy reasoning

If extracting specific information requires reading many files, write a script to extract it instead. A script that runs in one second is cheaper than a context window full of source code.

### 6. Human approval before expensive or risky actions

Pause and confirm before large refactors, cross-boundary changes, deletions, or anything that is hard to reverse. The cost of a confirmation is low. The cost of undoing an unwanted change is high.

### 7. Every expensive session should produce reusable knowledge

After meaningful work, update the relevant README or INTERFACE file, add a summary to `docs/context-map.md`, or suggest a skill. This converts token spend into durable knowledge that makes the next session cheaper.
