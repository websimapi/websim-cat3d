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
        metalness: 0.0,
    });

    const skinMaterial = new THREE.MeshStandardMaterial({
        color: 0xFDB5A3, // Pinkish
        roughness: 0.6,
    });

    const eyeMap = generateEyeTexture();
    const eyeMaterial = new THREE.MeshPhysicalMaterial({
        map: eyeMap,
        color: 0xffffff,
        roughness: 0.0,
        metalness: 0.0,
        clearcoat: 1.0,
        clearcoatRoughness: 0.1,
        transmission: 0.1,
    });

    // --- ANATOMY CONSTRUCTION ---

    // 1. Torso Group (Center of logic)
    // Sitting pose: Torso is angled upwards
    const torsoGroup = new THREE.Group();
    // Rotate torso to sitting angle (approx 60 degrees up)
    torsoGroup.rotation.x = -Math.PI / 4; 
    torsoGroup.position.y = 1.2;
    catGroup.add(torsoGroup);

    // Main Body Shape (Capsule-ish)
    // Deforming a cylinder to look like chest + belly
    const bodyGeo = new THREE.CylinderGeometry(0.7, 0.9, 2.5, 16, 4);
    // Deform vertices for spine arch and chest
    const posAttribute = bodyGeo.attributes.position;
    for(let i=0; i<posAttribute.count; i++) {
        const x = posAttribute.getX(i);
        const y = posAttribute.getY(i);
        const z = posAttribute.getZ(i);
        
        // Push chest out (Y positive in local, Z positive in world relative to rotation)
        let zMod = z;
        if(y > 0.5 && z > 0) zMod += 0.2; // Chest puff
        
        posAttribute.setZ(i, zMod);
    }
    bodyGeo.computeVertexNormals();
    const bodyMesh = new THREE.Mesh(bodyGeo, furMaterial);
    bodyMesh.castShadow = true;
    bodyMesh.receiveShadow = true;
    torsoGroup.add(bodyMesh);


    // 2. Head Group
    const headGroup = new THREE.Group();
    headGroup.position.set(0, 1.4, 0.3); // Top of neck
    headGroup.rotation.x = Math.PI / 4; // Counteract body rotation to look forward
    torsoGroup.add(headGroup);

    // Skull
    const skullGeo = new THREE.SphereGeometry(0.55, 32, 32);
    // Flatten top and bottom slightly
    skullGeo.scale(1, 0.85, 1);
    const skull = new THREE.Mesh(skullGeo, furMaterial);
    skull.castShadow = true;
    headGroup.add(skull);

    // Muzzle (Snout)
    const muzzleGeo = new THREE.SphereGeometry(0.25, 16, 16);
    muzzleGeo.scale(1, 0.8, 1.2);
    const muzzle = new THREE.Mesh(muzzleGeo, furMaterial);
    muzzle.position.set(0, -0.15, 0.45);
    headGroup.add(muzzle);

    // Nose (Pink tip)
    const noseGeo = new THREE.BufferGeometry(); // Simple triangle/tetrahedron
    const nosePts = [
        new THREE.Vector3(-0.08, 0, 0),
        new THREE.Vector3(0.08, 0, 0),
        new THREE.Vector3(0, -0.08, 0), // Point down
        new THREE.Vector3(0, 0, 0.05)   // Point forward
    ];
    noseGeo.setFromPoints(nosePts);
    noseGeo.computeVertexNormals();
    const nose = new THREE.Mesh(new THREE.ConeGeometry(0.06, 0.06, 3), skinMaterial);
    nose.rotation.x = Math.PI/2;
    nose.rotation.z = Math.PI;
    nose.position.set(0, 0.05, 0.73);
    headGroup.add(nose);

    // Ears
    const earGeo = new THREE.ConeGeometry(0.2, 0.4, 4);
    earGeo.scale(1, 1, 0.3); // Flatten
    
    const leftEar = new THREE.Mesh(earGeo, furMaterial);
    leftEar.position.set(0.3, 0.4, 0);
    leftEar.rotation.set(-0.2, 0, -0.4);
    leftEar.castShadow = true;
    
    const rightEar = new THREE.Mesh(earGeo, furMaterial);
    rightEar.position.set(-0.3, 0.4, 0);
    rightEar.rotation.set(-0.2, 0, 0.4);
    rightEar.castShadow = true;

    headGroup.add(leftEar);
    headGroup.add(rightEar);

    // Eyes
    const eyeGeo = new THREE.SphereGeometry(0.12, 24, 24);
    eyeGeo.rotateY(-Math.PI / 2); // Rotate texture to face forward
    
    const leftEye = new THREE.Mesh(eyeGeo, eyeMaterial);
    leftEye.position.set(0.2, 0.05, 0.42);
    leftEye.rotation.y = -0.1; // Slight outward slant
    
    const rightEye = new THREE.Mesh(eyeGeo, eyeMaterial);
    rightEye.position.set(-0.2, 0.05, 0.42);
    rightEye.rotation.y = 0.1;

    // Eyelids (for blinking) - simple spheres slightly larger than eyes, scaled to cover top
    const eyelidGeo = new THREE.SphereGeometry(0.13, 24, 24, 0, Math.PI * 2, 0, Math.PI/2);
    const leftEyelid = new THREE.Mesh(eyelidGeo, furMaterial);
    leftEyelid.position.copy(leftEye.position);
    leftEyelid.rotation.x = -Math.PI / 4; // Open state
    
    const rightEyelid = new THREE.Mesh(eyelidGeo, furMaterial);
    rightEyelid.position.copy(rightEye.position);
    rightEyelid.rotation.x = -Math.PI / 4; // Open state

    headGroup.add(leftEye, rightEye, leftEyelid, rightEyelid);


    // 3. Legs
    // Front Legs (Straight down from chest)
    const frontLegGeo = new THREE.CylinderGeometry(0.15, 0.12, 1.8, 12);
    const flLeg = new THREE.Mesh(frontLegGeo, furMaterial);
    flLeg.position.set(0.35, -1.0, 0.6); // Attached to upper chest
    flLeg.rotation.x = Math.PI / 4; // Vertical relative to world (counter torso)
    flLeg.castShadow = true;
    
    const frLeg = new THREE.Mesh(frontLegGeo, furMaterial);
    frLeg.position.set(-0.35, -1.0, 0.6);
    frLeg.rotation.x = Math.PI / 4;
    frLeg.castShadow = true;
    
    torsoGroup.add(flLeg, frLeg);

    // Paws (Front)
    const pawGeo = new THREE.SphereGeometry(0.18, 16, 16);
    pawGeo.scale(1, 0.6, 1.2);
    const flPaw = new THREE.Mesh(pawGeo, furMaterial);
    flPaw.position.set(0, -0.9, 0.1); // Relative to leg
    flLeg.add(flPaw);
    
    const frPaw = new THREE.Mesh(pawGeo, furMaterial);
    frPaw.position.set(0, -0.9, 0.1);
    frLeg.add(frPaw);

    // Hind Legs (Folded Haunches)
    // Thigh (Large sphere/ellipsoid)
    const thighGeo = new THREE.SphereGeometry(0.6, 24, 24);
    thighGeo.scale(0.8, 1.2, 1);
    
    const leftThigh = new THREE.Mesh(thighGeo, furMaterial);
    leftThigh.position.set(0.6, -1.0, -0.2); // Base of torso
    leftThigh.rotation.z = -0.2;
    leftThigh.castShadow = true;
    
    const rightThigh = new THREE.Mesh(thighGeo, furMaterial);
    rightThigh.position.set(-0.6, -1.0, -0.2);
    rightThigh.rotation.z = 0.2;
    rightThigh.castShadow = true;

    torsoGroup.add(leftThigh, rightThigh);

    // Lower Hind Leg (Tucked) & Hind Paw
    // Note: CapsuleGeometry is not available in r128, utilizing Cylinder as approximation
    const hindFootGeo = new THREE.CylinderGeometry(0.18, 0.18, 0.8, 8);
    
    const leftHindFoot = new THREE.Mesh(hindFootGeo, furMaterial);
    leftHindFoot.rotation.x = Math.PI / 2; // Flat on ground
    leftHindFoot.position.set(0.1, -0.5, 0.4); // Sticking out from thigh
    leftThigh.add(leftHindFoot);
    
    const rightHindFoot = new THREE.Mesh(hindFootGeo, furMaterial);
    rightHindFoot.rotation.x = Math.PI / 2;
    rightHindFoot.position.set(-0.1, -0.5, 0.4);
    rightThigh.add(rightHindFoot);


    // 4. Tail
    // Chain of cylinders/spheres
    const tailBones = [];
    let parent = torsoGroup;
    let prevPos = new THREE.Vector3(0, -1.2, -0.5); // Base of spine
    
    for(let i=0; i<8; i++) {
        const radius = 0.15 - (i * 0.015);
        const height = 0.4;
        const tailSegGeo = new THREE.CylinderGeometry(radius, radius*0.9, height, 8);
        tailSegGeo.translate(0, height/2, 0); // Pivot at base
        
        const seg = new THREE.Mesh(tailSegGeo, furMaterial);
        
        if(i === 0) {
            seg.position.copy(prevPos);
            // Orient out from body
            seg.rotation.x = 2; 
        } else {
            seg.position.set(0, height, 0); // Stack on previous
            // Curl around
            seg.rotation.x = 0.2; 
            seg.rotation.z = 0.3; // Curl to side
        }
        
        parent.add(seg);
        parent = seg;
        tailBones.push(seg);
    }


    // Reference holders for animation
    return {
        mesh: catGroup,
        parts: {
            head: headGroup,
            leftEar,
            rightEar,
            leftEyelid,
            rightEyelid,
            body: bodyMesh,
            tail: tailBones
        }
    };
}