import * as THREE from 'three';
import { GAME_CONFIG } from './main.js';

/**
 * Environment handles the 3D world aesthetics:
 * the high-noon golden highway, chrome skyscrapers, and sky-bridges.
 */
export class Environment {
    constructor(scene) {
        this.scene = scene;

        this.roadLength = GAME_CONFIG.ROAD.LENGTH; // 200
        this.roadWidth = GAME_CONFIG.ROAD.WIDTH;   // 20

        this.segments = [];
        this._initHighway();
        this._initCityscape();
        this.bridges = [];
    }

    _createRoadSegment(zPos) {
        const segment = new THREE.Group();

        // 1. Road Surface
        const roadGeom = new THREE.PlaneGeometry(this.roadWidth, this.roadLength);

        // Procedural asphalt texture
        const canvas = document.createElement('canvas');
        canvas.width = 256;
        canvas.height = 256;
        const ctx = canvas.getContext('2d');
        ctx.fillStyle = '#101014';
        ctx.fillRect(0, 0, 256, 256);
        for (let i = 0; i < 2000; i++) {
            const gray = 15 + Math.random() * 10;
            ctx.fillStyle = `rgb(${gray},${gray},${gray})`;
            ctx.fillRect(Math.random() * 256, Math.random() * 256, 1, 1);
        }
        const roadTexture = new THREE.CanvasTexture(canvas);
        roadTexture.wrapS = THREE.RepeatWrapping;
        roadTexture.wrapT = THREE.RepeatWrapping;
        roadTexture.repeat.set(1, 5);

        const roadMat = new THREE.MeshPhongMaterial({
            color: 0x101014,
            map: roadTexture,
            shininess: 80,
            specular: 0x222222
        });
        const roadMesh = new THREE.Mesh(roadGeom, roadMat);
        roadMesh.rotation.x = -Math.PI / 2;
        segment.add(roadMesh);

        // 2. Lane Markings
        const markerMat = new THREE.MeshStandardMaterial({
            color: 0xffd866,
            emissive: 0xffd866,
            emissiveIntensity: 0.4,
            transparent: true,
            opacity: 0.9
        });

        // Outer edges: x = -10, 10
        const edgeGeom = new THREE.PlaneGeometry(0.2, this.roadLength);
        const leftEdge = new THREE.Mesh(edgeGeom, markerMat);
        leftEdge.position.set(-9.8, 0.01, 0);
        leftEdge.rotation.x = -Math.PI / 2;
        segment.add(leftEdge);

        const rightEdge = new THREE.Mesh(edgeGeom, markerMat);
        rightEdge.position.set(9.8, 0.01, 0);
        rightEdge.rotation.x = -Math.PI / 2;
        segment.add(rightEdge);

        // Internal dividers: x = -2, 2 (Exactly between lanes -4, 0, 4)
        const dashGeom = new THREE.PlaneGeometry(0.2, 5);
        const dividerX = [-2, 2];
        dividerX.forEach(x => {
            for (let i = 0; i < 10; i++) {
                const dash = new THREE.Mesh(dashGeom, markerMat);
                dash.position.set(x, 0.01, (i * 20) - 100);
                dash.rotation.x = -Math.PI / 2;
                segment.add(dash);
            }
        });

        segment.position.z = zPos;
        this.scene.add(segment);
        return segment;
    }

    _initHighway() {
        // Create two segments for seamless recycling
        // Segment A at 0, Segment B at -roadLength
        const segA = this._createRoadSegment(0);
        const segB = this._createRoadSegment(-this.roadLength);
        this.segments = [segA, segB];
    }

    _initCityscape() {
        this.buildings = new THREE.Group();
        const buildingCount = 80;
        const chromeMat = new THREE.MeshPhongMaterial({
            color: 0xffffff,
            shininess: 100,
            specular: 0xffeaad
        });

        for (let i = 0; i < buildingCount; i++) {
            const w = 4 + Math.random() * 6;
            const h = 20 + Math.random() * 60;
            const d = 4 + Math.random() * 6;
            const geom = new THREE.BoxGeometry(w, h, d);
            const b = new THREE.Mesh(geom, chromeMat);
            const side = Math.random() > 0.5 ? 1 : -1;
            b.position.set(
                (15 + Math.random() * 20) * side,
                h / 2,
                -Math.random() * 400
            );
            this.buildings.add(b);
        }
        this.scene.add(this.buildings);
    }

    _createBridge(zPos) {
        const bridgeWidth = 20;
        const bridgeHeight = 2;
        const bridgeDepth = 2;
        const geom = new THREE.BoxGeometry(bridgeWidth, bridgeHeight, bridgeDepth);
        const mat = new THREE.MeshPhongMaterial({ color: 0xcccccc, shininess: 80 });
        const bridge = new THREE.Mesh(geom, mat);
        bridge.position.set(0, 4 + Math.random() * 2, zPos);
        this.scene.add(bridge);
        this.bridges.push(bridge);
    }

    update(deltaTime, gameSpeed) {
        const effectiveSpeed = gameSpeed + 10;

        // 1. Scroll Road Segments
        this.segments.forEach(seg => {
            seg.position.z += effectiveSpeed * deltaTime;
        });

        // Recycling Logic:
        // To avoid gaps, a segment is recycled as soon as its BACK edge passes the camera.
        // For a segment at position z, its back edge is at z - (roadLength / 2).
        // Camera is at z=5. So if (z - 100) > 5 => z > 105.

        const roadHalfLength = this.roadLength / 2;
        const cameraZ = 5;

        this.segments.forEach((seg, index) => {
            if (seg.position.z - roadHalfLength > cameraZ) {
                // Find the other segment to snap relative to
                const otherSeg = this.segments[(index + 1) % 2];
                seg.position.z = otherSeg.position.z - this.roadLength;
            }
        });

        // 2. Scroll Buildings
        this.buildings.children.forEach(b => {
            b.position.z += effectiveSpeed * deltaTime;
            if (b.position.z > 10) {
                b.position.z = -400;
            }
        });

        // 3. Manage Bridges
        if (Math.random() < 0.01) {
            this._createBridge(-200);
        }

        for (let i = this.bridges.length - 1; i >= 0; i--) {
            const bridge = this.bridges[i];
            bridge.position.z += effectiveSpeed * deltaTime;
            if (bridge.position.z > 10) {
                this.scene.remove(bridge);
                this.bridges.splice(i, 1);
            }
        }
    }

    reset() {
        this.segments[0].position.z = 0;
        this.segments[1].position.z = -this.roadLength;
        this.buildings.children.forEach(b => {
            b.position.z = -Math.random() * 400;
        });
        this.bridges.forEach(b => this.scene.remove(b));
        this.bridges = [];
    }
}
