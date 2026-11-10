# AGENT INSTRUCTIONS & PROJECT CONTEXT

## 1. Project Overview

- **Project Name:** Pre-thesis Web Graphics Research Platform (`prethesis-web-graphics-research`).
- **Objective:** Build a common Web Portal that provides access to four independent web graphics Proof-of-Concept (PoC) prototypes.
- **Research Scope:** Explore implementation feasibility, interaction capabilities, integration requirements, and browser/device compatibility of four graphical application technologies.
- **Deployment Target:** GitHub Pages (static hosting).
- **Backend/Database:** None. The Pre-thesis implementation is entirely client-side.

## 2. Architecture & Technology Stack

### 2.1. Web Portal

- HTML5, CSS3, and Vanilla JavaScript.
- Provides shared navigation and access to all four modules.
- Keeps module implementations independent.
- May use iframe embedding or other appropriate integration methods depending on module requirements.
- Must support deployment under a GitHub Pages repository URL.
- Avoid unnecessary frontend frameworks and dependencies.

### 2.2. Module 1 – WebGL Graphics

- Native WebGL 2.0.
- Vanilla JavaScript.
- GLSL ES 3.0 Vertex and Fragment Shaders.
- No unnecessary external JavaScript libraries.
- Focus on rendering and interacting with basic 3D graphics.

### 2.3. Module 2 – Graphical Applications

- Unity and C#.
- Unity Web platform build (WebGL target, depending on the Unity version).
- 3D object visualization.
- Orbit camera with 360-degree rotation and bounded zoom.
- PBR materials and basic object customization.

### 2.4. Module 3 – Web Games

- Unity and C#.
- Unity Web platform build (WebGL target, depending on the Unity version).
- Single-room interactive environment.
- WASD movement and mouse-look controls.
- BoxCollider for environment boundaries.
- Physics.Raycast() for object interaction.

### 2.5. Module 4 – AR/VR

- Google `<model-viewer>` for browser-based 3D model visualization and AR experiences.
- 1:1 scale spatial placement, provided that model dimensions and scale are configured correctly.
- Explore WebXR VR feasibility based on browser and device compatibility.
- Do not assume that all browsers and devices support the same AR/VR features.

## 3. Project Architecture Rules

### 3.1. Context Isolation

- When working on a specific module, avoid modifying files belonging to other modules unless explicitly required.
- Shared portal files and common assets may be modified when necessary for integration.
- Preserve the independence of each module.
- Do not combine all four modules into one application or introduce unnecessary dependencies between them.

### 3.2. Relative Path Enforcement

- Prefer relative paths (`./` and `../`) for HTML, CSS, JavaScript, models, and other local assets.
- Avoid root-absolute paths that may break deployment under a GitHub Pages repository URL.
- Verify resource paths when integrating modules into the portal.

### 3.3. Dependency Restrictions

- Do not introduce React, Vue, Next.js, or other frontend frameworks.
- Do not introduce backend services, databases, or unnecessary NPM packages.
- Use external libraries only when explicitly required by the module specification or approved by the user.

### 3.4. Code Quality & Educational Comments

- Write readable, modular, and beginner-friendly code. Prefer clarity over cleverness or premature optimization.
- Use meaningful variable and function names and keep functions focused on one clear responsibility.
- **Prioritize educational comments in source code**, especially for WebGL, GLSL shaders, 3D mathematics, Unity/C#, physics, raycasting, and WebXR concepts.
- At the beginning of a non-trivial function, explain its purpose, inputs, outputs (if any), important side effects, and role in the execution flow.
- Before non-obvious code blocks, explain **why the logic is necessary**, not merely what the next statement does.
- Comment important graphics APIs, coordinate systems, matrix conventions, units, buffer layouts, shader inputs/outputs, lifecycle events, and error-handling decisions.
- For mathematical formulas or transformations, explain what each value represents and the expected visual effect when relevant.
- Keep comments close to the code they explain, accurate after refactoring, and written in clear English.
- Do not comment every trivial statement, repeat obvious code, or add verbose comments that obscure the implementation.
- Avoid unnecessary abstractions and over-engineering.
- Follow the existing coding style and project structure.

### 3.5. Scope Control

- Follow the project objectives and requirements documented in `docs/ARCHITECTURE.md`.
- Follow the relevant module specification in `docs/specs/` when implementing a module.
- Do not introduce features outside the approved Pre-thesis scope without discussing them with the user first.
- If a technical limitation requires changing the planned implementation, explain the limitation and propose an alternative before making significant architectural changes.

## 4. Development Workflow

### 4.1. Before Implementation

Before starting a development task:

1. Read `AGENTS.md` to understand the project rules and constraints.
2. Read `TASKS.md` to understand the current project progress.
3. Read `docs/ARCHITECTURE.md` to understand the system architecture.
4. Read the relevant module specification when working on a specific module.
5. Inspect the existing project structure and relevant source files.
6. Summarize the task requirements and identify affected files.
7. Propose an implementation plan before making broad or architectural changes.

