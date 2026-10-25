// ==========================================
// 1. CONFIGURATION & VARIABLES GLOBALES
// ==========================================
let isMobileMode = false;
const mobileInput = document.getElementById('mobile-input');
const kbTrigger = document.getElementById('keyboard-trigger');

const container = document.getElementById('game-container');
const scoreElement = document.getElementById('score');
const levelElement = document.getElementById('level');
const streakElement = document.getElementById('streak');
const comboMultiplierElement = document.getElementById('combo-multiplier');
const highScoreElement = document.getElementById('high-score');
const playerShip = document.getElementById('player-ship');
const gameOverScreen = document.getElementById('game-over-screen');
const screenTitle = document.getElementById('screen-title');
const screenStats = document.getElementById('screen-stats');
const restartBtn = document.getElementById('restart-btn');

const wordList = [
    "RAT", "COQ", "RENARD", "FOURMI", "CHEVAL", "CHIEN", "GIRAFE", "REQUIN", "SOURIS", "OISEAU",
    "SINGE", "TIGRE", "LION", "OURS", "LAPIN", "MOUTON", "CANARD", "DAUPHIN", "BALEINE", "PANDA",
    "DESERT", "JUNGLE", "FLEUVE", "OCEAN", "NATURE", "ANIMAL", "PLANTE", "FORET", "ESPACE", "PLANETE",
    "ETOILE", "FUSEE", "MOTEUR", "VOLCAN", "MONTAGNE", "CAMPAGNE", "UNIVERS", "GALAXIE", "ASTEROIDE",
    "LIVRE", "COURS", "TEXTE", "CODE", "ROBOT", "CLASSE", "ECOLE", "CAHIER", "CRAYON", "PAPIER",
    "DESSIN", "DICTEE", "REGLE", "BUREAU", "LECON", "CALCUL", "LOGIQUE", "SCIENCE", "HISTOIRE",
    "LECTURE", "ECRITURE", "FENETRE", "TABLEAU", "COMPTEUR", "EXERCICE", "GYMNASE", "JEUNESSE",
    "JEU", "OR", "ROI", "PIRATE", "NAVRE", "MAGIE", "DRAGON", "DONJON", "MONSTRE", "ZOMBIE",
    "FANTOME", "SORCIER", "TRESOR", "CHATEAU", "CHASSEUR", "BOUSSOLE", "SQUELETTE", "CHEVALIER",
    "LEGENDE", "MYSTERE", "VICTOIRE", "COMBAT", "DEFENSE", "MISSION", "TACTIQUE", "COURAGE",
    "PAIN", "EAU", "REPAS", "POMME", "TABLE", "CHAISE", "PORTE", "AVION", "BALLON", "BATEAU",
    "MONTRE", "PANIER", "VALISE", "JOURNAL", "MAISON", "VOITURE", "GUITARE", "MUSIQUE", "HORLOGE",
    "LAMPE", "FENETRE", "VETEMENT", "TELEPHONE", "ORDINATEUR", "VELO", "TRAIN", "CAMION",
    "VOIR", "FAIRE", "DIRE", "LIRE", "JOUER", "TAPER", "PARLER", "MARCHER", "COURIR", "SAUTER",
    "NAGER", "VOLER", "AIMER", "AIDER", "REVER", "ECRIRE", "PENSER", "TROUVER", "GAGNER", "PERDRE",
    "CHOISIR", "GRANDIR", "REUSSIR", "PARTAGER", "COOPERER", "DECOUVRIR", "INVENTER",
    "BON", "BEAU", "FORT", "VITE", "GRAND", "PETIT", "RAPIDE", "SOLIDE", "CALME", "JOYEUX",
    "SOLAIRE", "SPATIAL", "SUPERBE", "VISIBLE", "RAPIDE", "BRILANT", "MAGNIQUE", "AMUSANT",
    "LOGIQUE", "GENIAL", "AGILE", "HABILE", "BRAVE", "FRANC", "FUTE", "PROPRE"
];

