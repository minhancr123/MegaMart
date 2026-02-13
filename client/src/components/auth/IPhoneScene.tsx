'use client';

import { Suspense, useRef, useLayoutEffect } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import {
    OrbitControls,
    Environment,
    Float,
    ContactShadows,
    Preload,
    useGLTF
} from '@react-three/drei';
import * as THREE from 'three';

function Model(props: any) {
    // Load the GLTF model from the public directory
    const { nodes, materials } = useGLTF('/models/iphone/scene.gltf') as any;

    // Sửa lỗi màn hình bị ngược (mirrored)
    useLayoutEffect(() => {
        // Logo nằm ở material 'Wallpaper' chứ không phải 'Screen_Glass'
        const targetMaterial = materials['Wallpaper'];
        if (targetMaterial?.map) {
            targetMaterial.map.flipY = false;

            // Sửa lỗi ngược chiều ngang (mirrored text)
            targetMaterial.map.wrapT = THREE.RepeatWrapping;
            targetMaterial.map.repeat.y = -1;
            targetMaterial.map.offset.y = 0.1;
            targetMaterial.map.colorSpace = THREE.SRGBColorSpace;
            targetMaterial.map.needsUpdate = true;
        }

        targetMaterial.color.setRGB(1.3, 1.3, 1.3);
    }, [materials]);

    // GỢI Ý: Để thay đổi Logo hoặc Hình nền màn hình, anh/chị có thể:
    // 1. Thay thế file ảnh tại: public/models/iphone/textures/Wallpaper_baseColor.jpeg
    // 2. Hoặc ghi đè texture ở đây bằng useTexture từ @react-three/drei

    return (
        <group {...props} dispose={null}>
            <group rotation={[-Math.PI / 2, 0, 0]}>
                <group rotation={[Math.PI / 2, 0, 0]} scale={0.01}>
                    <group scale={100}>
                        <mesh
                            castShadow
                            receiveShadow
                            geometry={nodes.Body_Mic_0.geometry}
                            material={materials.material}
                        />
                        <mesh
                            castShadow
                            receiveShadow
                            geometry={nodes.Body_Bezel_0.geometry}
                            material={materials.Bezel}
                        />
                        <mesh
                            castShadow
                            receiveShadow
                            geometry={nodes.Body_Body_0.geometry}
                            material={materials.Body}
                        />
                        <mesh
                            castShadow
                            receiveShadow
                            geometry={nodes.Body_Wallpaper_0.geometry}
                            material={materials.Wallpaper}
                        />
                        <mesh
                            castShadow
                            receiveShadow
                            geometry={nodes['Body_Camera_Glass_0'].geometry}
                            material={materials['Camera_Glass']}
                        />
                        <mesh
                            castShadow
                            receiveShadow
                            geometry={nodes.Body_Lens_0.geometry}
                            material={materials.Lens}
                        />
                        <mesh
                            castShadow
                            receiveShadow
                            geometry={nodes.Body_Material_0.geometry}
                            material={materials.Material}
                        />
                        <mesh
                            castShadow
                            receiveShadow
                            geometry={nodes.Camera_Body_0.geometry}
                            material={materials.Body}
                        />
                        <mesh
                            castShadow
                            receiveShadow
                            geometry={nodes.Camera_Glass_0.geometry}
                            material={materials.Glass}
                        />
                        <mesh
                            castShadow
                            receiveShadow
                            geometry={nodes['Camera_Camera_Frame001_0'].geometry}
                            material={materials['Camera_Frame.001']}
                        />
                        <mesh
                            castShadow
                            receiveShadow
                            geometry={nodes.Camera_Mic_0.geometry}
                            material={materials.material}
                        />
                        <mesh
                            castShadow
                            receiveShadow
                            geometry={nodes['Body001_Screen_Glass_0'].geometry}
                            material={materials['Screen_Glass']}
                        />
                        <mesh
                            castShadow
                            receiveShadow
                            geometry={nodes.Button_Frame_0.geometry}
                            material={materials.Frame}
                        />
                        <mesh
                            castShadow
                            receiveShadow
                            geometry={nodes['Circle003_Frame_0'].geometry}
                            material={materials.Frame}
                        />
                        <mesh
                            castShadow
                            receiveShadow
                            geometry={nodes['Apple_Logo_Logo_0'].geometry}
                            material={materials.Logo}
                        />
                        <mesh
                            castShadow
                            receiveShadow
                            geometry={nodes['Camera001_Body_0'].geometry}
                            material={materials.Body}
                        />
                        <mesh
                            castShadow
                            receiveShadow
                            geometry={nodes['Camera001_Gray_Glass_0'].geometry}
                            material={materials['Gray_Glass']}
                        />
                        <mesh
                            castShadow
                            receiveShadow
                            geometry={nodes['Camera001_Flash_0'].geometry}
                            material={materials.Flash}
                        />
                        <mesh
                            castShadow
                            receiveShadow
                            geometry={nodes['Camera001_Port_0'].geometry}
                            material={materials.Port}
                        />
                        <mesh
                            castShadow
                            receiveShadow
                            geometry={nodes['Camera001_Camera_Frame_0'].geometry}
                            material={materials['Camera_Frame']}
                        />
                        <mesh
                            castShadow
                            receiveShadow
                            geometry={nodes['Camera001_Camera_Glass_0'].geometry}
                            material={materials['Camera_Glass']}
                        />
                        <mesh
                            castShadow
                            receiveShadow
                            geometry={nodes['Camera001_Lens_0'].geometry}
                            material={materials.Lens}
                        />
                        <mesh
                            castShadow
                            receiveShadow
                            geometry={nodes['Camera001_Black_Glass_0'].geometry}
                            material={materials['Black_Glass']}
                        />
                        <mesh
                            castShadow
                            receiveShadow
                            geometry={nodes['Camera003_Material002_0'].geometry}
                            material={materials['Material.002']}
                        />
                    </group>
                </group>
            </group>
        </group>
    );
}

