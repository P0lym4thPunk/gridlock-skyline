import * as THREE from 'three';

/**
 * Engine handles the core Three.js rendering pipeline.
 * It is decoupled from game logic to allow for independent
 * updates to rendering and physics.
 */
export class Engine {
    constructor() {
        this.canvas = document.getElementById('game-canvas');
        if (!this.canvas) {
            throw new Error('Canvas #game-canvas not found in DOM');
        }

        this._initScene();
        this._initCamera();
        this._initRenderer();
        this._initLights();

        this.clock = new THREE.Clock();
        this.updateCallback = null;
        this.isRunning = false;
        this.requestId = null;

        window.addEventListener('resize', () => this._handleResize());
        this._handleResize(); // Initial sizing
    }

    _initScene() {
        this.scene = new THREE.Scene();
        // High-Noon atmosphere: Warm ivory/pale golden sky
        this.scene.background = new THREE.Color(0xfffaf0);

        // Golden-white atmospheric haze
        this.scene.fog = new THREE.FogExp2(0xfff4d0, 0.015);
    }

    _initCamera() {
        this.camera = new THREE.PerspectiveCamera(
            75,
            window.innerWidth / window.innerHeight,
            0.1,
            1000
        );
        // Position camera slightly behind and above the origin
        this.camera.position.set(0, 2, 5);
    }

    _initRenderer() {
        this.renderer = new THREE.WebGLRenderer({
            canvas: this.canvas,
            antialias: true,
            powerPreference: 'high-performance'
        });

        // High-DPI scaling capped at 2 for performance on ultra-high res screens
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        this.renderer.setSize(window.innerWidth, window.innerHeight);
    }

    _initLights() {
        // Soft ambient light for general visibility
        const ambientLight = new THREE.AmbientLight(0x404040, 0.5);
        this.scene.add(ambientLight);

        // Directional sun light for high-contrast shadows
        const sunLight = new THREE.DirectionalLight(0xffdf00, 1);
        sunLight.position.set(5, 10, 7.5);
        this.scene.add(sunLight);

        // Neon point light placeholder for car thrusters (initialized as a group for easy updates)
        this.thrusterLights = new THREE.Group();
        const neonLight = new THREE.PointLight(0x00f3ff, 2, 10);
        neonLight.position.set(0, 0, 0);
        this.thrusterLights.add(neonLight);
        this.scene.add(this.thrusterLights);
    }

    _handleResize() {
        const width = window.innerWidth;
        const height = window.innerHeight;

        this.camera.aspect = width / height;
        this.camera.updateProjectionMatrix();

        this.renderer.setSize(width, height);
    }

    /**
     * Hook for external game scripts to inject logic into the frame loop.
     * @param {Function} callback - Function receiving (deltaTime, time)
     */
    onUpdate(callback) {
        this.updateCallback = callback;
    }

    start() {
        if (this.isRunning) return;
        this.isRunning = true;
        this._loop();
    }

    stop() {
        this.isRunning = false;
        if (this.requestId) {
            cancelAnimationFrame(this.requestId);
        }
    }

    _loop() {
        if (!this.isRunning) return;

        const deltaTime = this.clock.getDelta();
        const elapsed = this.clock.getElapsedTime();

        if (import.meta.env.DEV && window.__GRIDLOCK_DEBUG__) {
            window.__GRIDLOCK_DEBUG__.frameCount++;
        }

        if (this.updateCallback) {
            this.updateCallback(deltaTime, elapsed);
        }

        this.renderer.render(this.scene, this.camera);
        this.requestId = requestAnimationFrame(() => this._loop());
    }
}
