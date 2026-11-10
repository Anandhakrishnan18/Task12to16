"use client";

import React, { useState, useEffect, useRef, useCallback, useMemo } from "react";
import Link from "next/link";
import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import * as THREE from "three";
import Confetti from "react-confetti";
import { useWindowSize } from "react-use";
import {
  ArrowLeft,
  Play,
  RotateCcw,
  ArrowRight,
  Clock,
  Sparkles,
  Zap,
  HelpCircle,
  Award,
  Bot,
  ChefHat,
  Flame,
  CheckCircle2,
  X,
} from "lucide-react";
import { useLabAudio } from "@/hooks/useLabAudio";
import { useLMSBridge } from "@/hooks/useLMSBridge";

// ─── STRICT SPECIFICATION CONSTANTS ──────────────────────────────────────────
// Simulated Durations
const DOUGH_DURATION = 2.0;       // 2 seconds
const TOPPING_DURATION = 2.0;     // 2 seconds
const ASSEMBLE_DURATION = 3.0;    // 3 seconds
const BAKE_DURATION = 4.0;        // 4 seconds

// Single Hand: 2s (dough) + 2s (toppings) + 3s (assembly) + 4s (baking) = 11s
const SINGLE_HAND_TOTAL = DOUGH_DURATION + TOPPING_DURATION + ASSEMBLE_DURATION + BAKE_DURATION; // 11.0s

// Double Hand: 2s (dough & toppings parallel) + 3s (assembly) + 4s (baking) = 9s
const DOUBLE_HAND_TOTAL = Math.max(DOUGH_DURATION, TOPPING_DURATION) + ASSEMBLE_DURATION + BAKE_DURATION; // 9.0s

const TIME_SAVED = SINGLE_HAND_TOTAL - DOUBLE_HAND_TOTAL; // 2.0s
const PERCENTAGE_REDUCTION = ((TIME_SAVED / SINGLE_HAND_TOTAL) * 100).toFixed(2); // "18.18"

// ─── GAME SCREENS & STAGES (Exactly Four Screens) ────────────────────────────
type GameScreen = "welcome" | "single_challenge" | "double_challenge" | "results";
type SingleStage = "prepare" | "assemble" | "bake" | "completed";
type DoubleStage = "prep_and_assemble" | "bake" | "completed";

// ═════════════════════════════════════════════════════════════════════════════
// 3D SIMULATION RIG & SCENE ASSETS
// ═════════════════════════════════════════════════════════════════════════════

// ── ARTICULATED 3D ROBOTIC HAND ──────────────────────────────────────────────
interface RobotHandProps {
  color: string;
  accentColor: string;
  basePosition: [number, number, number];
  isActive: boolean;
  activity: "idle" | "dough" | "toppings" | "assemble" | "bake";
  phaseProgress: number;
}

function RobotHand({
  color,
  accentColor,
  basePosition,
  isActive,
  activity,
  phaseProgress,
}: RobotHandProps) {
  const armRef = useRef<THREE.Group>(null);
  const elbowRef = useRef<THREE.Group>(null);
  const wristRef = useRef<THREE.Group>(null);

  useFrame((state) => {
    if (!armRef.current || !elbowRef.current || !wristRef.current) return;
    const t = state.clock.getElapsedTime();

    if (!isActive) {
      // Parked resting posture
      armRef.current.rotation.y = THREE.MathUtils.lerp(armRef.current.rotation.y, 0, 0.05);
      armRef.current.rotation.z = THREE.MathUtils.lerp(armRef.current.rotation.z, 0.35, 0.05);
      elbowRef.current.rotation.z = THREE.MathUtils.lerp(elbowRef.current.rotation.z, -0.7, 0.05);
      wristRef.current.rotation.x = THREE.MathUtils.lerp(wristRef.current.rotation.x, 0, 0.05);
      return;
    }

    if (activity === "idle") {
      // Subtle idle breathing motion
      armRef.current.rotation.y = THREE.MathUtils.lerp(armRef.current.rotation.y, Math.sin(t * 1.6) * 0.06, 0.1);
      armRef.current.rotation.z = THREE.MathUtils.lerp(armRef.current.rotation.z, 0.18 + Math.sin(t * 2) * 0.04, 0.1);
      elbowRef.current.rotation.z = THREE.MathUtils.lerp(elbowRef.current.rotation.z, -0.4, 0.1);
    } else if (activity === "dough") {
      // Sweeping back and forth rolling pin motion over dough board
      const roll = Math.sin(t * 8);
      armRef.current.rotation.y = THREE.MathUtils.lerp(armRef.current.rotation.y, roll * 0.28 - 0.2, 0.2);
      armRef.current.rotation.z = THREE.MathUtils.lerp(armRef.current.rotation.z, 0.35 + Math.cos(t * 8) * 0.12, 0.2);
      elbowRef.current.rotation.z = THREE.MathUtils.lerp(elbowRef.current.rotation.z, -0.58 + roll * 0.14, 0.2);
      wristRef.current.rotation.x = roll * 0.35;
    } else if (activity === "toppings") {
      // Rapid rhythmic chopping motion over cutting board
      const chop = Math.abs(Math.sin(t * 10));
      armRef.current.rotation.y = THREE.MathUtils.lerp(armRef.current.rotation.y, 0.36 + Math.sin(t * 2) * 0.08, 0.2);
      armRef.current.rotation.z = THREE.MathUtils.lerp(armRef.current.rotation.z, 0.26 + chop * 0.22, 0.3);
      elbowRef.current.rotation.z = THREE.MathUtils.lerp(elbowRef.current.rotation.z, -0.48 - chop * 0.24, 0.3);
      wristRef.current.rotation.x = chop * 0.45;
    } else if (activity === "assemble") {
      // Circular spiral motion spreading sauce and placing cheese
      const swirlX = Math.sin(t * 6) * 0.28;
      const swirlZ = Math.cos(t * 6) * 0.18;
      armRef.current.rotation.y = THREE.MathUtils.lerp(armRef.current.rotation.y, swirlX, 0.2);
      armRef.current.rotation.z = THREE.MathUtils.lerp(armRef.current.rotation.z, 0.32 + swirlZ * 0.14, 0.2);
      elbowRef.current.rotation.z = THREE.MathUtils.lerp(elbowRef.current.rotation.z, -0.52, 0.2);
      wristRef.current.rotation.y = t * 4;
    } else if (activity === "bake") {
      // Smooth transfer towards oven
      const push = Math.sin(phaseProgress * Math.PI);
      armRef.current.rotation.y = THREE.MathUtils.lerp(armRef.current.rotation.y, 0.65 + push * 0.25, 0.15);
      armRef.current.rotation.z = THREE.MathUtils.lerp(armRef.current.rotation.z, 0.22 + push * 0.22, 0.15);
      elbowRef.current.rotation.z = THREE.MathUtils.lerp(elbowRef.current.rotation.z, -0.32 - push * 0.28, 0.15);
    }
  });

  return (
    <group position={basePosition}>
      {/* Base Pedestal */}
      <mesh position={[0, 0.1, 0]}>
        <cylinderGeometry args={[0.3, 0.36, 0.2, 24]} />
        <meshStandardMaterial color="#f8fafc" metalness={0.25} roughness={0.3} />
      </mesh>
      {/* Accent Ring on Base */}
      <mesh position={[0, 0.2, 0]}>
        <cylinderGeometry args={[0.24, 0.24, 0.05, 24]} />
        <meshStandardMaterial color={accentColor} emissive={accentColor} emissiveIntensity={isActive ? 0.35 : 0} />
      </mesh>

      {/* Shoulder Joint Pivot */}
      <group ref={armRef} position={[0, 0.25, 0]}>
        <mesh position={[0, 0.12, 0]}>
          <sphereGeometry args={[0.19, 20, 20]} />
          <meshStandardMaterial color={color} metalness={0.4} roughness={0.3} />
        </mesh>

        {/* Lower Arm Cylinder */}
        <mesh position={[0, 0.6, 0]}>
          <cylinderGeometry args={[0.09, 0.11, 0.8, 16]} />
          <meshStandardMaterial color="#ffffff" metalness={0.2} roughness={0.25} />
        </mesh>
        {/* Accent Striping on Arm */}
        <mesh position={[0, 0.6, 0]}>
          <cylinderGeometry args={[0.1, 0.1, 0.2, 16]} />
          <meshStandardMaterial color={accentColor} />
        </mesh>

        {/* Elbow Joint Pivot */}
        <group ref={elbowRef} position={[0, 1.0, 0]}>
          <mesh position={[0, 0.08, 0]}>
            <sphereGeometry args={[0.15, 16, 16]} />
            <meshStandardMaterial color={color} metalness={0.4} roughness={0.3} />
          </mesh>

          {/* Forearm Segment */}
          <mesh position={[0, 0.45, 0]}>
            <cylinderGeometry args={[0.08, 0.09, 0.65, 16]} />
            <meshStandardMaterial color="#f8fafc" metalness={0.25} roughness={0.3} />
          </mesh>

          {/* Wrist Joint Pivot */}
          <group ref={wristRef} position={[0, 0.78, 0]}>
            <mesh>
              <sphereGeometry args={[0.1, 16, 16]} />
              <meshStandardMaterial color={accentColor} metalness={0.5} roughness={0.2} />
            </mesh>

            {/* Modular Hand Tool End-Effector */}
            <group position={[0, 0.16, 0]}>
              {activity === "dough" ? (
                // Dough Rolling Pin tool
                <group rotation={[0, 0, Math.PI / 2]}>
                  <mesh>
                    <cylinderGeometry args={[0.065, 0.065, 0.46, 16]} />
                    <meshStandardMaterial color="#fcd34d" roughness={0.6} />
                  </mesh>
                  <mesh position={[0, -0.27, 0]}>
                    <cylinderGeometry args={[0.03, 0.03, 0.1, 12]} />
                    <meshStandardMaterial color="#b45309" />
                  </mesh>
                  <mesh position={[0, 0.27, 0]}>
                    <cylinderGeometry args={[0.03, 0.03, 0.1, 12]} />
                    <meshStandardMaterial color="#b45309" />
                  </mesh>
                </group>
              ) : activity === "toppings" ? (
                // Chef Chopping Knife
                <group rotation={[Math.PI / 4, 0, 0]}>
                  <mesh position={[0, 0.12, 0]}>
                    <boxGeometry args={[0.035, 0.25, 0.13]} />
                    <meshStandardMaterial color="#cbd5e1" metalness={0.8} roughness={0.2} />
                  </mesh>
                </group>
              ) : activity === "assemble" ? (
                // Sauce & Cheese Spoon
                <group>
                  <mesh position={[0, 0.08, 0]}>
                    <cylinderGeometry args={[0.075, 0.03, 0.13, 16]} />
                    <meshStandardMaterial color="#ef4444" roughness={0.3} />
                  </mesh>
                </group>
              ) : (
                // Friendly 2-finger Robot Gripper
                <group>
                  <mesh position={[-0.06, 0.08, 0]}>
                    <boxGeometry args={[0.03, 0.13, 0.05]} />
                    <meshStandardMaterial color="#64748b" metalness={0.6} roughness={0.2} />
                  </mesh>
                  <mesh position={[0.06, 0.08, 0]}>
                    <boxGeometry args={[0.03, 0.13, 0.05]} />
                    <meshStandardMaterial color="#64748b" metalness={0.6} roughness={0.2} />
                  </mesh>
                </group>
              )}
            </group>
          </group>
        </group>
      </group>
    </group>
  );
}

