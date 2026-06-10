# 3D Component Explorer Gameplan

**Goal**: Evolve the First-Principles Explorer (Zwyppy) from hierarchical text + 2D diagrams + static images into an interactive spatial experience. Users can generate, rotate, inspect, and "disassemble" a 3D representation of the topic that is **directly derived from the first-principles breakdown and its components**.

**Example**: "What is a datacenter made of?" → Rich 3D model of a datacenter. User rotates the building, clicks a cooling tower (maps to a specific breakdown level/component), triggers an "explode" animation that spatially separates power, cooling, compute, and networking subsystems, highlights the corresponding text cards, etc.

This document is a pragmatic, phased implementation plan that respects the existing architecture, monetization model, and "contract-first + structured data" philosophy.

---

## Vision & Success Criteria

### Vision
"Understand anything from first principles — now you can *see* and *manipulate* the hierarchy in space."

The 3D view is not a gimmick or generic model viewer. It is a **first-principles spatialization**:
- Every major mesh/group corresponds to one or more entries in `breakdown[].components` or levels.
- Interactions are bidirectional with the existing Hierarchical Breakdown cards and Mermaid flowchart.
- "Break it down" is a literal, animated action.

### Success Criteria (MVP)
- A user who just ran a breakdown (Pro or credit) sees an "Interactive 3D Model" section.
- The 3D scene is built from the same `BreakdownResult` data (no extra paid generation required for v1).
- Clicking a 3D part highlights/opens the matching `BreakdownCard` (and vice versa).
- An "Explode / Break Down" control spatially separates the model according to the hierarchy.
- Works for the transistor example (and new topics) with reasonable visual fidelity.
- Gated consistently with other Pro visuals; zero extra cost for the initial procedural implementation.
- Lazy-loaded so it does not bloat the main bundle.

### Non-Goals (at least for Phases 0-2)
- High-fidelity photorealistic imported GLB models for every topic (expensive, slow, hard to keep "component-accurate").
- Real-time physics simulation or destructive disassembly in v1.
- WebXR / AR (future horizon).
- User editing of the 3D model.
- Offline / PWA 3D (keep it simple).

---

## Current State Analysis (What We Can Leverage)

The app is unusually well-positioned for this feature:

- **Structured hierarchical data** (`artifacts/first-principles/src/types.ts`, `BreakdownLevel` + `components: string[]`): This is gold for driving a scene graph. Levels already have consistent coloring in `BreakdownCard.tsx`.
- **Existing cross-view synchronization**: `MermaidChart.tsx` (click node → `handleNodeClick` → `setActiveCardId` + scroll). We can reuse/extend the same pattern.
- **Image prompts per level/component**: Can be used later as reference textures, material hints, or for a "generate reference render" button.
- **Pro / credit / free gating logic** already lives in `Home.tsx` (`isPro`, `usedCreditBreakdown`, `canGenerateImages`, `effectiveAiStatus`).
- **Health-aware UX**: AtomSpinner, ImageBlock, and banners already react to the circuit breaker (`aiIsOpen`, `aiIsDegraded`). 3D assembly can follow the same patterns.
- **Example data**: `data/transistorExample.ts` is rich (8 levels, detailed components) — perfect for a high-quality offline demo.
- **Monorepo + codegen discipline**: Any new fields go through `lib/api-spec/openapi.yaml` → orval.
- **Visualization precedent**: Mermaid is rendered dynamically with click handlers and custom theming. We can follow a similar "load a viz lib on demand" approach.
- **Backend resilience**: The hardened `xai-text.ts` (circuit breaker, `withResilience`, `XaiError`) can be reused if we decide to make the 3D scene description an explicit LLM call.

**Gaps today**:
- No Three.js or any 3D runtime.
- No scene graph concept in the data model.
- All current visuals are either vector (Mermaid) or raster (Grok Imagine images).
- Bundle size and WebGL considerations are unaddressed.

---

## Recommended Technical Approach (v1)

**Purely procedural / data-driven 3D built client-side from the existing breakdown JSON.**

Why this is the right starting point:
- Zero marginal xAI cost or latency (the breakdown is already paid for).
- Perfect semantic fidelity — the geometry *is* the components the model just described.
- Fast iteration.
- Works immediately for every topic.
- Easy to make deterministic and robust (graceful fallback when the LLM produces weird coordinates).

