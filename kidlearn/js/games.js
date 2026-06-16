'use strict';

/* ============================================================
   1. MATH — Calcul Magique
   ============================================================ */
const PRAISE = ['Bravo !', 'Génial !', 'Super !', 'Top !', 'Excellent !'];
const MATH_TIME = 15000; // ms per question

let M = {};

GAME_INIT.math = function initMath() {
  M = { score: 0, q: 0, answer: 0, diff: null, timer: null };
  document.getElementById('math-score').textContent = '0';
  document.getElementById('math-setup').classList.remove('hidden');
  document.getElementById('math-play').classList.add('hidden');
};

function startMath(diff) {
  SFX.click();
  M = { score: 0, q: 0, answer: 0, diff, timer: null };
  document.getElementById('math-score').textContent = '0';
  document.getElementById('math-setup').classList.add('hidden');
  document.getElementById('math-play').classList.remove('hidden');
  nextMathQ();
}

function nextMathQ() {
  if (M.q >= 10) return finishGame('math', { score: M.score, total: 10 });
  setDots('math-dots', M.q, 10);
  M.q++;
  document.getElementById('math-feedback').textContent = '';

  const ops = M.diff === 'easy' ? ['+', '−'] :
              M.diff === 'medium' ? ['+', '−', '×'] : ['+', '−', '×', '÷'];
  const op = ops[rand(0, ops.length - 1)];
  let a, b;
  if (op === '+') { a = rand(1, 20); b = rand(1, 20); M.answer = a + b; }
  else if (op === '−') { a = rand(5, 25); b = rand(1, a); M.answer = a - b; }
  else if (op === '×') { a = rand(2, 10); b = rand(2, 10); M.answer = a * b; }
  else { M.answer = rand(2, 10); b = rand(2, 10); a = M.answer * b; }

  document.getElementById('math-question').textContent = `${a} ${op} ${b} = ?`;

  const opts = shuffle([M.answer, ...wrongNumbers(M.answer, 3)]);
  buildOptions(document.getElementById('math-options'), opts, (val, btn, buttons) => {
    clearInterval(M.timer);
    lockOptions(buttons);
    if (val === M.answer) {
      btn.classList.add('correct');
      M.score++;
      document.getElementById('math-score').textContent = M.score;
      document.getElementById('math-feedback').textContent = '🎉 ' + PRAISE[rand(0, PRAISE.length - 1)];
      SFX.correct();
      addStars(10);
    } else {
      btn.classList.add('wrong');
      buttons.find(b => Number(b.textContent) === M.answer)?.classList.add('correct');
      document.getElementById('math-feedback').textContent = `❌ La réponse était ${M.answer}`;
      SFX.wrong();
    }
    setTimeout(nextMathQ, 1500);
  });

  startMathTimer();
}

function startMathTimer() {
  const fill = document.getElementById('math-timer-fill');
  const start = Date.now();
  fill.style.width = '100%';
  clearInterval(M.timer);
  M.timer = trackTimer(setInterval(() => {
    const left = Math.max(0, 1 - (Date.now() - start) / MATH_TIME);
    fill.style.width = (left * 100) + '%';
    if (left <= 0) {
      clearInterval(M.timer);
      document.querySelectorAll('#math-options .opt').forEach(b => b.classList.add('locked'));
      document.getElementById('math-feedback').textContent = `⏰ Trop tard ! C'était ${M.answer}`;
      SFX.wrong();
      setTimeout(nextMathQ, 1500);
    }
  }, 100));
}

/* ============================================================
   2. MEMORY — Mémo Rigolo
   ============================================================ */
const MEMORY_EMOJIS = ['🐶', '🐱', '🦁', '🐸', '🦊', '🐼', '🦋', '🐠', '🌸', '🎈', '🍕', '🚀', '🌈', '⭐', '🎵', '🍦'];
let MEM = {};

GAME_INIT.memory = function initMemory() {
  const picked = shuffle(MEMORY_EMOJIS).slice(0, 8);
  const cards = shuffle([...picked, ...picked]);
  MEM = { flipped: [], matched: 0, moves: 0, lock: false };
  document.getElementById('memory-pairs').textContent = '0';
  document.getElementById('memory-moves').textContent = '0';

  const grid = document.getElementById('memory-grid');
  grid.innerHTML = '';
  cards.forEach(emoji => {
    const card = document.createElement('div');
    card.className = 'mem-card';
    card.dataset.emoji = emoji;
    card.innerHTML = '<div class="mem-front">?</div><div class="mem-back">' + emoji + '</div>';
    card.addEventListener('click', () => flipCard(card));
    grid.appendChild(card);
  });
};

function flipCard(card) {
  if (MEM.lock || card.classList.contains('flipped') || card.classList.contains('matched')) return;
  SFX.flip();
  card.classList.add('flipped');
  MEM.flipped.push(card);
  if (MEM.flipped.length < 2) return;

  MEM.moves++;
  document.getElementById('memory-moves').textContent = MEM.moves;
  MEM.lock = true;

  const [a, b] = MEM.flipped;
  if (a.dataset.emoji === b.dataset.emoji) {
    a.classList.add('matched');
    b.classList.add('matched');
    MEM.matched++;
    document.getElementById('memory-pairs').textContent = MEM.matched;
    MEM.flipped = [];
    MEM.lock = false;
    SFX.correct();
    addStars(15);
    if (MEM.matched === 8) {
      const stars = MEM.moves <= 11 ? 3 : MEM.moves <= 16 ? 2 : 1;
      setTimeout(() => finishGame('memory', {
        stars,
        text: `Toutes les paires trouvées en ${MEM.moves} coups !`
      }), 700);
    }
  } else {
    setTimeout(() => {
      a.classList.remove('flipped');
      b.classList.remove('flipped');
      MEM.flipped = [];
      MEM.lock = false;
    }, 850);
  }
}

