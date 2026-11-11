"use client";

import React, { useState, useEffect, useMemo, useCallback, useRef } from "react";
import Link from "next/link";
import Confetti from "react-confetti";
import { useWindowSize } from "react-use";
import { Canvas, useFrame } from "@react-three/fiber";
import * as THREE from "three";
import {
  ArrowLeft,
  ArrowRight,
  RotateCcw,
  Sparkles,
  Award,
  HelpCircle,
  Volume2,
  VolumeX,
  Compass,
  CheckCircle2,
  XCircle,
  Tag,
  BookOpen,
  Bot,
  User,
  Check,
  X,
  BrainCircuit,
  Library,
} from "lucide-react";
import { useLabAudio } from "@/hooks/useLabAudio";
import { useLMSBridge } from "@/hooks/useLMSBridge";

// ═════════════════════════════════════════════════════════════════════════════
// 1. DATA TYPES & 8-BOOK CATALOG (STRICTLY PRESERVED)
// ═════════════════════════════════════════════════════════════════════════════

export interface BookItem {
  id: string;
  title: string;
  category: string;
  tags: string[];
  coverTheme: "space-rocket" | "journey-mars" | "wildlife" | "pony-farm" | "science" | "robotics" | "magic" | "ocean";
  description: string;
  spineColor: string;
}

export interface ReaderProfile {
  id: string;
  name: string;
  interests: string[];
  requestDialogue: string;
  avatarType: "alex" | "emma" | "ryan" | "sophia" | "noah";
  bio: string;
  shirtColor: string;
  hairColor: string;
}

// 8 Curated Library Books with Illustrated Covers and 3 Distinct Descriptive Tags
export const LIBRARY_BOOKS: BookItem[] = [
  {
    id: "space-rocket",
    title: "Space Rocket Adventure",
    category: "Aerospace & Astronomy",
    tags: ["Space", "Rockets", "Adventure"],
    coverTheme: "space-rocket",
    description: "Blast off into deep orbit with supersonic rockets!",
    spineColor: "#0284c7",
  },
  {
    id: "journey-mars",
    title: "Journey to Mars",
    category: "Space Exploration",
    tags: ["Planets", "Space", "Exploration"],
    coverTheme: "journey-mars",
    description: "Discover the red planet and robotic rover missions.",
    spineColor: "#ea580c",
  },
  {
    id: "wildlife-explorer",
    title: "Wildlife Explorer",
    category: "Zoology & Safari",
    tags: ["Animals", "Nature", "Wildlife"],
    coverTheme: "wildlife",
    description: "Track safari creatures across vast untamed savannahs.",
    spineColor: "#15803d",
  },
  {
    id: "pony-farm",
    title: "Pony Farm Stories",
    category: "Country Living",
    tags: ["Animals", "Farm", "Nature"],
    coverTheme: "pony-farm",
    description: "Heartwarming adventures caring for gentle ponies.",
    spineColor: "#b45309",
  },
  {
    id: "science-discovery",
    title: "Science Discovery Lab",
    category: "STEM Experiments",
    tags: ["Science", "Experiments", "Technology"],
    coverTheme: "science",
    description: "Fascinating chemistry reactions and circuit tests.",
    spineColor: "#0d9488",
  },
  {
    id: "robotics-tech",
    title: "Robotics & Future Tech",
    category: "Computer Science",
    tags: ["Science", "Technology", "Robots"],
    coverTheme: "robotics",
    description: "How smart helper robots shape tomorrow's world.",
    spineColor: "#4338ca",
  },
  {
    id: "kingdom-magic",
    title: "Kingdom of Magic",
    category: "Fantasy Legends",
    tags: ["Fantasy", "Magic", "Adventure"],
    coverTheme: "magic",
    description: "Enchanted spellbooks and heroic wizard quests.",
    spineColor: "#7e22ce",
  },
  {
    id: "deep-ocean",
    title: "Deep Ocean Secrets",
    category: "Marine Science",
    tags: ["Nature", "Exploration", "Science"],
    coverTheme: "ocean",
    description: "Submerge in deep submersibles to explore trenches.",
    spineColor: "#0369a1",
  },
];

// Original Sequence of 5 Diverse Readers (Used as base template for Fisher-Yates shuffle)
export const READERS: readonly ReaderProfile[] = [
  {
    id: "alex",
    name: "Alex",
    avatarType: "alex",
    interests: ["Space", "Rockets", "Adventure"],
    requestDialogue: "Hi! I love space, rockets and exploring planets. Can you recommend an exciting book for me?",
    bio: "Aspiring aerospace engineer and stargazing enthusiast",
    shirtColor: "#0284c7",
    hairColor: "#78350f",
  },
  {
    id: "emma",
    name: "Emma",
    avatarType: "emma",
    interests: ["Animals", "Nature", "Wildlife"],
    requestDialogue: "Hello! I adore wild animals, national parks and nature. Do you have a great book about wildlife?",
    bio: "Wildlife sanctuary volunteer and animal tracker",
    shirtColor: "#059669",
    hairColor: "#b45309",
  },
  {
    id: "ryan",
    name: "Ryan",
    avatarType: "ryan",
    interests: ["Science", "Experiments", "Technology"],
    requestDialogue: "Greetings! I love conducting science experiments and building gadgets. What do you recommend?",
    bio: "School science fair champion and electronics tinkerer",
    shirtColor: "#d97706",
    hairColor: "#1e293b",
  },
  {
    id: "sophia",
    name: "Sophia",
    avatarType: "sophia",
    interests: ["Fantasy", "Magic", "Adventure"],
    requestDialogue: "Hey there! I'm searching for an enchanting story filled with magic, mystery and brave quests!",
    bio: "Creative writer who loves fantasy folklore and magical realms",
    shirtColor: "#9333ea",
    hairColor: "#3b0764",
  },
  {
    id: "noah",
    name: "Noah",
    avatarType: "noah",
    interests: ["Planets", "Space", "Exploration"],
    requestDialogue: "Hi! I'm fascinated by the solar system, unexplored planets and deep cosmic exploration!",
    bio: "Junior astronomer observing celestial orbits through his telescope",
    shirtColor: "#3b82f6",
    hairColor: "#1e1b4b",
  },
];

// Fisher-Yates Shuffle Algorithm for Randomizing Student Request Order
export function shuffleReaders(list: readonly ReaderProfile[]): ReaderProfile[] {
  const array = [...list];
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
}

type GameScreen = "welcome" | "challenge" | "results";

// ═════════════════════════════════════════════════════════════════════════════
// 2. 3D THREE.JS ASSETS (SCALED & FRAMED TO PREVENT ANY CLIPPING)
// ═════════════════════════════════════════════════════════════════════════════

// ── A. 3D BOOKSHELF WITH COLORFUL BOOKS & DECORATIONS ─────────────────────────
function Bookshelf3D() {
  const booksData = useMemo(() => {
    const colors = ["#dc2626", "#2563eb", "#16a34a", "#d97706", "#7c3aed", "#0891b2", "#be185d", "#4b5563"];
    const items = [];
    // Shelf 1 (Upper)
    for (let i = 0; i < 9; i++) {
      items.push({
        pos: [-0.9 + i * 0.22, 1.32, -0.05] as [number, number, number],
        h: 0.38 + (i % 3) * 0.05,
        w: 0.07 + (i % 2) * 0.03,
        c: colors[i % colors.length],
        rotZ: i === 8 ? 0.2 : 0,
      });
    }
    // Shelf 2 (Middle)
    for (let i = 0; i < 10; i++) {
      items.push({
        pos: [-1.0 + i * 0.21, 0.72, -0.05] as [number, number, number],
        h: 0.36 + (i % 4) * 0.04,
        w: 0.08,
        c: colors[(i + 3) % colors.length],
        rotZ: i === 0 ? -0.15 : 0,
      });
    }
    // Shelf 3 (Lower)
    for (let i = 0; i < 9; i++) {
      items.push({
        pos: [-0.85 + i * 0.21, 0.12, -0.05] as [number, number, number],
        h: 0.4 + (i % 2) * 0.04,
        w: 0.09,
        c: colors[(i + 5) % colors.length],
        rotZ: 0,
      });
    }
    return items;
  }, []);

  return (
    <group position={[0.7, -0.08, -1.15]} scale={0.92}>
      {/* ── Main Wooden Frame ── */}
      {/* Back Panel */}
      <mesh position={[0, 0.95, -0.22]}>
        <boxGeometry args={[2.5, 2.3, 0.04]} />
        <meshStandardMaterial color="#854d0e" roughness={0.65} />
      </mesh>
      {/* Left Upright */}
      <mesh position={[-1.23, 0.95, 0]}>
        <boxGeometry args={[0.08, 2.3, 0.44]} />
        <meshStandardMaterial color="#713f12" roughness={0.55} />
      </mesh>
      {/* Right Upright */}
      <mesh position={[1.23, 0.95, 0]}>
        <boxGeometry args={[0.08, 2.3, 0.44]} />
        <meshStandardMaterial color="#713f12" roughness={0.55} />
      </mesh>
      {/* Top Cornice */}
      <mesh position={[0, 2.12, 0.02]}>
        <boxGeometry args={[2.58, 0.08, 0.48]} />
        <meshStandardMaterial color="#5e330c" roughness={0.5} />
      </mesh>
      {/* Bottom Plinth */}
      <mesh position={[0, -0.18, 0.02]}>
        <boxGeometry args={[2.58, 0.08, 0.48]} />
        <meshStandardMaterial color="#5e330c" roughness={0.5} />
      </mesh>
      {/* Shelves (Horizontal planks) */}
      {[-0.1, 0.5, 1.1, 1.7].map((y, idx) => (
        <mesh key={`shelf-plank-${idx}`} position={[0, y, 0]}>
          <boxGeometry args={[2.42, 0.05, 0.42]} />
          <meshStandardMaterial color="#92400e" roughness={0.55} />
        </mesh>
      ))}

      {/* Colorful 3D Books on Shelves */}
      {booksData.map((b, i) => (
        <mesh key={`b-${i}`} position={b.pos} rotation={[0, 0, b.rotZ]}>
          <boxGeometry args={[b.w, b.h, 0.28]} />
          <meshStandardMaterial color={b.c} roughness={0.35} />
        </mesh>
      ))}

      {/* Top Shelf Library Decorations */}
      {/* Mini Golden Globe */}
      <group position={[0.7, 1.88, 0]}>
        <mesh position={[0, 0.02, 0]}>
          <cylinderGeometry args={[0.09, 0.11, 0.04, 16]} />
          <meshStandardMaterial color="#ca8a04" metalness={0.6} roughness={0.3} />
        </mesh>
        <mesh position={[0, 0.12, 0]}>
          <cylinderGeometry args={[0.02, 0.02, 0.18, 8]} />
          <meshStandardMaterial color="#ca8a04" metalness={0.6} roughness={0.3} />
        </mesh>
        <mesh position={[0, 0.22, 0]}>
          <sphereGeometry args={[0.12, 24, 24]} />
          <meshStandardMaterial color="#0284c7" roughness={0.4} />
        </mesh>
      </group>

      {/* Potted Library Plant */}
      <group position={[-0.75, 1.88, 0]}>
        <mesh position={[0, 0.08, 0]}>
          <cylinderGeometry args={[0.1, 0.07, 0.16, 16]} />
          <meshStandardMaterial color="#ea580c" roughness={0.7} />
        </mesh>
        <mesh position={[0, 0.22, 0]} scale={[1, 1.2, 1]}>
          <sphereGeometry args={[0.13, 16, 16]} />
          <meshStandardMaterial color="#16a34a" roughness={0.6} />
        </mesh>
      </group>
    </group>
  );
}

