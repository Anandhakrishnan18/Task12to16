"use client";

import React, { useState, useEffect, useRef, useMemo, useCallback } from "react";
import Link from "next/link";
import Confetti from "react-confetti";
import { useWindowSize } from "react-use";
import { Canvas, useFrame } from "@react-three/fiber";
import * as THREE from "three";
import {
  Play,
  Pause,
  RotateCcw,
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  AlertCircle,
  Volume2,
  VolumeX,
  ArrowLeft,
  ArrowRight,
  Trophy,
  Sliders,
  Radio,
  Info,
  BrainCircuit,
  Eye,
} from "lucide-react";
import { useLabAudio } from "@/hooks/useLabAudio";
import { useLMSBridge } from "@/hooks/useLMSBridge";

// ═════════════════════════════════════════════════════════════════════════════
// 1. LIGHT THEME & COLOR PALETTES
// ═════════════════════════════════════════════════════════════════════════════

export const THEME = {
  bgMain: "#F4F8F2",
  cardBg: "#FFFFFF",
  primaryGreen: "#269B68",
  secondaryGreen: "#75C99B",
  softGreen: "#E5F5E9",
  lightSkyBlue: "#DCEFFD",
  primaryText: "#244536",
  secondaryText: "#667B70",
  borders: "#D5E8DA",
  road: "#626B73",
  waves: "#18AFC4",
  warning: "#F4B942",
  danger: "#E85D65",
};

// Modern BLUE color theme for the entire car (visually distinct from green grass)
export const CAR_THEME = {
  mainBody: "#1565C0",     // Rich royal blue
  secondaryBody: "#1976D2",// Vibrant blue
  darkDetails: "#0D47A1",  // Deep blue accents
  windows: "#263746",      // Slate navy tinted glass
  headlights: "#FFFFFF",   // Soft white
  sensors: "#18AFC4",      // Cyan ultrasonic transducers
};

// ═════════════════════════════════════════════════════════════════════════════
// 2. MATHEMATICAL DIMENSIONS: CAR, ROAD, AND CLEARANCE
// ═════════════════════════════════════════════════════════════════════════════

// Car Physical Dimensions
export const CAR_DIMENSIONS = {
  width: 0.92,           // Actual chassis width
  wheelTrack: 1.04,       // Complete footprint width including tires
  length: 1.55,          // Total length
  halfWidth: 0.52,        // Lateral collision boundary
  halfLength: 0.78,       // Longitudinal collision boundary
  safetyMargin: 0.28,     // Required safe buffer space on each side
  requiredCorridor: 1.35, // Minimum passage width needed to fit safely (0.92 + 2*0.28)
};

// Usable Road Dimensions
export const ROAD_WIDTH = 4.4; // Generous road width for realistic clearance maneuvers (half-width = 2.2)
export const ROAD_HALF_WIDTH = ROAD_WIDTH / 2; // 2.2

export interface CourseWaypoint {
  x: number;
  z: number;
  desc?: string;
  challengeId?: 1 | 2 | 3;
}

// 12 Connected Waypoints forming one complete, compact course (fits 100% on screen)
export const COURSE_WAYPOINTS: CourseWaypoint[] = [
  { x: -9.5, z: 7.5, desc: "START BAY" },
  { x: -5.0, z: 7.5, desc: "APPROACHING BARRICADE", challengeId: 1 },
  { x: -1.0, z: 7.5, desc: "OBSTACLE 1 PASS", challengeId: 1 },
  { x: 3.8, z: 7.5, desc: "TURN 1 CORNER" },
  { x: 3.8, z: 3.5, desc: "ENTERING SIDE OBSTACLES", challengeId: 2 },
  { x: 3.8, z: -0.5, desc: "SIDE CLEARANCE PASS", challengeId: 2 },
  { x: 3.8, z: -3.5, desc: "TURN 2 CORNER" },
  { x: -1.0, z: -3.5, desc: "APPROACHING CHICANE", challengeId: 3 },
  { x: -5.5, z: -3.5, desc: "TURN 3 CORNER", challengeId: 3 },
  { x: -5.5, z: -7.5, desc: "STADIUM TURN", challengeId: 3 },
  { x: -2.0, z: -7.5, desc: "STADIUM AVENUE" },
  { x: 0.8, z: -7.5, desc: "CRICKET STADIUM FINISH" },
];

// ═════════════════════════════════════════════════════════════════════════════
// 3. OBSTACLES FOR THE 3 PROGRESSIVE CHALLENGES
// ═════════════════════════════════════════════════════════════════════════════

export interface CourseObstacle {
  id: string;
  name: string;
  challenge: 1 | 2 | 3;
  type: "barricade" | "van" | "rock" | "cones" | "house" | "shop" | "tree";
  x: number;
  z: number;
  radius: number;
  color?: string;
  width?: number;
  depth?: number;
}

export const COURSE_OBSTACLES: CourseObstacle[] = [
  // ── CHALLENGE 1: FRONT OBSTACLE (Barricade on Right Lane, Left Lane Wide Open) ──
  // Road at Z = 7.5 (bounds Z: 5.3 to 9.7). Barricade at Z = 6.8 leaves Left lane (Z: 7.45 to 9.7) wide open (2.25m clearance)
  {
    id: "ch1-barricade",
    name: "Road Construction Barricade",
    challenge: 1,
    type: "barricade",
    x: -2.8,
    z: 6.8,
    radius: 0.65,
    color: "#E85D65",
  },
  {
    id: "res-house-1",
    name: "Suburban Cottage",
    challenge: 1,
    type: "house",
    x: -7.5,
    z: 11.5,
    radius: 1.8,
    width: 3.0,
    depth: 2.6,
    color: "#FFFFFF",
  },
  {
    id: "res-tree-1",
    name: "Garden Maple",
    challenge: 1,
    type: "tree",
    x: -1.0,
    z: 11.2,
    radius: 0.9,
  },

  // ── CHALLENGE 2: PARKED TRUCK (On Left Lane, Right Lane Wide Open) ──
  // Road along X = 3.8 (bounds X: 1.6 to 6.0). Van at X = 4.5 leaves Right corridor (X: 1.6 to 3.85) wide open (2.25m clearance)
  {
    id: "ch2-van",
    name: "Parked Delivery Truck",
    challenge: 2,
    type: "van",
    x: 4.5,
    z: 1.5,
    radius: 0.65,
    color: "#F4B942",
  },
  {
    id: "ch2-rock",
    name: "Granite Roadside Boulder",
    challenge: 2,
    type: "rock",
    x: 7.2,
    z: -0.5,
    radius: 0.85,
    color: "#626B73",
  },
  {
    id: "comm-shop-1",
    name: "City Bakery",
    challenge: 2,
    type: "shop",
    x: 9.0,
    z: 3.2,
    radius: 1.8,
    width: 3.0,
    depth: 2.6,
    color: "#FFFFFF",
  },
  {
    id: "comm-tree-2",
    name: "Town Tree",
    challenge: 2,
    type: "tree",
    x: 9.0,
    z: -1.8,
    radius: 0.9,
  },

  // ── CHALLENGE 3: CENTRAL WORK ZONE ROADBLOCK (Both Left & Right Open) ──
  // Road along Z = -3.5 (bounds Z: -5.7 to -1.3). Central barrier at Z = -3.5 leaves both sides open (1.85m clearance each)
  {
    id: "ch3-barrier",
    name: "Work Zone Roadblock",
    challenge: 3,
    type: "barricade",
    x: -2.8,
    z: -3.5,
    radius: 0.35,
    color: "#E85D65",
  },
  {
    id: "ch3-cones",
    name: "Plaza Safety Cones",
    challenge: 3,
    type: "cones",
    x: -8.0,
    z: -4.5,
    radius: 0.6,
    color: "#F4B942",
  },
  {
    id: "res-house-2",
    name: "Corner Villa",
    challenge: 3,
    type: "house",
    x: -9.2,
    z: -0.5,
    radius: 1.8,
    width: 2.8,
    depth: 2.6,
    color: "#FFFFFF",
  },
  {
    id: "stad-tree-3",
    name: "Plaza Cypress",
    challenge: 3,
    type: "tree",
    x: -9.2,
    z: -7.5,
    radius: 0.9,
  },
];

// ═════════════════════════════════════════════════════════════════════════════
// 4. SENSOR & SIMULATION TYPES
// ═════════════════════════════════════════════════════════════════════════════

export type SensorColor = "green" | "yellow" | "red";

export interface SensorStatusReading {
  distanceCm: number;
  statusColor: SensorColor;
  hitDistance: number;
  hasHit: boolean;
}

export interface UltrasonicSensorsData {
  left: SensorStatusReading;
  front: SensorStatusReading;
  right: SensorStatusReading;
}

export interface DirectionPromptData {
  isOpen: boolean;
  leftPassable: boolean;
  rightPassable: boolean;
  leftDistanceCm: number;
  rightDistanceCm: number;
  obstacleName: string;
}

// ═════════════════════════════════════════════════════════════════════════════
// 5. 3D MODELS (BLUE CAR, CYAN SENSOR WAVES, ROAD, REPOSITIONED STADIUM)
// ═════════════════════════════════════════════════════════════════════════════

/**
 * 3D Autonomous Educational Rover / Car
 * Re-colored with modern BLUE theme (#1565C0 / #1976D2 / #0D47A1) for clear contrast against green grass.
 * Dimensions calibrated: width 0.92, length 1.55 for reliable clearance navigation.
 */
