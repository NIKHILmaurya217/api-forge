# APIforge — UI Addendum for College Mini Project

## Design Goal

Make APIforge look like a clean, practical student-built developer tool rather than a generic AI/SaaS template.

This is **not about disguising AI authorship or evading detection**. The goal is to make the UI genuinely match the project's small academic scope and actual functionality.

## Visual Style

Use:

- Neutral white/slate background
- One restrained blue accent
- Simple cards with moderate borders/radius
- Normal readable typography
- Clear headings
- Practical tables
- Small charts
- Subtle loading/transition animations
- Real data only

Avoid:

- Excessive glassmorphism
- Neon purple/blue gradients
- Animated particle backgrounds
- 3D AI/brain graphics
- Huge "AI" text
- Excessive rounded cards
- Fake statistics
- Marketing slogans
- Dozens of dashboard widgets
- Decorative elements that do not serve a function

## Navigation

Keep it to:

```text
APIforge

Dashboard
Playground
Models
History

About
```

Do not add enterprise-style sections such as billing, teams, organizations, governance, observability, etc.

## Dashboard

Only display actual project metrics:

```text
Total Requests
Average Latency
Available Free Models
Fallbacks
```

Charts:

- Request activity
- Complexity distribution
- Model usage

Before any request exists, show:

```text
No requests have been recorded yet.
Send your first request from Playground.
```

Do not fabricate metrics such as "99.9% accuracy" or "87% cost savings".

## Playground

Make this the primary page.

Use a simple two-column or three-column layout:

```text
┌─────────────────────────────────────────────────────┐
│ Playground                                           │
│ Test APIforge's automatic model selection.          │
├─────────────────────────────┬───────────────────────┤
│ Prompt                      │ Routing Decision       │
│                             │                       │
│ [ prompt editor ]           │ Task: CODING          │
│                             │ Complexity: 64        │
│ [ Analyze & Send ]          │ Level: MEDIUM         │
│                             │                       │
│ Response                    │ Selected Model        │
│                             │                       │
│ AI response                 │ Why this model?      │
│                             │ • Task compatibility │
│                             │ • Complexity fit     │
│                             │ • Context capacity   │
│                             │ • Free availability  │
└─────────────────────────────┴───────────────────────┘
```

The **Routing Decision** panel is the main visual demonstration of the project.

## Explainability

Use academic/practical language:

```text
Routing Decision

Task:
CODING

Complexity:
72 / 100 — HIGH

Candidate Models:
3

Selected Model:
<model name>

Selection Factors:
• Task compatibility
• Complexity compatibility
• Context capacity
• Free availability
```

Avoid phrases such as:

```text
AI Decision Engine
Optimal Model Found
Ultimate AI Intelligence
Next-Generation AI
```

Do not claim the selected model is objectively "best". Say that it received the highest score according to APIforge's defined criteria.

## Models Page

Keep model cards simple:

```text
Model Name
Free
Context: 32K
Input: Text
Output: Text

[Use in Playground]
```

Only show metadata actually obtained from OpenRouter.

Do not invent intelligence/coding/creativity percentages.

## History Page

Use a normal table:

```text
Time     Task       Complexity   Model       Latency
-----------------------------------------------------
10:42    Coding     HIGH         Model A     1.8s
10:38    General    LOW          Model B     0.9s
10:31    Math       MEDIUM       Model A     1.2s
```

Clicking a row can show the original request and routing explanation.

## Animation

Allowed:

- Button loading state
- Streaming response
- Small page transition
- Expand/collapse explanation
- Toast notification

Avoid:

- Moving backgrounds
- Floating particles
- Animated gradients
- Large animated statistics
- Excessive hover effects

## Colors

Suggested base:

```text
Background: #F8FAFC
Surface:    #FFFFFF
Text:       #1E293B
Secondary:  #64748B
Border:     #E2E8F0
Accent:     #2563EB
```

Use restrained semantic colors for LOW/MEDIUM/HIGH and success/error.

## Typography

Use a standard readable font stack:

```css
font-family: Inter, ui-sans-serif, system-ui, sans-serif;
```

Suggested sizes:

```text
Page title:    24–28px
Section title: 18–20px
Card title:    15–16px
Body:          14–15px
Metadata:      12–13px
```

## Updated Antigravity UI Prompt

Paste this into Antigravity together with the main implementation plan:

```text
UI REQUIREMENT:

Build APIforge as a clean, practical college software project.

The interface should look like a developer tool / academic application,
not a commercial AI startup landing page.

Do not over-design it.

Avoid:
- excessive gradients
- glassmorphism
- neon colors
- animated backgrounds
- 3D AI graphics
- excessive rounded cards
- fake statistics
- marketing slogans
- unnecessary dashboard widgets

Use:
- neutral background
- white/slate surfaces
- one restrained accent color
- readable typography
- simple navigation
- practical tables
- small charts
- subtle animations
- real data only

Only create these primary sections:

1. Dashboard
2. Playground
3. Models
4. History
5. About

Make Playground the primary screen.

The most important visual component is the Routing Decision panel.

For every request, visibly show:

- Task
- Complexity score
- Complexity level
- Candidate models
- Selected model
- Selection factors
- Response
- Latency
- Fallback status

Use normal academic terminology.

Do not generate fake analytics or fake performance claims.

Do not add UI features that are not supported by the backend.

The interface should look polished but believable for a college mini project.
```

## Final Principle

The UI should communicate:

```text
Real OpenRouter API
        ↓
Real free models
        ↓
Real routing algorithm
        ↓
Real routing explanation
        ↓
Real request history
        ↓
Simple polished interface
```

The project's credibility should come from working functionality and an understandable algorithm, not visual effects.
