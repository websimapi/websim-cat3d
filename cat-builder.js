import * as THREE from 'three';
import { generateFurTextures, generateEyeTexture } from './textures.js';

export function createCatModel() {
    const catGroup = new THREE.Group();
    
    // Materials
    const { colorTexture, normalTexture } = generateFurTextures();
    
    const furMaterial = new THREE.MeshStandardMaterial({
        map: colorTexture,
        normalMap: normalTexture,
        normalScale: new THREE.Vector2(1.5, 1.5),
        color: 0xffffff,
        roughness: 0.85,
        metalness: 0.05,
    });

    const skinMaterial = new THREE.MeshStandardMaterial({
        color: 0xFDB5A3, // Pinkish
        roughness: 0.5,
    });

    const eyeMap = generateEyeTexture();
    const eyeMaterial = new THREE.MeshPhysicalMaterial({
        map: eyeMap,
        color: 0xffffff,
        roughness: 0.1,
        metalness: 0.0,
        clearcoat: 1.0,
        clearcoatRoughness: 0.1,
        transmission: 0.0,
    });

    // --- ANATOMY CONSTRUCTION (Sitting Pose) ---
    // The cat is constructed from bottom up to ensure ground contact

    // 1. Hips / Lower Body (The base)
    const hipsGeo = new THREE.SphereGeometry(0.65, 32, 32);
    hipsGeo.scale(1, 0.85, 1.15); // Wide base
    const hips = new THREE.Mesh(hipsGeo, furMaterial);
    hips.position.set(0, 0.55, 0); // Sitting on ground
    hips.castShadow = true;
    hips.receiveShadow = true;
    catGroup.add(hips);

    // 2. Chest / Upper Body
    const chestGeo = new THREE.SphereGeometry(0.62, 32, 32);
    chestGeo.scale(1, 0.95, 0.85);
    const chest = new THREE.Mesh(chestGeo, furMaterial);
    chest.position.set(0, 1.45, 0.3); // Up and forward
    chest.castShadow = true;
    chest.receiveShadow = true;
    catGroup.add(chest);

    // Spine/Belly (Connecting Hips and Chest)
    const spineGeo = new THREE.CylinderGeometry(0.6, 0.63, 1.1, 24);
    const spine = new THREE.Mesh(spineGeo, furMaterial);
    // Align spine between hips and chest
    const spinePos = new THREE.Vector3().lerpVectors(hips.position, chest.position, 0.5);
    spine.position.copy(spinePos);
    spine.lookAt(chest.position);
    spine.rotateX(Math.PI/2); 
    spine.castShadow = true;
    catGroup.add(spine);

    // 3. Neck
    const neckGeo = new THREE.CylinderGeometry(0.38, 0.5, 0.6, 24);
    const neck = new THREE.Mesh(neckGeo, furMaterial);
    neck.position.set(0, 1.9, 0.35); 
    neck.rotation.x = 0.15;
    catGroup.add(neck);

    // 4. Head Group
    const headGroup = new THREE.Group();
    headGroup.position.set(0, 2.25, 0.45);
    catGroup.add(headGroup);

    // Cranium
    const skullGeo = new THREE.SphereGeometry(0.48, 32, 32);
    skullGeo.scale(1.15, 1, 1); // Wider cheeks
    const skull = new THREE.Mesh(skullGeo, furMaterial);
    skull.castShadow = true;
    headGroup.add(skull);

    // Muzzle/Snout
    const muzzleGroup = new THREE.Group();
    muzzleGroup.position.set(0, -0.15, 0.35);
    headGroup.add(muzzleGroup);

    // Muzzle main volume
    const muzzleGeo = new THREE.SphereGeometry(0.22, 24, 24);
    muzzleGeo.scale(1, 0.8, 1.1);
    const muzzle = new THREE.Mesh(muzzleGeo, furMaterial);
    muzzleGroup.add(muzzle);

    // Cheek puffs (Whisker pads)
    const cheekGeo = new THREE.SphereGeometry(0.14, 16, 16);
    const leftCheek = new THREE.Mesh(cheekGeo, furMaterial);
    leftCheek.position.set(0.14, -0.05, 0.15);
    muzzleGroup.add(leftCheek);

    const rightCheek = new THREE.Mesh(cheekGeo, furMaterial);
    rightCheek.position.set(-0.14, -0.05, 0.15);
    muzzleGroup.add(rightCheek);

    // Jaw/Chin
    const jawGeo = new THREE.SphereGeometry(0.1, 16, 16);
    const jaw = new THREE.Mesh(jawGeo, furMaterial);
    jaw.position.set(0, -0.2, 0.1);
    muzzleGroup.add(jaw);

    // Nose (Pink tip)
    const nose = new THREE.Mesh(new THREE.ConeGeometry(0.06, 0.05, 3), skinMaterial);
    nose.rotation.x = Math.PI/2;
    nose.rotation.z = Math.PI;
    nose.position.set(0, 0.05, 0.35); // On tip of muzzle
    muzzleGroup.add(nose);

    // Ears
    const earGeo = new THREE.ConeGeometry(0.18, 0.4, 32);
    earGeo.scale(1, 1, 0.25); // Flattened
    
    const leftEarGroup = new THREE.Group();
    leftEarGroup.position.set(0.3, 0.35, 0);
    leftEarGroup.rotation.set(-0.1, 0, -0.5);
    const leftEar = new THREE.Mesh(earGeo, furMaterial);
    leftEar.position.y = 0.2; // Pivot offset
    leftEarGroup.add(leftEar);
    headGroup.add(leftEarGroup);
    
    const rightEarGroup = new THREE.Group();
    rightEarGroup.position.set(-0.3, 0.35, 0);
    rightEarGroup.rotation.set(-0.1, 0, 0.5);
    const rightEar = new THREE.Mesh(earGeo, furMaterial);
    rightEar.position.y = 0.2;
    rightEarGroup.add(rightEar);
    headGroup.add(rightEarGroup);

    // Eyes
    const eyeGeo = new THREE.SphereGeometry(0.11, 24, 24);
    eyeGeo.rotateY(-Math.PI / 2); // Orient texture
    
    const leftEye = new THREE.Mesh(eyeGeo, eyeMaterial);
    leftEye.position.set(0.2, 0.08, 0.38);
    leftEye.rotation.set(0, -0.15, 0);
    
    const rightEye = new THREE.Mesh(eyeGeo, eyeMaterial);
    rightEye.position.set(-0.2, 0.08, 0.38);
    rightEye.rotation.set(0, 0.15, 0);

    // Eyelids
    const eyelidGeo = new THREE.SphereGeometry(0.12, 24, 24, 0, Math.PI * 2, 0, Math.PI/2);
    const leftEyelid = new THREE.Mesh(eyelidGeo, furMaterial);
    leftEyelid.position.copy(leftEye.position);
    leftEyelid.rotation.x = -Math.PI / 3; 
    
    const rightEyelid = new THREE.Mesh(eyelidGeo, furMaterial);
    rightEyelid.position.copy(rightEye.position);
    rightEyelid.rotation.x = -Math.PI / 3;

    headGroup.add(leftEye, rightEye, leftEyelid, rightEyelid);


    // 5. Front Legs
    // Shoulders (embedded in chest)
    const shoulderGeo = new THREE.SphereGeometry(0.35, 16, 16);
    shoulderGeo.scale(0.8, 1, 0.8);
    
    const leftShoulder = new THREE.Mesh(shoulderGeo, furMaterial);
    leftShoulder.position.set(0.4, 1.3, 0.5);
    catGroup.add(leftShoulder);

    const rightShoulder = new THREE.Mesh(shoulderGeo, furMaterial);
    rightShoulder.position.set(-0.4, 1.3, 0.5);
    catGroup.add(rightShoulder);

    // Legs
    const legGeo = new THREE.CylinderGeometry(0.13, 0.11, 1.3, 16);
    
    const leftLeg = new THREE.Mesh(legGeo, furMaterial);
    leftLeg.position.set(0.4, 0.65, 0.55);
    leftLeg.castShadow = true;
    catGroup.add(leftLeg);

    const rightLeg = new THREE.Mesh(legGeo, furMaterial);
    rightLeg.position.set(-0.4, 0.65, 0.55);
    rightLeg.castShadow = true;
    catGroup.add(rightLeg);

    // Paws (Front)
    const pawGeo = new THREE.SphereGeometry(0.16, 16, 16);
    pawGeo.scale(1.1, 0.6, 1.3);
    
    const flPaw = new THREE.Mesh(pawGeo, furMaterial);
    flPaw.position.set(0, -0.65, 0.05);
    leftLeg.add(flPaw);
    
    const frPaw = new THREE.Mesh(pawGeo, furMaterial);
    frPaw.position.set(0, -0.65, 0.05);
    rightLeg.add(frPaw);


    // 6. Hind Legs (Sitting Haunches)
    const thighGeo = new THREE.SphereGeometry(0.55, 32, 32);
    thighGeo.scale(0.8, 1.3, 1.1); // Vertical oval shape
    
    const leftThigh = new THREE.Mesh(thighGeo, furMaterial);
    leftThigh.position.set(0.6, 0.6, -0.1); // Side of hips
    leftThigh.rotation.set(0, 0.2, -0.2);
    leftThigh.castShadow = true;
    catGroup.add(leftThigh);

    const rightThigh = new THREE.Mesh(thighGeo, furMaterial);
    rightThigh.position.set(-0.6, 0.6, -0.1);
    rightThigh.rotation.set(0, -0.2, 0.2);
    rightThigh.castShadow = true;
    catGroup.add(rightThigh);

    // Hind Paws (Peeking out front)
    const hindPawGeo = new THREE.SphereGeometry(0.16, 16, 16);
    hindPawGeo.scale(1.1, 0.6, 1.3);

    const leftHindPaw = new THREE.Mesh(hindPawGeo, furMaterial);
    leftHindPaw.position.set(0.65, 0.1, 0.55); // Near front leg
    catGroup.add(leftHindPaw);

    const rightHindPaw = new THREE.Mesh(hindPawGeo, furMaterial);
    rightHindPaw.position.set(-0.65, 0.1, 0.55);
    catGroup.add(rightHindPaw);


    // 7. Tail
    const tailBones = [];
    let parent = catGroup;
    let prevPos = new THREE.Vector3(0, 0.15, -0.6); // Base of tail at bottom of hips
    
    for(let i=0; i<9; i++) {
        const radius = 0.14 - (i * 0.012);
        const length = 0.35;
        const tailSegGeo = new THREE.CylinderGeometry(radius, radius * 0.9, length, 12);
        tailSegGeo.translate(0, length/2, 0); // Pivot at base
        
        const seg = new THREE.Mesh(tailSegGeo, furMaterial);
        
        if(i === 0) {
            seg.position.copy(prevPos);
            seg.rotation.x = Math.PI/2; // Out back
            seg.rotation.y = Math.PI/2; // Wrap side
        } else {
            seg.position.set(0, length * 0.9, 0); // Stack
            seg.rotation.z = 0.35; // Curve around
        }
        
        parent.add(seg);
        parent = seg;
        tailBones.push(seg);
    }

    // Return parts for animation
    return {
        mesh: catGroup,
        parts: {
            head: headGroup,
            leftEar: leftEarGroup,
            rightEar: rightEarGroup,
            leftEyelid,
            rightEyelid,
            body: chest, // Breathe on chest
            tail: tailBones
        }
    };
}