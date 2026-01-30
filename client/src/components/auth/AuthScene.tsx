'use client'

import { Canvas, useFrame } from '@react-three/fiber'
import { Environment, Float, PerspectiveCamera, ContactShadows, RoundedBox, Sparkles, Torus, Cylinder, useTexture, MeshTransmissionMaterial } from '@react-three/drei'
import { Suspense, useRef } from 'react'
import * as THREE from 'three'

function Smartphone(props: any) {
    return (
        <group {...props}>
            {/* Frame */}
            <RoundedBox args={[1.4, 2.8, 0.15]} radius={0.1} smoothness={4}>
                <meshStandardMaterial color="#334155" roughness={0.1} metalness={0.9} />
            </RoundedBox>

            {/* Screen (Glass) */}
            <mesh position={[0, 0, 0.08]}>
                <planeGeometry args={[1.3, 2.7]} />
                <meshPhysicalMaterial
                    color="#000"
                    roughness={0.2}
                    metalness={0.8}
                    clearcoat={1}
                    clearcoatRoughness={0.1}
                />
            </mesh>

            {/* Screen Content Glow */}
            <mesh position={[0, 0.5, 0.081]}>
                <planeGeometry args={[1.0, 1.2]} />
                <meshBasicMaterial color="#4f46e5" transparent opacity={0.1} />
            </mesh>

            {/* Camera Island */}
            <group position={[0.4, 1.0, -0.05]}>
                <RoundedBox args={[0.5, 0.6, 0.05]} radius={0.05} smoothness={2}>
                    <meshStandardMaterial color="#1e293b" roughness={0.2} metalness={0.8} />
                </RoundedBox>
                {/* Lenses */}
                <mesh position={[-0.1, 0.15, 0.03]}>
                    <cylinderGeometry args={[0.08, 0.08, 0.05, 32]} />
                    <meshStandardMaterial color="#000" />
                    <mesh position={[0, 0.03, 0]}>
                        <cylinderGeometry args={[0.06, 0.06, 0.01, 32]} />
                        <meshStandardMaterial color="#10b981" emissive="#10b981" emissiveIntensity={0.5} />
                    </mesh>
                </mesh>
                <mesh position={[0.1, -0.15, 0.03]}>
                    <cylinderGeometry args={[0.08, 0.08, 0.05, 32]} />
                    <meshStandardMaterial color="#000" />
                </mesh>
            </group>
        </group>
    )
}

function Headphones(props: any) {
    return (
        <group {...props}>
            {/* Headband */}
            <Torus args={[1, 0.1, 16, 64, Math.PI * 1.2]} rotation={[0, 0, -Math.PI * 0.6]}>
                <meshStandardMaterial color="#f8fafc" roughness={0.3} metalness={0.2} />
            </Torus>

            {/* Ear Cups */}
            <group position={[-0.9, -0.5, 0]}>
                <mesh rotation={[0, Math.PI / 2, 0]}>
                    <cylinderGeometry args={[0.4, 0.4, 0.3, 32]} />
                    <meshStandardMaterial color="#f8fafc" roughness={0.3} />
                </mesh>
                <mesh rotation={[0, Math.PI / 2, 0]} position={[0.1, 0, 0]}>
                    <cylinderGeometry args={[0.35, 0.35, 0.1, 32]} />
                    <meshStandardMaterial color="#94a3b8" />
                </mesh>
            </group>

            <group position={[0.9, -0.5, 0]}>
                <mesh rotation={[0, Math.PI / 2, 0]}>
                    <cylinderGeometry args={[0.4, 0.4, 0.3, 32]} />
                    <meshStandardMaterial color="#f8fafc" roughness={0.3} />
                </mesh>
                <mesh rotation={[0, Math.PI / 2, 0]} position={[-0.1, 0, 0]}>
                    <cylinderGeometry args={[0.35, 0.35, 0.1, 32]} />
                    <meshStandardMaterial color="#94a3b8" />
                </mesh>
            </group>
        </group>
    )
}