// Preload the model to avoid loading jank
useGLTF.preload('/models/iphone/scene.gltf');

function Scene() {
    return (
        <group position={[0, -0.5, 0]}>
            {/* Lighting */}
            <ambientLight intensity={0.5} />
            <spotLight position={[10, 10, 10]} angle={0.15} penumbra={1} intensity={1} castShadow />
            <pointLight position={[-10, -10, -10]} intensity={0.5} />

            {/* Floating Animation */}
            <Float
                speed={2} // Animation speed
                rotationIntensity={1} // Rotation intensity
                floatIntensity={0.5} // Float height intensity
                floatingRange={[-0.1, 0.1]} // Range of y-axis values
            >
                {/* 3D Model */}
                <Model scale={5} />
            </Float>

            {/* Environment */}
            <Environment preset="city" />

            {/* Shadows */}
            <ContactShadows
                position={[0, -1.8, 0]}
                opacity={0.4}
                scale={10}
                blur={2.5}
                far={4}
            />
        </group>
    );
}

function Loader() {
    return (
        <div className="absolute inset-0 flex items-center justify-center bg-transparent">
            <div className="flex flex-col items-center gap-4">
                <div className="w-12 h-12 border-4 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin" />
                <span className="text-white/60 text-sm font-medium">Loading 3D Scene...</span>
            </div>
        </div>
    );
}

export default function IPhoneScene({ onInteractionChange }: { onInteractionChange?: (interacting: boolean) => void }) {
    const controlsRef = useRef<any>(null);
    
    const handleInteractionStart = () => {
        onInteractionChange?.(true);
    };
    
    const handleInteractionEnd = () => {
        onInteractionChange?.(false);
    };
    
    return (
        <div className="w-full h-full relative">
            <Suspense fallback={<Loader />}>
                <Canvas
                    shadows
                    camera={{ position: [0, 0, 8], fov: 45 }}
                    gl={{ preserveDrawingBuffer: true, antialias: true }}
                    dpr={[1, 2]} // Optimize pixel ratio
                >
                    <Scene />
                    <OrbitControls
                        ref={controlsRef}
                        enableZoom={true}
                        enablePan={false}
                        autoRotate
                        autoRotateSpeed={1}
                        minPolarAngle={Math.PI / 2.5}
                        maxPolarAngle={Math.PI / 1.5}
                        minDistance={5}
                        maxDistance={12}
                        onStart={handleInteractionStart}
                        onEnd={handleInteractionEnd}
                    />
                    <Preload all />
                </Canvas>
            </Suspense>
        </div>
    );
}

// Preload the GLTF model
useGLTF.preload('/models/iphone/scene.gltf');