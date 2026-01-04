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

        // --- Interaction ---
        const raycaster = new THREE.Raycaster();
        const mouse = new THREE.Vector2();
        const planeIntersect = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0); // Floor plane
        
        let targetPosition = new THREE.Vector3();
        let isMoving = false;
        let catState = 'SITTING'; // SITTING, STAND_UP, WALKING, SIT_DOWN
        let standFactor = 0; // 0 = Sit, 1 = Stand
        let walkCycle = 0;

        // Input Handling
        let pointerDownTime = 0;
        let pointerDownPos = new THREE.Vector2();

        const onPointerDown = (e) => {
            pointerDownTime = performance.now();
            pointerDownPos.set(e.clientX, e.clientY);
        };

        const onPointerUp = (e) => {
            const duration = performance.now() - pointerDownTime;
            const dist = pointerDownPos.distanceTo(new THREE.Vector2(e.clientX, e.clientY));
            
            // Short tap/click with minimal drag
            if (duration < 300 && dist < 10) {
                // Calculate click on floor
                mouse.x = (e.clientX / window.innerWidth) * 2 - 1;
                mouse.y = -(e.clientY / window.innerHeight) * 2 + 1;
                
                raycaster.setFromCamera(mouse, camera);
                const intersects = [];
                // Raycast against the invisible mathematical plane
                const target = new THREE.Vector3();
                raycaster.ray.intersectPlane(planeIntersect, target);
                
                if (target) {
                    targetPosition.copy(target);
                    // Don't go off the rendered floor visual
                    targetPosition.x = Math.max(-24, Math.min(24, targetPosition.x));
                    targetPosition.z = Math.max(-24, Math.min(24, targetPosition.z));
                    
                    if (catState === 'SITTING' || catState === 'SIT_DOWN') {
                        catState = 'STAND_UP';
                    } else if (catState === 'WALKING' || catState === 'STAND_UP') {
                        // Just update target, keep state
                        catState = 'WALKING';
                    }
                }
            }
        };

        window.addEventListener('pointerdown', onPointerDown);
        window.addEventListener('pointerup', onPointerUp);

        // --- Animation State ---
        let time = 0;
        let blinkTimer = 0;
        let nextBlinkTime = 4 + Math.random() * 4;
        let earTwitchTimer = 0;
        let nextEarTwitch = 2;
        
        // --- Helper: Procedural Pose Update ---
        const updateCatPose = (parts, factor, walkTime) => {
            // factor: 0 = Sit, 1 = Stand
            
            // 1. Hips Height
            // Sit: 0.55, Stand: 1.15
            parts.hips.position.y = THREE.MathUtils.lerp(0.55, 1.15, factor);
            
            // 2. Chest Adjustment
            // Sit: 1.45, Stand: 1.35 (Shoulders dip slightly when walking)
            parts.chest.position.y = THREE.MathUtils.lerp(1.45, 1.35, factor);
            // Chest moves forward relative to hips when standing
            parts.chest.position.z = THREE.MathUtils.lerp(0.3, 0.4, factor);

            // 3. Belly Stretch
            // Calculate midpoint and scale
            const hipPos = parts.hips.position.clone();
            const chestPos = parts.chest.position.clone();
            const dist = hipPos.distanceTo(chestPos);
            
            parts.belly.position.copy(hipPos).lerp(chestPos, 0.5);
            parts.belly.lookAt(chestPos);
            parts.belly.scale.set(1.05, 0.95, dist * 0.9); // Stretch Z axis

            // 4. Head follow
            parts.head.position.y = parts.chest.position.y + 0.8;
            parts.head.position.z = parts.chest.position.z + 0.15;
            parts.neck.position.y = parts.chest.position.y + 0.45;
            parts.neck.position.z = parts.chest.position.z + 0.05;

            // 5. Hind Legs Articulation
            // Sync pivot Y with hips (hips move up/down)
            // Pivot is child of scene, so we need to move it to match hip height
            parts.hindLeftLeg.position.y = parts.hips.position.y + 0.1;
            parts.hindRightLeg.position.y = parts.hips.position.y + 0.1;

            // Define Angles
            // Sit: Thighs Fwd (1.0), Knee Folded (-2.3), Ankle Folded (1.3)
            // Stand: Thighs Vertical (-0.2), Knee Straight (0.4), Ankle Straight (-0.4)
            
            const hipRot = THREE.MathUtils.lerp(1.2, -0.2, factor);
            const kneeRot = THREE.MathUtils.lerp(-2.4, 0.6, factor);
            const ankleRot = THREE.MathUtils.lerp(1.5, -0.5, factor);

            // Apply Base Rotation
            parts.hindLeftLeg.rotation.x = hipRot;
            parts.hindRightLeg.rotation.x = hipRot;

            parts.leftShinGroup.rotation.x = kneeRot;
            parts.rightShinGroup.rotation.x = kneeRot;
            
            parts.leftAnkleGroup.rotation.x = ankleRot;
            parts.rightAnkleGroup.rotation.x = ankleRot;

            // 7. Walk Cycle (Only if factor > 0.5)
            if (factor > 0.1) {
                const amp = 0.5 * factor; 
                const freq = walkTime * 10;
                
                // Front Legs (Swing - Standard pendulum)
                parts.frontLeftLeg.rotation.x = Math.sin(freq) * amp;
                parts.frontRightLeg.rotation.x = Math.sin(freq + Math.PI) * amp;
                
                // Hind Legs (Complex Swing)
                // We mainly rotate the Hip, but can add subtle knee motion
                const lHipOsc = Math.sin(freq + Math.PI) * amp;
                const rHipOsc = Math.sin(freq) * amp;
                
                parts.hindLeftLeg.rotation.x = hipRot + lHipOsc;
                parts.hindRightLeg.rotation.x = hipRot + rHipOsc;
                
                // Knee flexion during swing (lift leg)
                // When hip is moving forward (swing phase), knee bends more
                const lKneeOsc = Math.max(0, Math.sin(freq + Math.PI)) * 0.5;
                const rKneeOsc = Math.max(0, Math.sin(freq)) * 0.5;
                
                parts.leftShinGroup.rotation.x = kneeRot + lKneeOsc; // Bend more
                parts.rightShinGroup.rotation.x = kneeRot + rKneeOsc;

                // Bob Body
                parts.hips.position.y += Math.abs(Math.sin(freq * 2)) * 0.03 * factor;
                parts.chest.position.y += Math.sin(freq * 2) * 0.02 * factor;
            } else {
                 // Reset
                parts.frontLeftLeg.rotation.x = THREE.MathUtils.lerp(parts.frontLeftLeg.rotation.x, 0, 0.1);
                parts.frontRightLeg.rotation.x = THREE.MathUtils.lerp(parts.frontRightLeg.rotation.x, 0, 0.1);
            }
        };

        // --- Render Loop ---
        const animate = () => {
            requestAnimationFrame(animate);
            time += 0.016; // Approx 60fps delta

            if (catData && catData.parts) {
                const parts = catData.parts;

                // --- State Machine ---
                const moveSpeed = 4.0 * 0.016;
                const turnSpeed = 5.0 * 0.016;

                // Distance to target
                const currentPos = catData.mesh.position;
                const distToTarget = new THREE.Vector2(currentPos.x, currentPos.z).distanceTo(new THREE.Vector2(targetPosition.x, targetPosition.z));
                const stopDist = 0.5;

                switch(catState) {
                    case 'SITTING':
                        standFactor = THREE.MathUtils.lerp(standFactor, 0, 0.1);
                        break;

                    case 'STAND_UP':
                        standFactor += 0.05;
                        if (standFactor >= 1) {
                            standFactor = 1;
                            catState = 'WALKING';
                        }
                        break;

                    case 'WALKING':
                        standFactor = 1;
                        walkCycle += 0.016;
                        
                        // Move
                        if (distToTarget > stopDist) {
                            // Turn towards target
                            const dx = targetPosition.x - currentPos.x;
                            const dz = targetPosition.z - currentPos.z;
                            const targetAngle = Math.atan2(dx, dz);
                            
                            // Smooth rotation
                            let angleDiff = targetAngle - catData.mesh.rotation.y;
                            // Normalize angle -PI to PI
                            while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
                            while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;
                            
                            catData.mesh.rotation.y += angleDiff * 0.1;
                            
                            // Move forward
                            catData.mesh.translateZ(moveSpeed);
                        } else {
                            catState = 'SIT_DOWN';
                        }
                        break;

                    case 'SIT_DOWN':
                        standFactor -= 0.05;
                        if (standFactor <= 0) {
                            standFactor = 0;
                            catState = 'SITTING';
                            walkCycle = 0;
                        }
                        break;
                }

                updateCatPose(parts, standFactor, walkCycle);


                // 1. Breathing (Overlay on chest)
                const breathFactor = 1 + Math.sin(time * 4) * 0.02; 
                parts.chest.scale.set(1 * breathFactor, 0.95, 0.85); // Preserving original scale logic

                // 2. Tail Movement
                parts.tail.forEach((seg, i) => {
                    if (seg.userData.baseRot) {
                        // Uncurl tail when walking
                        // BaseRot logic: 
                        // i=0: (-2.6, -0.5, -0.5) [Tucked]
                        // If standing, we want tail up/out: (-1.0, 0, 0)
                        
                        const sitRot = seg.userData.baseRot;
                        // Procedural straighten for standing
                        let standRotX = sitRot.x;
                        if (i === 0) standRotX = -1.0; // Lift base
                        else standRotX = 0.1; // Straightish
                        
                        const effectiveBaseX = THREE.MathUtils.lerp(sitRot.x, standRotX, standFactor);
                        const effectiveBaseY = THREE.MathUtils.lerp(sitRot.y, 0, standFactor * 0.8);
                        const effectiveBaseZ = THREE.MathUtils.lerp(sitRot.z, 0, standFactor * 0.8);

                        // Wave anim
                        const waveSpeed = 2;
                        const waveOffset = i * 0.3;
                        const waveAmp = 0.06;
                        const waveZ = Math.sin(time * waveSpeed - waveOffset) * waveAmp;
                        
                        seg.rotation.x = effectiveBaseX;
                        seg.rotation.y = effectiveBaseY;
                        seg.rotation.z = effectiveBaseZ + waveZ;
                        
                        // Tip twitch
                        if(i === parts.tail.length - 1) {
                            seg.rotation.y += Math.sin(time * 10) * 0.15;
                        }
                    }
                });

                // 3. Blinking
                blinkTimer += 0.016;
                if (blinkTimer > nextBlinkTime) {
                    const blinkPhase = (blinkTimer - nextBlinkTime) / 0.2; 
                    if (blinkPhase < 0.5) {
                        parts.leftEyelid.rotation.x = THREE.MathUtils.lerp(-Math.PI/4, 0, blinkPhase * 2);
                        parts.rightEyelid.rotation.x = THREE.MathUtils.lerp(-Math.PI/4, 0, blinkPhase * 2);
                    } else if (blinkPhase < 1.0) {
                        parts.leftEyelid.rotation.x = THREE.MathUtils.lerp(0, -Math.PI/4, (blinkPhase - 0.5) * 2);
                        parts.rightEyelid.rotation.x = THREE.MathUtils.lerp(0, -Math.PI/4, (blinkPhase - 0.5) * 2);
                    } else {
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
                        const ear = Math.random() > 0.5 ? parts.leftEar : parts.rightEar;
                        const origRot = ear === parts.leftEar ? -0.4 : 0.4;
                        ear.rotation.z = origRot + Math.sin(phase * Math.PI) * 0.2;
                    } else {
                        earTwitchTimer = 0;
                        nextEarTwitch = 2 + Math.random() * 3;
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
            window.removeEventListener('pointerdown', onPointerDown);
            window.removeEventListener('pointerup', onPointerUp);
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