# Context Architecture

This document explains how CreatorMesh is structured for efficient AI-assisted development.

## The Core Idea

Software can be understood as a tree of interfaces.

At the top of the tree is the project's purpose and architecture. Below that are modules with clear boundaries. Each module has a public interface that describes what it does. Inside the interface is the implementation.

An AI coding agent does not need to read the whole tree to complete most tasks. It needs to read the path from the top of the tree to the specific leaf it is working on.

CreatorMesh is structured to make this path explicit and cheap to follow.

## Context Reading Order

When starting work on any task, read in this order:

1. **`AGENTS.md`**  
   Project purpose, rules, reading order, cost control principles, and prohibited defaults. This is the entry point for every session.

2. **`docs/context-map.md`** (if it exists)  
   A living summary of the current state of the project. What exists, what is in progress, what decisions have been made recently. This prevents rediscovery.

3. **`docs/architecture.md`**  
   The architectural layers of the system and the design direction. This tells you how the system is organized and where new code belongs.

4. **Target directory `README.md`**  
   The purpose and boundaries of the specific module you are working in. What belongs here, what does not, and how it fits into the architecture.

5. **Target directory `INTERFACE.md`** (if it exists)  
   The public types, functions, and contracts exported by the module. This is often sufficient to complete a task without reading implementation files.

6. **Specific implementation files**  
   Only the files directly needed for the task.

This order is designed to answer the question "what do I need to know?" as cheaply as possible.

## The Role of Each Document

### `AGENTS.md`

The project's rulebook for AI agents. Every session starts here. It defines how to read the project, how to plan, and what not to do by default.

### `docs/context-map.md`

A living document that captures the current state of the project. It should be updated after meaningful sessions. It answers the question: "what has happened recently and what should I know before starting work today?"

### `src/<module>/README.md`

A boundary document for each source module. It explains what the module is for, what belongs inside it, and what does not. It prevents code from drifting into the wrong layer.

### `src/<module>/INTERFACE.md`

A contract document for each source module. It describes the types and functions that other modules are allowed to depend on. Reading this is usually sufficient to understand how to interact with a module without reading its implementation.

### Skills

Reusable task patterns encoded once and invoked by name. Skills reduce the token cost of routine operations. When a task is performed more than once, consider whether it should become a skill.

## Why This Structure Works

Without structured entry points, an AI agent must rediscover the project from raw source files in every session. This is expensive and unreliable.

With structured entry points, an agent can build a correct understanding of the project by reading a small number of high-signal documents before touching any implementation file.

The goal is to make each session start fast, stay focused, and produce results that are easy to review.
