// Game Configuration
const CARS = [
    { name: 'Ferrari', emoji: '🔴', speed: 9, acceleration: 0.8, handling: 0.7 },
    { name: 'Lamborghini', emoji: '🟡', speed: 9.5, acceleration: 0.9, handling: 0.6 },
    { name: 'Mercedes', emoji: '⚪', speed: 8, acceleration: 0.7, handling: 0.9 },
    { name: 'Porsche', emoji: '🟠', speed: 8.5, acceleration: 0.85, handling: 0.8 },
    { name: 'BMW', emoji: '🔵', speed: 7.5, acceleration: 0.75, handling: 0.85 },
    { name: 'Audi', emoji: '⬛', speed: 8, acceleration: 0.8, handling: 0.8 }
];

const TRACKS = [
    {
        name: 'City Circuit',
        emoji: '🏙️',
        waypoints: [
            { x: 800, y: 400 },
            { x: 600, y: 200 },
            { x: 200, y: 150 },
            { x: 100, y: 400 },
            { x: 200, y: 700 },
            { x: 600, y: 750 },
            { x: 900, y: 600 }
        ],
        width: 1200,
        height: 800
    },
    {
        name: 'Mountain Pass',
        emoji: '⛰️',
        waypoints: [
            { x: 600, y: 700 },
            { x: 200, y: 600 },
            { x: 100, y: 300 },
            { x: 300, y: 100 },
            { x: 700, y: 150 },
            { x: 900, y: 400 },
            { x: 800, y: 700 }
        ],
        width: 1200,
        height: 800
    },
    {
        name: 'Desert Road',
        emoji: '🏜️',
        waypoints: [
            { x: 100, y: 400 },
            { x: 300, y: 200 },
            { x: 600, y: 100 },
            { x: 900, y: 300 },
            { x: 1000, y: 600 },
            { x: 700, y: 750 },
            { x: 300, y: 700 }
        ],
        width: 1200,
        height: 800
    },
    {
        name: 'Coastal Track',
        emoji: '🏖️',
        waypoints: [
            { x: 200, y: 200 },
            { x: 600, y: 100 },
            { x: 1000, y: 250 },
            { x: 1050, y: 600 },
            { x: 800, y: 750 },
            { x: 400, y: 700 },
            { x: 150, y: 500 }
        ],
        width: 1200,
        height: 800
    }
];

// Game Variables
let canvas, ctx;
let selectedCar = null;
let selectedTrack = null;
let gameRunning = false;
let gameStartTime = 0;
let players = [];
let aiCars = [];
const TOTAL_LAPS = 3;
const WAYPOINT_RADIUS = 50;

// Initialize Game
window.addEventListener('DOMContentLoaded', () => {
    canvas = document.getElementById('gameCanvas');
    ctx = canvas.getContext('2d');
    
    setupMenuListeners();
    populateSelections();
    
    window.addEventListener('resize', resizeCanvas);
    resizeCanvas();
});

function resizeCanvas() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
}

function populateSelections() {
    const carContainer = document.getElementById('carSelection');
    const trackContainer = document.getElementById('trackSelection');
    
    CARS.forEach((car, index) => {
        const div = document.createElement('div');
        div.className = 'selection-item';
        div.innerHTML = `<span class="selection-item-emoji">${car.emoji}</span><span class="selection-item-name">${car.name}</span>`;
        div.addEventListener('click', () => selectCar(index, div));
        carContainer.appendChild(div);
    });
    
    TRACKS.forEach((track, index) => {
        const div = document.createElement('div');
        div.className = 'selection-item';
        div.innerHTML = `<span class="selection-item-emoji">${track.emoji}</span><span class="selection-item-name">${track.name}</span>`;
        div.addEventListener('click', () => selectTrack(index, div));
        trackContainer.appendChild(div);
    });
}

function selectCar(index, element) {
    document.querySelectorAll('#carSelection .selection-item').forEach(el => el.classList.remove('selected'));
    element.classList.add('selected');
    selectedCar = index;
    updateStartButton();
}

function selectTrack(index, element) {
    document.querySelectorAll('#trackSelection .selection-item').forEach(el => el.classList.remove('selected'));
    element.classList.add('selected');
    selectedTrack = index;
    updateStartButton();
}

