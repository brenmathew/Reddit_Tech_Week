class PianoTiles {
    constructor() {
        debug('PianoTiles constructor started');
        
        this.canvas = document.getElementById('gameCanvas');
        if (!this.canvas) {
            debug('Error: Canvas element not found!');
            return;
        }
        
        this.ctx = this.canvas.getContext('2d');
        if (!this.ctx) {
            debug('Error: Could not get canvas context!');
            return;
        }
        
        debug('Canvas setup successful');
        
        this.score = 0;
        this.gameOver = false;
        this.tiles = [];
        this.tileSpeed = 3;
        this.lastTime = 0;
        this.nextTileIndex = 0;
        
        // Initialize audio on user interaction
        const initAudio = () => {
            if (!this.audioContext) {
                debug('Initializing audio context...');
                this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
                this.loadAudioSamples();
                // Remove the event listeners once audio is initialized
                document.removeEventListener('click', initAudio);
                document.removeEventListener('keydown', initAudio);
                debug('Audio context initialized');
            }
        };

        // Add event listeners for audio initialization
        document.addEventListener('click', initAudio);
        document.addEventListener('keydown', initAudio);
        
        // Für Elise pattern (main theme)
        this.furElisePattern = [
            { note: 'E5', lane: 0 },
            { note: 'Eb5', lane: 1 },
            { note: 'E5', lane: 0 },
            { note: 'Eb5', lane: 1 },
            { note: 'E5', lane: 0 },
            { note: 'B4', lane: 2 },
            { note: 'D5', lane: 3 },
            { note: 'C5', lane: 1 },
            { note: 'A4', lane: 0 }
        ];
        this.patternIndex = 0;
        
        // Audio setup
        this.notes = {};
        this.notesLoaded = 0;
        this.totalNotes = 6; // Total number of notes we're loading
        
        // Set canvas size
        this.canvas.width = 400;
        this.canvas.height = 600;
        
        // Calculate lane width
        this.laneWidth = this.canvas.width / 4;
        
        // Lane colors for visual feedback
        this.laneColors = Array(4).fill('#272729'); // Reddit gray
        
        // UI elements
        this.scoreElement = document.getElementById('score');
        this.gameOverScreen = document.getElementById('gameOver');
        this.finalScoreElement = document.getElementById('finalScore');
        this.startButton = document.getElementById('startButton');
        this.restartButton = document.getElementById('restartButton');
        this.shareButton = document.getElementById('shareButton');
        
        if (!this.scoreElement || !this.gameOverScreen || !this.finalScoreElement || 
            !this.startButton || !this.restartButton || !this.shareButton) {
            debug('Error: Some UI elements not found!');
            return;
        }
        
        debug('UI elements setup successful');
        
        // Setup event listeners
        this.setupEventListeners();
        
        // Draw initial state
        this.drawEmptyGame();
        
        debug('Game initialized successfully');
    }

    setupEventListeners() {
        // Add keyboard event listener
        document.addEventListener('keydown', (e) => this.handleKeyPress(e));
        this.startButton.addEventListener('click', () => {
            debug('Start button clicked');
            this.startGame();
        });
        this.restartButton.addEventListener('click', () => {
            debug('Restart button clicked');
            this.startGame();
        });
        this.shareButton.addEventListener('click', () => this.shareScore());
        debug('Event listeners setup successful');
    }

    drawEmptyGame() {
        // Clear canvas
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        this.drawLanes();
    }

    drawLanes() {
        for (let i = 0; i < 4; i++) {
            // Draw lane background
            this.ctx.fillStyle = this.laneColors[i];
            this.ctx.fillRect(i * this.laneWidth, 0, this.laneWidth, this.canvas.height);
            
            // Draw lane separator
            this.ctx.strokeStyle = '#1A1A1B';
            this.ctx.beginPath();
            this.ctx.moveTo(i * this.laneWidth, 0);
            this.ctx.lineTo(i * this.laneWidth, this.canvas.height);
            this.ctx.stroke();
        }
    }

    handleKeyPress(e) {
        if (this.gameOver) return;

        let lane = -1;
        switch(e.key) {
            case 'ArrowLeft':
                lane = 0;
                break;
            case 'ArrowUp':
                lane = 1;
                break;
            case 'ArrowDown':
                lane = 2;
                break;
            case 'ArrowRight':
                lane = 3;
                break;
            default:
                return;
        }

        debug(`Key pressed: ${e.key}, Lane: ${lane}`);
        this.flashLane(lane);
        this.checkTileInLane(lane);
    }

    flashLane(lane) {
        this.laneColors[lane] = '#FF4500'; // Reddit orange
        setTimeout(() => {
            this.laneColors[lane] = '#272729'; // Back to Reddit gray
        }, 100);
    }

    checkTileInLane(lane) {
        if (this.tiles.length === 0) return;

        const nextTile = this.tiles[this.nextTileIndex];
        const tileLane = Math.floor(nextTile.x / this.laneWidth);

        debug(`Checking tile in lane ${lane}, Expected lane: ${tileLane}`);

        if (tileLane === lane && nextTile.active) {
            // Play the corresponding note from Für Elise pattern
            this.playNote(nextTile.note);

            // Correct tile hit
            nextTile.active = false;
            this.score += 1;
            this.showPointsAnimation(nextTile.x, nextTile.y, 1);
            this.nextTileIndex++;
            debug(`Tile popped! Score: ${this.score}`);
        }
        
        this.updateScore();
    }

    showPointsAnimation(x, y, points) {
        this.ctx.save();
        this.ctx.fillStyle = '#FF8b60';
        this.ctx.font = '20px IBM Plex Sans';
        this.ctx.fillText('+1', x, y);
        this.ctx.restore();
    }

    startGame() {
        debug('Starting new game');
        // Initialize audio if not already done
        if (!this.audioContext) {
            debug('Initializing audio for game start...');
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
            this.loadAudioSamples();
        }
        
        this.score = 0;
        this.gameOver = false;
        this.tiles = [];
        this.tileSpeed = 3;
        this.nextTileIndex = 0;
        
        this.gameOverScreen.classList.add('hidden');
        this.shareButton.classList.add('hidden');
        this.startButton.classList.add('hidden');

        this.createInitialTiles();
        debug(`Created ${this.tiles.length} initial tiles`);
        
        requestAnimationFrame((timestamp) => this.gameLoop(timestamp));
    }

    createInitialTiles() {
        // Create tiles based on Für Elise pattern
        for (let i = 0; i < 4; i++) {
            const patternNote = this.furElisePattern[(this.patternIndex + i) % this.furElisePattern.length];
            this.tiles.push({
                x: patternNote.lane * this.laneWidth,
                y: -100 - (i * 150),
                width: this.laneWidth,
                height: 100,
                active: true,
                note: patternNote.note
            });
        }
        this.patternIndex = (this.patternIndex + 4) % this.furElisePattern.length;
    }

    updateScore() {
        this.scoreElement.textContent = this.score;
    }

    endGame() {
        debug(`Game Over! Final Score: ${this.score}`);
        this.gameOver = true;
        this.finalScoreElement.textContent = this.score;
        this.gameOverScreen.classList.remove('hidden');
        this.shareButton.classList.remove('hidden');
    }

    shareScore() {
        const text = `Just earned ${this.score} karma in Reddit Piano Tiles! Can you beat my score?`;
        alert('Reddit integration coming soon!\n\n' + text);
    }

    gameLoop(timestamp) {
        if (this.gameOver) return;

        // Clear canvas
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        // Draw lane separators and backgrounds
        this.drawLanes();

        // Update and draw tiles
        let activeTilesExist = false;
        let allTilesPastBottom = true;
        for (let tile of this.tiles) {
            if (tile.active) {
                activeTilesExist = true;
                tile.y += this.tileSpeed;

                // Draw tile
                if (tile === this.tiles[this.nextTileIndex]) {
                    this.ctx.fillStyle = '#FF4500'; // Reddit orange for next tile
                } else {
                    this.ctx.fillStyle = '#FF8b60'; // Light orange for other tiles
                }
                this.ctx.fillRect(tile.x, tile.y, tile.width, tile.height);

                // Check if any tile is still visible
                if (tile.y <= this.canvas.height) {
                    allTilesPastBottom = false;
                }
            }
        }

        // End game only if all tiles are past bottom
        if (activeTilesExist && allTilesPastBottom) {
            this.endGame();
            return;
        }

        // Create new tiles when all current ones are gone
        if (!activeTilesExist) {
            this.tiles = [];
            this.nextTileIndex = 0;
            this.createInitialTiles();
            this.tileSpeed += 0.2; // Smaller speed increase
        }

        requestAnimationFrame((timestamp) => this.gameLoop(timestamp));
    }

    loadAudioSamples() {
        debug('Starting to load audio samples...');
        // Load audio files
        const noteFiles = {
            'E5': 'https://raw.githubusercontent.com/gleitz/midi-js-soundfonts/gh-pages/FatBoy/piano-mp3/E5.mp3',
            'Eb5': 'https://raw.githubusercontent.com/gleitz/midi-js-soundfonts/gh-pages/FatBoy/piano-mp3/Eb5.mp3',
            'D5': 'https://raw.githubusercontent.com/gleitz/midi-js-soundfonts/gh-pages/FatBoy/piano-mp3/D5.mp3',
            'C5': 'https://raw.githubusercontent.com/gleitz/midi-js-soundfonts/gh-pages/FatBoy/piano-mp3/C5.mp3',
            'B4': 'https://raw.githubusercontent.com/gleitz/midi-js-soundfonts/gh-pages/FatBoy/piano-mp3/B4.mp3',
            'A4': 'https://raw.githubusercontent.com/gleitz/midi-js-soundfonts/gh-pages/FatBoy/piano-mp3/A4.mp3'
        };

        // Load all notes
        Object.entries(noteFiles).forEach(([note, url]) => {
            debug(`Loading note: ${note}`);
            fetch(url)
                .then(response => {
                    if (!response.ok) {
                        throw new Error(`HTTP error! status: ${response.status}`);
                    }
                    return response.arrayBuffer();
                })
                .then(arrayBuffer => this.audioContext.decodeAudioData(arrayBuffer))
                .then(audioBuffer => {
                    this.notes[note] = audioBuffer;
                    this.notesLoaded++;
                    debug(`Loaded note ${note} (${this.notesLoaded}/${this.totalNotes})`);
                })
                .catch(error => {
                    console.error('Error loading audio:', error);
                    debug(`Failed to load note ${note}: ${error.message}`);
                });
        });
    }

    playNote(note) {
        if (!this.audioContext) {
            debug('Audio context not initialized');
            return;
        }

        if (this.audioContext.state === 'suspended') {
            debug('Resuming audio context...');
            this.audioContext.resume();
        }
        
        if (this.notes[note]) {
            try {
                const source = this.audioContext.createBufferSource();
                const gainNode = this.audioContext.createGain();
                
                source.buffer = this.notes[note];
                gainNode.gain.value = 0.5; // Fixed volume
                
                source.connect(gainNode);
                gainNode.connect(this.audioContext.destination);
                
                source.start(0);
                debug(`Playing note: ${note}`);
            } catch (error) {
                debug(`Error playing note ${note}: ${error.message}`);
            }
        } else {
            debug(`Note not loaded: ${note}`);
        }
    }
}

// Initialize game when window loads
window.addEventListener('load', () => {
    debug('Window loaded, creating PianoTiles instance');
    const game = new PianoTiles();
}); 