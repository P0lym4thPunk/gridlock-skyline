import * as THREE from 'three';
import { GAME_CONFIG } from './main.js';

/**
 * Obstacles manages the spawning, movement, and collision
 * detection for oncoming traffic in GRIDLOCK: SKYLINE.
 */
export class Obstacles {
    constructor(scene) {
        this.scene = scene;
        this.obstacles = [];

        // Configuration
        this.spawnTimer = 0;
        this.spawnInterval = 1.5; // Seconds between spawns
        this.lanePositions = GAME_CONFIG.LANES.POSITIONS; // Use shared config
        this.speeds = [15, 20, 25]; // Varying speeds for different vehicle types

        this.obstacleTypes = [
            { name: 'car', size: [0.6, 0.3, 1.2], color: 0x555555 },
            { name: 'truck', size: [1.2, 1.0, 3.0], color: 0x333333 },
            { name: 'drone', size: [0.4, 0.2, 0.4], color: 0xff003c }
        ];
    }

    /**
     * Spawns a new obstacle based on a timer.
     * @param {number} deltaTime
     */
    spawn(deltaTime) {
        this.spawnTimer += deltaTime;

        if (this.spawnTimer >= this.spawnInterval) {
            this._createObstacle();
            this.spawnTimer = 0;

            // Slightly randomize next spawn interval for organic flow
            this.spawnInterval = 0.8 + Math.random() * 1.2;
        }
    }

    _createObstacle() {
        const type = this.obstacleTypes[Math.floor(Math.random() * this.obstacleTypes.length)];
        const lane = this.lanePositions[Math.floor(Math.random() * this.lanePositions.length)];
        const speed = this.speeds[Math.floor(Math.random() * this.speeds.length)];

        const geometry = new THREE.BoxGeometry(...type.size);
        const material = new THREE.MeshPhongMaterial({ color: type.color });
        const mesh = new THREE.Mesh(geometry, material);

        // Spawn far ahead of the player (Z axis)
        mesh.position.set(lane, type.size[1] / 2, -50);

        this.scene.add(mesh);
        this.obstacles.push({
            mesh,
            geometry,
            material,
            speed,
            bounds: new THREE.Box3()
        });
    }

    /**
     * Updates obstacles position and cleans up passed objects.
     * @param {number} deltaTime
     * @param {number} gameSpeed - Global speed multiplier
     */
    update(deltaTime, gameSpeed) {
        for (let i = this.obstacles.length - 1; i >= 0; i--) {
            const obs = this.obstacles[i];

            // Move obstacle toward the player
            obs.mesh.position.z += (obs.speed + gameSpeed) * deltaTime;

            // Update Bounding Box for collision
            obs.bounds.setFromObject(obs.mesh);

            // Memory Management: Dispose and Remove if passed camera
            if (obs.mesh.position.z > 10) {
                this.scene.remove(obs.mesh);
                obs.geometry.dispose();
                obs.material.dispose();
                this.obstacles.splice(i, 1);
            }
        }
    }

    /**
     * Tests for collisions between the player's bounding box and all active traffic.
     * @param {THREE.Box3} playerBox
     * @returns {boolean}
     */
    checkCollision(playerBox) {
        for (const obs of this.obstacles) {
            if (playerBox.intersectsBox(obs.bounds)) {
                return true;
            }
        }
        return false;
    }

    /**
     * Clears all active obstacles from the scene.
     */
    reset() {
        this.obstacles.forEach(obs => {
            this.scene.remove(obs.mesh);
            obs.geometry.dispose();
            obs.material.dispose();
        });
        this.obstacles = [];
        this.spawnTimer = 0;
    }
}