function CompactCarMesh({
  readings,
  wheelSpin,
  steerAngle,
}: {
  readings: UltrasonicSensorsData;
  wheelSpin: number;
  steerAngle: number;
}) {
  const getLedColor = (col: SensorColor) => {
    if (col === "red") return THEME.danger;
    if (col === "yellow") return THEME.warning;
    return THEME.primaryGreen;
  };

  return (
    <group position={[0, 0, 0]}>
      {/* ── Main Chassis Body (Royal Blue #1565C0) ── */}
      <mesh position={[0, 0.28, 0]} castShadow receiveShadow>
        <boxGeometry args={[CAR_DIMENSIONS.width, 0.3, CAR_DIMENSIONS.length]} />
        <meshStandardMaterial color={CAR_THEME.mainBody} roughness={0.25} metalness={0.5} />
      </mesh>

      {/* Aerodynamic Hood & Roof Accent (Vibrant Blue #1976D2) */}
      <mesh position={[0, 0.44, 0]}>
        <boxGeometry args={[0.24, 0.02, 1.4]} />
        <meshStandardMaterial color={CAR_THEME.secondaryBody} roughness={0.2} />
      </mesh>

      {/* Windows & Cabin Canopy (Slate Navy Tinted Glass #263746) */}
      <mesh position={[0, 0.54, -0.05]} castShadow>
        <boxGeometry args={[0.74, 0.26, 0.85]} />
        <meshStandardMaterial color={CAR_THEME.windows} roughness={0.1} metalness={0.8} />
      </mesh>

      {/* Roof Autonomous Sensor Pod (Dark Blue #0D47A1) */}
      <mesh position={[0, 0.7, 0]}>
        <cylinderGeometry args={[0.11, 0.11, 0.07, 16]} />
        <meshStandardMaterial color={CAR_THEME.darkDetails} metalness={0.9} />
      </mesh>
      <mesh position={[0, 0.75, 0]}>
        <sphereGeometry args={[0.05, 12, 12]} />
        <meshStandardMaterial color={CAR_THEME.sensors} emissive={CAR_THEME.sensors} emissiveIntensity={2.0} />
      </mesh>

      {/* Headlights (Soft White #FFFFFF) */}
      <mesh position={[-0.32, 0.26, -0.79]}>
        <boxGeometry args={[0.16, 0.08, 0.04]} />
        <meshStandardMaterial color={CAR_THEME.headlights} emissive={CAR_THEME.headlights} emissiveIntensity={2.5} />
      </mesh>
      <mesh position={[0.32, 0.26, -0.79]}>
        <boxGeometry args={[0.16, 0.08, 0.04]} />
        <meshStandardMaterial color={CAR_THEME.headlights} emissive={CAR_THEME.headlights} emissiveIntensity={2.5} />
      </mesh>

      {/* ── THREE FRONT ULTRASONIC SENSOR TRANSDUCERS (EYES) ── */}
      {/* 1. FRONT SENSOR (0°) */}
      <group position={[0, 0.24, -0.86]}>
        <mesh>
          <boxGeometry args={[0.22, 0.12, 0.07]} />
          <meshStandardMaterial color={CAR_THEME.darkDetails} />
        </mesh>
        <mesh position={[-0.05, 0, -0.04]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.032, 0.032, 0.04, 12]} />
          <meshStandardMaterial color="#D97706" metalness={0.8} />
        </mesh>
        <mesh position={[0.05, 0, -0.04]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.032, 0.032, 0.04, 12]} />
          <meshStandardMaterial color="#D97706" metalness={0.8} />
        </mesh>
        {/* Sensor State LED */}
        <mesh position={[0, 0.035, -0.04]}>
          <sphereGeometry args={[0.024, 8, 8]} />
          <meshStandardMaterial
            color={getLedColor(readings.front.statusColor)}
            emissive={getLedColor(readings.front.statusColor)}
            emissiveIntensity={2.5}
          />
        </mesh>
      </group>

      {/* 2. LEFT SENSOR (-35°) */}
      <group position={[-0.34, 0.24, -0.81]} rotation={[0, 0.6, 0]}>
        <mesh>
          <boxGeometry args={[0.19, 0.12, 0.07]} />
          <meshStandardMaterial color={CAR_THEME.darkDetails} />
        </mesh>
        <mesh position={[-0.04, 0, -0.04]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.028, 0.028, 0.04, 12]} />
          <meshStandardMaterial color="#D97706" metalness={0.8} />
        </mesh>
        <mesh position={[0.04, 0, -0.04]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.028, 0.028, 0.04, 12]} />
          <meshStandardMaterial color="#D97706" metalness={0.8} />
        </mesh>
        <mesh position={[0, 0.035, -0.04]}>
          <sphereGeometry args={[0.024, 8, 8]} />
          <meshStandardMaterial
            color={getLedColor(readings.left.statusColor)}
            emissive={getLedColor(readings.left.statusColor)}
            emissiveIntensity={2.5}
          />
        </mesh>
      </group>

      {/* 3. RIGHT SENSOR (+35°) */}
      <group position={[0.34, 0.24, -0.81]} rotation={[0, -0.6, 0]}>
        <mesh>
          <boxGeometry args={[0.19, 0.12, 0.07]} />
          <meshStandardMaterial color={CAR_THEME.darkDetails} />
        </mesh>
        <mesh position={[-0.04, 0, -0.04]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.028, 0.028, 0.04, 12]} />
          <meshStandardMaterial color="#D97706" metalness={0.8} />
        </mesh>
        <mesh position={[0.04, 0, -0.04]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.028, 0.028, 0.04, 12]} />
          <meshStandardMaterial color="#D97706" metalness={0.8} />
        </mesh>
        <mesh position={[0, 0.035, -0.04]}>
          <sphereGeometry args={[0.024, 8, 8]} />
          <meshStandardMaterial
            color={getLedColor(readings.right.statusColor)}
            emissive={getLedColor(readings.right.statusColor)}
            emissiveIntensity={2.5}
          />
        </mesh>
      </group>

      {/* ── 4 WHEELS (Tires & Hubs) ── */}
      <group position={[-0.52, 0.18, -0.48]} rotation={[0, steerAngle, 0]}>
        <mesh rotation={[0, 0, Math.PI / 2 + wheelSpin]}>
          <cylinderGeometry args={[0.17, 0.17, 0.12, 16]} />
          <meshStandardMaterial color="#263746" roughness={0.8} />
        </mesh>
      </group>
      <group position={[0.52, 0.18, -0.48]} rotation={[0, steerAngle, 0]}>
        <mesh rotation={[0, 0, Math.PI / 2 + wheelSpin]}>
          <cylinderGeometry args={[0.17, 0.17, 0.12, 16]} />
          <meshStandardMaterial color="#263746" roughness={0.8} />
        </mesh>
      </group>
      <group position={[-0.52, 0.18, 0.48]}>
        <mesh rotation={[0, 0, Math.PI / 2 + wheelSpin]}>
          <cylinderGeometry args={[0.17, 0.17, 0.12, 16]} />
          <meshStandardMaterial color="#263746" roughness={0.8} />
        </mesh>
      </group>
      <group position={[0.52, 0.18, 0.48]}>
        <mesh rotation={[0, 0, Math.PI / 2 + wheelSpin]}>
          <cylinderGeometry args={[0.17, 0.17, 0.12, 16]} />
          <meshStandardMaterial color="#263746" roughness={0.8} />
        </mesh>
      </group>
    </group>
  );
}

/**
 * Animated Ultrasonic Waves (Cyan Waves with Return Echo Pulses)
 */
function CompactUltrasonicWaves({ readings }: { readings: UltrasonicSensorsData }) {
  const [pulseTime, setPulseTime] = useState(0);

  useFrame((_, delta) => {
    setPulseTime((prev) => (prev + delta * 3.5) % 2.5);
  });

  const getWaveColor = (col: SensorColor) => {
    if (col === "red") return THEME.danger;
    if (col === "yellow") return THEME.warning;
    return THEME.waves;
  };

  const renderSensorRays = (
    reading: SensorStatusReading,
    originPos: [number, number, number],
    angleRad: number
  ) => {
    const maxRadius = Math.min(reading.hitDistance, 4.2);
    const color = getWaveColor(reading.statusColor);
    const ringOffsets = [0, 0.8, 1.6];

    return (
      <group position={originPos} rotation={[0, angleRad, 0]}>
        {ringOffsets.map((offset, idx) => {
          const currentR = ((pulseTime + offset) % 2.5) * (maxRadius / 2.5) + 0.18;
          if (currentR > maxRadius) return null;
          const progress = currentR / maxRadius;
          const opacity = Math.max(0.18, (1 - progress) * 0.88);

          return (
            <group key={idx} position={[0, 0, -currentR]}>
              <mesh rotation={[Math.PI / 2, 0, 0]}>
                <torusGeometry args={[Math.max(0.08, currentR * 0.38), 0.03, 8, 16, Math.PI * 0.7]} />
                <meshStandardMaterial
                  color={color}
                  emissive={color}
                  emissiveIntensity={reading.statusColor === "red" ? 2.8 : 1.8}
                  transparent
                  opacity={opacity}
                />
              </mesh>
            </group>
          );
        })}

        {/* Contact Spark & Returning Echo */}
        {reading.hasHit && (
          <group position={[0, 0, -reading.hitDistance]}>
            <mesh rotation={[Math.PI / 2, 0, 0]}>
              <ringGeometry args={[0.05, 0.22, 16]} />
              <meshStandardMaterial
                color={color}
                emissive={color}
                emissiveIntensity={3.0}
                transparent
                opacity={0.9}
                side={THREE.DoubleSide}
              />
            </mesh>
            {(() => {
              const echoProgress = (pulseTime % 1.2) / 1.2;
              const echoDist = (1 - echoProgress) * Math.min(reading.hitDistance, 1.6);
              return (
                <mesh position={[0, 0, echoDist]} rotation={[Math.PI / 2, 0, 0]}>
                  <torusGeometry args={[0.18, 0.022, 8, 16, Math.PI * 0.55]} />
                  <meshStandardMaterial
                    color="#FFFFFF"
                    emissive={color}
                    emissiveIntensity={2.0}
                    transparent
                    opacity={(1 - echoProgress) * 0.75}
                  />
                </mesh>
              );
            })()}
          </group>
        )}
      </group>
    );
  };

  return (
    <group position={[0, 0.24, 0]}>
      {renderSensorRays(readings.front, [0, 0, -0.9], 0)}
      {renderSensorRays(readings.left, [-0.34, 0, -0.84], 0.6)}
      {renderSensorRays(readings.right, [0.34, 0, -0.84], -0.6)}
    </group>
  );
}

/**
 * Single Connected 3D Road Mesh (Clean Grey #626B73, Width = 4.2)
 */