let activeWords = [];
let targetedWord = null; 
let lasers = [];
let gameInterval = null;
let spawnTimer = 0;
let score = 0;
let level = 1;
let wordsDestroyedInLevel = 0;
let highScore = localStorage.getItem('typing_shooter_highscore') || 0;
let isPlaying = false;
let currentCombo = 0;          
let scoreMultiplier = 1;       

if (highScoreElement) highScoreElement.innerText = highScore;

function getDifficultySettings() {
    return {
        maxWordsOnScreen: Math.min(1 + Math.floor(level / 2), 5), 
        spawnDelay: Math.max(180 - (level * 20), 70),             
        wordSpeed: 0.6 + (level * 0.15),                          
        wordsToNextLevel: 5 + (level * 2)                         
    };
}

// ==========================================
// 2. MOTEUR AUDIO (SYNTHÉTISEUR)
// ==========================================
let audioCtx = null;
let musicInterval = null;
const synthMelody = [
    110, 110, 130, 110, 146, 146, 130, 165,
    110, 110, 130, 110, 196, 196, 165, 130
];
let currentNoteIndex = 0;

function startCyberpunkMusic() {
    if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    if (musicInterval) clearInterval(musicInterval);
    musicInterval = setInterval(() => {
        if (!isPlaying) return;
        const freq = synthMelody[currentNoteIndex];
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(freq, audioCtx.currentTime);
        gain.gain.setValueAtTime(0.03, audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.22);
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        osc.start();
        osc.stop(audioCtx.currentTime + 0.25);
        currentNoteIndex = (currentNoteIndex + 1) % synthMelody.length;
    }, 250);
}

