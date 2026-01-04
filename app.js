import React, { useEffect, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import { createCatModel } from './cat-builder.js';

const App = () => {
    const containerRef = useRef(null);
    const [isLoaded, setIsLoaded] = useState(false);

    useEffect(() => {
        if (!containerRef.current) return;

        // --- Scene Setup ---
        const scene = new THREE.Scene();
        // Background gradient simulation
        scene.background = new THREE.Color('#D8E5F0');
        scene.fog = new THREE.FogExp2(0xD8E5F0, 0.02);

        // --- Camera ---
        const camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 100);
        camera.position.set(4, 3, 5); // 3/4 view
        camera.lookAt(0, 1, 0);

        // --- Renderer ---
        const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
        renderer.setSize(window.innerWidth, window.innerHeight);
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        renderer.shadowMap.enabled = true;
        renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        renderer.physicallyCorrectLights = true; // Essential for PBR accuracy
        renderer.outputEncoding = THREE.sRGBEncoding;
        renderer.toneMapping = THREE.ACESFilmicToneMapping;
        renderer.toneMappingExposure = 1.0;
        containerRef.current.appendChild(renderer.domElement);

        // --- Lighting (Refined) ---
        // 1. Hemisphere - Warmer ground, clearer sky
        const hemiLight = new THREE.HemisphereLight(0xffffff, 0x443322, 0.6);
        scene.add(hemiLight);

        // 2. Key Light (Sunlight)
        const keyLight = new THREE.DirectionalLight(0xFFF5E0, 1.1);
        keyLight.position.set(5, 8, 6);
        keyLight.castShadow = true;
        keyLight.shadow.mapSize.width = 2048;
        keyLight.shadow.mapSize.height = 2048;
        keyLight.shadow.bias = -0.0005;
        scene.add(keyLight);

        // 3. Fill Light (Soft)
        const fillLight = new THREE.DirectionalLight(0xE8DBC5, 0.4);
        fillLight.position.set(-4, 2, 2);
        scene.add(fillLight);

        // 4. Rim Light (Backlight for fur edge)
        const rimLight = new THREE.DirectionalLight(0xFFFFFF, 0.4);
        rimLight.position.set(0, 4, -5);
        scene.add(rimLight);

        // 5. Soft Ambient
        const ambientLight = new THREE.AmbientLight(0x404040, 0.5);
        scene.add(ambientLight);

        // --- Floor ---
        const planeGeo = new THREE.PlaneGeometry(50, 50);
        const planeMat = new THREE.MeshStandardMaterial({ 
            color: 0xD5D0C8, 
            roughness: 1, 
            metalness: 0 
        });
        const plane = new THREE.Mesh(planeGeo, planeMat);
        plane.rotation.x = -Math.PI / 2;
        plane.receiveShadow = true;
        scene.add(plane);

        // --- Construct Cat ---
        const catData = createCatModel();
        scene.add(catData.mesh);
        
        setIsLoaded(true);

        // --- Controls ---
        const controls = new OrbitControls(camera, renderer.domElement);
        controls.enableDamping = true;
        controls.dampingFactor = 0.05;
        controls.maxPolarAngle = Math.PI / 2 - 0.05; // Don't go below ground
        controls.target.set(0, 1, 0);

        // --- Animation State ---
        let time = 0;
        let blinkTimer = 0;
        let nextBlinkTime = 4 + Math.random() * 4;
        let earTwitchTimer = 0;
        let nextEarTwitch = 2;
        
        // --- Render Loop ---
        const animate = () => {
            requestAnimationFrame(animate);
            time += 0.016; // Approx 60fps delta

            if (catData && catData.parts) {
                const parts = catData.parts;

                // 1. Breathing
                // Scale chest slightly
                const breathFactor = 1 + Math.sin(time * 4) * 0.02; // 1.5 sec cycle approx
                parts.body.scale.set(1 * breathFactor, 1, 1 * breathFactor);

                // 2. Tail Movement (Wave) & Ground Collision
                // Update parent world matrices to ensure accurate chain positioning
                catData.mesh.updateMatrixWorld();

                parts.tail.forEach((seg, i) => {
                    if (seg.userData.baseRot) {
                        // --- A. Procedural Animation ---
                        const waveSpeed = 2;
                        const waveOffset = i * 0.3;
                        const waveAmp = 0.06;
                        
                        const waveZ = Math.sin(time * waveSpeed - waveOffset) * waveAmp;
                        const waveX = Math.cos(time * waveSpeed * 0.5 - waveOffset) * (waveAmp * 0.5);
                        
                        seg.rotation.z = seg.userData.baseRot.z + waveZ;
                        seg.rotation.x = seg.userData.baseRot.x + waveX;
                        
                        if(i === parts.tail.length - 1) {
                            seg.rotation.y = seg.userData.baseRot.y + Math.sin(time * 10) * 0.15;
                        } else {
                            seg.rotation.y = seg.userData.baseRot.y;
                        }

                        // --- B. Ground Collision Check ---
                        // Update this segment's world matrix to check its proposed position
                        seg.updateMatrixWorld();

                        const segLen = seg.userData.length || 0.15;
                        const segRad = seg.userData.radius || 0.05;
                        
                        // Check tip position in world space
                        const tipLocal = new THREE.Vector3(0, segLen, 0);
                        const tipWorld = tipLocal.applyMatrix4(seg.matrixWorld);

                        const groundLevel = 0;
                        const clearance = segRad; 

                        if (tipWorld.y < groundLevel + clearance) {
                            // Calculate penetration depth
                            const penetration = (groundLevel + clearance) - tipWorld.y;
                            
                            // Calculate correction angle to lift tip
                            // sin(angle) = penetration / hypotenuse(length)
                            const sinVal = Math.min(1.0, penetration / segLen);
                            const correctionAngle = Math.asin(sinVal);

                            // Determine rotation axis: Perpendicular to Segment Vector and World Up
                            const baseWorld = new THREE.Vector3().setFromMatrixPosition(seg.matrixWorld);
                            const segVec = new THREE.Vector3().subVectors(tipWorld, baseWorld).normalize();
                            const upVec = new THREE.Vector3(0, 1, 0);
                            
                            const axis = new THREE.Vector3().crossVectors(segVec, upVec).normalize();
                            
                            // Safety check for degenerate axis (vertical segment)
                            if (axis.lengthSq() < 0.01) axis.set(1, 0, 0);

                            // Apply correction (rotate quaternion in world space)
                            seg.rotateOnWorldAxis(axis, correctionAngle);
                            
                            // Update matrix so children inherit corrected transform
                            seg.updateMatrixWorld();
                        }
                    }
                });

                // 3. Blinking
                blinkTimer += 0.016;
                if (blinkTimer > nextBlinkTime) {
                    // Blink animation
                    const blinkPhase = (blinkTimer - nextBlinkTime) / 0.2; // 0.2 sec duration
                    if (blinkPhase < 0.5) {
                        // Close (Rotate eyelids down)
                        parts.leftEyelid.rotation.x = THREE.MathUtils.lerp(-Math.PI/4, 0, blinkPhase * 2);
                        parts.rightEyelid.rotation.x = THREE.MathUtils.lerp(-Math.PI/4, 0, blinkPhase * 2);
                    } else if (blinkPhase < 1.0) {
                        // Open
                        parts.leftEyelid.rotation.x = THREE.MathUtils.lerp(0, -Math.PI/4, (blinkPhase - 0.5) * 2);
                        parts.rightEyelid.rotation.x = THREE.MathUtils.lerp(0, -Math.PI/4, (blinkPhase - 0.5) * 2);
                    } else {
                        // Reset
                        blinkTimer = 0;
                        nextBlinkTime = 4 + Math.random() * 4;
                        parts.leftEyelid.rotation.x = -Math.PI/4;
                        parts.rightEyelid.rotation.x = -Math.PI/4;
                    }
                }

                // 4. Ear Twitch
                earTwitchTimer += 0.016;
                if(earTwitchTimer > nextEarTwitch) {
                    const twitchDur = 0.15;
                    const phase = (earTwitchTimer - nextEarTwitch) / twitchDur;
                    
                    if(phase < 1.0) {
                        // Randomly pick an ear
                        const ear = Math.random() > 0.5 ? parts.leftEar : parts.rightEar;
                        const origRot = ear === parts.leftEar ? -0.4 : 0.4;
                        ear.rotation.z = origRot + Math.sin(phase * Math.PI) * 0.2;
                    } else {
                        earTwitchTimer = 0;
                        nextEarTwitch = 2 + Math.random() * 3;
                        // Reset to base
                        parts.leftEar.rotation.z = -0.4;
                        parts.rightEar.rotation.z = 0.4;
                    }
                }
            }

            controls.update();
            renderer.render(scene, camera);
        };

        animate();

        // Cleanup
        return () => {
            window.removeEventListener('resize', handleResize);
            if (containerRef.current && renderer.domElement) {
                containerRef.current.removeChild(renderer.domElement);
            }
            controls.dispose();
            renderer.dispose();
        };

        // Resize Handler
        function handleResize() {
            camera.aspect = window.innerWidth / window.innerHeight;
            camera.updateProjectionMatrix();
            renderer.setSize(window.innerWidth, window.innerHeight);
        }
        window.addEventListener('resize', handleResize);

    }, []);

    return React.createElement(React.Fragment, null,
        React.createElement("div", {
            ref: containerRef,
            style: { width: '100%', height: '100%' }
        }),
        React.createElement("div", {
            className: `loading-overlay ${isLoaded ? 'hidden' : ''}`
        },
            React.createElement("h2", null, "Generating Procedural Cat...")
        )
    );
};

const root = createRoot(document.getElementById('root'));
root.render(React.createElement(App));