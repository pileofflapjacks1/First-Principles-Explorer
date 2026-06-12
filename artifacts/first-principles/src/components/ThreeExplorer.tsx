import React, { useRef, useState, Suspense } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Html, useGLTF } from '@react-three/drei';
import * as THREE from 'three';
import type { BreakdownResult, ThreeDScene, ThreeDPart } from '../types';

// Simple procedural builder from breakdown data (highest impact, zero extra tokens).
// Falls back to building groups from levels + components if no three_d provided.
function buildSceneFromBreakdown(result: BreakdownResult): ThreeDScene {
  if (result.three_d) return result.three_d;

  const parts: ThreeDPart[] = [];
  const levels = result.breakdown;

  levels.forEach((level, idx) => {
    const y = (levels.length / 2 - idx) * 1.2;
    const baseScale = 2.5 - idx * 0.15;

    // Use slightly better primitives than pure boxes for "real" feel
    const primitive: ThreeDPart['primitive'] = idx % 3 === 0 ? 'cylinder' : idx % 2 === 0 ? 'cone' : 'box';

    parts.push({
      id: `level-${level.level}`,
      label: level.title,
      level: level.level,
      primitive,
      position: [0, y, 0],
      scale: [baseScale, 0.9, baseScale],
      color: level.level === 1 ? '#a78bfa' : level.level <= 3 ? '#60a5fa' : level.level <= 5 ? '#f472b6' : '#4ade80',
      explodeWeight: 0.2 + (idx * 0.08),
      metadata: { components: level.components }
    });

    // Add sub-components as smaller attached parts for better visual hierarchy
    level.components.slice(0, 2).forEach((comp, cidx) => {
      parts.push({
        id: `level-${level.level}-comp-${cidx}`,
        label: comp,
        level: level.level,
        component: comp,
        primitive: 'sphere',
        position: [ (cidx - 0.5) * 1.2, y + 0.6, 0.8 ],
        scale: [0.35, 0.35, 0.35],
        color: '#f1f5f9',
        explodeWeight: 0.6 + (idx * 0.05),
      });
    });
  });

  return {
    rootLabel: result.topic,
    parts,
    cameraPresets: [
      { name: "Overview", position: [0, 3, 10], target: [0, 0, 0] },
      { name: "Fundamentals", position: [0, 6, 3], target: [0, 2, 0] },
      { name: "Device View", position: [5, 0, 5], target: [0, -1, 0] }
    ],
    suggestedExplodeAxis: [0, 1, 0]
  };
}

interface ThreeExplorerProps {
  result: BreakdownResult;
  activeCardId: string | null;
  onPartSelect?: (level?: number, component?: string) => void;
}