// ── B. 3D LIBRARY DESK, CHAIR & ACCESSORIES ──────────────────────────────────
function LibraryDeskAndChair3D() {
  return (
    <group position={[0.38, -0.06, 0.05]} scale={0.88}>
      {/* ── Wooden Library Counter / Desk ── */}
      {/* Tabletop */}
      <mesh position={[0, 0.44, 0.35]}>
        <boxGeometry args={[1.85, 0.08, 0.95]} />
        <meshStandardMaterial color="#92400e" roughness={0.45} />
      </mesh>
      {/* Front Wooden Modesty Panel */}
      <mesh position={[0, 0.05, 0.76]}>
        <boxGeometry args={[1.75, 0.72, 0.05]} />
        <meshStandardMaterial color="#78350f" roughness={0.55} />
      </mesh>
      {/* Left Desk Side Panel */}
      <mesh position={[-0.88, 0.05, 0.35]}>
        <boxGeometry args={[0.06, 0.72, 0.88]} />
        <meshStandardMaterial color="#78350f" roughness={0.55} />
      </mesh>
      {/* Right Desk Side Panel */}
      <mesh position={[0.88, 0.05, 0.35]}>
        <boxGeometry args={[0.06, 0.72, 0.88]} />
        <meshStandardMaterial color="#78350f" roughness={0.55} />
      </mesh>

      {/* ── Banker's Desk Lamp ── */}
      <group position={[-0.68, 0.48, 0.4]}>
        <mesh position={[0, 0.02, 0]}>
          <cylinderGeometry args={[0.08, 0.09, 0.04, 16]} />
          <meshStandardMaterial color="#ca8a04" metalness={0.7} roughness={0.25} />
        </mesh>
        <mesh position={[0, 0.18, 0]}>
          <cylinderGeometry args={[0.015, 0.015, 0.28, 8]} />
          <meshStandardMaterial color="#ca8a04" metalness={0.7} roughness={0.25} />
        </mesh>
        <mesh position={[0.06, 0.3, 0]} rotation={[0, 0, -0.2]}>
          <cylinderGeometry args={[0.07, 0.07, 0.2, 16, 1, false, 0, Math.PI]} />
          <meshStandardMaterial color="#15803d" roughness={0.2} metalness={0.1} />
        </mesh>
        <pointLight position={[0.06, 0.28, 0]} intensity={0.45} color="#fef08a" distance={1.8} />
      </group>

      {/* ── AI Terminal / Tablet on Desk ── */}
      <group position={[0.1, 0.48, 0.52]} rotation={[-0.2, -0.15, 0]}>
        <mesh position={[0, 0.06, -0.06]}>
          <boxGeometry args={[0.12, 0.14, 0.1]} />
          <meshStandardMaterial color="#334155" metalness={0.5} roughness={0.4} />
        </mesh>
        <mesh position={[0, 0.18, 0]}>
          <boxGeometry args={[0.44, 0.3, 0.03]} />
          <meshStandardMaterial color="#1e293b" metalness={0.6} roughness={0.3} />
        </mesh>
        <mesh position={[0, 0.18, 0.018]}>
          <planeGeometry args={[0.39, 0.25]} />
          <meshStandardMaterial color="#0284c7" emissive="#0284c7" emissiveIntensity={0.65} roughness={0.2} />
        </mesh>
      </group>

      {/* ── Desk Stack of Books ── */}
      <group position={[0.62, 0.48, 0.35]} rotation={[0, 0.2, 0]}>
        <mesh position={[0, 0.02, 0]}>
          <boxGeometry args={[0.26, 0.04, 0.34]} />
          <meshStandardMaterial color="#dc2626" roughness={0.4} />
        </mesh>
        <mesh position={[0.02, 0.06, 0.01]} rotation={[0, -0.1, 0]}>
          <boxGeometry args={[0.24, 0.035, 0.32]} />
          <meshStandardMaterial color="#2563eb" roughness={0.4} />
        </mesh>
      </group>

      {/* ── Library Chair Behind Desk ── */}
      <group position={[0.15, 0, -0.22]}>
        <mesh position={[0, 0.24, 0]}>
          <boxGeometry args={[0.54, 0.08, 0.52]} />
          <meshStandardMaterial color="#7f1d1d" roughness={0.4} />
        </mesh>
        <mesh position={[0, 0.62, -0.22]}>
          <boxGeometry args={[0.5, 0.64, 0.08]} />
          <meshStandardMaterial color="#7f1d1d" roughness={0.4} />
        </mesh>
        {[-0.22, 0.22].map((x, xi) =>
          [-0.2, 0.2].map((z, zi) => (
            <mesh key={`chair-leg-${xi}-${zi}`} position={[x, -0.05, z]}>
              <cylinderGeometry args={[0.025, 0.025, 0.5, 12]} />
              <meshStandardMaterial color="#451a03" roughness={0.5} />
            </mesh>
          ))
        )}
      </group>
    </group>
  );
}

// ── C. 3D AI ROBOT LIBRARIAN ("LibriBot") SITTING AT DESK (NO JUMPING!) ──────
interface RobotProps {
  status: "idle" | "correct" | "incorrect";
}

