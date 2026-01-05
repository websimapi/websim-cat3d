import * as THREE from 'three';

export class CatBehavior {
    constructor(catData) {
        this.mesh = catData.mesh;
        this.parts = catData.parts;
        
        // State Machine
        this.state = 'SITTING'; // SITTING, STAND_UP, WALKING, SIT_DOWN
        this.standFactor = 0;   // 0 = Sit, 1 = Stand
        this.walkCycle = 0;
        
        // Navigation
        this.targetPosition = new THREE.Vector3();
        this.moveSpeed = 4.0;
        this.turnSpeed = 5.0;
        this.stopDist = 0.5;

        // Animation Timers
        this.time = 0;
        this.blinkTimer = 0;
        this.nextBlinkTime = 4 + Math.random() * 4;
        this.earTwitchTimer = 0;
        this.nextEarTwitch = 2;
    }

    /**
     * Set a new destination for the cat
     */
    setTarget(target) {
        this.targetPosition.copy(target);
        
        // Clamp target to reasonable bounds (prevent walking off world)
        this.targetPosition.x = Math.max(-24, Math.min(24, this.targetPosition.x));
        this.targetPosition.z = Math.max(-24, Math.min(24, this.targetPosition.z));
        
        // Trigger state change if needed
        if (this.state === 'SITTING' || this.state === 'SIT_DOWN') {
            this.state = 'STAND_UP';
        } else if (this.state === 'WALKING' || this.state === 'STAND_UP') {
            this.state = 'WALKING'; // Just update target
        }
    }

    /**
     * Main update loop
     * @param {number} dt Delta time in seconds
     */
    update(dt) {
        this.time += dt;

        this._updateStateMachine(dt);
        this._updatePose(this.standFactor, this.walkCycle);
        this._updateSecondaryAnimations(dt);
    }

    _updateStateMachine(dt) {
        const currentPos = this.mesh.position;
        const distToTarget = new THREE.Vector2(currentPos.x, currentPos.z)
            .distanceTo(new THREE.Vector2(this.targetPosition.x, this.targetPosition.z));

        switch(this.state) {
            case 'SITTING':
                this.standFactor = THREE.MathUtils.lerp(this.standFactor, 0, 0.1);
                break;

            case 'STAND_UP':
                this.standFactor += 0.05; // Transition speed
                if (this.standFactor >= 1) {
                    this.standFactor = 1;
                    this.state = 'WALKING';
                }
                break;

            case 'WALKING':
                this.standFactor = 1;
                this.walkCycle += dt;
                
                if (distToTarget > this.stopDist) {
                    // Turn towards target
                    const dx = this.targetPosition.x - currentPos.x;
                    const dz = this.targetPosition.z - currentPos.z;
                    const targetAngle = Math.atan2(dx, dz);
                    
                    // Smooth rotation
                    let angleDiff = targetAngle - this.mesh.rotation.y;
                    // Normalize angle -PI to PI
                    while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
                    while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;
                    
                    this.mesh.rotation.y += angleDiff * 0.1;
                    
                    // Move forward
                    this.mesh.translateZ(this.moveSpeed * dt);
                } else {
                    this.state = 'SIT_DOWN';
                }
                break;

            case 'SIT_DOWN':
                this.standFactor -= 0.05;
                if (this.standFactor <= 0) {
                    this.standFactor = 0;
                    this.state = 'SITTING';
                    this.walkCycle = 0;
                }
                break;
        }
    }