/* ============================================================
   3. ALPHABET — Aventure Alphabet
   ============================================================ */
const ALPHA_DATA = [
  { letter: 'A', correct: 'Ananas 🍍',   words: ['Ananas 🍍', 'Banane 🍌', 'Citron 🍋', 'Dragon 🐉'] },
  { letter: 'B', correct: 'Ballon 🎈',   words: ['Ballon 🎈', 'Cerise 🍒', 'Dauphin 🐬', 'Étoile ⭐'] },
  { letter: 'C', correct: 'Citron 🍋',   words: ['Avion ✈️', 'Citron 🍋', 'Bateau ⛵', 'Drapeau 🚩'] },
  { letter: 'D', correct: 'Dragon 🐉',   words: ['Dragon 🐉', 'Banane 🍌', 'Crayon ✏️', 'Fleur 🌸'] },
  { letter: 'E', correct: 'Étoile ⭐',   words: ['Girafe 🦒', 'Étoile ⭐', 'Arc-en-ciel 🌈', 'Hibou 🦉'] },
  { letter: 'F', correct: 'Fusée 🚀',    words: ['Oiseau 🐦', 'Nuage ☁️', 'Fusée 🚀', 'Tortue 🐢'] },
  { letter: 'G', correct: 'Gâteau 🎂',   words: ['Gâteau 🎂', 'Lion 🦁', 'Maison 🏠', 'Pomme 🍎'] },
  { letter: 'H', correct: 'Hérisson 🦔', words: ['Poisson 🐟', 'Hérisson 🦔', 'Renard 🦊', 'Sapin 🌲'] },
  { letter: 'I', correct: 'Île 🏝️',      words: ['Tomate 🍅', 'Île 🏝️', 'Vache 🐄', 'Zèbre 🦓'] },
  { letter: 'J', correct: 'Jungle 🌴',   words: ['Jungle 🌴', 'Kangourou 🦘', 'Lune 🌙', 'Mangue 🥭'] },
  { letter: 'L', correct: 'Lapin 🐰',    words: ['Souris 🐭', 'Bonbon 🍬', 'Lapin 🐰', 'Dinde 🦃'] },
  { letter: 'M', correct: 'Maison 🏠',   words: ['Maison 🏠', 'Nuage ☁️', 'Orange 🍊', 'Papillon 🦋'] },
  { letter: 'N', correct: 'Nuit 🌙',     words: ['Koala 🐨', 'Nuit 🌙', 'Poulpe 🐙', 'Renard 🦊'] },
  { letter: 'O', correct: 'Ours 🐻',     words: ['Ours 🐻', 'Raisin 🍇', 'Tigre 🐯', 'Rose 🌹'] },
  { letter: 'P', correct: 'Papillon 🦋', words: ['Tulipe 🌷', 'Vache 🐄', 'Papillon 🦋', 'Cadeau 🎁'] },
];

let AL = {};

GAME_INIT.alphabet = function initAlphabet() {
  AL = { questions: shuffle(ALPHA_DATA).slice(0, 10), idx: 0, score: 0 };
  document.getElementById('alpha-score').textContent = '0';
  showAlphaQ();
};

function showAlphaQ() {
  if (AL.idx >= AL.questions.length) {
    return finishGame('alphabet', { score: AL.score, total: 10 });
  }
  const q = AL.questions[AL.idx];
  setDots('alpha-dots', AL.idx, 10);
  document.getElementById('alpha-feedback').textContent = '';

  const letterEl = document.getElementById('alpha-letter');
  letterEl.textContent = q.letter;
  letterEl.style.animation = 'none';
  requestAnimationFrame(() => { letterEl.style.animation = ''; });

  document.getElementById('alpha-speak').onclick = () => { SFX.pop(); speak(q.letter); };

  buildOptions(document.getElementById('alpha-options'), shuffle(q.words), (val, btn, buttons) => {
    lockOptions(buttons);
    if (val === q.correct) {
      btn.classList.add('correct');
      AL.score++;
      document.getElementById('alpha-score').textContent = AL.score;
      document.getElementById('alpha-feedback').textContent = '🌟 ' + PRAISE[rand(0, PRAISE.length - 1)];
      SFX.correct();
      addStars(10);
      speak(stripEmoji(q.correct));
    } else {
      btn.classList.add('wrong');
      buttons.find(b => b.textContent === q.correct)?.classList.add('correct');
      document.getElementById('alpha-feedback').textContent = '❌ Presque !';
      SFX.wrong();
    }
    AL.idx++;
    setTimeout(showAlphaQ, 1500);
  });
}

/* ============================================================
   4. ANIMALS — Quiz Animaux
   ============================================================ */