// Core 3D scene with hierarchical groups, explode, and basic interaction.
// This replaces "simple 3D shapes" with grouped, labeled, explodeable components.
function Scene({ scene, activeCardId, onPartSelect, explodeFactor }: { 
  scene: ThreeDScene; 
  activeCardId: string | null; 
  onPartSelect?: (level?: number, component?: string) => void;
  explodeFactor: number;
}) {
  const groupRefs = useRef<Record<string, THREE.Group>>({});

  // Simple explode animation using the gameplan's explodeWeight + hierarchy
  useFrame(() => {
    Object.entries(groupRefs.current).forEach(([id, group]) => {
      const part = scene.parts.find(p => p.id === id);
      if (!part || !part.explodeWeight) return;

      const baseY = part.position[1];
      const offset = explodeFactor * part.explodeWeight * 2.5;
      group.position.y = baseY + offset;
    });
  });

  const handleClick = (part: ThreeDPart, e: any) => {
    e.stopPropagation();
    onPartSelect?.(part.level, part.component);
  };

  return (
    <>
      <ambientLight intensity={0.6} />
      <directionalLight position={[5, 10, 5]} intensity={0.8} />
      <pointLight position={[-5, -5, -5]} intensity={0.4} color="#a5b4fc" />

      {scene.parts.map((part) => {
        const isActive = activeCardId === `level-${part.level}` || 
                        (part.component && activeCardId?.includes(part.component));
        const color = part.color || (part.level ? `hsl(${(part.level - 1) * 40}, 70%, 60%)` : '#64748b');

        const commonProps = {
          position: part.position,
          scale: part.scale || [1, 1, 1],
          rotation: part.rotation || [0, 0, 0],
          onClick: (e: any) => handleClick(part, e),
        };

        const mesh = (() => {
          switch (part.primitive) {
            case 'cylinder':
              return <cylinderGeometry args={[0.5, 0.5, 1, 32]} />;
            case 'cone':
              return <coneGeometry args={[0.6, 1, 32]} />;
            case 'sphere':
              return <sphereGeometry args={[0.5, 32, 32]} />;
            case 'group':
            default:
              return <boxGeometry args={[1, 0.8, 1]} />; // fallback for groups
          }
        })();

        return (
          <group 
            key={part.id} 
            ref={(ref) => { if (ref) groupRefs.current[part.id] = ref; }}
          >
            <mesh {...commonProps}>
              {mesh}
              <meshPhongMaterial 
                color={isActive ? '#fbbf24' : color} 
                shininess={isActive ? 80 : 30}
                emissive={isActive ? '#451a03' : '#000000'}
              />
            </mesh>

            {/* Labels using Html from drei - crisp and themeable */}
            <Html position={[part.position[0], part.position[1] + 1.2, part.position[2]]} style={{ pointerEvents: 'none' }}>
              <div className="px-2 py-0.5 text-[10px] font-medium rounded bg-black/70 text-white border border-white/20 whitespace-nowrap">
                {part.label}
              </div>
            </Html>

            {/* Render children recursively for groups (hierarchy) */}
            {part.children?.map(childId => {
              const child = scene.parts.find(p => p.id === childId);
              return child ? (
                <mesh key={childId} position={child.position} scale={child.scale || [0.6, 0.6, 0.6]}>
                  <sphereGeometry args={[0.4]} />
                  <meshPhongMaterial color="#e0f2fe" />
                </mesh>
              ) : null;
            })}
          </group>
        );
      })}

      {/* Subtle grid for spatial reference */}
      <gridHelper args={[12, 12, '#334155', '#1e2937']} position={[0, -3, 0]} />
    </>
  );
}

export function ThreeExplorer({ result, activeCardId, onPartSelect }: ThreeExplorerProps) {
  const [explodeFactor, setExplodeFactor] = useState(0);
  const [quality, setQuality] = useState<'high' | 'low'>(() => {
    // Replit-friendly: default lower on preview if detected (via env or userAgent heuristic)
    if (typeof window !== 'undefined' && (window.location.hostname.includes('replit') || navigator.userAgent.includes('Replit'))) {
      return 'low';
    }
    return 'high';
  });
  const scene = React.useMemo(() => buildSceneFromBreakdown(result), [result]);

  const handleReset = () => setExplodeFactor(0);

  // Optional: Load a real GLB model + manifest for "legit" visuals (e.g. Starship).
  // On Replit: Upload your one-time generated GLB to Object Storage, make public, use the URL.
  // Generate the manifest once from your first-principles breakdown (or hardcode for popular topics).
  // This gives real geometry (tanks, engines, tiles) while breakdown components drive labels, selection, explode.
  const modelUrl = null; // e.g. 'https://your-replit-object-storage/.../starship.glb' or public URL
  const gltfManifest = null; // e.g. [{id: 'lox-tank', meshName: 'LOX_Tank', level: 4, ...}, ...] for mapping

  // Replit note: If using modelUrl, host the GLB in Replit Object Storage (create volume, upload, enable public access or use signed URL) and load by full HTTPS URL. 
  // This avoids bundling large assets. Test the load in Replit preview - if slow, fall back to procedural.
  if (modelUrl) {
    return (
      <div className="relative w-full h-[420px] bg-[#0f172a] rounded-xl overflow-hidden border border-[#1e2937]">
        <Canvas camera={{ position: [0, 2, 12], fov: 50 }} style={{ background: 'transparent' }}>
          <Suspense fallback={null}>
            <GltfStarshipScene 
              url={modelUrl} 
              manifest={gltfManifest} 
              activeCardId={activeCardId} 
              onPartSelect={onPartSelect} 
              explodeFactor={explodeFactor} 
              quality={quality}
            />
          </Suspense>
          <OrbitControls enablePan enableZoom enableRotate />
        </Canvas>
        <div className="absolute bottom-3 left-3 right-3 flex items-center gap-3 bg-black/60 backdrop-blur p-2 rounded-lg border border-white/10 text-xs">
          <button onClick={handleReset} className="px-3 py-1 rounded bg-white/10 hover:bg-white/20 transition">Reset View</button>
          <div className="flex-1 flex items-center gap-2">
            <span className="text-white/60">Explode</span>
            <input type="range" min={0} max={1} step={0.01} value={explodeFactor} onChange={(e) => setExplodeFactor(parseFloat(e.target.value))} className="flex-1 accent-[#60a5fa]" />
          </div>
          <button onClick={() => setQuality(q => q === 'high' ? 'low' : 'high')} className="px-2 py-1 rounded bg-white/10 text-[10px]">
            {quality.toUpperCase()}
          </button>
        </div>
      </div>
    );
  }

  // Default: Procedural (zero extra tokens, works immediately on Replit or anywhere). 
  // For Starship "legit" visuals without per-user cost: Use the GLTF path above with a one-time generated/hosted model + manifest from your breakdown.

  return (
    <div className="relative w-full h-[420px] bg-[#0f172a] rounded-xl overflow-hidden border border-[#1e2937]">
      <Canvas camera={{ position: [0, 2, 10], fov: 50 }} style={{ background: 'transparent' }}>
        <Scene 
          scene={scene} 
          activeCardId={activeCardId} 
          onPartSelect={onPartSelect} 
          explodeFactor={explodeFactor} 
        />
        <OrbitControls enablePan enableZoom enableRotate />
      </Canvas>

      {/* Controls - simple but effective */}
      <div className="absolute bottom-3 left-3 right-3 flex items-center gap-3 bg-black/60 backdrop-blur p-2 rounded-lg border border-white/10 text-xs">
        <button 
          onClick={handleReset}
          className="px-3 py-1 rounded bg-white/10 hover:bg-white/20 transition"
        >
          Reset View
        </button>
        <div className="flex-1 flex items-center gap-2">
          <span className="text-white/60">Explode</span>
          <input 
            type="range" 
            min={0} 
            max={1} 
            step={0.01} 
            value={explodeFactor} 
            onChange={(e) => setExplodeFactor(parseFloat(e.target.value))}
            className="flex-1 accent-[#60a5fa]"
          />
        </div>
        <div className="text-white/50 font-mono text-[10px]">
          {result.three_d ? 'Data-driven' : 'Procedural from breakdown'}
        </div>
      </div>

      {/* Click hint */}
      <div className="absolute top-3 right-3 text-[10px] text-white/50 bg-black/40 px-2 py-0.5 rounded">
        Click parts to highlight • Drag to rotate
      </div>
    </div>
  );
}

