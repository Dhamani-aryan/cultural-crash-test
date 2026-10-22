"use client";

import { Line, OrbitControls } from "@react-three/drei";
import { Canvas, useFrame, useThree, type ThreeEvent } from "@react-three/fiber";
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import * as THREE from "three";
import { KIND_LABEL, RELATION_LABEL, visibleGraph, type JudgeGraph, type JudgeGraphEdge, type JudgeGraphNode } from "@/lib/crashtest/judge-graph";
import type { GraphLayout } from "@/lib/crashtest/judge-layout";
import { SLOT_LABEL, type Slot } from "@/lib/crashtest/types";

/**
 * The 3D decision graph. Positions come from the deterministic layout; this file only animates
 * toward them, draws shapes and handles pointers. Shape carries the node kind and colour the
 * state, so colour is never the only signal. Labels, edge names and the inspector are plain DOM
 * in one overlay: React renders them once, and the frame loop only moves them to where their
 * node projects on screen.
 */

const COLOR = { neutral: "#d5d9df", qloo: "#6fa8ff", amber: "#e2a84f", green: "#5fcf95" };

export function nodeColor(n: JudgeGraphNode): string {
  if (n.state === "accepted") return COLOR.green;
  if (n.state === "rejected" || n.state === "uncertain") return COLOR.amber;
  if (n.kind === "final_choice") return COLOR.green;
  if (n.kind === "qloo_evidence") return COLOR.qloo;
  return COLOR.neutral;
}

type Store = Map<string, THREE.Vector3>;

export interface SceneProps {
  graph: JudgeGraph;
  layout: GraphLayout;
  focus: Slot | null;
  reveal: number;
  reduced: boolean;
  inspect: string | null;
  fitKey: number;
  onSelect: (n: JudgeGraphNode) => void;
  inspector: ReactNode;
}