function CosmeticBottle(props: any) {
    return (
        <group {...props}>
            {/* Liquid inside */}
            <mesh position={[0, -0.1, 0]}>
                <cylinderGeometry args={[0.32, 0.32, 1.1, 32]} />
                <meshStandardMaterial color="#f472b6" />
            </mesh>
            {/* Glass Container */}
            <mesh position={[0, 0, 0]}>
                <cylinderGeometry args={[0.35, 0.35, 1.4, 32]} />
                <MeshTransmissionMaterial
                    backside
                    samples={4}
                    thickness={0.2}
                    chromaticAberration={0.05}
                    anisotropy={0.1}
                    distortion={0.1}
                    distortionScale={0.1}
                    temporalDistortion={0.1}
                    color="#fff"
                />
            </mesh>
            {/* Cap */}
            <mesh position={[0, 0.85, 0]}>
                <cylinderGeometry args={[0.35, 0.35, 0.3, 32]} />
                <meshStandardMaterial color="#e2e8f0" metalness={0.8} roughness={0.2} />
            </mesh>
        </group>
    )
}

function SneakerBox(props: any) {
    return (
        <group {...props}>
            <RoundedBox args={[2.2, 1.2, 1.4]} radius={0.05} smoothness={2}>
                <meshStandardMaterial color="#ea580c" />
            </RoundedBox>
            {/* Lid line */}
            <mesh position={[0, 0.2, 0.71]}>
                <planeGeometry args={[2.2, 0.02]} />
                <meshStandardMaterial color="#000" opacity={0.2} transparent />
            </mesh>
            {/* Brand Logo Placeholder */}
            <mesh position={[0, 0.1, 0.71]}>
                <planeGeometry args={[0.8, 0.3]} />
                <meshStandardMaterial color="#fff" />
            </mesh>
        </group>
    )
}

function SceneContent() {
    const groupRef = useRef<THREE.Group>(null);

    useFrame((state) => {
        if (groupRef.current) {
            groupRef.current.rotation.y = state.clock.getElapsedTime() * 0.05;
        }
    })

    return (
        <group ref={groupRef}>
            {/* Main Floating Products */}
            <Float speed={2} rotationIntensity={0.5} floatIntensity={1} floatingRange={[-0.2, 0.2]}>
                <Smartphone position={[-1.5, 1, 0.5]} rotation={[0, 0.3, 0.1]} />
            </Float>

            <Float speed={2.5} rotationIntensity={0.4} floatIntensity={0.8} floatingRange={[-0.3, 0.3]}>
                <Headphones position={[1.5, 1.5, -0.5]} rotation={[0.4, -0.4, 0]} scale={0.8} />
            </Float>

            <Float speed={1.5} rotationIntensity={0.6} floatIntensity={1.2} floatingRange={[-0.2, 0.2]}>
                <SneakerBox position={[1.2, -1.2, 0.5]} rotation={[0, -0.5, 0]} scale={0.9} />
            </Float>

            <Float speed={3} rotationIntensity={0.7} floatIntensity={0.5} floatingRange={[-0.1, 0.1]}>
                <CosmeticBottle position={[-1.2, -1.5, -0.5]} rotation={[0, 0, 0.2]} />
            </Float>

            {/* Abstract decorative elements */}
            <Float speed={1} rotationIntensity={1} floatIntensity={1}>
                <mesh position={[2.5, -0.5, -2]}>
                    <dodecahedronGeometry args={[0.6]} />
                    <meshStandardMaterial color="#fbbf24" metalness={0.9} roughness={0.1} />
                </mesh>
            </Float>

            <Float speed={1.2} rotationIntensity={1.5} floatIntensity={1.5}>
                <mesh position={[-2.5, 0.5, -1]}>
                    <octahedronGeometry args={[0.5]} />
                    <meshStandardMaterial color="#6366f1" metalness={0.5} roughness={0.2} />
                </mesh>
            </Float>

            <Sparkles count={80} scale={10} size={3} speed={0.4} opacity={0.5} color="#fff" />
            <ContactShadows position={[0, -3.5, 0]} opacity={0.4} scale={20} blur={2.5} far={4} />
        </group>
    )
}

export default function AuthScene() {
    return (
        <div className="absolute inset-0 w-full h-full -z-10 bg-slate-950">
            <Canvas dpr={[1, 2]} gl={{ antialias: true }}>
                <PerspectiveCamera makeDefault position={[0, 0, 8]} fov={40} />
                <Suspense fallback={null}>
                    <Environment preset="studio" />
                    <ambientLight intensity={0.5} />
                    <spotLight position={[10, 10, 10]} angle={0.15} penumbra={1} intensity={1} castShadow />
                    <pointLight position={[-10, -5, -10]} intensity={0.5} color="#4f46e5" />
                    <SceneContent />
                </Suspense>
            </Canvas>
        </div>
    )
}