// Helper to build scene (exported for reuse in examples or future GLTF manifest support)
export { buildSceneFromBreakdown };

// Replit-specific notes (IMPORTANT - you build on Replit):
// - Pure client-side: 3D runs in the visitor's browser (WebGL). Replit Autoscale is ideal - no extra server cost/GPU. 
// - Replit preview: WebGL works in the browser tab, but GPU/CPU limited vs real deploys. Test 3D interactions in preview before pushing. Use low part count or add a "Low Quality" mode for Replit users.
// - Asset hosting for real models (e.g. Starship GLB): Upload .glb to Replit Object Storage (or a public bucket), get a direct URL, pass to useGLTF. Do not import large models in bundle.
// - pnpm on Replit: Overrides remove darwin builds (Replit = linux). In Replit shell: pnpm install works. On your local Mac: may need `pnpm install --ignore-scripts` or edit pnpm-workspace.yaml temporarily for darwin.
// - Bundle/perf: three + @react-three/* is heavy. Lazy load (done in Home via React.lazy + Suspense) is mandatory for Replit deploys. Target <1MB chunk.
// - Zero extra xAI cost for procedural path (reuses breakdown data). For "generate real 3D model" button: one-time cheap generation (external tool or single call), then host GLB.
// - Starship: Use buildProceduralStarship() for immediate demo (recognizable via cylinders/cones/groups). For photoreal: generate one GLB once, use manifest (see below) to map breakdown components to GLB meshes for selection/explode/labels.