function updateStartButton() {
    const startButton = document.getElementById('startButton');
    startButton.disabled = selectedCar === null || selectedTrack === null;
}

function setupMenuListeners() {
    document.getElementById('startButton').addEventListener('click', startGame);
    document.getElementById('playAgainButton').addEventListener('click', () => {
        document.getElementById('gameOverScreen').classList.add('hidden');
        startGame();
    });
    document.getElementById('menuButton').addEventListener('click', () => {
        document.getElementById('gameOverScreen').classList.add('hidden');
        document.getElementById('menu').classList.add('active');
        gameRunning = false;
    });
}

function startGame() {
    document.getElementById('menu').classList.remove('active');
    document.getElementById('gameContainer').classList.remove('game-hidden');
    
    const track = TRACKS[selectedTrack];
    const playerCar = CARS[selectedCar];
    
    // Create player car
    players = [{
        ...playerCar,
        x: track.waypoints[0].x,
        y: track.waypoints[0].y,
        angle: 0,
        speed: 0,
        acceleration: 0,
        currentWaypoint: 0,
        lapsCompleted: 0,
        isPlayer: true,
        finished: false
    }];
    
    // Create AI cars
    aiCars = [];
    for (let i = 0; i < 3; i++) {
        const randomCar = CARS[Math.floor(Math.random() * CARS.length)];
        aiCars.push({
            ...randomCar,
            x: track.waypoints[0].x + Math.random() * 100 - 50,
            y: track.waypoints[0].y + Math.random() * 100 - 50,
            angle: 0,
            speed: 0,
            acceleration: 0,
            currentWaypoint: 0,
            lapsCompleted: 0,
            isPlayer: false,
            finished: false
        });
    }
    
    gameRunning = true;
    gameStartTime = Date.now();
    gameLoop();
}

function gameLoop() {
    const track = TRACKS[selectedTrack];
    
    // Clear canvas
    ctx.fillStyle = '#1a1a2e';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Draw track
    drawTrack(track);
    
    // Update and draw player
    updatePlayer(players[0], track);
    drawCar(players[0]);
    
    // Update and draw AI cars
    aiCars.forEach(car => {
        updateAICar(car, track);
        drawCar(car);
    });
    
    // Update HUD
    updateHUD(players[0], track);
    
    // Check for race completion
    const allFinished = [...players, ...aiCars].every(car => car.finished);
    if (allFinished) {
        endRace();
    } else if (gameRunning) {
        requestAnimationFrame(gameLoop);
    }
}

function drawTrack(track) {
    // Draw track background
    ctx.fillStyle = '#2d5016';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Draw road
    ctx.strokeStyle = '#ffff00';
    ctx.lineWidth = 3;
    ctx.setLineDash([20, 10]);
    ctx.beginPath();
    track.waypoints.forEach((wp, i) => {
        if (i === 0) ctx.moveTo(wp.x, wp.y);
        else ctx.lineTo(wp.x, wp.y);
    });
    ctx.closePath();
    ctx.stroke();
    ctx.setLineDash([]);
    
    // Draw waypoints
    track.waypoints.forEach((wp, i) => {
        ctx.fillStyle = i === 0 ? '#00ff00' : '#ff0000';
        ctx.beginPath();
        ctx.arc(wp.x, wp.y, WAYPOINT_RADIUS, 0, Math.PI * 2);
        ctx.fill();
        
        // Draw waypoint number
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 12px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(i + 1, wp.x, wp.y);
    });
}

function drawCar(car) {
    ctx.save();
    ctx.translate(car.x, car.y);
    ctx.rotate(car.angle);
    
    // Draw car body
    ctx.fillStyle = car.emoji ? 'rgba(255, 255, 255, 0.1)' : car.color;
    ctx.fillRect(-15, -25, 30, 50);
    
    // Draw emoji
    ctx.font = '30px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(car.emoji, 0, 0);
    
    ctx.restore();
}