function AILibrarianRobot3D({ status }: RobotProps) {
  const headRef = useRef<THREE.Group>(null);
  const rightArmRef = useRef<THREE.Group>(null);
  const antennaBulbRef = useRef<THREE.Mesh>(null);

  useFrame((state) => {
    const t = state.clock.getElapsedTime();
    if (headRef.current) {
      if (status === "correct") {
        // Natural gentle acknowledgement nod (stays seated in chair, NO jumping!)
        headRef.current.position.y = 0.88;
        headRef.current.rotation.x = Math.sin(t * 3.5) * 0.06;
        headRef.current.rotation.y = -0.25;
      } else if (status === "incorrect") {
        // Subtle puzzled head tilt
        headRef.current.position.y = 0.88;
        headRef.current.rotation.z = -0.12;
        headRef.current.rotation.y = -0.3 + Math.sin(t * 2) * 0.04;
      } else {
        // Subtle idle breathing
        headRef.current.position.y = 0.88 + Math.sin(t * 1.8) * 0.01;
        headRef.current.rotation.x = Math.sin(t * 1.5) * 0.02;
        headRef.current.rotation.y = -0.2 + Math.sin(t * 1.2) * 0.05;
      }
    }

    if (rightArmRef.current) {
      if (status === "correct") {
        // Friendly small wave / hand acknowledgement from the counter (NO jump/flying)
        rightArmRef.current.rotation.x = -0.85;
        rightArmRef.current.rotation.z = 0.22 + Math.sin(t * 6) * 0.12;
      } else {
        // Natural resting posture over the counter
        rightArmRef.current.rotation.x = -0.65;
        rightArmRef.current.rotation.z = 0;
      }
    }

    // Antenna pulsing
    if (antennaBulbRef.current) {
      const mat = antennaBulbRef.current.material as THREE.MeshStandardMaterial;
      if (mat) {
        if (status === "correct") {
          mat.color.setHex(0x10b981);
          mat.emissive.setHex(0x10b981);
          mat.emissiveIntensity = 0.75 + Math.sin(t * 8) * 0.25;
        } else if (status === "incorrect") {
          mat.color.setHex(0xef4444);
          mat.emissive.setHex(0xef4444);
          mat.emissiveIntensity = 0.75 + Math.sin(t * 8) * 0.25;
        } else {
          mat.color.setHex(0x38bdf8);
          mat.emissive.setHex(0x0284c7);
          mat.emissiveIntensity = 0.55 + Math.sin(t * 3) * 0.25;
        }
      }
    }
  });

  return (
    // Scaled to 0.86 to ensure complete robot (antenna to legs) is framed inside viewport
    <group position={[0.5, 0.15, -0.08]} rotation={[0, -0.2, 0]} scale={0.86}>
      {/* ── Robot Torso / Chassis ── */}
      <mesh position={[0, 0.52, 0]}>
        <boxGeometry args={[0.44, 0.46, 0.32]} />
        <meshStandardMaterial color="#e2e8f0" metalness={0.35} roughness={0.3} />
      </mesh>
      {/* Chest Processor Screen */}
      <mesh position={[0, 0.54, 0.165]}>
        <boxGeometry args={[0.26, 0.22, 0.02]} />
        <meshStandardMaterial color="#0f172a" roughness={0.2} />
      </mesh>
      {/* Inner Glowing Core */}
      <mesh position={[0, 0.54, 0.178]}>
        <planeGeometry args={[0.22, 0.18]} />
        <meshStandardMaterial
          color={status === "correct" ? "#10b981" : status === "incorrect" ? "#ef4444" : "#0284c7"}
          emissive={status === "correct" ? "#10b981" : status === "incorrect" ? "#ef4444" : "#0284c7"}
          emissiveIntensity={0.65}
        />
      </mesh>

      {/* Metallic Collar Neck */}
      <mesh position={[0, 0.77, 0]}>
        <cylinderGeometry args={[0.09, 0.1, 0.08, 16]} />
        <meshStandardMaterial color="#64748b" metalness={0.6} roughness={0.25} />
      </mesh>

      {/* Red Bowtie on Librarian */}
      <group position={[0, 0.73, 0.18]}>
        <mesh rotation={[0, 0, 0.3]}>
          <boxGeometry args={[0.07, 0.05, 0.02]} />
          <meshStandardMaterial color="#dc2626" />
        </mesh>
        <mesh rotation={[0, 0, -0.3]}>
          <boxGeometry args={[0.07, 0.05, 0.02]} />
          <meshStandardMaterial color="#dc2626" />
        </mesh>
        <mesh>
          <sphereGeometry args={[0.022, 12, 12]} />
          <meshStandardMaterial color="#facc15" />
        </mesh>
      </group>

      {/* ── Robot Head Group ── */}
      <group ref={headRef} position={[0, 0.88, 0]}>
        {/* Head Box */}
        <mesh position={[0, 0.16, 0]}>
          <boxGeometry args={[0.42, 0.34, 0.34]} />
          <meshStandardMaterial color="#f8fafc" metalness={0.3} roughness={0.25} />
        </mesh>

        {/* Digital Screen Visor Face */}
        <mesh position={[0, 0.16, 0.172]}>
          <planeGeometry args={[0.34, 0.22]} />
          <meshStandardMaterial color="#0f172a" roughness={0.1} />
        </mesh>

        {/* Glasses on Robot Visor */}
        <group position={[0, 0.17, 0.182]}>
          <mesh position={[-0.08, 0, 0]}>
            <torusGeometry args={[0.055, 0.009, 8, 20]} />
            <meshStandardMaterial color="#ca8a04" metalness={0.7} roughness={0.25} />
          </mesh>
          <mesh position={[0.08, 0, 0]}>
            <torusGeometry args={[0.055, 0.009, 8, 20]} />
            <meshStandardMaterial color="#ca8a04" metalness={0.7} roughness={0.25} />
          </mesh>
          <mesh position={[0, 0.03, 0]}>
            <boxGeometry args={[0.05, 0.009, 0.009]} />
            <meshStandardMaterial color="#ca8a04" metalness={0.7} roughness={0.25} />
          </mesh>
        </group>

        {/* Digital Glowing LED Eyes */}
        <group position={[0, 0.17, 0.178]}>
          {status === "correct" ? (
            <>
              {/* Happy Arc Eyes */}
              <mesh position={[-0.08, 0.01, 0]}>
                <torusGeometry args={[0.038, 0.008, 6, 16, Math.PI]} />
                <meshStandardMaterial color="#10b981" emissive="#10b981" emissiveIntensity={0.9} />
              </mesh>
              <mesh position={[0.08, 0.01, 0]}>
                <torusGeometry args={[0.038, 0.008, 6, 16, Math.PI]} />
                <meshStandardMaterial color="#10b981" emissive="#10b981" emissiveIntensity={0.9} />
              </mesh>
            </>
          ) : status === "incorrect" ? (
            <>
              {/* Puzzled Cross Eyes */}
              <mesh position={[-0.08, 0, 0]} rotation={[0, 0, 0.78]}>
                <boxGeometry args={[0.06, 0.012, 0.005]} />
                <meshStandardMaterial color="#ef4444" emissive="#ef4444" emissiveIntensity={0.9} />
              </mesh>
              <mesh position={[-0.08, 0, 0]} rotation={[0, 0, -0.78]}>
                <boxGeometry args={[0.06, 0.012, 0.005]} />
                <meshStandardMaterial color="#ef4444" emissive="#ef4444" emissiveIntensity={0.9} />
              </mesh>
              <mesh position={[0.08, 0, 0]} rotation={[0, 0, 0.78]}>
                <boxGeometry args={[0.06, 0.012, 0.005]} />
                <meshStandardMaterial color="#ef4444" emissive="#ef4444" emissiveIntensity={0.9} />
              </mesh>
              <mesh position={[0.08, 0, 0]} rotation={[0, 0, -0.78]}>
                <boxGeometry args={[0.06, 0.012, 0.005]} />
                <meshStandardMaterial color="#ef4444" emissive="#ef4444" emissiveIntensity={0.9} />
              </mesh>
            </>
          ) : (
            <>
              {/* Neutral Cyan Eyes */}
              <mesh position={[-0.08, 0, 0]}>
                <sphereGeometry args={[0.032, 16, 16]} />
                <meshStandardMaterial color="#38bdf8" emissive="#0284c7" emissiveIntensity={0.8} />
              </mesh>
              <mesh position={[0.08, 0, 0]}>
                <sphereGeometry args={[0.032, 16, 16]} />
                <meshStandardMaterial color="#38bdf8" emissive="#0284c7" emissiveIntensity={0.8} />
              </mesh>
            </>
          )}
        </group>

        {/* Headphone Ears */}
        <mesh position={[-0.22, 0.16, 0]} rotation={[0, 0, 1.57]}>
          <cylinderGeometry args={[0.065, 0.065, 0.04, 16]} />
          <meshStandardMaterial color="#0284c7" metalness={0.6} roughness={0.3} />
        </mesh>
        <mesh position={[0.22, 0.16, 0]} rotation={[0, 0, 1.57]}>
          <cylinderGeometry args={[0.065, 0.065, 0.04, 16]} />
          <meshStandardMaterial color="#0284c7" metalness={0.6} roughness={0.3} />
        </mesh>

        {/* Antenna Stem & Glowing Bulb */}
        <mesh position={[0, 0.38, 0]}>
          <cylinderGeometry args={[0.012, 0.012, 0.15, 8]} />
          <meshStandardMaterial color="#64748b" metalness={0.8} roughness={0.2} />
        </mesh>
        <mesh ref={antennaBulbRef} position={[0, 0.46, 0]}>
          <sphereGeometry args={[0.038, 16, 16]} />
          <meshStandardMaterial color="#38bdf8" emissive="#0284c7" emissiveIntensity={0.6} />
        </mesh>
      </group>

      {/* ── Left Arm Resting on Desk ── */}
      <group position={[-0.25, 0.65, 0.04]} rotation={[-0.65, 0, 0]}>
        <mesh position={[-0.06, -0.16, 0.1]}>
          <cylinderGeometry args={[0.045, 0.04, 0.36, 12]} />
          <meshStandardMaterial color="#cbd5e1" metalness={0.4} roughness={0.3} />
        </mesh>
        <mesh position={[-0.06, -0.32, 0.22]}>
          <sphereGeometry args={[0.05, 12, 12]} />
          <meshStandardMaterial color="#64748b" metalness={0.6} roughness={0.3} />
        </mesh>
      </group>

      {/* ── Right Arm ── */}
      <group ref={rightArmRef} position={[0.25, 0.65, 0.04]}>
        <mesh position={[0.06, -0.16, 0.1]}>
          <cylinderGeometry args={[0.045, 0.04, 0.36, 12]} />
          <meshStandardMaterial color="#cbd5e1" metalness={0.4} roughness={0.3} />
        </mesh>
        <mesh position={[0.06, -0.32, 0.22]}>
          <sphereGeometry args={[0.05, 12, 12]} />
          <meshStandardMaterial color="#64748b" metalness={0.6} roughness={0.3} />
        </mesh>
      </group>

      {/* ── Seated Legs (Visible Beneath Desk) ── */}
      <mesh position={[-0.14, 0.18, 0.18]} rotation={[1.57, 0, 0]}>
        <cylinderGeometry args={[0.06, 0.055, 0.42, 12]} />
        <meshStandardMaterial color="#64748b" metalness={0.4} roughness={0.4} />
      </mesh>
      <mesh position={[0.14, 0.18, 0.18]} rotation={[1.57, 0, 0]}>
        <cylinderGeometry args={[0.06, 0.055, 0.42, 12]} />
        <meshStandardMaterial color="#64748b" metalness={0.4} roughness={0.4} />
      </mesh>
    </group>
  );
}

// ── D. 3D VISITING STUDENT WITH NATURAL DEPARTURE WALKING ANIMATION ───────────
interface StudentProps {
  reader: ReaderProfile;
  status: "idle" | "correct" | "incorrect";
  heldBook: BookItem | null;
  onDepartureComplete: () => void;
}