// ── 3D PIZZA OBJECT (Smooth Visual Morphing) ─────────────────────────────────
interface PizzaVisualProps {
  doughProgress: number;     // 0 (ball) -> 1 (flat crust)
  sauceProgress: number;     // 0 -> 1 (spread)
  cheeseProgress: number;    // 0 -> 1 (sprinkled)
  toppingsProgress: number;  // 0 -> 1 (arranged)
  bakingProgress: number;    // 0 -> 1 (golden baked)
  inOven: boolean;
}

function Pizza3D({
  doughProgress,
  sauceProgress,
  cheeseProgress,
  toppingsProgress,
  bakingProgress,
  inOven,
}: PizzaVisualProps) {
  const pizzaGroupRef = useRef<THREE.Group>(null);

  useFrame(() => {
    if (!pizzaGroupRef.current) return;
    const targetZ = inOven ? -0.9 : 0.15;
    const targetX = inOven ? 1.5 : 0;
    const targetY = inOven ? 0.35 : 0.08;
    pizzaGroupRef.current.position.z = THREE.MathUtils.lerp(pizzaGroupRef.current.position.z, targetZ, 0.1);
    pizzaGroupRef.current.position.x = THREE.MathUtils.lerp(pizzaGroupRef.current.position.x, targetX, 0.1);
    pizzaGroupRef.current.position.y = THREE.MathUtils.lerp(pizzaGroupRef.current.position.y, targetY, 0.1);
  });

  // Dynamic dough size: ball -> flattened disc
  const radius = THREE.MathUtils.lerp(0.35, 0.72, doughProgress);
  const thickness = THREE.MathUtils.lerp(0.35, 0.06, doughProgress);

  // Crust color: raw pale dough -> golden bubbly baked pizza
  const crustColor = useMemo(() => {
    const raw = new THREE.Color("#fed7aa");
    const baked = new THREE.Color("#c2410c");
    return raw.lerp(baked, bakingProgress);
  }, [bakingProgress]);

  // Cheese color: pale mozzarella -> melted golden bubbling cheese
  const cheeseColor = useMemo(() => {
    const rawCheese = new THREE.Color("#fef08a");
    const meltedCheese = new THREE.Color("#fbbf24");
    return rawCheese.lerp(meltedCheese, bakingProgress);
  }, [bakingProgress]);

  return (
    <group ref={pizzaGroupRef} position={[0, 0.08, 0.15]}>
      {/* Pizza Crust Base */}
      <mesh receiveShadow castShadow position={[0, thickness / 2, 0]}>
        <cylinderGeometry args={[radius, radius + 0.04, thickness, 32]} />
        <meshStandardMaterial color={crustColor} roughness={0.7} />
      </mesh>

      {/* Dough Ball Stage Highlight (when starting) */}
      {doughProgress < 0.8 && (
        <mesh position={[0, 0.18 * (1 - doughProgress), 0]}>
          <sphereGeometry args={[0.28 * (1 - doughProgress * 0.7), 16, 16]} />
          <meshStandardMaterial color="#fef3c7" roughness={0.8} />
        </mesh>
      )}

      {/* Tomato Sauce Layer (Expanding circular disc) */}
      {sauceProgress > 0 && (
        <mesh position={[0, thickness + 0.005, 0]}>
          <cylinderGeometry args={[0.62 * sauceProgress, 0.62 * sauceProgress, 0.015, 32]} />
          <meshStandardMaterial color="#dc2626" roughness={0.4} />
        </mesh>
      )}

      {/* Mozzarella Cheese Layer */}
      {cheeseProgress > 0 && (
        <mesh position={[0, thickness + 0.012, 0]}>
          <cylinderGeometry args={[0.58 * cheeseProgress, 0.58 * cheeseProgress, 0.015, 32]} />
          <meshStandardMaterial color={cheeseColor} roughness={0.5} />
        </mesh>
      )}

      {/* Arranged Pizza Toppings (Pepperoni & Bell Peppers & Basil) */}
      {toppingsProgress > 0 && (
        <group position={[0, thickness + 0.02, 0]} scale={[toppingsProgress, toppingsProgress, toppingsProgress]}>
          {/* Pepperoni Slices */}
          {[
            [-0.25, 0, -0.2],
            [0.22, 0, -0.22],
            [-0.2, 0, 0.22],
            [0.26, 0, 0.18],
            [0.0, 0, 0.02],
            [0.35, 0, -0.05],
            [-0.34, 0, 0.0],
          ].map((pos, idx) => (
            <mesh key={`pep-${idx}`} position={pos as [number, number, number]}>
              <cylinderGeometry args={[0.1, 0.1, 0.018, 16]} />
              <meshStandardMaterial color={bakingProgress > 0.5 ? "#7f1d1d" : "#b91c1c"} roughness={0.4} />
            </mesh>
          ))}

          {/* Green Bell Pepper Strips */}
          {[
            [-0.12, 0.012, -0.1],
            [0.14, 0.012, 0.1],
            [-0.1, 0.012, 0.28],
            [0.1, 0.012, -0.28],
          ].map((pos, idx) => (
            <mesh key={`pepp-${idx}`} position={pos as [number, number, number]} rotation={[0, idx * 0.8, 0]}>
              <boxGeometry args={[0.16, 0.02, 0.035]} />
              <meshStandardMaterial color="#16a34a" roughness={0.3} />
            </mesh>
          ))}

          {/* Fresh Basil Leaves */}
          {[
            [0.05, 0.015, -0.15],
            [-0.15, 0.015, 0.12],
          ].map((pos, idx) => (
            <mesh key={`basil-${idx}`} position={pos as [number, number, number]} rotation={[0, idx * 1.5, 0]}>
              <sphereGeometry args={[0.045, 8, 8]} />
              <meshStandardMaterial color="#15803d" />
            </mesh>
          ))}
        </group>
      )}

      {/* Baked Golden Steam & Sparkles */}
      {bakingProgress >= 0.9 && (
        <group position={[0, 0.4, 0]}>
          {[...Array(6)].map((_, i) => (
            <mesh key={i} position={[Math.sin(i * 1.2) * 0.3, (i * 0.08) % 0.4, Math.cos(i * 1.2) * 0.3]}>
              <sphereGeometry args={[0.03, 8, 8]} />
              <meshStandardMaterial color="#fef08a" emissive="#fbbf24" emissiveIntensity={0.8} />
            </mesh>
          ))}
        </group>
      )}
    </group>
  );
}

