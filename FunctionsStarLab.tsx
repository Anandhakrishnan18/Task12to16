"use client";

import React, { useState, useEffect, useRef, useCallback, useMemo } from "react";
import Link from "next/link";
import Confetti from "react-confetti";
import { useWindowSize } from "react-use";
import {
  ArrowLeft,
  ArrowRight,
  Play,
  RotateCcw,
  Sparkles,
  Star,
  CheckCircle2,
  Code2,
  PackagePlus,
  Bot,
  Award,
  HelpCircle,
  Volume2,
  VolumeX,
  Compass,
  Footprints,
  Layers,
  Wand2,
  Check,
  X,
} from "lucide-react";
import { useLabAudio } from "@/hooks/useLabAudio";
import { useLMSBridge } from "@/hooks/useLMSBridge";

// ─── EXACT 10 DRAWING INSTRUCTIONS ───────────────────────────────────────────
interface InstructionItem {
  id: number;
  type: "move" | "turn";
  label: string;
  detail: string;
}

const STAR_INSTRUCTIONS: InstructionItem[] = [
  { id: 1, type: "move", label: "Step 1: Move Forward", detail: "Draw star line 1" },
  { id: 2, type: "turn", label: "Step 2: Turn 144°", detail: "Turn clockwise 144°" },
  { id: 3, type: "move", label: "Step 3: Move Forward", detail: "Draw star line 2" },
  { id: 4, type: "turn", label: "Step 4: Turn 144°", detail: "Turn clockwise 144°" },
  { id: 5, type: "move", label: "Step 5: Move Forward", detail: "Draw star line 3" },
  { id: 6, type: "turn", label: "Step 6: Turn 144°", detail: "Turn clockwise 144°" },
  { id: 7, type: "move", label: "Step 7: Move Forward", detail: "Draw star line 4" },
  { id: 8, type: "turn", label: "Step 8: Turn 144°", detail: "Turn clockwise 144°" },
  { id: 9, type: "move", label: "Step 9: Move Forward", detail: "Draw star line 5 (Close star)" },
  { id: 10, type: "turn", label: "Step 10: Turn 144°", detail: "Reset original heading" },
];

// 5 Target Star Positions for Screen 3 Phase B (Constellation Layout)
const TARGET_POSITIONS = [
  { id: 0, x: 200, y: 150, label: "Top-Left Star" },
  { id: 1, x: 600, y: 150, label: "Top-Right Star" },
  { id: 2, x: 400, y: 255, label: "Center Star" },
  { id: 3, x: 230, y: 385, label: "Bottom-Left Star" },
  { id: 4, x: 570, y: 385, label: "Bottom-Right Star" },
];

type GameScreen = "welcome" | "manual" | "function" | "results";
type FunctionPhase = "phase_a_create" | "phase_b_reuse";

// ─── GEOMETRY HELPER: STAR VERTICES & EDGES ─────────────────────────────────
// Regular pentagram with outer radius R
function getStarCoordinates(cx: number, cy: number, r: number) {
  // 5 outer vertices at -90, -18, 54, 126, 198 degrees
  const vertices = [];
  for (let i = 0; i < 5; i++) {
    const angle = (-90 + i * 72) * (Math.PI / 180);
    vertices.push({
      x: cx + r * Math.cos(angle),
      y: cy + r * Math.sin(angle),
    });
  }

  // 5 lines connecting V0 -> V2 -> V4 -> V1 -> V3 -> V0
  // Each segment has corresponding drawing direction & heading
  const segments = [
    { from: vertices[0], to: vertices[2], heading: 72 },
    { from: vertices[2], to: vertices[4], heading: 216 },
    { from: vertices[4], to: vertices[1], heading: 0 },
    { from: vertices[1], to: vertices[3], heading: 144 },
    { from: vertices[3], to: vertices[0], heading: 288 },
  ];

  return { vertices, segments };
}

// ═════════════════════════════════════════════════════════════════════════════
// CUTE DRAWING ROBOT COMPONENT
// ═════════════════════════════════════════════════════════════════════════════
function DrawingRobot({
  x,
  y,
  rotation,
  isDrawing = false,
  scale = 1.0,
}: {
  x: number;
  y: number;
  rotation: number;
  isDrawing?: boolean;
  scale?: number;
}) {
  return (
    <g
      transform={`translate(${x}, ${y}) rotate(${rotation}) scale(${scale})`}
      style={{ transition: "transform 0.28s cubic-bezier(0.34, 1.56, 0.64, 1)" }}
    >
      {/* Soft Drop Shadow under robot */}
      <ellipse cx={0} cy={6} rx={22} ry={14} fill="rgba(15, 23, 42, 0.15)" />

      {/* Robot Left & Right Tread Wheels */}
      <rect x={-20} y={-14} width={7} height={28} rx={3.5} fill="#475569" stroke="#334155" strokeWidth={1.5} />
      <rect x={13} y={-14} width={7} height={28} rx={3.5} fill="#475569" stroke="#334155" strokeWidth={1.5} />

      {/* Robot Main Body Chassis */}
      <rect x={-14} y={-12} width={28} height={24} rx={7} fill="#ffffff" stroke="#0284c7" strokeWidth={2.5} />
      {/* Mint Accent Belly Strip */}
      <rect x={-9} y={-5} width={18} height={10} rx={3} fill="#e0f2fe" />

      {/* Cute LED Digital Face Display */}
      <rect x={-11} y={-10} width={22} height={10} rx={4} fill="#0f172a" />
      {/* Friendly Glowing Blue Eyes */}
      <circle cx={-5} cy={-5} r={2} fill="#38bdf8" />
      <circle cx={5} cy={-5} r={2} fill="#38bdf8" />

      {/* Front Drawing Pen Nib (Points along +Y direction of robot heading) */}
      <path d="M -4 12 L 0 22 L 4 12 Z" fill="#f59e0b" stroke="#b45309" strokeWidth={1.5} />
      <circle cx={0} cy={22} r={2.5} fill="#dc2626" />

      {/* Active Laser/Ink Sparkle when drawing */}
      {isDrawing && (
        <circle cx={0} cy={22} r={6} fill="none" stroke="#f59e0b" strokeWidth={2} className="animate-ping" />
      )}
    </g>
  );
}

