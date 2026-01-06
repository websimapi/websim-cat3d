import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';

export class SceneManager {
    constructor(container) {
        this.container = container;
        this.scene = null;
        this.camera = null;
        this.renderer = null;
        this.controls = null;
        
        this.init();
    }

    init() {
        // --- Scene Setup ---
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color('#D8E5F0');
        this.scene.fog = new THREE.FogExp2(0xD8E5F0, 0.02);

        // --- Camera ---
        this.camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 100);
        this.camera.position.set(4, 3, 5);
        this.camera.lookAt(0, 1, 0);

        // --- Renderer ---
        this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        this.renderer.physicallyCorrectLights = true;
        this.renderer.outputEncoding = THREE.sRGBEncoding;
        this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
        this.renderer.toneMappingExposure = 1.0;
        this.container.appendChild(this.renderer.domElement);

        // --- Lighting ---
        this.initLights();

        // --- Floor ---
        this.initFloor();

        // --- Controls ---
        this.controls = new OrbitControls(this.camera, this.renderer.domElement);
        this.controls.enableDamping = true;
        this.controls.dampingFactor = 0.05;
        this.controls.maxPolarAngle = Math.PI / 2 - 0.05;
        this.controls.target.set(0, 1, 0);

        // --- Resize Handler ---
        this.onResize = this.onResize.bind(this);
        window.addEventListener('resize', this.onResize);
    }

    initLights() {
        const hemiLight = new THREE.HemisphereLight(0xffffff, 0x443322, 0.6);
        this.scene.add(hemiLight);

        const keyLight = new THREE.DirectionalLight(0xFFF5E0, 1.1);
        keyLight.position.set(5, 8, 6);
        keyLight.castShadow = true;
        keyLight.shadow.mapSize.width = 2048;
        keyLight.shadow.mapSize.height = 2048;
        keyLight.shadow.bias = -0.0005;
        this.scene.add(keyLight);

        const fillLight = new THREE.DirectionalLight(0xE8DBC5, 0.4);
        fillLight.position.set(-4, 2, 2);
        this.scene.add(fillLight);

        const rimLight = new THREE.DirectionalLight(0xFFFFFF, 0.4);
        rimLight.position.set(0, 4, -5);
        this.scene.add(rimLight);

        const ambientLight = new THREE.AmbientLight(0x404040, 0.5);
        this.scene.add(ambientLight);
    }

    initFloor() {
        const planeGeo = new THREE.PlaneGeometry(50, 50);
        const planeMat = new THREE.MeshStandardMaterial({ 
            color: 0xD5D0C8, 
            roughness: 1, 
            metalness: 0 
        });
        const plane = new THREE.Mesh(planeGeo, planeMat);
        plane.rotation.x = -Math.PI / 2;
        plane.receiveShadow = true;
        this.scene.add(plane);
    }

    add(object) {
        this.scene.add(object);
    }

    remove(object) {
        this.scene.remove(object);
    }

    setFollowTarget(target) {
        this.followTarget = target;
    }

    update() {
        if (this.followTarget && this.controls) {
            // Get current world position of the cat
            const targetPos = new THREE.Vector3();
            this.followTarget.getWorldPosition(targetPos);
            
            // Focus on the upper body/head area rather than the floor
            targetPos.y += 1.2;

            // Calculate how much the target moved since last frame
            const delta = new THREE.Vector3().subVectors(targetPos, this.controls.target);
            
            // Shift both the camera and the control target by that delta
            // This maintains the user's current orbital offset while following the movement
            this.camera.position.add(delta);
            this.controls.target.copy(targetPos);
        }

        if (this.controls) this.controls.update();
        if (this.renderer && this.scene && this.camera) {
            this.renderer.render(this.scene, this.camera);
        }
    }

    onResize() {
        if (!this.camera || !this.renderer) return;
        this.camera.aspect = window.innerWidth / window.innerHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(window.innerWidth, window.innerHeight);
    }

    dispose() {
        window.removeEventListener('resize', this.onResize);
        if (this.container && this.renderer) {
            this.container.removeChild(this.renderer.domElement);
        }
        if (this.controls) this.controls.dispose();
        if (this.renderer) this.renderer.dispose();
    }
}