const ANIMALS_DATA = [
  { emoji: '🦁', name: 'Lion',          options: ['Lion', 'Tigre', 'Panthère', 'Guépard'],                    fact: 'Le rugissement du lion s’entend à 8 km de distance !' },
  { emoji: '🐘', name: 'Éléphant',      options: ['Rhinocéros', 'Hippopotame', 'Éléphant', 'Girafe'],         fact: 'Un éléphant peut boire 200 litres d’eau par jour !' },
  { emoji: '🦒', name: 'Girafe',        options: ['Chameau', 'Autruche', 'Zèbre', 'Girafe'],                  fact: 'La girafe mesure jusqu’à 6 mètres, comme 2 étages !' },
  { emoji: '🐧', name: 'Manchot',       options: ['Manchot', 'Pingouin', 'Pélican', 'Flamant'],               fact: 'Les manchots ne volent pas mais nagent à 35 km/h !' },
  { emoji: '🦋', name: 'Papillon',      options: ['Libellule', 'Papillon', 'Moustique', 'Abeille'],           fact: 'Le papillon goûte la nourriture avec ses pattes !' },
  { emoji: '🐙', name: 'Pieuvre',       options: ['Méduse', 'Calamar', 'Pieuvre', 'Étoile de mer'],           fact: 'La pieuvre a 3 cœurs et du sang bleu !' },
  { emoji: '🦈', name: 'Requin',        options: ['Dauphin', 'Requin', 'Baleine', 'Orque'],                   fact: 'Les requins existaient avant les dinosaures !' },
  { emoji: '🐨', name: 'Koala',         options: ['Koala', 'Panda', 'Paresseux', 'Wombat'],                   fact: 'Le koala dort jusqu’à 20 heures par jour !' },
  { emoji: '🦜', name: 'Perroquet',     options: ['Toucan', 'Perroquet', 'Corbeau', 'Mouette'],               fact: 'Certains perroquets apprennent plus de 1000 mots !' },
  { emoji: '🦓', name: 'Zèbre',         options: ['Cheval', 'Âne', 'Zèbre', 'Okapi'],                         fact: 'Chaque zèbre a des rayures uniques, comme tes empreintes !' },
  { emoji: '🐠', name: 'Poisson clown', options: ['Poisson clown', 'Poisson-lune', 'Poisson rouge', 'Sardine'], fact: 'Le poisson clown vit caché dans les anémones de mer !' },
  { emoji: '🦊', name: 'Renard',        options: ['Loup', 'Renard', 'Chacal', 'Coyote'],                      fact: 'Le renard entend une souris sous 1 mètre de neige !' },
];

let AN = {};

GAME_INIT.animals = function initAnimals() {
  AN = { questions: shuffle(ANIMALS_DATA).slice(0, 10), idx: 0, score: 0 };
  document.getElementById('anim-score').textContent = '0';
  showAnimalQ();
};

function showAnimalQ() {
  if (AN.idx >= AN.questions.length) {
    return finishGame('animals', { score: AN.score, total: 10 });
  }
  const q = AN.questions[AN.idx];
  setDots('anim-dots', AN.idx, 10);
  document.getElementById('anim-feedback').textContent = '';
  document.getElementById('anim-fact').classList.add('hidden');

  const emojiEl = document.getElementById('anim-emoji');
  emojiEl.textContent = q.emoji;
  emojiEl.style.animation = 'none';
  requestAnimationFrame(() => { emojiEl.style.animation = ''; });

  buildOptions(document.getElementById('anim-options'), shuffle(q.options), (val, btn, buttons) => {
    lockOptions(buttons);
    if (val === q.name) {
      btn.classList.add('correct');
      AN.score++;
      document.getElementById('anim-score').textContent = AN.score;
      document.getElementById('anim-feedback').textContent = '🎉 ' + PRAISE[rand(0, PRAISE.length - 1)];
      SFX.correct();
      addStars(10);
    } else {
      btn.classList.add('wrong');
      buttons.find(b => b.textContent === q.name)?.classList.add('correct');
      document.getElementById('anim-feedback').textContent = `❌ C'était : ${q.name}`;
      SFX.wrong();
    }
    const factEl = document.getElementById('anim-fact');
    factEl.textContent = '💡 ' + q.fact;
    factEl.classList.remove('hidden');
    AN.idx++;
    setTimeout(showAnimalQ, 2600);
  });
}

/* ============================================================
   5. COUNTING — Compte les Étoiles
   ============================================================ */
const COUNT_OBJECTS = ['⭐', '🍎', '🌸', '🐟', '🎈', '🦋', '🍪', '🌙', '🐸', '🌺'];
let CO = {};

GAME_INIT.counting = function initCounting() {
  CO = { idx: 0, score: 0, answer: 0 };
  document.getElementById('count-score').textContent = '0';
  showCountQ();
};

function showCountQ() {
  if (CO.idx >= 10) return finishGame('counting', { score: CO.score, total: 10 });
  setDots('count-dots', CO.idx, 10);
  CO.idx++;
  document.getElementById('count-feedback').textContent = '';

  const emoji = COUNT_OBJECTS[rand(0, COUNT_OBJECTS.length - 1)];
  CO.answer = rand(1, 15);
  document.getElementById('count-prompt').textContent =
    (CO.answer <= 5 ? 'Combien en vois-tu ? ' : CO.answer <= 10 ? 'Compte bien ! ' : 'Un vrai défi ! ') + emoji;

  const stage = document.getElementById('count-objects');
  stage.innerHTML = '';
  for (let i = 0; i < CO.answer; i++) {
    const span = document.createElement('span');
    span.className = 'count-obj';
    span.textContent = emoji;
    span.style.animationDelay = (i * 0.06) + 's';
    stage.appendChild(span);
  }

  const choices = shuffle([CO.answer, ...wrongNumbers(CO.answer, 9, 1, 18)])
    .slice(0, 10)
    .sort((a, b) => a - b);
  const grid = document.getElementById('count-buttons');
  grid.innerHTML = '';
  const buttons = choices.map(n => {
    const btn = document.createElement('button');
    btn.className = 'count-btn';
    btn.textContent = n;
    btn.addEventListener('click', () => {
      buttons.forEach(b => b.style.pointerEvents = 'none');
      if (n === CO.answer) {
        btn.classList.add('correct');
        CO.score++;
        document.getElementById('count-score').textContent = CO.score;
        document.getElementById('count-feedback').textContent = `✅ Oui, ${CO.answer} !`;
        SFX.correct();
        addStars(10);
      } else {
        btn.classList.add('wrong');
        buttons.find(b => Number(b.textContent) === CO.answer)?.classList.add('correct');
        document.getElementById('count-feedback').textContent = `❌ Il y en avait ${CO.answer} !`;
        SFX.wrong();
      }
      setTimeout(showCountQ, 1500);
    });
    grid.appendChild(btn);
    return btn;
  });
}