// ═════════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT & STATE MACHINE
// ═════════════════════════════════════════════════════════════════════════════

export default function FunctionsStarLab() {
  const { width, height } = useWindowSize();
  const { playPop, playSuccess, playZap } = useLabAudio();
  const { reportComplete } = useLMSBridge("functions-star");

  // Game Navigation State: Exactly 4 Screens
  const [screen, setScreen] = useState<GameScreen>("welcome");
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);
  const [showHelp, setShowHelp] = useState<boolean>(false);
  const [sessionSeconds, setSessionSeconds] = useState<number>(0);
  const [score, setScore] = useState<number>(0);

  // ── Screen 2: Manual Star Creation State (10 exact steps) ──
  const [manualStep, setManualStep] = useState<number>(0); // 0 to 10
  const [isManualAnimating, setIsManualAnimating] = useState<boolean>(false);

  // ── Screen 3: Create & Reuse Function State ──
  const [functionPhase, setFunctionPhase] = useState<FunctionPhase>("phase_a_create");
  const [isBundling, setIsBundling] = useState<boolean>(false);
  const [isFunctionCreated, setIsFunctionCreated] = useState<boolean>(false);
  const [functionStarCount, setFunctionStarCount] = useState<number>(0); // 0 to 5
  const [isCallingFunction, setIsCallingFunction] = useState<boolean>(false);
  const [activeCallStep, setActiveCallStep] = useState<number>(0); // for visualizing 10 steps inside call

  // Timer interval for session time
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

  // ── Sound Helper ──────────────────────────────────────────────────────────
  const triggerSound = useCallback(
    (type: "pop" | "success" | "zap") => {
      if (!soundEnabled) return;
      if (type === "pop") playPop();
      if (type === "success") playSuccess();
      if (type === "zap") playZap();
    },
    [soundEnabled, playPop, playSuccess, playZap]
  );

  // ── Single Center Star Geometry (Screen 2: Manual Star, R=125) ─────────────
  const manualStarGeo = useMemo(() => {
    return getStarCoordinates(400, 240, 125);
  }, []);

  // ── 5 Constellation Star Geometries (Screen 3: Phase B, R=52) ──────────────
  const multiStarGeos = useMemo(() => {
    return TARGET_POSITIONS.map((pos) => ({
      ...pos,
      geo: getStarCoordinates(pos.x, pos.y, 52),
    }));
  }, []);

  // ── Current Manual Robot Position & Heading ───────────────────────────────
  const manualRobotPose = useMemo(() => {
    const { vertices, segments } = manualStarGeo;
    if (manualStep === 0) {
      // At start tip V0, ready to draw line 1
      return { x: vertices[0].x, y: vertices[0].y, rotation: 72 };
    }

    // Determine which segment has just executed or is current
    // Step 1: line 0, heading 72
    // Step 2: at V2, heading 216
    // Step 3: line 1, heading 216
    // Step 4: at V4, heading 0
    // Step 5: line 2, heading 0
    // Step 6: at V1, heading 144
    // Step 7: line 3, heading 144
    // Step 8: at V3, heading 288
    // Step 9: line 4, heading 288
    // Step 10: at V0, heading 72
    const segIdx = Math.floor((manualStep - 1) / 2);
    const isTurnStep = manualStep % 2 === 0;

    if (isTurnStep) {
      // At vertex after turn
      const currentVertex = segments[segIdx].to;
      const nextHeading = segments[(segIdx + 1) % 5].heading;
      return { x: currentVertex.x, y: currentVertex.y, rotation: nextHeading };
    } else {
      // Just moved to destination vertex, before turn
      const currentVertex = segments[segIdx].to;
      const moveHeading = segments[segIdx].heading;
      return { x: currentVertex.x, y: currentVertex.y, rotation: moveHeading };
    }
  }, [manualStep, manualStarGeo]);

  // ── Screen 2: Manual Step Click Handler ───────────────────────────────────
  const handleRunManualStep = () => {
    if (isManualAnimating || manualStep >= 10) return;
    setIsManualAnimating(true);
    triggerSound("pop");

    const nextStep = manualStep + 1;
    setManualStep(nextStep);

    setTimeout(() => {
      setIsManualAnimating(false);
      if (nextStep === 10) {
        triggerSound("success");
      }
    }, 280);
  };

  // ── Screen 3: Bundle Button (Phase A -> Phase B) ──────────────────────────
  const handleBundleFunction = () => {
    if (isBundling || isFunctionCreated) return;
    setIsBundling(true);
    triggerSound("zap");

    setTimeout(() => {
      setIsBundling(false);
      setIsFunctionCreated(true);
      setFunctionPhase("phase_b_reuse");
      triggerSound("success");
    }, 750);
  };

  // ── Screen 3: Call [Make Star] Click Handler (Phase B) ────────────────────
  const handleCallMakeStar = () => {
    if (isCallingFunction || functionStarCount >= 5) return;
    setIsCallingFunction(true);
    triggerSound("pop");

    // Rapid step visualization through the 10 steps of the function
    let currentStep = 1;
    setActiveCallStep(1);

    const stepInterval = setInterval(() => {
      currentStep += 1;
      setActiveCallStep(currentStep);

      if (currentStep > 10) {
        clearInterval(stepInterval);
        setIsCallingFunction(false);
        setActiveCallStep(0);

        setFunctionStarCount((prev) => {
          const next = prev + 1;
          if (next === 5) {
            triggerSound("success");
            setScore(100);
            reportComplete({ points: 100 });
          } else {
            triggerSound("pop");
          }
          return next;
        });
      }
    }, 85);
  };

  // ── Reset Current Screen Handlers ─────────────────────────────────────────
  const handleResetCurrentScreen = () => {
    triggerSound("pop");
    if (screen === "manual") {
      setManualStep(0);
      setIsManualAnimating(false);
    } else if (screen === "function") {
      setFunctionStarCount(0);
      setIsCallingFunction(false);
      setActiveCallStep(0);
    }
  };

  const handleFullReplay = () => {
    triggerSound("pop");
    setManualStep(0);
    setIsManualAnimating(false);
    setFunctionPhase("phase_a_create");
    setIsBundling(false);
    setIsFunctionCreated(false);
    setFunctionStarCount(0);
    setIsCallingFunction(false);
    setActiveCallStep(0);
    setScreen("welcome");
  };

  // ═════════════════════════════════════════════════════════════════════════════
  // RENDER (STRICT 100% LIGHT THEME & STATIC VIEWPORT)
  // ═════════════════════════════════════════════════════════════════════════════

  return (
    <div className="w-full h-[100dvh] max-h-[100dvh] overflow-hidden select-none flex flex-col bg-gradient-to-br from-[#EAF5FF] via-[#F7F2FF] to-[#EAE2FF] text-slate-800 font-sans">
      
      {/* ── 1. TOP BAR ── */}
      <header className="w-full h-13 px-4 bg-white/95 border-b border-indigo-100/90 shadow-xs flex items-center justify-between shrink-0 z-40">
        {/* Left: Back Button & Title */}
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
            <Star size={18} className="fill-current" />
          </div>

          <div className="min-w-0">
            <h1 className="text-sm sm:text-base font-black text-amber-950 truncate tracking-tight">
              Star Creator Challenge – The [Make Star] Button
            </h1>
            <span className="hidden sm:inline-block text-[10px] font-bold text-amber-700 uppercase tracking-wider">
              Functions, Subroutines & Reusable Code Blocks
            </span>
          </div>
        </div>

        {/* Center: Timer & Score */}
        <div className="flex items-center gap-2 sm:gap-3">
          <div className="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-amber-50/90 border border-amber-300 text-amber-950 shadow-xs">
            <Compass size={15} className="text-amber-600" />
            <div className="flex flex-col text-left leading-none">
              <span className="text-[9px] font-black uppercase text-amber-800">SESSION TIME</span>
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

        {/* Right: Sound, Restart & Help */}
        <div className="flex items-center gap-1.5 sm:gap-2">
          <button
            onClick={() => {
              triggerSound("pop");
              setSoundEnabled(!soundEnabled);
            }}
            className="w-8 h-8 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 flex items-center justify-center transition cursor-pointer"
            title="Toggle Sound Effects"
          >
            {soundEnabled ? <Volume2 size={16} /> : <VolumeX size={16} />}
          </button>

          <button
            onClick={handleResetCurrentScreen}
            className="w-8 h-8 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 flex items-center justify-center transition cursor-pointer"
            title="Reset Current Screen"
          >
            <RotateCcw size={16} />
          </button>

          <button
            onClick={() => {
              triggerSound("pop");
              setShowHelp(true);
            }}
            className="w-8 h-8 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 flex items-center justify-center transition cursor-pointer"
            title="Mission Help"
          >
            <HelpCircle size={16} />
          </button>
        </div>
      </header>

      {/* ── 2. MAIN INTERACTIVE AREA (CANVAS & PANELS) ── */}
      <main className="relative flex-1 min-h-0 w-full overflow-hidden flex flex-col md:flex-row p-3 gap-3">
        
        {/* ── LEFT/CENTER: LARGE DRAWING CANVAS WORKBENCH (LIGHT COSMIC THEME) ── */}
        <div className="relative flex-1 min-h-0 h-full rounded-3xl bg-gradient-to-br from-[#EAF5FF] via-[#F1E9FF] to-[#DDF3FF] border-2 border-indigo-200/80 shadow-sm overflow-hidden flex items-center justify-center">
          
          {/* Subtle Nebula-Like Light Glow Clouds */}
          <div className="absolute -top-16 -left-16 w-96 h-96 rounded-full bg-gradient-to-br from-[#DDF3FF] to-[#EAE2FF] opacity-70 blur-3xl pointer-events-none" />
          <div className="absolute -bottom-16 -right-16 w-96 h-96 rounded-full bg-gradient-to-tl from-[#F1E9FF] to-[#DDF3FF] opacity-70 blur-3xl pointer-events-none" />
          <div className="absolute top-1/3 right-1/4 w-72 h-72 rounded-full bg-gradient-to-tr from-[#F7F2FF] to-[#EAF5FF] opacity-60 blur-2xl pointer-events-none" />

          {/* SVG Vector Drawing Canvas (800 x 500 coordinate space) */}
          <svg
            viewBox="0 0 800 500"
            className="w-full h-full max-h-full object-contain relative z-10"
            preserveAspectRatio="xMidYMid meet"
          >
            <defs>
              <linearGradient id="starGold" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#fde047" />
                <stop offset="50%" stopColor="#f59e0b" />
                <stop offset="100%" stopColor="#d97706" />
              </linearGradient>
              <filter id="glow" x="0" y="0" width="800" height="500" filterUnits="userSpaceOnUse">
                <feGaussianBlur stdDeviation="3.5" result="blur" />
                <feComposite in="SourceGraphic" in2="blur" operator="over" />
              </filter>
            </defs>

            {/* Subtle Cosmic Background Stars & Soft Sparkles */}
            <g className="pointer-events-none select-none">
              <circle cx="85" cy="70" r="1.5" fill="#a5b4fc" opacity="0.6" />
              <circle cx="160" cy="110" r="2" fill="#c084fc" opacity="0.5" />
              <circle cx="240" cy="65" r="1.2" fill="#93c5fd" opacity="0.7" />
              <circle cx="680" cy="80" r="1.8" fill="#a5b4fc" opacity="0.6" />
              <circle cx="730" cy="140" r="1.2" fill="#c084fc" opacity="0.5" />
              <circle cx="110" cy="380" r="1.8" fill="#93c5fd" opacity="0.6" />
              <circle cx="190" cy="440" r="1.2" fill="#c084fc" opacity="0.5" />
              <circle cx="640" cy="420" r="2" fill="#a5b4fc" opacity="0.6" />
              <circle cx="720" cy="360" r="1.5" fill="#93c5fd" opacity="0.7" />
              <circle cx="360" cy="40" r="1.5" fill="#c084fc" opacity="0.5" />
              <circle cx="480" cy="50" r="1.2" fill="#93c5fd" opacity="0.6" />
              <circle cx="380" cy="460" r="1.5" fill="#a5b4fc" opacity="0.6" />
              <circle cx="500" cy="440" r="1.2" fill="#c084fc" opacity="0.5" />

              {/* Gentle 4-Point Cosmic Sparkles in outer corners */}
              <path d="M 120 180 Q 120 190 110 190 Q 120 190 120 200 Q 120 190 130 190 Q 120 190 120 180 Z" fill="#a5b4fc" opacity="0.45" />
              <path d="M 680 220 Q 680 230 670 230 Q 680 230 680 240 Q 680 230 690 230 Q 680 230 680 220 Z" fill="#c084fc" opacity="0.45" />
              <path d="M 280 430 Q 280 438 272 438 Q 280 438 280 446 Q 280 438 288 438 Q 280 438 280 430 Z" fill="#93c5fd" opacity="0.4" />
              <path d="M 580 80 Q 580 88 572 88 Q 580 88 580 96 Q 580 88 588 88 Q 580 88 580 80 Z" fill="#a5b4fc" opacity="0.4" />
            </g>

            {/* ═════════════════════════════════════════════════════════════════
                CANVAS CONTENT FOR SCREEN 2 (MANUAL STAR DRAWING)
                ═════════════════════════════════════════════════════════════════ */}
            {screen === "manual" && (
              <g>
                {/* Star Outer Guide Dotted Circle */}
                <circle cx={400} cy={240} r={125} fill="none" stroke="#fed7aa" strokeWidth={1.5} strokeDasharray="4 4" />

                {/* 5 Outer Target Vertex Markers */}
                {manualStarGeo.vertices.map((v, i) => (
                  <g key={`v-${i}`}>
                    <circle cx={v.x} cy={v.y} r={5} fill="#fef3c7" stroke="#d97706" strokeWidth={1.5} />
                    <text x={v.x} y={v.y - 9} fontSize="11" fontWeight="bold" fill="#b45309" textAnchor="middle">
                      {`V${i + 1}`}
                    </text>
                  </g>
                ))}

                {/* Drawn Star Segments (1 to 5) based on manualStep */}
                <g filter="url(#glow)">
                  {manualStarGeo.segments.map((seg, idx) => {
                    const segMoveStep = idx * 2 + 1; // steps 1, 3, 5, 7, 9
                    const isDrawn = manualStep >= segMoveStep;
                    if (!isDrawn) return null;

                    return (
                      <line
                        key={`seg-${idx}`}
                        x1={seg.from.x}
                        y1={seg.from.y}
                        x2={seg.to.x}
                        y2={seg.to.y}
                        stroke="#f59e0b"
                        strokeWidth={4.5}
                        strokeLinecap="round"
                      />
                    );
                  })}
                </g>

                {/* Golden Star Fill when all 10 steps are complete */}
                {manualStep === 10 && (
                  <polygon
                    points={manualStarGeo.segments.map((s) => `${s.to.x},${s.to.y}`).join(" ")}
                    fill="url(#starGold)"
                    opacity={0.35}
                    className="animate-in fade-in duration-300"
                  />
                )}

                {/* The Animated Drawing Robot */}
                <DrawingRobot
                  x={manualRobotPose.x}
                  y={manualRobotPose.y}
                  rotation={manualRobotPose.rotation}
                  isDrawing={manualStep % 2 === 1}
                  scale={1.1}
                />
              </g>
            )}

            {/* ═════════════════════════════════════════════════════════════════
                CANVAS CONTENT FOR SCREEN 3 (CREATE & REUSE FUNCTION)
                ═════════════════════════════════════════════════════════════════ */}
            {screen === "function" && (
              <g>
                {/* 5 Constellation Star Targets */}
                {multiStarGeos.map((star, idx) => {
                  const isCompleted = functionStarCount > idx;
                  const isCurrent = functionStarCount === idx;

                  return (
                    <g key={`multi-${star.id}`}>
                      {/* Dotted Target Guide Outline */}
                      <circle
                        cx={star.x}
                        cy={star.y}
                        r={52}
                        fill={isCompleted ? "rgba(254, 240, 138, 0.25)" : "#fffbeb"}
                        stroke={isCompleted ? "#f59e0b" : isCurrent ? "#38bdf8" : "#cbd5e1"}
                        strokeWidth={isCurrent ? 2.5 : 1.5}
                        strokeDasharray={isCompleted ? "none" : "4 4"}
                      />

                      {/* Drawn Star Segments */}
                      {isCompleted && (
                        <g filter="url(#glow)">
                          {star.geo.segments.map((s, sIdx) => (
                            <line
                              key={`star-${idx}-seg-${sIdx}`}
                              x1={s.from.x}
                              y1={s.from.y}
                              x2={s.to.x}
                              y2={s.to.y}
                              stroke="#f59e0b"
                              strokeWidth={3.5}
                              strokeLinecap="round"
                            />
                          ))}
                          <polygon
                            points={star.geo.segments.map((s) => `${s.to.x},${s.to.y}`).join(" ")}
                            fill="url(#starGold)"
                            opacity={0.5}
                          />
                        </g>
                      )}

                      {/* Star Target Label */}
                      <text
                        x={star.x}
                        y={star.y + 68}
                        fontSize="11"
                        fontWeight="900"
                        fill={isCompleted ? "#b45309" : isCurrent ? "#0284c7" : "#94a3b8"}
                        textAnchor="middle"
                      >
                        {isCompleted ? `★ Star #${idx + 1} Done` : `Target #${idx + 1}`}
                      </text>
                    </g>
                  );
                })}

                {/* Drawing Robot Position in Function Mode */}
                {functionStarCount < 5 && (
                  <DrawingRobot
                    x={TARGET_POSITIONS[functionStarCount].x}
                    y={TARGET_POSITIONS[functionStarCount].y - 52}
                    rotation={isCallingFunction ? activeCallStep * 36 : 72}
                    isDrawing={isCallingFunction}
                    scale={0.9}
                  />
                )}
              </g>
            )}

            {/* ═════════════════════════════════════════════════════════════════
                CANVAS CONTENT FOR SCREEN 1 & 4 (PREVIEW / CELEBRATION)
                ═════════════════════════════════════════════════════════════════ */}
            {(screen === "welcome" || screen === "results") && (
              <g>
                {multiStarGeos.map((star, idx) => (
                  <g key={`preview-${star.id}`}>
                    <polygon
                      points={star.geo.segments.map((s) => `${s.to.x},${s.to.y}`).join(" ")}
                      fill="url(#starGold)"
                      opacity={0.65}
                      stroke="#d97706"
                      strokeWidth={2}
                      filter="url(#glow)"
                    />
                  </g>
                ))}
                <DrawingRobot x={400} y={235} rotation={72} scale={1.2} />
              </g>
            )}
          </svg>
        </div>

        {/* ── RIGHT: INSTRUCTION & CODE FUNCTION WORKBENCH PANEL ── */}
        <div className="w-full md:w-80 h-full flex flex-col justify-between p-3.5 rounded-3xl bg-white/95 border-2 border-indigo-200/80 shadow-sm shrink-0 overflow-y-auto">
          
          {/* ═════════════════════════════════════════════════════════════════
              SCREEN 2: MANUAL INSTRUCTION LIST (0/10 TO 10/10)
              ═════════════════════════════════════════════════════════════════ */}
          {screen === "manual" && (
            <div className="flex flex-col h-full justify-between">
              <div>
                <div className="flex items-center justify-between border-b border-amber-100 pb-2 mb-2">
                  <div className="flex items-center gap-1.5">
                    <Footprints size={16} className="text-amber-600" />
                    <span className="text-xs font-black uppercase text-amber-950">Manual Instruction Stream</span>
                  </div>
                  <span className="text-xs font-black font-mono px-2 py-0.5 rounded-full bg-amber-100 text-amber-900">
                    {manualStep} / 10
                  </span>
                </div>

                <p className="text-[11px] font-semibold text-slate-600 mb-2">
                  Click &ldquo;Run Next Step&rdquo; to execute each instruction one by one:
                </p>

                {/* 10 Instruction Cards Stack */}
                <div className="space-y-1 max-h-[300px] overflow-y-auto pr-1">
                  {STAR_INSTRUCTIONS.map((item) => {
                    const isDone = manualStep >= item.id;
                    const isCurrent = manualStep + 1 === item.id;

                    return (
                      <div
                        key={item.id}
                        className={`p-2 rounded-xl border text-[11px] font-mono flex items-center justify-between transition-all ${
                          isCurrent
                            ? "bg-amber-100 border-amber-400 text-amber-950 font-black shadow-xs scale-101"
                            : isDone
                            ? "bg-emerald-50 border-emerald-200 text-emerald-900 opacity-80"
                            : "bg-slate-50 border-slate-200 text-slate-400"
                        }`}
                      >
                        <div className="flex items-center gap-1.5">
                          {isDone ? (
                            <CheckCircle2 size={13} className="text-emerald-600" />
                          ) : (
                            <span className="w-3.5 h-3.5 rounded-full border border-slate-300 flex items-center justify-center text-[9px]">
                              {item.id}
                            </span>
                          )}
                          <span>{item.label}</span>
                        </div>
                        <span className="text-[9px] font-bold opacity-70">{item.type}</span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Status Message */}
              <div className="mt-2 p-2.5 rounded-2xl bg-amber-50 border border-amber-200 text-[11px] font-semibold text-amber-950">
                {manualStep === 0
                  ? "Ready! Click below to execute Step 1."
                  : manualStep < 10
                  ? `Executed Step ${manualStep}. Next up: ${STAR_INSTRUCTIONS[manualStep].label}`
                  : "★ Star 10/10 Completed! That took 10 repetitive clicks for just 1 star!"}
              </div>
            </div>
          )}

          {/* ═════════════════════════════════════════════════════════════════
              SCREEN 3: CREATE & REUSE FUNCTION WORKBENCH
              ═════════════════════════════════════════════════════════════════ */}
          {screen === "function" && (
            <div className="flex flex-col h-full justify-between">
              <div>
                <div className="flex items-center justify-between border-b border-amber-100 pb-2 mb-2">
                  <div className="flex items-center gap-1.5">
                    <Code2 size={16} className="text-sky-600" />
                    <span className="text-xs font-black uppercase text-amber-950">
                      {functionPhase === "phase_a_create" ? "Phase A: Create Function" : "Phase B: Reuse Function"}
                    </span>
                  </div>
                  <span className="text-xs font-black font-mono px-2 py-0.5 rounded-full bg-sky-100 text-sky-900">
                    {functionPhase === "phase_a_create" ? "Step 1/2" : `${functionStarCount} / 5 Stars`}
                  </span>
                </div>

                {/* PHASE A: Bundling Display */}
                {functionPhase === "phase_a_create" && (
                  <div className="space-y-2">
                    <p className="text-[11px] font-semibold text-slate-600">
                      Instead of writing 10 separate steps every time, bundle them into one named function:
                    </p>

                    {/* Collapsible 10-Instruction Container */}
                    <div className="p-3 rounded-2xl bg-amber-50 border-2 border-dashed border-amber-300 space-y-1">
                      <span className="text-[10px] font-black uppercase text-amber-800 block">
                        Raw Instructions (10 Steps)
                      </span>
                      <div className="text-[10px] font-mono text-slate-600 space-y-0.5 pl-1">
                        <div>1. Move Forward</div>
                        <div>2. Turn 144°</div>
                        <div>3. Move Forward</div>
                        <div>4. Turn 144°</div>
                        <div className="text-slate-400 italic">... (repeated 5 times)</div>
                        <div>10. Turn 144°</div>
                      </div>
                    </div>
                  </div>
                )}

                {/* PHASE B: The Minted [Make Star] Function Block */}
                {functionPhase === "phase_b_reuse" && (
                  <div className="space-y-3">
                    <div className="p-3 rounded-2xl bg-sky-50 border-2 border-sky-300 shadow-sm">
                      <div className="flex items-center justify-between border-b border-sky-200 pb-1.5 mb-1.5">
                        <span className="text-xs font-black font-mono text-sky-950 flex items-center gap-1">
                          <Wand2 size={13} className="text-sky-600" />
                          <span>function MakeStar()</span>
                        </span>
                        <span className="text-[9px] font-black px-1.5 py-0.5 rounded bg-sky-200 text-sky-900">
                          10 INSTRUCTIONS
                        </span>
                      </div>
                      <div className="text-[11px] font-mono text-sky-900 space-y-0.5 pl-1">
                        <div>&#123;</div>
                        <div className="pl-3 text-slate-700">• Move Forward</div>
                        <div className="pl-3 text-slate-700">• Turn 144°</div>
                        <div className="pl-3 text-sky-700 font-bold">&#8635; (Repeat 5 times)</div>
                        <div>&#125;</div>
                      </div>
                    </div>

                    <div className="p-2.5 rounded-2xl bg-emerald-50 border border-emerald-300 text-[11px] font-semibold text-emerald-950">
                      {functionStarCount < 5
                        ? `Click "Call [Make Star]" to stamp Star #${functionStarCount + 1} with 1 click!`
                        : "All 5 stars created! 5 function calls did the work of 50 manual steps!"}
                    </div>
                  </div>
                )}
              </div>

              {/* Learning Principle Card */}
              <div className="mt-2 p-2.5 rounded-2xl bg-amber-50 border border-amber-200 text-[10px] font-bold text-amber-950 leading-relaxed">
                💡 <span className="font-black text-amber-900">THE POWER OF FUNCTIONS:</span> Define 10 instructions once, then call [Make Star] anywhere with 1 click!
              </div>
            </div>
          )}

          {/* ═════════════════════════════════════════════════════════════════
              SCREEN 1 & 4 WORKBENCH PREVIEWS
              ═════════════════════════════════════════════════════════════════ */}
          {(screen === "welcome" || screen === "results") && (
            <div className="flex flex-col h-full justify-between">
              <div className="space-y-3">
                <span className="text-xs font-black uppercase text-amber-800 block">Drawing Mission</span>
                <p className="text-xs font-semibold text-slate-600 leading-relaxed">
                  Learn how functions eliminate repetitive code by teaching a robot to draw five-point stars.
                </p>
                <div className="p-3 rounded-2xl bg-amber-50 border border-amber-200 text-xs font-mono text-amber-950">
                  <div>1 Star = 10 instructions</div>
                  <div>5 Stars = 50 instructions!</div>
                  <div className="font-black text-emerald-700 mt-1">Solution: Use [Make Star] function!</div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* ═════════════════════════════════════════════════════════════════════
            OVERLAY: SCREEN 1 – WELCOME
            ═════════════════════════════════════════════════════════════════════ */}
        {screen === "welcome" && (
          <div className="absolute inset-0 z-30 bg-indigo-950/15 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="max-w-lg w-full bg-white/95 backdrop-blur-md rounded-3xl p-6 shadow-2xl border-4 border-indigo-200 text-center flex flex-col items-center animate-in zoom-in-95 duration-200">
              <div className="w-16 h-16 rounded-2xl bg-amber-100 border-2 border-amber-300 flex items-center justify-center text-amber-500 mb-3 shadow-inner">
                <Star size={36} className="fill-current" />
              </div>

              <h2 className="text-2xl font-black text-amber-950 mb-1 leading-tight">
                Star Creator Challenge
              </h2>
              <span className="text-xs font-black text-amber-700 uppercase tracking-widest mb-3">
                The [Make Star] Button
              </span>

              <p className="text-xs sm:text-sm font-semibold text-slate-600 leading-relaxed mb-5 bg-amber-50/70 p-3.5 rounded-2xl border border-amber-200/80">
                &ldquo;Welcome to Star Creator! Your robot needs to draw five beautiful stars. First, you will draw a star using individual instructions. Then, you will create your own Make Star function and use it to create five stars!&rdquo;
              </p>

              {/* 3 Step Concept Preview */}
              <div className="grid grid-cols-3 gap-2 w-full mb-6">
                <div className="p-2.5 rounded-xl bg-amber-50 border border-amber-200 flex flex-col items-center">
                  <span className="text-[10px] font-black text-amber-800 uppercase">1. MANUAL</span>
                  <span className="text-[11px] font-bold text-slate-600">10 Click Steps</span>
                </div>
                <div className="p-2.5 rounded-xl bg-sky-50 border border-sky-200 flex flex-col items-center">
                  <span className="text-[10px] font-black text-sky-800 uppercase">2. BUNDLE</span>
                  <span className="text-[11px] font-bold text-slate-600">[Make Star] Fn</span>
                </div>
                <div className="p-2.5 rounded-xl bg-emerald-50 border border-emerald-200 flex flex-col items-center">
                  <span className="text-[10px] font-black text-emerald-800 uppercase">3. REUSE</span>
                  <span className="text-[11px] font-bold text-slate-600">5 Stars Easily</span>
                </div>
              </div>

              <button
                onClick={() => {
                  triggerSound("pop");
                  setScreen("manual");
                }}
                className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white font-black text-sm shadow-lg cursor-pointer transition animate-bounce flex items-center justify-center gap-2"
              >
                <span>Start Game: Manual Star Creation</span>
                <ArrowRight size={18} />
              </button>
            </div>
          </div>
        )}

        {/* ═════════════════════════════════════════════════════════════════════
            OVERLAY: SCREEN 4 – RESULTS AND SUMMARY (LIGHT COSMIC ATMOSPHERE)
            ═════════════════════════════════════════════════════════════════ */}
        {screen === "results" && (
          <div className="absolute inset-0 z-30 bg-indigo-950/15 backdrop-blur-xs flex items-center justify-center p-4">
            <Confetti width={width} height={height} recycle={false} numberOfPieces={250} gravity={0.25} />
            
            <div className="max-w-xl w-full bg-white/95 backdrop-blur-md rounded-3xl p-6 shadow-2xl border-4 border-indigo-200 text-center flex flex-col items-center animate-in zoom-in-95 duration-200">
              <div className="w-14 h-14 rounded-2xl bg-amber-100 border-2 border-amber-300 flex items-center justify-center text-amber-500 mb-2 shadow-inner">
                <Sparkles size={32} />
              </div>

              <h2 className="text-2xl font-black text-amber-950 mb-0.5">
                FUNCTION MASTERMIND!
              </h2>
              <span className="text-xs font-black text-emerald-600 uppercase tracking-wider mb-3">
                100 Points Earned · Star Creator Challenge Complete
              </span>

              {/* Side-by-Side Educational Comparison Cards */}
              <div className="grid grid-cols-2 gap-3 w-full mb-3 text-left">
                {/* Without Functions */}
                <div className="p-3 rounded-2xl bg-orange-50 border-2 border-orange-200">
                  <span className="text-[10px] font-black uppercase text-orange-800 block">WITHOUT FUNCTIONS</span>
                  <div className="text-2xl font-black font-mono text-orange-600 my-0.5">50 Steps</div>
                  <p className="text-[10px] font-semibold text-slate-600">
                    Each star takes 10 steps. Drawing 5 stars means writing 50 repetitive lines of code!
                  </p>
                </div>

                {/* With Functions */}
                <div className="p-3 rounded-2xl bg-emerald-50 border-2 border-emerald-300">
                  <span className="text-[10px] font-black uppercase text-emerald-800 block">WITH [MAKE STAR] FUNCTION</span>
                  <div className="text-2xl font-black font-mono text-emerald-600 my-0.5">15 Lines</div>
                  <p className="text-[10px] font-semibold text-slate-600">
                    Define the 10 steps once, then call MakeStar() 5 times! 70% repetitive code saved!
                  </p>
                </div>
              </div>

              {/* Important Educational Note on Workload vs Code */}
              <div className="w-full p-2.5 rounded-2xl bg-sky-50 border border-sky-300 text-left mb-3 text-[11px] font-semibold text-sky-950">
                <span className="font-black text-sky-900 block mb-0.5">📌 IMPORTANT PRINCIPLE:</span>
                Functions reduce repetitive code, not the physical drawing work. The robot still executes all 10 underlying drawing steps for every star, but you only had to write them once!
              </div>

              {/* Learning Explanation */}
              <div className="p-3 rounded-2xl bg-amber-50/80 border border-amber-200 text-left mb-3 text-xs font-semibold leading-relaxed text-slate-700">
                <span className="font-black text-amber-900 block mb-1">💡 KEY COMPUTING CONCEPT:</span>
                &ldquo;A function is a reusable block of code that groups multiple instructions under one name. Instead of writing the same instructions repeatedly, we define the function once and call it whenever needed.&rdquo;
              </div>

              {/* Replay & Return Buttons */}
              <div className="grid grid-cols-2 gap-2 w-full">
                <button
                  onClick={handleFullReplay}
                  className="py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-black text-xs shadow-md cursor-pointer transition flex items-center justify-center gap-1.5"
                >
                  <RotateCcw size={14} />
                  <span>Replay Challenge</span>
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

      {/* ── 3. BOTTOM AREA: PRIMARY DYNAMIC ACTION BUTTON & PROGRESS ── */}
      <footer className="w-full h-18 px-4 bg-white/95 border-t border-indigo-100/90 shadow-md flex items-center justify-between shrink-0 z-40">
        
        {/* Left: Step / Progress Info */}
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-ping" />
          <span className="text-xs font-black text-amber-950 truncate">
            {screen === "manual"
              ? `Manual Star: ${manualStep}/10 Instructions`
              : screen === "function"
              ? functionPhase === "phase_a_create"
                ? "Phase A: Ready to Bundle Function"
                : `Phase B: ${functionStarCount}/5 Stars Created`
              : "Star Creator Challenge"}
          </span>
        </div>

        {/* Center: THE ONE PROMINENT DYNAMIC ACTION BUTTON */}
        <div className="flex items-center justify-center">
          {/* SCREEN 2: MANUAL STAR ACTIONS */}
          {screen === "manual" && (
            <>
              {manualStep < 10 ? (
                <button
                  onClick={handleRunManualStep}
                  disabled={isManualAnimating}
                  className="px-8 py-3 rounded-2xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 disabled:opacity-50 text-white font-black text-sm shadow-lg cursor-pointer transition flex items-center gap-2 animate-bounce"
                >
                  <Play size={16} />
                  <span>
                    {isManualAnimating
                      ? "Executing Step..."
                      : manualStep % 2 === 0
                      ? `Run Step ${manualStep + 1}: Move Forward`
                      : `Run Step ${manualStep + 1}: Turn 144°`}
                  </span>
                </button>
              ) : (
                <button
                  onClick={() => {
                    triggerSound("pop");
                    setScreen("function");
                  }}
                  className="px-8 py-3 rounded-2xl bg-emerald-500 hover:bg-emerald-600 text-white font-black text-sm shadow-lg cursor-pointer transition flex items-center gap-2 animate-bounce"
                >
                  <span>Proceed to Create & Reuse Function</span>
                  <ArrowRight size={16} />
                </button>
              )}
            </>
          )}

          {/* SCREEN 3: FUNCTION CREATION & REUSE ACTIONS */}
          {screen === "function" && (
            <>
              {functionPhase === "phase_a_create" && (
                <button
                  onClick={handleBundleFunction}
                  disabled={isBundling}
                  className="px-8 py-3 rounded-2xl bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-600 hover:to-blue-700 disabled:opacity-50 text-white font-black text-sm shadow-lg cursor-pointer transition flex items-center gap-2 animate-bounce"
                >
                  <PackagePlus size={16} />
                  <span>{isBundling ? "Bundling into Function..." : "Bundle 10 Steps into Function"}</span>
                </button>
              )}

              {functionPhase === "phase_b_reuse" && (
                <>
                  {functionStarCount < 5 ? (
                    <button
                      onClick={handleCallMakeStar}
                      disabled={isCallingFunction}
                      className="px-8 py-3 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 disabled:opacity-50 text-white font-black text-sm shadow-lg cursor-pointer transition flex items-center gap-2 animate-bounce"
                    >
                      <Wand2 size={16} />
                      <span>{isCallingFunction ? `Drawing Star #${functionStarCount + 1}...` : "Call [Make Star]"}</span>
                    </button>
                  ) : (
                    <button
                      onClick={() => {
                        triggerSound("pop");
                        setScreen("results");
                      }}
                      className="px-8 py-3 rounded-2xl bg-purple-600 hover:bg-purple-700 text-white font-black text-sm shadow-lg cursor-pointer transition flex items-center gap-2 animate-bounce"
                    >
                      <span>View Results & Summary</span>
                      <Award size={16} />
                    </button>
                  )}
                </>
              )}
            </>
          )}
        </div>

        {/* Right: Reset Button */}
        <div className="flex items-center gap-2">
          {(screen === "manual" || screen === "function") && (
            <button
              onClick={handleResetCurrentScreen}
              className="px-3.5 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-black text-xs transition cursor-pointer flex items-center gap-1.5 border border-slate-200"
            >
              <RotateCcw size={14} />
              <span>Reset Screen</span>
            </button>
          )}
        </div>
      </footer>

      {/* ── 4. HELP MODAL ── */}
      {showHelp && (
        <div className="absolute inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in zoom-in-95 duration-150">
          <div className="max-w-md w-full bg-white rounded-3xl p-6 shadow-2xl border-4 border-amber-300 text-slate-800 flex flex-col gap-3">
            <div className="flex items-center justify-between border-b border-amber-100 pb-2">
              <span className="text-xs font-black uppercase tracking-wider text-amber-800">
                Star Creator Mission & Rules
              </span>
              <button
                onClick={() => setShowHelp(false)}
                className="w-7 h-7 rounded-full bg-slate-100 text-slate-500 hover:bg-slate-200 flex items-center justify-center cursor-pointer"
              >
                <X size={15} />
              </button>
            </div>

            <div className="space-y-2 text-xs text-slate-600">
              <p className="font-bold text-slate-800">How Functions Work in Coding:</p>
              <ul className="list-disc pl-4 space-y-1">
                <li>
                  <strong>Manual Drawing:</strong> Drawing a 5-point star requires 10 steps (5 pairs of Move Forward + Turn 144°).
                </li>
                <li>
                  <strong>Bundle into Function:</strong> By packaging these 10 steps into a function called <code>MakeStar()</code>, we only define the instructions once!
                </li>
                <li>
                  <strong>Reuse Function:</strong> Call <code>MakeStar()</code> 5 times to effortlessly create 5 stars across the canvas.
                </li>
              </ul>
            </div>

            <button
              onClick={() => setShowHelp(false)}
              className="w-full py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-black text-xs shadow-md cursor-pointer transition"
            >
              Got It, Creator!
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
