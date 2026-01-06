import React, { useEffect, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import * as THREE from 'three';
import { createCatModel } from './cat-builder.js';
import { SceneManager } from './scene-manager.js';
import { CatBehavior } from './cat-behavior.js';

const App = () => {
    const containerRef = useRef(null);
    const [isLoaded, setIsLoaded] = useState(false);
    const [gameState, setGameState] = useState('TITLE'); // TITLE, PLAYING

    useEffect(() => {
        if (!containerRef.current) return;

        // Init Scene
        const sceneManager = new SceneManager(containerRef.current);
        const cats = [];
        let activeCatIndex = -1;

        // --- Cat Generation Helpers ---
        const colors = [
            { base: '#C9B8A8', stripe: '#8B7D6B' }, // Tabby
            { base: '#333333', stripe: '#000000' }, // Black
            { base: '#FFFFFF', stripe: '#DDDDDD' }, // White
            { base: '#D2691E', stripe: '#8B4513' }, // Ginger
            { base: '#808080', stripe: '#404040' }, // Grey
        ];
        
        const eyeHues = [40, 120, 200, 30]; // Gold, Green, Blue, Amber

        const spawnCat = (pos) => {
            const color = colors[Math.floor(Math.random() * colors.length)];
            const hue = eyeHues[Math.floor(Math.random() * eyeHues.length)];
            
            const catData = createCatModel({
                baseColor: color.base,
                stripeColor: color.stripe,
                eyeHue: hue
            });
            
            catData.mesh.position.copy(pos);
            // Random rotation
            catData.mesh.rotation.y = Math.random() * Math.PI * 2;
            
            sceneManager.add(catData.mesh);
            const behavior = new CatBehavior(catData);
            
            return {
                mesh: catData.mesh,
                behavior: behavior,
                parts: catData.parts
            };
        };

        // --- Title Screen Setup ---
        // Spawn multiple cats
        for (let i = 0; i < 6; i++) {
            const angle = (i / 6) * Math.PI * 2;
            const r = 3 + Math.random() * 3;
            const x = Math.cos(angle) * r;
            const z = Math.sin(angle) * r;
            cats.push(spawnCat(new THREE.Vector3(x, 0, z)));
        }
        
        // Initial Camera for Title
        sceneManager.camera.position.set(0, 5, 10);
        sceneManager.controls.autoRotate = true;
        sceneManager.controls.autoRotateSpeed = 1.0;
        
        setIsLoaded(true);


        // Interaction
        const raycaster = new THREE.Raycaster();
        const mouse = new THREE.Vector2();
        const planeIntersect = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);

        let pointerDownTime = 0;
        let pointerDownPos = new THREE.Vector2();

        const onPointerDown = (e) => {
            pointerDownTime = performance.now();
            pointerDownPos.set(e.clientX, e.clientY);
        };

        const onPointerUp = (e) => {
            const duration = performance.now() - pointerDownTime;
            const dist = pointerDownPos.distanceTo(new THREE.Vector2(e.clientX, e.clientY));
            
            if (duration < 300 && dist < 10) {
                mouse.x = (e.clientX / window.innerWidth) * 2 - 1;
                mouse.y = -(e.clientY / window.innerHeight) * 2 + 1;
                raycaster.setFromCamera(mouse, sceneManager.camera);

                // If Title -> Select Cat and Start Game
                if (activeCatIndex === -1) {
                    const target = new THREE.Vector3();
                    raycaster.ray.intersectPlane(planeIntersect, target);
                    
                    if (target) {
                        // Find closest cat to the tap location
                        let closestIndex = -1;
                        let minDistance = Infinity;
                        
                        cats.forEach((cat, index) => {
                            const d = cat.mesh.position.distanceTo(target);
                            if (d < minDistance) {
                                minDistance = d;
                                closestIndex = index;
                            }
                        });
                        
                        if (closestIndex !== -1) {
                            startGame(closestIndex);
                        }
                    }
                    return;
                }

                // If Playing -> Move Cat
                const target = new THREE.Vector3();
                raycaster.ray.intersectPlane(planeIntersect, target);
                
                if (target && activeCatIndex !== -1) {
                    cats[activeCatIndex].behavior.setTarget(target);
                }
            }
        };
        
        const startGame = (index) => {
            activeCatIndex = index;
            const selectedCat = cats[index];
            
            // Setup Camera for Game
            sceneManager.setFollowTarget(selectedCat.mesh);
            sceneManager.controls.autoRotate = false;
            
            setGameState('PLAYING');
        };

        window.addEventListener('pointerdown', onPointerDown);
        window.addEventListener('pointerup', onPointerUp);

        // Animation Loop
        const animate = () => {
            requestAnimationFrame(animate);
            
            const dt = 0.016;

            // Behavior updates
            cats.forEach((cat, index) => {
                // NPC Logic: Random wandering for non-player cats
                if (activeCatIndex === -1 || index !== activeCatIndex) {
                    if (cat.behavior.state === 'SITTING' && Math.random() < 0.005) {
                        const angle = Math.random() * Math.PI * 2;
                        const r = 2 + Math.random() * 6;
                        const target = new THREE.Vector3(Math.cos(angle)*r, 0, Math.sin(angle)*r);
                        cat.behavior.setTarget(target);
                    }
                }
                cat.behavior.update(dt);
            });

            sceneManager.update();
        };

        animate();

        return () => {
            window.removeEventListener('pointerdown', onPointerDown);
            window.removeEventListener('pointerup', onPointerUp);
            sceneManager.dispose();
        };

    }, []);

    return React.createElement(React.Fragment, null,
        React.createElement("div", {
            ref: containerRef,
            style: { width: '100%', height: '100%' }
        }),
        React.createElement("div", {
            className: `loading-overlay ${isLoaded ? 'hidden' : ''}`
        },
            React.createElement("h2", null, "Generating Cats...")
        ),
        gameState === 'TITLE' && React.createElement("div", {
            className: "title-overlay",
            onClick: () => {} // Handled by global pointer listener
        },
            React.createElement("div", { className: "tap-to-start" }, "Tap to Start")
        )
    );
};

const root = createRoot(document.getElementById('root'));
root.render(React.createElement(App));