Later phases can layer on higher-fidelity assets.

### Core Tech Stack Additions (Frontend only for Phase 1-2)

| Area                  | Choice                              | Notes |
|-----------------------|-------------------------------------|-------|
| 3D Engine             | `three` + `@react-three/fiber` + `@react-three/drei` | Industry standard for React. Excellent DX, OrbitControls, Html overlays, etc. |
| Controls              | `OrbitControls` from drei           | Rotate, zoom, pan. Touch-friendly. |
| Primitives            | Built-in `<boxGeometry>`, `<cylinderGeometry>`, `<sphereGeometry>`, groups | Sufficient for v1. Custom extruded shapes later if needed. |
| Animation             | `useFrame` + simple lerp / `@react-spring/three` (optional) | Keep deps minimal at first. |
| Labels / UI in 3D     | `Html` from drei (portal DOM labels) or 2D overlay synced via raycast/project | HTML labels are crisp and themeable. |
| Bundle strategy       | `React.lazy` + dynamic `import()` for the 3D panel | Critical — Three.js is heavy. |
| Picking / Interaction | `useThree` + raycaster (or `onClick` on meshes via drei events) | Map mesh `userData` back to level + component. |
| Theming               | Reuse existing level color palette from `BreakdownCard.tsx` (`LEVEL_COLORS`) | Consistency is key. |
| Performance           | Instancing for repeated parts, low poly counts, frustum culling (default in three) | Target < 100-150 draw calls. |

**New dev dependencies** (in `artifacts/first-principles/package.json`):
- `three`
- `@react-three/fiber`
- `@react-three/drei`
- `@types/three` (if not bundled)

Add to the root `pnpm-workspace.yaml` catalog if we want to pin versions centrally.

**Do not** add these to the API server or shared libs unless we later do server-side rendering of 3D thumbnails.

---

## Proposed Data Contract Extension

We will add an **optional** `three_d` field to the existing breakdown response. This keeps the change backward-compatible.

### Suggested shape (to be finalized in OpenAPI)

```ts
// In types.ts and generated schemas
export interface ThreeDPart {
  id: string;                    // stable, e.g. "level-2-rack"
  label: string;                 // human readable, shown in 3D
  level?: number;                // link to breakdown[level]
  component?: string;            // the specific component string, if granular
  primitive: 'box' | 'cylinder' | 'sphere' | 'plane' | 'group';
  position: [number, number, number];
  rotation?: [number, number, number];
  scale?: [number, number, number];
  color?: string;                // hex or hsl for theming
  children?: string[];           // child part ids (for groups)
  explodeWeight?: number;        // 0-1 hint for how far this part should fly out in explode mode
  metadata?: Record<string, unknown>;
}

export interface ThreeDScene {
  rootLabel: string;
  parts: ThreeDPart[];
  cameraPresets?: Array<{
    name: string;                // "Overview", "Power Subsystem", "Core"
    position: [number, number, number];
    target: [number, number, number];
  }>;
  upAxis?: 'y' | 'z';
  suggestedExplodeAxis?: [number, number, number];
}
```

In the LLM JSON response this becomes:

```json
{
  ...existing breakdown fields,
  "three_d": { ... }
}
```

**Prompt strategy** (see detailed prompt notes below):
- Make the 3D section **optional** in the schema hint so the model can still return fast text-only answers when appropriate.
- Or generate it in a cheap follow-up call only when the user actually opens the 3D panel (saves tokens on every breakdown).

Update:
- `lib/api-spec/openapi.yaml` (add to the inline response schema or a proper `BreakdownResult` component)
- Regenerate clients
- `artifacts/api-server/src/lib/xai-text.ts` (extend interfaces + parsing)
- `artifacts/first-principles/src/types.ts`
- Backend routes pass the field through

---

## Phased Implementation Plan

### Phase 0: Research Spike & Sandbox (1–3 days, low risk)

**Deliverable**: A working interactive 3D datacenter or transistor **inside the existing mockup-sandbox** (or a new `artifacts/3d-spike/` folder) that demonstrates the core interactions.

