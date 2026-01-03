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

        // --- Lighting (Prompt Specific) ---
        // 1. Hemisphere
        const hemiLight = new THREE.HemisphereLight(0xB8D4E8, 0x6B5844, 0.4);
        scene.add(hemiLight);

        // 2. Key Light (Directional)
        const keyLight = new THREE.DirectionalLight(0xFFF8E7, 1.2);
        keyLight.position.set(5, 8, 5);
        keyLight.castShadow = true;
        keyLight.shadow.mapSize.width = 2048;
        keyLight.shadow.mapSize.height = 2048;
        keyLight.shadow.bias = -0.0001;
        scene.add(keyLight);

        // 3. Rim Light (Cool)
        const rimLight = new THREE.DirectionalLight(0xC4D9F2, 0.5);
        rimLight.position.set(-3, 2, -5);
        scene.add(rimLight);

        // 4. Ambient Occlusion (Simulated via AmbientLight for simplicity in ThreeJS basic)
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.2);
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

                // 2. Tail Movement (Wave)
                parts.tail.forEach((seg, i) => {
                    // Propagate wave
                    const wave = Math.sin(time * 2 - i * 0.5) * 0.1;
                    seg.rotation.z = 0.3 + wave * (i * 0.1); // Base curl + wave
                    
                    // Tip twitch
                    if(i === parts.tail.length - 1) {
                         seg.rotation.y = Math.sin(time * 15) * 0.1;
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
            containerRef.current.removeChild(renderer.domElement);
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

    return (
        <>
            <div ref={containerRef} style={{ width: '100%', height: '100%' }} />
            <div className={`loading-overlay ${isLoaded ? 'hidden' : ''}`}>
                <h2>Generating Procedural Cat...</h2>
            </div>
        </>
    );
};

const root = createRoot(document.getElementById('root'));
root.render(<App />);