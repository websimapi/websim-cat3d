import React, { useEffect, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import * as THREE from 'three';
import { createCatModel } from './cat-builder.js';
import { SceneManager } from './scene-manager.js';
import { CatBehavior } from './cat-behavior.js';

const App = () => {
    const containerRef = useRef(null);
    const [isLoaded, setIsLoaded] = useState(false);

    useEffect(() => {
        if (!containerRef.current) return;

        // Init Scene
        const sceneManager = new SceneManager(containerRef.current);
        // // Removed scene setup code - Moved to scene-manager.js

        // Init Cat
        const catData = createCatModel();
        sceneManager.add(catData.mesh);
        sceneManager.setFollowTarget(catData.mesh);
        setIsLoaded(true);

        const catBehavior = new CatBehavior(catData);
        // // Removed updateCatPose - Moved to cat-behavior.js

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
                const target = new THREE.Vector3();
                raycaster.ray.intersectPlane(planeIntersect, target);
                
                if (target) {
                    catBehavior.setTarget(target);
                }
            }
        };

        window.addEventListener('pointerdown', onPointerDown);
        window.addEventListener('pointerup', onPointerUp);

        // Animation Loop
        const animate = () => {
            requestAnimationFrame(animate);
            // // Removed state machine and anim logic - Moved to cat-behavior.js
            catBehavior.update(0.016);
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
            React.createElement("h2", null, "Generating Procedural Cat...")
        )
    );
};

const root = createRoot(document.getElementById('root'));
root.render(React.createElement(App));