**Tasks**:
1. Add the three deps to the sandbox `package.json` (or the main first-principles one behind a feature flag / lazy).
2. Hard-code a reasonable `ThreeDScene` for "datacenter" and "transistor" (or port the transistor breakdown into a scene graph by hand).
3. Build a `ThreeExplorer` component that:
   - Renders the scene with OrbitControls.
   - Has groups per level.
   - Clickable parts that log "would highlight card X".
   - A big "Explode" button that animates `position` offsets on groups.
   - Simple HTML labels floating above key parts.
   - Reset camera, wireframe toggle, level visibility checkboxes.
4. Style it to match the existing dark theme.
5. Document learnings: bundle size impact after lazy load, mobile behavior, animation smoothness, picking reliability.

**Files touched**:
- `artifacts/mockup-sandbox/` (safest place for throwaway experiments)
- Possibly a new `ThreeExplorer.tsx` that will later be moved/copied to the real app.

**Exit criteria**: You can rotate a recognizable object, click a "rack" and see the corresponding hierarchy level conceptually linked, and explode the model into layers.

### Phase 1: Data & Prompting Layer (parallelizable with Phase 0)

1. Design and add the `three_d` schema to `lib/api-spec/openapi.yaml`.
2. Extend the TypeScript interfaces in `xai-text.ts` (`BreakdownResponse`, etc.).
3. Update the main `SYSTEM_PROMPT` + `SCHEMA_HINT` (or create a dedicated 3D prompt section) so the model produces usable spatial data.
4. Add a helper `generateOrEnrich3DSceneWithXai(...)` (optional — can be client-only at first).
5. Run codegen.
6. Update `transistorExample.ts` to include a high-quality hand-authored `three_d` block so the frontend can be developed 100% offline.

**Prompt engineering tips** (put these in the actual system prompt):
- "Output a compact three_d scene graph using only the components and levels already described. Use a consistent scale (e.g. overall model fits in a 10x10x10 box). Prefer simple primitives. For repeated elements (racks, transistors), use one representative instance and note count in metadata rather than duplicating geometry."
- Give the model the list of level titles and components as context so it doesn't invent new entities.
- Ask for `explodeWeight` and camera presets.
- Strongly encourage hierarchical grouping that mirrors the breakdown levels.

### Phase 2: Core 3D Viewer Component (main frontend work)

Create `artifacts/first-principles/src/components/ThreeExplorer.tsx` (and supporting hooks if needed).

**Minimum feature set**:
- Accepts `BreakdownResult` (or the `three_d` slice + full breakdown for linking).
- Lazy-loaded from `Home.tsx`.
- Orbit controls + basic lighting + subtle grid/floor.
- Hierarchical `<group>` structure.
- Raycast picking: on click, compute the closest ancestor part that has a `level` or `component`, then call the existing `handleNodeClick` / `setActiveCardId` logic (or a new `onPartSelect` callback).
- "Explode" mode: a slider or button that applies animated offsets to parts based on `explodeWeight` and depth in the hierarchy. Use a simple spring or requestAnimationFrame lerp.
- Level toggles / visibility (checkboxes or segmented control that hides groups).
- Camera preset buttons (derived from the data or sensible defaults: "Overview", "Fundamentals", "System View").
- Health-aware loading state (reuse patterns from `ImageBlock` and `AtomSpinner`).
- Graceful degradation: if no `three_d` data or WebGL fails, show a nice fallback ("3D data not available for this topic" + the best image_prompt as a static reference, or a "Generate 3D description" button).

**Bidirectional sync** (very important for the "first principles" feel):
- Clicking 3D part → opens/highlights the card (reuse `activeCardId`).
- Expanding a `BreakdownCard` or clicking a Mermaid node → highlight the corresponding 3D part (scale pulse, outline, or temporary label, then fly camera to a good view of it).
- "Isolate this level" action from a card that hides everything else in 3D.

**Integration in `Home.tsx`**:
- After the Flow Diagram section, add a new collapsible or always-visible "Interactive 3D Component Explorer" block (when `result.three_d` exists or when the user is on a paid tier).
- Show a small "Assemble 3D model from breakdown" button if the data is missing (triggers a follow-up generation if we go that route).
- Respect `canGenerateImages || isPro` style gating. For v1 we can be more generous (3D is "free" once the breakdown is paid).

