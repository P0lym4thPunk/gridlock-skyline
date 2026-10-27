import { Engine } from './engine.js';
import { Player } from './player.js';
import { Obstacles } from './obstacles.js';
import { Environment } from './environment.js';
import { getHighScore, saveScore } from './storage.js';
import * as THREE from 'three';

/**
 * Global Game Constants
 * Shared source of truth for gameplay balance and environment layout.
 */
export const GAME_CONFIG = {
    LANES: {
        COUNT: 3,
        WIDTH: 4, // Distance between lane centers
        POSITIONS: [-4, 0, 4], // X coordinates for the 3 lanes
    },
    ROAD: {
        LENGTH: 200,
        WIDTH: 20,
        RESET_THRESHOLD: 100, // Half-length for dual-segment recycling
    },
    PLAYER: {
        MOVE_SPEED: 12,
        LERP_FACTOR: 5,
    }
};

/**
 * main.js
 * The "Brain" of GRIDLOCK: SKYLINE.
 * Orchestrates the lifecycle, input, and communication between all modules.
 */

class Game {
    constructor() {
        // DOM Elements
        this.ui = {
            landing: document.getElementById('landing-screen'),
            hud: document.getElementById('hud-overlay'),
            gameOver: document.getElementById('game-over-screen'),
            startBtn: document.getElementById('start-btn'),
            retryBtn: document.getElementById('retry-btn'),
            highScore: document.getElementById('high-score'),
            speedReadout: document.getElementById('speed-readout'),
            scoreCounter: document.getElementById('score-counter'),
            finalScore: document.getElementById('final-score'),
            newRecordBanner: document.getElementById('new-high-score-banner')
        };

        // Game State
        this.state = 'LANDING'; // LANDING, PLAYING, GAMEOVER
        this.score = 0;
        this.gameSpeed = 10;
        this.distance = 0;

        // Input State
        this.input = {
            left: false,
            right: false,
            up: false,
            down: false,
            rollLeft: false,
            rollRight: false
        };

        this._init();
    }

    _init() {
        // Initialization & Persistence: Read high score on load
        this.ui.highScore.textContent = getHighScore();

        // Game Start Flow
        this.ui.startBtn.addEventListener('click', () => this.start());
        this.ui.retryBtn.addEventListener('click', () => this.start());

        this._setupInput();
    }

    _setupInput() {
        // Keyboard controls
        window.addEventListener('keydown', (e) => this._handleKey(e.code, true));
        window.addEventListener('keyup', (e) => this._handleKey(e.code, false));

        // Mobile Touch (Simple Dragging)
        let lastTouchX = 0;
        let lastTouchY = 0;

        window.addEventListener('touchstart', (e) => {
            lastTouchX = e.touches[0].clientX;
            lastTouchY = e.touches[0].clientY;
        }, { passive: false });

        window.addEventListener('touchmove', (e) => {
            if (this.state !== 'PLAYING') return;

            const touchX = e.touches[0].clientX;
            const touchY = e.touches[0].clientY;

            const diffX = touchX - lastTouchX;
            const diffY = touchY - lastTouchY;

            this.input.left = diffX < -10;
            this.input.right = diffX > 10;
            this.input.up = diffY < -10;
            this.input.down = diffY > 10;

            lastTouchX = touchX;
            lastTouchY = touchY;
            e.preventDefault();
        }, { passive: false });

        window.addEventListener('touchend', () => {
            this.input.left = this.input.right = this.input.up = this.input.down = false;
        });
    }

    _handleKey(code, isPressed) {
        switch(code) {
            case 'KeyA': case 'ArrowLeft': this.input.left = isPressed; break;
            case 'KeyD': case 'ArrowRight': this.input.right = isPressed; break;
            case 'KeyW': case 'ArrowUp': this.input.up = isPressed; break;
            case 'KeyS': case 'ArrowDown': this.input.down = isPressed; break;
            case 'KeyQ': this.input.rollLeft = isPressed; break;
            case 'KeyE': this.input.rollRight = isPressed; break;
        }
    }

