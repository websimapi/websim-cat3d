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

    // Belly (Connecting Hips and Chest seamlessly)
    // We use a sphere to bridge the gap and smooth the transition, replacing the rigid cylinder
    const bellyGeo = new THREE.SphereGeometry(0.64, 32, 32);
    bellyGeo.scale(1.05, 0.95, 1.1);
    const belly = new THREE.Mesh(bellyGeo, furMaterial);
    
    // Position belly to blend hips and chest
    const bellyPos = new THREE.Vector3().lerpVectors(hips.position, chest.position, 0.45);
    bellyPos.z -= 0.05; // Slightly back to smooth the front curve
    belly.position.copy(bellyPos);
    belly.castShadow = true;
    catGroup.add(belly);

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
    const shoulderGeo = new THREE.SphereGeometry(0.32, 16, 16);
    shoulderGeo.scale(0.9, 1, 1.1); // Slightly elongated back
    
    const leftShoulder = new THREE.Mesh(shoulderGeo, furMaterial);
    leftShoulder.position.set(0.35, 1.3, 0.4); // Moved Back and In
    catGroup.add(leftShoulder);

    const rightShoulder = new THREE.Mesh(shoulderGeo, furMaterial);
    rightShoulder.position.set(-0.35, 1.3, 0.4);
    catGroup.add(rightShoulder);

    // Legs - Tapered (Thinner)
    const legGeo = new THREE.CylinderGeometry(0.14, 0.10, 1.3, 16);
    
    // Helper to create detailed paws
    const createPaw = () => {
        const pawGroup = new THREE.Group();
        // Main pad
        const palmGeo = new THREE.SphereGeometry(0.14, 16, 16);
        palmGeo.scale(1.1, 0.55, 1.2);
        const palm = new THREE.Mesh(palmGeo, furMaterial);
        palm.position.z = 0.05; // Offset to put pivot at wrist
        pawGroup.add(palm);
        
        // Toes
        const toeGeo = new THREE.SphereGeometry(0.065, 12, 12);
        const toeOffsets = [-0.09, -0.03, 0.03, 0.09];
        const toeZOffsets = [0.16, 0.19, 0.19, 0.16];
        
        for(let i=0; i<4; i++) {
            const toe = new THREE.Mesh(toeGeo, furMaterial);
            toe.position.set(toeOffsets[i], -0.02, toeZOffsets[i]);
            toe.scale.set(1, 0.7, 1);
            palm.add(toe); // Parent to palm
        }
        return pawGroup;
    };

    // Front Left Leg Group (Pivot at shoulder)
    const flLegGroup = new THREE.Group();
    flLegGroup.position.set(0.35, 1.3, 0.4); 
    catGroup.add(flLegGroup);

    const leftLeg = new THREE.Mesh(legGeo, furMaterial);
    leftLeg.position.set(0, -0.65, 0); 
    leftLeg.castShadow = true;
    flLegGroup.add(leftLeg);

    const flPaw = createPaw();
    flPaw.position.set(0, -0.65, 0.05);
    leftLeg.add(flPaw);

    // Front Right Leg Group
    const frLegGroup = new THREE.Group();
    frLegGroup.position.set(-0.35, 1.3, 0.4); 
    catGroup.add(frLegGroup);

    const rightLeg = new THREE.Mesh(legGeo, furMaterial);
    rightLeg.position.set(0, -0.65, 0);
    rightLeg.castShadow = true;
    frLegGroup.add(rightLeg);
    
    const frPaw = createPaw();
    frPaw.position.set(0, -0.65, 0.05);
    rightLeg.add(frPaw);


    // 6. Hind Legs (Articulated with Shin)
    // Create Hind Paw Helper
    const createHindPaw = () => {
        const group = new THREE.Group();
        // Elongated foot for cat
        const palmGeo = new THREE.SphereGeometry(0.15, 16, 16);
        palmGeo.scale(1.0, 0.5, 1.6);
        const palm = new THREE.Mesh(palmGeo, furMaterial);
        palm.position.set(0, 0, 0.15); // Offset forward so pivot is at heel
        group.add(palm);
        
        // Toes
        const toeGeo = new THREE.SphereGeometry(0.07, 12, 12);
        const toeOffsets = [-0.1, -0.03, 0.03, 0.1];
        
        for(let i=0; i<4; i++) {
            const toe = new THREE.Mesh(toeGeo, furMaterial);
            toe.position.set(toeOffsets[i], -0.02, 0.38); // Farther forward
            toe.scale.set(1, 0.75, 1);
            group.add(toe);
        }
        return group;
    };

    // Shared Geometry
    const thighGeo = new THREE.SphereGeometry(0.45, 32, 32);
    thighGeo.scale(0.8, 1.4, 1.0); // Upper leg muscle
    
    const shinGeo = new THREE.CylinderGeometry(0.18, 0.13, 0.7, 16); // Lower leg

    // --- Left Hind Leg Chain ---
    // 1. Hip Group (Pivot)
    const hlLegGroup = new THREE.Group();
    hlLegGroup.position.set(0.6, 0.65, 0.15); // Moved up and forward slightly
    catGroup.add(hlLegGroup);

    // 2. Thigh Mesh (Attached to Hip)
    const leftThigh = new THREE.Mesh(thighGeo, furMaterial);
    leftThigh.position.set(0, -0.2, 0); 
    leftThigh.rotation.set(0.2, 0, 0); // Slight muscle orient
    leftThigh.castShadow = true;
    hlLegGroup.add(leftThigh);

    // 3. Knee/Shin Group (Pivot at bottom of thigh)
    const leftShinGroup = new THREE.Group();
    leftShinGroup.position.set(0, -0.55, 0.1); // Knee location relative to hip
    hlLegGroup.add(leftShinGroup); // Child of Hip Group

    const leftShin = new THREE.Mesh(shinGeo, furMaterial);
    leftShin.position.set(0, -0.35, 0); // Center of shin
    leftShin.castShadow = true;
    leftShinGroup.add(leftShin);

    // 4. Ankle/Paw Group (Pivot at bottom of shin)
    const leftAnkleGroup = new THREE.Group();
    leftAnkleGroup.position.set(0, -0.7, 0); // Ankle location relative to knee
    leftShinGroup.add(leftAnkleGroup);

    const leftHindPaw = createHindPaw();
    leftAnkleGroup.add(leftHindPaw);


    // --- Right Hind Leg Chain ---
    const hrLegGroup = new THREE.Group();
    hrLegGroup.position.set(-0.6, 0.65, 0.15);
    catGroup.add(hrLegGroup);

    const rightThigh = new THREE.Mesh(thighGeo, furMaterial);
    rightThigh.position.set(0, -0.2, 0);
    rightThigh.rotation.set(0.2, 0, 0);
    rightThigh.castShadow = true;
    hrLegGroup.add(rightThigh);

    const rightShinGroup = new THREE.Group();
    rightShinGroup.position.set(0, -0.55, 0.1);
    hrLegGroup.add(rightShinGroup);

    const rightShin = new THREE.Mesh(shinGeo, furMaterial);
    rightShin.position.set(0, -0.35, 0);
    rightShin.castShadow = true;
    rightShinGroup.add(rightShin);

    const rightAnkleGroup = new THREE.Group();
    rightAnkleGroup.position.set(0, -0.7, 0);
    rightShinGroup.add(rightAnkleGroup);

    const rightHindPaw = createHindPaw();
    rightAnkleGroup.add(rightHindPaw);


    // 7. Tail
    const tailBones = [];
    let parent = catGroup;
    // Base of tail at lower spine/hips
    let prevPos = new THREE.Vector3(0, 0.45, -0.65); 
    
    const numTailSegs = 16;
    const tailTotalLen = 2.4;
    const tailSegLen = tailTotalLen / numTailSegs;

    for(let i=0; i<numTailSegs; i++) {
        const t = i / numTailSegs;
        // Smoother taper
        const radius = 0.13 * (1 - t * 0.5); 
        
        const tailSegGeo = new THREE.CylinderGeometry(radius, radius * 0.9, tailSegLen, 16);
        tailSegGeo.translate(0, tailSegLen/2, 0); // Pivot at base
        
        const seg = new THREE.Mesh(tailSegGeo, furMaterial);
        const baseRot = new THREE.Euler();

        if(i === 0) {
            seg.position.copy(prevPos);
            // Initial: Point down (-x) and back (-z) and slightly right (-y twist) to start the wrap
            // Note: Euler rotation order plays a part. Default is XYZ.
            baseRot.set(-2.6, -0.5, -0.5);
        } else {
            seg.position.set(0, tailSegLen * 0.92, 0); 
            
            // Curve logic:
            // First few segments: curve "up" (local X) to hit floor parallel
            // Then curve "right" (local Z) to wrap
            if(i < 5) {
                // Flattening out from the downward start
                baseRot.set(0.45, 0, 0.1);
            } else {
                // Curling around
                baseRot.set(0.05, 0, 0.28); 
            }
        }
        
        seg.rotation.copy(baseRot);
        seg.userData.baseRot = baseRot; // Store for animation
        
        parent.add(seg);
        parent = seg;
        tailBones.push(seg);
    }

    // Return parts for animation
    return {
        mesh: catGroup,
        parts: {
            hips,
            chest, // Upper body
            belly, // Connecting sphere
            head: headGroup,
            neck,
            
            // Groups for animation
            frontLeftLeg: flLegGroup,
            frontRightLeg: frLegGroup,
            hindLeftLeg: hlLegGroup,
            hindRightLeg: hrLegGroup,
            
            // Sub-parts for detail
            leftShinGroup,
            rightShinGroup,
            leftAnkleGroup,
            rightAnkleGroup,

            leftEar: leftEarGroup,
            rightEar: rightEarGroup,
            leftEyelid,
            rightEyelid,
            tail: tailBones
        }
    };
}