// ── 3D KITCHEN WORKSTATION & BRICK PIZZA OVEN ────────────────────────────────
function KitchenEnvironment({
  isBaking,
  ovenDoorOpen,
}: {
  isBaking: boolean;
  ovenDoorOpen: boolean;
}) {
  const flameLightRef = useRef<THREE.PointLight>(null);

  useFrame((state) => {
    if (!flameLightRef.current) return;
    const t = state.clock.getElapsedTime();
    flameLightRef.current.intensity = isBaking ? 2.6 + Math.sin(t * 12) * 0.6 : 1.0;
  });

  return (
    <group>
      {/* ── Main Kitchen Counter Island ── */}
      <mesh position={[0, -0.4, 0]}>
        <boxGeometry args={[4.2, 0.8, 2.2]} />
        <meshStandardMaterial color="#fffbeb" roughness={0.5} />
      </mesh>
      {/* Countertop Trim */}
      <mesh position={[0, 0.02, 0]}>
        <boxGeometry args={[4.3, 0.06, 2.3]} />
        <meshStandardMaterial color="#fef3c7" roughness={0.2} metalness={0.1} />
      </mesh>

      {/* ── Left Station: Dough Rolling Marble Board ── */}
      <mesh position={[-1.2, 0.06, 0.15]}>
        <cylinderGeometry args={[0.65, 0.65, 0.03, 32]} />
        <meshStandardMaterial color="#f1f5f9" roughness={0.2} />
      </mesh>
      <mesh position={[-1.2, 0.05, 0.15]}>
        <cylinderGeometry args={[0.68, 0.68, 0.02, 32]} />
        <meshStandardMaterial color="#d97706" roughness={0.7} />
      </mesh>

      {/* ── Right Station: Bamboo Cutting Board & Bowls ── */}
      <mesh position={[1.2, 0.06, 0.15]}>
        <boxGeometry args={[0.95, 0.04, 0.7]} />
        <meshStandardMaterial color="#fbbf24" roughness={0.6} />
      </mesh>
      {/* Sauce Bowl */}
      <mesh position={[0.9, 0.14, 0.6]}>
        <cylinderGeometry args={[0.16, 0.12, 0.14, 16]} />
        <meshStandardMaterial color="#ffffff" />
      </mesh>
      <mesh position={[0.9, 0.18, 0.6]}>
        <cylinderGeometry args={[0.14, 0.14, 0.04, 16]} />
        <meshStandardMaterial color="#dc2626" />
      </mesh>
      {/* Cheese Bowl */}
      <mesh position={[1.3, 0.14, 0.6]}>
        <cylinderGeometry args={[0.16, 0.12, 0.14, 16]} />
        <meshStandardMaterial color="#ffffff" />
      </mesh>
      <mesh position={[1.3, 0.18, 0.6]}>
        <cylinderGeometry args={[0.14, 0.14, 0.04, 16]} />
        <meshStandardMaterial color="#fde047" />
      </mesh>

      {/* ── Center Assembly Pizza Peel Paddle ── */}
      <mesh position={[0, 0.05, 0.15]}>
        <cylinderGeometry args={[0.74, 0.74, 0.02, 32]} />
        <meshStandardMaterial color="#fde68a" roughness={0.6} />
      </mesh>
      {/* Peel Handle */}
      <mesh position={[0, 0.05, 1.0]}>
        <boxGeometry args={[0.08, 0.02, 0.8]} />
        <meshStandardMaterial color="#b45309" roughness={0.7} />
      </mesh>

      {/* ── 3D Brick Pizza Oven (Back Right) ── */}
      <group position={[1.5, 0.35, -0.9]}>
        {/* Oven Base Dome */}
        <mesh position={[0, 0.3, 0]}>
          <cylinderGeometry args={[0.65, 0.72, 0.7, 24]} />
          <meshStandardMaterial color="#ea580c" roughness={0.8} />
        </mesh>
        {/* Dome Cap */}
        <mesh position={[0, 0.7, 0]}>
          <sphereGeometry args={[0.65, 24, 16, 0, Math.PI * 2, 0, Math.PI / 2]} />
          <meshStandardMaterial color="#c2410c" roughness={0.8} />
        </mesh>
        {/* Chimney */}
        <mesh position={[-0.2, 1.0, -0.1]}>
          <cylinderGeometry args={[0.12, 0.14, 0.45, 16]} />
          <meshStandardMaterial color="#9a3412" roughness={0.9} />
        </mesh>
        {/* Oven Mouth Arch */}
        <mesh position={[0, 0.16, 0.58]}>
          <boxGeometry args={[0.64, 0.36, 0.12]} />
          <meshStandardMaterial color="#7c2d12" roughness={0.9} />
        </mesh>
        {/* Dark Inside Cavity */}
        <mesh position={[0, 0.16, 0.5]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.26, 0.26, 0.28, 16]} />
          <meshStandardMaterial color="#1c1917" roughness={0.9} />
        </mesh>
        {/* Internal Fire Light */}
        <pointLight ref={flameLightRef} position={[0, 0.2, 0.3]} color="#f97316" intensity={1.8} distance={2.5} />

        {/* Animated Oven Door */}
        <group position={[0, ovenDoorOpen ? 0.42 : 0.16, 0.65]}>
          <mesh>
            <boxGeometry args={[0.54, 0.28, 0.03]} />
            <meshStandardMaterial color="#475569" metalness={0.7} roughness={0.3} />
          </mesh>
          <mesh position={[0, 0, 0.03]} rotation={[0, 0, Math.PI / 2]}>
            <cylinderGeometry args={[0.02, 0.02, 0.2, 12]} />
            <meshStandardMaterial color="#fbbf24" metalness={0.8} />
          </mesh>
        </group>
      </group>

      {/* ── Floor Grid ── */}
      <mesh position={[0, -0.81, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[14, 10]} />
        <meshStandardMaterial color="#fef9ee" roughness={0.8} />
      </mesh>
    </group>
  );
}