/* ============================================================
   6. TRUE / FALSE — Vrai ou Faux
   ============================================================ */
const TF_DATA = [
  { q: 'Les éléphants ont peur des souris.',                          ans: false, expl: 'C’est un mythe ! Les éléphants ne craignent pas les souris.', cat: '🐾 Animaux' },
  { q: 'Le soleil est une étoile.',                                   ans: true,  expl: 'Oui ! Le soleil est une étoile comme des milliards d’autres.', cat: '🌟 Espace' },
  { q: 'Les dauphins sont des poissons.',                             ans: false, expl: 'Les dauphins sont des mammifères : ils respirent l’air !', cat: '🐋 Animaux' },
  { q: 'La lune produit sa propre lumière.',                          ans: false, expl: 'La lune réfléchit la lumière du soleil, comme un miroir.', cat: '🌙 Espace' },
  { q: 'Le cœur bat environ 70 fois par minute.',                     ans: true,  expl: 'Exact ! Entre 60 et 100 battements par minute au repos.', cat: '❤️ Corps humain' },
  { q: 'Les plantes fabriquent de l’oxygène.',                        ans: true,  expl: 'Oui ! Elles absorbent le CO₂ et rejettent de l’oxygène.', cat: '🌿 Nature' },
  { q: 'La baleine bleue est le plus grand animal de tous les temps.', ans: true, expl: 'Elle mesure 30 m et pèse plus lourd que les dinosaures !', cat: '🐋 Animaux' },
  { q: 'L’eau bout à 50 degrés.',                                     ans: false, expl: 'L’eau bout à 100 °C ! À 50 °C elle est juste très chaude.', cat: '🔬 Sciences' },
  { q: 'Les os sont plus solides que le béton.',                      ans: true,  expl: 'À poids égal, l’os est même plus résistant que l’acier !', cat: '💪 Corps humain' },
  { q: 'Les araignées ont 6 pattes.',                                 ans: false, expl: 'Les araignées ont 8 pattes. Les insectes en ont 6 !', cat: '🕷️ Animaux' },
  { q: 'La Grande Muraille de Chine fait plus de 20 000 km.',         ans: true,  expl: 'Elle fait plus de 21 000 km, la plus longue construction du monde !', cat: '🌍 Monde' },
  { q: 'Les chauves-souris sont aveugles.',                           ans: false, expl: 'Elles voient très bien ET utilisent l’écholocation !', cat: '🦇 Animaux' },
];

let TF = {};

GAME_INIT.truefals = function initTF() {
  TF = { questions: shuffle(TF_DATA).slice(0, 10), idx: 0, score: 0, locked: false };
  document.getElementById('tf-score').textContent = '0';
  showTFQ();
};

function showTFQ() {
  if (TF.idx >= TF.questions.length) {
    return finishGame('truefals', { score: TF.score, total: 10 });
  }
  const q = TF.questions[TF.idx];
  TF.locked = false;
  setDots('tf-dots', TF.idx, 10);
  document.getElementById('tf-category').textContent = q.cat;
  document.getElementById('tf-question').textContent = q.q;
  document.getElementById('tf-feedback').textContent = '';
  document.getElementById('tf-expl').classList.add('hidden');
  document.getElementById('tf-true').disabled = false;
  document.getElementById('tf-false').disabled = false;
}

function answerTF(val) {
  if (TF.locked) return;
  TF.locked = true;
  const q = TF.questions[TF.idx];
  document.getElementById('tf-true').disabled = true;
  document.getElementById('tf-false').disabled = true;

  const explEl = document.getElementById('tf-expl');
  explEl.textContent = '💡 ' + q.expl;
  explEl.classList.remove('hidden');

  if (val === q.ans) {
    TF.score++;
    document.getElementById('tf-score').textContent = TF.score;
    document.getElementById('tf-feedback').textContent = '🎉 ' + PRAISE[rand(0, PRAISE.length - 1)];
    SFX.correct();
    addStars(10);
  } else {
    document.getElementById('tf-feedback').textContent = `❌ C'était ${q.ans ? 'VRAI' : 'FAUX'} !`;
    SFX.wrong();
  }
  TF.idx++;
  setTimeout(showTFQ, 2600);
}

/* ============================================================
   7. SCRAMBLE — Mots Mélangés
   ============================================================ */
const SCRAMBLE_DATA = [
  { word: 'LION',   hint: '🦁', cat: '🐾 Animaux' },
  { word: 'CHAT',   hint: '🐱', cat: '🐾 Animaux' },
  { word: 'CHIEN',  hint: '🐶', cat: '🐾 Animaux' },
  { word: 'LAPIN',  hint: '🐰', cat: '🐾 Animaux' },
  { word: 'ARBRE',  hint: '🌳', cat: '🌿 Nature' },
  { word: 'FLEUR',  hint: '🌸', cat: '🌿 Nature' },
  { word: 'SOLEIL', hint: '☀️', cat: '🌤️ Ciel' },
  { word: 'NUAGE',  hint: '☁️', cat: '🌤️ Ciel' },
  { word: 'MAISON', hint: '🏠', cat: '🏙️ Ville' },
  { word: 'BATEAU', hint: '⛵', cat: '🌊 Mer' },
  { word: 'PIZZA',  hint: '🍕', cat: '🍽️ Miam' },
  { word: 'GATEAU', hint: '🎂', cat: '🍽️ Miam' },
  { word: 'FUSEE',  hint: '🚀', cat: '🌟 Espace' },
  { word: 'DRAGON', hint: '🐉', cat: '🏰 Magie' },
  { word: 'BALLON', hint: '🎈', cat: '🎪 Fête' },
];

let SC = {};

