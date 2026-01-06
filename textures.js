import * as THREE from 'three';

/**
 * Generates procedural fur textures (Color, Normal, Roughness)
 */
export function generateFurTextures() {
    const width = 1024;
    const height = 1024;
    
    // --- 1. Base Color Map (Tabby Pattern) ---
    const colorCanvas = document.createElement('canvas');
    colorCanvas.width = 1024;
    colorCanvas.height = 1024;
    const ctx = colorCanvas.getContext('2d');
    ctx.fillStyle = '#C9B8A8'; // Base warm gray-beige
    ctx.fillRect(0, 0, width, height);

    // Add noise grain
    addNoise(ctx, width, height, 0.05);

    // Tabby Stripes
    ctx.strokeStyle = '#8B7D6B'; // Darker stripe color
    ctx.lineWidth = 20;
    ctx.filter = 'blur(10px)';
    
    // Draw wavy stripes
    for (let i = 0; i < 20; i++) {
        ctx.beginPath();
        const startY = Math.random() * height;
        ctx.moveTo(0, startY);
        for (let x = 0; x <= width; x += 50) {
            ctx.lineTo(x, startY + Math.sin(x * 0.02) * 50 + (Math.random() * 20));
        }
        ctx.stroke();
    }
    
    // Lighter belly/chest patches
    ctx.globalCompositeOperation = 'screen';
    ctx.fillStyle = '#E5DDD5';
    ctx.filter = 'blur(40px)';
    ctx.beginPath();
    ctx.ellipse(width/2, height/2, width/3, height/3, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalCompositeOperation = 'source-over';
    ctx.filter = 'none';

    const colorTexture = new THREE.CanvasTexture(colorCanvas);
    colorTexture.wrapS = THREE.RepeatWrapping;
    colorTexture.wrapT = THREE.RepeatWrapping;

    // --- 2. Normal Map (Fur Direction) ---
    const normalCanvas = document.createElement('canvas');
    normalCanvas.width = 1024;
    normalCanvas.height = 1024;
    const ctxN = normalCanvas.getContext('2d');

    // Clear for normal map generation
    ctxN.fillStyle = '#8080ff'; // Flat normal
    ctxN.fillRect(0, 0, 1024, 1024);

    // Draw thousands of tiny strokes to simulate fur strands
    const numStrands = 15000;
    for (let i = 0; i < numStrands; i++) {
        const x = Math.random() * width;
        const y = Math.random() * height;
        const length = 8 + Math.random() * 12;
        const angle = Math.PI / 2 + (Math.random() - 0.5) * 0.5; // Mostly vertical flow (down body)

        // Create normal direction encoded in color
        // R = X direction, G = Y direction, B = Z (up)
        // Simple approximation: lighter strokes for raised hairs
        const g = Math.floor(128 + Math.cos(angle) * 127);
        const r = Math.floor(128 + Math.sin(angle) * 127);
        
        ctxN.strokeStyle = `rgba(${r}, ${g}, 255, 0.5)`;
        ctxN.lineWidth = 2;
        
        ctxN.beginPath();
        ctxN.moveTo(x, y);
        ctxN.lineTo(x + Math.cos(angle) * length, y + Math.sin(angle) * length);
        ctxN.stroke();
    }

    const normalTexture = new THREE.CanvasTexture(normalCanvas);
    normalTexture.wrapS = THREE.RepeatWrapping;
    normalTexture.wrapT = THREE.RepeatWrapping;

    return { colorTexture, normalTexture };
}

/**
 * Generates procedural eye texture
 */
export function generateEyeTexture() {
    const size = 1024;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');

    const cx = size / 2;
    const cy = size / 2;
    const irisRadius = size * 0.45;

    // 1. Sclera (White/Off-white with subtle shading)
    const scleraGradient = ctx.createRadialGradient(cx, cy, irisRadius, cx, cy, size * 0.7);
    scleraGradient.addColorStop(0, '#DDDDE8');
    scleraGradient.addColorStop(1, '#FFFFFF');
    ctx.fillStyle = scleraGradient;
    ctx.fillRect(0, 0, size, size);

    // 2. Iris Background & Fibers
    ctx.save();
    ctx.beginPath();
    ctx.arc(cx, cy, irisRadius, 0, Math.PI * 2);
    ctx.clip();

    // Deep base color gradient
    const baseGradient = ctx.createRadialGradient(cx, cy, irisRadius * 0.2, cx, cy, irisRadius);
    baseGradient.addColorStop(0, '#B8860B'); // Dark Goldenrod center
    baseGradient.addColorStop(0.5, '#9ACD32'); // Yellow Green
    baseGradient.addColorStop(1, '#2F4F2F'); // Dark Slate Gray/Green rim
    ctx.fillStyle = baseGradient;
    ctx.fillRect(0, 0, size, size);

    // Detailed Fibers (Stroma)
    const numFibers = 3000;
    for (let i = 0; i < numFibers; i++) {
        const angle = Math.random() * Math.PI * 2;
        const innerR = irisRadius * 0.15;
        const outerR = irisRadius * (0.5 + Math.random() * 0.5);
        
        // Complex color variance for realism
        const hue = 40 + Math.random() * 50; // Amber to Green range
        const sat = 40 + Math.random() * 60;
        const light = 20 + Math.random() * 60;
        const alpha = 0.1 + Math.random() * 0.3;
        
        ctx.strokeStyle = `hsla(${hue}, ${sat}%, ${light}%, ${alpha})`;
        ctx.lineWidth = 0.5 + Math.random() * 1.5;
        
        ctx.beginPath();
        // Start from inner, wiggle out
        const cp1x = cx + Math.cos(angle - 0.05) * (innerR + outerR) * 0.4;
        const cp1y = cy + Math.sin(angle - 0.05) * (innerR + outerR) * 0.4;
        
        ctx.moveTo(cx + Math.cos(angle) * innerR, cy + Math.sin(angle) * innerR);
        ctx.quadraticCurveTo(cp1x, cp1y, cx + Math.cos(angle) * outerR, cy + Math.sin(angle) * outerR);
        ctx.stroke();
    }

    // Collarette (Distinct wavy ring around pupil)
    ctx.strokeStyle = 'rgba(255, 215, 0, 0.3)'; // Gold
    ctx.lineWidth = 2;
    ctx.beginPath();
    const collaretteRad = irisRadius * 0.35;
    for(let i=0; i<=120; i++) {
        const angle = (i/120) * Math.PI * 2;
        const r = collaretteRad + Math.sin(i * 0.5) * 20 + (Math.random() - 0.5) * 10;
        if(i===0) ctx.moveTo(cx + Math.cos(angle)*r, cy + Math.sin(angle)*r);
        else ctx.lineTo(cx + Math.cos(angle)*r, cy + Math.sin(angle)*r);
    }
    ctx.closePath();
    ctx.stroke();

    // Dark Limbal Ring (Outer edge)
    const limbalGrad = ctx.createRadialGradient(cx, cy, irisRadius * 0.9, cx, cy, irisRadius);
    limbalGrad.addColorStop(0, 'rgba(0,0,0,0)');
    limbalGrad.addColorStop(0.5, 'rgba(20,30,20,0.3)');
    limbalGrad.addColorStop(1, 'rgba(10,15,10,0.9)');
    ctx.fillStyle = limbalGrad;
    ctx.fillRect(0, 0, size, size);

    // Fake Shadow (Top eyelid occlusion)
    const shadowGrad = ctx.createLinearGradient(0, cy - irisRadius, 0, cy + irisRadius * 0.5);
    shadowGrad.addColorStop(0, 'rgba(0,0,0,0.5)');
    shadowGrad.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = shadowGrad;
    ctx.fillRect(0, 0, size, size);

    // Fake Caustics (Bottom Highlight - Light passing through cornea)
    ctx.globalCompositeOperation = 'overlay';
    const causticGrad = ctx.createRadialGradient(cx, cy + irisRadius * 0.4, irisRadius * 0.1, cx, cy + irisRadius * 0.4, irisRadius * 0.7);
    causticGrad.addColorStop(0, 'rgba(255,255,220,0.5)');
    causticGrad.addColorStop(1, 'rgba(255,255,220,0)');
    ctx.fillStyle = causticGrad;
    ctx.fillRect(0,0,size,size);
    ctx.globalCompositeOperation = 'source-over';

    ctx.restore(); // End Iris Clip

    // 3. Pupil (Sharp Vertical Slit)
    const pupilW = irisRadius * 0.16;
    const pupilH = irisRadius * 0.72;
    
    ctx.fillStyle = '#050200';
    ctx.beginPath();
    // Almond shape for pupil
    ctx.moveTo(cx, cy - pupilH/2);
    ctx.bezierCurveTo(cx + pupilW/2, cy - pupilH/4, cx + pupilW/2, cy + pupilH/4, cx, cy + pupilH/2);
    ctx.bezierCurveTo(cx - pupilW/2, cy + pupilH/4, cx - pupilW/2, cy - pupilH/4, cx, cy - pupilH/2);
    ctx.fill();

    // Pupil Softness
    ctx.shadowColor = '#000000';
    ctx.shadowBlur = 15;
    ctx.fill();
    ctx.shadowBlur = 0;

    const tex = new THREE.CanvasTexture(canvas);
    return tex;
}

function addNoise(ctx, w, h, amount) {
    const imgData = ctx.getImageData(0, 0, w, h);
    const data = imgData.data;
    for (let i = 0; i < data.length; i += 4) {
        const val = (Math.random() - 0.5) * 255 * amount;
        data[i] = Math.min(255, Math.max(0, data[i] + val));
        data[i+1] = Math.min(255, Math.max(0, data[i+1] + val));
        data[i+2] = Math.min(255, Math.max(0, data[i+2] + val));
    }
    ctx.putImageData(imgData, 0, 0);
}