// Example: Procedural "legit-ish" Starship builder (better than basic shapes; uses cylinders/cones/groups for recognizable rocket).
// Use this in buildSceneFromBreakdown or as fallback for physical topics.
// For truly legit: Load GLB and overlay groups from a manifest generated from the breakdown (id, label, level, component, position/rotation on the model).
export function buildProceduralStarship(): ThreeDScene {
  // Simplified but recognizable Starship: body, nose, engines, fins, tanks.
  // Maps to hypothetical first-principles breakdown levels (e.g. propulsion, structure, avionics).
  return {
    rootLabel: "SpaceX Starship",
    parts: [
      // Main body / fuselage (tanks + structure)
      { id: "fuselage", label: "Fuselage + Propellant Tanks", level: 3, primitive: "cylinder", position: [0, 0, 0], scale: [1.2, 8, 1.2], color: "#94a3b8", explodeWeight: 0.2, metadata: { components: ["Stainless steel structure", "LOX tank", "Methane tank"] } },
      // Nose / fairing
      { id: "nose", label: "Nose Cone / Payload Fairing", level: 2, primitive: "cone", position: [0, 5, 0], scale: [1.2, 2.5, 1.2], color: "#64748b", explodeWeight: 0.4, metadata: { components: ["Heat shield tiles", "Payload bay"] } },
      // Engine cluster (base)
      { id: "engines", label: "Raptor Engine Cluster", level: 5, primitive: "cylinder", position: [0, -4.5, 0], scale: [1.5, 1.5, 1.5], color: "#1e2937", explodeWeight: 0.8, metadata: { components: ["Raptor engines", "Thrust vectoring", "Propellant feed"] } },
      // Grid fins / control surfaces
      { id: "fins", label: "Grid Fins + Flaps", level: 4, primitive: "box", position: [0, -2, 2], scale: [0.3, 1.5, 2], color: "#475569", explodeWeight: 0.6, metadata: { components: ["Aerodynamic control", "Heat protection"] } },
      // Heat shield (bottom)
      { id: "shield", label: "Heat Shield Tiles", level: 3, primitive: "cylinder", position: [0, -4, 0], scale: [1.3, 0.8, 1.3], color: "#334155", explodeWeight: 0.7, metadata: { components: ["Thermal protection system"] } },
      // Avionics / top section
      { id: "avionics", label: "Avionics + Docking", level: 6, primitive: "sphere", position: [0, 4, 0], scale: [0.8, 0.8, 0.8], color: "#eab308", explodeWeight: 0.5, metadata: { components: ["Flight computers", "Sensors", "Docking port"] } }
    ],
    cameraPresets: [
      { name: "Overview", position: [0, 2, 15], target: [0, 0, 0] },
      { name: "Engines", position: [0, -6, 6], target: [0, -4, 0] },
      { name: "Nose", position: [0, 8, 4], target: [0, 5, 0] }
    ],
    suggestedExplodeAxis: [0, 1, 0]
  };
}

// Replit + low-token path for "legit" Starship (your example):
// 1. Generate a good Starship GLB **once** (use external cheap 3D gen like Meshy free tier, or one low-cost xAI-assisted call + export; do not do per user).
// 2. Upload to Replit Object Storage (attach a volume in your Replit project, upload the .glb, make it publicly accessible or use a direct URL).
// 3. In your breakdown call (or hand-author for demo), have the LLM output three_d with "modelRef": "https://your-replit-object-url/starship.glb" 
//    and a "parts" array/manifest that maps breakdown components to GLB mesh names or approximate positions (e.g. {id: "raptor-cluster", meshName: "Engines", level: 5, component: "Raptor engines", explodeWeight: 0.8}).
// 4. Pass modelUrl and gltfManifest to ThreeExplorer (or hardcode for popular topics like Starship).
// 5. The viewer loads the real geometry (recognizable rocket, tiles, engines) and overlays selectable groups/labels/explode from your first-principles data.
// This gives "legit" visuals with zero per-user tokens after the one-time model. Procedural (buildProceduralStarship) works as fallback/demo with no assets. 
// Test the GLB load URL in Replit preview - if CORS or perf issue, fall back to procedural or host on a CDN.

// Basic GLTF + manifest scene (for when modelUrl is provided). Uses the manifest to create selectable overlays/groups on the loaded model.
function GltfStarshipScene({ url, manifest, activeCardId, onPartSelect, explodeFactor, quality }: any) {
  const { scene } = useGLTF(url);
  // In real use: Clone scene, traverse to find meshes by manifest.meshName, attach userData, make clickable, apply explode offsets based on manifest.
  // For now, render the full model + simple Html labels from manifest.
  return (
    <>
      <primitive object={scene} scale={quality === 'low' ? 0.8 : 1} />
      {manifest && manifest.map((part: any, i: number) => (
        <Html key={i} position={[part.position?.[0] || 0, (part.position?.[1] || 0) + 2, part.position?.[2] || 0]}>
          <div onClick={() => onPartSelect?.(part.level, part.component)} className="cursor-pointer px-1.5 py-0.5 text-[9px] bg-black/70 text-white rounded border border-white/20">
            {part.label}
          </div>
        </Html>
      ))}
    </>
  );
}