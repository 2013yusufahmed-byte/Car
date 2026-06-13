// Canvas Setup
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const gameContainer = canvas.parentElement;

// Set canvas size to match container
function resizeCanvas() {
    const rect = gameContainer.getBoundingClientRect();
    canvas.width = 800;
    canvas.height = 600;
}
resizeCanvas();
window.addEventListener('resize', resizeCanvas);

// Game Variables
let gameState = 'start'; // 'start', 'playing', 'gameOver'
let gameRunning = false;
let lapsCompleted = 0;
const LAPS_TO_WIN = 3;
let lapStartTime = 0;
let lapTimes = [];
let bestLapTime = null;
let currentLapTime = 0;

// Input handling
const keys = {};
window.addEventListener('keydown', (e) => {
    keys[e.key] = true;
    if (e.key === ' ' && gameState === 'start') {
        startGame();
    }
});
window.addEventListener('keyup', (e) => {
    keys[e.key] = false;
});

// Player Car Class
class Car {
    constructor(x, y, color, isAI = false) {
        this.x = x;
        this.y = y;
        this.color = color;
        this.isAI = isAI;
        this.width = 30;
        this.height = 50;
        this.angle = 0;
        this.speed = 0;
        this.maxSpeed = 8;
        this.acceleration = 0.3;
        this.friction = 0.95;
        this.turnSpeed = 0.1;
        this.lastCheckpoint = -1;
    }

    update() {
        if (!this.isAI) {
            // Player input
            if (keys['ArrowUp']) {
                this.speed = Math.min(this.speed + this.acceleration, this.maxSpeed);
            }
            if (keys['ArrowDown']) {
                this.speed = Math.max(this.speed - this.acceleration, -this.maxSpeed * 0.5);
            }
            if (keys['ArrowLeft']) {
                this.angle -= this.turnSpeed * (this.speed / this.maxSpeed);
            }
            if (keys['ArrowRight']) {
                this.angle += this.turnSpeed * (this.speed / this.maxSpeed);
            }
        } else {
            // AI logic
            this.updateAI();
        }

        // Apply friction
        this.speed *= this.friction;

        // Update position
        this.x += Math.sin(this.angle) * this.speed;
        this.y -= Math.cos(this.angle) * this.speed;

        // Boundary wrapping and collision
        this.checkBoundaries();
        this.checkTrackBoundaries();
    }

    checkBoundaries() {
        if (this.x < 0) this.x = canvas.width;
        if (this.x > canvas.width) this.x = 0;
        if (this.y < 0) this.y = canvas.height;
        if (this.y > canvas.height) this.y = 0;
    }

    checkTrackBoundaries() {
        // Get distance from track center
        const trackPath = getTrackPath();
        let onTrack = false;

        for (let i = 0; i < trackPath.length; i++) {
            const point = trackPath[i];
            const dist = this.distanceTo(point.x, point.y);
            if (dist < 120) {
                onTrack = true;
                break;
            }
        }

        if (!onTrack) {
            this.speed *= 0.7; // Slow down off track
        }
    }

    updateAI() {
        const trackPath = getTrackPath();
        let nextPoint = trackPath[0];

        // Find next checkpoint ahead
        for (let i = 0; i < trackPath.length; i++) {
            const dist = this.distanceTo(trackPath[i].x, trackPath[i].y);
            if (dist > 50) {
                nextPoint = trackPath[i];
                break;
            }
        }

        const angleToNext = Math.atan2(nextPoint.x - this.x, -(nextPoint.y - this.y));
        let angleDiff = angleToNext - this.angle;

        // Normalize angle difference
        while (angleDiff > Math.PI) angleDiff -= 2 * Math.PI;
        while (angleDiff < -Math.PI) angleDiff += 2 * Math.PI;

        // Steer towards next point
        if (angleDiff > 0.1) {
            this.angle += this.turnSpeed * 0.8;
        } else if (angleDiff < -0.1) {
            this.angle -= this.turnSpeed * 0.8;
        }

        // Maintain speed
        this.speed = Math.min(this.speed + this.acceleration * 0.5, this.maxSpeed * 0.9);
    }

