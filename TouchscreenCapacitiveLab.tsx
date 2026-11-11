"use client";

import React, { useState, useEffect, useRef, useCallback, useMemo } from "react";
import Link from "next/link";
import Confetti from "react-confetti";
import { useWindowSize } from "react-use";
import { Canvas } from "@react-three/fiber";
import { OrbitControls, Float } from "@react-three/drei";
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
  Zap,
  Hand,
  Layers,
  Sliders,
  Check,
  X,
  Lock,
  Smartphone,
  Info,
  Wrench,
  Bot,
  Power,
  Play,
  Pause,
} from "lucide-react";
import { useLabAudio } from "@/hooks/useLabAudio";
import { useLMSBridge } from "@/hooks/useLMSBridge";

// ═════════════════════════════════════════════════════════════════════════════
// 1. MATERIAL DATA DEFINITIONS (EXACT 4 MATERIALS IN FIXED SEQUENCE)
// ═════════════════════════════════════════════════════════════════════════════

interface MaterialItem {
  id: string;
  name: string;
  type: "insulator" | "conductor";
  conducts: boolean;
  color: string;
  accentColor: string;
  category: string;
  description: string;
  rejectionMessage: string;
  explanation: string;
  iconBg: string;
}

const MATERIALS: MaterialItem[] = [
  {
    id: "wood-eraser",
    name: "Wood Eraser",
    type: "insulator",
    conducts: false,
    color: "#b45309",
    accentColor: "#fef3c7",
    category: "Electrical Insulator",
    description: "Solid wood block with natural cellulose fibers",
    rejectionMessage: "Touch Not Detected – The activity is waiting for a valid touch.",
    explanation:
      "Wood is an electrical insulator and generally cannot produce the required capacitive change.",
    iconBg: "bg-amber-100 text-amber-800 border-amber-300",
  },
  {
    id: "wool-glove",
    name: "Wool Glove",
    type: "insulator",
    conducts: false,
    color: "#0284c7",
    accentColor: "#e0f2fe",
    category: "Electrical Insulator",
    description: "Thick knitted sheep wool winter glove",
    rejectionMessage: "Touch Not Detected – Your screen is still waiting!",
    explanation:
      "An ordinary wool glove prevents your finger from effectively interacting with the touchscreen's electric field. (Special conductive touchscreen gloves may work; this experiment uses an ordinary insulating wool glove).",
    iconBg: "bg-sky-100 text-sky-800 border-sky-300",
  },
  {
    id: "plastic-ruler",
    name: "Plastic Ruler",
    type: "insulator",
    conducts: false,
    color: "#ea580c",
    accentColor: "#ffedd5",
    category: "Electrical Insulator",
    description: "Clear polystyrene plastic stationery ruler",
    rejectionMessage: "Touch Not Detected – No valid touch registered.",
    explanation:
      "Plastic is an electrical insulator and does not normally produce the capacitive change needed for touch detection.",
    iconBg: "bg-orange-100 text-orange-800 border-orange-300",
  },
  {
    id: "bare-finger",
    name: "Bare Finger",
    type: "conductor",
    conducts: true,
    color: "#16a34a",
    accentColor: "#dcfce7",
    category: "Electrical Conductor",
    description: "Natural conductive fingertip with electrolytic moisture",
    rejectionMessage: "",
    explanation:
      "Your conductive finger changes the local capacitance of the touchscreen, allowing the controller to identify the touch location.",
    iconBg: "bg-emerald-100 text-emerald-800 border-emerald-300",
  },
];

type GameScreen = "welcome" | "testing" | "discovery" | "results";

// ═════════════════════════════════════════════════════════════════════════════
// 2. 3D-STYLED VISUAL ICONS FOR MATERIALS
// ═════════════════════════════════════════════════════════════════════════════

function MaterialVisualIcon({ id, size = 44 }: { id: string; size?: number }) {
  if (id === "wood-eraser") {
    return (
      <svg width={size} height={size} viewBox="0 0 64 64" className="drop-shadow-sm">
        {/* Wooden Chalkboard Eraser 3D Block */}
        <rect x="8" y="24" width="48" height="20" rx="5" fill="#d97706" stroke="#92400e" strokeWidth="2.5" />
        {/* Felt Base Layer */}
        <rect x="8" y="42" width="48" height="10" rx="3" fill="#78350f" stroke="#451a03" strokeWidth="1.5" />
        {/* 3D Wood Grain Highlights */}
        <line x1="14" y1="30" x2="38" y2="30" stroke="#fef3c7" strokeWidth="2" strokeLinecap="round" opacity="0.7" />
        <line x1="22" y1="36" x2="50" y2="36" stroke="#fef3c7" strokeWidth="2" strokeLinecap="round" opacity="0.7" />
        {/* Wooden Handle Contour */}
        <path d="M 16 24 C 20 17, 44 17, 48 24" fill="none" stroke="#92400e" strokeWidth="2.5" strokeLinecap="round" />
      </svg>
    );
  }

  if (id === "wool-glove") {
    return (
      <svg width={size} height={size} viewBox="0 0 64 64" className="drop-shadow-sm">
        {/* Knitted Wool Winter Glove */}
        <path
          d="M 22 52 L 22 34 C 22 30, 26 30, 26 34 L 26 22 C 26 18, 30 18, 30 22 L 30 20 C 30 16, 34 16, 34 20 L 34 22 C 34 18, 38 18, 38 22 L 38 36 C 38 34, 44 34, 44 38 L 44 44 C 44 50, 42 54, 38 56 L 22 56 Z"
          fill="#38bdf8"
          stroke="#0284c7"
          strokeWidth="2.5"
          strokeLinejoin="round"
        />
        {/* Thumb */}
        <path d="M 22 42 C 16 40, 14 34, 18 30 C 22 28, 24 34, 24 38" fill="#38bdf8" stroke="#0284c7" strokeWidth="2" />
        {/* Knitted Cuff */}
        <rect x="20" y="52" width="22" height="7" rx="2.5" fill="#0284c7" />
        <line x1="24" y1="53" x2="24" y2="58" stroke="#ffffff" strokeWidth="1.2" opacity="0.8" />
        <line x1="28" y1="53" x2="28" y2="58" stroke="#ffffff" strokeWidth="1.2" opacity="0.8" />
        <line x1="32" y1="53" x2="32" y2="58" stroke="#ffffff" strokeWidth="1.2" opacity="0.8" />
        <line x1="36" y1="53" x2="36" y2="58" stroke="#ffffff" strokeWidth="1.2" opacity="0.8" />
      </svg>
    );
  }

  if (id === "plastic-ruler") {
    return (
      <svg width={size} height={size} viewBox="0 0 64 64" className="drop-shadow-sm">
        {/* 3D Translucent Plastic Ruler */}
        <g transform="rotate(-25 32 32)">
          <rect x="6" y="24" width="52" height="16" rx="4" fill="#fde047" fillOpacity="0.85" stroke="#ca8a04" strokeWidth="2.2" />
          {/* Centimeter Tick Marks */}
          <line x1="12" y1="24" x2="12" y2="33" stroke="#854d0e" strokeWidth="1.5" />
          <line x1="18" y1="24" x2="18" y2="29" stroke="#854d0e" strokeWidth="1.2" />
          <line x1="24" y1="24" x2="24" y2="33" stroke="#854d0e" strokeWidth="1.5" />
          <line x1="30" y1="24" x2="30" y2="29" stroke="#854d0e" strokeWidth="1.2" />
          <line x1="36" y1="24" x2="36" y2="33" stroke="#854d0e" strokeWidth="1.5" />
          <line x1="42" y1="24" x2="42" y2="29" stroke="#854d0e" strokeWidth="1.2" />
          <line x1="48" y1="24" x2="48" y2="33" stroke="#854d0e" strokeWidth="1.5" />
        </g>
      </svg>
    );
  }

  // Bare Finger (Conductor)
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" className="drop-shadow-sm">
      {/* 3D Hand with Pointing Finger */}
      <path
        d="M 28 12 C 28 8, 36 8, 36 12 L 36 32 C 36 30, 42 30, 42 34 L 42 38 C 42 36, 48 36, 48 40 L 48 48 C 48 56, 40 60, 32 60 C 24 60, 20 54, 20 46 L 20 28 C 20 26, 28 26, 28 30 Z"
        fill="#fdba74"
        stroke="#ea580c"
        strokeWidth="2.5"
        strokeLinejoin="round"
      />
      {/* Fingernail Highlight */}
      <ellipse cx="32" cy="15" rx="3" ry="4" fill="#fed7aa" stroke="#ea580c" strokeWidth="1" />
      {/* Conductive Electric Aura */}
      <circle cx="32" cy="12" r="9" fill="none" stroke="#22c55e" strokeWidth="2" strokeDasharray="3 3" className="animate-spin" />
      <circle cx="32" cy="12" r="3.5" fill="#22c55e" />
    </svg>
  );
}