GAME_INIT.scramble = function initScramble() {
  SC = { questions: shuffle(SCRAMBLE_DATA).slice(0, 10), idx: 0, score: 0, word: '', pool: [], used: [], answer: [], checking: false };
  document.getElementById('scr-score').textContent = '0';
  showScrambleQ();
};

function showScrambleQ() {
  if (SC.idx >= SC.questions.length) {
    return finishGame('scramble', { score: SC.score, total: 10 });
  }
  const q = SC.questions[SC.idx];
  SC.word = q.word;
  SC.pool = shuffle(q.word.split(''));
  // Re-shuffle if it accidentally spells the word
  if (SC.pool.join('') === q.word) SC.pool.reverse();
  SC.used = new Array(SC.pool.length).fill(false);
  SC.answer = [];
  SC.checking = false;

  setDots('scr-dots', SC.idx, 10);
  document.getElementById('scr-category').textContent = q.cat;
  document.getElementById('scr-hint').textContent = q.hint;
  document.getElementById('scr-feedback').textContent = '';
  renderScramble();
}

function renderScramble() {
  const slots = document.getElementById('scr-slots');
  slots.innerHTML = '';
  slots.classList.remove('shake');
  for (let i = 0; i < SC.word.length; i++) {
    const tile = document.createElement('div');
    const entry = SC.answer[i];
    tile.className = 'scr-tile' + (entry ? ' filled' : '');
    tile.textContent = entry ? entry.letter : '';
    if (entry) tile.addEventListener('click', () => removeScrLetter(i));
    slots.appendChild(tile);
  }

  const pool = document.getElementById('scr-letters');
  pool.innerHTML = '';
  SC.pool.forEach((letter, i) => {
    const tile = document.createElement('div');
    tile.className = 'scr-tile' + (SC.used[i] ? ' used' : '');
    tile.textContent = letter;
    tile.style.animationDelay = (i * 0.05) + 's';
    if (!SC.used[i]) tile.addEventListener('click', () => pickScrLetter(i));
    pool.appendChild(tile);
  });
}

function pickScrLetter(i) {
  if (SC.checking || SC.answer.length >= SC.word.length) return;
  SFX.pop();
  SC.used[i] = true;
  SC.answer.push({ letter: SC.pool[i], src: i });
  renderScramble();
  if (SC.answer.length === SC.word.length) setTimeout(checkScramble, 250);
}

function removeScrLetter(slotIdx) {
  if (SC.checking) return;
  SFX.click();
  const [removed] = SC.answer.splice(slotIdx, 1);
  SC.used[removed.src] = false;
  renderScramble();
}

function clearScramble() {
  if (SC.checking) return;
  SFX.click();
  SC.answer.forEach(e => { SC.used[e.src] = false; });
  SC.answer = [];
  renderScramble();
}

function hintScramble() {
  if (SC.checking || SC.answer.length >= SC.word.length) return;
  const needed = SC.word[SC.answer.length];
  const i = SC.pool.findIndex((l, idx) => l === needed && !SC.used[idx]);
  if (i !== -1) { SFX.pop(); pickScrLetter(i); }
}

function checkScramble() {
  SC.checking = true;
  const formed = SC.answer.map(e => e.letter).join('');
  if (formed === SC.word) {
    SC.score++;
    document.getElementById('scr-score').textContent = SC.score;
    document.getElementById('scr-feedback').textContent = `🎉 ${SC.word} ! Bravo !`;
    SFX.correct();
    addStars(15);
    speak(SC.word.toLowerCase());
    SC.idx++;
    setTimeout(showScrambleQ, 1500);
  } else {
    document.getElementById('scr-feedback').textContent = '❌ Essaie encore !';
    document.getElementById('scr-slots').classList.add('shake');
    SFX.wrong();
    setTimeout(() => {
      SC.checking = false;
      clearScramble();
      document.getElementById('scr-feedback').textContent = '';
    }, 900);
  }
}

/* ============================================================
   8. GEO — Tour du Monde
   ============================================================ */
const GEO_DATA = [
  { flag: '🇫🇷', country: 'la France',     options: ['Paris', 'Lyon', 'Marseille', 'Bordeaux'],            ans: 'Paris',           fact: 'La tour Eiffel mesure 330 mètres !' },
  { flag: '🇩🇪', country: 'l’Allemagne',   options: ['Munich', 'Berlin', 'Hambourg', 'Cologne'],           ans: 'Berlin',          fact: 'L’Allemagne compte plus de 25 000 châteaux !' },
  { flag: '🇪🇸', country: 'l’Espagne',     options: ['Barcelone', 'Séville', 'Madrid', 'Valence'],         ans: 'Madrid',          fact: 'En Espagne, on mange souvent très tard le soir !' },
  { flag: '🇮🇹', country: 'l’Italie',      options: ['Milan', 'Naples', 'Rome', 'Venise'],                 ans: 'Rome',            fact: 'L’Italie a la forme d’une botte !' },
  { flag: '🇬🇧', country: 'le Royaume-Uni', options: ['Manchester', 'Londres', 'Édimbourg', 'Liverpool'],  ans: 'Londres',         fact: 'Big Ben est le nom de la cloche, pas de la tour !' },
  { flag: '🇧🇷', country: 'le Brésil',     options: ['São Paulo', 'Rio de Janeiro', 'Brasília', 'Salvador'], ans: 'Brasília',      fact: 'Le Brésil abrite la grande forêt amazonienne !' },
  { flag: '🇯🇵', country: 'le Japon',      options: ['Osaka', 'Tokyo', 'Kyoto', 'Nagoya'],                 ans: 'Tokyo',           fact: 'Au Japon, les trains sont à l’heure à la seconde près !' },
  { flag: '🇨🇳', country: 'la Chine',      options: ['Shanghai', 'Pékin', 'Canton', 'Hong Kong'],          ans: 'Pékin',           fact: 'La Grande Muraille fait plus de 21 000 km !' },
  { flag: '🇺🇸', country: 'les États-Unis', options: ['New York', 'Los Angeles', 'Washington D.C.', 'Chicago'], ans: 'Washington D.C.', fact: 'Les États-Unis comptent 50 états !' },
  { flag: '🇧🇪', country: 'la Belgique',   options: ['Bruges', 'Liège', 'Bruxelles', 'Anvers'],            ans: 'Bruxelles',       fact: 'La Belgique est célèbre pour son chocolat !' },
  { flag: '🇵🇹', country: 'le Portugal',   options: ['Porto', 'Lisbonne', 'Faro', 'Braga'],                ans: 'Lisbonne',        fact: 'Lisbonne est construite sur 7 collines !' },
  { flag: '🇲🇦', country: 'le Maroc',      options: ['Casablanca', 'Marrakech', 'Rabat', 'Fès'],           ans: 'Rabat',           fact: 'Le Maroc a un désert ET des montagnes enneigées !' },
];

