const mobileInput = document.getElementById('mobile-input');
// ==========================================
// 1. CONFIGURATION & VARIABLES GLOBALES
// ==========================================
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
if (restartBtn) restartBtn.addEventListener('click', startGame);

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
        gain.gain.setValueAtTime(0.05, audioCtx.currentTime);
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
    gain.gain.setValueAtTime(0.04, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.12);
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.start();
    osc.stop(audioCtx.currentTime + 0.12);
}

function playExplosionSound() {
    if (!audioCtx) return;
    const bufferSize = audioCtx.sampleRate * 0.4;
    const buffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;

    const noiseNode = audioCtx.createBufferSource();
    noiseNode.buffer = buffer;
    const filter = audioCtx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(800, audioCtx.currentTime);
    filter.frequency.exponentialRampToValueAtTime(10, audioCtx.currentTime + 0.4);
    const gain = audioCtx.createGain();
    gain.gain.setValueAtTime(0.15, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.4);
    noiseNode.connect(filter);
    filter.connect(gain);
    gain.connect(audioCtx.destination);
    noiseNode.start();
    noiseNode.stop(audioCtx.currentTime + 0.4);
}
// ==========================================
// 3. EFFETS VISUELS (JUICE)
// ==========================================
function triggerScreenShake() {
    if (!container) return;
    container.classList.remove('shake-active');
    void container.offsetWidth; 
    container.classList.add('shake-active');
    setTimeout(() => { container.classList.remove('shake-active'); }, 200);
}

