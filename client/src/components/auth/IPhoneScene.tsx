'use client';

import { useRef, Suspense, useMemo, useCallback, memo } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import {
    OrbitControls,
    Environment,
    Float,
    ContactShadows,
    RoundedBox,
    Preload
} from '@react-three/drei';
import * as THREE from 'three';

// Memoized iPhone Model for better performance
const IPhoneModel = memo(function IPhoneModel({ color = '#1a1a2e' }: { color?: string }) {
    const groupRef = useRef<THREE.Group>(null);
    const screenTexture = useMemo(() => createScreenTexture(), []);

    useFrame((state) => {
        if (groupRef.current) {
            groupRef.current.position.y = Math.sin(state.clock.elapsedTime * 0.5) * 0.08;
            groupRef.current.rotation.y += 0.002;
        }
    });

    return (
        <Float speed={1.5} rotationIntensity={0.2} floatIntensity={0.3}>
            <group ref={groupRef} scale={[1.1, 1.1, 1.1]}>
                {/* iPhone Body */}
                <RoundedBox args={[2.2, 4.5, 0.25]} radius={0.15} smoothness={4} castShadow receiveShadow>
                    <meshStandardMaterial
                        color={color}
                        metalness={0.8}
                        roughness={0.2}
                    />
                </RoundedBox>

                {/* Screen */}
                <RoundedBox args={[2, 4.2, 0.02]} radius={0.1} smoothness={4} position={[0, 0, 0.13]}>
                    <meshStandardMaterial color="#0f0f23" metalness={0} roughness={0.1} />
                </RoundedBox>

                {/* Screen Content */}
                <mesh position={[0, 0, 0.145]}>
                    <planeGeometry args={[1.9, 4.1]} />
                    <meshBasicMaterial map={screenTexture} />
                </mesh>

                {/* Dynamic Island */}
                <mesh position={[0, 1.85, 0.14]} rotation={[0, 0, Math.PI / 2]}>
                    <capsuleGeometry args={[0.05, 0.2, 4, 8]} />
                    <meshBasicMaterial color="#000000" />
                </mesh>

                {/* Camera Bump - Simplified */}
                <group position={[-0.55, 1.7, -0.13]}>
                    <RoundedBox args={[1, 1, 0.12]} radius={0.1} smoothness={2}>
                        <meshStandardMaterial color={color} metalness={0.8} roughness={0.2} />
                    </RoundedBox>
                    {[[-0.22, 0.22], [0.22, 0.22], [-0.22, -0.22]].map(([x, y], i) => (
                        <mesh key={i} position={[x, y, -0.07]} rotation={[Math.PI / 2, 0, 0]}>
                            <cylinderGeometry args={[0.15, 0.15, 0.06, 16]} />
                            <meshStandardMaterial color="#1a1a1a" metalness={0.7} roughness={0.3} />
                        </mesh>
                    ))}
                </group>

                {/* Side buttons - Simplified */}
                <mesh position={[-1.12, 0.75, 0]}>
                    <boxGeometry args={[0.04, 0.6, 0.04]} />
                    <meshStandardMaterial color={color} metalness={0.8} roughness={0.2} />
                </mesh>
                <mesh position={[1.12, 0.8, 0]}>
                    <boxGeometry args={[0.04, 0.45, 0.04]} />
                    <meshStandardMaterial color={color} metalness={0.8} roughness={0.2} />
                </mesh>
            </group>
        </Float>
    );
});

// Optimized screen texture
function createScreenTexture() {
    if (typeof document === 'undefined') return null;

    const canvas = document.createElement('canvas');
    canvas.width = 256; // Reduced for performance
    canvas.height = 512;
    const ctx = canvas.getContext('2d')!;

    // Gradient background
    const gradient = ctx.createLinearGradient(0, 0, 256, 512);
    gradient.addColorStop(0, '#667eea');
    gradient.addColorStop(0.5, '#764ba2');
    gradient.addColorStop(1, '#f093fb');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 256, 512);

    // Time
    ctx.fillStyle = 'white';
    ctx.font = 'bold 40px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('9:41', 128, 80);

    // App icons - simplified grid
    const colors = ['#ff6b6b', '#4ecdc4', '#45b7d1', '#96ceb4', '#ffeaa7', '#dfe6e9', '#6c5ce7', '#fd79a8'];
    const iconSize = 30;
    const startX = 30;
    const startY = 180;
    const gap = 48;

    for (let row = 0; row < 4; row++) {
        for (let col = 0; col < 4; col++) {
            ctx.fillStyle = colors[(row * 4 + col) % colors.length];
            ctx.beginPath();
            ctx.roundRect(startX + col * gap, startY + row * gap, iconSize, iconSize, 8);
            ctx.fill();
        }
    }

    // Dock
    ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
    ctx.beginPath();
    ctx.roundRect(20, 450, 216, 50, 15);
    ctx.fill();

    const texture = new THREE.CanvasTexture(canvas);
    texture.needsUpdate = true;
    return texture;
}