let GE = {};

GAME_INIT.geo = function initGeo() {
  GE = { questions: shuffle(GEO_DATA).slice(0, 10), idx: 0, score: 0 };
  document.getElementById('geo-score').textContent = '0';
  showGeoQ();
};

function showGeoQ() {
  if (GE.idx >= GE.questions.length) {
    return finishGame('geo', { score: GE.score, total: 10 });
  }
  const q = GE.questions[GE.idx];
  setDots('geo-dots', GE.idx, 10);
  document.getElementById('geo-feedback').textContent = '';
  document.getElementById('geo-fact').classList.add('hidden');

  const flagEl = document.getElementById('geo-flag');
  flagEl.textContent = q.flag;
  flagEl.style.animation = 'none';
  requestAnimationFrame(() => { flagEl.style.animation = ''; });
  document.getElementById('geo-question').textContent = `Quelle est la capitale de ${q.country} ?`;

  buildOptions(document.getElementById('geo-options'), shuffle(q.options), (val, btn, buttons) => {
    lockOptions(buttons);
    if (val === q.ans) {
      btn.classList.add('correct');
      GE.score++;
      document.getElementById('geo-score').textContent = GE.score;
      document.getElementById('geo-feedback').textContent = '🌍 ' + PRAISE[rand(0, PRAISE.length - 1)];
      SFX.correct();
      addStars(10);
    } else {
      btn.classList.add('wrong');
      buttons.find(b => b.textContent === q.ans)?.classList.add('correct');
      document.getElementById('geo-feedback').textContent = `❌ C'était ${q.ans} !`;
      SFX.wrong();
    }
    const factEl = document.getElementById('geo-fact');
    factEl.textContent = '💡 ' + q.fact;
    factEl.classList.remove('hidden');
    GE.idx++;
    setTimeout(showGeoQ, 2400);
  });
}

/* ============================================================
   9. COLORS — Magie des Couleurs
   ============================================================ */
const COLOR_LIST = [
  { name: 'ROUGE',  hex: '#FF3B30' },
  { name: 'BLEU',   hex: '#2E86FF' },
  { name: 'VERT',   hex: '#2BC36B' },
  { name: 'JAUNE',  hex: '#FFD60A' },
  { name: 'ORANGE', hex: '#FF8C00' },
  { name: 'VIOLET', hex: '#9B5DE5' },
  { name: 'ROSE',   hex: '#FF69B4' },
  { name: 'MARRON', hex: '#8B5A2B' },
  { name: 'GRIS',   hex: '#8E8E93' },
];

const COLOR_MIXES = [
  { target: 'ORANGE', parts: ['ROUGE', 'JAUNE'], result: '#FF8C00' },
  { target: 'VERT',   parts: ['BLEU', 'JAUNE'],  result: '#2BC36B' },
  { target: 'VIOLET', parts: ['ROUGE', 'BLEU'],  result: '#9B5DE5' },
  { target: 'ROSE',   parts: ['ROUGE', 'BLANC'], result: '#FF69B4' },
  { target: 'GRIS',   parts: ['NOIR', 'BLANC'],  result: '#8E8E93' },
];

const MIX_PALETTE = [
  { name: 'ROUGE', hex: '#FF3B30' },
  { name: 'BLEU',  hex: '#2E86FF' },
  { name: 'JAUNE', hex: '#FFD60A' },
  { name: 'BLANC', hex: '#F5F2EC' },
  { name: 'VERT',  hex: '#2BC36B' },
  { name: 'NOIR',  hex: '#3D3A50' },
];

let CL = {};

GAME_INIT.colors = function initColors() {
  CL = { mode: 'name', idx: 0, score: 0, target: null, mix: null, picked: [], locked: false };
  document.getElementById('col-score').textContent = '0';
  document.getElementById('col-tab-name').classList.add('active');
  document.getElementById('col-tab-mix').classList.remove('active');
  document.getElementById('col-name-mode').classList.remove('hidden');
  document.getElementById('col-mix-mode').classList.add('hidden');
  showColorQ();
};

function setColMode(mode, tab) {
  SFX.click();
  CL.mode = mode;
  document.querySelectorAll('.col-tab').forEach(t => t.classList.remove('active'));
  tab.classList.add('active');
  document.getElementById('col-name-mode').classList.toggle('hidden', mode !== 'name');
  document.getElementById('col-mix-mode').classList.toggle('hidden', mode !== 'mix');
  document.getElementById('col-feedback').textContent = '';
  if (mode === 'name') showColorQ(); else showMixQ();
}

