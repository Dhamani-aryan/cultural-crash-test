"use client";

import { Line, OrbitControls } from "@react-three/drei";
import { Canvas, useFrame, useThree, type ThreeEvent } from "@react-three/fiber";
import { useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { KIND_LABEL, RELATION_LABEL, visibleGraph, type JudgeGraph, type JudgeGraphEdge, type JudgeGraphNode } from "@/lib/crashtest/judge-graph";
import type { GraphLayout } from "@/lib/crashtest/judge-layout";
import { replayTimes, type ReplayTimeline } from "@/lib/crashtest/judge-replay";
import { SLOT_LABEL, type Slot } from "@/lib/crashtest/types";

/**
 * The 3D decision graph. Positions come from the deterministic layout and the replay from its
 * timeline; this file animates toward them, draws shapes and handles pointers. Shape carries
 * the node kind and colour the state, so colour is never the only signal. Labels are plain DOM
 * in one overlay, placed every frame: clamped inside the canvas, above or below their node,
 * and moved or hidden by priority so no two overlap.
 */

const COLOR = { neutral: "#d5d9df", qloo: "#6fa8ff", amber: "#e2a84f", green: "#5fcf95", select: "#ffffff" };

export function nodeColor(n: JudgeGraphNode): string {
  if (n.state === "accepted") return COLOR.green;
  if (n.state === "rejected" || n.state === "uncertain") return COLOR.amber;
  if (n.kind === "final_choice") return COLOR.green;
  if (n.kind === "qloo_evidence") return COLOR.qloo;
  return COLOR.neutral;
}

type Store = Map<string, THREE.Vector3>;
type NodeVis = (id: string) => { shown: boolean; opacity: number };
type EdgeProgress = (id: string) => number;
type FrameHook = (camera: THREE.Camera, size: { width: number; height: number }, disp: Store, vis: NodeVis, progress: EdgeProgress) => void;

export interface SceneProps {
  graph: JudgeGraph;
  layout: GraphLayout;
  focus: Slot | null;
  timeline: ReplayTimeline;
  /** performance.now() when the replay started; null shows the finished graph. */
  replayStart: number | null;
  reduced: boolean;
  selected: string | null;
  fitKey: number;
  onSelect: (n: JudgeGraphNode) => void;
}

/** How each node and edge looks in the current view, before the replay clock is applied. */
function useVisuals({ graph, layout, focus, selected }: SceneProps, hover: string | null) {
  return useMemo(() => {
    const view = visibleGraph(graph, focus ?? undefined);
    const inView = new Set(view.nodes.map((n) => n.id));
    const edgesInView = new Set(view.edges.map((e) => e.id));
    const nodes = new Map(
      graph.nodes.map((n) => {
        const active = layout.active.has(n.id);
        const receded = !active && !!focus && n.id !== "brief" && n.id !== "plan";
        // In the overview, changed decisions lead; retained ones stay visible but quieter.
        const quiet = !focus && n.kind === "final_choice" && n.state !== "accepted";
        const opacity = receded ? 0.22 : quiet ? 0.6 : 1;
        // Who keeps a label when two would collide.
        const priority =
          n.id === selected ? 0 : n.kind === "plan" ? 1 : n.kind === "final_choice" ? (n.state === "accepted" ? 2 : 3) : n.id === "brief" ? 4 : active ? 5 : 6;
        return [
          n.id,
          {
            inView: inView.has(n.id),
            opacity,
            label: inView.has(n.id) && (!focus || active || n.id === "plan" || n.id === "brief"),
            kicker: focus ? "" : n.kind === "final_choice" ? SLOT_LABEL[n.slot!] : KIND_LABEL[n.kind],
            priority,
          },
        ];
      }),
    );
    const touches = (e: JudgeGraphEdge, id: string | null) => !!id && (e.source === id || e.target === id);
    const edges = new Map(
      graph.edges.map((e) => {
        const on = layout.active.has(e.source) && layout.active.has(e.target);
        return [
          e.id,
          {
            inView: edgesInView.has(e.id),
            strong: on || !focus,
            selected: touches(e, selected),
            label: edgesInView.has(e.id) && !!focus && on && (touches(e, hover) || touches(e, selected)),
          },
        ];
      }),
    );
    return { inView, nodes, edges };
  }, [graph, layout, focus, selected, hover]);
}
type Visuals = ReturnType<typeof useVisuals>;

function Shape({ kind }: { kind: JudgeGraphNode["kind"] }) {
  switch (kind) {
    case "brief":
      return <boxGeometry args={[0.36, 0.36, 0.36]} />;
    case "llm_choice":
      return <sphereGeometry args={[0.22, 28, 18]} />;
    case "qloo_evidence":
      return <capsuleGeometry args={[0.1, 0.3, 6, 14]} />;
    case "candidate":
      return <torusGeometry args={[0.2, 0.035, 10, 36]} />;
    case "test":
      return <octahedronGeometry args={[0.27]} />;
    default:
      return <sphereGeometry args={[kind === "plan" ? 0.3 : 0.21, 28, 18]} />;
  }
}

function NodeMesh({
  n,
  disp,
  vis,
  selected,
  onHover,
  onSelect,
}: {
  n: JudgeGraphNode;
  disp: Store;
  vis: NodeVis;
  selected: boolean;
  onHover: (id: string | null) => void;
  onSelect: (n: JudgeGraphNode) => void;
}) {
  const group = useRef<THREE.Group>(null);
  const halo = useRef<THREE.Mesh>(null);
  const mats = useRef<THREE.MeshStandardMaterial[]>([]);
  const color = nodeColor(n);
  const ringed = n.kind === "final_choice" || n.kind === "plan";
  const shownNow = useRef(false);
  useFrame((_, dt) => {
    const g = group.current;
    const p = disp.get(n.id);
    if (!g || !p) return;
    const { shown, opacity } = vis(n.id);
    shownNow.current = shown;
    g.position.copy(p);
    const k = 1 - Math.exp(-dt * 12);
    g.scale.setScalar(THREE.MathUtils.lerp(g.scale.x, shown ? (selected ? 1.3 : 1) : 0.001, k));
    for (const m of mats.current) if (m) m.opacity = THREE.MathUtils.lerp(m.opacity, shown ? opacity : 0, k);
    if (halo.current) halo.current.visible = selected && shown;
  });
  const mat = (i: number) => (
    <meshStandardMaterial
      ref={(m) => {
        if (m) mats.current[i] = m;
      }}
      color={color}
      emissive={color}
      emissiveIntensity={0.55}
      roughness={0.45}
      transparent
      opacity={0}
    />
  );
  return (
    <group ref={group} scale={0.001}>
      <mesh rotation={n.kind === "qloo_evidence" ? [0, 0, Math.PI / 2] : [0, 0, 0]}>
        <Shape kind={n.kind} />
        {mat(0)}
      </mesh>
      {ringed && (
        <mesh>
          <torusGeometry args={[n.kind === "plan" ? 0.5 : 0.36, 0.022, 8, 48]} />
          {mat(1)}
        </mesh>
      )}
      {/* The selection mark: a thin white ring, not a glow. */}
      <mesh ref={halo} visible={false}>
        <torusGeometry args={[0.52, 0.018, 8, 56]} />
        <meshBasicMaterial color={COLOR.select} transparent opacity={0.9} />
      </mesh>
      {/* A generous invisible hit area, so small nodes are easy to tap. */}
      <mesh
        onClick={(e: ThreeEvent<MouseEvent>) => {
          e.stopPropagation();
          if (shownNow.current) onSelect(n);
        }}
        onPointerOver={() => {
          if (!shownNow.current) return;
          document.body.style.cursor = "pointer";
          onHover(n.id);
        }}
        onPointerOut={() => {
          document.body.style.cursor = "";
          onHover(null);
        }}
      >
        <sphereGeometry args={[0.5, 12, 8]} />
        <meshBasicMaterial transparent opacity={0} depthWrite={false} />
      </mesh>
    </group>
  );
}

/** A line that grows from its source to its target as the replay draws it. */
function EdgeLine({ e, disp, progress, strong, selected }: { e: JudgeGraphEdge; disp: Store; progress: EdgeProgress; strong: boolean; selected: boolean }) {
  const line = useRef<THREE.Object3D & { geometry: { setPositions: (p: number[]) => void }; material: THREE.Material & { opacity: number } }>(null);
  const [end] = useState(() => new THREE.Vector3());
  useFrame(() => {
    const a = disp.get(e.source);
    const b = disp.get(e.target);
    if (!a || !b || !line.current) return;
    const p = progress(e.id);
    end.lerpVectors(a, b, p);
    line.current.geometry.setPositions([a.x, a.y, a.z, end.x, end.y, end.z]);
    line.current.material.opacity = p <= 0 ? 0 : selected ? 0.95 : strong ? 0.55 : 0.18;
  });
  return (
    <Line
      ref={line as never}
      points={[
        [0, 0, 0],
        [0, 0, 0.001],
      ]}
      color={selected ? COLOR.select : e.relation === "rejected_after_retest" || e.relation === "did_not_support" ? COLOR.amber : "#ffffff"}
      lineWidth={selected ? 2 : strong ? 1.3 : 1}
      transparent
      opacity={0}
      dashed={e.relation === "rejected_after_retest"}
      dashSize={0.12}
      gapSize={0.1}
    />
  );
}

/** Frames the active path, or the selected node, in under half a second. */
function Rig({ layout, fitKey, reduced, selected }: { layout: GraphLayout; fitKey: number; reduced: boolean; selected: string | null }) {
  const { camera, size } = useThree();
  const controls = useThree((s) => s.controls) as unknown as { target: THREE.Vector3; update: () => void } | null;
  const anim = useRef<{ t0: number; fromP: THREE.Vector3; toP: THREE.Vector3; fromT: THREE.Vector3; toT: THREE.Vector3 } | null>(null);
  const at = selected ? layout.positions[selected] : undefined;
  useEffect(() => {
    if (!controls) return;
    const persp = camera as THREE.PerspectiveCamera;
    const half = THREE.MathUtils.degToRad(persp.fov / 2);
    const aspect = size.width / Math.max(size.height, 1);
    // A selected node is brought closer, with its neighbours still in view.
    const [w, h] = at ? [8, 5] : layout.size;
    const d = Math.max(h / 2 / Math.tan(half), w / 2 / (Math.tan(half) * aspect)) + 1.2;
    const toT = new THREE.Vector3(...(at ?? layout.center));
    const toP = toT.clone().add(new THREE.Vector3(0.1, 0.16, 1).normalize().multiplyScalar(d));
    anim.current = { t0: performance.now(), fromP: camera.position.clone(), toP, fromT: controls.target.clone(), toT };
  }, [layout, fitKey, controls, camera, size.width, size.height, at]);
  useFrame(() => {
    const a = anim.current;
    if (!a || !controls) return;
    const t = reduced ? 1 : Math.min(1, (performance.now() - a.t0) / 450);
    const k = 1 - Math.pow(1 - t, 3);
    camera.position.lerpVectors(a.fromP, a.toP, k);
    controls.target.lerpVectors(a.fromT, a.toT, k);
    controls.update();
    if (t >= 1) anim.current = null;
  });
  return null;
}

function Scene(props: SceneProps & { visuals: Visuals; onFrame: FrameHook; onHover: (id: string | null) => void }) {
  const { graph, layout, timeline, replayStart, reduced, selected, fitKey, onSelect, visuals, onFrame, onHover } = props;
  // Live positions and the replay clock, mutated every frame; held in state so they are stable objects.
  const [cur] = useState<Store>(() => new Map());
  const [disp] = useState<Store>(() => new Map());
  const [tmp] = useState(() => new THREE.Vector3());
  const [clock] = useState(() => new Map<"t", number>([["t", Infinity]]));
  const times = useMemo(() => replayTimes(timeline), [timeline]);

  const vis: NodeVis = (id) => {
    const v = visuals.nodes.get(id)!;
    const at = times.shownAt.get(id);
    const shown = v.inView && (at === undefined || clock.get("t")! >= at);
    const recede = times.recedeAt.get(id);
    const n = graph.nodes.find((x) => x.id === id)!;
    // Rejected candidates stay prominent until their re-test, then recede.
    const rejected = n.kind === "candidate" && n.state === "rejected" && (recede === undefined || clock.get("t")! >= recede);
    return { shown, opacity: rejected ? Math.min(v.opacity, 0.45) : v.opacity };
  };
  const progress: EdgeProgress = (id) => {
    const v = visuals.edges.get(id)!;
    if (!v.inView) return 0;
    const at = times.edgeAt.get(id);
    const now = clock.get("t")!;
    if (!at) return now === Infinity ? 1 : 0;
    return THREE.MathUtils.clamp((now - at.at) / at.duration, 0, 1);
  };

  useFrame((state, dt) => {
    clock.set("t", replayStart === null ? Infinity : performance.now() - replayStart);
    const k = reduced ? 1 : 1 - Math.exp(-dt * 9);
    const t = state.clock.elapsedTime;
    graph.nodes.forEach((n, i) => {
      // Hidden nodes fold into their decision, so they branch out from it when shown.
      const home = n.slot ? layout.positions[`${n.slot}:final`] : undefined;
      const inView = visuals.inView.has(n.id);
      const target = (inView && layout.positions[n.id]) || home || layout.positions[n.id] || [0, 0, 0];
      let c = cur.get(n.id);
      if (!c) {
        c = new THREE.Vector3(...target);
        cur.set(n.id, c);
      }
      if (inView) c.lerp(tmp.set(...target), k);
      else c.set(...target);
      const d = disp.get(n.id) ?? new THREE.Vector3();
      d.copy(c);
      // A barely-there drift for depth; none when motion is reduced.
      if (!reduced) {
        d.x += Math.sin(t * 0.5 + i) * 0.03;
        d.y += Math.cos(t * 0.4 + i * 1.7) * 0.03;
      }
      disp.set(n.id, d);
    });
    onFrame(state.camera, state.size, disp, vis, progress);
  });

  return (
    <>
      <color attach="background" args={["#141619"]} />
      <fog attach="fog" args={["#141619", 13, 30]} />
      <ambientLight intensity={0.55} />
      <pointLight position={[4, 6, 8]} intensity={40} />
      {graph.edges.map((e) => {
        const v = visuals.edges.get(e.id)!;
        return <EdgeLine key={e.id} e={e} disp={disp} progress={progress} strong={v.strong} selected={v.selected} />;
      })}
      {graph.nodes.map((n) => (
        <NodeMesh key={n.id} n={n} disp={disp} vis={vis} selected={selected === n.id} onSelect={onSelect} onHover={onHover} />
      ))}
      <Rig layout={layout} fitKey={fitKey} reduced={reduced} selected={selected} />
      <OrbitControls makeDefault enablePan={false} enableDamping minDistance={4} maxDistance={34} />
    </>
  );
}

const PAD = 12;
type Rect = { x: number; y: number; w: number; h: number };
const overlaps = (a: Rect, b: Rect) => a.x < b.x + b.w + 4 && b.x < a.x + a.w + 4 && a.y < b.y + b.h + 2 && b.y < a.y + a.h + 2;

export default function JudgeGraphScene(props: SceneProps & { onMiss: () => void }) {
  const { onMiss, ...scene } = props;
  const [hover, setHover] = useState<string | null>(null);
  const visuals = useVisuals(scene, hover);
  const overlay = useRef<Map<string, HTMLElement>>(new Map());
  const tmp = useRef(new THREE.Vector3());

  // Every frame: project each label's anchor, then place labels by priority so none overlap,
  // none leave the canvas, and a label sits above its node in the lower part of the canvas.
  const onFrame: FrameHook = (camera, { width, height }, disp, vis, progress) => {
    const v = tmp.current;
    const project = (p: THREE.Vector3) => {
      v.copy(p).project(camera);
      return { x: ((v.x + 1) / 2) * width, y: ((1 - v.y) / 2) * height, behind: v.z > 1 };
    };
    const placed: Rect[] = [];
    const jobs: { el: HTMLElement; x: number; y: number; priority: number; node: boolean }[] = [];
    for (const [key, el] of overlay.current) {
      if (key.startsWith("edge:")) {
        const id = key.slice(5);
        const e = scene.graph.edges.find((x) => x.id === id);
        const a = e && disp.get(e.source);
        const b = e && disp.get(e.target);
        if (!a || !b || progress(id) < 1) {
          el.style.visibility = "hidden";
          continue;
        }
        const m = project(new THREE.Vector3().addVectors(a, b).multiplyScalar(0.5));
        jobs.push({ el, x: m.x, y: m.y, priority: 9, node: false });
      } else {
        const p = disp.get(key);
        const nv = visuals.nodes.get(key);
        if (!p || !nv?.label || !vis(key).shown) {
          el.style.visibility = "hidden";
          continue;
        }
        const s = project(p);
        // A node off the canvas keeps no label: clamping it in would put it beside another node.
        if (s.behind || s.x < 0 || s.x > width || s.y < 0 || s.y > height) {
          el.style.visibility = "hidden";
          continue;
        }
        jobs.push({ el, x: s.x, y: s.y, priority: nv.priority, node: true });
      }
    }
    jobs.sort((a, b) => a.priority - b.priority);
    for (const j of jobs) {
      const w = j.el.offsetWidth;
      const h = j.el.offsetHeight;
      const below = j.y < height * 0.62;
      const x = Math.min(Math.max(PAD, j.x - w / 2), width - PAD - w);
      const base = j.node ? (below ? j.y + 16 : j.y - 16 - h) : j.y - h / 2;
      const dir = below ? 1 : -1;
      const tries = [0, dir * (h + 4), -dir * (h + 4), dir * 2 * (h + 4)];
      let spot: Rect | null = null;
      for (const off of tries) {
        const y = base + off;
        if (y < PAD || y + h > height - PAD) continue;
        const r = { x, y, w, h };
        if (!placed.some((p) => overlaps(p, r))) {
          spot = r;
          break;
        }
      }
      if (!spot) {
        j.el.style.visibility = "hidden";
        continue;
      }
      placed.push(spot);
      j.el.style.visibility = "visible";
      j.el.style.transform = `translate(${spot.x}px, ${spot.y}px)`;
    }
  };
  const keep = (key: string, el: HTMLElement | null) => {
    if (el) overlay.current.set(key, el);
    else overlay.current.delete(key);
  };
  return (
    <div className="relative h-full w-full">
      <Canvas dpr={[1, 2]} camera={{ fov: 38, position: [0, 1.5, 16] }} onPointerMissed={onMiss} aria-hidden>
        <Scene {...scene} visuals={visuals} onFrame={onFrame} onHover={setHover} />
      </Canvas>
      <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
        {scene.graph.nodes.map((n) => {
          const v = visuals.nodes.get(n.id)!;
          return (
            <div
              key={n.id}
              ref={(el) => keep(n.id, el)}
              className="absolute left-0 top-0 w-max max-w-[150px] text-center leading-tight will-change-transform"
              style={{ visibility: "hidden", opacity: v.opacity < 0.5 ? 0.55 : 1 }}
            >
              {v.kicker && <div className="font-mono text-[8.5px] uppercase tracking-[0.1em] text-white/45">{v.kicker}</div>}
              <div className={`text-[11px] font-medium ${scene.selected === n.id ? "text-white" : "text-white/90"}`}>{n.label.length > 30 ? `${n.label.slice(0, 29)}…` : n.label}</div>
            </div>
          );
        })}
        {scene.graph.edges.map((e) =>
          visuals.edges.get(e.id)!.label ? (
            <div key={e.id} ref={(el) => keep(`edge:${e.id}`, el)} className="absolute left-0 top-0" style={{ visibility: "hidden" }}>
              <span className="block whitespace-nowrap rounded bg-[#141619]/85 px-1 font-mono text-[9px] text-white/65">{RELATION_LABEL[e.relation]}</span>
            </div>
          ) : null,
        )}
      </div>
    </div>
  );
}