function createExplosion(x, y, color = '#f43f5e') {
    if (!container) return;
    const particleCount = 8;
    for (let i = 0; i < particleCount; i++) {
        const particle = document.createElement('div');
        particle.className = 'particle';
        particle.style.left = x + 'px';
        particle.style.top = y + 'px';
        particle.style.backgroundColor = color;
        particle.style.boxShadow = `0 0 8px ${color}`;

        const angle = Math.random() * Math.PI * 2;
        const distance = Math.random() * 40 + 20;
        const moveX = Math.cos(angle) * distance;
        const moveY = Math.sin(angle) * distance;

        particle.style.setProperty('--mx', `${moveX}px`);
        particle.style.setProperty('--my', `${moveY}px`);
        container.appendChild(particle);

        setTimeout(() => {
            if (particle && container.contains(particle)) container.removeChild(particle);
        }, 400);
    }
}
// ==========================================
// 4. ÉTATS DU JEU & LOGIQUE DES BONUS
// ==========================================
function startGame() {
    isPlaying = true;
    currentNoteIndex = 0;
    currentCombo = 0;
    scoreMultiplier = 1;
    startCyberpunkMusic();

    activeWords.forEach(w => { if (w.element && container && container.contains(w.element)) container.removeChild(w.element); });
    lasers.forEach(l => { if (l.element && container && container.contains(l.element)) container.removeChild(l.element); });

    activeWords = [];
    lasers = [];
    targetedWord = null;
    score = 0;
    level = 1;
    wordsDestroyedInLevel = 0;
    spawnTimer = 0;

    if (scoreElement) scoreElement.innerText = score;
    if (levelElement) levelElement.innerText = level;
    
    const displayElement = comboMultiplierElement || streakElement;
    if (displayElement) {
        displayElement.innerText = "x1";
        displayElement.style.color = "#22d3ee";
    }

    const settings = getDifficultySettings();
    if (streakElement) streakElement.innerText = `0/${settings.wordsToNextLevel}`;
    
    if (gameOverScreen) gameOverScreen.classList.add('hidden');
    if (playerShip) {
        playerShip.style.transform = 'translateX(-50%) rotate(0deg)';
        playerShip.style.left = '50%';
    }

    if(gameInterval) clearInterval(gameInterval);
    gameInterval = setInterval(updateGame, 1000 / 60);

    // ACTIVER LE CLAVIER MOBILE : Force le focus sur l'input invisible au lancement
    if (mobileInput) {
        mobileInput.value = "";
        mobileInput.focus();
    }
    
    // Si l'utilisateur clique sur l'écran en cours de partie, on lui remet le clavier
    if (container) {
        container.addEventListener('click', () => { 
            if(isPlaying && mobileInput) mobileInput.focus(); 
        });
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

    if (screenTitle) screenTitle.innerText = "GAME OVER";
    if (screenStats) screenStats.innerHTML = `Vous avez atteint le niveau <span>${level}</span><br>Score Final : <span>${score}</span><br>Meilleur Score : <span>${highScore}</span>`;
    if (restartBtn) restartBtn.innerText = "REPLAY";
    if (gameOverScreen) gameOverScreen.classList.remove('hidden');
}

function triggerBonusBomb() {
    triggerScreenShake();
    createExplosion(window.innerWidth / 2, window.innerHeight / 2, '#eab308');
    
    activeWords.forEach(w => {
        score += 5 * scoreMultiplier;
        wordsDestroyedInLevel++;
        if (w.element && container && container.contains(w.element)) container.removeChild(w.element);
    });
    
    if (scoreElement) scoreElement.innerText = score;
    activeWords = [];
    targetedWord = null;
    
    const settings = getDifficultySettings();
    const displayElement = streakElement || comboMultiplierElement;
    if (displayElement) displayElement.innerText = `${wordsDestroyedInLevel}/${settings.wordsToNextLevel}`;
    playExplosionSound();
}


// ==========================================
// 5. APPARITIONS & LOGIQUE CYCLIQUEMENT MISE À JOUR
// ==========================================
function spawnWord() {
    const settings = getDifficultySettings();
    if (activeWords.length >= settings.maxWordsOnScreen) return;

    let filteredList = [];
    if (level === 1) filteredList = wordList.filter(word => word.length <= 4);
    else if (level === 2) filteredList = wordList.filter(word => word.length <= 5);
    else if (level === 3) filteredList = wordList.filter(word => word.length <= 6);
    else filteredList = wordList;

    if (filteredList.length === 0) filteredList = wordList;
    const text = filteredList[Math.floor(Math.random() * filteredList.length)];
    
    const element = document.createElement('div');
    element.className = 'word-container';
    const posX = Math.random() * (window.innerWidth * 0.7) + (window.innerWidth * 0.15);
    element.style.left = posX + 'px';
    element.style.top = '0px';
    
    let wordType = 'NORMAL';
    const rand = Math.random();
    if (rand > 0.7 && rand <= 0.9) {
        wordType = 'RAPIDE';
        element.style.textShadow = '0 0 10px #ef4444';
    } else if (rand > 0.9) {
        wordType = 'BONUS';
        element.style.textShadow = '0 0 10px #eab308';
    }
    
    let htmlContent = "";
    for (let i = 0; i < text.length; i++) {
        const helperClass = (i === 0 && !targetedWord) ? "targetable" : "";
        let extraColor = '';
        if (wordType === 'RAPIDE') extraColor = 'color: #f87171;';
        if (wordType === 'BONUS') extraColor = 'color: #fef08a;';
        htmlContent += `<span class="letter ${helperClass}" id="letter-${i}" style="${extraColor}">${text[i]}</span>`;
    }
    element.innerHTML = htmlContent;
    if (container) container.appendChild(element);
    
    activeWords.push({
        text: text, element: element, posX: posX, posY: 0, typedIndex: 0, validatedIndex: 0, type: wordType
    });
}

function createLaser(startX, startY, targetX, targetY, targetWordRef, targetLetterIndex) {
    playLaserSound();
    const laserElement = document.createElement('div');
    laserElement.className = 'laser';
    laserElement.style.left = startX + 'px';
    laserElement.style.top = startY + 'px';
    
    const angle = Math.atan2(targetY - startY, targetX - startX);
    laserElement.style.transform = `translate(-50%, -50%) rotate(${angle + Math.PI/2}rad)`;
    if (container) container.appendChild(laserElement);

    const angleDeg = (angle * 180 / Math.PI) + 90;
    if (playerShip) playerShip.style.transform = `translateX(-50%) rotate(${angleDeg}deg)`;

    lasers.push({
        element: laserElement, x: startX, y: startY,
        vx: Math.cos(angle) * 35, vy: Math.sin(angle) * 35,
        wordRef: targetWordRef, targetIndex: targetLetterIndex
    });
}

function updateGame() {
    const settings = getDifficultySettings();
    spawnTimer++;
    if (spawnTimer >= settings.spawnDelay) { spawnWord(); spawnTimer = 0; }

    for (let i = activeWords.length - 1; i >= 0; i--) {
        let w = activeWords[i];
        const currentSpeed = w.type === 'RAPIDE' ? settings.wordSpeed * 2 : settings.wordSpeed;
        w.posY += currentSpeed;
        if (w.element) w.element.style.top = w.posY + 'px';
        if (w.posY > window.innerHeight - 110) { triggerGameOver(); return; }
    }

    for (let i = lasers.length - 1; i >= 0; i--) {
        let l = lasers[i];
        l.x += l.vx; l.y += l.vy;
        if (l.element) { l.element.style.left = l.x + 'px'; l.element.style.top = l.y + 'px'; }

        if (activeWords.includes(l.wordRef)) {
            const targetLetterElement = l.wordRef.element.querySelector(`#letter-${l.targetIndex}`);
            if (targetLetterElement) {
                const letterRect = targetLetterElement.getBoundingClientRect();
                if (l.y <= letterRect.bottom && l.y >= letterRect.top - 20) {
                    if (l.targetIndex === l.wordRef.validatedIndex) {
                        createExplosion(l.x, l.y, l.wordRef.type === 'BONUS' ? '#eab308' : '#38bdf8');
                        targetLetterElement.className = 'letter destroyed';
                        l.wordRef.validatedIndex++;
                        const nextLetterElement = l.wordRef.element.querySelector(`#letter-${l.wordRef.validatedIndex}`);
                        if (nextLetterElement) nextLetterElement.className = 'letter active';

                        if (l.wordRef.validatedIndex === l.wordRef.text.length) {
                            let pointsGagnes = 10;
                            if (l.wordRef.type === 'RAPIDE') { pointsGagnes = 20; triggerScreenShake(); }
                            else if (l.wordRef.type === 'BONUS') { pointsGagnes = 30; triggerBonusBomb(); }
                            
                            score += pointsGagnes * scoreMultiplier;
                            wordsDestroyedInLevel++;
                            if (scoreElement) scoreElement.innerText = score;
                            playExplosionSound();
                            
                            if (l.wordRef.element && container && container.contains(l.wordRef.element)) container.removeChild(l.wordRef.element);
                            activeWords = activeWords.filter(item => item !== l.wordRef);
                            targetedWord = null;
                            
                            const displayElement = streakElement || comboMultiplierElement;
                            if (displayElement) displayElement.innerText = `${wordsDestroyedInLevel}/${settings.wordsToNextLevel}`;

                            if (wordsDestroyedInLevel >= settings.wordsToNextLevel) {
                                level++; wordsDestroyedInLevel = 0;
                                if (levelElement) {
                                    levelElement.innerText = level;
                                    levelElement.style.color = '#00ffcc';
                                    setTimeout(() => levelElement.style.color = '#ffffff', 500);
                                }
                                const newSettings = getDifficultySettings();
                                if (streakElement) streakElement.innerText = `0/${newSettings.wordsToNextLevel}`;
                            } else { refreshTargetableHelpers(); }
                        }
                    }
                    if (l.element && container && container.contains(l.element)) container.removeChild(l.element); 
                    lasers.splice(i, 1); continue;
                }
            }
        }
        if (l.y < 0 || l.x < 0 || l.x > window.innerWidth) { 
            if (l.element && container && container.contains(l.element)) container.removeChild(l.element); 
            lasers.splice(i, 1); 
        }
    }
}

function refreshTargetableHelpers() {
    if (targetedWord) return; // Ne fait rien si un mot est verrouillé
    activeWords.forEach(w => {
        const firstLetter = w.element.querySelector('#letter-0');
        if(firstLetter && !firstLetter.classList.contains('destroyed')) {
            firstLetter.className = 'letter targetable';
        }
    });
}

// ==========================================
// 6. ÉVÉNEMENTS CLAVIER (CIBLAGE SANS CONFLIT DE LETTRES)
// ==========================================
window.addEventListener('keydown', (e) => {
    if (!isPlaying || e.key.length !== 1) return;
    const keyPressed = e.key.toUpperCase(); if (!playerShip) return;
    const shipRect = playerShip.getBoundingClientRect(); 
    const shipX = shipRect.left + shipRect.width / 2; 
    const shipY = shipRect.top + shipRect.height / 2;
    let toucheCorrecte = false;

    if (targetedWord) {
        // --- CAS 1 : UN MOT EST DÉJÀ STRICTEMENT VERROUILLÉ ---
        const expectedLetter = targetedWord.text[targetedWord.typedIndex];
        if (keyPressed === expectedLetter) {
            toucheCorrecte = true;
            const letterElement = targetedWord.element.querySelector(`#letter-${targetedWord.typedIndex}`);
            if (letterElement) letterElement.className = 'letter active';
            const letterRect = letterElement.getBoundingClientRect();
            
            createLaser(shipX, shipY, letterRect.left + letterRect.width / 2, letterRect.top + letterRect.height / 2, targetedWord, targetedWord.typedIndex);
            targetedWord.typedIndex++;

            if (targetedWord.typedIndex === targetedWord.text.length) {
                targetedWord = null;
            }
        }
    } else {
        // --- CAS 2 : CHOIX LIBRE (AVEC GESTION DES DOUBLONS DE LETTRES) ---
        // Étape 1 : On cherche en priorité si on avait déjà commencé un mot qui attend CETTE lettre exacte
        for (let w of activeWords) {
            if (w.typedIndex > 0 && w.text[w.typedIndex] === keyPressed) {
                toucheCorrecte = true;
                targetedWord = w; // On reverrouille ce mot en cours
                break;
            }
        }

        // Étape 2 : Si aucun mot en cours ne correspond, on cherche un NOUVEAU mot qui commence par cette lettre
        if (!toucheCorrecte) {
            for (let w of activeWords) {
                if (w.typedIndex === 0 && w.text[0] === keyPressed) {
                    toucheCorrecte = true;
                    targetedWord = w; // On verrouille ce nouveau mot
                    break;
                }
            }
        }

        // Étape 3 : Si on a trouvé le bon mot (nouveau ou en cours), on applique les effets et le tir
        if (toucheCorrecte && targetedWord) {
            // Nettoyage visuel des indices d'aide des autres mots
            activeWords.forEach(word => { 
                if (word !== targetedWord) { 
                    const currentLetter = word.element.querySelector(`#letter-${word.typedIndex}`); 
                    if (currentLetter) currentLetter.className = 'letter'; 
                } 
            });

            // On récupère la lettre qu'on vient de taper (à son indice actuel)
            const currentIndex = targetedWord.typedIndex;
            const letterElement = targetedWord.element.querySelector(`#letter-${currentIndex}`);
            if (letterElement) letterElement.className = 'letter active';
            const letterRect = letterElement.getBoundingClientRect();
            
            createLaser(shipX, shipY, letterRect.left + letterRect.width / 2, letterRect.top + letterRect.height / 2, targetedWord, currentIndex);
            targetedWord.typedIndex++;

            // Si le mot est fini dès la première lettre (mots de 1 lettre)
            if (targetedWord.typedIndex === targetedWord.text.length) {
                targetedWord = null;
            }
        }
    }

    // --- GESTION DU MULTIPLICATEUR DE COMBO ---
    if (toucheCorrecte) {
        currentCombo++;
        if (currentCombo >= 30) scoreMultiplier = 4;
        else if (currentCombo >= 20) scoreMultiplier = 3;
        else if (currentCombo >= 10) scoreMultiplier = 2;
        else scoreMultiplier = 1;
        
        const displayElement = comboMultiplierElement || streakElement;
        if (displayElement) {
            displayElement.innerText = `x${scoreMultiplier}`;
            if (scoreMultiplier === 4) displayElement.style.color = "#f43f5e";
            else if (scoreMultiplier === 3) displayElement.style.color = "#eab308";
            else if (scoreMultiplier === 2) displayElement.style.color = "#a855f7";
            else displayElement.style.color = "#22d3ee";
        }
    } else {
        currentCombo = 0; scoreMultiplier = 1;
        const displayElement = comboMultiplierElement || streakElement;
        if (displayElement) { displayElement.innerText = "x1"; displayElement.style.color = "#64748b"; }
    }
});
// ==========================================
// 8. COMPATIBILITÉ TACTILE / SMARTPHONE
// ==========================================
if (mobileInput) {
    mobileInput.addEventListener('input', (e) => {
        if (!isPlaying) return;
        const text = e.target.value;
        if (text.length > 0) {
            const lastChar = text[text.length - 1];
            
            // On crée un faux événement "keydown" identique à celui du PC
            const fakeEvent = { key: lastChar };
            
            // On déclenche manuellement la logique de tir
            window.dispatchEvent(new KeyboardEvent('keydown', fakeEvent));
            
            // On vide l'input pour être prêt à recevoir la lettre suivante
            mobileInput.value = ""; 
        }
    });
}