function StudentCharacter3D({ reader, status, heldBook, onDepartureComplete }: StudentProps) {
  const studentRef = useRef<THREE.Group>(null);
  const headRef = useRef<THREE.Group>(null);
  const leftLegRef = useRef<THREE.Group>(null);
  const rightLegRef = useRef<THREE.Group>(null);
  const rightArmRef = useRef<THREE.Group>(null);
  const leftArmRef = useRef<THREE.Group>(null);

  // Track timestamp when correct recommendation happened for smooth walking departure
  const departureTimerRef = useRef<number | null>(null);
  const departureCompletedRef = useRef<boolean>(false);

  useEffect(() => {
    if (status === "correct") {
      departureTimerRef.current = performance.now();
      departureCompletedRef.current = false;
    } else {
      departureTimerRef.current = null;
      departureCompletedRef.current = false;
      // Reset position when not departing
      if (studentRef.current) {
        studentRef.current.position.set(-1.18, -0.28, 0.75);
        studentRef.current.rotation.set(0, 0.55, 0);
      }
    }
  }, [status, reader.id]);

  useFrame((state) => {
    const now = performance.now();
    const t = state.clock.getElapsedTime();

    if (!studentRef.current || !headRef.current) return;

    if (status === "correct" && departureTimerRef.current !== null) {
      const elapsed = (now - departureTimerRef.current) / 1000;

      // ── PHASE 1: RECEIVE BOOK & SMILE (0.0s to 1.0s) ──
      if (elapsed < 1.0) {
        studentRef.current.position.set(-1.18, -0.28, 0.75);
        studentRef.current.rotation.set(0, 0.55, 0);

        // Cheerful head smile (NO jumping/bouncing!)
        headRef.current.rotation.set(0, 0.45, 0);
        if (leftArmRef.current) {
          leftArmRef.current.rotation.set(-0.8, 0, 0.3); // Holding book against chest
        }
        if (rightArmRef.current) {
          rightArmRef.current.rotation.set(0, 0, 0.2);
        }
        if (leftLegRef.current && rightLegRef.current) {
          leftLegRef.current.rotation.set(0, 0, 0);
          rightLegRef.current.rotation.set(0, 0, 0);
        }
      }
      // ── PHASE 2: TURN NATURALLY TOWARD EXIT (1.0s to 1.8s) ──
      else if (elapsed < 1.8) {
        const turnProgress = (elapsed - 1.0) / 0.8;
        // Smooth rotation from 0.55 to -1.57 (facing left door/exit)
        const currentRotY = 0.55 + (-1.57 - 0.55) * turnProgress;
        studentRef.current.rotation.set(0, currentRotY, 0);
        studentRef.current.position.set(-1.18, -0.28, 0.75);

        if (leftArmRef.current) {
          leftArmRef.current.rotation.set(-0.8, 0, 0.3); // Securely clutches book
        }
      }
      // ── PHASE 3: NATURAL WALKING OUT OF THE LIBRARY (1.8s to 4.2s) ──
      else if (elapsed < 4.2) {
        const walkElapsed = elapsed - 1.8;
        const walkDuration = 2.4;
        const walkProgress = Math.min(1, walkElapsed / walkDuration);

        // Move smoothly from start (-1.18) to off-screen left (-3.2)
        const currentX = -1.18 + (-3.2 - -1.18) * walkProgress;
        // Natural subtle vertical step cadence (NOT a jump or bounce, 0.02m step bob)
        const stepBob = Math.abs(Math.sin(walkElapsed * 7)) * 0.02;

        studentRef.current.position.set(currentX, -0.28 + stepBob, 0.75);
        studentRef.current.rotation.set(0, -1.57, 0); // Facing exit

        // Natural walking leg swings
        const legSwing = Math.sin(walkElapsed * 7) * 0.45;
        if (leftLegRef.current && rightLegRef.current) {
          leftLegRef.current.rotation.x = legSwing;
          rightLegRef.current.rotation.x = -legSwing;
        }

        // Natural arm swings (Right arm swings, Left arm holds book)
        if (rightArmRef.current) {
          rightArmRef.current.rotation.x = -legSwing * 0.7;
        }
        if (leftArmRef.current) {
          leftArmRef.current.rotation.set(-0.8, 0, 0.25);
        }
      }
      // ── PHASE 4: STUDENT HAS EXITED SCENE (elapsed >= 4.2s) ──
      else {
        studentRef.current.position.set(-3.5, -0.28, 0.75);
        if (!departureCompletedRef.current) {
          departureCompletedRef.current = true;
          onDepartureComplete();
        }
      }
    } else if (status === "incorrect") {
      // Puzzled slight head tilt without jumping
      studentRef.current.position.set(-1.18, -0.28, 0.75);
      studentRef.current.rotation.set(0, 0.55, 0);
      headRef.current.rotation.z = -0.15;
      headRef.current.rotation.y = 0.45 + Math.sin(t * 2) * 0.06;
      if (leftLegRef.current && rightLegRef.current) {
        leftLegRef.current.rotation.set(0, 0, 0);
        rightLegRef.current.rotation.set(0, 0, 0);
      }
    } else {
      // Natural subtle idle breathing stance (NO jumping/bouncing)
      studentRef.current.position.set(-1.18, -0.28, 0.75);
      studentRef.current.rotation.set(0, 0.55, 0);
      headRef.current.rotation.z = 0;
      headRef.current.rotation.x = Math.sin(t * 1.5) * 0.02;
      headRef.current.rotation.y = 0.52 + Math.sin(t * 1.5) * 0.04;
      if (leftLegRef.current && rightLegRef.current) {
        leftLegRef.current.rotation.set(0, 0, 0);
        rightLegRef.current.rotation.set(0, 0, 0);
      }
      if (rightArmRef.current) {
        rightArmRef.current.rotation.set(-0.3, 0, 0.25 + Math.sin(t * 2) * 0.05);
      }
      if (leftArmRef.current) {
        leftArmRef.current.rotation.set(0, 0, 0.1);
      }
    }
  });

  return (
    // Scaled to 0.85 to guarantee full head-to-toe visibility inside 3D viewport
    <group ref={studentRef} position={[-1.18, -0.28, 0.75]} rotation={[0, 0.55, 0]} scale={0.85}>
      {/* ── Left Leg (Pivot at Hip for Natural Walking) ── */}
      <group ref={leftLegRef} position={[-0.11, 0.64, 0]}>
        <mesh position={[0, -0.32, 0]}>
          <cylinderGeometry args={[0.06, 0.055, 0.64, 16]} />
          <meshStandardMaterial color="#1e3a8a" roughness={0.7} />
        </mesh>
        {/* Left Sneaker */}
        <mesh position={[0, -0.61, 0.05]}>
          <boxGeometry args={[0.12, 0.07, 0.2]} />
          <meshStandardMaterial color="#f8fafc" roughness={0.4} />
        </mesh>
      </group>

      {/* ── Right Leg (Pivot at Hip for Natural Walking) ── */}
      <group ref={rightLegRef} position={[0.11, 0.64, 0]}>
        <mesh position={[0, -0.32, 0]}>
          <cylinderGeometry args={[0.06, 0.055, 0.64, 16]} />
          <meshStandardMaterial color="#1e3a8a" roughness={0.7} />
        </mesh>
        {/* Right Sneaker */}
        <mesh position={[0, -0.61, 0.05]}>
          <boxGeometry args={[0.12, 0.07, 0.2]} />
          <meshStandardMaterial color="#f8fafc" roughness={0.4} />
        </mesh>
      </group>

      {/* ── Torso / Colorful Hoodie ── */}
      <mesh position={[0, 0.82, 0]}>
        <cylinderGeometry args={[0.17, 0.19, 0.46, 20]} />
        <meshStandardMaterial color={reader.shirtColor} roughness={0.5} />
      </mesh>

      {/* ── Left Arm (Holding the Received Book upon correct recommendation) ── */}
      <group ref={leftArmRef} position={[-0.24, 0.95, 0]}>
        <mesh position={[0, -0.2, 0]}>
          <cylinderGeometry args={[0.045, 0.04, 0.38, 12]} />
          <meshStandardMaterial color={reader.shirtColor} roughness={0.5} />
        </mesh>
        <mesh position={[0, -0.4, 0]}>
          <sphereGeometry args={[0.045, 12, 12]} />
          <meshStandardMaterial color="#fbcfe8" roughness={0.6} />
        </mesh>

        {/* 3D Received Book Held by Student */}
        {status === "correct" && heldBook && (
          <group position={[0.05, -0.25, 0.15]} rotation={[0.2, 0.3, -0.2]}>
            <mesh>
              <boxGeometry args={[0.18, 0.24, 0.06]} />
              <meshStandardMaterial color={heldBook.spineColor} roughness={0.3} />
            </mesh>
            {/* White pages edge */}
            <mesh position={[0.08, 0, 0]}>
              <boxGeometry args={[0.02, 0.22, 0.05]} />
              <meshStandardMaterial color="#ffffff" roughness={0.8} />
            </mesh>
          </group>
        )}
      </group>

      {/* ── Right Arm ── */}
      <group ref={rightArmRef} position={[0.22, 0.95, 0]}>
        <mesh position={[0, -0.2, 0]}>
          <cylinderGeometry args={[0.045, 0.04, 0.38, 12]} />
          <meshStandardMaterial color={reader.shirtColor} roughness={0.5} />
        </mesh>
        <mesh position={[0, -0.4, 0]}>
          <sphereGeometry args={[0.045, 12, 12]} />
          <meshStandardMaterial color="#fbcfe8" roughness={0.6} />
        </mesh>
      </group>

      {/* ── Head Group ── */}
      <group ref={headRef} position={[0, 1.18, 0]}>
        <mesh position={[0, -0.06, 0]}>
          <cylinderGeometry args={[0.06, 0.07, 0.08, 16]} />
          <meshStandardMaterial color="#fbcfe8" roughness={0.6} />
        </mesh>
        <mesh position={[0, 0.12, 0]}>
          <sphereGeometry args={[0.18, 24, 24]} />
          <meshStandardMaterial color="#fbcfe8" roughness={0.6} />
        </mesh>
        <mesh position={[0, 0.22, -0.02]} scale={[1.08, 0.85, 1.08]}>
          <sphereGeometry args={[0.18, 20, 20]} />
          <meshStandardMaterial color={reader.hairColor} roughness={0.7} />
        </mesh>

        {/* Eyes */}
        <mesh position={[-0.065, 0.12, 0.16]}>
          <sphereGeometry args={[0.025, 12, 12]} />
          <meshStandardMaterial color="#1e293b" />
        </mesh>
        <mesh position={[0.065, 0.12, 0.16]}>
          <sphereGeometry args={[0.025, 12, 12]} />
          <meshStandardMaterial color="#1e293b" />
        </mesh>

        {/* Glasses for Ryan */}
        {reader.avatarType === "ryan" && (
          <group position={[0, 0.12, 0.17]}>
            <mesh position={[-0.065, 0, 0]}>
              <torusGeometry args={[0.04, 0.006, 8, 16]} />
              <meshStandardMaterial color="#0f172a" />
            </mesh>
            <mesh position={[0.065, 0, 0]}>
              <torusGeometry args={[0.04, 0.006, 8, 16]} />
              <meshStandardMaterial color="#0f172a" />
            </mesh>
            <mesh position={[0, 0.02, 0]}>
              <boxGeometry args={[0.04, 0.006, 0.006]} />
              <meshStandardMaterial color="#0f172a" />
            </mesh>
          </group>
        )}

        {/* Headband for Sophia */}
        {reader.avatarType === "sophia" && (
          <mesh position={[0, 0.2, 0.04]} rotation={[-0.3, 0, 0]}>
            <torusGeometry args={[0.18, 0.018, 8, 24]} />
            <meshStandardMaterial color="#c084fc" />
          </mesh>
        )}

        {/* Cap for Alex */}
        {reader.avatarType === "alex" && (
          <group position={[0, 0.24, 0]}>
            <mesh scale={[1.05, 0.6, 1.05]}>
              <sphereGeometry args={[0.18, 16, 16]} />
              <meshStandardMaterial color="#dc2626" />
            </mesh>
            <mesh position={[0, -0.02, 0.14]} rotation={[-0.2, 0, 0]}>
              <boxGeometry args={[0.22, 0.02, 0.16]} />
              <meshStandardMaterial color="#b91c1c" />
            </mesh>
          </group>
        )}
      </group>
    </group>
  );
}