/** How each node and edge should look in the current view; shared by the 3D scene and the overlay. */
function useVisuals({ graph, layout, focus, reveal, inspect }: SceneProps, hover: string | null) {
  return useMemo(() => {
    const view = visibleGraph(graph, focus ?? undefined);
    const inView = new Set(view.nodes.map((n) => n.id));
    const edgesInView = new Set(view.edges.map((e) => e.id));
    const shown = (n: JudgeGraphNode) => inView.has(n.id) && n.step <= reveal;
    const byId = new Map(graph.nodes.map((n) => [n.id, n]));
    const nodes = new Map(
      graph.nodes.map((n) => {
        const active = layout.active.has(n.id);
        const receded = !active && !!focus && n.id !== "brief" && n.id !== "plan";
        // In the overview, changed decisions lead; retained ones stay visible but quieter.
        const quiet = !focus && n.kind === "final_choice" && n.state !== "accepted";
        const opacity = receded ? 0.22 : quiet ? 0.6 : n.state === "rejected" && reveal >= 5 && n.kind === "candidate" ? 0.45 : 1;
        return [
          n.id,
          {
            shown: shown(n),
            opacity,
            label: shown(n) && (!focus || active || n.id === "plan" || n.id === "brief"),
            kicker: focus ? "" : n.kind === "final_choice" ? SLOT_LABEL[n.slot!] : KIND_LABEL[n.kind],
          },
        ];
      }),
    );
    const near = (e: JudgeGraphEdge) => [hover, inspect].some((id) => id && (e.source === id || e.target === id));
    const edges = new Map(
      graph.edges.map((e) => {
        const on = layout.active.has(e.source) && layout.active.has(e.target);
        const visible = edgesInView.has(e.id) && shown(byId.get(e.source)!) && shown(byId.get(e.target)!);
        return [e.id, { visible, strong: on || !focus, label: visible && !!focus && on && near(e) }];
      }),
    );
    return { inView, nodes, edges };
  }, [graph, layout, focus, reveal, inspect, hover]);
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
  visible,
  opacity,
  highlighted,
  onHover,
  onSelect,
}: {
  n: JudgeGraphNode;
  disp: Store;
  visible: boolean;
  opacity: number;
  highlighted: boolean;
  onHover: (id: string | null) => void;
  onSelect: (n: JudgeGraphNode) => void;
}) {
  const group = useRef<THREE.Group>(null);
  const mats = useRef<THREE.MeshStandardMaterial[]>([]);
  const color = nodeColor(n);
  const ringed = n.kind === "final_choice" || n.kind === "plan";
  useFrame((_, dt) => {
    const g = group.current;
    const p = disp.get(n.id);
    if (!g || !p) return;
    g.position.copy(p);
    const k = 1 - Math.exp(-dt * 10);
    g.scale.setScalar(THREE.MathUtils.lerp(g.scale.x, visible ? (highlighted ? 1.25 : 1) : 0.001, k));
    for (const m of mats.current) if (m) m.opacity = THREE.MathUtils.lerp(m.opacity, visible ? opacity : 0, k);
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
      {/* A generous invisible hit area, so small nodes are easy to tap. */}
      <mesh
        onClick={(e: ThreeEvent<MouseEvent>) => {
          e.stopPropagation();
          if (visible) onSelect(n);
        }}
        onPointerOver={() => {
          if (!visible) return;
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

function EdgeLine({ e, disp, visible, strong }: { e: JudgeGraphEdge; disp: Store; visible: boolean; strong: boolean }) {
  const line = useRef<THREE.Object3D & { geometry: { setPositions: (p: number[]) => void }; material: THREE.Material & { opacity: number } }>(null);
  const target = visible ? (strong ? 0.55 : 0.18) : 0;
  useFrame((_, dt) => {
    const a = disp.get(e.source);
    const b = disp.get(e.target);
    if (!a || !b || !line.current) return;
    line.current.geometry.setPositions([a.x, a.y, a.z, b.x, b.y, b.z]);
    const m = line.current.material;
    m.opacity = THREE.MathUtils.lerp(m.opacity, target, 1 - Math.exp(-dt * 10));
  });
  return (
    <Line
      ref={line as never}
      points={[
        [0, 0, 0],
        [0, 0, 0.001],
      ]}
      color={e.relation === "rejected_after_retest" || e.relation === "did_not_support" ? COLOR.amber : "#ffffff"}
      lineWidth={strong ? 1.3 : 1}
      transparent
      opacity={0}
      dashed={e.relation === "rejected_after_retest"}
      dashSize={0.12}
      gapSize={0.1}
    />
  );
}

/** Moves the camera to frame the active path in under half a second. */
function Rig({ layout, fitKey, reduced }: { layout: GraphLayout; fitKey: number; reduced: boolean }) {
  const { camera, size } = useThree();
  const controls = useThree((s) => s.controls) as unknown as { target: THREE.Vector3; update: () => void } | null;
  const anim = useRef<{ t0: number; fromP: THREE.Vector3; toP: THREE.Vector3; fromT: THREE.Vector3; toT: THREE.Vector3 } | null>(null);
  useEffect(() => {
    if (!controls) return;
    const persp = camera as THREE.PerspectiveCamera;
    const half = THREE.MathUtils.degToRad(persp.fov / 2);
    const aspect = size.width / Math.max(size.height, 1);
    const d = Math.max(layout.size[1] / 2 / Math.tan(half), layout.size[0] / 2 / (Math.tan(half) * aspect)) + 1.2;
    const toT = new THREE.Vector3(...layout.center);
    const toP = toT.clone().add(new THREE.Vector3(0.1, 0.16, 1).normalize().multiplyScalar(d));
    anim.current = { t0: performance.now(), fromP: camera.position.clone(), toP, fromT: controls.target.clone(), toT };
  }, [layout, fitKey, controls, camera, size.width, size.height]);
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

type FrameHook = (camera: THREE.Camera, size: { width: number; height: number }, disp: Store) => void;

function Scene(props: SceneProps & { visuals: Visuals; onFrame: FrameHook; onHover: (id: string | null) => void }) {
  const { graph, layout, reduced, inspect, fitKey, onSelect, visuals, onFrame, onHover } = props;
  // Live positions, mutated every frame; held in state so they are stable objects, not refs.
  const [cur] = useState<Store>(() => new Map());
  const [disp] = useState<Store>(() => new Map());
  const [tmp] = useState(() => new THREE.Vector3());

  useFrame((state, dt) => {
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
      if (!reduced) d.x += Math.sin(t * 0.5 + i) * 0.03;
      if (!reduced) d.y += Math.cos(t * 0.4 + i * 1.7) * 0.03;
      disp.set(n.id, d);
    });

    onFrame(state.camera, state.size, disp);
  });

  return (
    <>
      <color attach="background" args={["#141619"]} />
      <fog attach="fog" args={["#141619", 13, 30]} />
      <ambientLight intensity={0.55} />
      <pointLight position={[4, 6, 8]} intensity={40} />
      {graph.edges.map((e) => {
        const v = visuals.edges.get(e.id)!;
        return <EdgeLine key={e.id} e={e} disp={disp} visible={v.visible} strong={v.strong} />;
      })}
      {graph.nodes.map((n) => {
        const v = visuals.nodes.get(n.id)!;
        return <NodeMesh key={n.id} n={n} disp={disp} visible={v.shown} opacity={v.opacity} highlighted={inspect === n.id} onSelect={onSelect} onHover={onHover} />;
      })}
      <Rig layout={layout} fitKey={fitKey} reduced={reduced} />
      <OrbitControls makeDefault enablePan={false} enableDamping minDistance={4} maxDistance={34} />
    </>
  );
}

export default function JudgeGraphScene(props: SceneProps & { onMiss: () => void }) {
  const { onMiss, ...scene } = props;
  const [hover, setHover] = useState<string | null>(null);
  const visuals = useVisuals(scene, hover);
  const overlay = useRef<Map<string, HTMLElement>>(new Map());
  const tmp = useRef(new THREE.Vector3());
  // Called by the scene every frame: move each overlay element to where its node projects.
  const onFrame: FrameHook = (camera, { width, height }, disp) => {
    const v = tmp.current;
    const place = (el: HTMLElement, p: THREE.Vector3) => {
      v.copy(p).project(camera);
      el.style.visibility = v.z > 1 ? "hidden" : "";
      el.style.transform = `translate(${((v.x + 1) / 2) * width}px, ${((1 - v.y) / 2) * height}px)`;
    };
    for (const [key, el] of overlay.current) {
      if (key.startsWith("edge:")) {
        const e = scene.graph.edges.find((x) => x.id === key.slice(5));
        const a = e && disp.get(e.source);
        const b = e && disp.get(e.target);
        if (a && b) place(el, new THREE.Vector3().addVectors(a, b).multiplyScalar(0.5));
      } else if (key === "inspector") {
        // Beside its node, flipped and clamped so the card always stays inside the canvas.
        const p = disp.get(scene.inspect ?? "");
        if (!p) continue;
        v.copy(p).project(camera);
        const [x, y] = [((v.x + 1) / 2) * width, ((1 - v.y) / 2) * height];
        const [w, h] = [el.offsetWidth, el.offsetHeight];
        const left = x + 22 + w < width - 8 ? x + 22 : Math.max(8, x - 22 - w);
        const top = Math.min(Math.max(8, y - h / 2), Math.max(8, height - h - 8));
        el.style.transform = `translate(${left}px, ${top}px)`;
      } else {
        const p = disp.get(key);
        if (p) place(el, p);
      }
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
            <div key={n.id} ref={(el) => keep(n.id, el)} className="absolute left-0 top-0 will-change-transform" style={{ display: v.label ? "block" : "none" }}>
              <div className="w-max max-w-[150px] -translate-x-1/2 translate-y-[18px] text-center leading-tight" style={{ opacity: v.opacity < 0.5 ? 0.55 : 1 }}>
                {v.kicker && <div className="font-mono text-[8.5px] uppercase tracking-[0.1em] text-white/45">{v.kicker}</div>}
                <div className="text-[11px] font-medium text-white/90">{n.label.length > 30 ? `${n.label.slice(0, 29)}…` : n.label}</div>
              </div>
            </div>
          );
        })}
        {scene.graph.edges.map((e) =>
          visuals.edges.get(e.id)!.label ? (
            <div key={e.id} ref={(el) => keep(`edge:${e.id}`, el)} className="absolute left-0 top-0">
              <span className="block -translate-x-1/2 -translate-y-[140%] whitespace-nowrap rounded bg-[#141619]/85 px-1 font-mono text-[9px] text-white/65">
                {RELATION_LABEL[e.relation]}
              </span>
            </div>
          ) : null,
        )}
      </div>
      <div ref={(el) => keep("inspector", el)} className="absolute left-0 top-0 z-10" style={{ display: scene.inspect ? "block" : "none" }}>
        <div className="max-h-[calc(480px-16px)] overflow-auto rounded-lg max-sm:hidden">{scene.inspector}</div>
      </div>
    </div>
  );
}