**Files to modify**:
- `Home.tsx` (main integration point + state for explode factor, selected part, etc.)
- New `ThreeExplorer.tsx`
- Possibly a small `useThreeExplorer.ts` hook
- Extend `types.ts`
- Minor updates to `BreakdownCard.tsx` or a new shared `useBreakdownSync` if we want clean two-way communication

### Phase 3: Polish, Gating, and Productionization

- Proper loading / error / empty states that match the rest of the app (health banners, degraded messaging).
- Performance budget: measure and ensure the 3D chunk is < ~800KB gzipped when first loaded.
- Add to the usage receipt / quota display if we later decide 3D "renders" cost something.
- Update the transistor example load path to also populate 3D.
- Mobile: test OrbitControls on touch; consider a "simplified" mode or warning on very small screens.
- Accessibility: `aria-label` on the canvas container, a "View as list" fallback, keyboard-accessible camera presets.
- Error boundary around the 3D panel (WebGL can be finicky).
- Add a small "Powered by Three.js" credit + "Experimental" badge on first release.
- Update `replit.md`, main `README.md`, and the Pricing page copy ("Pro includes interactive 3D component explorers...").

### Phase 4: Advanced / Generative 3D (future, higher cost)

Only after the procedural foundation is solid and loved by users:

- New backend endpoint `/breakdown/3d` or enrichment of the existing one that asks the model (or a dedicated 3D-specialized model) for a much richer scene description.
- Proxy to a real text-to-3D service (Meshy, Tripo, Luma Dream Machine 3D, etc.). Store the resulting GLB URL (similar to how images are stored) and serve it. This would consume a higher "3D credit" or image quota.
- Hybrid mode: Use a generative base mesh for the overall shape + overlay the component-accurate groups/annotations on top (the "first principles" value).
- GLTFExporter support so users can download the current exploded view as a `.glb` for use in Blender, presentations, or 3D printing.
- Curated high-quality models for the most popular topics (transistor, battery, datacenter, jet engine) that we host and annotate with component links.

---

## Prompt Engineering Details

Add to the existing `SCHEMA_HINT` (or a separate 3D hint block):

```json
"three_d": {
  "rootLabel": "string",
  "parts": [
    {
      "id": "string (stable kebab-case)",
      "label": "string (short)",
      "level": "number (optional, links to breakdown level)",
      "component": "string (optional, exact match to one of the components at that level)",
      "primitive": "box|cylinder|sphere|group",
      "position": [0, 0, 0],
      "scale": [1, 1, 1],
      "color": "#hex (optional, will be overridden by level theme in UI)",
      "children": ["child-id-1"],
      "explodeWeight": 0.3
    }
  ],
  "cameraPresets": [...]
}
```