function updatePlayer(car, track) {
    // Handle input
    const keys = {};
    window.addEventListener('keydown', (e) => { keys[e.key] = true; });
    window.addEventListener('keyup', (e) => { keys[e.key] = false; });
    
    // Store keys globally
    window.gameKeys = keys;
    
    const gameKeys = window.gameKeys || {};
    
    let targetAngle = car.angle;
    let targetAccel = 0;
    
    if (gameKeys['ArrowUp'] || gameKeys['w'] || gameKeys['W']) targetAccel = 1;
    if (gameKeys['ArrowDown'] || gameKeys['s'] || gameKeys['S']) targetAccel = -0.5;
    if (gameKeys['ArrowLeft'] || gameKeys['a'] || gameKeys['A']) targetAngle -= 0.1;
    if (gameKeys['ArrowRight'] || gameKeys['d'] || gameKeys['D']) targetAngle += 0.1;
    
    car.acceleration = targetAccel * car.acceleration;
    car.speed = Math.max(-3, Math.min(car.speed + car.acceleration, car.speed));
    car.angle = targetAngle;
    
    car.x += Math.cos(car.angle) * car.speed * 2;
    car.y += Math.sin(car.angle) * car.speed * 2;
    
    updateWaypoint(car, track);
}

function updateAICar(car, track) {
    const nextWaypoint = track.waypoints[car.currentWaypoint % track.waypoints.length];
    const dx = nextWaypoint.x - car.x;
    const dy = nextWaypoint.y - car.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    
    // Calculate target angle
    const targetAngle = Math.atan2(dy, dx);
    const angleDiff = targetAngle - car.angle;
    
    // Smooth angle change
    car.angle += Math.max(-0.05, Math.min(0.05, angleDiff)) * car.handling;
    
    // Accelerate
    car.speed = Math.min(car.speed + car.acceleration * 0.5, car.speed);
    
    // Update position
    car.x += Math.cos(car.angle) * car.speed * 2;
    car.y += Math.sin(car.angle) * car.speed * 2;
    
    updateWaypoint(car, track);
}

function updateWaypoint(car, track) {
    const waypoint = track.waypoints[car.currentWaypoint];
    const dx = waypoint.x - car.x;
    const dy = waypoint.y - car.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    
    if (distance < WAYPOINT_RADIUS) {
        car.currentWaypoint++;
        if (car.currentWaypoint % track.waypoints.length === 0) {
            car.lapsCompleted++;
            if (car.lapsCompleted >= TOTAL_LAPS) {
                car.finished = true;
            }
        }
    }
}

function updateHUD(car, track) {
    const elapsed = Math.floor((Date.now() - gameStartTime) / 1000);
    const minutes = Math.floor(elapsed / 60);
    const seconds = elapsed % 60;
    
    document.getElementById('speedometer').textContent = Math.round(Math.abs(car.speed * 10));
    document.getElementById('lapCounter').textContent = `${car.lapsCompleted + 1}/${TOTAL_LAPS}`;
    document.getElementById('timer').textContent = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
    
    const allCars = [car, ...aiCars];
    const position = allCars.filter(c => c.lapsCompleted > car.lapsCompleted || 
        (c.lapsCompleted === car.lapsCompleted && c.currentWaypoint > car.currentWaypoint)).length + 1;
    document.getElementById('position').textContent = `${position}/${allCars.length}`;
}

function endRace() {
    gameRunning = false;
    const allCars = [...players, ...aiCars];
    
    const results = allCars
        .map((car, index) => ({
            ...car,
            index,
            finalLaps: car.lapsCompleted,
            finalWaypoint: car.currentWaypoint
        }))
        .sort((a, b) => {
            if (b.finalLaps !== a.finalLaps) return b.finalLaps - a.finalLaps;
            return b.finalWaypoint - a.finalWaypoint;
        });
    
    const resultsDiv = document.getElementById('raceResults');
    resultsDiv.innerHTML = '';
    results.forEach((car, position) => {
        const div = document.createElement('div');
        div.className = `result-item ${position === 0 ? 'winner' : ''}`;
        div.innerHTML = `${position + 1}. ${car.emoji} ${car.name} - Laps: ${car.finalLaps + 1}/${TOTAL_LAPS}`;
        resultsDiv.appendChild(div);
    });
    
    document.getElementById('gameOverScreen').classList.remove('hidden');
}