    distanceTo(x, y) {
        return Math.sqrt((this.x - x) ** 2 + (this.y - y) ** 2);
    }

    draw() {
        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.rotate(this.angle);

        // Car body
        ctx.fillStyle = this.color;
        ctx.fillRect(-this.width / 2, -this.height / 2, this.width, this.height);

        // Car windows
        ctx.fillStyle = 'rgba(100, 150, 255, 0.6)';
        ctx.fillRect(-this.width / 2 + 5, -this.height / 2 + 5, this.width - 10, 12);
        ctx.fillRect(-this.width / 2 + 5, this.height / 2 - 17, this.width - 10, 12);

        // Direction indicator
        ctx.fillStyle = '#FFD700';
        ctx.fillRect(-2, -this.height / 2 - 5, 4, 4);

        ctx.restore();
    }

    checkLap(checkpoints) {
        for (let i = 0; i < checkpoints.length; i++) {
            const cp = checkpoints[i];
            const dist = this.distanceTo(cp.x, cp.y);

            if (dist < cp.radius) {
                if (i === 0 && this.lastCheckpoint === checkpoints.length - 1) {
                    // Completed a lap
                    return true;
                }
                this.lastCheckpoint = i;
            }
        }
        return false;
    }
}

// Track data
function getTrackPath() {
    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;
    const path = [];

    // Create oval track
    for (let angle = 0; angle < Math.PI * 2; angle += 0.05) {
        const x = centerX + Math.cos(angle) * 200;
        const y = centerY + Math.sin(angle) * 150;
        path.push({ x, y });
    }

    return path;
}

function getCheckpoints() {
    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;
    const checkpoints = [];

    // 4 checkpoints around track
    const positions = [
        { x: centerX + 200, y: centerY }, // Right
        { x: centerX, y: centerY - 150 }, // Top
        { x: centerX - 200, y: centerY }, // Left
        { x: centerX, y: centerY + 150 } // Bottom
    ];

    positions.forEach((pos, idx) => {
        checkpoints.push({
            x: pos.x,
            y: pos.y,
            radius: 40,
            index: idx
        });
    });

    return checkpoints;
}

function drawTrack() {
    const trackPath = getTrackPath();

    // Draw track outer boundary
    ctx.strokeStyle = '#333';
    ctx.lineWidth = 80;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.beginPath();
    ctx.moveTo(trackPath[0].x, trackPath[0].y);
    for (let i = 1; i < trackPath.length; i++) {
        ctx.lineTo(trackPath[i].x, trackPath[i].y);
    }
    ctx.closePath();
    ctx.stroke();

    // Draw track surface
    ctx.strokeStyle = '#555';
    ctx.lineWidth = 60;
    ctx.beginPath();
    ctx.moveTo(trackPath[0].x, trackPath[0].y);
    for (let i = 1; i < trackPath.length; i++) {
        ctx.lineTo(trackPath[i].x, trackPath[i].y);
    }
    ctx.closePath();
    ctx.stroke();

    // Draw lane markings
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
    ctx.lineWidth = 2;
    ctx.setLineDash([20, 20]);
    ctx.beginPath();
    ctx.moveTo(trackPath[0].x, trackPath[0].y);
    for (let i = 1; i < trackPath.length; i++) {
        ctx.lineTo(trackPath[i].x, trackPath[i].y);
    }
    ctx.closePath();
    ctx.stroke();
    ctx.setLineDash([]);

    // Draw checkpoints
    const checkpoints = getCheckpoints();
    checkpoints.forEach((cp, idx) => {
        ctx.strokeStyle = idx === 0 ? '#4CAF50' : 'rgba(76, 175, 80, 0.5)';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(cp.x, cp.y, cp.radius, 0, Math.PI * 2);
        ctx.stroke();

        ctx.fillStyle = idx === 0 ? 'rgba(76, 175, 80, 0.2)' : 'rgba(76, 175, 80, 0.1)';
        ctx.beginPath();
        ctx.arc(cp.x, cp.y, cp.radius, 0, Math.PI * 2);
        ctx.fill();
    });
}