// ═════════════════════════════════════════════════════════════════════════════
// 3. 3D ROBOT ACTIVITY COMPONENT (MINT GREEN & CREAM THEME)
// ═════════════════════════════════════════════════════════════════════════════

function TabletRobotScene({ isUnlocked, isRejectionShaking }: { isUnlocked: boolean; isRejectionShaking: boolean }) {
  const [robotActionStep, setRobotActionStep] = useState<number>(0);

  useEffect(() => {
    if (isUnlocked) {
      setRobotActionStep(1); // Waking up!
      const t1 = setTimeout(() => setRobotActionStep(2), 700); // Rolling forward
      const t2 = setTimeout(() => setRobotActionStep(3), 1400); // Pressing button
      const t3 = setTimeout(() => setRobotActionStep(4), 2100); // Celebrating / Mission active
      return () => {
        clearTimeout(t1);
        clearTimeout(t2);
        clearTimeout(t3);
      };
    } else {
      setRobotActionStep(0);
    }
  }, [isUnlocked]);

  return (
    <div
      className={`relative w-full h-full flex flex-col items-center justify-between p-3 rounded-2xl transition-all duration-300 bg-[#F0F9EF] border border-[#CDE9D2] ${
        isRejectionShaking ? "animate-[shake_0.4s_ease-in-out]" : ""
      }`}
    >
      {/* Tablet Screen Top App Bar */}
      <div className="w-full flex items-center justify-between pb-1.5 border-b border-[#CDE9D2] z-10 shrink-0">
        <span className="flex items-center gap-1.5 text-xs font-black text-[#285C48]">
          <Bot size={15} className="text-[#15966B]" />
          <span>ROBO-LAB OS 4.0</span>
        </span>
        <div className="flex items-center gap-1.5 text-[10px]">
          {isUnlocked ? (
            <div className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-[#DDF5DF] border border-[#78CFA5] text-[#15966B] font-black shadow-2xs">
              <span className="w-2 h-2 rounded-full bg-[#15966B] animate-ping" />
              <span>SYSTEM ONLINE</span>
            </div>
          ) : (
            <div className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-[#FFF4DB] border border-[#FDE68A] text-[#92400E] font-bold shadow-2xs">
              <span className="w-2 h-2 rounded-full bg-[#F59E0B]" />
              <span>STANDBY · LOCKED</span>
            </div>
          )}
        </div>
      </div>

      {/* ── CENTRAL ACTIVITY PLAYGROUND (MINT GREEN & CREAM THEME) ── */}
      <div className="relative flex-1 w-full flex items-center justify-center gap-3 sm:gap-4 z-10 px-2 my-auto">
        
        {/* Card 1: Virtual Switch in White Rounded Card */}
        <div className="flex-1 max-w-[145px] bg-white border border-[#CDE9D2] rounded-2xl p-2.5 shadow-sm flex flex-col items-center justify-center text-center">
          <div className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#FFF4DB] border border-[#FDE68A] text-[#92400E] text-[9px] font-black uppercase mb-2">
            <Zap size={10} className="text-[#D97706]" />
            <span>Virtual Switch</span>
          </div>

          <div
            className={`w-13 h-13 rounded-2xl border-2 flex items-center justify-center transition-all duration-500 shadow-sm ${
              isUnlocked && robotActionStep >= 3
                ? "bg-[#15966B] border-[#78CFA5] scale-105 shadow-md shadow-[#15966B]/30"
                : "bg-[#DDF5DF] border-[#CDE9D2]"
            }`}
          >
            <Power
              size={26}
              className={`transition-colors ${
                isUnlocked && robotActionStep >= 3
                  ? "text-white animate-pulse"
                  : "text-[#15966B]"
              }`}
            />
          </div>
          <span
            className={`text-[10px] font-black uppercase tracking-wider mt-1.5 ${
              isUnlocked && robotActionStep >= 3 ? "text-[#15966B]" : "text-[#648477]"
            }`}
          >
            {isUnlocked && robotActionStep >= 3 ? "POWER: ONLINE!" : "SWITCH: IDLE"}
          </span>
        </div>

        {/* Card 2: Robot Lab in White Rounded Card */}
        <div className="flex-1 max-w-[165px] bg-white border border-[#CDE9D2] rounded-2xl p-2.5 shadow-sm flex flex-col items-center justify-center text-center relative">
          <div className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#FFF4DB] border border-[#FDE68A] text-[#92400E] text-[9px] font-black uppercase mb-1">
            <Bot size={10} className="text-[#D97706]" />
            <span>Robot Lab</span>
          </div>

          {/* Floating 'z Z z' when locked */}
          {!isUnlocked && (
            <div className="absolute top-2 right-2 text-[10px] font-black font-mono text-[#D97706] animate-bounce">
              z Z z
            </div>
          )}

          {/* Celebratory Sparks when unlocked */}
          {isUnlocked && robotActionStep >= 3 && (
            <div className="absolute top-1 right-2 text-[#15966B] animate-spin">
              <Sparkles size={18} />
            </div>
          )}

          {/* Friendly Robot with Mint/Cream Accents */}
          <div
            className={`relative flex flex-col items-center transition-all duration-700 my-1 ${
              robotActionStep === 0
                ? "opacity-85 scale-95"
                : robotActionStep === 1
                ? "scale-100 -translate-y-1"
                : robotActionStep === 2
                ? "-translate-x-3 scale-105"
                : robotActionStep >= 3
                ? "-translate-x-4 scale-105"
                : ""
            }`}
          >
            <svg width="60" height="60" viewBox="0 0 68 68">
              {/* Robot Head Antenna */}
              <line x1="34" y1="12" x2="34" y2="4" stroke="#648477" strokeWidth="2.5" />
              <circle
                cx="34"
                cy="3"
                r="3.5"
                fill={isUnlocked ? "#15966B" : "#F59E0B"}
                className={isUnlocked ? "animate-pulse" : ""}
              />

              {/* Robot Head */}
              <rect x="18" y="12" width="32" height="24" rx="7" fill="#FFFFFF" stroke="#15966B" strokeWidth="2.5" />

              {/* Visor Screen */}
              <rect x="22" y="16" width="24" height="13" rx="4" fill="#285C48" />

              {/* Digital Eyes */}
              {isUnlocked ? (
                <>
                  <circle cx="28" cy="22" r="3" fill="#78CFA5" />
                  <circle cx="40" cy="22" r="3" fill="#78CFA5" />
                </>
              ) : (
                <>
                  {/* Sleeping Closed Eyes */}
                  <line x1="26" y1="23" x2="30" y2="23" stroke="#F59E0B" strokeWidth="2" strokeLinecap="round" />
                  <line x1="38" y1="23" x2="42" y2="23" stroke="#F59E0B" strokeWidth="2" strokeLinecap="round" />
                </>
              )}

              {/* Robot Body Chassis */}
              <rect x="20" y="38" width="28" height="20" rx="6" fill="#DDF5DF" stroke="#15966B" strokeWidth="2.5" />
              {/* Chest Accent in Cream */}
              <rect x="25" y="42" width="18" height="7" rx="2" fill="#FFF4DB" />
              <circle cx="34" cy="45.5" r="2" fill={isUnlocked ? "#15966B" : "#648477"} />

              {/* Treads */}
              <rect x="15" y="56" width="38" height="8" rx="4" fill="#648477" stroke="#285C48" strokeWidth="1.8" />
            </svg>
          </div>

          <span className="text-[10px] font-black tracking-wider text-[#285C48]">
            {isUnlocked ? "ROBO HELPER: ONLINE" : "ROBO HELPER: SLEEPING"}
          </span>
        </div>
      </div>

      {/* Bottom Activity Feedback Bar in Mint Green & Cream */}
      <div className="w-full z-10 text-center">
        {isUnlocked ? (
          <div className="px-3 py-1.5 rounded-xl bg-[#DDF5DF] border border-[#78CFA5] text-[#15966B] font-black text-xs shadow-xs animate-pulse">
            🎉 Touch Detected! Your tablet is unlocked – Power System Online!
          </div>
        ) : (
          <div className="px-3 py-1.5 rounded-xl bg-[#FFF4DB] border border-[#FDE68A] text-[#92400E] font-bold text-[11px] shadow-xs">
            Activity paused – Waiting for valid conductive touch.
          </div>
        )}
      </div>
    </div>
  );
}

// ═════════════════════════════════════════════════════════════════════════════
// 4. SCREEN 3: REALISTIC 3D HUMAN FINGER & EXPLODED CUTAWAY SIMULATION
// ═════════════════════════════════════════════════════════════════════════════

function RealisticHumanFinger({ fingerY, isTouching }: { fingerY: number; isTouching: boolean }) {
  return (
    <group position={[0, fingerY, 0]}>
      {/* ── 1. PROXIMAL & INTERMEDIATE PHALANGES (UPPER FINGER SHAFT) ── */}
      {/* Upper finger segment: gently tapered, natural warm skin tone */}
      <mesh position={[0, 1.15, 0]}>
        <cylinderGeometry args={[0.26, 0.285, 0.85, 32]} />
        <meshStandardMaterial color="#f5af88" roughness={0.65} metalness={0.02} />
      </mesh>

      {/* PIP Knuckle Creases (Upper Joint dorsal creases) */}
      <mesh position={[0, 0.74, 0.14]} rotation={[0.06, 0, 0]}>
        <torusGeometry args={[0.22, 0.015, 10, 24, Math.PI * 0.7]} />
        <meshStandardMaterial color="#d48c66" roughness={0.8} />
      </mesh>
      <mesh position={[0, 0.70, 0.15]} rotation={[0.06, 0, 0]}>
        <torusGeometry args={[0.23, 0.015, 10, 24, Math.PI * 0.7]} />
        <meshStandardMaterial color="#d48c66" roughness={0.8} />
      </mesh>

      {/* Middle finger segment (Intermediate Phalanx) */}
      <mesh position={[0, 0.42, 0.02]}>
        <cylinderGeometry args={[0.235, 0.26, 0.65, 32]} />
        <meshStandardMaterial color="#f6b38d" roughness={0.62} metalness={0.02} />
      </mesh>

      {/* DIP Knuckle Creases (Distal Joint dorsal creases) */}
      <mesh position={[0, 0.13, 0.15]} rotation={[0.08, 0, 0]}>
        <torusGeometry args={[0.19, 0.013, 10, 24, Math.PI * 0.65]} />
        <meshStandardMaterial color="#d48c66" roughness={0.8} />
      </mesh>

      {/* ── 2. DISTAL PHALANX (LOWER SEGMENT & TAPERED FINGERTIP) ── */}
      {/* Lower segment tapering smoothly toward fingertip */}
      <mesh position={[0, -0.10, 0.02]}>
        <cylinderGeometry args={[0.195, 0.235, 0.42, 32]} />
        <meshStandardMaterial color="#f7b792" roughness={0.58} metalness={0.02} />
      </mesh>

      {/* Rounded Natural Fingertip Pad (Touching the glass surface) */}
      <mesh position={[0, -0.28, 0.01]} scale={[1, 0.85, 1.08]}>
        <sphereGeometry args={[0.205, 32, 24, 0, Math.PI * 2, 0, Math.PI]} />
        <meshStandardMaterial color="#f7b792" roughness={0.55} metalness={0.02} />
      </mesh>

      {/* ── 3. REALISTIC 3D FINGERNAIL (SEPARATE GEOMETRY ON DORSAL (+Z) SIDE) ── */}
      {/* Positioned on front-facing surface angled directly towards camera */}
      <group position={[0, -0.09, 0.15]} rotation={[0.16, 0, 0]}>
        {/* Curved Translucent Fingernail Plate */}
        <mesh scale={[1.05, 1, 1]}>
          <cylinderGeometry
            args={[0.175, 0.165, 0.32, 28, 1, false, Math.PI * 0.22, Math.PI * 0.56]}
          />
          <meshPhysicalMaterial
            color="#fce7f3"
            transmission={0.35}
            opacity={0.92}
            transparent={true}
            roughness={0.12}
            metalness={0.05}
            clearcoat={0.9}
            clearcoatRoughness={0.1}
            ior={1.45}
            specularIntensity={1.0}
            specularColor="#ffffff"
          />
        </mesh>

        {/* Nail Cuticle / Eponychium (Skin fold at root of nail) */}
        <mesh position={[0, 0.16, 0.04]} rotation={[0, 0, 0]}>
          <torusGeometry args={[0.13, 0.016, 10, 20, Math.PI * 0.7]} />
          <meshStandardMaterial color="#e0926e" roughness={0.7} />
        </mesh>

        {/* Natural Pale Free Edge (Tip of nail near bottom) */}
        <mesh position={[0, -0.15, 0.02]} rotation={[0, 0, 0]}>
          <torusGeometry args={[0.125, 0.014, 8, 20, Math.PI * 0.65]} />
          <meshStandardMaterial color="#fffbeb" roughness={0.3} transparent opacity={0.85} />
        </mesh>
      </group>

      {/* ── 4. CONDUCTIVE COUPLING AURA (WHEN TOUCHING SURFACE) ── */}
      {isTouching && (
        <mesh position={[0, -0.28, 0.01]}>
          <sphereGeometry args={[0.32, 24, 24]} />
          <meshBasicMaterial color="#22c55e" transparent opacity={0.3} />
        </mesh>
      )}
    </group>
  );
}

function ElectricFieldCutaway3D({ fingerDistance }: { fingerDistance: number }) {
  // fingerDistance: 100 = far away, 0 = touching surface
  // Maps to 3D Y coordinate of finger:
  // Far away (100) -> Y = 2.40 (pad bottom at 2.12)
  // Touching (0) -> Y = 0.74 (pad bottom at 0.46, resting flush on glass top at 0.46)
  const fingerY = useMemo(() => {
    return 0.74 + (fingerDistance / 100) * 1.66;
  }, [fingerDistance]);

  const isTouching = fingerDistance <= 20;
  const isApproaching = fingerDistance > 20 && fingerDistance <= 60;

  return (
    <Canvas camera={{ position: [0, 2.2, 5.2], fov: 42 }}>
      <ambientLight intensity={0.9} />
      <directionalLight position={[4, 5, 4]} intensity={1.4} />
      <directionalLight position={[-4, 3, -2]} intensity={0.6} />

      {/* 3D Orbit Controls */}
      <OrbitControls
        enableZoom={false}
        maxPolarAngle={Math.PI / 2.1}
        minPolarAngle={Math.PI / 4.5}
        maxAzimuthAngle={Math.PI / 3}
        minAzimuthAngle={-Math.PI / 3}
      />

      <group position={[0, -0.4, 0]}>

        {/* ── LAYER 3: LCD/OLED DISPLAY BASE SUBSTRATE ── */}
        <mesh position={[0, -0.25, 0]}>
          <boxGeometry args={[4.4, 0.25, 3.0]} />
          <meshStandardMaterial color="#0f172a" roughness={0.3} metalness={0.6} />
        </mesh>

        {/* ── LAYER 2: TRANSPARENT CONDUCTIVE ELECTRODE GRID (ITO) ── */}
        <group position={[0, 0.05, 0]}>
          {/* Transparent ITO Substrate Film */}
          <mesh>
            <boxGeometry args={[4.3, 0.08, 2.9]} />
            <meshStandardMaterial color="#38bdf8" transparent opacity={0.25} roughness={0.1} />
          </mesh>

          {/* Micro-Electrode Grid Lines (X-axis) */}
          {[-1.5, -0.75, 0, 0.75, 1.5].map((x, idx) => (
            <mesh key={`grid-x-${idx}`} position={[x, 0.04, 0]}>
              <boxGeometry args={[0.08, 0.04, 2.8]} />
              <meshStandardMaterial
                color="#0284c7"
                emissive={isApproaching || isTouching ? "#38bdf8" : "#0284c7"}
                emissiveIntensity={isTouching && Math.abs(x) < 0.8 ? 1.5 : 0.4}
              />
            </mesh>
          ))}

          {/* Micro-Electrode Grid Lines (Z-axis) */}
          {[-1.0, -0.5, 0, 0.5, 1.0].map((z, idx) => (
            <mesh key={`grid-z-${idx}`} position={[0, 0.04, z]}>
              <boxGeometry args={[4.2, 0.04, 0.08]} />
              <meshStandardMaterial
                color="#0284c7"
                emissive={isApproaching || isTouching ? "#38bdf8" : "#0284c7"}
                emissiveIntensity={isTouching && Math.abs(z) < 0.6 ? 1.5 : 0.4}
              />
            </mesh>
          ))}
        </group>

        {/* ── LAYER 1: PROTECTIVE TEMPERED GLASS LAYER ── */}
        <mesh position={[0, 0.38, 0]}>
          <boxGeometry args={[4.5, 0.16, 3.1]} />
          <meshPhysicalMaterial
            transmission={0.8}
            opacity={0.45}
            transparent
            roughness={0.08}
            ior={1.5}
            color="#bae6fd"
          />
        </mesh>

        {/* ── 3D ELECTRIC FIELD LINES BETWEEN ELECTRODES ── */}
        {/* Curved arches across electrodes that pull upward when finger approaches */}
        {[-1.1, -0.4, 0.4, 1.1].map((cx, idx) => {
          const isNearCenter = Math.abs(cx) <= 0.6;
          const pullY = isNearCenter ? (100 - fingerDistance) * 0.007 : 0;

          return (
            <mesh
              key={`field-arch-${idx}`}
              position={[cx, 0.4 + pullY * 0.5, 0]}
              rotation={[0, 0, Math.PI / 2]}
            >
              <torusGeometry args={[0.28 + pullY, 0.02, 8, 24, Math.PI]} />
              <meshStandardMaterial
                color={isTouching && isNearCenter ? "#22c55e" : "#38bdf8"}
                emissive={isTouching && isNearCenter ? "#22c55e" : "#0284c7"}
                emissiveIntensity={isNearCenter ? 1.2 : 0.4}
              />
            </mesh>
          );
        })}

        {/* ── TOUCH DETECTION RIPPLE ON GLASS ── */}
        {isTouching && (
          <Float speed={4} rotationIntensity={0} floatIntensity={0.2}>
            <mesh position={[0, 0.48, 0]} rotation={[-Math.PI / 2, 0, 0]}>
              <ringGeometry args={[0.1, 0.45, 32]} />
              <meshBasicMaterial color="#22c55e" transparent opacity={0.65} side={THREE.DoubleSide} />
            </mesh>
          </Float>
        )}

        {/* ── REALISTIC 3D HUMAN INDEX FINGER POSITIONED BY SLIDER ── */}
        <RealisticHumanFinger fingerY={fingerY} isTouching={isTouching} />
      </group>
    </Canvas>
  );
}

// ═════════════════════════════════════════════════════════════════════════════
// 5. MAIN GAME COMPONENT & STATE MACHINE
// ═════════════════════════════════════════════════════════════════════════════

export default function TouchscreenCapacitiveLab() {
  const { width, height } = useWindowSize();
  const { playPop, playError, playSuccess, playZap } = useLabAudio();
  const { reportComplete } = useLMSBridge("touchscreen-capacitive");

  // Navigation state: Exactly 4 screens
  const [screen, setScreen] = useState<GameScreen>("welcome");
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);
  const [showHelp, setShowHelp] = useState<boolean>(false);
  const [sessionSeconds, setSessionSeconds] = useState<number>(0);
  const [score, setScore] = useState<number>(0);

  // ── Screen 2: Material Testing State (Strict Sequence 0 -> 1 -> 2 -> 3) ──
  const [currentTestIndex, setCurrentTestIndex] = useState<number>(0);
  const [testedResults, setTestedResults] = useState<{ [materialId: string]: boolean }>({});
  const [activeFeedback, setActiveFeedback] = useState<{
    material: MaterialItem;
    success: boolean;
    timestamp: number;
  } | null>(null);
  const [isTabletUnlocked, setIsTabletUnlocked] = useState<boolean>(false);
  const [isRejectionShaking, setIsRejectionShaking] = useState<boolean>(false);
  const [rippleActive, setRippleActive] = useState<{ x: number; y: number } | null>(null);

  // ── Drag & Drop State ──
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dragPos, setDragPos] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isOverTablet, setIsOverTablet] = useState<boolean>(false);
  const tabletScreenRef = useRef<HTMLDivElement | null>(null);

  // ── Screen 3: Electric Field Discovery State ──
  // fingerDistance: 100 = far away (baseline), 0 = touching surface
  const [fingerDistance, setFingerDistance] = useState<number>(85);
  const [discoveryExplored, setDiscoveryExplored] = useState<boolean>(false);

  // Timer interval
  useEffect(() => {
    const interval = setInterval(() => {
      setSessionSeconds((prev) => prev + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const formatTimer = (totalSeconds: number) => {
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
  };

  // Sound helper
  const triggerSound = useCallback(
    (type: "pop" | "success" | "zap" | "error") => {
      if (!soundEnabled) return;
      if (type === "pop") playPop();
      if (type === "success") playSuccess();
      if (type === "zap") playZap();
      if (type === "error") playError();
    },
    [soundEnabled, playPop, playSuccess, playZap, playError]
  );

  // ═════════════════════════════════════════════════════════════════════════════
  // DRAG & DROP HANDLING VIA POINTER EVENTS (TOUCH & MOUSE SUPPORT)
  // ═════════════════════════════════════════════════════════════════════════════

  const handlePointerDown = (e: React.PointerEvent, materialId: string, index: number) => {
    // Only the currently active sequential material can be dragged
    if (index !== currentTestIndex || isTabletUnlocked) return;

    e.preventDefault();
    triggerSound("pop");
    setDraggingId(materialId);
    setDragPos({ x: e.clientX, y: e.clientY });

    const handlePointerMove = (moveEvent: PointerEvent) => {
      setDragPos({ x: moveEvent.clientX, y: moveEvent.clientY });

      if (tabletScreenRef.current) {
        const rect = tabletScreenRef.current.getBoundingClientRect();
        const inside =
          moveEvent.clientX >= rect.left &&
          moveEvent.clientX <= rect.right &&
          moveEvent.clientY >= rect.top &&
          moveEvent.clientY <= rect.bottom;
        setIsOverTablet(inside);
      }
    };

    const handlePointerUp = (upEvent: PointerEvent) => {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);

      let droppedInside = false;
      if (tabletScreenRef.current) {
        const rect = tabletScreenRef.current.getBoundingClientRect();
        droppedInside =
          upEvent.clientX >= rect.left &&
          upEvent.clientX <= rect.right &&
          upEvent.clientY >= rect.top &&
          upEvent.clientY <= rect.bottom;

        if (droppedInside) {
          const relX = ((upEvent.clientX - rect.left) / rect.width) * 100;
          const relY = ((upEvent.clientY - rect.top) / rect.height) * 100;
          handleProcessDrop(materialId, relX, relY);
        }
      }

      setDraggingId(null);
      setIsOverTablet(false);
    };

    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", handlePointerUp);
  };

  const handleProcessDrop = (materialId: string, relX: number, relY: number) => {
    const material = MATERIALS.find((m) => m.id === materialId);
    if (!material) return;

    if (material.conducts) {
      // ── BARE FINGER: SUCCESSFUL CONDUCTIVE TOUCH! ──
      triggerSound("zap");
      triggerSound("success");
      setRippleActive({ x: relX, y: relY });
      setIsTabletUnlocked(true);
      setTestedResults((prev) => ({ ...prev, [materialId]: true }));
      setActiveFeedback({
        material,
        success: true,
        timestamp: Date.now(),
      });
      setScore(100);
      reportComplete({ points: 100 });
    } else {
      // ── INSULATOR: REJECTION (CAUSE & EFFECT) ──
      triggerSound("error");
      setIsRejectionShaking(true);
      setTimeout(() => setIsRejectionShaking(false), 450);

      setTestedResults((prev) => ({ ...prev, [materialId]: false }));
      setActiveFeedback({
        material,
        success: false,
        timestamp: Date.now(),
      });

      // Advance to next material in sequence after brief observation
      setTimeout(() => {
        setCurrentTestIndex((prev) => Math.min(prev + 1, MATERIALS.length - 1));
      }, 1500);
    }
  };

  // ── Reset Screen Handlers ──
  const handleResetExperiment = () => {
    triggerSound("pop");
    setCurrentTestIndex(0);
    setTestedResults({});
    setActiveFeedback(null);
    setIsTabletUnlocked(false);
    setIsRejectionShaking(false);
    setRippleActive(null);
  };

  const handleFullReplay = () => {
    triggerSound("pop");
    handleResetExperiment();
    setFingerDistance(85);
    setDiscoveryExplored(false);
    setScreen("welcome");
  };

  // ═════════════════════════════════════════════════════════════════════════════
  // RENDER (STRICT 100% LIGHT THEME & VIEWPORT LOCK)
  // ═════════════════════════════════════════════════════════════════════════════

  return (
    <div className="w-full h-[100dvh] max-h-[100dvh] overflow-hidden select-none flex flex-col bg-gradient-to-b from-[#F0FDF4] via-[#F8FAFC] to-[#EFF6FF] text-slate-800 font-sans">

      {/* ── 1. TOP BAR ── */}
      <header className="w-full h-13 px-4 bg-white/95 border-b border-sky-200/90 shadow-xs flex items-center justify-between shrink-0 z-40">
        {/* Left: Back Link & Title */}
        <div className="flex items-center gap-3 min-w-0">
          <Link href="/">
            <button
              className="w-8 h-8 rounded-xl bg-sky-50 hover:bg-sky-100 text-sky-900 border border-sky-200 flex items-center justify-center transition cursor-pointer shadow-xs"
              title="Back to All Labs"
            >
              <ArrowLeft size={16} strokeWidth={2.4} />
            </button>
          </Link>

          <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-sky-500 to-indigo-500 p-0.5 shadow-xs flex items-center justify-center text-white">
            <Smartphone size={18} />
          </div>

          <div className="min-w-0">
            <h1 className="text-sm sm:text-base font-black text-slate-900 truncate tracking-tight">
              Touchscreen Magic Challenge
            </h1>
            <span className="hidden sm:inline-block text-[10px] font-bold text-sky-700 uppercase tracking-wider">
              Discover the Science Behind Capacitive Touchscreens
            </span>
          </div>
        </div>

        {/* Center: Session Timer & Score */}
        <div className="flex items-center gap-2 sm:gap-3">
          <div className="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-sky-50 border border-sky-200 text-sky-950 shadow-xs">
            <Compass size={15} className="text-sky-600" />
            <div className="flex flex-col text-left leading-none">
              <span className="text-[9px] font-black uppercase text-sky-800">SESSION TIME</span>
              <span className="text-xs font-black font-mono tracking-wider">{formatTimer(sessionSeconds)}</span>
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

        {/* Right: Sound, Reset & Help */}
        <div className="flex items-center gap-1.5 sm:gap-2">
          <button
            onClick={() => {
              triggerSound("pop");
              setSoundEnabled(!soundEnabled);
            }}
            className="w-8 h-8 rounded-xl bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 flex items-center justify-center transition cursor-pointer"
            title="Toggle Sound Effects"
          >
            {soundEnabled ? <Volume2 size={16} /> : <VolumeX size={16} />}
          </button>

          <button
            onClick={handleResetExperiment}
            className="w-8 h-8 rounded-xl bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 flex items-center justify-center transition cursor-pointer"
            title="Reset Material Testing"
          >
            <RotateCcw size={16} />
          </button>

          <button
            onClick={() => {
              triggerSound("pop");
              setShowHelp(true);
            }}
            className="w-8 h-8 rounded-xl bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 flex items-center justify-center transition cursor-pointer"
            title="Mission Help"
          >
            <HelpCircle size={16} />
          </button>
        </div>
      </header>

      {/* ── 2. MAIN INTERACTIVE AREA ── */}
      <main className="relative flex-1 min-h-0 w-full overflow-hidden flex flex-col p-3 gap-2">

        {/* ═════════════════════════════════════════════════════════════════════
            SCREEN 2: MATERIAL TESTING (NEW 3-COLUMN WORKBENCH)
            ═════════════════════════════════════════════════════════════════════ */}
        {screen === "testing" && (
          <div className="relative flex-1 min-h-0 w-full flex flex-col md:flex-row gap-3">

            {/* ── COLUMN 1 (LEFT): MATERIAL TOOLBOX ── */}
            <div className="w-full md:w-64 lg:w-72 flex flex-col p-3 rounded-3xl bg-white/95 border-2 border-sky-200 shadow-sm shrink-0 overflow-y-auto justify-between">
              <div>
                <div className="flex items-center gap-1.5 border-b border-sky-100 pb-2 mb-2.5">
                  <Wrench size={16} className="text-sky-600" />
                  <span className="text-xs font-black uppercase text-slate-900 tracking-wider">
                    Material Toolbox
                  </span>
                </div>

                <p className="text-[11px] font-semibold text-slate-600 mb-2.5">
                  Drag the active material directly onto the tablet screen:
                </p>

                {/* Vertical Draggable Cards */}
                <div className="space-y-2">
                  {MATERIALS.map((item, idx) => {
                    const isCurrent = currentTestIndex === idx && !isTabletUnlocked;
                    const isTested = testedResults[item.id] !== undefined;
                    const isPassed = testedResults[item.id] === true;
                    const isLocked = idx > currentTestIndex;

                    return (
                      <div
                        key={`toolbox-${item.id}`}
                        onPointerDown={(e) => handlePointerDown(e, item.id, idx)}
                        className={`p-2.5 rounded-2xl border-2 transition-all flex items-center justify-between select-none ${isCurrent
                            ? "bg-white border-sky-400 shadow-md ring-2 ring-sky-300 ring-offset-1 cursor-grab active:cursor-grabbing hover:scale-102"
                            : isPassed
                              ? "bg-emerald-50 border-emerald-300 opacity-90 cursor-default"
                              : isTested
                                ? "bg-rose-50/70 border-rose-200 opacity-75 cursor-default"
                                : "bg-slate-50 border-slate-200 opacity-50 cursor-not-allowed"
                          }`}
                        style={{ touchAction: "none" }}
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className="w-10 h-10 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-center shrink-0">
                            <MaterialVisualIcon id={item.id} size={28} />
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-1">
                              <span className="font-bold text-xs truncate text-slate-900">
                                {item.name}
                              </span>
                            </div>
                            <span className="text-[9px] font-semibold text-slate-500 block truncate">
                              {item.category}
                            </span>
                          </div>
                        </div>

                        {/* Status Icon Indicator */}
                        <div className="shrink-0 pl-1">
                          {isCurrent ? (
                            <span className="px-2 py-0.5 rounded-full text-[9px] font-black bg-sky-100 text-sky-800 border border-sky-300 animate-pulse">
                              DRAG ME
                            </span>
                          ) : isPassed ? (
                            <CheckCircle2 size={16} className="text-emerald-600" />
                          ) : isTested ? (
                            <XCircle size={16} className="text-rose-500" />
                          ) : isLocked ? (
                            <Lock size={15} className="text-slate-400" />
                          ) : null}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Toolbox Guidance Tip */}
              <div className="mt-3 p-2.5 rounded-2xl bg-sky-50 border border-sky-200 text-[10px] font-bold text-sky-950">
                💡 <span className="font-black text-sky-900">TIP:</span> Drag one material at a time. Drops outside the tablet do not count!
              </div>
            </div>

            {/* ── COLUMN 2 (CENTRE): 3D TABLET INTERACTION ── */}
            <div className="relative flex-1 min-h-0 rounded-3xl bg-white/90 border-2 border-sky-200 shadow-sm flex flex-col items-center justify-center p-3 overflow-hidden">

              {/* Subtle Grid Canvas Pattern */}
              <div
                className="absolute inset-0 pointer-events-none opacity-20"
                style={{
                  backgroundImage: "radial-gradient(#0284c7 0.75px, transparent 0.75px)",
                  backgroundSize: "24px 24px",
                }}
              />

              {/* 3D Tablet Device Shell */}
              <div className="relative w-full max-w-lg aspect-[4/3] rounded-[36px] p-3.5 bg-gradient-to-b from-slate-200 via-slate-100 to-slate-300 shadow-2xl border-4 border-slate-300 flex items-center justify-center transition-transform duration-300">
                {/* Tablet Inner Bezel */}
                <div className="relative w-full h-full rounded-[26px] bg-slate-900 p-2.5 shadow-inner flex flex-col">

                  {/* Top Camera Notch */}
                  <div className="w-full h-3.5 flex items-center justify-center mb-1 shrink-0">
                    <div className="w-2.5 h-2.5 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center">
                      <div className="w-1 h-1 rounded-full bg-sky-950" />
                    </div>
                  </div>

                  {/* ── THE INTERACTIVE CAPACITIVE GLASS TOUCHSCREEN (DROP ZONE) ── */}
                  <div
                    ref={tabletScreenRef}
                    className={`relative flex-1 rounded-[18px] overflow-hidden transition-all duration-300 flex flex-col ${isOverTablet
                        ? "ring-4 ring-sky-400 ring-offset-2 ring-offset-slate-900 shadow-lg scale-[1.01]"
                        : ""
                      }`}
                  >
                    {/* Glass Gloss Surface Highlight */}
                    <div className="absolute inset-0 bg-gradient-to-tr from-white/10 via-transparent to-white/5 pointer-events-none z-20" />

                    {/* Touch Ripple Wave Effect when Bare Finger Drops */}
                    {rippleActive && (
                      <div
                        className="absolute w-44 h-44 rounded-full border-4 border-sky-300 bg-sky-400/30 pointer-events-none animate-ping -translate-x-1/2 -translate-y-1/2 z-30"
                        style={{ left: `${rippleActive.x}%`, top: `${rippleActive.y}%` }}
                      />
                    )}

                    {/* ── EMBEDDED 3D ROBOT CAUSE-AND-EFFECT ACTIVITY ── */}
                    <TabletRobotScene
                      isUnlocked={isTabletUnlocked}
                      isRejectionShaking={isRejectionShaking}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* ── COLUMN 3 (RIGHT): LEARNING CONTENT (NO 'FIXED' IN HEADING) ── */}
            <div className="w-full md:w-72 lg:w-80 flex flex-col justify-between p-3.5 rounded-3xl bg-white/95 border-2 border-sky-200 shadow-sm shrink-0 overflow-y-auto">
              <div>
                {/* Header – Note: 'FIXED' word completely removed as requested */}
                <div className="flex items-center justify-between border-b border-sky-100 pb-2 mb-2.5">
                  <div className="flex items-center gap-1.5">
                    <Layers size={16} className="text-sky-600" />
                    <span className="text-xs font-black uppercase text-slate-900 tracking-wider">
                      Material Testing
                    </span>
                  </div>
                  <span className="text-xs font-black font-mono px-2 py-0.5 rounded-full bg-sky-100 text-sky-900">
                    Step {currentTestIndex + 1} of 4
                  </span>
                </div>

                {/* Current Active Material Info */}
                <div className="p-3 rounded-2xl bg-sky-50/70 border border-sky-200 mb-2.5">
                  <span className="text-[10px] font-black uppercase text-sky-800 block mb-0.5">
                    CURRENT EXPERIMENT
                  </span>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-black text-slate-900">
                      {MATERIALS[currentTestIndex].name}
                    </span>
                    <span
                      className={`text-[9px] font-black px-2 py-0.5 rounded-full ${MATERIALS[currentTestIndex].conducts
                          ? "bg-emerald-100 text-emerald-800"
                          : "bg-amber-100 text-amber-800"
                        }`}
                    >
                      {MATERIALS[currentTestIndex].category}
                    </span>
                  </div>
                </div>

                {/* Cause-and-Effect Result Feedback */}
                {activeFeedback ? (
                  <div
                    className={`p-3 rounded-2xl border text-xs animate-in fade-in duration-200 ${activeFeedback.success
                        ? "bg-emerald-50 border-emerald-300 text-emerald-950"
                        : "bg-amber-50 border-amber-300 text-amber-950"
                      }`}
                  >
                    <div className="flex items-center gap-1.5 font-black mb-1">
                      {activeFeedback.success ? (
                        <>
                          <CheckCircle2 size={16} className="text-emerald-600" />
                          <span>{activeFeedback.material.name}: Touch Detected!</span>
                        </>
                      ) : (
                        <>
                          <XCircle size={16} className="text-amber-600" />
                          <span>{activeFeedback.material.rejectionMessage}</span>
                        </>
                      )}
                    </div>
                    <p className="text-[11px] leading-relaxed font-semibold">
                      {activeFeedback.material.explanation}
                    </p>
                  </div>
                ) : (
                  <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200 text-xs text-slate-600 leading-relaxed">
                    <span className="font-bold text-slate-800 block mb-1">How Detection Works:</span>
                    Drag <strong>{MATERIALS[currentTestIndex].name}</strong> onto the tablet. If detected, the 3D activity will unlock and start!
                  </div>
                )}
              </div>

              {/* Scientific Note */}
              <div className="mt-3 p-2.5 rounded-2xl bg-sky-50/80 border border-sky-200 text-[10px] font-bold text-sky-950 leading-relaxed">
                💡 <span className="font-black text-sky-900">SCIENTIFIC FACT:</span> Capacitive touchscreens require mobile electrical charges to alter capacitance. Insulators lack free charge carriers!
              </div>
            </div>
          </div>
        )}

        {/* ═════════════════════════════════════════════════════════════════════
            SCREEN 3: ELECTRIC FIELD DISCOVERY (3D UPGRADE)
            ═════════════════════════════════════════════════════════════════════ */}
        {screen === "discovery" && (
          <div className="relative flex-1 min-h-0 w-full flex flex-col md:flex-row gap-3">

            {/* ── LEFT: 3D PERSPECTIVE CUTAWAY SIMULATION ── */}
            <div className="relative flex-1 min-h-0 rounded-3xl bg-white/95 border-2 border-sky-200 shadow-sm flex flex-col items-center justify-between p-3.5 overflow-hidden">

              {/* Header Info */}
              <div className="w-full flex items-center justify-between border-b border-sky-100 pb-2 mb-1.5 shrink-0">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-xl bg-sky-100 text-sky-700 flex items-center justify-center font-black">
                    <Sliders size={16} />
                  </div>
                  <div>
                    <h2 className="text-xs sm:text-sm font-black text-slate-900">
                      3D Touchscreen Cross-Section Simulation
                    </h2>
                    <span className="text-[10px] font-bold text-sky-700 uppercase">
                      Interactive Microscopic Electrode Grid (Orbit to Inspect in 3D)
                    </span>
                  </div>
                </div>

                {/* Live Capacitance 3-State Indicator */}
                <div className="flex items-center gap-2 px-3 py-1 rounded-xl bg-slate-50 border border-slate-200">
                  <span className="text-[10px] font-black uppercase text-slate-500">Status:</span>
                  <span
                    className={`text-xs font-black font-mono ${fingerDistance <= 20
                        ? "text-emerald-600 animate-pulse"
                        : fingerDistance <= 60
                          ? "text-amber-600"
                          : "text-slate-700"
                      }`}
                  >
                    {fingerDistance <= 20
                      ? "⚡ STATE 3: TOUCH LOCATION DETECTED"
                      : fingerDistance <= 60
                        ? "⚠️ STATE 2: FIELD INTERACTION"
                        : "⚖️ STATE 1: BASELINE CAPACITANCE"}
                  </span>
                </div>
              </div>

              {/* ── 3D THREE.JS PERSPECTIVE CUTAWAY CANVAS ── */}
              <div className="relative flex-1 w-full min-h-0 rounded-2xl overflow-hidden bg-gradient-to-b from-sky-50/50 via-slate-50 to-white">
                <ElectricFieldCutaway3D fingerDistance={fingerDistance} />

                {/* 3D Layer Callouts */}
                <div className="absolute bottom-2 left-2 pointer-events-none flex flex-col gap-1 text-[9px] font-bold text-slate-600 bg-white/80 p-2 rounded-xl backdrop-blur-xs border border-sky-200">
                  <div className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-sm bg-sky-300" />
                    <span>Layer 1: Protective Tempered Glass</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-sm bg-sky-600" />
                    <span>Layer 2: Transparent ITO Electrode Grid</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-sm bg-slate-800" />
                    <span>Layer 3: Display Substrate</span>
                  </div>
                </div>
              </div>

              {/* ── INTERACTIVE FINGER PROXIMITY SLIDER ── */}
              <div className="w-full max-w-lg mt-2 p-2.5 rounded-2xl bg-sky-50 border border-sky-200 flex flex-col gap-1 shrink-0">
                <div className="flex items-center justify-between text-xs font-bold text-sky-950">
                  <span className="flex items-center gap-1.5">
                    <Hand size={14} className="text-sky-600" />
                    <span>Move Finger Closer to Screen</span>
                  </span>
                  <span className="font-mono text-sky-800">
                    {fingerDistance <= 20 ? "Touch Contact (0 mm)" : `${Math.round(fingerDistance / 5)} mm Away`}
                  </span>
                </div>

                <input
                  type="range"
                  min="0"
                  max="100"
                  value={fingerDistance}
                  onChange={(e) => {
                    const val = Number(e.target.value);
                    setFingerDistance(val);
                    if (val <= 20) {
                      triggerSound("zap");
                      setDiscoveryExplored(true);
                    }
                  }}
                  className="w-full accent-sky-600 cursor-pointer h-2 bg-sky-200 rounded-lg"
                />

                <div className="flex justify-between text-[10px] font-bold text-slate-500">
                  <span>👈 Surface Touch (Detect)</span>
                  <span>Far Away (Baseline) 👉</span>
                </div>
              </div>
            </div>

            {/* ── RIGHT: EDUCATIONAL SCIENCE EXPLORER PANEL ── */}
            <div className="w-full md:w-80 h-full flex flex-col justify-between p-3.5 rounded-3xl bg-white/95 border-2 border-sky-200 shadow-sm shrink-0 overflow-y-auto">
              <div className="space-y-3">
                <div className="flex items-center gap-1.5 border-b border-sky-100 pb-2">
                  <Info size={16} className="text-sky-600" />
                  <span className="text-xs font-black uppercase text-slate-900">
                    How Capacitance Works
                  </span>
                </div>

                <div className="p-3 rounded-2xl bg-sky-50 border border-sky-200 text-xs text-slate-700 leading-relaxed space-y-2">
                  <p className="font-bold text-sky-950">
                    Capacitive touchscreens detect changes in capacitance.
                  </p>
                  <p className="text-[11px]">
                    Underneath the protective glass lies an invisible grid of tiny conductive micro-electrodes (Indium Tin Oxide). A steady electric field flows continuously across this grid.
                  </p>
                  <p className="text-[11px]">
                    Because the human body conducts electricity, when your bare finger approaches the glass, it absorbs a tiny amount of micro-charge, altering the local capacitance!
                  </p>
                </div>

                {/* 3 Physics Interaction States */}
                <div className="space-y-1.5 text-[11px] font-semibold text-slate-700">
                  <div className={`p-2 rounded-xl border flex items-center gap-2 ${fingerDistance > 60 ? "bg-sky-100 border-sky-300 font-bold" : "bg-slate-50 border-slate-200"}`}>
                    <span className="w-5 h-5 rounded-full bg-sky-200 text-sky-900 font-black flex items-center justify-center text-[10px] shrink-0">1</span>
                    <span>State 1: Baseline field when finger is far</span>
                  </div>
                  <div className={`p-2 rounded-xl border flex items-center gap-2 ${fingerDistance > 20 && fingerDistance <= 60 ? "bg-amber-100 border-amber-300 font-bold" : "bg-slate-50 border-slate-200"}`}>
                    <span className="w-5 h-5 rounded-full bg-amber-200 text-amber-900 font-black flex items-center justify-center text-[10px] shrink-0">2</span>
                    <span>State 2: Electric field curves into approaching finger</span>
                  </div>
                  <div className={`p-2 rounded-xl border flex items-center gap-2 ${fingerDistance <= 20 ? "bg-emerald-100 border-emerald-300 font-bold" : "bg-slate-50 border-slate-200"}`}>
                    <span className="w-5 h-5 rounded-full bg-emerald-200 text-emerald-900 font-black flex items-center justify-center text-[10px] shrink-0">3</span>
                    <span>State 3: Surface touch registers exact location</span>
                  </div>
                </div>
              </div>

              {/* Status Note */}
              <div className="mt-2 p-2.5 rounded-2xl bg-emerald-50 border border-emerald-300 text-[11px] font-semibold text-emerald-950">
                {discoveryExplored
                  ? "✅ Fantastic! You saw how the 3D finger alters local capacitance!"
                  : "Drag the slider to move the 3D finger down to the glass surface!"}
              </div>
            </div>
          </div>
        )}

        {/* ═════════════════════════════════════════════════════════════════════
            OVERLAY: SCREEN 1 – WELCOME
            ═════════════════════════════════════════════════════════════════════ */}
        {screen === "welcome" && (
          <div className="absolute inset-0 z-30 bg-slate-900/25 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="max-w-lg w-full bg-white/95 backdrop-blur-md rounded-3xl p-6 shadow-2xl border-4 border-sky-300 text-center flex flex-col items-center animate-in zoom-in-95 duration-200">
              <div className="w-16 h-16 rounded-2xl bg-sky-100 border-2 border-sky-300 flex items-center justify-center text-sky-600 mb-3 shadow-inner">
                <Smartphone size={36} />
              </div>

              <h2 className="text-2xl font-black text-slate-900 mb-1 leading-tight">
                Touchscreen Magic Challenge
              </h2>
              <span className="text-xs font-black text-sky-700 uppercase tracking-widest mb-3">
                Discover the Science Behind Capacitive Touchscreens
              </span>

              <p className="text-xs sm:text-sm font-semibold text-slate-600 leading-relaxed mb-5 bg-sky-50/70 p-3.5 rounded-2xl border border-sky-200/80">
                &ldquo;Your tablet has a special touchscreen! Some materials can activate it, while others cannot. Test four different materials and discover how the touchscreen recognizes your touch.&rdquo;
              </p>

              {/* 4 Materials Preview */}
              <div className="grid grid-cols-4 gap-2 w-full mb-6">
                {MATERIALS.map((m) => (
                  <div key={m.id} className="p-2 rounded-xl bg-slate-50 border border-slate-200 flex flex-col items-center">
                    <MaterialVisualIcon id={m.id} size={28} />
                    <span className="text-[10px] font-bold text-slate-800 mt-1 truncate w-full text-center">
                      {m.name}
                    </span>
                  </div>
                ))}
              </div>

              <button
                onClick={() => {
                  triggerSound("pop");
                  setScreen("testing");
                }}
                className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-sky-500 to-indigo-600 hover:from-sky-600 hover:to-indigo-700 text-white font-black text-sm shadow-lg cursor-pointer transition animate-bounce flex items-center justify-center gap-2"
              >
                <span>Start Experiment: Test Materials</span>
                <ArrowRight size={18} />
              </button>
            </div>
          </div>
        )}

        {/* ═════════════════════════════════════════════════════════════════════
            OVERLAY: SCREEN 4 – RESULTS AND SUMMARY
            ═════════════════════════════════════════════════════════════════════ */}
        {screen === "results" && (
          <div className="absolute inset-0 z-30 bg-slate-900/25 backdrop-blur-xs flex items-center justify-center p-4">
            <Confetti width={width} height={height} recycle={false} numberOfPieces={250} gravity={0.25} />

            <div className="max-w-xl w-full bg-white/95 backdrop-blur-md rounded-3xl p-6 shadow-2xl border-4 border-sky-300 text-center flex flex-col items-center animate-in zoom-in-95 duration-200">
              <div className="w-14 h-14 rounded-2xl bg-emerald-100 border-2 border-emerald-300 flex items-center justify-center text-emerald-600 mb-2 shadow-inner">
                <Sparkles size={32} />
              </div>

              <h2 className="text-2xl font-black text-slate-900 mb-0.5">
                TOUCHSCREEN MASTER!
              </h2>
              <span className="text-xs font-black text-emerald-600 uppercase tracking-wider mb-3">
                100 Points Earned · Capacitive Physics Mastered
              </span>

              {/* 4 Stats Cards */}
              <div className="grid grid-cols-4 gap-2 w-full mb-3 text-center">
                <div className="p-2 rounded-xl bg-slate-50 border border-slate-200">
                  <span className="text-[9px] font-black uppercase text-slate-500 block">TESTED</span>
                  <span className="text-lg font-black font-mono text-slate-800">4</span>
                </div>
                <div className="p-2 rounded-xl bg-rose-50 border border-rose-200">
                  <span className="text-[9px] font-black uppercase text-rose-600 block">FAILED</span>
                  <span className="text-lg font-black font-mono text-rose-600">3</span>
                </div>
                <div className="p-2 rounded-xl bg-emerald-50 border border-emerald-200">
                  <span className="text-[9px] font-black uppercase text-emerald-600 block">SUCCESS</span>
                  <span className="text-lg font-black font-mono text-emerald-600">1</span>
                </div>
                <div className="p-2 rounded-xl bg-sky-50 border border-sky-200">
                  <span className="text-[9px] font-black uppercase text-sky-600 block">TIME</span>
                  <span className="text-lg font-black font-mono text-sky-800">{formatTimer(sessionSeconds)}</span>
                </div>
              </div>

              {/* 4 Materials Result Breakdown */}
              <div className="grid grid-cols-2 gap-2 w-full mb-3 text-left">
                {MATERIALS.map((m) => (
                  <div
                    key={`res-${m.id}`}
                    className={`p-2.5 rounded-xl border flex items-center justify-between text-xs ${m.conducts
                        ? "bg-emerald-50 border-emerald-300 text-emerald-950 font-bold"
                        : "bg-slate-50 border-slate-200 text-slate-700"
                      }`}
                  >
                    <div className="flex items-center gap-1.5 truncate">
                      <MaterialVisualIcon id={m.id} size={20} />
                      <span className="truncate">{m.name}</span>
                    </div>
                    <span
                      className={`text-[9px] font-black px-1.5 py-0.5 rounded ${m.conducts ? "bg-emerald-200 text-emerald-900" : "bg-slate-200 text-slate-700"
                        }`}
                    >
                      {m.conducts ? "DETECTED" : "INSULATOR"}
                    </span>
                  </div>
                ))}
              </div>

              {/* Core Learning Principle */}
              <div className="w-full p-3 rounded-2xl bg-sky-50 border border-sky-300 text-left mb-3 text-xs font-semibold text-sky-950 leading-relaxed">
                <span className="font-black text-sky-900 block mb-1">💡 KEY COMPUTING & PHYSICS PRINCIPLE:</span>
                &ldquo;Capacitive touchscreens work by detecting changes in capacitance. A conductive finger changes the local electric field, allowing the touchscreen controller to identify where the touch occurred.&rdquo;
              </div>

              {/* Action Buttons */}
              <div className="grid grid-cols-2 gap-2 w-full">
                <button
                  onClick={handleFullReplay}
                  className="py-2.5 rounded-xl bg-sky-600 hover:bg-sky-700 text-white font-black text-xs shadow-md cursor-pointer transition flex items-center justify-center gap-1.5"
                >
                  <RotateCcw size={14} />
                  <span>Replay Experiment</span>
                </button>

                <button
                  onClick={() => {
                    triggerSound("pop");
                    setScreen("welcome");
                  }}
                  className="py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-black text-xs transition flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <span>Return to Welcome</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* ── 3. BOTTOM FOOTER: STATUS & PROMINENT NEXT ACTION (NO DUPLICATE TRAY!) ── */}
      <footer className="w-full h-15 px-4 bg-white/95 border-t border-sky-200 shadow-md flex items-center justify-between shrink-0 z-40">

        {/* Left: Status Information */}
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-2.5 h-2.5 rounded-full bg-sky-500 animate-ping" />
          <span className="text-xs font-black text-slate-900 truncate">
            {screen === "testing"
              ? isTabletUnlocked
                ? "All Materials Tested! Proceed to Electric Field Discovery."
                : `Active: Drag ${MATERIALS[currentTestIndex].name} from left toolbox onto tablet`
              : screen === "discovery"
                ? "Electric Field 3D Cutaway Simulation"
                : "Touchscreen Magic Challenge"}
          </span>
        </div>

        {/* Right: NEXT SCREEN PROMINENT ACTION BUTTON */}
        <div className="flex items-center gap-2">
          {screen === "testing" && isTabletUnlocked && (
            <button
              onClick={() => {
                triggerSound("pop");
                setScreen("discovery");
              }}
              className="px-6 py-2.5 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white font-black text-xs shadow-lg cursor-pointer transition flex items-center gap-2 animate-bounce"
            >
              <span>Explore Electric Field Science</span>
              <ArrowRight size={16} />
            </button>
          )}

          {screen === "discovery" && (
            <button
              onClick={() => {
                triggerSound("pop");
                setScreen("results");
              }}
              className="px-6 py-2.5 rounded-2xl bg-gradient-to-r from-sky-500 to-indigo-600 hover:from-sky-600 hover:to-indigo-700 text-white font-black text-xs shadow-lg cursor-pointer transition flex items-center gap-2 animate-bounce"
            >
              <span>View Results & Summary</span>
              <Award size={16} />
            </button>
          )}
        </div>
      </footer>

      {/* ── 4. FLOATING DRAG AVATAR GHOST FOLLOWING POINTER ── */}
      {draggingId && (
        <div
          className="fixed pointer-events-none z-50 -translate-x-1/2 -translate-y-1/2 scale-125 drop-shadow-2xl transition-transform"
          style={{ left: `${dragPos.x}px`, top: `${dragPos.y}px` }}
        >
          <div className="p-3 rounded-2xl bg-white/95 border-2 border-sky-400 shadow-2xl flex items-center gap-2">
            <MaterialVisualIcon id={draggingId} size={42} />
          </div>
        </div>
      )}

      {/* ── 5. HELP MODAL ── */}
      {showHelp && (
        <div className="absolute inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in zoom-in-95 duration-150">
          <div className="max-w-md w-full bg-white rounded-3xl p-6 shadow-2xl border-4 border-sky-300 text-slate-800 flex flex-col gap-3">
            <div className="flex items-center justify-between border-b border-sky-100 pb-2">
              <span className="text-xs font-black uppercase tracking-wider text-sky-800">
                Touchscreen Magic Mission & Rules
              </span>
              <button
                onClick={() => setShowHelp(false)}
                className="w-7 h-7 rounded-full bg-slate-100 text-slate-500 hover:bg-slate-200 flex items-center justify-center cursor-pointer"
              >
                <X size={15} />
              </button>
            </div>

            <div className="space-y-2 text-xs text-slate-600">
              <p className="font-bold text-slate-800">How Capacitive Touch Works:</p>
              <ul className="list-disc pl-4 space-y-1">
                <li>
                  <strong>Left Toolbox:</strong> Drag materials one by one in sequence: Wood Eraser &rarr; Wool Glove &rarr; Plastic Ruler &rarr; Bare Finger.
                </li>
                <li>
                  <strong>Cause and Effect:</strong> If touch is not detected, the tablet stays on standby. When your conductive finger touches, the tablet unlocks and powers the robot activity!
                </li>
                <li>
                  <strong>Insulators Fail:</strong> Wood, plastic, and ordinary wool cannot conduct micro-currents.
                </li>
                <li>
                  <strong>Conductor Unlocks:</strong> Your conductive skin alters the screen&apos;s electric field!
                </li>
              </ul>
            </div>

            <button
              onClick={() => setShowHelp(false)}
              className="w-full py-2.5 rounded-xl bg-sky-500 hover:bg-sky-600 text-white font-black text-xs shadow-md cursor-pointer transition"
            >
              Got It, Scientist!
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