function showColorQ() {
  if (CL.idx >= 10) return finishGame('colors', { score: CL.score, total: 10 });
  CL.locked = false;
  setDots('col-dots', CL.idx, 10);
  CL.target = COLOR_LIST[rand(0, COLOR_LIST.length - 1)];
  document.getElementById('col-target-name').textContent = CL.target.name;
  document.getElementById('col-feedback').textContent = '';

  const shown = shuffle([CL.target, ...shuffle(COLOR_LIST.filter(c => c.name !== CL.target.name)).slice(0, 5)]);
  const wrap = document.getElementById('col-swatches');
  wrap.innerHTML = '';
  shown.forEach(c => {
    const sw = document.createElement('button');
    sw.className = 'col-swatch';
    sw.style.background = c.hex;
    sw.setAttribute('aria-label', c.name);
    sw.addEventListener('click', () => {
      if (CL.locked) return;
      CL.locked = true;
      if (c.name === CL.target.name) {
        sw.classList.add('correct');
        CL.score++;
        document.getElementById('col-score').textContent = CL.score;
        document.getElementById('col-feedback').textContent = '🌈 ' + PRAISE[rand(0, PRAISE.length - 1)];
        SFX.correct();
        addStars(10);
      } else {
        sw.classList.add('wrong');
        document.getElementById('col-feedback').textContent = '❌ Pas tout à fait !';
        SFX.wrong();
      }
      CL.idx++;
      setTimeout(showColorQ, 1400);
    });
    wrap.appendChild(sw);
  });
}

function showMixQ() {
  CL.mix = COLOR_MIXES[rand(0, COLOR_MIXES.length - 1)];
  CL.picked = [];
  document.getElementById('mix-target').textContent = CL.mix.target;
  document.getElementById('mix-preview').style.background = '#F0EBE1';
  document.getElementById('mix-text').textContent = 'Choisis 2 couleurs';

  const wrap = document.getElementById('mix-colors');
  wrap.innerHTML = '';
  MIX_PALETTE.forEach(c => {
    const sw = document.createElement('button');
    sw.className = 'mix-swatch';
    sw.style.background = c.hex;
    sw.setAttribute('aria-label', c.name);
    sw.addEventListener('click', () => pickMixColor(sw, c.name));
    wrap.appendChild(sw);
  });
}

function pickMixColor(sw, name) {
  if (CL.picked.includes(name)) {
    CL.picked = CL.picked.filter(n => n !== name);
    sw.classList.remove('selected');
    return;
  }
  if (CL.picked.length >= 2) return;
  SFX.pop();
  CL.picked.push(name);
  sw.classList.add('selected');
  if (CL.picked.length < 2) return;

  const ok = CL.mix.parts.every(p => CL.picked.includes(p));
  if (ok) {
    document.getElementById('mix-preview').style.background = CL.mix.result;
    document.getElementById('mix-text').textContent = `🎨 Tu as fabriqué du ${CL.mix.target} !`;
    document.getElementById('col-feedback').textContent = '✨ Magique !';
    SFX.correct();
    addStars(15);
    setTimeout(showMixQ, 2100);
  } else {
    document.getElementById('mix-preview').style.background = '#A89F94';
    document.getElementById('mix-text').textContent = '❌ Hmm, ça ne donne pas ça…';
    SFX.wrong();
    setTimeout(() => {
      CL.picked = [];
      document.querySelectorAll('.mix-swatch').forEach(s => s.classList.remove('selected'));
      document.getElementById('mix-preview').style.background = '#F0EBE1';
      document.getElementById('mix-text').textContent = 'Choisis 2 couleurs';
    }, 1300);
  }
}

/* ============================================================
   10. DRAWING — Atelier Dessin
   ============================================================ */
const DRAW_COLORS = ['#3D3A50', '#FF3B30', '#FF8C00', '#FFD60A', '#2BC36B', '#2E86FF', '#9B5DE5', '#FF69B4', '#8B5A2B', '#FFFFFF'];
const STAMPS = ['⭐', '❤️', '🌸', '🦄', '🚗', '🍎', '⚽', '🌈', '🐱', '🎈'];

let D = {
  canvas: null, ctx: null, drawing: false,
  tool: 'brush', color: '#3D3A50', size: 5, stamp: '⭐',
  hue: 0, lastX: 0, lastY: 0, savedOnce: false
};

GAME_INIT.drawing = function initDrawing() {
  D.canvas = document.getElementById('draw-canvas');
  const panel = D.canvas.parentElement;
  D.canvas.width = Math.min(panel.clientWidth - 8, 880);
  D.canvas.height = Math.min(Math.round(window.innerHeight * 0.52), 480);
  D.ctx = D.canvas.getContext('2d');
  D.ctx.fillStyle = '#fff';
  D.ctx.fillRect(0, 0, D.canvas.width, D.canvas.height);
  D.ctx.lineCap = 'round';
  D.ctx.lineJoin = 'round';

  buildDrawPalette();
  buildStampsRow();
  if (!D.bound) { bindDrawEvents(); D.bound = true; }
};

function buildDrawPalette() {
  const pal = document.getElementById('draw-palette');
  pal.innerHTML = '';
  DRAW_COLORS.forEach((c, i) => {
    const dot = document.createElement('button');
    dot.className = 'draw-color' + (c === D.color ? ' active' : '');
    dot.style.background = c;
    if (c === '#FFFFFF') dot.style.borderColor = '#DDD';
    dot.setAttribute('aria-label', 'Couleur ' + (i + 1));
    dot.addEventListener('click', () => {
      SFX.pop();
      D.color = c;
      if (D.tool === 'eraser' || D.tool === 'rainbow') setTool('brush', document.getElementById('tool-brush'));
      pal.querySelectorAll('.draw-color').forEach(d => d.classList.remove('active'));
      dot.classList.add('active');
    });
    pal.appendChild(dot);
  });
}