// Game objects
let playerCar;
let aiCar;

// Initialize game
function initGame() {
    playerCar = new Car(canvas.width / 2 + 50, canvas.height / 2 + 100, '#FF6B6B', false);
    aiCar = new Car(canvas.width / 2 - 50, canvas.height / 2 + 100, '#4169E1', true);
    lapsCompleted = 0;
    lapTimes = [];
    bestLapTime = null;
    lapStartTime = Date.now();
    gameState = 'playing';
    gameRunning = true;
}

function startGame() {
    if (gameState !== 'start') return;
    initGame();
    document.getElementById('startScreen').classList.add('hidden');
    document.getElementById('gameOverScreen').classList.add('hidden');
    gameLoop();
}

function restartGame() {
    initGame();
    document.getElementById('gameOverScreen').classList.add('hidden');
    gameLoop();
}

function formatTime(ms) {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    const millis = Math.floor((ms % 1000) / 10);
    return `${minutes}:${secs.toString().padStart(2, '0')}.${millis.toString().padStart(2, '0')}`;
}

function updateHUD() {
    const speed = Math.abs(playerCar.speed);
    document.getElementById('speedValue').textContent = Math.round(speed * 10);
    document.getElementById('speedBar').style.width = (speed / playerCar.maxSpeed * 100) + '%';
    document.getElementById('lapValue').textContent = lapsCompleted + 1;

    currentLapTime = Date.now() - lapStartTime;
    document.getElementById('currentTime').textContent = formatTime(currentLapTime);

    if (bestLapTime !== null) {
        document.getElementById('bestTime').textContent = formatTime(bestLapTime);
    }
}

function gameLoop() {
    // Clear canvas
    ctx.fillStyle = '#E8F4F8';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Draw background
    ctx.fillStyle = '#90EE90';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Draw track
    drawTrack();

    // Update and draw cars
    if (gameRunning) {
        playerCar.update();
        aiCar.update();

        // Check for lap completion
        const checkpoints = getCheckpoints();
        if (playerCar.checkLap(checkpoints)) {
            lapsCompleted++;
            const lapTime = Date.now() - lapStartTime;
            lapTimes.push(lapTime);

            if (bestLapTime === null || lapTime < bestLapTime) {
                bestLapTime = lapTime;
            }

            lapStartTime = Date.now();

            if (lapsCompleted >= LAPS_TO_WIN) {
                endGame();
            }
        }
    }

    playerCar.draw();
    aiCar.draw();

    // Draw position indicator
    ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
    ctx.font = 'bold 20px Arial';
    ctx.fillText('P1', playerCar.x - 40, playerCar.y - 60);
    ctx.fillText('AI', aiCar.x - 40, aiCar.y - 60);

    updateHUD();

    if (gameRunning) {
        requestAnimationFrame(gameLoop);
    }
}

function endGame() {
    gameRunning = false;
    gameState = 'gameOver';

    const avgTime = lapTimes.length > 0 
        ? lapTimes.reduce((a, b) => a + b) / lapTimes.length 
        : 0;

    document.getElementById('gameOverTitle').textContent = '🏁 RACE COMPLETE!';
    document.getElementById('gameOverText').textContent = 
        `You completed ${LAPS_TO_WIN} laps! Avg lap time: ${formatTime(avgTime)}`;
    document.getElementById('bestTimeDisplay').textContent = 
        `Best lap time: ${formatTime(bestLapTime)}`;
    document.getElementById('gameOverScreen').classList.remove('hidden');
}