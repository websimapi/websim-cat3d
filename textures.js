import * as THREE from 'three';

/**
 * Generates procedural fur textures (Color, Normal, Roughness)
 */
export function generateFurTextures() {
    const width = 1024;
    const height = 1024;
    
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');

    // --- 1. Base Color Map (Tabby Pattern) ---
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

    const colorTexture = new THREE.CanvasTexture(canvas);
    colorTexture.wrapS = THREE.RepeatWrapping;
    colorTexture.wrapT = THREE.RepeatWrapping;

    // --- 2. Normal Map (Fur Direction) ---
    // Clear for normal map generation
    ctx.fillStyle = '#8080ff'; // Flat normal
    ctx.fillRect(0, 0, width, height);

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
        
        ctx.strokeStyle = `rgba(${r}, ${g}, 255, 0.5)`;
        ctx.lineWidth = 2;
        
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(x + Math.cos(angle) * length, y + Math.sin(angle) * length);
        ctx.stroke();
    }

    const normalTexture = new THREE.CanvasTexture(canvas);
    normalTexture.wrapS = THREE.RepeatWrapping;
    normalTexture.wrapT = THREE.RepeatWrapping;

    return { colorTexture, normalTexture };
}

/**
 * Generates procedural eye texture
 */
export function generateEyeTexture() {
    const size = 512;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');

    const centerX = size / 2;
    const centerY = size / 2;

    // Sclera (Outer)
    ctx.fillStyle = '#FFF8E7';
    ctx.fillRect(0, 0, size, size);

    // Iris (Yellow-Green)
    const irisRad = size * 0.45;
    const grad = ctx.createRadialGradient(centerX, centerY, irisRad * 0.2, centerX, centerY, irisRad);
    grad.addColorStop(0, '#AACC55'); // Inner light
    grad.addColorStop(0.7, '#88AA44'); // Main color
    grad.addColorStop(1, '#556622'); // Outer rim

    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(centerX, centerY, irisRad, 0, Math.PI * 2);
    ctx.fill();

    // Iris Pattern (Radial lines)
    ctx.strokeStyle = 'rgba(0,0,0,0.2)';
    ctx.lineWidth = 2;
    for(let i=0; i<60; i++) {
        const angle = (i / 60) * Math.PI * 2;
        ctx.beginPath();
        ctx.moveTo(centerX + Math.cos(angle)*irisRad*0.3, centerY + Math.sin(angle)*irisRad*0.3);
        ctx.lineTo(centerX + Math.cos(angle)*irisRad*0.9, centerY + Math.sin(angle)*irisRad*0.9);
        ctx.stroke();
    }

    // Pupil (Vertical Slit)
    ctx.fillStyle = '#000000';
    ctx.beginPath();
    ctx.ellipse(centerX, centerY, irisRad * 0.15, irisRad * 0.45, 0, 0, Math.PI * 2);
    ctx.fill();

    // Highlight (Fake reflection baked in, though PBR handles real reflection)
    ctx.fillStyle = 'rgba(255,255,255,0.4)';
    ctx.beginPath();
    ctx.arc(centerX - 50, centerY - 50, 30, 0, Math.PI * 2);
    ctx.fill();

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