function CompactRoadMesh() {
  return (
    <group>
      {/* Segment 1: Bottom straight road (Z = 7.5, X: -10 to 4) */}
      <mesh position={[-3, 0.02, 7.5]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[15, ROAD_WIDTH]} />
        <meshStandardMaterial color={THEME.road} roughness={0.8} />
      </mesh>
      {[-8, -5, -2, 1].map((x, i) => (
        <mesh key={i} position={[x, 0.03, 7.5]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[1.5, 0.16]} />
          <meshStandardMaterial color="#FFFFFF" />
        </mesh>
      ))}

      {/* Corner 1 at (3.8, 7.5) */}
      <mesh position={[3.8, 0.02, 7.5]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[ROAD_WIDTH, ROAD_WIDTH]} />
        <meshStandardMaterial color={THEME.road} />
      </mesh>

      {/* Segment 2: Right straight road (X = 3.8, Z: 7.5 down to -3.5) */}
      <mesh position={[3.8, 0.02, 2.0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[ROAD_WIDTH, 12]} />
        <meshStandardMaterial color={THEME.road} roughness={0.8} />
      </mesh>
      {[6, 3, 0, -2].map((z, i) => (
        <mesh key={i} position={[3.8, 0.03, z]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[0.16, 1.5]} />
          <meshStandardMaterial color="#FFFFFF" />
        </mesh>
      ))}

      {/* Corner 2 at (3.8, -3.5) */}
      <mesh position={[3.8, 0.02, -3.5]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[ROAD_WIDTH, ROAD_WIDTH]} />
        <meshStandardMaterial color={THEME.road} />
      </mesh>

      {/* Segment 3: Middle road (Z = -3.5, X: 3.8 to -5.5) */}
      <mesh position={[-0.85, 0.02, -3.5]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[11, ROAD_WIDTH]} />
        <meshStandardMaterial color={THEME.road} roughness={0.8} />
      </mesh>
      {[2, -0.5, -3].map((x, i) => (
        <mesh key={i} position={[x, 0.03, -3.5]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[1.5, 0.16]} />
          <meshStandardMaterial color="#FFFFFF" />
        </mesh>
      ))}

      {/* Corner 3 at (-5.5, -3.5) */}
      <mesh position={[-5.5, 0.02, -3.5]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[ROAD_WIDTH, ROAD_WIDTH]} />
        <meshStandardMaterial color={THEME.road} />
      </mesh>

      {/* Segment 4: Left drop (X = -5.5, Z: -3.5 down to -7.5) */}
      <mesh position={[-5.5, 0.02, -5.5]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[ROAD_WIDTH, 5.5]} />
        <meshStandardMaterial color={THEME.road} roughness={0.8} />
      </mesh>

      {/* Corner 4 at (-5.5, -7.5) */}
      <mesh position={[-5.5, 0.02, -7.5]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[ROAD_WIDTH, ROAD_WIDTH]} />
        <meshStandardMaterial color={THEME.road} />
      </mesh>

      {/* Segment 5: Stadium Avenue (Z = -7.5, X: -5.5 to 1.5) - COMPLETELY CLEAR & UNOBSTRUCTED */}
      <mesh position={[-2.0, 0.02, -7.5]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[8.5, ROAD_WIDTH]} />
        <meshStandardMaterial color={THEME.road} roughness={0.8} />
      </mesh>
      {[-4.5, -2.5, -0.5].map((x, i) => (
        <mesh key={i} position={[x, 0.03, -7.5]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[1.4, 0.16]} />
          <meshStandardMaterial color="#FFFFFF" />
        </mesh>
      ))}

      {/* START BAY Marker at (-9.5, 7.5) */}
      <mesh position={[-9.5, 0.03, 7.5]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[1.8, ROAD_WIDTH]} />
        <meshStandardMaterial color={THEME.secondaryGreen} transparent opacity={0.7} />
      </mesh>

      {/* FINISH LINE at (0.8, -7.5) - Clearly marked on road */}
      <mesh position={[0.8, 0.03, -7.5]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[1.2, ROAD_WIDTH]} />
        <meshStandardMaterial color="#FFFFFF" />
      </mesh>
      {[-1.4, -0.7, 0, 0.7, 1.4].map((z, i) => (
        <mesh key={i} position={[0.8, 0.04, -7.5 + z]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[0.5, 0.35]} />
          <meshStandardMaterial color={THEME.primaryText} />
        </mesh>
      ))}
    </group>
  );
}

/**
 * 3D Obstacle Objects & Scenery (Light Theme)
 */
function CompactObstaclesRenderer({ obstacles }: { obstacles: CourseObstacle[] }) {
  return (
    <group>
      {obstacles.map((obs) => (
        <group key={obs.id} position={[obs.x, 0, obs.z]}>
          {/* Barricade */}
          {obs.type === "barricade" && (
            <group>
              <mesh position={[-0.55, 0.35, 0]}>
                <boxGeometry args={[0.08, 0.7, 0.35]} />
                <meshStandardMaterial color="#475569" />
              </mesh>
              <mesh position={[0.55, 0.35, 0]}>
                <boxGeometry args={[0.08, 0.7, 0.35]} />
                <meshStandardMaterial color="#475569" />
              </mesh>
              <mesh position={[0, 0.52, 0]}>
                <boxGeometry args={[1.3, 0.2, 0.06]} />
                <meshStandardMaterial color={obs.color || THEME.danger} />
              </mesh>
              <mesh position={[0, 0.26, 0]}>
                <boxGeometry args={[1.3, 0.16, 0.06]} />
                <meshStandardMaterial color="#FFFFFF" />
              </mesh>
              {/* Amber Beacon */}
              <mesh position={[0, 0.7, 0]}>
                <cylinderGeometry args={[0.06, 0.06, 0.1, 10]} />
                <meshStandardMaterial color={THEME.warning} emissive={THEME.warning} emissiveIntensity={2.5} />
              </mesh>
            </group>
          )}

          {/* Delivery Van */}
          {obs.type === "van" && (
            <group>
              <mesh position={[0, 0.45, 0]} castShadow>
                <boxGeometry args={[1.1, 0.65, 2.2]} />
                <meshStandardMaterial color={obs.color || THEME.warning} roughness={0.3} metalness={0.4} />
              </mesh>
              <mesh position={[0, 0.85, -0.1]}>
                <boxGeometry args={[0.95, 0.45, 1.3]} />
                <meshStandardMaterial color="#FFFFFF" roughness={0.1} />
              </mesh>
              <mesh position={[-0.45, 0.4, 1.12]}>
                <sphereGeometry args={[0.045, 8, 8]} />
                <meshStandardMaterial color={THEME.warning} emissive={THEME.warning} emissiveIntensity={2.5} />
              </mesh>
              <mesh position={[0.45, 0.4, 1.12]}>
                <sphereGeometry args={[0.045, 8, 8]} />
                <meshStandardMaterial color={THEME.warning} emissive={THEME.warning} emissiveIntensity={2.5} />
              </mesh>
            </group>
          )}

          {/* Rock Boulder */}
          {obs.type === "rock" && (
            <group>
              <mesh position={[0, 0.4, 0]} castShadow>
                <dodecahedronGeometry args={[obs.radius * 0.75, 1]} />
                <meshStandardMaterial color={obs.color || THEME.road} roughness={0.9} />
              </mesh>
            </group>
          )}

          {/* Cones */}
          {obs.type === "cones" && (
            <group>
              {[-0.2, 0.2].map((cx, i) => (
                <mesh key={i} position={[cx, 0.3, 0]}>
                  <coneGeometry args={[0.16, 0.55, 12]} />
                  <meshStandardMaterial color={THEME.warning} roughness={0.3} />
                </mesh>
              ))}
            </group>
          )}

          {/* Small House */}
          {obs.type === "house" && (
            <group>
              <mesh position={[0, 0.9, 0]} castShadow>
                <boxGeometry args={[obs.width || 3.0, 1.8, obs.depth || 2.4]} />
                <meshStandardMaterial color={THEME.cardBg} roughness={0.5} />
              </mesh>
              <mesh position={[0, 2.1, 0]} rotation={[0, Math.PI / 4, 0]} castShadow>
                <coneGeometry args={[(obs.width || 3.0) * 0.75, 1.1, 4]} />
                <meshStandardMaterial color={THEME.primaryGreen} roughness={0.4} />
              </mesh>
            </group>
          )}

          {/* Small Shop */}
          {obs.type === "shop" && (
            <group>
              <mesh position={[0, 1.1, 0]} castShadow>
                <boxGeometry args={[obs.width || 3.0, 2.2, obs.depth || 2.6]} />
                <meshStandardMaterial color={THEME.cardBg} roughness={0.3} />
              </mesh>
              <mesh position={[0, 1.2, (obs.depth || 2.6) / 2 + 0.25]} rotation={[0.3, 0, 0]}>
                <boxGeometry args={[(obs.width || 3.0) * 0.85, 0.08, 0.65]} />
                <meshStandardMaterial color={THEME.lightSkyBlue} />
              </mesh>
            </group>
          )}

          {/* Tree */}
          {obs.type === "tree" && (
            <group>
              <mesh position={[0, 0.65, 0]}>
                <cylinderGeometry args={[0.12, 0.18, 1.3, 8]} />
                <meshStandardMaterial color="#78350F" />
              </mesh>
              <mesh position={[0, 1.6, 0]}>
                <sphereGeometry args={[0.85, 10, 10]} />
                <meshStandardMaterial color={THEME.secondaryGreen} />
              </mesh>
            </group>
          )}
        </group>
      ))}

      {/* 3 Challenge Section Badges in the World */}
      <group position={[-2.8, 1.5, 7.5]}>
        <mesh>
          <sphereGeometry args={[0.26, 16, 16]} />
          <meshStandardMaterial color={THEME.primaryGreen} emissive={THEME.primaryGreen} emissiveIntensity={1.5} />
        </mesh>
      </group>
      <group position={[3.8, 1.5, 1.0]}>
        <mesh>
          <sphereGeometry args={[0.26, 16, 16]} />
          <meshStandardMaterial color={THEME.primaryGreen} emissive={THEME.primaryGreen} emissiveIntensity={1.5} />
        </mesh>
      </group>
      <group position={[-3.5, 1.5, -3.5]}>
        <mesh>
          <sphereGeometry args={[0.26, 16, 16]} />
          <meshStandardMaterial color={THEME.primaryGreen} emissive={THEME.primaryGreen} emissiveIntensity={1.5} />
        </mesh>
      </group>
    </group>
  );
}

/**
 * RESIZED AND REPOSITIONED CRICKET STADIUM
 * Placed completely BESIDE the road at (0.8, -11.8).
 * Road remains 100% visible, open, and unobstructed.
 */
function RepositionedCricketStadium() {
  return (
    <group position={[0.8, 0, -11.8]}>
      {/* Decorative Walkway connecting road to stadium */}
      <mesh position={[0, 0.02, 2.2]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[2.0, 2.2]} />
        <meshStandardMaterial color="#CBD5E1" />
      </mesh>

      {/* Small Entrance Gateway Arch */}
      <group position={[0, 0, 1.3]}>
        <mesh position={[-1.1, 1.1, 0]} castShadow>
          <boxGeometry args={[0.26, 2.2, 0.26]} />
          <meshStandardMaterial color={THEME.primaryGreen} />
        </mesh>
        <mesh position={[1.1, 1.1, 0]} castShadow>
          <boxGeometry args={[0.26, 2.2, 0.26]} />
          <meshStandardMaterial color={THEME.primaryGreen} />
        </mesh>
        <mesh position={[0, 2.2, 0]}>
          <boxGeometry args={[2.4, 0.45, 0.35]} />
          <meshStandardMaterial color={THEME.primaryGreen} />
        </mesh>
        {/* Marquee Banner */}
        <mesh position={[0, 2.2, 0.2]}>
          <boxGeometry args={[2.2, 0.3, 0.05]} />
          <meshStandardMaterial color={THEME.warning} emissive={THEME.warning} emissiveIntensity={1.8} />
        </mesh>
      </group>

      {/* Compact Stadium Grandstand Bowl (Radius 2.6 units) */}
      <group position={[0, 0, -1.0]}>
        {/* Outer Circular Wall */}
        <mesh position={[0, 1.3, 0]}>
          <cylinderGeometry args={[2.6, 2.9, 2.6, 28, 1, true]} />
          <meshStandardMaterial color="#FFFFFF" roughness={0.4} side={THREE.DoubleSide} />
        </mesh>

        {/* Tiered Seating (Soft Blue & Soft Green) */}
        <mesh position={[0, 0.55, 0]}>
          <cylinderGeometry args={[1.9, 2.5, 1.1, 28, 1, true]} />
          <meshStandardMaterial color={THEME.lightSkyBlue} side={THREE.DoubleSide} />
        </mesh>
        <mesh position={[0, 1.1, 0]}>
          <cylinderGeometry args={[2.1, 2.6, 1.1, 28, 1, true]} />
          <meshStandardMaterial color={THEME.secondaryGreen} side={THREE.DoubleSide} />
        </mesh>

        {/* Circular Cricket Outfield */}
        <mesh position={[0, 0.03, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <circleGeometry args={[1.8, 28]} />
          <meshStandardMaterial color="#4ADE80" roughness={0.8} />
        </mesh>

        {/* 22-Yard Clay Pitch */}
        <mesh position={[0, 0.04, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[0.7, 2.0]} />
          <meshStandardMaterial color="#D4A373" />
        </mesh>

        {/* Mini Wickets */}
        {[-0.75, 0.75].map((wz, wi) => (
          <group key={wi} position={[0, 0.09, wz]}>
            {[-0.035, 0, 0.035].map((sx, si) => (
              <mesh key={si} position={[sx, 0, 0]}>
                <cylinderGeometry args={[0.007, 0.007, 0.18, 6]} />
                <meshStandardMaterial color="#FEF08A" />
              </mesh>
            ))}
          </group>
        ))}

        {/* 4 Floodlight Towers */}
        {[
          [-2.2, -2.2],
          [2.2, -2.2],
          [-2.2, 2.2],
          [2.2, 2.2],
        ].map(([tx, tz], ti) => (
          <group key={ti} position={[tx, 0, tz]}>
            <mesh position={[0, 1.6, 0]}>
              <cylinderGeometry args={[0.07, 0.13, 3.2, 8]} />
              <meshStandardMaterial color="#64748B" />
            </mesh>
            <mesh position={[0, 3.2, 0]}>
              <boxGeometry args={[0.7, 0.35, 0.12]} />
              <meshStandardMaterial color="#334155" />
            </mesh>
            <mesh position={[0, 3.2, 0.07]}>
              <boxGeometry args={[0.6, 0.25, 0.03]} />
              <meshStandardMaterial color="#FFFFFF" emissive="#FFFFFF" emissiveIntensity={2.5} />
            </mesh>
          </group>
        ))}
      </group>
    </group>
  );
}

// ═════════════════════════════════════════════════════════════════════════════
// 6. ACCURATE OBSTACLE CLEARANCE & HYBRID NAVIGATION ENGINE
// ═════════════════════════════════════════════════════════════════════════════

interface HybridNavProps {
  safetyThreshold: number;
  isPaused: boolean;
  chosenDirection: "left" | "right" | null;
  onClearChosenDirection: () => void;
  onUpdateState: (state: {
    readings: UltrasonicSensorsData;
    currentChallenge: 1 | 2 | 3;
    completedChallenges: number;
    decisionText: string;
    decisionReason: string;
    decisionPrompt: DirectionPromptData | null;
  }) => void;
  onGoalReached: () => void;
}

function HybridNavigationEngine({
  safetyThreshold,
  isPaused,
  chosenDirection,
  onClearChosenDirection,
  onUpdateState,
  onGoalReached,
}: HybridNavProps) {
  const carState = useRef({
    currentWaypointIndex: 0,
    progress: 0,
    x: COURSE_WAYPOINTS[0].x,
    z: COURSE_WAYPOINTS[0].z,
    yaw: Math.PI / 2, // facing +X (East)
    lateralOffset: 0,
    targetLateralOffset: 0,
    speed: 1.35,
    steerAngle: 0,
    wheelSpin: 0,
    hasReachedGoal: false,
    activeObstacleId: null as string | null,
    decisionPending: false,
    avoidingState: "none" as "none" | "avoiding" | "cleared",
    chosenDir: null as "left" | "right" | null,
    clearedObstacles: new Set<string>(),
  });

  const [currentReadings, setCurrentReadings] = useState<UltrasonicSensorsData>({
    left: { distanceCm: 50, statusColor: "green", hitDistance: 5.0, hasHit: false },
    front: { distanceCm: 50, statusColor: "green", hitDistance: 5.0, hasHit: false },
    right: { distanceCm: 50, statusColor: "green", hitDistance: 5.0, hasHit: false },
  });

  const [carDisplay, setCarDisplay] = useState({
    x: COURSE_WAYPOINTS[0].x,
    z: COURSE_WAYPOINTS[0].z,
    yaw: Math.PI / 2,
    steerAngle: 0,
    wheelSpin: 0,
  });

  // Accurate Raycasting with Exact Footprint Margins
  const raycastObstacles = useCallback(
    (originX: number, originZ: number, dirX: number, dirZ: number, maxRange: number) => {
      let minHitDist = maxRange;
      let hasHit = false;

      for (const obs of COURSE_OBSTACLES) {
        const vx = obs.x - originX;
        const vz = obs.z - originZ;
        const proj = vx * dirX + vz * dirZ;

        // Bounding collision footprint check
        if (proj > 0 && proj < minHitDist + obs.radius) {
          const perpDistSq = vx * vx + vz * vz - proj * proj;
          const detectionRadius = obs.radius + 0.15; // Realistic precision boundary
          if (perpDistSq <= detectionRadius * detectionRadius) {
            const hitDist = Math.max(0.05, proj - Math.sqrt(detectionRadius * detectionRadius - perpDistSq));
            if (hitDist < minHitDist) {
              minHitDist = hitDist;
              hasHit = true;
            }
          }
        }
      }

      return { hitDistance: minHitDist, hasHit };
    },
    []
  );

  // Player Direction Selection: Execute Avoidance Manoeuvre
  useEffect(() => {
    if (!chosenDirection) return;
    const car = carState.current;
    if (car.decisionPending) {
      car.decisionPending = false;
      car.avoidingState = "avoiding";
      car.chosenDir = chosenDirection;
      car.targetLateralOffset = chosenDirection === "left" ? 1.15 : -1.15;
      onClearChosenDirection();
    }
  }, [chosenDirection, onClearChosenDirection]);

  // Main Simulation Loop with Automatic Movement & Avoidance
  useFrame((_, delta) => {
    if (isPaused) return;
    const dt = Math.min(delta, 0.05);
    const car = carState.current;

    if (car.hasReachedGoal) return;

    // 1. Current Segment Waypoints
    const wpCurrent = COURSE_WAYPOINTS[car.currentWaypointIndex];
    const nextIdx = Math.min(COURSE_WAYPOINTS.length - 1, car.currentWaypointIndex + 1);
    const wpNext = COURSE_WAYPOINTS[nextIdx];

    const segDx = wpNext.x - wpCurrent.x;
    const segDz = wpNext.z - wpCurrent.z;
    const segLength = Math.sqrt(segDx * segDx + segDz * segDz) || 1;
    const segDirX = segDx / segLength;
    const segDirZ = segDz / segLength;
    const targetYaw = Math.atan2(segDirX, -segDirZ);

    // 2. Perform 3 Ultrasonic Raycasts from front bumper
    const forwardX = Math.sin(car.yaw);
    const forwardZ = -Math.cos(car.yaw);
    const maxSensorDist = 4.2;

    // Front Sensor (0°)
    const frontOriginX = car.x + forwardX * 0.88;
    const frontOriginZ = car.z + forwardZ * 0.88;
    const frontRay = raycastObstacles(frontOriginX, frontOriginZ, forwardX, forwardZ, maxSensorDist);
    const frontCm = Math.round(Math.max(5, frontRay.hitDistance * 10));

    // Left Sensor (-35°)
    const leftYaw = car.yaw - 0.6;
    const leftDirX = Math.sin(leftYaw);
    const leftDirZ = -Math.cos(leftYaw);
    const leftOriginX = car.x + forwardX * 0.82 - forwardZ * 0.35;
    const leftOriginZ = car.z + forwardZ * 0.82 + forwardX * 0.35;
    const leftRay = raycastObstacles(leftOriginX, leftOriginZ, leftDirX, leftDirZ, maxSensorDist);
    const leftCm = Math.round(Math.max(5, leftRay.hitDistance * 10));

    // Right Sensor (+35°)
    const rightYaw = car.yaw + 0.6;
    const rightDirX = Math.sin(rightYaw);
    const rightDirZ = -Math.cos(rightYaw);
    const rightOriginX = car.x + forwardX * 0.82 + forwardZ * 0.35;
    const rightOriginZ = car.z + forwardZ * 0.82 - forwardX * 0.35;
    const rightRay = raycastObstacles(rightOriginX, rightOriginZ, rightDirX, rightDirZ, maxSensorDist);
    const rightCm = Math.round(Math.max(5, rightRay.hitDistance * 10));

    const getColorState = (cm: number, hasHit: boolean): SensorColor => {
      if (!hasHit || cm > safetyThreshold * 1.5) return "green";
      if (cm <= safetyThreshold) return "red";
      return "yellow";
    };

    const newReadings: UltrasonicSensorsData = {
      front: {
        distanceCm: frontCm,
        statusColor: getColorState(frontCm, frontRay.hasHit),
        hitDistance: frontRay.hitDistance,
        hasHit: frontRay.hasHit,
      },
      left: {
        distanceCm: leftCm,
        statusColor: getColorState(leftCm, leftRay.hasHit),
        hitDistance: leftRay.hitDistance,
        hasHit: leftRay.hasHit,
      },
      right: {
        distanceCm: rightCm,
        statusColor: getColorState(rightCm, rightRay.hasHit),
        hitDistance: rightRay.hitDistance,
        hasHit: rightRay.hasHit,
      },
    };

    setCurrentReadings(newReadings);

    // 3. AUTOMATIC NAVIGATION, OBSTACLE DETECTION & DECISION LOGIC
    let decisionText = "AUTOMATIC NAVIGATION ACTIVE";
    let decisionReason = "Path is clear. The vehicle is maintaining automatic forward speed.";
    let targetSpeed = 1.35;

    // Identify active on-road obstacle
    let activeObstacle: CourseObstacle | null = null;
    for (const obs of COURSE_OBSTACLES) {
      if (obs.type === "barricade" || obs.type === "van" || obs.type === "cones") {
        if (!car.clearedObstacles.has(obs.id)) {
          const dist = Math.hypot(obs.x - car.x, obs.z - car.z);
          if (dist < 4.2) {
            activeObstacle = obs;
            break;
          }
        }
      }
    }

    let promptData: DirectionPromptData | null = null;

    if (activeObstacle) {
      const toObsX = activeObstacle.x - car.x;
      const toObsZ = activeObstacle.z - car.z;
      const longDist = toObsX * segDirX + toObsZ * segDirZ;

      // Obstacle is ahead of the car and awaiting negotiation
      if (longDist > 0 && car.avoidingState === "none") {
        if (longDist <= 2.2) {
          if (longDist > 1.45) {
            // Slow down as obstacle approaches
            targetSpeed = 0.55;
            decisionText = "Front obstacle detected. Slowing down...";
            decisionReason = "Ultrasonic sensors detect obstacle ahead within safety threshold.";
          } else {
            // Stop safely before obstacle and prompt player
            targetSpeed = 0;
            if (car.speed < 0.15) {
              car.speed = 0;
              car.decisionPending = true;
              car.activeObstacleId = activeObstacle.id;
            }
          }
        }
      }

      if (car.decisionPending) {
        targetSpeed = 0;

        // Calculate clearance based on obstacle placement and road width (ROAD_WIDTH = 4.4)
        let leftPassable = true;
        let rightPassable = true;

        if (activeObstacle.id === "ch1-barricade") {
          // Barricade placed on Right lane: Left corridor is wide open (2.25m), Right is blocked (0.85m)
          leftPassable = true;
          rightPassable = false;
        } else if (activeObstacle.id === "ch2-van") {
          // Delivery Van parked on Left lane: Right corridor is wide open (2.25m), Left is blocked (0.85m)
          leftPassable = false;
          rightPassable = true;
        } else if (activeObstacle.id === "ch3-barrier") {
          // Central Roadblock: Both Left and Right corridors are open (1.85m each)
          leftPassable = true;
          rightPassable = true;
        }

        promptData = {
          isOpen: true,
          leftPassable,
          rightPassable,
          leftDistanceCm: leftCm,
          rightDistanceCm: rightCm,
          obstacleName: activeObstacle.name,
        };

        if (leftPassable && rightPassable) {
          decisionText = "Front obstacle detected. Both paths are clear.";
          decisionReason = "Ultrasonic sensors confirm safe road clearance on both left and right sides.";
        } else if (leftPassable) {
          decisionText = "Front obstacle detected. Right path is blocked.";
          decisionReason = "Left path is wide and clear (" + Math.round(leftCm) + "cm). Right clearance is restricted.";
        } else {
          decisionText = "Front obstacle detected. Left path is blocked.";
          decisionReason = "Right path is wide and clear (" + Math.round(rightCm) + "cm). Left clearance is restricted.";
        }
      } else if (car.avoidingState === "avoiding") {
        targetSpeed = 1.1; // Gentle avoidance speed
        decisionText = `Player selected ${car.chosenDir?.toUpperCase()}. Executing automatic ${car.chosenDir} avoidance.`;
        decisionReason = `Vehicle is navigating smoothly through verified ${car.chosenDir} corridor.`;

        // Check if car has passed the obstacle longitudinally
        if (longDist < -0.95) {
          car.avoidingState = "cleared";
          car.clearedObstacles.add(activeObstacle.id);
          car.targetLateralOffset = 0; // Smoothly recenter to centerline
        }
      } else if (car.avoidingState === "cleared") {
        targetSpeed = 1.35;
        decisionText = "Obstacle successfully avoided. Resuming automatic navigation.";
        decisionReason = "Obstacle cleared. Vehicle smoothly recentering in lane.";

        if (Math.abs(car.lateralOffset) < 0.08) {
          car.lateralOffset = 0;
          car.avoidingState = "none";
          car.chosenDir = null;
          car.activeObstacleId = null;
        }
      }
    } else {
      if (car.avoidingState === "cleared") {
        targetSpeed = 1.35;
        decisionText = "Obstacle successfully avoided. Resuming automatic navigation.";
        decisionReason = "Obstacle cleared. Vehicle smoothly recentering in lane.";
        if (Math.abs(car.lateralOffset) < 0.08) {
          car.lateralOffset = 0;
          car.avoidingState = "none";
          car.chosenDir = null;
          car.activeObstacleId = null;
        }
      } else {
        decisionText = "AUTOMATIC NAVIGATION ACTIVE";
        decisionReason = "Path is clear. The vehicle is maintaining automatic forward speed.";
      }
    }

    // 4. Smooth Turning & Trajectory Updates
    car.speed += (targetSpeed - car.speed) * 4.5 * dt;
    car.lateralOffset += (car.targetLateralOffset - car.lateralOffset) * 3.5 * dt;

    const perpX = -segDirZ;
    const perpZ = segDirX;

    if (car.speed > 0.05) {
      car.progress += (car.speed * dt) / segLength;
    }

    // Waypoint progression
    if (car.progress >= 1.0) {
      car.progress = 0;
      car.currentWaypointIndex++;

      // Finish at Stadium entrance
      if (car.currentWaypointIndex >= COURSE_WAYPOINTS.length - 1) {
        car.hasReachedGoal = true;
        onGoalReached();
        return;
      }
    }

    const baseX = wpCurrent.x + segDx * car.progress;
    const baseZ = wpCurrent.z + segDz * car.progress;

    car.x = baseX + perpX * car.lateralOffset;
    car.z = baseZ + perpZ * car.lateralOffset;

    // Smooth heading alignment
    const angleDiff = Math.atan2(Math.sin(targetYaw - car.yaw), Math.cos(targetYaw - car.yaw));
    car.steerAngle = Math.max(-0.35, Math.min(0.35, angleDiff * 1.4 + (car.targetLateralOffset - car.lateralOffset) * 0.25));
    car.yaw += angleDiff * 3.5 * dt;

    car.wheelSpin += car.speed * dt * 5.0;

    setCarDisplay({
      x: car.x,
      z: car.z,
      yaw: car.yaw,
      steerAngle: car.steerAngle,
      wheelSpin: car.wheelSpin,
    });

    let completedChallenges = 0;
    if (car.clearedObstacles.has("ch1-barricade")) completedChallenges = 1;
    if (car.clearedObstacles.has("ch2-van")) completedChallenges = 2;
    if (car.clearedObstacles.has("ch3-barrier")) completedChallenges = 3;

    let currentChallenge: 1 | 2 | 3 = 1;
    if (completedChallenges === 0) currentChallenge = 1;
    else if (completedChallenges === 1) currentChallenge = 2;
    else currentChallenge = 3;

    onUpdateState({
      readings: newReadings,
      currentChallenge,
      completedChallenges,
      decisionText,
      decisionReason,
      decisionPrompt: promptData,
    });
  });

  return (
    <group>
      {/* ── Modern BLUE Autonomous Car & Ultrasonic Waves ── */}
      <group position={[carDisplay.x, 0, carDisplay.z]} rotation={[0, carDisplay.yaw, 0]}>
        <CompactCarMesh
          readings={currentReadings}
          wheelSpin={carDisplay.wheelSpin}
          steerAngle={carDisplay.steerAngle}
        />
        <CompactUltrasonicWaves readings={currentReadings} />
      </group>

      {/* ── Connected 3D Road Network (Width = 4.2) ── */}
      <CompactRoadMesh />

      {/* ── Obstacle Challenges & Surroundings ── */}
      <CompactObstaclesRenderer obstacles={COURSE_OBSTACLES} />

      {/* ── Resized & Repositioned Cricket Stadium (Beside the road) ── */}
      <RepositionedCricketStadium />

      {/* ── Lush Grass Ground (Soft Lawn Green #75C99B) ── */}
      <mesh position={[0, -0.04, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[36, 30]} />
        <meshStandardMaterial color={THEME.secondaryGreen} roughness={0.9} />
      </mesh>
    </group>
  );
}

// ═════════════════════════════════════════════════════════════════════════════
// 7. WELCOME SCREEN 3D PREVIEW (BLUE CAR ON LIGHT PREVIEW)
// ═════════════════════════════════════════════════════════════════════════════

function WelcomeLightPreview() {
  const dummyReadings: UltrasonicSensorsData = {
    left: { distanceCm: 48, statusColor: "green", hitDistance: 4.8, hasHit: false },
    front: { distanceCm: 16, statusColor: "red", hitDistance: 1.6, hasHit: true },
    right: { distanceCm: 45, statusColor: "green", hitDistance: 4.5, hasHit: false },
  };

  return (
    <Canvas camera={{ position: [5, 6, 6], fov: 40 }} className="w-full h-full">
      <ambientLight intensity={0.9} />
      <directionalLight position={[8, 14, 8]} intensity={1.8} />
      <group position={[0, -0.3, 0]}>
        <CompactCarMesh readings={dummyReadings} wheelSpin={0} steerAngle={0.12} />
        <CompactUltrasonicWaves readings={dummyReadings} />
        <mesh position={[0, -0.02, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[10, 5]} />
          <meshStandardMaterial color={THEME.road} />
        </mesh>
        <group position={[0, 0, -2]}>
          <mesh position={[-0.5, 0.3, 0]}>
            <boxGeometry args={[0.08, 0.6, 0.3]} />
            <meshStandardMaterial color="#475569" />
          </mesh>
          <mesh position={[0.5, 0.3, 0]}>
            <boxGeometry args={[0.08, 0.6, 0.3]} />
            <meshStandardMaterial color="#475569" />
          </mesh>
          <mesh position={[0, 0.45, 0]}>
            <boxGeometry args={[1.2, 0.2, 0.05]} />
            <meshStandardMaterial color={THEME.danger} />
          </mesh>
          <mesh position={[0, 0.22, 0]}>
            <boxGeometry args={[1.2, 0.16, 0.05]} />
            <meshStandardMaterial color="#FFFFFF" />
          </mesh>
        </group>
      </group>
    </Canvas>
  );
}

// ═════════════════════════════════════════════════════════════════════════════
// 8. MAIN LAB COMPONENT (TASK 5 – LIGHT THEME & RELIABLE CLEARANCE NAVIGATION)
// ═════════════════════════════════════════════════════════════════════════════

export default function UltrasonicRadarRobotLab() {
  const { playPop, playSuccess, playChime } = useLabAudio();
  const { reportComplete } = useLMSBridge("ultrasonic-radar-robot");
  const { width, height } = useWindowSize();

  // Screen State
  const [screen, setScreen] = useState<"welcome" | "driving" | "results">("welcome");

  // Simulation Controls & Stats
  const [safetyThreshold, setSafetyThreshold] = useState(20);
  const [isPaused, setIsPaused] = useState(false);
  const [isSoundEnabled, setIsSoundEnabled] = useState(true);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [currentChallenge, setCurrentChallenge] = useState<1 | 2 | 3>(1);
  const [completedChallenges, setCompletedChallenges] = useState(0);
  const [decisionText, setDecisionText] = useState("AUTOMATIC NAVIGATION ACTIVE");
  const [decisionReason, setDecisionReason] = useState("Sensors scanning 3 directions for obstacles.");
  const [decisionPrompt, setDecisionPrompt] = useState<DirectionPromptData | null>(null);
  const [directionWarning, setDirectionWarning] = useState<string | null>(null);
  const [chosenDirection, setChosenDirection] = useState<"left" | "right" | null>(null);
  const [resetKey, setResetKey] = useState(0);

  const [liveReadings, setLiveReadings] = useState<UltrasonicSensorsData>({
    left: { distanceCm: 50, statusColor: "green", hitDistance: 5.0, hasHit: false },
    front: { distanceCm: 50, statusColor: "green", hitDistance: 5.0, hasHit: false },
    right: { distanceCm: 50, statusColor: "green", hitDistance: 5.0, hasHit: false },
  });

  // Timer loop
  useEffect(() => {
    if (screen !== "driving" || isPaused) return;
    const timer = setInterval(() => {
      setElapsedTime((prev) => prev + 1);
    }, 1000);
    return () => clearInterval(timer);
  }, [screen, isPaused]);

  // Audio helper
  const playSound = useCallback(
    (action: () => void) => {
      if (isSoundEnabled) action();
    },
    [isSoundEnabled]
  );

  // Player Decision Handler: Validate Choice & Trigger Automatic Avoidance
  const handleSelectDirection = (dir: "left" | "right") => {
    if (!decisionPrompt) return;

    if (dir === "left") {
      if (!decisionPrompt.leftPassable) {
        playSound(playPop);
        setDirectionWarning("Left path blocked! Try the right side.");
        setDecisionText("Left path is blocked. Right path is clear.");
        setDecisionReason("Ultrasonic sensors detect insufficient clearance on the left side.");
        return;
      }
    } else if (dir === "right") {
      if (!decisionPrompt.rightPassable) {
        playSound(playPop);
        setDirectionWarning("Right path blocked! Try the left side.");
        setDecisionText("Right path is blocked. Left path is clear.");
        setDecisionReason("Ultrasonic sensors detect insufficient clearance on the right side.");
        return;
      }
    }

    // Selected direction is safe and physically verified
    playSound(playSuccess);
    setDirectionWarning(null);
    setChosenDirection(dir);
    setDecisionPrompt(null);
    setDecisionText(`Player selected ${dir.toUpperCase()}. Executing automatic ${dir} avoidance.`);
    setDecisionReason(`Vehicle is navigating smoothly through verified ${dir} corridor.`);
  };

  // Goal Reached
  const handleGoalReached = useCallback(() => {
    playSound(playSuccess);
    playSound(playChime);

    const calculatedScore = Math.max(850, 1000 - elapsedTime * 3);
    reportComplete({ points: Math.min(100, Math.round(calculatedScore / 10)) });

    setTimeout(() => {
      setScreen("results");
    }, 1400);
  }, [playSound, playSuccess, playChime, elapsedTime, reportComplete]);

  // Restart / Reset Simulation
  const handleRestart = () => {
    playSound(playPop);
    setElapsedTime(0);
    setCurrentChallenge(1);
    setCompletedChallenges(0);
    setIsPaused(false);
    setDecisionPrompt(null);
    setDirectionWarning(null);
    setChosenDirection(null);
    setResetKey((prev) => prev + 1);
    setScreen("driving");
  };

  const finalScore = useMemo(() => {
    return Math.max(850, 1000 - elapsedTime * 3);
  }, [elapsedTime]);

  return (
    <div
      className="h-[100dvh] max-h-[100dvh] w-screen overflow-hidden flex flex-col relative select-none font-sans"
      style={{ backgroundColor: THEME.bgMain, color: THEME.primaryText }}
    >
      {/* ═════════════════════════════════════════════════════════════════════ */}
      {/* SCREEN 1: WELCOME SCREEN (LIGHT THEME)                                */}
      {/* ═════════════════════════════════════════════════════════════════════ */}
      {screen === "welcome" && (
        <div
          className="flex-1 w-full h-full flex flex-col items-center justify-center p-4 sm:p-8 relative z-20"
          style={{ backgroundColor: THEME.bgMain }}
        >
          <div
            className="max-w-4xl w-full flex flex-col md:flex-row items-center gap-8 rounded-3xl p-6 sm:p-8 shadow-xl"
            style={{ backgroundColor: THEME.cardBg, border: `2px solid ${THEME.borders}` }}
          >
            {/* Left: 3D Preview with Distinct Blue Car */}
            <div
              className="w-full md:w-1/2 h-64 sm:h-80 rounded-2xl overflow-hidden relative flex items-center justify-center shadow-inner"
              style={{ backgroundColor: THEME.softGreen, border: `1px solid ${THEME.secondaryGreen}` }}
            >
              <WelcomeLightPreview />
              <div
                className="absolute bottom-3 left-3 px-3 py-1 rounded-full text-[11px] font-bold flex items-center gap-1.5 shadow"
                style={{ backgroundColor: THEME.cardBg, color: CAR_THEME.mainBody, border: `1px solid ${THEME.borders}` }}
              >
                <Radio size={13} className="text-[#1565C0] animate-pulse" />
                <span>Autonomous Blue Rover</span>
              </div>
            </div>

            {/* Right: Mission Info */}
            <div className="w-full md:w-1/2 flex flex-col gap-4">
              <div className="flex items-center gap-2">
                <span
                  className="px-3 py-1 rounded-full text-xs font-black tracking-wider uppercase"
                  style={{ backgroundColor: THEME.softGreen, color: THEME.primaryGreen, border: `1px solid ${THEME.secondaryGreen}` }}
                >
                  Task 5: Sensor Simulation
                </span>
                <span
                  className="px-3 py-1 rounded-full text-xs font-black"
                  style={{ backgroundColor: THEME.lightSkyBlue, color: "#0284c7", border: "1px solid #7dd3fc" }}
                >
                  Reliable Clearance AI
                </span>
              </div>

              <div>
                <h1 className="text-2xl sm:text-3xl font-black tracking-tight" style={{ color: THEME.primaryText }}>
                  Automatic Ultrasonic Simulator
                </h1>
                <p className="text-xs sm:text-sm mt-2 leading-relaxed" style={{ color: THEME.secondaryText }}>
                  Discover how ultrasonic sensors calculate obstacle clearances to navigate safely!
                  The blue autonomous rover measures open corridors and travels automatically to the Cricket Stadium.
                </p>
              </div>

              {/* Highlights */}
              <div className="space-y-2 text-xs" style={{ color: THEME.primaryText }}>
                <div
                  className="flex items-center gap-2.5 p-2.5 rounded-xl"
                  style={{ backgroundColor: THEME.bgMain, border: `1px solid ${THEME.borders}` }}
                >
                  <div
                    className="w-6 h-6 rounded-lg flex items-center justify-center font-bold text-xs text-white"
                    style={{ backgroundColor: CAR_THEME.mainBody }}
                  >
                    1
                  </div>
                  <span><strong>Distinct Blue Car:</strong> High-contrast vehicle model with 3 front sensor transducers.</span>
                </div>
                <div
                  className="flex items-center gap-2.5 p-2.5 rounded-xl"
                  style={{ backgroundColor: THEME.bgMain, border: `1px solid ${THEME.borders}` }}
                >
                  <div
                    className="w-6 h-6 rounded-lg flex items-center justify-center font-bold text-xs text-white"
                    style={{ backgroundColor: THEME.primaryGreen }}
                  >
                    2
                  </div>
                  <span><strong>Accurate Clearances:</strong> Computes actual road footprint and steers through open spaces.</span>
                </div>
                <div
                  className="flex items-center gap-2.5 p-2.5 rounded-xl"
                  style={{ backgroundColor: THEME.bgMain, border: `1px solid ${THEME.borders}` }}
                >
                  <div
                    className="w-6 h-6 rounded-lg flex items-center justify-center font-bold text-xs text-white"
                    style={{ backgroundColor: THEME.warning }}
                  >
                    3
                  </div>
                  <span><strong>Player Assistance:</strong> Provides guidance when clearances require navigator confirmation.</span>
                </div>
              </div>

              {/* Start Button */}
              <button
                onClick={() => {
                  playSound(playSuccess);
                  setScreen("driving");
                }}
                className="mt-2 w-full py-3.5 rounded-2xl text-white font-black text-sm tracking-wider uppercase shadow-lg flex items-center justify-center gap-2 cursor-pointer transition transform active:scale-98"
                style={{ backgroundColor: THEME.primaryGreen }}
              >
                <Play size={18} fill="currentColor" />
                <span>START SIMULATION</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ═════════════════════════════════════════════════════════════════════ */}
      {/* SCREEN 2: MAIN SIMULATION (LIGHT THEME)                                */}
      {/* ═════════════════════════════════════════════════════════════════════ */}
      {screen === "driving" && (
        <div className="flex-1 w-full h-full flex flex-col overflow-hidden">
          {/* ── LIGHT THEME TOP BAR ── */}
          <header
            className="h-12 px-4 flex items-center justify-between shrink-0 z-30 shadow-xs"
            style={{ backgroundColor: THEME.cardBg, borderBottom: `1px solid ${THEME.borders}` }}
          >
            {/* Left: Title & Challenge Indicator */}
            <div className="flex items-center gap-3">
              <Link
                href="/labs"
                className="w-7 h-7 rounded-lg flex items-center justify-center cursor-pointer transition hover:bg-[#E5F5E9]"
                style={{ border: `1px solid ${THEME.borders}`, color: THEME.primaryText }}
                title="Back to Labs"
              >
                <ArrowLeft size={14} />
              </Link>
              <h2 className="text-xs sm:text-sm font-black tracking-wide" style={{ color: THEME.primaryText }}>
                Ultrasonic Sensor Navigation
              </h2>
              <span
                className="px-2.5 py-0.5 rounded-full text-[11px] font-black"
                style={{ backgroundColor: THEME.softGreen, color: THEME.primaryGreen, border: `1px solid ${THEME.secondaryGreen}` }}
              >
                CHALLENGE {currentChallenge}/3: {currentChallenge === 1 ? "Front Obstacle" : currentChallenge === 2 ? "Side Clearances" : "Stadium Final"}
              </span>
            </div>

            {/* Right: Timer, Pause, Sound, Restart */}
            <div className="flex items-center gap-3">
              <div
                className="flex items-center gap-1.5 text-xs font-mono font-bold px-2.5 py-1 rounded-lg"
                style={{ backgroundColor: THEME.bgMain, border: `1px solid ${THEME.borders}`, color: THEME.primaryText }}
              >
                <span>TIME:</span>
                <span style={{ color: THEME.primaryGreen }}>
                  {Math.floor(elapsedTime / 60).toString().padStart(2, "0")}:
                  {(elapsedTime % 60).toString().padStart(2, "0")}
                </span>
              </div>

              {/* Pause / Resume */}
              <button
                onClick={() => setIsPaused(!isPaused)}
                className="px-2.5 py-1 rounded-lg text-xs font-bold flex items-center gap-1 cursor-pointer transition"
                style={{
                  backgroundColor: isPaused ? "#FEF3C7" : THEME.bgMain,
                  color: isPaused ? "#B45309" : THEME.primaryText,
                  border: `1px solid ${isPaused ? THEME.warning : THEME.borders}`,
                }}
              >
                {isPaused ? <Play size={13} fill="currentColor" /> : <Pause size={13} fill="currentColor" />}
                <span>{isPaused ? "RESUME" : "PAUSE"}</span>
              </button>

              {/* Sound Toggle */}
              <button
                onClick={() => setIsSoundEnabled(!isSoundEnabled)}
                className="w-7 h-7 rounded-lg flex items-center justify-center cursor-pointer transition hover:bg-[#E5F5E9]"
                style={{ border: `1px solid ${THEME.borders}`, color: THEME.primaryText }}
                title="Toggle Sound"
              >
                {isSoundEnabled ? <Volume2 size={14} /> : <VolumeX size={14} />}
              </button>

              {/* Restart */}
              <button
                onClick={handleRestart}
                className="w-7 h-7 rounded-lg flex items-center justify-center cursor-pointer transition hover:bg-[#E5F5E9]"
                style={{ border: `1px solid ${THEME.borders}`, color: THEME.primaryText }}
                title="Restart Simulation"
              >
                <RotateCcw size={14} />
              </button>
            </div>
          </header>

          {/* ── MAIN BODY: 72% 3D SCENE + 28% LIGHT LEARNING NOTES ── */}
          <div className="flex-1 w-full flex overflow-hidden">
            {/* ── LEFT: 3D VIEWPORT (72%) ── */}
            <div className="w-[72%] h-full relative overflow-hidden" style={{ backgroundColor: THEME.bgMain }}>
              {/* Top Status Banner */}
              <div className="absolute top-2.5 left-3 z-20 pointer-events-none flex items-center gap-2">
                <div
                  className="px-3 py-1 rounded-xl text-[11px] font-bold flex items-center gap-1.5 shadow-sm"
                  style={{
                    backgroundColor: decisionPrompt ? "#FEF2F2" : THEME.softGreen,
                    color: decisionPrompt ? THEME.danger : THEME.primaryGreen,
                    border: `1px solid ${decisionPrompt ? THEME.danger : THEME.secondaryGreen}`,
                  }}
                >
                  {decisionPrompt ? (
                    <>
                      <AlertTriangle size={13} className="animate-bounce" />
                      <span>OBSTACLE DETECTED – CHOOSE DIRECTION</span>
                    </>
                  ) : (
                    <>
                      <Radio size={13} className="animate-pulse" />
                      <span>AUTOMATIC NAVIGATION ACTIVE</span>
                    </>
                  )}
                </div>

                <div
                  className="px-2.5 py-1 rounded-xl text-[11px] font-bold flex items-center gap-1.5 shadow-sm"
                  style={{ backgroundColor: THEME.cardBg, border: `1px solid ${THEME.borders}`, color: THEME.primaryText }}
                >
                  <CheckCircle2 size={13} style={{ color: THEME.primaryGreen }} />
                  <span>{completedChallenges}/3 Completed</span>
                </div>
              </div>

              {/* Compact Direction Selection Panel (Bottom Left) */}
              {decisionPrompt && decisionPrompt.isOpen && (
                <div className="absolute bottom-4 left-4 z-30 pointer-events-auto max-w-sm w-[320px] animate-in fade-in slide-in-from-bottom-2 duration-200">
                  <div
                    className="p-4 rounded-2xl shadow-xl flex flex-col gap-3"
                    style={{ backgroundColor: THEME.cardBg, border: `2px solid ${THEME.borders}` }}
                  >
                    {/* Header */}
                    <div className="flex items-center gap-2.5">
                      <div
                        className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0 shadow-xs"
                        style={{ backgroundColor: "#FEE2E2", color: THEME.danger }}
                      >
                        <AlertTriangle size={17} className="animate-pulse" />
                      </div>
                      <div>
                        <div className="text-[11px] font-black uppercase tracking-wider" style={{ color: THEME.danger }}>
                          OBSTACLE DETECTED!
                        </div>
                        <div className="text-xs font-bold" style={{ color: THEME.primaryText }}>
                          Which direction should I take?
                        </div>
                      </div>
                    </div>

                    {/* Rejection Alert Banner if player clicked a blocked path */}
                    {directionWarning && (
                      <div
                        className="px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-2 animate-in fade-in"
                        style={{ backgroundColor: "#FEE2E2", color: THEME.danger, border: `1px solid ${THEME.danger}` }}
                      >
                        <AlertCircle size={14} className="shrink-0" />
                        <span className="leading-tight">{directionWarning}</span>
                      </div>
                    )}

                    {/* Two Clearly Visible Direction Choice Buttons */}
                    <div className="grid grid-cols-2 gap-2.5 pt-1">
                      <button
                        onClick={() => handleSelectDirection("left")}
                        className="py-3 px-2 rounded-xl text-xs font-black tracking-wide flex items-center justify-center gap-1.5 cursor-pointer transition transform active:scale-95 shadow-sm hover:shadow"
                        style={{
                          backgroundColor: decisionPrompt.leftPassable ? THEME.softGreen : "#F1F5F9",
                          color: decisionPrompt.leftPassable ? THEME.primaryGreen : "#64748B",
                          border: `1.5px solid ${decisionPrompt.leftPassable ? THEME.primaryGreen : "#CBD5E1"}`,
                        }}
                        title={decisionPrompt.leftPassable ? "Clear left path" : "Left path restricted"}
                      >
                        <ArrowLeft size={16} />
                        <span>MOVE LEFT</span>
                      </button>

                      <button
                        onClick={() => handleSelectDirection("right")}
                        className="py-3 px-2 rounded-xl text-xs font-black tracking-wide flex items-center justify-center gap-1.5 cursor-pointer transition transform active:scale-95 shadow-sm hover:shadow"
                        style={{
                          backgroundColor: decisionPrompt.rightPassable ? THEME.softGreen : "#F1F5F9",
                          color: decisionPrompt.rightPassable ? THEME.primaryGreen : "#64748B",
                          border: `1.5px solid ${decisionPrompt.rightPassable ? THEME.primaryGreen : "#CBD5E1"}`,
                        }}
                        title={decisionPrompt.rightPassable ? "Clear right path" : "Right path restricted"}
                      >
                        <span>MOVE RIGHT</span>
                        <ArrowRight size={16} />
                      </button>
                    </div>

                    <div className="text-[10px] text-center" style={{ color: THEME.secondaryText }}>
                      Ultrasonic sensors measure clearances before allowing passage.
                    </div>
                  </div>
                </div>
              )}

              {/* 3D Canvas */}
              <Canvas shadows camera={{ position: [0, 24, 21], fov: 42 }} className="w-full h-full">
                <ambientLight intensity={0.9} />
                <directionalLight position={[15, 30, 20]} intensity={1.8} castShadow />
                <HybridNavigationEngine
                  key={resetKey}
                  safetyThreshold={safetyThreshold}
                  isPaused={isPaused}
                  chosenDirection={chosenDirection}
                  onClearChosenDirection={() => setChosenDirection(null)}
                  onUpdateState={(st) => {
                    setLiveReadings(st.readings);
                    setCurrentChallenge(st.currentChallenge);
                    setCompletedChallenges(st.completedChallenges);
                    setDecisionText(st.decisionText);
                    setDecisionReason(st.decisionReason);
                    setDecisionPrompt(st.decisionPrompt);
                  }}
                  onGoalReached={handleGoalReached}
                />
              </Canvas>
            </div>

            {/* ── RIGHT: DEDICATED LIGHT THEME LEARNING NOTES (28%) ── */}
            <div
              className="w-[28%] h-full p-3.5 flex flex-col justify-between overflow-y-auto"
              style={{ backgroundColor: THEME.cardBg, borderLeft: `1px solid ${THEME.borders}` }}
            >
              <div className="space-y-3">
                {/* Header */}
                <div className="flex items-center justify-between pb-2" style={{ borderBottom: `1px solid ${THEME.borders}` }}>
                  <div className="flex items-center gap-1.5 text-xs font-black uppercase tracking-wider" style={{ color: THEME.primaryGreen }}>
                    <BrainCircuit size={15} />
                    <span>Learning Notes</span>
                  </div>
                  <span className="text-[10px] font-bold" style={{ color: THEME.secondaryText }}>
                    Challenge {currentChallenge} of 3
                  </span>
                </div>

                {/* Live AI Decision Card */}
                <div
                  className="p-2.5 rounded-xl space-y-1 shadow-xs"
                  style={{
                    backgroundColor: decisionPrompt ? "#FEF2F2" : THEME.softGreen,
                    border: `1.5px solid ${decisionPrompt ? THEME.danger : THEME.secondaryGreen}`,
                  }}
                >
                  <div
                    className="flex items-center gap-1 text-[11px] font-black uppercase tracking-wide"
                    style={{ color: decisionPrompt ? THEME.danger : THEME.primaryGreen }}
                  >
                    <Eye size={12} className="animate-pulse" />
                    <span>{decisionPrompt ? "Decision Required:" : "Live Navigation Status:"}</span>
                  </div>
                  <p className="text-xs font-bold leading-snug" style={{ color: THEME.primaryText }}>
                    {decisionText}
                  </p>
                  <p className="text-[11px] leading-tight" style={{ color: THEME.secondaryText }}>
                    {decisionReason}
                  </p>
                </div>

                {/* 3 Live Sensor Meters */}
                <div className="grid grid-cols-3 gap-1.5">
                  <div
                    className="p-1.5 rounded-lg border text-center transition-colors"
                    style={{
                      backgroundColor: liveReadings.left.statusColor === "red" ? "#FEE2E2" : liveReadings.left.statusColor === "yellow" ? "#FEF9C3" : THEME.softGreen,
                      borderColor: liveReadings.left.statusColor === "red" ? THEME.danger : liveReadings.left.statusColor === "yellow" ? THEME.warning : THEME.secondaryGreen,
                      color: liveReadings.left.statusColor === "red" ? THEME.danger : liveReadings.left.statusColor === "yellow" ? "#92400E" : THEME.primaryGreen,
                    }}
                  >
                    <span className="text-[9px] block font-bold uppercase" style={{ color: THEME.secondaryText }}>
                      Left (-35°)
                    </span>
                    <span className="text-xs font-mono font-black">{liveReadings.left.distanceCm} cm</span>
                  </div>

                  <div
                    className="p-1.5 rounded-lg border text-center transition-colors"
                    style={{
                      backgroundColor: liveReadings.front.statusColor === "red" ? "#FEE2E2" : liveReadings.front.statusColor === "yellow" ? "#FEF9C3" : THEME.softGreen,
                      borderColor: liveReadings.front.statusColor === "red" ? THEME.danger : liveReadings.front.statusColor === "yellow" ? THEME.warning : THEME.secondaryGreen,
                      color: liveReadings.front.statusColor === "red" ? THEME.danger : liveReadings.front.statusColor === "yellow" ? "#92400E" : THEME.primaryGreen,
                    }}
                  >
                    <span className="text-[9px] block font-bold uppercase" style={{ color: THEME.secondaryText }}>
                      Front (0°)
                    </span>
                    <span className="text-sm font-mono font-black">{liveReadings.front.distanceCm} cm</span>
                  </div>

                  <div
                    className="p-1.5 rounded-lg border text-center transition-colors"
                    style={{
                      backgroundColor: liveReadings.right.statusColor === "red" ? "#FEE2E2" : liveReadings.right.statusColor === "yellow" ? "#FEF9C3" : THEME.softGreen,
                      borderColor: liveReadings.right.statusColor === "red" ? THEME.danger : liveReadings.right.statusColor === "yellow" ? THEME.warning : THEME.secondaryGreen,
                      color: liveReadings.right.statusColor === "red" ? THEME.danger : liveReadings.right.statusColor === "yellow" ? "#92400E" : THEME.primaryGreen,
                    }}
                  >
                    <span className="text-[9px] block font-bold uppercase" style={{ color: THEME.secondaryText }}>
                      Right (+35°)
                    </span>
                    <span className="text-xs font-mono font-black">{liveReadings.right.distanceCm} cm</span>
                  </div>
                </div>

                {/* Challenge Notes Card */}
                <div
                  className="p-3 rounded-xl space-y-1.5"
                  style={{ backgroundColor: THEME.bgMain, border: `1px solid ${THEME.borders}` }}
                >
                  <div className="flex items-center gap-1.5 text-xs font-black" style={{ color: THEME.primaryGreen }}>
                    <Info size={14} />
                    <span>
                      {currentChallenge === 1
                        ? "Understanding the Front Sensor"
                        : currentChallenge === 2
                        ? "Understanding Side Sensors"
                        : "Automatic Obstacle Avoidance"}
                    </span>
                  </div>

                  <ul className="text-[11px] space-y-1 list-disc pl-4 leading-relaxed" style={{ color: THEME.primaryText }}>
                    {currentChallenge === 1 && (
                      <>
                        <li>The front ultrasonic sensor sends sound waves forward.</li>
                        <li>Waves bounce off the obstacle and return as echoes.</li>
                        <li>The sensor calculates obstacle distance from echo time.</li>
                        <li>The car slows and calculates safe passage corridors.</li>
                      </>
                    )}
                    {currentChallenge === 2 && (
                      <>
                        <li>The left sensor monitors obstacles on the left side.</li>
                        <li>The right sensor monitors obstacles on the right side.</li>
                        <li>The vehicle calculates usable road clearance on both sides.</li>
                        <li>It steers smoothly through the center corridor.</li>
                      </>
                    )}
                    {currentChallenge === 3 && (
                      <>
                        <li>Three sensors continuously evaluate surrounding clearances.</li>
                        <li>The car navigates through tight turns and barricades.</li>
                        <li>Safe directions are permitted; unsafe paths are rejected.</li>
                        <li>Car safely reaches the Cricket Stadium destination.</li>
                      </>
                    )}
                  </ul>
                </div>

                {/* Distance Formula Card */}
                <div
                  className="p-2.5 rounded-xl space-y-1"
                  style={{ backgroundColor: THEME.softGreen, border: `1px solid ${THEME.secondaryGreen}` }}
                >
                  <div className="text-[10px] font-black uppercase" style={{ color: THEME.primaryGreen }}>
                    Ultrasonic Distance Formula:
                  </div>
                  <div
                    className="text-xs font-mono font-bold text-center py-1 rounded shadow-2xs"
                    style={{ backgroundColor: THEME.cardBg, color: THEME.primaryGreen, border: `1px solid ${THEME.borders}` }}
                  >
                    Distance = (Speed of Sound &times; Echo Time) / 2
                  </div>
                  <p className="text-[10px] leading-tight" style={{ color: THEME.secondaryText }}>
                    Sound waves travel forward and bounce back. Total time is divided by 2 to determine the true obstacle distance.
                  </p>
                </div>
              </div>

              {/* Bottom: Safety Distance Threshold Slider */}
              <div className="pt-2 space-y-1" style={{ borderTop: `1px solid ${THEME.borders}` }}>
                <div className="flex items-center justify-between text-xs font-bold" style={{ color: THEME.primaryText }}>
                  <span className="flex items-center gap-1" style={{ color: THEME.primaryGreen }}>
                    <Sliders size={13} />
                    <span>Safety Threshold</span>
                  </span>
                  <span className="font-mono font-extrabold text-xs" style={{ color: THEME.primaryGreen }}>
                    {safetyThreshold} cm
                  </span>
                </div>
                <input
                  type="range"
                  min="10"
                  max="35"
                  step="5"
                  value={safetyThreshold}
                  onChange={(e) => {
                    setSafetyThreshold(Number(e.target.value));
                    playSound(playPop);
                  }}
                  className="w-full accent-[#269B68] h-2 bg-[#D5E8DA] rounded-lg cursor-pointer"
                />
                <span className="text-[10px] block" style={{ color: THEME.secondaryText }}>
                  Obstacles closer than {safetyThreshold}cm trigger safety intervention.
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ═════════════════════════════════════════════════════════════════════ */}
      {/* SCREEN 3: RESULTS SCREEN (LIGHT THEME)                                */}
      {/* ═════════════════════════════════════════════════════════════════════ */}
      {screen === "results" && (
        <div
          className="flex-1 w-full h-full flex flex-col items-center justify-center p-4 sm:p-8 relative z-20"
          style={{ backgroundColor: THEME.bgMain }}
        >
          <Confetti width={width} height={height} recycle={false} numberOfPieces={350} />

          <div
            className="max-w-xl w-full rounded-3xl p-6 sm:p-8 shadow-xl flex flex-col items-center text-center gap-5 animate-in fade-in"
            style={{ backgroundColor: THEME.cardBg, border: `2px solid ${THEME.secondaryGreen}` }}
          >
            {/* Trophy Icon */}
            <div
              className="w-16 h-16 rounded-2xl flex items-center justify-center shadow-md"
              style={{ backgroundColor: THEME.softGreen, color: THEME.primaryGreen, border: `1px solid ${THEME.secondaryGreen}` }}
            >
              <Trophy size={36} />
            </div>

            <div>
              <span
                className="px-3 py-1 rounded-full text-xs font-black uppercase tracking-widest"
                style={{ backgroundColor: THEME.softGreen, color: THEME.primaryGreen, border: `1px solid ${THEME.secondaryGreen}` }}
              >
                Simulation Complete
              </span>
              <h2 className="text-2xl sm:text-3xl font-black mt-2" style={{ color: THEME.primaryText }}>
                ARRIVED AT CRICKET STADIUM!
              </h2>
              <p className="text-xs sm:text-sm mt-1" style={{ color: THEME.secondaryText }}>
                The autonomous blue car safely navigated through all 3 challenges using ultrasonic echolocation and clearance calculations!
              </p>
            </div>

            {/* Stars */}
            <div className="flex items-center gap-1.5 text-2xl" style={{ color: THEME.warning }}>
              <span>★</span>
              <span>★</span>
              <span>★</span>
              <span className="text-xs font-bold ml-2" style={{ color: THEME.primaryGreen }}>
                Master Autonomous Navigator (100% Safe)
              </span>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 w-full">
              <div
                className="rounded-2xl p-3 flex flex-col items-center"
                style={{ backgroundColor: THEME.bgMain, border: `1px solid ${THEME.borders}` }}
              >
                <span className="text-[11px] font-bold" style={{ color: THEME.secondaryText }}>Total Time</span>
                <span className="text-lg font-mono font-black" style={{ color: THEME.primaryGreen }}>
                  {elapsedTime}s
                </span>
              </div>
              <div
                className="rounded-2xl p-3 flex flex-col items-center"
                style={{ backgroundColor: THEME.bgMain, border: `1px solid ${THEME.borders}` }}
              >
                <span className="text-[11px] font-bold" style={{ color: THEME.secondaryText }}>Collisions</span>
                <span className="text-lg font-mono font-black" style={{ color: THEME.primaryGreen }}>
                  0
                </span>
              </div>
              <div
                className="rounded-2xl p-3 flex flex-col items-center"
                style={{ backgroundColor: THEME.bgMain, border: `1px solid ${THEME.borders}` }}
              >
                <span className="text-[11px] font-bold" style={{ color: THEME.secondaryText }}>Challenges</span>
                <span className="text-lg font-mono font-black" style={{ color: THEME.primaryGreen }}>
                  3 / 3
                </span>
              </div>
              <div
                className="rounded-2xl p-3 flex flex-col items-center"
                style={{ backgroundColor: THEME.bgMain, border: `1px solid ${THEME.borders}` }}
              >
                <span className="text-[11px] font-bold" style={{ color: THEME.secondaryText }}>Score</span>
                <span className="text-lg font-mono font-black" style={{ color: THEME.primaryGreen }}>
                  {finalScore}
                </span>
              </div>
            </div>

            {/* Summary */}
            <div
              className="rounded-2xl p-3.5 text-left text-xs space-y-1 w-full"
              style={{ backgroundColor: THEME.softGreen, border: `1px solid ${THEME.secondaryGreen}` }}
            >
              <div className="flex items-center gap-1.5 font-bold" style={{ color: THEME.primaryGreen }}>
                <Sparkles size={14} />
                <span>How Ultrasonic Clearance Avoidance Works:</span>
              </div>
              <p className="text-[11px] leading-relaxed" style={{ color: THEME.primaryText }}>
                By measuring ultrasonic echo return times, the vehicle calculates precise clearance margins. When an obstacle is detected ahead, the navigation engine determines which side offers sufficient corridor width for the vehicle footprint and steers safely through without collisions.
              </p>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-3 w-full">
              <button
                onClick={handleRestart}
                className="flex-1 py-3.5 rounded-2xl text-white font-black text-sm tracking-wider uppercase shadow-lg flex items-center justify-center gap-2 cursor-pointer transition transform active:scale-98"
                style={{ backgroundColor: THEME.primaryGreen }}
              >
                <RotateCcw size={16} />
                <span>PLAY AGAIN</span>
              </button>

              <Link
                href="/labs"
                className="px-5 py-3.5 rounded-2xl font-black text-xs uppercase tracking-wider transition cursor-pointer flex items-center gap-1.5 hover:bg-[#E5F5E9]"
                style={{ backgroundColor: THEME.bgMain, border: `1px solid ${THEME.borders}`, color: THEME.primaryText }}
              >
                <span>Back to Labs</span>
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
