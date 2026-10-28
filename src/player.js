import * as THREE from 'three';
import { GAME_CONFIG } from './main.js';

/**
 * Player handles the 3D model and physics logic for the hover car.
 */
export class Player {
    constructor(scene) {
        this.scene = scene;

        // Physics Constants
        this.moveSpeed = GAME_CONFIG.PLAYER.MOVE_SPEED;
        this.lerpFactor = GAME_CONFIG.PLAYER.LERP_FACTOR;
        this.bounds = { width: 0.6, height: 0.3, depth: 1.2 };

        // State
        this.position = new THREE.Vector3(0, 0, 0);
        this.targetPosition = new THREE.Vector3(0, 0, 0);
        this.currentLaneIndex = 1; // Middle lane (0: Left, 1: Middle, 2: Right)
        this.rotationZ = 0;
        this.targetRotationZ = 0;

        // Barrel Roll State
        this.isRolling = false;
        this.rollProgress = 0;
        this.invulnerable = false;
        this.invulnerabilityTimer = 0;

        this._createModel();
    }

    _createModel() {
        this.mesh = new THREE.Group();

        // Main Body - Sleek low-poly Cyber-EV
        const bodyGeom = new THREE.BoxGeometry(0.6, 0.3, 1.2);
        const bodyMat = new THREE.MeshPhongMaterial({
            color: 0x222222,
            shininess: 100,
            specular: 0x00f3ff
        });
        const body = new THREE.Mesh(bodyGeom, bodyMat);
        this.mesh.add(body);

        // Cockpit - Tinted Glass
        const cockpitGeom = new THREE.BoxGeometry(0.4, 0.15, 0.4);
        const cockpitMat = new THREE.MeshPhongMaterial({
            color: 0x00f3ff,
            transparent: true,
            opacity: 0.6
        });
        const cockpit = new THREE.Mesh(cockpitGeom, cockpitMat);
        cockpit.position.set(0, 0.2, 0.1);
        this.mesh.add(cockpit);

        // Thrusters - 4 glowing cyan underside jets
        const thrusterGeom = new THREE.BoxGeometry(0.1, 0.1, 0.2);
        const thrusterMat = new THREE.MeshBasicMaterial({ color: 0x00f3ff });

        const thrusterPositions = [
            [-0.2, -0.15, 0.4], [0.2, -0.15, 0.4],
            [-0.2, -0.15, -0.4], [0.2, -0.15, -0.4]
        ];

        this.thrusters = [];
        thrusterPositions.forEach(pos => {
            const t = new THREE.Mesh(thrusterGeom, thrusterMat);
            t.position.set(...pos);
            this.mesh.add(t);
            this.thrusters.push(t);
        });

        this.scene.add(this.mesh);
    }

    /**
     * Handles movement and animations based on input and time.
     * @param {number} deltaTime
     * @param {Object} input - { left, right, up, down, rollLeft, rollRight }
     */
    update(deltaTime, input) {
        // 1. Handle Lane-Based Movement Input
        if (input.left && this.currentLaneIndex > 0) {
            this.currentLaneIndex--;
            input.left = false; // Consume input for discrete step
        }
        if (input.right && this.currentLaneIndex < GAME_CONFIG.LANES.COUNT - 1) {
            this.currentLaneIndex++;
            input.right = false; // Consume input for discrete step
        }

        // Set target X based on current lane
        this.targetPosition.x = GAME_CONFIG.LANES.POSITIONS[this.currentLaneIndex];

        // Handle Y movement (Up/Down)
        if (input.up) this.targetPosition.y += this.moveSpeed * deltaTime;
        if (input.down) this.targetPosition.y -= this.moveSpeed * deltaTime;

        // Clamp Y to prevent flying off road or diving underground
        this.targetPosition.y = Math.max(0.3, Math.min(5, this.targetPosition.y));

        // Smooth Lerp to target position
        const alpha = Math.max(0, Math.min(1, this.lerpFactor * deltaTime));
        this.position.lerp(this.targetPosition, alpha);
        this.mesh.position.copy(this.position);

        // 2. Handle Complex Maneuver: Barrel Roll
        if ((input.rollLeft || input.rollRight) && !this.isRolling) {
            this._triggerRoll(input.rollLeft ? -1 : 1);
        }

        if (this.isRolling) {
            this.rollProgress += deltaTime * 5; // Complete roll in 0.2s
            this.rotationZ = this.rollProgress * Math.PI * 2 * (this.rollDir || 1);

            if (this.rollProgress >= 1) {
                this.isRolling = false;
                this.rollProgress = 0;
                this.rotationZ = 0;
                this.invulnerable = false;
            }
        }

        // Handle Invulnerability Timer
        if (this.invulnerabilityTimer > 0) {
            this.invulnerabilityTimer -= deltaTime;
            if (this.invulnerabilityTimer <= 0) this.invulnerable = false;
        }

        this.mesh.rotation.z = this.rotationZ;

        // Visual flair: Thruster flickering
        this.thrusters.forEach(t => {
            t.scale.set(1, 1, 1 + Math.random() * 0.5);
        });
    }

    _triggerRoll(direction) {
        this.isRolling = true;
        this.rollDir = direction;
        this.invulnerable = true;
        this.invulnerabilityTimer = 0.5; // 500ms window
    }

    getBounds() {
        return {
            center: this.position,
            size: new THREE.Vector3(this.bounds.width, this.bounds.height, this.bounds.depth)
        };
    }

    reset() {
        this.position.set(0, 0, 0);
        this.targetPosition.set(0, 0, 0);
        this.currentLaneIndex = 1;
        this.rotationZ = 0;
        this.isRolling = false;
        this.invulnerable = false;
    }

    getPosition() {
        return this.position;
    }
}