**Important instructions for the model**:
- Only reference levels and components that already exist in the `breakdown` you just produced.
- Keep the total number of parts reasonable (aim for 8–25).
- Use groups heavily to preserve hierarchy.
- For datacenters, buildings, engines, etc., create a sensible spatial layout (don't put everything in a line).
- The frontend will apply beautiful level-based colors and labels; you only need to provide structure and rough spatial relationships.

We can also add a separate, cheaper "regenerate 3D scene" action later (analogous to "Regenerate Gaps").

---

## Monetization, Quotas & Gating

**v1 (procedural)**:
- Available to anyone who successfully received a full breakdown (i.e. paid a credit or is Pro).
- No extra consumption of image quota or topic credits.
- This is a major value-add for the credit and Pro tiers with almost zero marginal cost.

**Later (when we add generative 3D or heavy scene enrichment)**:
- Treat like images: consume from the monthly Pro allowance or require an extra credit.
- Add a new field to the `Account` response and usage tracking (e.g. `threeDRendersThisMonth`).
- Update `images.ts` patterns or create a parallel `three-d.ts` route if we proxy real model generation.

Update copy in `Pricing.tsx` and the navbar quota badges.

---

## Risks & Mitigations

| Risk | Mitigation |
|------|------------|
| LLM produces unusable scene data (bad positions, too many parts, invented components) | Strong prompt constraints + robust client-side builder with sensible defaults and validation. Fall back to a simple stacked "levels" visualization. |
| Bundle size explosion | Strict lazy loading + tree-shaking. Measure in Phase 0. Consider `three` subset builds if needed. |
| Poor performance on low-end devices / Replit previews | Limit part count in prompt. Add a "Quality" toggle (low poly). Detect WebGL2 / device pixel ratio. |
| WebGL not available or blocked | Beautiful fallback using existing images + a textual "spatial hierarchy" view. |
| User confusion ("why does my datacenter look like Lego?") | Clear labeling + "This is a schematic 3D representation derived from the first-principles breakdown" microcopy. Offer "Generate higher-fidelity render" (future). |
| Sync between 3D / Mermaid / cards gets out of sync | Centralize selection state in Home.tsx (or a small context/zustand slice). Make the mapping functions pure and well-tested. |
| Accessibility / legal (some users can't use 3D) | First-class keyboard + list-based navigation of the same data. Never make 3D the only way to consume the content. |

---

## Testing & Example Data Strategy

1. **Offline-first development**: Heavily extend `TRANSISTOR_EXAMPLE` with a complete, beautiful `three_d` block. The "Load transistor example" button should immediately show a great 3D experience.
2. Add 1–2 more curated examples (datacenter, lithium battery, jet engine) as static data for demos and testing.
3. In the mockup-sandbox, allow pasting arbitrary breakdown JSON + three_d and instantly seeing the viewer (huge for prompt iteration).
4. Add a debug toggle (behind `isAdmin` or a URL param) that shows the raw `three_d` JSON and a "Rebuild from JSON" button.
5. E2E: After a real breakdown, the 3D section appears, explode works, clicking parts updates the active card.

---

## Open Questions (to resolve before or during Phase 0)

- Should the 3D data be generated in the **same** xAI call as the breakdown, or only on-demand when the user first interacts with the 3D panel (cheaper, and the user has already shown interest)?
- Do we want a "regenerate 3D layout" button even in the procedural version (useful if the spatial arrangement is bad)?
- Target maximum part count and polygon budget per scene?
- For very abstract topics (e.g. "quantum entanglement", "first principles thinking" itself), what is the graceful fallback? A beautiful abstract 3D graph?
- Should we support a "side-by-side" or "before/after" 3D comparison when the user asks for gaps/innovation?
- Long-term: Do we ever want to let users upload their own 3D reference models (or links) and have the system annotate them with the breakdown?

---

## Suggested File / Component Map (when implemented)

```
artifacts/first-principles/src/
├── components/
│   ├── ThreeExplorer.tsx          # NEW - the main lazy component
│   ├── ThreePart.tsx              # optional small mesh wrapper
│   └── ...
├── data/
│   └── transistorExample.ts       # ENHANCED with three_d
├── lib/
│   └── api.ts                     # possibly new generate3D... helper
├── pages/
│   └── Home.tsx                   # INTEGRATION + state
└── types.ts                       # EXTENDED

lib/api-spec/openapi.yaml          # EXTENDED
artifacts/api-server/src/lib/xai-text.ts  # EXTENDED
```

Also consider a small self-contained debug page (like the existing `/api/debug/ai-circuit` pattern) for 3D scene data during development.

---

## Timeline & Effort (Rough)

- **Phase 0 (Spike)**: 1–3 days
- **Phase 1 (Contract + Prompts + Example data)**: 2–4 days
- **Phase 2 (Core viewer + basic sync)**: 5–8 days
- **Phase 3 (Polish, gating, docs, mobile, perf)**: 3–5 days
- **Total to usable v1 behind Pro/credit**: ~2–4 weeks of focused work (can be parallelized somewhat)

This is a high-leverage feature. Once the foundation is in, every new topic automatically gets a spatial view for "free."

---

## Next Steps (Recommended)

1. Review and refine this gameplan (especially the data shape and prompt strategy).
2. Run a quick Phase 0 spike in the mockup-sandbox to validate Three.js + R3F ergonomics and bundle cost in this specific Vite/Replit environment.
3. Decide on the "same-call vs on-demand 3D data" question.
4. Start with extending the transistor example + OpenAPI change — this unblocks parallel frontend and backend work.

This feature has the potential to be the standout differentiator of the product: turning rigorous textual first-principles analysis into something you can literally *turn in your hands and take apart*.

---

*Document created for the First-Principles Explorer / Zwyppy project. Update as decisions are made.*