    _updateSecondaryAnimations(dt) {
        const parts = this.parts;
        const time = this.time;

        // 1. Breathing
        const breathFactor = 1 + Math.sin(time * 4) * 0.02; 
        parts.chest.scale.set(1 * breathFactor, 0.95, 0.85);

        // 2. Tail Movement
        parts.tail.forEach((seg, i) => {
            if (seg.userData.baseRot) {
                const sitRot = seg.userData.baseRot;
                let standRotX = (i === 0) ? -1.0 : 0.1;
                
                const effectiveBaseX = THREE.MathUtils.lerp(sitRot.x, standRotX, this.standFactor);
                const effectiveBaseY = THREE.MathUtils.lerp(sitRot.y, 0, this.standFactor * 0.8);
                const effectiveBaseZ = THREE.MathUtils.lerp(sitRot.z, 0, this.standFactor * 0.8);

                const waveSpeed = 2;
                const waveOffset = i * 0.3;
                const waveAmp = 0.06;
                const waveZ = Math.sin(time * waveSpeed - waveOffset) * waveAmp;
                
                seg.rotation.x = effectiveBaseX;
                seg.rotation.y = effectiveBaseY;
                seg.rotation.z = effectiveBaseZ + waveZ;
                
                if(i === parts.tail.length - 1) {
                    seg.rotation.y += Math.sin(time * 10) * 0.15;
                }
            }
        });

        // 3. Blinking
        this.blinkTimer += dt;
        if (this.blinkTimer > this.nextBlinkTime) {
            const blinkPhase = (this.blinkTimer - this.nextBlinkTime) / 0.2; 
            if (blinkPhase < 0.5) {
                const closure = THREE.MathUtils.lerp(-Math.PI/4, 0, blinkPhase * 2);
                parts.leftEyelid.rotation.x = closure;
                parts.rightEyelid.rotation.x = closure;
            } else if (blinkPhase < 1.0) {
                const closure = THREE.MathUtils.lerp(0, -Math.PI/4, (blinkPhase - 0.5) * 2);
                parts.leftEyelid.rotation.x = closure;
                parts.rightEyelid.rotation.x = closure;
            } else {
                this.blinkTimer = 0;
                this.nextBlinkTime = 4 + Math.random() * 4;
                parts.leftEyelid.rotation.x = -Math.PI/4;
                parts.rightEyelid.rotation.x = -Math.PI/4;
            }
        }

        // 4. Ear Twitch
        this.earTwitchTimer += dt;
        if(this.earTwitchTimer > this.nextEarTwitch) {
            const twitchDur = 0.15;
            const phase = (this.earTwitchTimer - this.nextEarTwitch) / twitchDur;
            if(phase < 1.0) {
                const ear = Math.random() > 0.5 ? parts.leftEar : parts.rightEar;
                const origRot = ear === parts.leftEar ? -0.4 : 0.4;
                ear.rotation.z = origRot + Math.sin(phase * Math.PI) * 0.2;
            } else {
                this.earTwitchTimer = 0;
                this.nextEarTwitch = 2 + Math.random() * 3;
                parts.leftEar.rotation.z = -0.4;
                parts.rightEar.rotation.z = 0.4;
            }
        }
    }