function playLaserSound() {
    if (!audioCtx) return;
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(880, audioCtx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(110, audioCtx.currentTime + 0.12);
    gain.gain.setValueAtTime(0.03, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.12);
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.start();
    osc.stop(audioCtx.currentTime + 0.12);
}

function playExplosionSound() {
    if (!audioCtx) return;
    const bufferSize = audioCtx.sampleRate * 0.3;
    const buffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;
    const noiseNode = audioCtx.createBufferSource();
    noiseNode.buffer = buffer;
    const filter = audioCtx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(600, audioCtx.currentTime);
    filter.frequency.exponentialRampToValueAtTime(10, audioCtx.currentTime + 0.3);
    const gain = audioCtx.createGain();
    gain.gain.setValueAtTime(0.12, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.3);
    noiseNode.connect(filter);
    filter.connect(gain);
    gain.connect(audioCtx.destination);
    noiseNode.start();
    noiseNode.stop(audioCtx.currentTime + 0.3);
}
// ==========================================
// 3. EFFETS VISUELS & ARSENAL
// ==========================================
function createExplosion(x, y, color = '#f43f5e') {
    if (!container) return;
    const particleCount = 6;
    for (let i = 0; i < particleCount; i++) {
        const particle = document.createElement('div');
        particle.style.position = 'absolute';
        particle.style.width = '4px';
        particle.style.height = '4px';
        particle.style.left = x + 'px';
        particle.style.top = y + 'px';
        particle.style.backgroundColor = color;
        particle.style.borderRadius = '50%';
        container.appendChild(particle);

        const angle = Math.random() * Math.PI * 2;
        const speed = Math.random() * 3 + 2;
        let px = x;
        let py = y;

        let pInterval = setInterval(() => {
            px += Math.cos(angle) * speed;
            py += Math.sin(angle) * speed;
            particle.style.left = px + 'px';
            particle.style.top = py + 'px';
        }, 1000 / 60);

        setTimeout(() => {
            clearInterval(pInterval);
            if (particle && container.contains(particle)) container.removeChild(particle);
        }, 300);
    }
}

function createLaser(startX, startY, targetX, targetY, wordTarget, letterIndex) {
    const laserEl = document.createElement('div');
    laserEl.style.position = 'absolute';
    laserEl.style.width = '4px';
    laserEl.style.height = '12px';
    laserEl.style.background = '#f43f5e';
    laserEl.style.boxShadow = '0 0 6px #f43f5e';
    laserEl.style.borderRadius = '2px';
    laserEl.style.left = startX + 'px';
    laserEl.style.top = startY + 'px';
    if (container) container.appendChild(laserEl);
    
    lasers.push({
        element: laserEl,
        x: startX,
        y: startY,
        targetX: targetX,
        targetY: targetY,
        wordTarget: wordTarget,
        letterIndex: letterIndex
    });
    playLaserSound();
}

function spawnWord() {
    if (!isPlaying) return;
    const settings = getDifficultySettings();
    if (activeWords.length >= settings.maxWordsOnScreen) return;

    const randomText = wordList[Math.floor(Math.random() * wordList.length)].toUpperCase();
    const wordElement = document.createElement('div');
    wordElement.className = 'word-container';
    wordElement.innerHTML = randomText.split('').map((letter, index) => {
        return `<span id="letter-${index}" class="letter">${letter}</span>`;
    }).join('');
    
    if (container) container.appendChild(wordElement);

    const wordWidth = wordElement.getBoundingClientRect().width || 80;
    let minX = 40 + wordWidth / 2;
    let maxX = window.innerWidth - 40 - wordWidth / 2;
    
    if (isMobileMode) {
        minX = 25 + wordWidth / 2;
        maxX = Math.min(window.innerWidth, 400) - 25 - wordWidth / 2;
    }
    if (minX > maxX) { minX = 15; maxX = window.innerWidth - 15; }

    const randomX = Math.random() * (maxX - minX) + minX;
    const startY = isMobileMode ? 95 : 60;

    wordElement.style.left = `${randomX}px`;
    wordElement.style.top = `${startY}px`;

    activeWords.push({
        text: randomText,
        element: wordElement,
        x: randomX,
        y: startY,
        typedIndex: 0
    });
    refreshTargetableHelpers();
}

// ==========================================
// 4. ÉTATS DU JEU
// ==========================================
function startGame() {
    isPlaying = true;
    currentNoteIndex = 0;
    currentCombo = 0;
    scoreMultiplier = 1;
    startCyberpunkMusic();

    activeWords.forEach(w => { if (w.element && container.contains(w.element)) container.removeChild(w.element); });
    lasers.forEach(l => { if (l.element && container.contains(l.element)) container.removeChild(l.element); });

    activeWords = [];
    lasers = [];
    targetedWord = null;
    score = 0;
    level = 1;
    wordsDestroyedInLevel = 0;
    spawnTimer = 0;

    if (scoreElement) scoreElement.innerText = score;
    if (levelElement) levelElement.innerText = level;
    
    if (comboMultiplierElement) {
        comboMultiplierElement.innerText = "x1";
        comboMultiplierElement.style.color = "#22d3ee";
    }

    const settings = getDifficultySettings();
    if (streakElement) streakElement.innerText = `0/${settings.wordsToNextLevel}`;
    
    if (gameOverScreen) gameOverScreen.classList.add('hidden');
    if (playerShip) playerShip.style.left = '50%';

    if(gameInterval) clearInterval(gameInterval);
    gameInterval = setInterval(updateGame, 1000 / 60);

    if (isMobileMode && mobileInput) {
        setTimeout(() => { mobileInput.value = ""; mobileInput.focus(); }, 300);
    }
}

function triggerGameOver() {
    isPlaying = false;
    clearInterval(gameInterval);
    if (musicInterval) clearInterval(musicInterval);
    
    if (score > highScore) {
        highScore = score;
        localStorage.setItem('typing_shooter_highscore', highScore);
        if (highScoreElement) highScoreElement.innerText = highScore;
    }

    const deviceSelection = document.getElementById('device-selection');
    if (deviceSelection) deviceSelection.style.display = 'flex';
    if (restartBtn) restartBtn.style.display = 'none';

    if (screenTitle) screenTitle.innerText = "GAME OVER";
    if (screenStats) screenStats.innerHTML = `Vous avez atteint le niveau <span>${level}</span><br>Score Final : <span>${score}</span>`;
    if (gameOverScreen) gameOverScreen.classList.remove('hidden');
}

// ÉCOUTEURS DU MENU D'ACCUEIL
document.getElementById('btn-pc').addEventListener('click', () => {
    isMobileMode = false;
    document.body.classList.remove('mode-mobile');
    if (kbTrigger) kbTrigger.style.display = 'none';
    startGame();
});

document.getElementById('btn-mobile').addEventListener('click', () => {
    isMobileMode = true;
    document.body.classList.add('mode-mobile');
    if (kbTrigger) kbTrigger.style.display = 'block';
    startGame();
});

if (kbTrigger) {
    kbTrigger.addEventListener('click', (e) => {
        e.stopPropagation();
        if (mobileInput) mobileInput.focus();
    });
}
if (container) {
    container.addEventListener('click', () => { 
        if(isPlaying && isMobileMode && mobileInput) mobileInput.focus(); 
    });
}
// ==========================================
// 5. BOUCLE DE RENDU PRINCIPALE (MOUVEMENTS)
// ==========================================
function updateGame() {
    if (!isPlaying) return;

    const settings = getDifficultySettings();
    spawnTimer++;
    if (spawnTimer >= settings.spawnDelay) {
        spawnWord();
        spawnTimer = 0;
    }

    for (let i = activeWords.length - 1; i >= 0; i--) {
        let w = activeWords[i];
        w.y += settings.wordSpeed;
        if (w.element) {
            w.element.style.top = w.y + 'px';
            w.element.style.left = w.x + 'px';
        }

        const limitY = window.innerHeight - 90;
        if (w.y >= limitY) {
            triggerGameOver();
            return;
        }
    }

    for (let i = lasers.length - 1; i >= 0; i--) {
        let l = lasers[i];
        const dx = l.targetX - l.x;
        const dy = l.targetY - l.y;
        const distance = Math.sqrt(dx * dx + dy * dy);

        if (distance > 15) {
            l.x += (dx / distance) * 15;
            l.y += (dy / distance) * 15;
            if (l.element) {
                l.element.style.left = l.x + 'px';
                l.element.style.top = l.y + 'px';
            }
        } else {
            if (l.element && container.contains(l.element)) container.removeChild(l.element);
            createExplosion(l.targetX, l.targetY, '#22d3ee');
            
            if (l.wordTarget && l.wordTarget.element) {
                const letterEl = l.wordTarget.element.querySelector(`#letter-${l.letterIndex}`);
                if (letterEl) letterEl.className = 'letter destroyed';

                if (l.wordTarget.typedIndex === l.wordTarget.text.length) {
                    score += l.wordTarget.text.length * scoreMultiplier;
                    wordsDestroyedInLevel++;
                    if (scoreElement) scoreElement.innerText = score;

                    if (container.contains(l.wordTarget.element)) container.removeChild(l.wordTarget.element);
                    const wordIdx = activeWords.indexOf(l.wordTarget);
                    if (wordIdx > -1) activeWords.splice(wordIdx, 1);
                    if (targetedWord === l.wordTarget) targetedWord = null;

                    // == ICI : REACTION AU CHANGEMENT DE NIVEAU ==
                    if (wordsDestroyedInLevel >= settings.wordsToNextLevel) {
                        level++;
                        wordsDestroyedInLevel = 0;
                        if (levelElement) levelElement.innerText = level;

                        // On nettoie tous les autres mots restants à l'écran
                        activeWords.forEach(w => {
                            if (w.element && container && container.contains(w.element)) {
                                container.removeChild(w.element);
                            }
                        });
                        activeWords = [];
                        targetedWord = null;

                        // Petit effet visuel bonus pour fêter ça
                        createExplosion(window.innerWidth / 2, window.innerHeight / 2, '#38bdf8');
                    }
                    
                    playExplosionSound();
                    refreshTargetableHelpers();
                }
            }
            lasers.splice(i, 1);
            continue;
        }

        if (l.y < 0 || l.x < 0 || l.x > window.innerWidth) {
            if (l.element && container.contains(l.element)) container.removeChild(l.element);
            lasers.splice(i, 1);
        }
    }
}


function refreshTargetableHelpers() {
    if (targetedWord) return;
    activeWords.forEach(w => {
        const firstLetter = w.element.querySelector('#letter-0');
        if(firstLetter && !firstLetter.classList.contains('destroyed')) {
            firstLetter.className = 'letter targetable';
        }
    });
}

// ==========================================
// 6. ÉVÉNEMENTS CLAVIER UNIFIÉS
// ==========================================
window.addEventListener('keydown', (e) => {
    if (!isPlaying || e.key.length !== 1) return;
    const keyPressed = e.key.toUpperCase(); if (!playerShip) return;
    const shipRect = playerShip.getBoundingClientRect(); 
    const shipX = shipRect.left + shipRect.width / 2; 
    const shipY = shipRect.top + shipRect.height / 2;
    let toucheCorrecte = false;

    if (targetedWord) {
        const expectedLetter = targetedWord.text[targetedWord.typedIndex];
        if (keyPressed === expectedLetter) {
            toucheCorrecte = true;
            const letterElement = targetedWord.element.querySelector(`#letter-${targetedWord.typedIndex}`);
            if (letterElement) letterElement.className = 'letter active';
            const letterRect = letterElement.getBoundingClientRect();
            
            createLaser(shipX, shipY, letterRect.left + letterRect.width / 2, letterRect.top + letterRect.height / 2, targetedWord, targetedWord.typedIndex);
            targetedWord.typedIndex++;

            if (targetedWord.typedIndex === targetedWord.text.length) targetedWord = null;
        }
    } else {
        for (let w of activeWords) {
            if (w.typedIndex > 0 && w.text[w.typedIndex] === keyPressed) {
                toucheCorrecte = true;
                targetedWord = w;
                break;
            }
        }
        if (!toucheCorrecte) {
            for (let w of activeWords) {
                if (w.typedIndex === 0 && w.text[0] === keyPressed) {
                    toucheCorrecte = true;
                    targetedWord = w;
                    break;
                }
            }
        }
        if (toucheCorrecte && targetedWord) {
            activeWords.forEach(word => { 
                if (word !== targetedWord) { 
                    const currentLetter = word.element.querySelector(`#letter-${word.typedIndex}`); 
                    if (currentLetter) currentLetter.className = 'letter'; 
                } 
            });

            const currentIndex = targetedWord.typedIndex;
            const letterElement = targetedWord.element.querySelector(`#letter-${currentIndex}`);
            if (letterElement) letterElement.className = 'letter active';
            const letterRect = letterElement.getBoundingClientRect();
            
            createLaser(shipX, shipY, letterRect.left + letterRect.width / 2, letterRect.top + letterRect.height / 2, targetedWord, currentIndex);
            targetedWord.typedIndex++;

            if (targetedWord.typedIndex === targetedWord.text.length) targetedWord = null;
        }
    }

    if (toucheCorrecte) {
        currentCombo++;
        if (currentCombo >= 30) scoreMultiplier = 4;
        else if (currentCombo >= 20) scoreMultiplier = 3;
        else if (currentCombo >= 10) scoreMultiplier = 2;
        else scoreMultiplier = 1;
        
        if (comboMultiplierElement) {
            comboMultiplierElement.innerText = `x${scoreMultiplier}`;
            if (scoreMultiplier === 4) comboMultiplierElement.style.color = "#f43f5e";
            else if (scoreMultiplier === 3) comboMultiplierElement.style.color = "#eab308";
            else if (scoreMultiplier === 2) comboMultiplierElement.style.color = "#a855f7";
            else comboMultiplierElement.style.color = "#22d3ee";
        }
    } else {
        currentCombo = 0; scoreMultiplier = 1;
        if (comboMultiplierElement) { comboMultiplierElement.innerText = "x1"; comboMultiplierElement.style.color = "#64748b"; }
    }
});

if (mobileInput) {
    mobileInput.addEventListener('input', (e) => {
        if (!isPlaying) return;
        const text = e.target.value;
        if (text.length > 0) {
            const lastChar = text[text.length - 1];
            window.dispatchEvent(new KeyboardEvent('keydown', { key: lastChar }));
            mobileInput.value = ""; 
        }
    });
}