function buildStampsRow() {
  const row = document.getElementById('stamps-row');
  row.innerHTML = '';
  STAMPS.forEach(s => {
    const btn = document.createElement('button');
    btn.className = 'stamp-btn' + (s === D.stamp ? ' active' : '');
    btn.textContent = s;
    btn.addEventListener('click', () => {
      SFX.pop();
      D.stamp = s;
      row.querySelectorAll('.stamp-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
    });
    row.appendChild(btn);
  });
}

function setTool(tool, btn) {
  SFX.click();
  D.tool = tool;
  document.querySelectorAll('.tool-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  document.getElementById('stamps-row').classList.toggle('hidden', tool !== 'stamp');
}

function setBrush(size, btn) {
  SFX.click();
  D.size = size;
  document.querySelectorAll('.size-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
}

function bindDrawEvents() {
  const c = D.canvas;
  const pos = e => {
    const r = c.getBoundingClientRect();
    const pt = e.touches ? e.touches[0] : e;
    return {
      x: (pt.clientX - r.left) * (c.width / r.width),
      y: (pt.clientY - r.top) * (c.height / r.height),
    };
  };

  const start = e => {
    e.preventDefault();
    const p = pos(e);
    if (D.tool === 'stamp') {
      D.ctx.font = `${D.size * 8 + 24}px serif`;
      D.ctx.textAlign = 'center';
      D.ctx.textBaseline = 'middle';
      D.ctx.fillText(D.stamp, p.x, p.y);
      SFX.pop();
      return;
    }
    D.drawing = true;
    D.lastX = p.x;
    D.lastY = p.y;
  };

  const move = e => {
    if (!D.drawing) return;
    e.preventDefault();
    const p = pos(e);
    D.ctx.beginPath();
    D.ctx.moveTo(D.lastX, D.lastY);
    D.ctx.lineTo(p.x, p.y);
    if (D.tool === 'eraser') {
      D.ctx.strokeStyle = '#fff';
      D.ctx.lineWidth = D.size * 3.5;
    } else if (D.tool === 'rainbow') {
      D.hue = (D.hue + 4) % 360;
      D.ctx.strokeStyle = `hsl(${D.hue}, 90%, 55%)`;
      D.ctx.lineWidth = D.size;
    } else {
      D.ctx.strokeStyle = D.color;
      D.ctx.lineWidth = D.size;
    }
    D.ctx.stroke();
    D.lastX = p.x;
    D.lastY = p.y;
  };

  const stop = () => { D.drawing = false; };

  c.addEventListener('mousedown', start);
  c.addEventListener('mousemove', move);
  c.addEventListener('mouseup', stop);
  c.addEventListener('mouseleave', stop);
  c.addEventListener('touchstart', start, { passive: false });
  c.addEventListener('touchmove', move, { passive: false });
  c.addEventListener('touchend', stop);
}

function clearCanvas() {
  SFX.click();
  D.ctx.fillStyle = '#fff';
  D.ctx.fillRect(0, 0, D.canvas.width, D.canvas.height);
}

function saveDrawing() {
  const link = document.createElement('a');
  link.download = 'mon-dessin.png';
  link.href = D.canvas.toDataURL('image/png');
  link.click();
  showToast('🎨 Dessin sauvegardé !');
  awardBadge('artist');
  if (!D.savedOnce) { D.savedOnce = true; addStars(20); }
}

function setTemplate(name) {
  clearCanvas();
  const ctx = D.ctx;
  ctx.strokeStyle = '#B8B2C7';
  ctx.lineWidth = 3;
  const cx = D.canvas.width / 2, cy = D.canvas.height / 2;

  if (name === 'maison') {
    ctx.strokeRect(cx - 80, cy - 20, 160, 120);
    ctx.beginPath();
    ctx.moveTo(cx - 100, cy - 20); ctx.lineTo(cx, cy - 110); ctx.lineTo(cx + 100, cy - 20);
    ctx.closePath(); ctx.stroke();
    ctx.strokeRect(cx - 20, cy + 40, 40, 60);
    ctx.strokeRect(cx + 30, cy + 5, 34, 34);
  } else if (name === 'soleil') {
    ctx.beginPath(); ctx.arc(cx, cy, 60, 0, Math.PI * 2); ctx.stroke();
    for (let i = 0; i < 10; i++) {
      const a = (i / 10) * Math.PI * 2;
      ctx.beginPath();
      ctx.moveTo(cx + Math.cos(a) * 72, cy + Math.sin(a) * 72);
      ctx.lineTo(cx + Math.cos(a) * 98, cy + Math.sin(a) * 98);
      ctx.stroke();
    }
  } else if (name === 'arbre') {
    ctx.strokeRect(cx - 14, cy + 20, 28, 80);
    ctx.beginPath(); ctx.arc(cx, cy - 30, 68, 0, Math.PI * 2); ctx.stroke();
    ctx.beginPath(); ctx.arc(cx - 50, cy, 36, 0, Math.PI * 2); ctx.stroke();
    ctx.beginPath(); ctx.arc(cx + 50, cy, 36, 0, Math.PI * 2); ctx.stroke();
  } else if (name === 'chat') {
    ctx.beginPath(); ctx.arc(cx, cy, 62, 0, Math.PI * 2); ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(cx - 50, cy - 38); ctx.lineTo(cx - 66, cy - 92); ctx.lineTo(cx - 18, cy - 58); ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(cx + 50, cy - 38); ctx.lineTo(cx + 66, cy - 92); ctx.lineTo(cx + 18, cy - 58); ctx.stroke();
    ctx.beginPath(); ctx.arc(cx - 22, cy - 12, 7, 0, Math.PI * 2); ctx.stroke();
    ctx.beginPath(); ctx.arc(cx + 22, cy - 12, 7, 0, Math.PI * 2); ctx.stroke();
    ctx.beginPath(); ctx.arc(cx, cy + 16, 12, 0.1 * Math.PI, 0.9 * Math.PI); ctx.stroke();
  }
  showToast('✏️ Modèle prêt, à toi de jouer !');
}