// ═════════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT & STATE MACHINE
// ═════════════════════════════════════════════════════════════════════════════

export default function RobotParallelismLab() {
  const { width, height } = useWindowSize();
  const { playPop, playSuccess } = useLabAudio();
  const { reportComplete } = useLMSBridge("robot-parallelism");

  // Game Navigation State: Exactly 4 Screens
  const [screen, setScreen] = useState<GameScreen>("welcome");
  const [score, setScore] = useState<number>(0);
  const [showHelp, setShowHelp] = useState<boolean>(false);

  // ── Screen 2: Single Hand Challenge State ──
  const [singleStage, setSingleStage] = useState<SingleStage>("prepare");
  const [singleSimTime, setSingleSimTime] = useState<number>(0); // 0.0 to 11.0s
  const [isSingleRunning, setIsSingleRunning] = useState<boolean>(false);

  // ── Screen 3: Double Hand Challenge State ──
  const [doubleStage, setDoubleStage] = useState<DoubleStage>("prep_and_assemble");
  const [doubleSimTime, setDoubleSimTime] = useState<number>(0); // 0.0 to 9.0s
  const [isDoubleRunning, setIsDoubleRunning] = useState<boolean>(false);

  // RAF Timer references
  const timerRef = useRef<number | null>(null);
  const lastTimeRef = useRef<number>(0);

  // ── Derived Single Hand Visual State ──
  const singleInfo = useMemo(() => {
    const t = singleSimTime;
    let handAct: "idle" | "dough" | "toppings" | "assemble" | "bake" = "idle";
    let subTask = "Ready to Prepare";
    let doughP = 0;
    let sauceP = 0;
    let cheeseP = 0;
    let toppingsP = 0;
    let bakingP = 0;
    let inOven = false;

    if (t > 0 && t < DOUGH_DURATION) {
      // 0s to 2s: Dough Prep (Sequential Step 1)
      handAct = "dough";
      subTask = "Hand 1: Flattening and rolling dough (2.0s)...";
      doughP = t / DOUGH_DURATION;
    } else if (t >= DOUGH_DURATION && t < DOUGH_DURATION + TOPPING_DURATION) {
      // 2s to 4s: Topping Prep (Sequential Step 2)
      handAct = "toppings";
      subTask = "Hand 1: Slicing peppers & chopping toppings (2.0s)...";
      doughP = 1;
      toppingsP = (t - DOUGH_DURATION) / TOPPING_DURATION;
    } else if (t >= DOUGH_DURATION + TOPPING_DURATION && t < DOUGH_DURATION + TOPPING_DURATION + ASSEMBLE_DURATION) {
      // 4s to 7s: Assembly
      handAct = "assemble";
      subTask = "Hand 1: Spreading sauce, sprinkling cheese & toppings (3.0s)...";
      doughP = 1;
      const aT = t - (DOUGH_DURATION + TOPPING_DURATION);
      sauceP = Math.min(1, aT / 1.0);
      cheeseP = Math.min(1, Math.max(0, (aT - 0.8) / 1.2));
      toppingsP = Math.min(1, Math.max(0, (aT - 1.5) / 1.5));
    } else if (t >= DOUGH_DURATION + TOPPING_DURATION + ASSEMBLE_DURATION && t < SINGLE_HAND_TOTAL) {
      // 7s to 11s: Baking
      handAct = "bake";
      subTask = "Baking inside the brick pizza oven (4.0s)...";
      doughP = 1;
      sauceP = 1;
      cheeseP = 1;
      toppingsP = 1;
      inOven = true;
      const bT = t - (DOUGH_DURATION + TOPPING_DURATION + ASSEMBLE_DURATION);
      bakingP = Math.min(1, bT / BAKE_DURATION);
      if (bT >= BAKE_DURATION - 0.6) inOven = false;
    } else if (t >= SINGLE_HAND_TOTAL) {
      doughP = 1;
      sauceP = 1;
      cheeseP = 1;
      toppingsP = 1;
      bakingP = 1;
      subTask = "Single Hand Challenge Complete! Total Time: 11.0s";
    }

    return { handAct, subTask, doughP, sauceP, cheeseP, toppingsP, bakingP, inOven };
  }, [singleSimTime]);

  // ── Derived Double Hand Visual State ──
  const doubleInfo = useMemo(() => {
    const t = doubleSimTime;
    let hand1Act: "idle" | "dough" | "toppings" | "assemble" | "bake" = "idle";
    let hand2Act: "idle" | "dough" | "toppings" | "assemble" | "bake" = "idle";
    let subTask = "Ready to Prepare & Assemble";
    let hand1Progress = 0;
    let hand2Progress = 0;
    let doughP = 0;
    let sauceP = 0;
    let cheeseP = 0;
    let toppingsP = 0;
    let bakingP = 0;
    let inOven = false;

    const prepTime = 2.0;

    if (t > 0 && t < prepTime) {
      // 0s to 2s: PARALLEL PREPARATION (Hand 1 rolls dough WHILE Hand 2 chops toppings)
      hand1Act = "dough";
      hand2Act = "toppings";
      hand1Progress = t / prepTime;
      hand2Progress = t / prepTime;
      subTask = "PARALLEL! Hand 1 rolls dough WHILE Hand 2 chops toppings (2.0s)!";
      doughP = t / prepTime;
      toppingsP = t / prepTime;
    } else if (t >= prepTime && t < prepTime + ASSEMBLE_DURATION) {
      // 2s to 5s: COLLABORATIVE ASSEMBLY (Both hands build together)
      hand1Act = "assemble";
      hand2Act = "assemble";
      hand1Progress = 1;
      hand2Progress = 1;
      subTask = "Collaborative Assembly: Both hands build the pizza together (3.0s)!";
      doughP = 1;
      const aT = t - prepTime;
      sauceP = Math.min(1, aT / 1.0);
      cheeseP = Math.min(1, Math.max(0, (aT - 0.8) / 1.2));
      toppingsP = Math.min(1, Math.max(0, (aT - 1.2) / 1.5));
    } else if (t >= prepTime + ASSEMBLE_DURATION && t < DOUBLE_HAND_TOTAL) {
      // 5s to 9s: Baking in the oven
      hand1Act = "bake";
      hand2Act = "bake";
      hand1Progress = 1;
      hand2Progress = 1;
      subTask = "Baking inside the brick pizza oven (4.0s)...";
      doughP = 1;
      sauceP = 1;
      cheeseP = 1;
      toppingsP = 1;
      inOven = true;
      const bT = t - (prepTime + ASSEMBLE_DURATION);
      bakingP = Math.min(1, bT / BAKE_DURATION);
      if (bT >= BAKE_DURATION - 0.6) inOven = false;
    } else if (t >= DOUBLE_HAND_TOTAL) {
      doughP = 1;
      sauceP = 1;
      cheeseP = 1;
      toppingsP = 1;
      bakingP = 1;
      hand1Progress = 1;
      hand2Progress = 1;
      subTask = "Double Hand Challenge Complete! Total Time: 9.0s";
    }

    return {
      hand1Act,
      hand2Act,
      subTask,
      hand1Progress,
      hand2Progress,
      doughP,
      sauceP,
      cheeseP,
      toppingsP,
      bakingP,
      inOven,
    };
  }, [doubleSimTime]);

  // ── Screen 2 (Single Hand) Button Handler ──
  const handleSingleActionClick = () => {
    playPop();
    if (isSingleRunning) return;

    if (singleStage === "prepare") {
      // Execute Preparation: 0.0s to 4.0s
      setIsSingleRunning(true);
      lastTimeRef.current = performance.now();
    } else if (singleStage === "assemble") {
      // Execute Assembly: 4.0s to 7.0s
      setIsSingleRunning(true);
      lastTimeRef.current = performance.now();
    } else if (singleStage === "bake") {
      // Execute Baking: 7.0s to 11.0s
      setIsSingleRunning(true);
      lastTimeRef.current = performance.now();
    }
  };

  // ── Screen 3 (Double Hand) Button Handler ──
  const handleDoubleActionClick = () => {
    playPop();
    if (isDoubleRunning) return;

    if (doubleStage === "prep_and_assemble") {
      // Execute Parallel Prep (2s) then Assembly (3s) = 0.0s to 5.0s
      setIsDoubleRunning(true);
      lastTimeRef.current = performance.now();
    } else if (doubleStage === "bake") {
      // Execute Baking: 5.0s to 9.0s
      setIsDoubleRunning(true);
      lastTimeRef.current = performance.now();
    }
  };

  // ── Single Hand Simulation RAF Loop ──
  useEffect(() => {
    if (!isSingleRunning) {
      if (timerRef.current) cancelAnimationFrame(timerRef.current);
      return;
    }

    const tick = (now: number) => {
      const delta = (now - lastTimeRef.current) / 1000;
      lastTimeRef.current = now;

      setSingleSimTime((prev) => {
        const next = prev + delta;

        // Check if current stage target is reached
        if (singleStage === "prepare" && next >= DOUGH_DURATION + TOPPING_DURATION) {
          setIsSingleRunning(false);
          setSingleStage("assemble");
          playSuccess();
          return DOUGH_DURATION + TOPPING_DURATION; // 4.0s
        }
        if (singleStage === "assemble" && next >= DOUGH_DURATION + TOPPING_DURATION + ASSEMBLE_DURATION) {
          setIsSingleRunning(false);
          setSingleStage("bake");
          playSuccess();
          return DOUGH_DURATION + TOPPING_DURATION + ASSEMBLE_DURATION; // 7.0s
        }
        if (singleStage === "bake" && next >= SINGLE_HAND_TOTAL) {
          setIsSingleRunning(false);
          setSingleStage("completed");
          playSuccess();
          return SINGLE_HAND_TOTAL; // 11.0s
        }

        return next;
      });

      timerRef.current = requestAnimationFrame(tick);
    };

    lastTimeRef.current = performance.now();
    timerRef.current = requestAnimationFrame(tick);

    return () => {
      if (timerRef.current) cancelAnimationFrame(timerRef.current);
    };
  }, [isSingleRunning, singleStage, playSuccess]);

  // ── Double Hand Simulation RAF Loop ──
  useEffect(() => {
    if (!isDoubleRunning) {
      if (timerRef.current) cancelAnimationFrame(timerRef.current);
      return;
    }

    const tick = (now: number) => {
      const delta = (now - lastTimeRef.current) / 1000;
      lastTimeRef.current = now;

      setDoubleSimTime((prev) => {
        const next = prev + delta;

        // Check if "prep_and_assemble" target (2s + 3s = 5s) is reached
        if (doubleStage === "prep_and_assemble" && next >= 2.0 + ASSEMBLE_DURATION) {
          setIsDoubleRunning(false);
          setDoubleStage("bake");
          playSuccess();
          return 2.0 + ASSEMBLE_DURATION; // 5.0s
        }
        // Check if "bake" target (9.0s) is reached
        if (doubleStage === "bake" && next >= DOUBLE_HAND_TOTAL) {
          setIsDoubleRunning(false);
          setDoubleStage("completed");
          playSuccess();
          return DOUBLE_HAND_TOTAL; // 9.0s
        }

        return next;
      });

      timerRef.current = requestAnimationFrame(tick);
    };

    lastTimeRef.current = performance.now();
    timerRef.current = requestAnimationFrame(tick);

    return () => {
      if (timerRef.current) cancelAnimationFrame(timerRef.current);
    };
  }, [isDoubleRunning, doubleStage, playSuccess]);

  // ── Navigation Transitions between the 4 Screens ──
  const goToScreen = (target: GameScreen) => {
    playPop();
    if (timerRef.current) cancelAnimationFrame(timerRef.current);
    setIsSingleRunning(false);
    setIsDoubleRunning(false);
    setScreen(target);

    if (target === "results") {
      playSuccess();
      setScore(100);
      reportComplete({ points: 100 });
    }
  };

  const handleResetCurrent = () => {
    playPop();
    if (timerRef.current) cancelAnimationFrame(timerRef.current);
    if (screen === "single_challenge") {
      setIsSingleRunning(false);
      setSingleStage("prepare");
      setSingleSimTime(0);
    } else if (screen === "double_challenge") {
      setIsDoubleRunning(false);
      setDoubleStage("prep_and_assemble");
      setDoubleSimTime(0);
    }
  };

  const handleFullReplay = () => {
    playPop();
    if (timerRef.current) cancelAnimationFrame(timerRef.current);
    setIsSingleRunning(false);
    setIsDoubleRunning(false);
    setSingleStage("prepare");
    setSingleSimTime(0);
    setDoubleStage("prep_and_assemble");
    setDoubleSimTime(0);
    setScreen("welcome");
  };

  // Helper formatting for live timer
  const formatSeconds = (sec: number) => {
    const s = sec.toFixed(1);
    return `${s}s`;
  };

  // Active timer for top bar display
  const activeDisplayTime =
    screen === "single_challenge"
      ? `${formatSeconds(singleSimTime)} / 11.0s`
      : screen === "double_challenge"
      ? `${formatSeconds(doubleSimTime)} / 9.0s`
      : screen === "results"
      ? "11.0s vs 9.0s"
      : "0.0s";

  // ═════════════════════════════════════════════════════════════════════════════
  // RENDER INTERFACE (STRICT 100% LIGHT THEME & STATIC VIEWPORT)
  // ═════════════════════════════════════════════════════════════════════════════

  return (
    <div className="w-full h-[100dvh] max-h-[100dvh] overflow-hidden select-none flex flex-col bg-gradient-to-b from-[#FFFDF8] via-[#FEF9EE] to-[#F7F2E4] text-slate-800 font-sans">
      
      {/* ── 1. TOP BAR ── */}
      <header className="w-full h-13 px-4 bg-white/95 border-b border-amber-200/90 shadow-xs flex items-center justify-between shrink-0 z-40">
        {/* Left: Back Button, Brand Icon & Game Title */}
        <div className="flex items-center gap-3 min-w-0">
          <Link href="/">
            <button
              className="w-8 h-8 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200 flex items-center justify-center transition cursor-pointer shadow-xs"
              title="Back to All Labs"
            >
              <ArrowLeft size={16} strokeWidth={2.4} />
            </button>
          </Link>

          <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-amber-400 to-orange-400 p-0.5 shadow-xs flex items-center justify-center text-white">
            <ChefHat size={18} strokeWidth={2.4} />
          </div>

          <div className="min-w-0">
            <h1 className="text-sm sm:text-base font-black text-amber-950 truncate tracking-tight">
              Pizza Making Challenge
            </h1>
            <span className="hidden sm:inline-block text-[10px] font-bold text-amber-700 uppercase tracking-wider">
              Sequential vs. Parallel Processing
            </span>
          </div>
        </div>

        {/* Center: Live Timer & Score */}
        <div className="flex items-center gap-2 sm:gap-3">
          <div className="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-amber-50/90 border border-amber-300 text-amber-950 shadow-xs">
            <Clock size={15} className="text-amber-600" />
            <div className="flex flex-col text-left leading-none">
              <span className="text-[9px] font-black uppercase text-amber-800">SIMULATION TIMER</span>
              <span className="text-xs font-black font-mono tracking-wider">{activeDisplayTime}</span>
            </div>
          </div>

          <div className="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-emerald-50 border border-emerald-300 text-emerald-950 shadow-xs">
            <Award size={15} className="text-emerald-600" />
            <div className="flex flex-col text-left leading-none">
              <span className="text-[9px] font-black uppercase text-emerald-800">SCORE</span>
              <span className="text-xs font-black font-mono tracking-wider">{score} pts</span>
            </div>
          </div>
        </div>

        {/* Right: Restart & Help */}
        <div className="flex items-center gap-1.5 sm:gap-2">
          <button
            onClick={handleResetCurrent}
            className="w-8 h-8 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 flex items-center justify-center transition cursor-pointer"
            title="Reset Current Challenge"
          >
            <RotateCcw size={16} />
          </button>

          <button
            onClick={() => {
              playPop();
              setShowHelp(true);
            }}
            className="w-8 h-8 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 flex items-center justify-center transition cursor-pointer"
            title="Help"
          >
            <HelpCircle size={16} />
          </button>
        </div>
      </header>

      {/* ── 2. CENTRAL 3D PIZZA KITCHEN AREA ── */}
      <main className="relative flex-1 min-h-0 w-full overflow-hidden flex flex-col justify-center items-center">
        
        {/* 3D React Three Fiber Kitchen Canvas */}
        <div className="w-full h-full relative">
          <Canvas
            shadows
            camera={{ position: [0, 2.3, 5.8], fov: 46 }}
            style={{ background: "transparent" }}
          >
            <ambientLight intensity={0.9} color="#fffbeb" />
            <directionalLight
              position={[4, 6, 3]}
              intensity={1.4}
              castShadow
              shadow-mapSize-width={1024}
              shadow-mapSize-height={1024}
              color="#fef3c7"
            />
            <pointLight position={[-3, 3, 2]} intensity={0.6} color="#e0f2fe" />
            <pointLight position={[3, 2, -1]} intensity={0.5} color="#dcfce7" />

            {/* 3D Kitchen Counter & Brick Oven */}
            <KitchenEnvironment
              isBaking={
                (screen === "single_challenge" && singleStage === "bake" && isSingleRunning) ||
                (screen === "double_challenge" && doubleStage === "bake" && isDoubleRunning)
              }
              ovenDoorOpen={
                (screen === "single_challenge" && singleInfo.inOven) ||
                (screen === "double_challenge" && doubleInfo.inOven)
              }
            />

            {/* 3D Morphing Pizza Object */}
            <Pizza3D
              doughProgress={screen === "double_challenge" ? doubleInfo.doughP : singleInfo.doughP}
              sauceProgress={screen === "double_challenge" ? doubleInfo.sauceP : singleInfo.sauceP}
              cheeseProgress={screen === "double_challenge" ? doubleInfo.cheeseP : singleInfo.cheeseP}
              toppingsProgress={screen === "double_challenge" ? doubleInfo.toppingsP : singleInfo.toppingsP}
              bakingProgress={screen === "double_challenge" ? doubleInfo.bakingP : singleInfo.bakingP}
              inOven={screen === "double_challenge" ? doubleInfo.inOven : singleInfo.inOven}
            />

            {/* Robotic Hand 1 (Solo in Single Hand, Left in Double Hand) */}
            <RobotHand
              color={screen === "single_challenge" ? "#f97316" : "#0284c7"}
              accentColor={screen === "single_challenge" ? "#fdba74" : "#38bdf8"}
              basePosition={[-1.4, 0, 0.2]}
              isActive={screen !== "welcome"}
              activity={screen === "double_challenge" ? doubleInfo.hand1Act : singleInfo.handAct}
              phaseProgress={screen === "double_challenge" ? doubleInfo.hand1Progress : singleSimTime / SINGLE_HAND_TOTAL}
            />

            {/* Robotic Hand 2 (Visible only in Double Hand Challenge & Results) */}
            {(screen === "double_challenge" || screen === "results" || screen === "welcome") && (
              <RobotHand
                color="#059669"
                accentColor="#34d399"
                basePosition={[1.4, 0, 0.2]}
                isActive={screen === "double_challenge" || screen === "results"}
                activity={screen === "double_challenge" ? doubleInfo.hand2Act : "idle"}
                phaseProgress={screen === "double_challenge" ? doubleInfo.hand2Progress : 0}
              />
            )}

            <OrbitControls
              enableZoom={false}
              target={[0, 0.75, 0]}
              maxPolarAngle={Math.PI / 2.1}
              minPolarAngle={Math.PI / 4}
              maxAzimuthAngle={Math.PI / 4}
              minAzimuthAngle={-Math.PI / 4}
            />
          </Canvas>

          {/* ── FLOATING LIVE TELEMETRY (Top-Left overlay) ── */}
          {screen === "single_challenge" && (
            <div className="absolute top-3 left-3 z-20 max-w-sm p-3 rounded-2xl bg-white/95 backdrop-blur-md border border-amber-200/90 shadow-md flex flex-col gap-1.5 animate-in fade-in duration-200">
              <div className="flex items-center justify-between gap-2 border-b border-amber-100 pb-1.5">
                <div className="flex items-center gap-1.5">
                  <Bot size={16} className="text-orange-600" />
                  <span className="text-xs font-black uppercase text-slate-800">Single Hand (Sequential)</span>
                </div>
                <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-orange-100 text-orange-800">
                  1 HAND · ONE BY ONE
                </span>
              </div>
              <p className="text-xs font-bold text-slate-700">{singleInfo.subTask}</p>
              <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden mt-1">
                <div
                  className="bg-orange-500 h-full transition-all duration-150"
                  style={{ width: `${(singleSimTime / SINGLE_HAND_TOTAL) * 100}%` }}
                />
              </div>
            </div>
          )}

          {screen === "double_challenge" && (
            <div className="absolute top-3 left-3 z-20 max-w-md p-3 rounded-2xl bg-white/95 backdrop-blur-md border border-emerald-300 shadow-md flex flex-col gap-2 animate-in fade-in duration-200">
              <div className="flex items-center justify-between gap-2 border-b border-emerald-100 pb-1.5">
                <div className="flex items-center gap-1.5">
                  <Zap size={16} className="text-emerald-600" />
                  <span className="text-xs font-black uppercase text-slate-800">Double Hand (Parallel)</span>
                </div>
                <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                  2 HANDS · SIMULTANEOUS!
                </span>
              </div>
              <p className="text-xs font-bold text-slate-700">{doubleInfo.subTask}</p>

              {/* Dual Visual Progress Bars for Hand 1 and Hand 2 */}
              <div className="grid grid-cols-2 gap-2 pt-0.5">
                <div className="p-2 rounded-xl bg-sky-50 border border-sky-200">
                  <div className="flex justify-between text-[10px] font-black text-sky-900 mb-1">
                    <span>HAND 1 (DOUGH)</span>
                    <span>{(doubleInfo.hand1Progress * 100).toFixed(0)}%</span>
                  </div>
                  <div className="w-full bg-sky-200/60 rounded-full h-1.5 overflow-hidden">
                    <div
                      className="bg-sky-500 h-full transition-all duration-100"
                      style={{ width: `${doubleInfo.hand1Progress * 100}%` }}
                    />
                  </div>
                </div>

                <div className="p-2 rounded-xl bg-emerald-50 border border-emerald-200">
                  <div className="flex justify-between text-[10px] font-black text-emerald-900 mb-1">
                    <span>HAND 2 (TOPPINGS)</span>
                    <span>{(doubleInfo.hand2Progress * 100).toFixed(0)}%</span>
                  </div>
                  <div className="w-full bg-emerald-200/60 rounded-full h-1.5 overflow-hidden">
                    <div
                      className="bg-emerald-500 h-full transition-all duration-100"
                      style={{ width: `${doubleInfo.hand2Progress * 100}%` }}
                    />
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* ═════════════════════════════════════════════════════════════════════
            SCREEN 1 – WELCOME TO PIZZA KITCHEN
            ═════════════════════════════════════════════════════════════════════ */}
        {screen === "welcome" && (
          <div className="absolute inset-0 z-30 bg-amber-950/20 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="max-w-lg w-full bg-white/95 backdrop-blur-md rounded-3xl p-6 shadow-2xl border-4 border-amber-300 text-center flex flex-col items-center animate-in zoom-in-95 duration-200">
              <div className="w-16 h-16 rounded-2xl bg-amber-100 border-2 border-amber-300 flex items-center justify-center text-amber-600 mb-3 shadow-inner">
                <ChefHat size={36} />
              </div>

              <h2 className="text-2xl font-black text-amber-950 mb-1 leading-tight">
                Pizza Making Challenge
              </h2>
              <span className="text-xs font-black text-amber-700 uppercase tracking-widest mb-3">
                Sequential vs. Parallel Processing
              </span>

              <p className="text-xs sm:text-sm font-semibold text-slate-600 leading-relaxed mb-5 bg-amber-50/70 p-3.5 rounded-2xl border border-amber-200/80">
                &ldquo;Welcome to Pizza Kitchen! Prepare a delicious pizza using one robotic hand and then using two robotic hands. Discover how working together can save time!&rdquo;
              </p>

              {/* 3-Stage Preview */}
              <div className="grid grid-cols-3 gap-2 w-full mb-6">
                <div className="p-2.5 rounded-xl bg-amber-50 border border-amber-200 flex flex-col items-center">
                  <span className="text-[10px] font-black text-amber-800 uppercase">1. PREPARE</span>
                  <span className="text-[11px] font-bold text-slate-600">Dough & Toppings</span>
                </div>
                <div className="p-2.5 rounded-xl bg-amber-50 border border-amber-200 flex flex-col items-center">
                  <span className="text-[10px] font-black text-amber-800 uppercase">2. ASSEMBLE</span>
                  <span className="text-[11px] font-bold text-slate-600">Sauce & Cheese</span>
                </div>
                <div className="p-2.5 rounded-xl bg-amber-50 border border-amber-200 flex flex-col items-center">
                  <span className="text-[10px] font-black text-amber-800 uppercase">3. BAKE</span>
                  <span className="text-[11px] font-bold text-slate-600">Brick Oven (4s)</span>
                </div>
              </div>

              <button
                onClick={() => goToScreen("single_challenge")}
                className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white font-black text-sm shadow-lg cursor-pointer transition animate-bounce flex items-center justify-center gap-2"
              >
                <span>Start Game</span>
                <ArrowRight size={18} />
              </button>
            </div>
          </div>
        )}

        {/* ═════════════════════════════════════════════════════════════════════
            SCREEN 4 – RESULT AND SUMMARY
            ═════════════════════════════════════════════════════════════════════ */}
        {screen === "results" && (
          <div className="absolute inset-0 z-30 bg-amber-950/20 backdrop-blur-xs flex items-center justify-center p-4">
            <Confetti width={width} height={height} recycle={false} numberOfPieces={250} gravity={0.25} />
            
            <div className="max-w-xl w-full bg-white/95 backdrop-blur-md rounded-3xl p-6 shadow-2xl border-4 border-amber-300 text-center flex flex-col items-center animate-in zoom-in-95 duration-200">
              <div className="w-14 h-14 rounded-2xl bg-amber-100 border-2 border-amber-300 flex items-center justify-center text-amber-500 mb-2 shadow-inner">
                <Sparkles size={32} />
              </div>

              <h2 className="text-2xl font-black text-amber-950 mb-0.5">
                PARALLEL PROCESSING CHAMPION!
              </h2>
              <span className="text-xs font-black text-emerald-600 uppercase tracking-wider mb-3">
                100 Points Earned · Both Challenges Complete
              </span>

              {/* Side-by-Side Comparison Cards */}
              <div className="grid grid-cols-2 gap-3 w-full mb-3 text-left">
                {/* Single Hand */}
                <div className="p-3 rounded-2xl bg-orange-50 border-2 border-orange-200">
                  <span className="text-[10px] font-black uppercase text-orange-800 block">SINGLE HAND (SEQUENTIAL)</span>
                  <div className="text-2xl font-black font-mono text-orange-600 my-0.5">11.0s</div>
                  <ul className="text-[10px] font-semibold text-slate-600 space-y-0.5">
                    <li>• Preparation: 4.0s (Dough 2s + Toppings 2s)</li>
                    <li>• Assembly: 3.0s</li>
                    <li>• Baking: 4.0s</li>
                  </ul>
                </div>

                {/* Double Hand */}
                <div className="p-3 rounded-2xl bg-emerald-50 border-2 border-emerald-300">
                  <span className="text-[10px] font-black uppercase text-emerald-800 block">DOUBLE HAND (PARALLEL)</span>
                  <div className="text-2xl font-black font-mono text-emerald-600 my-0.5">9.0s</div>
                  <ul className="text-[10px] font-semibold text-slate-600 space-y-0.5">
                    <li>• Preparation: 2.0s (Simultaneous!)</li>
                    <li>• Assembly: 3.0s</li>
                    <li>• Baking: 4.0s (Identical oven time)</li>
                  </ul>
                </div>
              </div>

              {/* Time Saved & Percentage Reduction */}
              <div className="w-full p-2.5 rounded-2xl bg-gradient-to-r from-amber-100 via-emerald-100 to-sky-100 border border-emerald-300 flex items-center justify-around mb-3 text-slate-800">
                <div>
                  <span className="text-[10px] font-black uppercase text-slate-500 block">TIME SAVED</span>
                  <span className="text-lg font-black text-emerald-700">{TIME_SAVED.toFixed(1)} Seconds</span>
                </div>
                <div className="h-7 w-px bg-slate-300" />
                <div>
                  <span className="text-[10px] font-black uppercase text-slate-500 block">TIME REDUCTION</span>
                  <span className="text-lg font-black text-amber-700">{PERCENTAGE_REDUCTION}%</span>
                </div>
              </div>

              {/* Educational Explanation */}
              <div className="p-3 rounded-2xl bg-amber-50/80 border border-amber-200 text-left mb-3 text-xs font-semibold leading-relaxed text-slate-700">
                <span className="font-black text-amber-900 block mb-1">💡 KEY COMPUTING CONCEPT:</span>
                &ldquo;Sequential processing completes one operation before starting another. Parallel processing allows independent operations to execute simultaneously, reducing the overall execution time.&rdquo;
              </div>

              {/* Replay & Home Buttons */}
              <div className="grid grid-cols-2 gap-2 w-full">
                <button
                  onClick={handleFullReplay}
                  className="py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-black text-xs shadow-md cursor-pointer transition flex items-center justify-center gap-1.5"
                >
                  <RotateCcw size={14} />
                  <span>Replay Challenge</span>
                </button>

                <button
                  onClick={() => goToScreen("welcome")}
                  className="py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-black text-xs transition flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <span>Return to Welcome</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* ── 4. BOTTOM AREA: MAIN DYNAMIC ACTION BUTTON & PROGRESS ── */}
      <footer className="w-full h-18 px-4 bg-white/95 border-t border-amber-200/90 shadow-md flex items-center justify-between shrink-0 z-40">
        
        {/* Left: Reset Button */}
        <div className="flex items-center gap-2">
          {(screen === "single_challenge" || screen === "double_challenge") && (
            <button
              onClick={handleResetCurrent}
              className="px-3.5 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-black text-xs transition cursor-pointer flex items-center gap-1.5 border border-slate-200"
            >
              <RotateCcw size={14} />
              <span>Reset Challenge</span>
            </button>
          )}
        </div>

        {/* Center: THE ONE PROMINENT DYNAMIC ACTION BUTTON */}
        <div className="flex items-center justify-center">
          {screen === "single_challenge" && (
            <>
              {singleStage === "prepare" && (
                <button
                  onClick={handleSingleActionClick}
                  disabled={isSingleRunning}
                  className="px-8 py-3 rounded-2xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 disabled:opacity-50 text-white font-black text-sm shadow-lg cursor-pointer transition flex items-center gap-2 animate-bounce"
                >
                  <Play size={16} />
                  <span>{isSingleRunning ? "Preparing Dough & Toppings..." : "Prepare"}</span>
                </button>
              )}

              {singleStage === "assemble" && (
                <button
                  onClick={handleSingleActionClick}
                  disabled={isSingleRunning}
                  className="px-8 py-3 rounded-2xl bg-gradient-to-r from-sky-500 to-blue-500 hover:from-sky-600 hover:to-blue-600 disabled:opacity-50 text-white font-black text-sm shadow-lg cursor-pointer transition flex items-center gap-2 animate-bounce"
                >
                  <Sparkles size={16} />
                  <span>{isSingleRunning ? "Assembling Pizza..." : "Assemble"}</span>
                </button>
              )}

              {singleStage === "bake" && (
                <button
                  onClick={handleSingleActionClick}
                  disabled={isSingleRunning}
                  className="px-8 py-3 rounded-2xl bg-gradient-to-r from-rose-500 to-red-500 hover:from-rose-600 hover:to-red-600 disabled:opacity-50 text-white font-black text-sm shadow-lg cursor-pointer transition flex items-center gap-2 animate-bounce"
                >
                  <Flame size={16} />
                  <span>{isSingleRunning ? "Baking in Oven (4s)..." : "Bake"}</span>
                </button>
              )}

              {singleStage === "completed" && (
                <button
                  onClick={() => goToScreen("double_challenge")}
                  className="px-8 py-3 rounded-2xl bg-emerald-500 hover:bg-emerald-600 text-white font-black text-sm shadow-lg cursor-pointer transition flex items-center gap-2 animate-bounce"
                >
                  <span>Double Hand Challenge</span>
                  <ArrowRight size={16} />
                </button>
              )}
            </>
          )}

          {screen === "double_challenge" && (
            <>
              {doubleStage === "prep_and_assemble" && (
                <button
                  onClick={handleDoubleActionClick}
                  disabled={isDoubleRunning}
                  className="px-8 py-3 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 disabled:opacity-50 text-white font-black text-sm shadow-lg cursor-pointer transition flex items-center gap-2 animate-bounce"
                >
                  <Zap size={16} />
                  <span>
                    {isDoubleRunning
                      ? doubleSimTime < 2.0
                        ? "Parallel Prep (Dough & Toppings)..."
                        : "Collaborative Assembly..."
                      : "Prepare & Assemble"}
                  </span>
                </button>
              )}

              {doubleStage === "bake" && (
                <button
                  onClick={handleDoubleActionClick}
                  disabled={isDoubleRunning}
                  className="px-8 py-3 rounded-2xl bg-gradient-to-r from-rose-500 to-red-500 hover:from-rose-600 hover:to-red-600 disabled:opacity-50 text-white font-black text-sm shadow-lg cursor-pointer transition flex items-center gap-2 animate-bounce"
                >
                  <Flame size={16} />
                  <span>{isDoubleRunning ? "Baking in Oven (4s)..." : "Bake"}</span>
                </button>
              )}

              {doubleStage === "completed" && (
                <button
                  onClick={() => goToScreen("results")}
                  className="px-8 py-3 rounded-2xl bg-purple-600 hover:bg-purple-700 text-white font-black text-sm shadow-lg cursor-pointer transition flex items-center gap-2 animate-bounce"
                >
                  <span>View Results & Summary</span>
                  <Award size={16} />
                </button>
              )}
            </>
          )}
        </div>

        {/* Right: Next Challenge / Completion indicator */}
        <div className="flex items-center gap-2">
          {screen === "single_challenge" && singleStage === "completed" && (
            <span className="text-xs font-black text-emerald-700 bg-emerald-50 px-3 py-1.5 rounded-xl border border-emerald-300 flex items-center gap-1.5">
              <CheckCircle2 size={15} />
              <span>Single Hand Done (11.0s)</span>
            </span>
          )}

          {screen === "double_challenge" && doubleStage === "completed" && (
            <span className="text-xs font-black text-emerald-700 bg-emerald-50 px-3 py-1.5 rounded-xl border border-emerald-300 flex items-center gap-1.5">
              <CheckCircle2 size={15} />
              <span>Double Hand Done (9.0s)</span>
            </span>
          )}
        </div>
      </footer>

      {/* ── 5. HELP MODAL ── */}
      {showHelp && (
        <div className="absolute inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in zoom-in-95 duration-150">
          <div className="max-w-md w-full bg-white rounded-3xl p-6 shadow-2xl border-4 border-amber-300 text-slate-800 flex flex-col gap-3">
            <div className="flex items-center justify-between border-b border-amber-100 pb-2">
              <span className="text-xs font-black uppercase tracking-wider text-amber-800">
                Kitchen Mission & Learning Rules
              </span>
              <button
                onClick={() => setShowHelp(false)}
                className="w-7 h-7 rounded-full bg-slate-100 text-slate-500 hover:bg-slate-200 flex items-center justify-center cursor-pointer"
              >
                <X size={15} />
              </button>
            </div>

            <div className="space-y-2 text-xs text-slate-600">
              <p className="font-bold text-slate-800">How to play Pizza Making Challenge:</p>
              <ul className="list-disc pl-4 space-y-1">
                <li>
                  <strong>Single Hand Challenge:</strong> Click <em>Prepare</em> (dough + toppings), then <em>Assemble</em>, then <em>Bake</em>. Everything runs in sequence (<strong>11.0s total</strong>).
                </li>
                <li>
                  <strong>Double Hand Challenge:</strong> Click <em>Prepare & Assemble</em>. Watch both hands prepare dough and toppings <em>at the exact same time</em> (parallel), then assemble together. Then click <em>Bake</em> (<strong>9.0s total</strong>).
                </li>
                <li>
                  <strong>Compare:</strong> Parallel processing saves <strong>2.0 seconds (18.18% speedup)</strong>!
                </li>
              </ul>
            </div>

            <button
              onClick={() => setShowHelp(false)}
              className="w-full py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-black text-xs shadow-md cursor-pointer transition"
            >
              Got It, Chef!
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