    _updatePose(factor, walkTime) {
        const parts = this.parts;

        // 1. Body Positioning
        parts.hips.position.y = THREE.MathUtils.lerp(0.55, 1.05, factor);
        parts.hips.position.z = THREE.MathUtils.lerp(0.0, -0.3, factor);
        
        parts.chest.position.y = THREE.MathUtils.lerp(1.45, 1.15, factor);
        parts.chest.position.z = THREE.MathUtils.lerp(0.3, 1.3, factor);

        // 2. Leg Attachments
        const chestP = parts.chest.position;
        // Adjusted offsets to prevent clipping (Wider X, More Forward Z)
        parts.frontLeftLeg.position.set(0.45, chestP.y - 0.1, chestP.z + 0.4);
        parts.frontRightLeg.position.set(-0.45, chestP.y - 0.1, chestP.z + 0.4);

        const hipsP = parts.hips.position;
        parts.hindLeftLeg.position.set(0.6, hipsP.y + 0.1, hipsP.z + 0.15);
        parts.hindRightLeg.position.set(-0.6, hipsP.y + 0.1, hipsP.z + 0.15);

        // Tail follow
        if (parts.tail && parts.tail.length > 0) {
            parts.tail[0].position.set(0, hipsP.y - 0.1, hipsP.z - 0.65);
        }

        // Belly Stretch
        const dist = hipsP.distanceTo(chestP);
        parts.belly.position.copy(hipsP).lerp(chestP, 0.5);
        parts.belly.lookAt(chestP);
        const volScale = THREE.MathUtils.lerp(1.0, 0.85, factor);
        parts.belly.scale.set(1.05 * volScale, 0.95 * volScale, dist * 0.85);

        // Head follow
        parts.head.position.y = chestP.y + 0.8;
        parts.head.position.z = chestP.z + 0.25; // Adjusted slightly forward for new neck

        // Neck Logic (Dynamic Bridge)
        const headP = parts.head.position;
        const neckDist = chestP.distanceTo(headP);
        
        // Position neck halfway between chest and head
        parts.neck.position.copy(chestP).lerp(headP, 0.5);
        parts.neck.lookAt(headP);
        
        // Stretch neck based on distance
        // Base scale (1.1 width, 1.4 length)
        // We modulate the Z scale (length) based on actual distance
        parts.neck.scale.set(1.1, 1.1, neckDist * 1.1);

        // 3. Leg Articulation
        const hipRot = THREE.MathUtils.lerp(1.2, -0.2, factor);
        const kneeRot = THREE.MathUtils.lerp(-2.4, 0.6, factor);
        const ankleRot = THREE.MathUtils.lerp(1.5, -0.5, factor);

        parts.hindLeftLeg.rotation.x = hipRot;
        parts.hindRightLeg.rotation.x = hipRot;
        parts.leftShinGroup.rotation.x = kneeRot;
        parts.rightShinGroup.rotation.x = kneeRot;
        parts.leftAnkleGroup.rotation.x = ankleRot;
        parts.rightAnkleGroup.rotation.x = ankleRot;

        // 4. Walk Cycle
        if (factor > 0.1) {
            const amp = 0.5 * factor; 
            const freq = walkTime * 10;
            
            // Front Legs
            parts.frontLeftLeg.rotation.x = Math.sin(freq) * amp;
            parts.frontRightLeg.rotation.x = Math.sin(freq + Math.PI) * amp;

            const lLift = Math.max(0, Math.cos(freq)) * 0.14 * factor;
            const rLift = Math.max(0, Math.cos(freq + Math.PI)) * 0.14 * factor;

            parts.frontLeftLeg.position.y += lLift;
            parts.frontRightLeg.position.y += rLift;

            if(parts.frontLeftPaw) parts.frontLeftPaw.rotation.x = -lLift * 3;
            if(parts.frontRightPaw) parts.frontRightPaw.rotation.x = -rLift * 3;
            
            // Hind Legs
            const lHipOsc = Math.sin(freq + Math.PI) * amp;
            const rHipOsc = Math.sin(freq) * amp;
            
            parts.hindLeftLeg.rotation.x = hipRot + lHipOsc;
            parts.hindRightLeg.rotation.x = hipRot + rHipOsc;
            
            const lKneeOsc = Math.max(0, Math.sin(freq + Math.PI)) * 0.5;
            const rKneeOsc = Math.max(0, Math.sin(freq)) * 0.5;
            
            parts.leftShinGroup.rotation.x = kneeRot + lKneeOsc;
            parts.rightShinGroup.rotation.x = kneeRot + rKneeOsc;

            // Bob Body
            parts.hips.position.y += Math.cos(freq * 2) * 0.02 * factor;
            parts.chest.position.y += Math.cos(freq * 2) * 0.02 * factor;
        } else {
            // Reset front legs to neutral
            parts.frontLeftLeg.rotation.x = THREE.MathUtils.lerp(parts.frontLeftLeg.rotation.x, 0, 0.1);
            parts.frontRightLeg.rotation.x = THREE.MathUtils.lerp(parts.frontRightLeg.rotation.x, 0, 0.1);
        }
    }
}