// ── E. UNIFIED 3D LIBRARY CANVAS ENVIRONMENT (ADJUSTED CAMERA & FRAMING) ──────
function Library3DScene({
  reader,
  status,
  heldBook,
  onDepartureComplete,
}: {
  reader: ReaderProfile;
  status: "idle" | "correct" | "incorrect";
  heldBook: BookItem | null;
  onDepartureComplete: () => void;
}) {
  return (
    // Camera positioned at [-0.1, 0.92, 4.35] with fov: 38 to ensure both student (head to toe)
    // and robot (antenna to legs) are fully visible without edge clipping
    <Canvas
      camera={{ position: [-0.1, 0.92, 4.35], fov: 38 }}
      className="w-full h-full"
      gl={{ antialias: true }}
    >
      {/* ── Lighting ── */}
      <ambientLight intensity={0.85} color="#fffbeb" />
      <directionalLight position={[3.5, 5, 3.5]} intensity={1.15} castShadow />
      <pointLight position={[-1.4, 2.0, 1.2]} intensity={0.4} color="#fef08a" />
      <pointLight position={[1.5, 3.2, 0.5]} intensity={0.35} color="#e0f2fe" />

      {/* ── Floor (Warm Wooden Parquet Plank) ── */}
      <mesh position={[0, -0.3, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[14, 10]} />
        <meshStandardMaterial color="#d4a373" roughness={0.6} />
      </mesh>

      {/* ── Library Back Wall (Warm Cream Wallpaper) ── */}
      <mesh position={[0, 2.2, -2.2]}>
        <planeGeometry args={[14, 6]} />
        <meshStandardMaterial color="#fefae0" roughness={0.8} />
      </mesh>
      {/* Wooden Skirting Board */}
      <mesh position={[0, -0.15, -2.15]}>
        <boxGeometry args={[14, 0.3, 0.08]} />
        <meshStandardMaterial color="#78350f" roughness={0.5} />
      </mesh>

      {/* ── 3D Scene Actors ── */}
      <Bookshelf3D />
      <LibraryDeskAndChair3D />
      <AILibrarianRobot3D status={status} />
      <StudentCharacter3D
        reader={reader}
        status={status}
        heldBook={heldBook}
        onDepartureComplete={onDepartureComplete}
      />
    </Canvas>
  );
}

// ═════════════════════════════════════════════════════════════════════════════
// 3. MAIN RECOMMENDER BOOKS LAB COMPONENT
// ═════════════════════════════════════════════════════════════════════════════

export default function RecommenderBooksLab() {
  const { width, height } = useWindowSize();
  const { playPop, playSuccess, playError, playChime } = useLabAudio();
  const { reportComplete } = useLMSBridge("recommender-books");

  // Game Navigation & State
  const [screen, setScreen] = useState<GameScreen>("welcome");

  // ── Randomly Shuffled Session Readers (Requirement 3: Fisher-Yates shuffle) ──
  const [sessionReaders, setSessionReaders] = useState<ReaderProfile[]>(() => shuffleReaders(READERS));
  const [currentReaderIndex, setCurrentReaderIndex] = useState(0);
  const [selectedBookId, setSelectedBookId] = useState<string | null>(null);

  // Recommendation Outcome Status for Current Reader
  const [recommendationStatus, setRecommendationStatus] = useState<"idle" | "correct" | "incorrect">("idle");
  const [feedbackMessage, setFeedbackMessage] = useState<string>("");

  // Track student departure animation completion (Requirement 2)
  const [isDeparted, setIsDeparted] = useState<boolean>(false);

  // Simulated Learning Metrics & Tracking
  const [score, setScore] = useState(0);
  const [totalAttempts, setTotalAttempts] = useState(0);
  const [incorrectAttempts, setIncorrectAttempts] = useState(0);
  const [correctedRecommendations, setCorrectedRecommendations] = useState(0);
  const [readersCompleted, setReadersCompleted] = useState<string[]>([]);
  const [sessionSeconds, setSessionSeconds] = useState(0);

  // Settings
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [showHelp, setShowHelp] = useState(false);

  // Active Reader from Shuffled Session Array
  const currentReader = sessionReaders[currentReaderIndex] || sessionReaders[0];

  // Selected Book Object
  const selectedBook = useMemo(() => {
    return LIBRARY_BOOKS.find((b) => b.id === selectedBookId) || null;
  }, [selectedBookId]);

  // Tag Comparison & Similarity Calculation
  const tagComparison = useMemo(() => {
    if (!selectedBook) {
      return {
        commonTags: [] as string[],
        unmatchedReaderTags: currentReader.interests,
        unmatchedBookTags: [] as string[],
        similarityScore: 0,
        isSufficient: false,
      };
    }

    const readerSet = new Set(currentReader.interests.map((t) => t.toLowerCase()));
    const commonTags = selectedBook.tags.filter((t) => readerSet.has(t.toLowerCase()));
    const unmatchedReaderTags = currentReader.interests.filter(
      (t) => !selectedBook.tags.some((bt) => bt.toLowerCase() === t.toLowerCase())
    );
    const unmatchedBookTags = selectedBook.tags.filter(
      (bt) => !currentReader.interests.some((rt) => rt.toLowerCase() === bt.toLowerCase())
    );

    // Similarity Score: (Matching Tags / Total Reader Interest Tags) * 100
    const rawScore = (commonTags.length / currentReader.interests.length) * 100;
    const similarityScore = Math.round(rawScore);

    // Accepted if >= 2 tags match (similarity >= 66%)
    const isSufficient = commonTags.length >= 2;

    return {
      commonTags,
      unmatchedReaderTags,
      unmatchedBookTags,
      similarityScore,
      isSufficient,
    };
  }, [selectedBook, currentReader]);

  // Timer Tick
  useEffect(() => {
    const timer = setInterval(() => {
      setSessionSeconds((prev) => prev + 1);
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const triggerSound = useCallback(
    (type: "pop" | "success" | "error" | "chime") => {
      if (!soundEnabled) return;
      if (type === "pop") playPop();
      if (type === "success") playSuccess();
      if (type === "error") playError();
      if (type === "chime") playChime();
    },
    [soundEnabled, playPop, playSuccess, playError, playChime]
  );

  // Handle Book Selection
  const handleSelectBook = (bookId: string) => {
    if (recommendationStatus === "correct") return;

    triggerSound("pop");
    setSelectedBookId(bookId);
    setRecommendationStatus("idle");
    setFeedbackMessage("");
  };

  // Handle Committing Recommendation
  const handleCommitRecommendation = () => {
    if (!selectedBook) return;

    setTotalAttempts((prev) => prev + 1);

    if (tagComparison.isSufficient) {
      // ── CORRECT RECOMMENDATION: Triggers natural walking departure animation ──
      triggerSound("success");
      setRecommendationStatus("correct");
      setIsDeparted(false); // Student starts holding book, turns, and walks out

      if (tagComparison.similarityScore === 100) {
        setFeedbackMessage(
          `"WOW! 100% PERFECT MATCH! This is exactly what I wanted! I love #${tagComparison.commonTags.join(
            ", #"
          )}. Thank you so much!"`
        );
      } else {
        setFeedbackMessage(
          `"Great recommendation! It matches #${tagComparison.commonTags.join(
            " and #"
          )} from my wishlist. Thank you!"`
        );
      }

      if (!readersCompleted.includes(currentReader.id)) {
        setScore((prev) => prev + 20);
        setReadersCompleted((prev) => [...prev, currentReader.id]);
      }

      if (recommendationStatus === "incorrect" || incorrectAttempts > 0) {
        setCorrectedRecommendations((prev) => prev + 1);
      }
    } else {
      // ── INCORRECT RECOMMENDATION: Stays in place with disappointed expression ──
      triggerSound("error");
      setRecommendationStatus("incorrect");
      setIncorrectAttempts((prev) => prev + 1);

      if (tagComparison.commonTags.length === 0) {
        setFeedbackMessage(
          `"This isn't what I wanted! I asked for #${currentReader.interests.join(
            ", #"
          )}, not #${selectedBook.tags.join(", #")}. Please find another book!"`
        );
      } else {
        setFeedbackMessage(
          `"Hmm, this book only has #${tagComparison.commonTags[0]}. I really want a book with #${tagComparison.unmatchedReaderTags.join(
            " and #"
          )} too. Let's try another!"`
        );
      }
    }
  };

  // Callback when student completes walking departure animation (Requirement 2)
  const handleDepartureComplete = useCallback(() => {
    setIsDeparted(true); // Enables the NEXT READER button while waiting for player click
  }, []);

  // Handle Next Reader Transition (Positioned at Bottom Center - Strictly Manual)
  const handleNextReader = () => {
    triggerSound("pop");

    if (currentReaderIndex < sessionReaders.length - 1) {
      setCurrentReaderIndex((prev) => prev + 1);
      setSelectedBookId(null);
      setRecommendationStatus("idle");
      setFeedbackMessage("");
      setIsDeparted(false);
    } else {
      triggerSound("chime");
      setScreen("results");
      reportComplete({ points: 100 });
    }
  };

  // Reset Entire Game (Play Again - Generates Fresh Randomized Order)
  const handleResetGame = () => {
    triggerSound("pop");
    const freshShuffled = shuffleReaders(READERS);
    setSessionReaders(freshShuffled);
    setCurrentReaderIndex(0);
    setSelectedBookId(null);
    setRecommendationStatus("idle");
    setFeedbackMessage("");
    setIsDeparted(false);
    setScore(0);
    setTotalAttempts(0);
    setIncorrectAttempts(0);
    setCorrectedRecommendations(0);
    setReadersCompleted([]);
    setScreen("welcome");
  };

  // Reset current reader selection
  const handleResetCurrentReader = () => {
    triggerSound("pop");
    setSelectedBookId(null);
    setRecommendationStatus("idle");
    setFeedbackMessage("");
    setIsDeparted(false);
  };

  const formatTimer = (totalSeconds: number) => {
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  const accuracyPercentage = useMemo(() => {
    if (totalAttempts === 0) return 100;
    const successfulAttempts = sessionReaders.length;
    const calc = Math.round((successfulAttempts / (successfulAttempts + incorrectAttempts)) * 100);
    return Math.max(0, Math.min(100, calc));
  }, [totalAttempts, incorrectAttempts, sessionReaders.length]);

  // ═════════════════════════════════════════════════════════════════════════════
  // 4. RENDER GAME (FULL-SCREEN LANDSCAPE SKETCH BLUEPRINT)
  // ═════════════════════════════════════════════════════════════════════════════

  return (
    <div className="w-full h-[100dvh] max-h-[100dvh] overflow-hidden select-none flex flex-col bg-[#FDFBF7] text-slate-800 font-sans">
      
      {/* ── TOP HEADER BAR ── */}
      <header className="w-full h-12 px-4 bg-white/95 border-b border-amber-200 shadow-2xs flex items-center justify-between shrink-0 z-40">
        {/* Left: Back Link & Title */}
        <div className="flex items-center gap-2.5 min-w-0">
          <Link href="/">
            <button
              className="w-7 h-7 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200 flex items-center justify-center transition cursor-pointer"
              title="Back to All Labs"
            >
              <ArrowLeft size={15} strokeWidth={2.4} />
            </button>
          </Link>

          <div className="w-7 h-7 rounded-lg bg-gradient-to-tr from-amber-500 to-orange-500 flex items-center justify-center text-white shadow-xs">
            <BookOpen size={16} />
          </div>

          <div className="min-w-0">
            <h1 className="text-sm font-black text-amber-950 truncate tracking-tight">
              Mystery Book Tag Matcher
            </h1>
            <span className="hidden sm:inline-block text-[9.5px] font-bold text-amber-700 uppercase tracking-wider">
              3D AI Recommendation Engine
            </span>
          </div>
        </div>

        {/* Center: Stage Progress & Session Timer */}
        <div className="flex items-center gap-2 sm:gap-4">
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-amber-50 border border-amber-200 text-amber-950">
            <span className="text-[9px] font-black uppercase text-amber-800">READER:</span>
            <span className="text-xs font-black font-mono">
              {currentReaderIndex + 1} / {sessionReaders.length}
            </span>
          </div>

          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-amber-50/90 border border-amber-200 text-amber-950">
            <Compass size={14} className="text-amber-600" />
            <span className="text-xs font-black font-mono tracking-wider">{formatTimer(sessionSeconds)}</span>
          </div>

          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-emerald-50 border border-emerald-300 text-emerald-950">
            <Award size={14} className="text-emerald-600" />
            <span className="text-xs font-black font-mono">{score} pts</span>
          </div>
        </div>

        {/* Right: Controls */}
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => {
              triggerSound("pop");
              setSoundEnabled(!soundEnabled);
            }}
            className="w-7 h-7 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 flex items-center justify-center transition cursor-pointer"
            title="Toggle Sound"
          >
            {soundEnabled ? <Volume2 size={15} /> : <VolumeX size={15} />}
          </button>

          <button
            onClick={handleResetCurrentReader}
            className="w-7 h-7 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 flex items-center justify-center transition cursor-pointer"
            title="Reset Current Reader"
          >
            <RotateCcw size={15} />
          </button>

          <button
            onClick={() => {
              triggerSound("pop");
              setShowHelp(true);
            }}
            className="w-7 h-7 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 flex items-center justify-center transition cursor-pointer"
            title="Help"
          >
            <HelpCircle size={15} />
          </button>
        </div>
      </header>

      {/* ── MAIN LANDSCAPE GAMEPLAY (TWO-SECTION SPLIT AS PER USER SKETCH) ── */}
      <main className="relative flex-1 min-h-0 w-full overflow-hidden flex flex-row p-2.5 gap-2.5">
        
        {/* ═════════════════════════════════════════════════════════════════════
            SCREEN 2: RECOMMENDATION CHALLENGE
            ═════════════════════════════════════════════════════════════════════ */}
        {screen === "challenge" && (
          <>
            {/* ── LEFT SECTION (60%): 3D IMMERSIVE LIBRARY ENVIRONMENT ── */}
            <div className="w-[58%] lg:w-[60%] h-full rounded-2xl bg-gradient-to-br from-[#FEFCE8] to-[#FDF4E3] border-2 border-amber-200/90 shadow-sm relative overflow-hidden flex flex-col">
              
              {/* 3D Three.js Interactive Scene with Adjusted Camera Framing */}
              <div className="absolute inset-0">
                <Library3DScene
                  reader={currentReader}
                  status={recommendationStatus}
                  heldBook={selectedBook}
                  onDepartureComplete={handleDepartureComplete}
                />
              </div>

              {/* Floating Overlay: Student Request Dialogue Bubble (Top Left of 3D Scene) */}
              <div className="absolute top-2.5 left-2.5 max-w-[290px] sm:max-w-xs z-20 pointer-events-none">
                <div className="bg-white/95 backdrop-blur-md rounded-2xl p-2.5 shadow-md border-2 border-amber-300 text-slate-800 pointer-events-auto">
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: currentReader.shirtColor }} />
                      <span className="text-xs font-black text-slate-900">{currentReader.name}</span>
                      <span className="text-[9px] font-bold text-slate-500">· Visiting Student</span>
                    </div>
                    <span className="text-[9px] font-black uppercase px-1.5 py-0.5 rounded-md bg-amber-100 text-amber-900">
                      Reader {currentReaderIndex + 1}/{sessionReaders.length}
                    </span>
                  </div>

                  {/* Speech Text */}
                  <p className="text-[10.5px] font-semibold text-slate-700 leading-snug italic mb-1.5">
                    {recommendationStatus === "correct" || recommendationStatus === "incorrect"
                      ? feedbackMessage
                      : currentReader.requestDialogue}
                  </p>

                  {/* Required Student Wishlist Tags */}
                  <div className="flex flex-wrap items-center gap-1 pt-1 border-t border-amber-100">
                    <span className="text-[8.5px] font-black uppercase text-slate-500">Wishlist:</span>
                    {currentReader.interests.map((tag) => {
                      const isMatching =
                        selectedBook &&
                        selectedBook.tags.some((t) => t.toLowerCase() === tag.toLowerCase());
                      return (
                        <span
                          key={tag}
                          className={`px-1.5 py-0.5 rounded-full text-[9px] font-black transition-all flex items-center gap-1 ${
                            isMatching
                              ? "bg-emerald-500 text-white shadow-xs"
                              : "bg-amber-100 text-amber-900 border border-amber-300"
                          }`}
                        >
                          <Tag size={8} />
                          <span>#{tag}</span>
                          {isMatching && <Check size={8} strokeWidth={3} />}
                        </span>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* LibriBot Desk Status Badge (Top Right of 3D Scene) */}
              <div className="absolute top-2.5 right-2.5 z-20 pointer-events-none">
                <div className="bg-white/90 backdrop-blur-xs rounded-xl px-2.5 py-1.5 shadow-sm border border-amber-200 flex items-center gap-2">
                  <Bot size={15} className="text-sky-600" />
                  <div className="flex flex-col text-left leading-none">
                    <span className="text-[9px] font-black uppercase text-slate-800">LibriBot 3D</span>
                    <span className="text-[9px] font-bold text-slate-500">
                      {recommendationStatus === "correct"
                        ? isDeparted
                          ? "Student Satisfied!"
                          : "Student Heading Out..."
                        : recommendationStatus === "incorrect"
                        ? "Try Another Book"
                        : selectedBook
                        ? "Tag Inspector Active"
                        : "Ready to assist"}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* ── RIGHT SECTION (40%): 2-COLUMN BOOK SELECTION + AI TAG MATCHING PANEL ── */}
            <div className="w-[42%] lg:w-[40%] h-full flex flex-col justify-between gap-2 overflow-hidden">
              
              {/* ── UPPER PART: 8-BOOK SELECTION AREA (2-COLUMN GRID) ── */}
              <div className="flex-1 min-h-0 rounded-2xl bg-white/95 border-2 border-amber-200 shadow-sm p-2 flex flex-col overflow-hidden">
                <div className="flex items-center justify-between border-b border-amber-100 pb-1 mb-1.5 shrink-0">
                  <div className="flex items-center gap-1.5">
                    <Library size={14} className="text-amber-700" />
                    <span className="text-xs font-black uppercase text-amber-950">
                      Available Books (8 Titles)
                    </span>
                  </div>
                  <span className="text-[9px] font-bold text-slate-500">
                    Click to inspect tags
                  </span>
                </div>

                {/* 2-Column Compact Grid */}
                <div className="flex-1 min-h-0 overflow-y-auto grid grid-cols-2 gap-1.5 pr-0.5">
                  {LIBRARY_BOOKS.map((book) => {
                    const isSelected = selectedBookId === book.id;
                    const isCorrectMatch = recommendationStatus === "correct" && isSelected;
                    const isWrongMatch = recommendationStatus === "incorrect" && isSelected;

                    return (
                      <div
                        key={book.id}
                        onClick={() => handleSelectBook(book.id)}
                        className={`rounded-xl p-2 border-2 transition-all flex flex-col justify-between select-none cursor-pointer ${
                          isCorrectMatch
                            ? "bg-emerald-50 border-emerald-500 ring-2 ring-emerald-300 shadow-xs"
                            : isWrongMatch
                            ? "bg-rose-50 border-rose-400 ring-2 ring-rose-200 shadow-xs"
                            : isSelected
                            ? "bg-amber-50 border-amber-500 ring-2 ring-amber-300 shadow-xs scale-[1.01]"
                            : "bg-[#FDFBF7] hover:bg-white border-slate-200 hover:border-amber-300 shadow-2xs hover:scale-[1.01]"
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          {/* 3D Book Spine Indicator */}
                          <div
                            className="w-2.5 h-9 rounded-sm shrink-0 shadow-2xs"
                            style={{ backgroundColor: book.spineColor }}
                          />
                          <div className="min-w-0 flex-1">
                            <h4 className="text-[11px] font-black text-slate-900 leading-tight truncate">
                              {book.title}
                            </h4>
                            <span className="text-[8.5px] font-semibold text-slate-500 block truncate">
                              {book.category}
                            </span>
                          </div>
                        </div>

                        {/* Associated Book Tags */}
                        <div className="mt-1 flex flex-wrap gap-1">
                          {book.tags.map((tag) => {
                            const isMatch = currentReader.interests.some(
                              (it) => it.toLowerCase() === tag.toLowerCase()
                            );
                            return (
                              <span
                                key={tag}
                                className={`text-[8.5px] font-black px-1.5 py-0.5 rounded-md ${
                                  isSelected && isMatch
                                    ? "bg-emerald-500 text-white"
                                    : isMatch
                                    ? "bg-emerald-100 text-emerald-800"
                                    : "bg-slate-100 text-slate-600"
                                }`}
                              >
                                #{tag}
                              </span>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* ── LOWER PART: DEDICATED AI TAG MATCHING PANEL ── */}
              <div className="h-[210px] rounded-2xl bg-white/95 border-2 border-amber-200 shadow-sm p-2.5 flex flex-col justify-between shrink-0">
                <div>
                  <div className="flex items-center justify-between border-b border-amber-100 pb-1 mb-1.5">
                    <div className="flex items-center gap-1.5">
                      <BrainCircuit size={14} className="text-amber-600" />
                      <span className="text-xs font-black uppercase text-amber-950">
                        AI Tag Matching Inspector
                      </span>
                    </div>
                    {selectedBook && (
                      <span className="text-[9.5px] font-black font-mono px-2 py-0.5 rounded-full bg-amber-100 text-amber-900">
                        {tagComparison.commonTags.length} / {currentReader.interests.length} Tags Match
                      </span>
                    )}
                  </div>

                  {selectedBook ? (
                    <div className="space-y-1.5 text-xs">
                      {/* Reader Tags vs Book Tags Comparison */}
                      <div className="grid grid-cols-2 gap-1.5 text-[10px]">
                        {/* Student Interests */}
                        <div className="p-1.5 rounded-lg bg-amber-50/70 border border-amber-200">
                          <span className="font-black text-amber-950 block mb-0.5">
                            {currentReader.name}&apos;s Interests:
                          </span>
                          <div className="flex flex-wrap gap-1">
                            {currentReader.interests.map((tag) => {
                              const matches = selectedBook.tags.some(
                                (bt) => bt.toLowerCase() === tag.toLowerCase()
                              );
                              return (
                                <span
                                  key={tag}
                                  className={`px-1.5 py-0.5 rounded text-[9px] font-black flex items-center gap-0.5 ${
                                    matches
                                      ? "bg-emerald-500 text-white"
                                      : "bg-slate-200 text-slate-600"
                                  }`}
                                >
                                  {matches ? <Check size={8} strokeWidth={3} /> : null}
                                  <span>#{tag}</span>
                                </span>
                              );
                            })}
                          </div>
                        </div>

                        {/* Selected Book Tags */}
                        <div className="p-1.5 rounded-lg bg-slate-50 border border-slate-200">
                          <span className="font-black text-slate-800 block mb-0.5 truncate">
                            Book: {selectedBook.title}
                          </span>
                          <div className="flex flex-wrap gap-1">
                            {selectedBook.tags.map((tag) => {
                              const matches = currentReader.interests.some(
                                (rt) => rt.toLowerCase() === tag.toLowerCase()
                              );
                              return (
                                <span
                                  key={tag}
                                  className={`px-1.5 py-0.5 rounded text-[9px] font-black flex items-center gap-0.5 ${
                                    matches
                                      ? "bg-emerald-500 text-white"
                                      : "bg-slate-200 text-slate-600"
                                  }`}
                                >
                                  {matches ? <Check size={8} strokeWidth={3} /> : null}
                                  <span>#{tag}</span>
                                </span>
                              );
                            })}
                          </div>
                        </div>
                      </div>

                      {/* Similarity Score & Animated Progress Bar */}
                      <div className="p-1.5 rounded-lg bg-slate-50 border border-slate-200 flex flex-col gap-1">
                        <div className="flex items-center justify-between text-[11px] font-bold">
                          <span className="text-slate-600">Similarity Score:</span>
                          <span
                            className={`font-black font-mono ${
                              tagComparison.similarityScore >= 66
                                ? "text-emerald-600"
                                : tagComparison.similarityScore > 0
                                ? "text-amber-600"
                                : "text-rose-500"
                            }`}
                          >
                            {tagComparison.similarityScore}%
                          </span>
                        </div>
                        {/* Progress Bar */}
                        <div className="w-full h-2 rounded-full bg-slate-200 overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all duration-300 ${
                              tagComparison.similarityScore >= 66
                                ? "bg-emerald-500"
                                : tagComparison.similarityScore > 0
                                ? "bg-amber-500"
                                : "bg-rose-500"
                            }`}
                            style={{ width: `${tagComparison.similarityScore}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="p-3 text-center text-slate-500 text-[11px] font-semibold">
                      👈 Select a book from the shelf above to analyze its tags and calculate recommendation similarity.
                    </div>
                  )}
                </div>

                {/* Recommend Confirmation Action Button */}
                {selectedBook && recommendationStatus !== "correct" && (
                  <button
                    onClick={handleCommitRecommendation}
                    className="w-full py-2 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white font-black text-xs shadow-md transition-all cursor-pointer flex items-center justify-center gap-1.5 animate-bounce"
                  >
                    <Sparkles size={14} />
                    <span>Recommend This Book</span>
                  </button>
                )}

                {/* Status Indicator after Acceptance */}
                {recommendationStatus === "correct" && (
                  <div className="py-1.5 px-2.5 rounded-xl bg-emerald-50 border border-emerald-400 text-emerald-900 text-[11px] font-black flex items-center justify-center gap-1.5">
                    <CheckCircle2 size={15} className="text-emerald-600 shrink-0" />
                    <span>
                      {isDeparted
                        ? `Reader Satisfied! Click NEXT READER below`
                        : `${currentReader.name} is leaving with the book...`}
                    </span>
                  </div>
                )}
              </div>
            </div>
          </>
        )}

        {/* ═════════════════════════════════════════════════════════════════════
            SCREEN 1: WELCOME SCREEN (MODAL OVERLAY)
            ═════════════════════════════════════════════════════════════════════ */}
        {screen === "welcome" && (
          <div className="absolute inset-0 z-30 bg-amber-950/25 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="max-w-xl w-full bg-white/95 backdrop-blur-md rounded-3xl p-6 shadow-2xl border-4 border-amber-300 text-center flex flex-col items-center animate-in zoom-in-95 duration-200">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-amber-400 to-orange-400 p-0.5 shadow-md flex items-center justify-center text-white mb-2">
                <Library size={36} />
              </div>

              <h2 className="text-2xl font-black text-amber-950 mb-0.5 tracking-tight">
                MYSTERY BOOK TAG MATCHER
              </h2>
              <span className="text-xs font-black text-amber-700 uppercase tracking-widest mb-3">
                Train Your Recommendation Engine!
              </span>

              <p className="text-xs sm:text-sm font-semibold text-slate-700 leading-relaxed mb-4 bg-amber-50 p-3.5 rounded-2xl border border-amber-200">
                &ldquo;Welcome to the library! Students are looking for books that match their interests. Your job is to recommend the perfect books by understanding their preferences and matching book tags. You act as the AI recommendation system!&rdquo;
              </p>

              {/* 3 Step Concept Preview */}
              <div className="grid grid-cols-3 gap-2 w-full mb-5">
                <div className="p-2.5 rounded-xl bg-amber-50 border border-amber-200 flex flex-col items-center">
                  <span className="text-[10px] font-black text-amber-800 uppercase">1. 3D LIBRARY</span>
                  <span className="text-[11px] font-bold text-slate-600">Student & Robot</span>
                </div>
                <div className="p-2.5 rounded-xl bg-sky-50 border border-sky-200 flex flex-col items-center">
                  <span className="text-[10px] font-black text-sky-800 uppercase">2. TAG MATCHING</span>
                  <span className="text-[11px] font-bold text-slate-600">Calculate Score</span>
                </div>
                <div className="p-2.5 rounded-xl bg-emerald-50 border border-emerald-200 flex flex-col items-center">
                  <span className="text-[10px] font-black text-emerald-800 uppercase">3. FEEDBACK</span>
                  <span className="text-[11px] font-bold text-slate-600">5 Random Readers</span>
                </div>
              </div>

              <button
                onClick={() => {
                  triggerSound("pop");
                  setScreen("challenge");
                }}
                className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white font-black text-sm shadow-lg cursor-pointer transition animate-bounce flex items-center justify-center gap-2"
              >
                <span>Enter 3D Library & Start Recommendations</span>
                <ArrowRight size={18} />
              </button>
            </div>
          </div>
        )}

        {/* ═════════════════════════════════════════════════════════════════════
            SCREEN 3: RESULTS AND LEARNING SUMMARY
            ═════════════════════════════════════════════════════════════════════ */}
        {screen === "results" && (
          <div className="absolute inset-0 z-30 bg-amber-950/25 backdrop-blur-xs flex items-center justify-center p-4">
            <Confetti width={width} height={height} recycle={false} numberOfPieces={250} gravity={0.25} />

            <div className="max-w-xl w-full bg-white/95 backdrop-blur-md rounded-3xl p-6 shadow-2xl border-4 border-amber-300 text-center flex flex-col items-center animate-in zoom-in-95 duration-200">
              <div className="w-14 h-14 rounded-2xl bg-amber-100 border-2 border-amber-300 flex items-center justify-center text-amber-500 mb-2 shadow-inner">
                <Sparkles size={32} />
              </div>

              <h2 className="text-2xl font-black text-amber-950 mb-0.5">
                AI RECOMMENDATION MASTER!
              </h2>
              <span className="text-xs font-black text-emerald-600 uppercase tracking-wider mb-3">
                100 Points Earned · Recommendation Algorithms Mastered
              </span>

              {/* Stats Cards */}
              <div className="grid grid-cols-4 gap-2 w-full mb-3 text-center">
                <div className="p-2 rounded-xl bg-amber-50 border border-amber-200">
                  <span className="text-[9px] font-black uppercase text-amber-800 block">READERS</span>
                  <span className="text-lg font-black font-mono text-amber-950">5 / 5</span>
                </div>
                <div className="p-2 rounded-xl bg-emerald-50 border border-emerald-200">
                  <span className="text-[9px] font-black uppercase text-emerald-700 block">SUCCESS</span>
                  <span className="text-lg font-black font-mono text-emerald-600">5</span>
                </div>
                <div className="p-2 rounded-xl bg-rose-50 border border-rose-200">
                  <span className="text-[9px] font-black uppercase text-rose-700 block">INCORRECT</span>
                  <span className="text-lg font-black font-mono text-rose-600">{incorrectAttempts}</span>
                </div>
                <div className="p-2 rounded-xl bg-sky-50 border border-sky-200">
                  <span className="text-[9px] font-black uppercase text-sky-700 block">ACCURACY</span>
                  <span className="text-lg font-black font-mono text-sky-700">{accuracyPercentage}%</span>
                </div>
              </div>

              {/* Educational Explanation */}
              <div className="p-3 rounded-2xl bg-amber-50/80 border border-amber-200 text-left mb-3 w-full">
                <span className="text-[10px] font-black uppercase text-amber-900 block mb-1">
                  💡 HOW RECOMMENDATION ENGINES WORK:
                </span>
                <p className="text-xs font-semibold text-slate-700 leading-relaxed mb-2">
                  &ldquo;Recommendation engines analyse user interests and item characteristics to identify similar items. They use feedback and similarity calculations to provide more relevant recommendations.&rdquo;
                </p>
                <div className="flex items-center justify-between text-[10px] font-bold bg-white p-2 rounded-xl border border-amber-200">
                  <span className="text-slate-700">Reader: [#Space, #Adventure]</span>
                  <span className="text-emerald-600 font-black">↔ Similarity Match ↔</span>
                  <span className="text-slate-700">Book: [#Space, #Adventure, #Planets]</span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="grid grid-cols-2 gap-2 w-full">
                <button
                  onClick={handleResetGame}
                  className="py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-black text-xs shadow-md cursor-pointer transition flex items-center justify-center gap-1.5"
                >
                  <RotateCcw size={14} />
                  <span>Play Again (New Order)</span>
                </button>

                <button
                  onClick={() => {
                    triggerSound("pop");
                    setScreen("welcome");
                  }}
                  className="py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-black text-xs transition flex items-center justify-center gap-1.5 cursor-pointer border border-slate-200"
                >
                  <span>Return to Welcome</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* ── 4. BOTTOM FOOTER: STRICTLY REQUIRED "NEXT READER" BUTTON (BOTTOM CENTER) ── */}
      <footer className="w-full h-14 px-4 bg-white/95 border-t border-amber-200 shadow-md flex items-center justify-between shrink-0 z-40">
        
        {/* Left: Summary Status */}
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-ping" />
          <span className="text-xs font-black text-amber-950 truncate">
            {screen === "challenge"
              ? recommendationStatus === "correct"
                ? isDeparted
                  ? `★ Reader ${currentReaderIndex + 1} (${currentReader.name}) Satisfied! Click Next Reader`
                  : `${currentReader.name} is leaving with the book...`
                : `Active: Recommend a book for ${currentReader.name}`
              : "Mystery Book Tag Matcher"}
          </span>
        </div>

        {/* Center: THE STRICTLY REQUIRED "NEXT READER" BUTTON (FIXED BOTTOM CENTER) */}
        <div className="flex items-center justify-center">
          {screen === "challenge" && (
            <button
              onClick={handleNextReader}
              disabled={recommendationStatus !== "correct" || !isDeparted}
              className={`px-8 py-2.5 rounded-2xl font-black text-xs shadow-lg transition-all flex items-center gap-2 ${
                recommendationStatus === "correct" && isDeparted
                  ? currentReaderIndex === sessionReaders.length - 1
                    ? "bg-purple-600 hover:bg-purple-700 text-white cursor-pointer animate-bounce ring-4 ring-purple-300"
                    : "bg-emerald-500 hover:bg-emerald-600 text-white cursor-pointer animate-bounce ring-4 ring-emerald-300"
                  : "bg-slate-200 text-slate-400 border border-slate-300 cursor-not-allowed opacity-60"
              }`}
            >
              <span>
                {currentReaderIndex === sessionReaders.length - 1
                  ? "VIEW RESULTS"
                  : "NEXT READER"}
              </span>
              <ArrowRight size={15} />
            </button>
          )}
        </div>

        {/* Right: Reset Selection Button */}
        <div className="flex items-center gap-2">
          {screen === "challenge" && (
            <button
              onClick={handleResetCurrentReader}
              className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-black text-xs transition cursor-pointer flex items-center gap-1.5 border border-slate-200"
            >
              <RotateCcw size={13} />
              <span>Reset Selection</span>
            </button>
          )}
        </div>
      </footer>

      {/* ── HELP MODAL ── */}
      {showHelp && (
        <div className="absolute inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in zoom-in-95 duration-150">
          <div className="max-w-md w-full bg-white rounded-3xl p-6 shadow-2xl border-4 border-amber-300 text-slate-800 flex flex-col gap-3">
            <div className="flex items-center justify-between border-b border-amber-100 pb-2">
              <span className="text-xs font-black uppercase tracking-wider text-amber-800">
                Recommendation Engine Rules & Mission
              </span>
              <button
                onClick={() => setShowHelp(false)}
                className="w-7 h-7 rounded-full bg-slate-100 text-slate-500 hover:bg-slate-200 flex items-center justify-center cursor-pointer"
              >
                <X size={15} />
              </button>
            </div>

            <div className="space-y-2 text-xs text-slate-600">
              <p className="font-bold text-slate-800">How Recommendation Engines Work:</p>
              <ul className="list-disc pl-4 space-y-1">
                <li>
                  <strong>3D Library Scene:</strong> The visiting student requests books with specific interest tags.
                </li>
                <li>
                  <strong>Book Selection:</strong> Select a book from the 8-book shelf on the right.
                </li>
                <li>
                  <strong>Tag Match Inspector:</strong> Inspect matching tags and similarity score percentage.
                </li>
                <li>
                  <strong>Recommend:</strong> Click &ldquo;Recommend This Book&rdquo; when there are matching tags.
                </li>
                <li>
                  <strong>Departure & Next Reader:</strong> The student holds their new book and naturally walks out before the &ldquo;Next Reader&rdquo; button is enabled!
                </li>
              </ul>
            </div>

            <button
              onClick={() => setShowHelp(false)}
              className="w-full py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-black text-xs shadow-md cursor-pointer transition"
            >
              Got It, Recommender!
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