    start() {
        // UI Transition
        this.ui.landing.classList.add('hidden');
        this.ui.gameOver.classList.add('hidden');
        this.ui.hud.classList.remove('hidden');
        this.ui.newRecordBanner.classList.add('hidden');

        // Initialize and start engine, player, and obstacles
        this.engine = new Engine();
        this.player = new Player(this.engine.scene);
        this.obstacles = new Obstacles(this.engine.scene);
        this.env = new Environment(this.engine.scene);

        // Reset Game State
        this.state = 'PLAYING';
        this.score = 0;
        this.distance = 0;
        this.gameSpeed = 10;

        // Hook into Engine Loop
        this.engine.onUpdate((dt) => this.update(dt));
        this.engine.start();
    }

    update(dt) {
        if (this.state !== 'PLAYING') return;

        // 1. Update Game World
        this.player.update(dt, this.input);
        this.env.update(dt, this.gameSpeed);
        this.obstacles.spawn(dt);
        this.obstacles.update(dt, this.gameSpeed);

        // 2. Handle Score & Distance
        this.distance += (this.gameSpeed + 10) * dt;
        this.score = Math.floor(this.distance);

        // Gradually increase difficulty
        this.gameSpeed += 0.05 * dt;

        // 3. Update HUD
        this.ui.scoreCounter.textContent = `${this.score}m`;
        this.ui.speedReadout.innerHTML = `${Math.floor(this.gameSpeed + 10)} <small>MAX</small>`;

        // 4. Collision Detection
        const pBounds = this.player.getBounds();
        const playerBox = new THREE.Box3().setFromCenterAndSize(
            pBounds.center,
            pBounds.size
        );

        if (!this.player.invulnerable && this.obstacles.checkCollision(playerBox)) {
            this.gameOver();
        }
    }

    gameOver() {
        this.state = 'GAMEOVER';
        this.engine.stop();

        // Save score via storage.js
        const result = saveScore(this.score);

        // UI Update
        this.ui.hud.classList.add('hidden');
        this.ui.gameOver.classList.remove('hidden');
        this.ui.finalScore.textContent = `${this.score}m`;

        if (result.isNewHighScore) {
            this.ui.newRecordBanner.classList.remove('hidden');
        }

        // Update landing page for next time
        this.ui.highScore.textContent = result.highScore;
    }
}

// Launch the game
const game = new Game();

if (import.meta.env.DEV) {
    window.__GRIDLOCK_DEBUG__ = {
        frameCount: 0,
        queryCount: 0,
        recycleLog: [],
        logRecycle: (event) => {
            window.__GRIDLOCK_DEBUG__.recycleLog.push({
                ...event,
                timestamp: performance.now()
            });
            if (window.__GRIDLOCK_DEBUG__.recycleLog.length > 50) {
                window.__GRIDLOCK_DEBUG__.recycleLog.shift();
            }
        },
        getState: () => {
            const roadPos = new THREE.Vector3();
            game.env.segments[0].getWorldPosition(roadPos);
            const gridPos = new THREE.Vector3();
            game.env.segments[0].children[1].getWorldPosition(gridPos);
            const playerPos = new THREE.Vector3();
            game.player.mesh.getWorldPosition(playerPos);

            return {
                frameCount: window.__GRIDLOCK_DEBUG__.frameCount,
                queryCount: window.__GRIDLOCK_DEBUG__.queryCount++,
                state: game.state,
                speed: game.gameSpeed,
                distance: game.distance,
                segments: game.env.segments.map((seg, i) => ({
                    id: i,
                    position: seg.position.clone(),
                    worldPosition: seg.position.clone() // Simplified for now
                })),
                recycleLog: window.__GRIDLOCK_DEBUG__.recycleLog,
                player: {
                    lane: game.player.currentLaneIndex,
                    targetY: game.player.targetPosition.y,
                    actualY: game.player.position.y,
                    world: { x: playerPos.x, y: playerPos.y, z: playerPos.z }
                },
                obstacles: game.obstacles.obstacles.length
            };
        }
    };
}