// Optimized particles - reduced count
const Particles = memo(function Particles({ count = 30 }) {
    const mesh = useRef<THREE.InstancedMesh>(null);
    const dummy = useMemo(() => new THREE.Object3D(), []);

    const particles = useMemo(() =>
        Array.from({ length: count }, () => ({
            position: [
                (Math.random() - 0.5) * 8,
                (Math.random() - 0.5) * 8,
                (Math.random() - 0.5) * 8
            ] as [number, number, number],
            speed: 0.008 + Math.random() * 0.015,
            factor: 0.5 + Math.random(),
            scale: 0.03 + Math.random() * 0.06
        })), [count]);

    useFrame((state) => {
        if (!mesh.current) return;

        particles.forEach((particle, i) => {
            const t = state.clock.elapsedTime * particle.speed;
            dummy.position.set(
                particle.position[0] + Math.sin(t * particle.factor) * 0.4,
                particle.position[1] + Math.cos(t * particle.factor) * 0.4,
                particle.position[2] + Math.sin(t * particle.factor) * 0.4
            );
            dummy.scale.setScalar(particle.scale);
            dummy.updateMatrix();
            mesh.current!.setMatrixAt(i, dummy.matrix);
        });
        mesh.current.instanceMatrix.needsUpdate = true;
    });

    return (
        <instancedMesh ref={mesh} args={[undefined, undefined, count]}>
            <sphereGeometry args={[1, 6, 6]} />
            <meshBasicMaterial color="#8b5cf6" transparent opacity={0.5} />
        </instancedMesh>
    );
});

// Simplified glass sphere
const GlassSphere = memo(function GlassSphere({ position }: { position: [number, number, number] }) {
    return (
        <Float speed={2} floatIntensity={0.4}>
            <mesh position={position}>
                <sphereGeometry args={[0.25, 16, 16]} />
                <meshStandardMaterial
                    color="#a78bfa"
                    transparent
                    opacity={0.6}
                    metalness={0.3}
                    roughness={0.1}
                />
            </mesh>
        </Float>
    );
});

// Simplified ring
const FloatingRing = memo(function FloatingRing({ position, rotation }: { position: [number, number, number], rotation: [number, number, number] }) {
    const ringRef = useRef<THREE.Mesh>(null);

    useFrame((state) => {
        if (ringRef.current) {
            ringRef.current.rotation.z = state.clock.elapsedTime * 0.2;
        }
    });

    return (
        <Float speed={1.5} floatIntensity={0.25}>
            <mesh ref={ringRef} position={position} rotation={rotation}>
                <torusGeometry args={[0.4, 0.08, 8, 24]} />
                <meshStandardMaterial color="#6366f1" metalness={0.8} roughness={0.2} />
            </mesh>
        </Float>
    );
});

// Optimized Scene
const Scene = memo(function Scene() {
    return (
        <>
            {/* Simplified Lighting */}
            <ambientLight intensity={0.5} />
            <directionalLight position={[5, 5, 5]} intensity={1.5} castShadow />
            <pointLight position={[-5, -5, 5]} intensity={0.8} color="#8b5cf6" />

            {/* Main iPhone */}
            <IPhoneModel color="#1e1e2e" />

            {/* Reduced decorative elements */}
            <GlassSphere position={[2.5, 1.2, -1]} />
            <GlassSphere position={[-2.5, -0.8, -1.5]} />

            <FloatingRing position={[-2, 1.8, -0.8]} rotation={[0.4, 0.3, 0]} />
            <FloatingRing position={[2.5, -1.2, 0]} rotation={[-0.3, 0.4, 0]} />

            {/* Reduced particles */}
            <Particles count={40} />

            {/* Contact shadows */}
            <ContactShadows
                position={[0, -2.8, 0]}
                opacity={0.3}
                scale={8}
                blur={2}
                far={3}
            />

            {/* Lighter environment - studio instead of city */}
            <Environment preset="studio" />

            {/* Controls */}
            <OrbitControls
                enableZoom={false}
                enablePan={false}
                minPolarAngle={Math.PI / 3}
                maxPolarAngle={Math.PI / 1.5}
                autoRotate
                autoRotateSpeed={0.3}
            />

            {/* Preload assets */}
            <Preload all />
        </>
    );
});

// Loading component
function Loader() {
    return (
        <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
            <div className="flex flex-col items-center gap-4">
                <div className="relative">
                    <div className="w-16 h-16 border-4 border-indigo-200/30 rounded-full" />
                    <div className="absolute inset-0 w-16 h-16 border-4 border-transparent border-t-indigo-500 rounded-full animate-spin" />
                </div>
                <span className="text-white/60 text-sm">Đang tải...</span>
            </div>
        </div>
    );
}

// Error boundary fallback
function ErrorFallback() {
    return (
        <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
            <div className="text-center text-white/60">
                <p>Không thể tải 3D scene</p>
                <p className="text-sm mt-2">Vui lòng thử lại sau</p>
            </div>
        </div>
    );
}

// Main exported component with performance optimizations
export default function IPhoneScene() {
    return (
        <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
            {/* Gradient overlays */}
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-purple-500/15 via-transparent to-transparent pointer-events-none" />
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_right,_var(--tw-gradient-stops))] from-indigo-500/15 via-transparent to-transparent pointer-events-none" />

            {/* 3D Canvas with performance settings */}
            <Suspense fallback={<Loader />}>
                <Canvas
                    shadows
                    camera={{ position: [0, 0, 7], fov: 45 }}
                    gl={{
                        antialias: true,
                        alpha: true,
                        powerPreference: 'high-performance',
                        stencil: false,
                        depth: true,
                    }}
                    dpr={[1, 1.5]} // Limit DPR for performance
                    performance={{ min: 0.5 }}
                    frameloop="demand" // Only render when needed
                >
                    <Scene />
                </Canvas>
            </Suspense>

            {/* Simplified gradient orbs - CSS only, no JS animation */}
            <div className="absolute top-16 right-16 w-64 h-64 bg-purple-500/20 rounded-full filter blur-3xl animate-pulse pointer-events-none" />
            <div className="absolute bottom-16 left-16 w-80 h-80 bg-indigo-500/15 rounded-full filter blur-3xl animate-pulse pointer-events-none" style={{ animationDelay: '1s' }} />
        </div>
    );
}