### 4.2. During Implementation

1. Follow the established architecture and technology constraints.
2. Modify only files necessary for the requested task.
3. Preserve existing functionality.
4. Keep the implementation simple and appropriate for the project's research scope.
5. Explain important technical decisions and research concepts, especially when introducing a new graphics API or technique.
6. Add meaningful educational source-code comments as required by Section 3.4.
7. Avoid modifying unrelated modules or documentation.

### 4.3. Task Progress Tracking

- Read `TASKS.md` before starting a development task.
- When starting a task, update its status from `[ ]` to `[/]`.
- After completing and verifying a task, update its status from `[/]` to `[x]`.
- If a task cannot be completed, keep it unchecked or mark it as in progress and explain the reason.
- Only update tasks that were actually addressed during the current task.
- Do not mark dependent or unrelated tasks as completed.
- Do not mark a task as completed unless its expected result has been implemented and verified.
- Keep task descriptions and the existing checklist structure consistent.
- If additional work is identified, propose new tasks before adding them to the checklist. Do not silently expand the approved project scope.
- Include all `TASKS.md` changes in the final task report.

### 4.4. After Implementation

After completing a task:

1. Run available checks and tests relevant to the changes.
2. Verify the actual implementation results.
3. Update `TASKS.md` according to the Task Progress Tracking rules.
4. Report all files created, modified, or deleted.
5. Explain the implementation and important technical decisions.
6. Report actual testing results and remaining issues.
7. Do not claim that tests or manual checks were performed if they were not.

### 4.5. Research-Oriented Development & Mentoring

This is an academic **Pre-thesis research and learning project**, not merely a software delivery project. AI agents must act as both software engineers and technical research mentors. Assume the student is learning the specific graphics technology for the first time.

For each substantive graphics implementation task:

1. **Research first:** Explain the relevant theory, core terms, and learning objectives before writing code. Distinguish what the current task demonstrates from topics reserved for future tasks.
2. **Implement incrementally:** Use small, verifiable steps with minimal dependencies. Do not introduce a large black-box implementation without explanation.
3. **Explain the actual code:** Reference the real files, functions, and relevant line ranges. For important functions and APIs, explain their purpose, inputs/outputs, side effects, execution order, and relationship to Computer Graphics concepts.
4. **Explain why:** Discuss the rationale for major design decisions, the consequences of omitting key logic, and relevant trade-offs or limitations.
5. **Document runtime flow:** Trace how the application initializes, processes data or input, renders output, and responds to relevant events. Distinguish one-time initialization from per-frame operations.
6. **Verify and investigate:** Run relevant tests when possible; explain what each test checks and report only observed results. Provide small, safe, reproducible hands-on experiments, including expected outcomes and their reasons.
7. **Support learning:** End with concise conceptual questions and a separate answer key. Identify concepts to study before the next task.
8. **Record research findings:** For module research tasks, maintain concise notes under `docs/research/` when requested or when the task explicitly calls for research documentation. Include objectives, key concepts, tested observations, limitations, and remaining questions. Do not invent measured results or scholarly references.

Favor clear explanations and commented code over delivering features quickly. However, avoid explaining every trivial HTML tag or punctuation mark; focus on the concepts that help the student understand and maintain the implementation.

## 5. Final Task Report

After completing each development task, provide a summary using the following structure:

### 5.1. Files Changed

- List all files created, modified, or deleted.
- Explain the purpose of each change.

### 5.2. Implementation Explanation

- Explain how the task was implemented.
- Describe the main execution flow and important technical decisions.

### 5.3. Testing & Verification

- List the checks and tests actually performed.
- Report their results.
- Clearly identify any untested functionality or remaining issues.

### 5.4. Learning Notes

- Explain important concepts or technical knowledge introduced during implementation.
- Highlight useful details that help the user understand and maintain the code.

### 5.5. Task Progress

- Identify the tasks updated in `TASKS.md`.
- State their final status.
- Mention any tasks that remain incomplete or blocked.

### 5.6. Code Walkthrough (Required for Implementation Tasks)

- Reference actual source files, functions, and line ranges (verify that references match the final code).
- Explain key logic, APIs, mathematics, execution flow, and important commented sections.
- For non-trivial functions, describe their inputs, outputs, side effects, and why they are needed.
- Distinguish code already implemented from functionality planned for later tasks.

### 5.7. Hands-on Experiments (Required for Research Modules)

- Provide a few small, safe experiments the student can run locally to observe and understand the behavior.
- State the action, expected result, and underlying technical explanation.
- Clearly separate suggested experiments from tests actually executed by the agent.
- Do not leave debugging or experimental changes in production code without approval.

### 5.8. Knowledge Check (Required for Research Modules)

- Provide 3–5 short conceptual questions based on the implemented code.
- Include a separate answer key so the student can self-check after attempting the questions.
- Note the essential concepts to understand before proceeding to the next task.
