/* ===== GLOBAL STATE ===== */
let totalScore = parseInt(localStorage.getItem('kidlearn-score') || '0');

function updateScore(pts) {
  totalScore += pts;
  localStorage.setItem('kidlearn-score', totalScore);
  document.getElementById('total-score').textContent = totalScore;
  if (pts > 0) spawnStars();
}

function spawnStars() {
  for (let i = 0; i < 3; i++) {
    const s = document.createElement('div');
    s.className = 'star-popup';
    s.textContent = '⭐';
    s.style.left = (30 + Math.random() * 40) + 'vw';
    s.style.top = (40 + Math.random() * 20) + 'vh';
    s.style.animationDelay = (i * 0.15) + 's';
    document.body.appendChild(s);
    setTimeout(() => s.remove(), 1200);
  }
}

function showToast(msg, duration = 2200) {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), duration);
}

function showHome() {
  document.querySelectorAll('.game-screen').forEach(s => s.classList.remove('active'));
  document.getElementById('home-screen').classList.add('active');
  stopAllTimers();
}

function openGame(id) {
  document.getElementById('home-screen').classList.remove('active');
  document.querySelectorAll('.game-screen').forEach(s => s.classList.remove('active'));
  const screen = document.getElementById('game-' + id);
  if (screen) {
    screen.classList.add('active');
    initGame(id);
  }
}

function initGame(id) {
  const map = {
    math: resetMath,
    memory: initMemory,
    alphabet: startAlphabet,
    animals: startAnimals,
    counting: startCounting,
    truefals: startTrueFalse,
    scramble: startScramble,
    geo: startGeo,
    colors: startColors,
    drawing: initDrawing,
  };
  if (map[id]) map[id]();
}

document.getElementById('total-score').textContent = totalScore;

let activeTimers = [];
function stopAllTimers() {
  activeTimers.forEach(t => clearInterval(t));
  activeTimers = [];
}

/* ============================================================
   MATH GAME
   ============================================================ */
let mathScore = 0, mathQ = 0, mathAnswer = 0, mathDiff = 'easy', mathTimer = null;

function resetMath() {
  mathScore = 0; mathQ = 0;
  document.getElementById('math-score').textContent = '0';
  document.getElementById('math-difficulty-select').classList.remove('hidden');
  document.getElementById('math-area').classList.add('hidden');
  document.getElementById('math-result').classList.add('hidden');
}

function startMath(diff) {
  mathDiff = diff;
  mathScore = 0; mathQ = 0;
  document.getElementById('math-difficulty-select').classList.add('hidden');
  document.getElementById('math-area').classList.remove('hidden');
  document.getElementById('math-result').classList.add('hidden');
  nextMathQuestion();
}

function nextMathQuestion() {
  if (mathQ >= 10) { endMath(); return; }
  mathQ++;
  document.getElementById('math-q-num').textContent = mathQ;
  document.getElementById('math-feedback').textContent = '';

  const ops = mathDiff === 'easy' ? ['+', '-'] :
               mathDiff === 'medium' ? ['+', '-', '×'] : ['+', '-', '×', '÷'];
  const op = ops[Math.floor(Math.random() * ops.length)];

  let a, b;
  if (op === '+') { a = rand(1, 20); b = rand(1, 20); mathAnswer = a + b; }
  else if (op === '-') { a = rand(5, 25); b = rand(1, a); mathAnswer = a - b; }
  else if (op === '×') { a = rand(2, 10); b = rand(2, 10); mathAnswer = a * b; }
  else { mathAnswer = rand(2, 10); b = rand(2, 10); a = mathAnswer * b; }

  document.getElementById('math-question').textContent = `${a} ${op} ${b} = ?`;

  const wrongs = generateWrongNumbers(mathAnswer, 3);
  const all = shuffle([mathAnswer, ...wrongs]);
  const cont = document.getElementById('math-options');
  cont.innerHTML = '';
  all.forEach(n => {
    const btn = document.createElement('button');
    btn.className = 'option-btn';
    btn.textContent = n;
    btn.onclick = () => checkMath(n, btn);
    cont.appendChild(btn);
  });

  startMathTimer();
}

function startMathTimer() {
  if (mathTimer) clearInterval(mathTimer);
  let t = 100;
  document.getElementById('math-timer-fill').style.width = '100%';
  mathTimer = setInterval(() => {
    t -= 1;
    document.getElementById('math-timer-fill').style.width = t + '%';
    if (t <= 0) {
      clearInterval(mathTimer);
      document.getElementById('math-feedback').textContent = `⏰ Temps ! Réponse: ${mathAnswer}`;
      disableMathOptions();
      setTimeout(nextMathQuestion, 1500);
    }
  }, 150);
  activeTimers.push(mathTimer);
}

function checkMath(val, btn) {
  if (mathTimer) clearInterval(mathTimer);
  disableMathOptions();
  if (val === mathAnswer) {
    btn.classList.add('correct');
    document.getElementById('math-feedback').textContent = '🎉 Bravo!';
    mathScore++;
    document.getElementById('math-score').textContent = mathScore;
    updateScore(10);
  } else {
    btn.classList.add('wrong');
    document.querySelector('#math-options .option-btn:nth-child(' + (
      [...document.querySelectorAll('#math-options .option-btn')].findIndex(b => parseInt(b.textContent) === mathAnswer) + 1
    ) + ')').classList.add('correct');
    document.getElementById('math-feedback').textContent = `❌ La réponse était ${mathAnswer}`;
  }
  setTimeout(nextMathQuestion, 1600);
}

function disableMathOptions() {
  document.querySelectorAll('#math-options .option-btn').forEach(b => b.onclick = null);
}

function endMath() {
  document.getElementById('math-area').classList.add('hidden');
  const res = document.getElementById('math-result');
  res.classList.remove('hidden');
  const pct = mathScore / 10;
  document.getElementById('math-result-emoji').textContent = pct >= 0.8 ? '🏆' : pct >= 0.5 ? '😊' : '💪';
  document.getElementById('math-result-title').textContent = pct >= 0.8 ? 'Génie des maths!' : pct >= 0.5 ? 'Bien joué!' : 'Continue à t\'entraîner!';
  document.getElementById('math-result-text').textContent = `Tu as eu ${mathScore}/10 bonnes réponses!`;
}

/* ============================================================
   MEMORY GAME
   ============================================================ */
const MEMORY_EMOJIS = ['🐶','🐱','🦁','🐸','🦊','🐼','🦋','🐠','🌸','🎈','🍕','🚀','🌈','⭐','🎵','🍦'];
let memFlipped = [], memMatched = 0, memMoves = 0, memLock = false, memTime = 0, memTimerI = null;

function initMemory() {
  const picked = shuffle(MEMORY_EMOJIS).slice(0, 8);
  const cards = shuffle([...picked, ...picked]);
  memFlipped = []; memMatched = 0; memMoves = 0; memLock = false;
  document.getElementById('memory-pairs').textContent = '0';
  document.getElementById('memory-moves').textContent = '0';
  document.getElementById('memory-result').classList.add('hidden');

  const grid = document.getElementById('memory-grid');
  grid.innerHTML = '';
  cards.forEach((emoji, i) => {
    const card = document.createElement('div');
    card.className = 'mem-card';
    card.dataset.emoji = emoji;
    card.dataset.idx = i;
    card.innerHTML = `<div class="mem-front">?</div><div class="mem-back">${emoji}</div>`;
    card.addEventListener('click', () => flipCard(card));
    grid.appendChild(card);
  });
}

function flipCard(card) {
  if (memLock || card.classList.contains('flipped') || card.classList.contains('matched')) return;
  card.classList.add('flipped');
  memFlipped.push(card);
  if (memFlipped.length === 2) {
    memMoves++;
    document.getElementById('memory-moves').textContent = memMoves;
    memLock = true;
    checkMemoryMatch();
  }
}

function checkMemoryMatch() {
  const [a, b] = memFlipped;
  if (a.dataset.emoji === b.dataset.emoji) {
    a.classList.add('matched'); b.classList.add('matched');
    memMatched++;
    document.getElementById('memory-pairs').textContent = memMatched;
    memFlipped = []; memLock = false;
    updateScore(15);
    if (memMatched === 8) {
      setTimeout(() => {
        document.getElementById('memory-result').classList.remove('hidden');
        const rating = memMoves <= 12 ? '🏆 Incroyable!' : memMoves <= 18 ? '⭐ Très bien!' : '👍 Bien joué!';
        document.getElementById('memory-result-text').textContent = `${rating} Tu as trouvé toutes les paires en ${memMoves} mouvements!`;
        updateScore(50);
      }, 600);
    }
  } else {
    setTimeout(() => {
      a.classList.remove('flipped'); b.classList.remove('flipped');
      memFlipped = []; memLock = false;
    }, 900);
  }
}

/* ============================================================
   ALPHABET GAME
   ============================================================ */
const ALPHA_DATA = [
  { letter:'A', words:['Ananas🍍','Avion✈️','Arbre🌳','Abeille🐝'], correct:'Ananas🍍' },
  { letter:'B', words:['Ballon🎈','Cerise🍒','Dauphin🐬','Éléphant🐘'], correct:'Ballon🎈' },
  { letter:'C', words:['Avion✈️','Citron🍋','Bateau⛵','Drapeau🚩'], correct:'Citron🍋' },
  { letter:'D', words:['Dragon🐉','Banane🍌','Crayon✏️','Fleur🌸'], correct:'Dragon🐉' },
  { letter:'E', words:['Girafe🦒','Étoile⭐','Arc-en-ciel🌈','Hibou🦉'], correct:'Étoile⭐' },
  { letter:'F', words:['Oiseau🐦','Nuage☁️','Fusée🚀','Jumeau👬'], correct:'Fusée🚀' },
  { letter:'G', words:['Gâteau🎂','Lion🦁','Maison🏠','Noix🌰'], correct:'Gâteau🎂' },
  { letter:'H', words:['Poisson🐟','Hérisson🦔','Renard🦊','Sapin🌲'], correct:'Hérisson🦔' },
  { letter:'I', words:['Tomate🍅','Île🏝️','Vache🐄','Zèbre🦓'], correct:'Île🏝️' },
  { letter:'J', words:['Jungle🌴','Kangourou🦘','Lune🌙','Mangue🥭'], correct:'Jungle🌴' },
  { letter:'L', words:['Artichaut🥦','Bleuet💙','Lapin🐰','Dinde🦃'], correct:'Lapin🐰' },
  { letter:'M', words:['Méduse🪼','Nénuphar🪷','Orange🍊','Papillon🦋'], correct:'Méduse🪼' },
  { letter:'N', words:['Koala🐨','Nuit🌙','Poulpe🐙','Renard🦊'], correct:'Nuit🌙' },
  { letter:'O', words:['Ours🐻','Ping-pong🏓','Quiche🥧','Rose🌹'], correct:'Ours🐻' },
  { letter:'P', words:['Tulipe🌷','Vache🐄','Pieuvre🐙','Xylophone🎵'], correct:'Pieuvre🐙' },
];

let alphaQuestions = [], alphaIdx = 0, alphaScore = 0;

function startAlphabet() {
  alphaQuestions = shuffle([...ALPHA_DATA]).slice(0, 10);
  alphaIdx = 0; alphaScore = 0;
  document.getElementById('alpha-score').textContent = '0';
  document.getElementById('alpha-result').classList.add('hidden');
  document.getElementById('alpha-area').classList.remove('hidden');
  showAlphaQuestion();
}

function showAlphaQuestion() {
  if (alphaIdx >= alphaQuestions.length) { endAlpha(); return; }
  const q = alphaQuestions[alphaIdx];
  document.getElementById('alpha-q-num').textContent = alphaIdx + 1;
  document.getElementById('alpha-letter').textContent = q.letter;
  document.getElementById('alpha-letter').style.animation = 'none';
  setTimeout(() => document.getElementById('alpha-letter').style.animation = '', 10);
  document.getElementById('alpha-feedback').textContent = '';

  const opts = shuffle(q.words);
  const cont = document.getElementById('alpha-options');
  cont.innerHTML = '';
  opts.forEach(w => {
    const btn = document.createElement('button');
    btn.className = 'option-btn';
    btn.textContent = w;
    btn.onclick = () => checkAlpha(w === q.correct, btn, q.correct, cont);
    cont.appendChild(btn);
  });
}

function checkAlpha(correct, btn, rightAnswer, cont) {
  cont.querySelectorAll('.option-btn').forEach(b => b.onclick = null);
  if (correct) {
    btn.classList.add('correct');
    document.getElementById('alpha-feedback').textContent = '🌟 Excellent!';
    alphaScore++;
    document.getElementById('alpha-score').textContent = alphaScore;
    updateScore(10);
  } else {
    btn.classList.add('wrong');
    cont.querySelectorAll('.option-btn').forEach(b => { if (b.textContent === rightAnswer) b.classList.add('correct'); });
    document.getElementById('alpha-feedback').textContent = '❌ Presque!';
  }
  alphaIdx++;
  setTimeout(showAlphaQuestion, 1500);
}

function endAlpha() {
  document.getElementById('alpha-area').classList.add('hidden');
  const res = document.getElementById('alpha-result');
  res.classList.remove('hidden');
  const p = alphaScore / 10;
  document.getElementById('alpha-result-title').textContent = p >= 0.8 ? '🏆 Champion de l\'alphabet!' : p >= 0.5 ? '📚 Bonne lecture!' : '🔤 Continue d\'apprendre!';
  document.getElementById('alpha-result-text').textContent = `Score: ${alphaScore}/10 !`;
}

/* ============================================================
   ANIMALS GAME
   ============================================================ */
const ANIMALS_DATA = [
  { emoji:'🦁', name:'Lion', options:['Lion','Tigre','Panthère','Guépard'], fact:'Le lion est appelé "Roi des animaux" et rugit à 8 km de distance!' },
  { emoji:'🐘', name:'Éléphant', options:['Rhinocéros','Hippopotame','Éléphant','Girafe'], fact:'Un éléphant peut boire 200 litres d\'eau par jour!' },
  { emoji:'🦒', name:'Girafe', options:['Chameau','Autruche','Zèbre','Girafe'], fact:'La girafe est le plus grand animal terrestre, mesurant jusqu\'à 6 mètres!' },
  { emoji:'🐧', name:'Pingouin', options:['Pingouin','Manchot','Pélican','Flamant'], fact:'Les pingouins ne savent pas voler mais sont d\'excellents nageurs!' },
  { emoji:'🦋', name:'Papillon', options:['Libellule','Papillon','Moustique','Abeille'], fact:'Le papillon goûte la nourriture avec ses pattes!' },
  { emoji:'🐙', name:'Pieuvre', options:['Méduse','Calamar','Pieuvre','Étoile de mer'], fact:'La pieuvre a 3 cœurs et du sang bleu!' },
  { emoji:'🦈', name:'Requin', options:['Dauphin','Requin','Baleine','Orque'], fact:'Les requins existent depuis 450 millions d\'années, avant les dinosaures!' },
  { emoji:'🐨', name:'Koala', options:['Koala','Panda','Paresseux','Wombat'], fact:'Le koala dort 20 heures par jour et sent comme la toux!' },
  { emoji:'🦜', name:'Perroquet', options:['Toucan','Perroquet','Corbeau','Mouette'], fact:'Certains perroquets peuvent apprendre plus de 1000 mots!' },
  { emoji:'🦓', name:'Zèbre', options:['Cheval','Âne','Zèbre','Okapi'], fact:'Chaque zèbre a des rayures uniques, comme nos empreintes digitales!' },
  { emoji:'🐠', name:'Poisson clown', options:['Poisson clown','Poisson-lune','Poisson rouge','Sardine'], fact:'Le poisson clown vit dans les anémones de mer pour se protéger!' },
  { emoji:'🦊', name:'Renard', options:['Loup','Renard','Chacal','Coyote'], fact:'Le renard peut entendre une souris sous 1 mètre de neige!' },
];

let animQuestions = [], animIdx = 0, animScore = 0, animWaiting = false;

function startAnimals() {
  animQuestions = shuffle([...ANIMALS_DATA]).slice(0, 10);
  animIdx = 0; animScore = 0; animWaiting = false;
  document.getElementById('anim-score').textContent = '0';
  document.getElementById('anim-result').classList.add('hidden');
  document.getElementById('animals-area').classList.remove('hidden');
  showAnimalQuestion();
}

function showAnimalQuestion() {
  if (animIdx >= animQuestions.length) { endAnimals(); return; }
  const q = animQuestions[animIdx];
  animWaiting = false;
  document.getElementById('anim-q-num').textContent = animIdx + 1;
  document.getElementById('anim-emoji').textContent = q.emoji;
  document.getElementById('anim-question').textContent = 'Quel est cet animal?';
  document.getElementById('anim-feedback').textContent = '';
  document.getElementById('anim-fact-box').style.display = 'none';

  const opts = shuffle(q.options);
  const cont = document.getElementById('anim-options');
  cont.innerHTML = '';
  opts.forEach(o => {
    const btn = document.createElement('button');
    btn.className = 'option-btn';
    btn.textContent = o;
    btn.onclick = () => checkAnimal(o === q.name, btn, q.name, cont, q.fact);
    cont.appendChild(btn);
  });
}

function checkAnimal(correct, btn, rightAnswer, cont, fact) {
  if (animWaiting) return;
  animWaiting = true;
  cont.querySelectorAll('.option-btn').forEach(b => b.onclick = null);
  if (correct) {
    btn.classList.add('correct');
    document.getElementById('anim-feedback').textContent = '🎉 Bien joué!';
    animScore++;
    document.getElementById('anim-score').textContent = animScore;
    updateScore(10);
  } else {
    btn.classList.add('wrong');
    cont.querySelectorAll('.option-btn').forEach(b => { if (b.textContent === rightAnswer) b.classList.add('correct'); });
    document.getElementById('anim-feedback').textContent = '❌ Dommage!';
  }
  document.getElementById('anim-fact').textContent = '💡 ' + fact;
  document.getElementById('anim-fact-box').style.display = 'block';
  animIdx++;
  setTimeout(showAnimalQuestion, 2500);
}

function endAnimals() {
  document.getElementById('animals-area').classList.add('hidden');
  const res = document.getElementById('anim-result');
  res.classList.remove('hidden');
  const p = animScore / 10;
  document.getElementById('anim-result-title').textContent = p >= 0.8 ? '🦁 Expert en animaux!' : p >= 0.5 ? '🐾 Bon naturaliste!' : '🌿 Continue d\'explorer!';
  document.getElementById('anim-result-text').textContent = `Tu as reconnu ${animScore}/10 animaux!`;
}

/* ============================================================
   COUNTING GAME
   ============================================================ */
const COUNT_OBJECTS = ['⭐','🍎','🌸','🐟','🎈','🦋','🍕','🌙','🍪','🎯','🐸','🌺'];
let countIdx = 0, countScore = 0, countAnswer = 0, countWaiting = false;

function startCounting() {
  countIdx = 0; countScore = 0; countWaiting = false;
  document.getElementById('count-score').textContent = '0';
  document.getElementById('count-result').classList.add('hidden');
  document.getElementById('counting-area').classList.remove('hidden');
  showCountQuestion();
}

function showCountQuestion() {
  if (countIdx >= 10) { endCounting(); return; }
  countWaiting = false;
  countIdx++;
  document.getElementById('count-q-num').textContent = countIdx;
  document.getElementById('count-feedback').textContent = '';

  const emoji = COUNT_OBJECTS[Math.floor(Math.random() * COUNT_OBJECTS.length)];
  countAnswer = rand(1, 15);
  const prompt = countAnswer <= 5 ? 'Combien d\'objets vois-tu?' :
                 countAnswer <= 10 ? 'Compte soigneusement!' : 'Un vrai défi!';
  document.getElementById('count-prompt').textContent = prompt + ' ' + emoji;

  const display = document.getElementById('count-objects');
  display.innerHTML = '';
  for (let i = 0; i < countAnswer; i++) {
    const span = document.createElement('span');
    span.className = 'count-obj';
    span.textContent = emoji;
    span.style.animationDelay = (i * 0.06) + 's';
    display.appendChild(span);
  }

  const btns = document.getElementById('count-buttons');
  btns.innerHTML = '';
  const choices = generateWrongNumbers(countAnswer, 9, 1, 20);
  const all = shuffle([countAnswer, ...choices]).slice(0, 10);
  all.sort((a, b) => a - b).forEach(n => {
    const btn = document.createElement('button');
    btn.className = 'count-btn';
    btn.textContent = n;
    btn.onclick = () => checkCount(n, btn);
    btns.appendChild(btn);
  });
}

function checkCount(val, btn) {
  if (countWaiting) return;
  countWaiting = true;
  document.querySelectorAll('.count-btn').forEach(b => b.onclick = null);
  if (val === countAnswer) {
    btn.style.background = '#2ecc71';
    btn.style.color = 'white';
    document.getElementById('count-feedback').textContent = '✅ Correct! ' + countAnswer + ' objets!';
    countScore++;
    document.getElementById('count-score').textContent = countScore;
    updateScore(10);
  } else {
    btn.style.background = '#e74c3c';
    btn.style.color = 'white';
    document.getElementById('count-feedback').textContent = `❌ Il y en avait ${countAnswer}!`;
  }
  setTimeout(showCountQuestion, 1600);
}

function endCounting() {
  document.getElementById('counting-area').classList.add('hidden');
  const res = document.getElementById('count-result');
  res.classList.remove('hidden');
  const p = countScore / 10;
  document.getElementById('count-result-title').textContent = p >= 0.8 ? '🏆 Super compteur!' : p >= 0.5 ? '📊 Bon compteur!' : '🔢 Pratique encore!';
  document.getElementById('count-result-text').textContent = `Tu as compté correctement ${countScore}/10 fois!`;
}

/* ============================================================
   TRUE/FALSE GAME
   ============================================================ */
const TF_DATA = [
  { q:"Les éléphants ont peur des souris.", ans:false, expl:"C'est un mythe! Les éléphants ne craignent pas du tout les souris.", cat:"🐾 Animaux" },
  { q:"Le soleil est une étoile.", ans:true, expl:"Oui! Le soleil est une étoile, comme les milliards d'autres dans l'univers.", cat:"🌟 Espace" },
  { q:"Les dauphins sont des poissons.", ans:false, expl:"Les dauphins sont des mammifères! Ils respirent l'air comme nous.", cat:"🐋 Animaux" },
  { q:"La lune produit sa propre lumière.", ans:false, expl:"Non! La lune réfléchit la lumière du soleil comme un miroir.", cat:"🌙 Espace" },
  { q:"Le cœur d'un adulte bat environ 70 fois par minute.", ans:true, expl:"Exact! Un cœur normal bat entre 60 et 100 fois par minute.", cat:"❤️ Corps humain" },
  { q:"Les plantes respirent du dioxyde de carbone (CO₂).", ans:true, expl:"Oui! Les plantes absorbent le CO₂ et rejettent de l'oxygène.", cat:"🌿 Nature" },
  { q:"La baleine bleue est le plus grand animal ayant jamais existé.", ans:true, expl:"La baleine bleue mesure 30 m et pèse 180 tonnes, plus que les dinosaures!", cat:"🐋 Animaux" },
  { q:"L'eau bout à 50 degrés.", ans:false, expl:"L'eau bout à 100°C (au niveau de la mer). À 50°C elle est juste chaude.", cat:"🔬 Sciences" },
  { q:"Les os sont plus résistants que le béton.", ans:true, expl:"Gram pour gram, l'os humain est 5 fois plus résistant que l'acier!", cat:"💪 Corps humain" },
  { q:"Les araignées ont 6 pattes.", ans:false, expl:"Les araignées ont 8 pattes! Les insectes, eux, en ont 6.", cat:"🕷️ Animaux" },
  { q:"La Terre est parfaitement ronde.", ans:false, expl:"La Terre est légèrement aplatie aux pôles, on dit qu'elle est un géoïde.", cat:"🌍 Planète" },
  { q:"Les chauves-souris sont aveugles.", ans:false, expl:"Les chauves-souris voient très bien! Elles utilisent aussi l'écholocation.", cat:"🦇 Animaux" },
];

let tfQuestions = [], tfIdx = 0, tfScore = 0, tfWaiting = false;

function startTrueFalse() {
  tfQuestions = shuffle([...TF_DATA]).slice(0, 10);
  tfIdx = 0; tfScore = 0; tfWaiting = false;
  document.getElementById('tf-score').textContent = '0';
  document.getElementById('tf-result').classList.add('hidden');
  document.getElementById('tf-area').classList.remove('hidden');
  showTFQuestion();
}

function showTFQuestion() {
  if (tfIdx >= tfQuestions.length) { endTF(); return; }
  tfWaiting = false;
  const q = tfQuestions[tfIdx];
  document.getElementById('tf-q-num').textContent = tfIdx + 1;
  document.getElementById('tf-category').textContent = q.cat;
  document.getElementById('tf-question').textContent = q.q;
  document.getElementById('tf-feedback').textContent = '';
  document.getElementById('tf-explanation').classList.add('hidden');
  document.querySelectorAll('.tf-btn').forEach(b => { b.disabled = false; b.style.opacity = ''; });
}

function answerTF(val) {
  if (tfWaiting) return;
  tfWaiting = true;
  const q = tfQuestions[tfIdx];
  document.querySelectorAll('.tf-btn').forEach(b => b.disabled = true);

  document.getElementById('tf-explanation').textContent = '💡 ' + q.expl;
  document.getElementById('tf-explanation').classList.remove('hidden');

  if (val === q.ans) {
    document.getElementById('tf-feedback').textContent = '🎉 Correct!';
    tfScore++;
    document.getElementById('tf-score').textContent = tfScore;
    updateScore(10);
  } else {
    document.getElementById('tf-feedback').textContent = `❌ C'était ${q.ans ? 'VRAI' : 'FAUX'}!`;
  }
  tfIdx++;
  setTimeout(showTFQuestion, 2500);
}

function endTF() {
  document.getElementById('tf-area').classList.add('hidden');
  const res = document.getElementById('tf-result');
  res.classList.remove('hidden');
  const p = tfScore / 10;
  document.getElementById('tf-result-title').textContent = p >= 0.8 ? '🧠 Génie scientifique!' : p >= 0.5 ? '📖 Bon élève!' : '🌱 Continue d\'apprendre!';
  document.getElementById('tf-result-text').textContent = `Tu as eu ${tfScore}/10 bonnes réponses!`;
}

/* ============================================================
   SCRAMBLE GAME
   ============================================================ */
const SCRAMBLE_DATA = [
  { word:'LION', hint:'🦁', cat:'🐾 Animaux' },
  { word:'CHAT', hint:'🐱', cat:'🐾 Animaux' },
  { word:'CHIEN', hint:'🐶', cat:'🐾 Animaux' },
  { word:'LAPIN', hint:'🐰', cat:'🐾 Animaux' },
  { word:'ARBRE', hint:'🌳', cat:'🌿 Nature' },
  { word:'FLEUR', hint:'🌸', cat:'🌿 Nature' },
  { word:'SOLEIL', hint:'☀️', cat:'🌤️ Ciel' },
  { word:'NUAGE', hint:'☁️', cat:'🌤️ Ciel' },
  { word:'MAISON', hint:'🏠', cat:'🏙️ Ville' },
  { word:'BATEAU', hint:'⛵', cat:'🌊 Mer' },
  { word:'PIZZA', hint:'🍕', cat:'🍽️ Nourriture' },
  { word:'GATEAU', hint:'🎂', cat:'🍽️ Nourriture' },
  { word:'FUSEE', hint:'🚀', cat:'🌟 Espace' },
  { word:'DRAGON', hint:'🐉', cat:'🎮 Fantaisie' },
  { word:'BALLON', hint:'🎈', cat:'🎮 Jouets' },
];

let scrQuestions = [], scrIdx = 0, scrScore = 0;
let scrCurrent = '', scrScrambled = [], scrUsed = [], scrAnswer = [];

function startScramble() {
  scrQuestions = shuffle([...SCRAMBLE_DATA]).slice(0, 10);
  scrIdx = 0; scrScore = 0;
  document.getElementById('scr-score').textContent = '0';
  document.getElementById('scr-result').classList.add('hidden');
  document.getElementById('scr-area').classList.remove('hidden');
  showScrambleQuestion();
}

function showScrambleQuestion() {
  if (scrIdx >= scrQuestions.length) { endScramble(); return; }
  const q = scrQuestions[scrIdx];
  scrCurrent = q.word;
  scrScrambled = shuffle(q.word.split(''));
  scrUsed = new Array(scrScrambled.length).fill(false);
  scrAnswer = [];

  document.getElementById('scr-q-num').textContent = scrIdx + 1;
  document.getElementById('scr-category').textContent = 'Catégorie: ' + q.cat;
  document.getElementById('scr-hint').textContent = q.hint;
  document.getElementById('scr-feedback').textContent = '';
  renderScramble();
}

function renderScramble() {
  const lettersEl = document.getElementById('scr-letters');
  lettersEl.innerHTML = '';
  scrScrambled.forEach((l, i) => {
    const div = document.createElement('div');
    div.className = 'scr-letter' + (scrUsed[i] ? ' used' : '');
    div.textContent = l;
    if (!scrUsed[i]) div.onclick = () => pickLetter(i);
    lettersEl.appendChild(div);
  });

  const answerEl = document.getElementById('scr-answer');
  answerEl.innerHTML = '';
  for (let i = 0; i < scrCurrent.length; i++) {
    const div = document.createElement('div');
    div.className = 'answer-slot' + (scrAnswer[i] !== undefined ? ' filled' : '');
    div.textContent = scrAnswer[i]?.letter ?? '';
    if (scrAnswer[i] !== undefined) div.onclick = () => removeLetter(i);
    answerEl.appendChild(div);
  }
}

function pickLetter(idx) {
  const nextSlot = scrAnswer.length;
  if (nextSlot >= scrCurrent.length) return;
  scrUsed[idx] = true;
  scrAnswer.push({ letter: scrScrambled[idx], srcIdx: idx });
  renderScramble();
}

function removeLetter(slotIdx) {
  if (slotIdx !== scrAnswer.length - 1) {
    const removed = scrAnswer.splice(slotIdx, 1)[0];
    scrUsed[removed.srcIdx] = false;
    for (let i = slotIdx; i < scrAnswer.length; i++) {
      // items shift left naturally
    }
  } else {
    const removed = scrAnswer.pop();
    scrUsed[removed.srcIdx] = false;
  }
  renderScramble();
}

function clearScrAnswer() {
  scrAnswer.forEach(a => { scrUsed[a.srcIdx] = false; });
  scrAnswer = [];
  renderScramble();
}

function checkScramble() {
  const formed = scrAnswer.map(a => a.letter).join('');
  if (formed.length < scrCurrent.length) {
    document.getElementById('scr-feedback').textContent = '⚠️ Complète le mot!';
    return;
  }
  if (formed === scrCurrent) {
    document.getElementById('scr-feedback').textContent = '🎉 Bravo! ' + scrCurrent;
    scrScore++;
    document.getElementById('scr-score').textContent = scrScore;
    updateScore(15);
    scrIdx++;
    setTimeout(showScrambleQuestion, 1500);
  } else {
    document.getElementById('scr-feedback').textContent = '❌ Essaie encore!';
    clearScrAnswer();
  }
}

function endScramble() {
  document.getElementById('scr-area').classList.add('hidden');
  const res = document.getElementById('scr-result');
  res.classList.remove('hidden');
  const p = scrScore / 10;
  document.getElementById('scr-result-title').textContent = p >= 0.8 ? '📚 Maître des mots!' : p >= 0.5 ? '✏️ Bon joueur!' : '🔤 Continue!';
  document.getElementById('scr-result-text').textContent = `Tu as trouvé ${scrScore}/10 mots!`;
}

/* ============================================================
   GEO GAME
   ============================================================ */
const GEO_DATA = [
  { flag:'🇫🇷', q:'Quelle est la capitale de la France?', options:['Paris','Lyon','Marseille','Bordeaux'], ans:'Paris' },
  { flag:'🇩🇪', q:'Quelle est la capitale de l\'Allemagne?', options:['Munich','Berlin','Hambourg','Cologne'], ans:'Berlin' },
  { flag:'🇪🇸', q:'Quelle est la capitale de l\'Espagne?', options:['Barcelone','Séville','Madrid','Valence'], ans:'Madrid' },
  { flag:'🇮🇹', q:'Quelle est la capitale de l\'Italie?', options:['Milan','Naples','Rome','Florence'], ans:'Rome' },
  { flag:'🇬🇧', q:'Quelle est la capitale du Royaume-Uni?', options:['Manchester','Londres','Édimbourg','Bristol'], ans:'Londres' },
  { flag:'🇧🇷', q:'Quelle est la capitale du Brésil?', options:['São Paulo','Rio de Janeiro','Brasília','Salvador'], ans:'Brasília' },
  { flag:'🇯🇵', q:'Quelle est la capitale du Japon?', options:['Osaka','Tokyo','Kyoto','Hiroshima'], ans:'Tokyo' },
  { flag:'🇨🇳', q:'Quelle est la capitale de la Chine?', options:['Shanghai','Beijing','Canton','Wuhan'], ans:'Beijing' },
  { flag:'🇺🇸', q:'Quelle est la capitale des États-Unis?', options:['New York','Los Angeles','Washington D.C.','Chicago'], ans:'Washington D.C.' },
  { flag:'🇧🇪', q:'Quelle est la capitale de la Belgique?', options:['Bruges','Liège','Bruxelles','Gand'], ans:'Bruxelles' },
  { flag:'🇵🇹', q:'Quelle est la capitale du Portugal?', options:['Porto','Lisbonne','Faro','Coimbra'], ans:'Lisbonne' },
  { flag:'🇲🇦', q:'Quelle est la capitale du Maroc?', options:['Casablanca','Marrakech','Rabat','Fès'], ans:'Rabat' },
];

let geoQuestions = [], geoIdx = 0, geoScore = 0, geoWaiting = false;

function startGeo() {
  geoQuestions = shuffle([...GEO_DATA]).slice(0, 10);
  geoIdx = 0; geoScore = 0; geoWaiting = false;
  document.getElementById('geo-score').textContent = '0';
  document.getElementById('geo-result').classList.add('hidden');
  document.getElementById('geo-area').classList.remove('hidden');
  showGeoQuestion();
}

function showGeoQuestion() {
  if (geoIdx >= geoQuestions.length) { endGeo(); return; }
  geoWaiting = false;
  const q = geoQuestions[geoIdx];
  document.getElementById('geo-q-num').textContent = geoIdx + 1;
  document.getElementById('geo-flag').textContent = q.flag;
  document.getElementById('geo-flag').style.animation = 'none';
  setTimeout(() => document.getElementById('geo-flag').style.animation = '', 10);
  document.getElementById('geo-question').textContent = q.q;
  document.getElementById('geo-feedback').textContent = '';

  const cont = document.getElementById('geo-options');
  cont.innerHTML = '';
  shuffle(q.options).forEach(o => {
    const btn = document.createElement('button');
    btn.className = 'option-btn';
    btn.textContent = o;
    btn.onclick = () => checkGeo(o === q.ans, btn, q.ans, cont);
    cont.appendChild(btn);
  });
}

function checkGeo(correct, btn, ans, cont) {
  if (geoWaiting) return;
  geoWaiting = true;
  cont.querySelectorAll('.option-btn').forEach(b => b.onclick = null);
  if (correct) {
    btn.classList.add('correct');
    document.getElementById('geo-feedback').textContent = '🌍 Bravo!';
    geoScore++;
    document.getElementById('geo-score').textContent = geoScore;
    updateScore(10);
  } else {
    btn.classList.add('wrong');
    cont.querySelectorAll('.option-btn').forEach(b => { if (b.textContent === ans) b.classList.add('correct'); });
    document.getElementById('geo-feedback').textContent = '❌ C\'était ' + ans + '!';
  }
  geoIdx++;
  setTimeout(showGeoQuestion, 1600);
}

function endGeo() {
  document.getElementById('geo-area').classList.add('hidden');
  const res = document.getElementById('geo-result');
  res.classList.remove('hidden');
  const p = geoScore / 10;
  document.getElementById('geo-result-title').textContent = p >= 0.8 ? '🗺️ Explorateur mondial!' : p >= 0.5 ? '✈️ Bon voyageur!' : '🌱 Continue d\'explorer!';
  document.getElementById('geo-result-text').textContent = `Tu connais ${geoScore}/10 capitales!`;
}

/* ============================================================
   COLORS GAME
   ============================================================ */
const COLORS = [
  { name:'ROUGE', hex:'#FF3333' },
  { name:'BLEU', hex:'#3399FF' },
  { name:'VERT', hex:'#33CC66' },
  { name:'JAUNE', hex:'#FFD700' },
  { name:'ORANGE', hex:'#FF8C00' },
  { name:'VIOLET', hex:'#9B59B6' },
  { name:'ROSE', hex:'#FF69B4' },
  { name:'MARRON', hex:'#8B4513' },
  { name:'GRIS', hex:'#808080' },
];

const COLOR_MIXES = [
  { target:'ORANGE', c1:'ROUGE', c2:'JAUNE', result:'#FF8C00' },
  { target:'VERT', c1:'BLEU', c2:'JAUNE', result:'#33CC66' },
  { target:'VIOLET', c1:'ROUGE', c2:'BLEU', result:'#9B59B6' },
  { target:'ROSE', c1:'ROUGE', c2:'BLANC', result:'#FF69B4' },
  { target:'MARRON', c1:'ROUGE', c2:'VERT', result:'#8B4513' },
];

let colMode = 'name', colIdx = 0, colScore = 0, colTarget = null;
let mixSelected = [], colWaiting = false;

function startColors() {
  colIdx = 0; colScore = 0; colWaiting = false;
  document.getElementById('col-score').textContent = '0';
  document.getElementById('col-result').classList.add('hidden');
  document.getElementById('col-area').classList.remove('hidden');
  setColMode('name');
}

function setColMode(mode) {
  colMode = mode;
  document.querySelectorAll('.col-tab').forEach(t => t.classList.remove('active'));
  event && event.target.classList.add('active');
  if (mode === 'name') {
    document.getElementById('col-name-mode').classList.remove('hidden');
    document.getElementById('col-mix-mode').classList.add('hidden');
    showColorQuestion();
  } else {
    document.getElementById('col-name-mode').classList.add('hidden');
    document.getElementById('col-mix-mode').classList.remove('hidden');
    showMixQuestion();
  }
}

function showColorQuestion() {
  if (colIdx >= 10) { endColors(); return; }
  colWaiting = false;
  colTarget = COLORS[Math.floor(Math.random() * COLORS.length)];
  document.getElementById('col-q-num').textContent = colIdx + 1;
  document.getElementById('col-target-name').textContent = colTarget.name;
  document.getElementById('col-feedback').textContent = '';

  const shown = shuffle([colTarget, ...COLORS.filter(c => c.name !== colTarget.name)]).slice(0, 6);
  const cont = document.getElementById('col-swatches');
  cont.innerHTML = '';
  shown.forEach(c => {
    const div = document.createElement('div');
    div.className = 'color-swatch';
    div.style.background = c.hex;
    div.onclick = () => checkColor(c.name === colTarget.name, div, cont);
    cont.appendChild(div);
  });
}

function checkColor(correct, div, cont) {
  if (colWaiting) return;
  colWaiting = true;
  cont.querySelectorAll('.color-swatch').forEach(s => s.onclick = null);
  if (correct) {
    div.classList.add('correct');
    document.getElementById('col-feedback').textContent = '🌈 Parfait!';
    colScore++;
    document.getElementById('col-score').textContent = colScore;
    updateScore(10);
  } else {
    div.classList.add('wrong');
    document.getElementById('col-feedback').textContent = '❌ Pas tout à fait!';
  }
  colIdx++;
  setTimeout(showColorQuestion, 1500);
}

function showMixQuestion() {
  const mix = COLOR_MIXES[Math.floor(Math.random() * COLOR_MIXES.length)];
  mixSelected = [];
  document.getElementById('col-mix-target').textContent = mix.target;
  document.getElementById('mix-preview').style.background = '#eee';
  document.getElementById('mix-result-text').textContent = 'Sélectionne 2 couleurs';
  document.getElementById('col-feedback').textContent = '';

  const mixColors = [
    { name:'ROUGE', hex:'#FF3333' },
    { name:'BLEU', hex:'#3399FF' },
    { name:'JAUNE', hex:'#FFD700' },
    { name:'BLANC', hex:'#F0F0F0' },
    { name:'VERT', hex:'#33CC66' },
    { name:'NOIR', hex:'#333333' },
  ];

  const cont = document.getElementById('mix-colors');
  cont.innerHTML = '';
  mixColors.forEach(c => {
    const div = document.createElement('div');
    div.className = 'mix-swatch';
    div.style.background = c.hex;
    div.dataset.name = c.name;
    div.onclick = () => selectMixColor(div, c.name, mix);
    cont.appendChild(div);
  });
}

function selectMixColor(div, name, mix) {
  if (mixSelected.includes(name)) {
    mixSelected = mixSelected.filter(n => n !== name);
    div.classList.remove('selected');
  } else if (mixSelected.length < 2) {
    mixSelected.push(name);
    div.classList.add('selected');
  }

  if (mixSelected.length === 2) {
    const correct = mixSelected.includes(mix.c1) && mixSelected.includes(mix.c2);
    if (correct) {
      document.getElementById('mix-preview').style.background = mix.result;
      document.getElementById('mix-result-text').textContent = '🎨 Génial! Tu as fait ' + mix.target + '!';
      document.getElementById('col-feedback').textContent = '✅ Bravo!';
      colScore++;
      document.getElementById('col-score').textContent = colScore;
      updateScore(15);
      setTimeout(() => showMixQuestion(), 2000);
    } else {
      document.getElementById('mix-preview').style.background = '#ccc';
      document.getElementById('mix-result-text').textContent = '❌ Ce n\'est pas la bonne combinaison!';
      setTimeout(() => {
        mixSelected = [];
        document.querySelectorAll('.mix-swatch').forEach(s => s.classList.remove('selected'));
        document.getElementById('mix-result-text').textContent = 'Sélectionne 2 couleurs';
        document.getElementById('mix-preview').style.background = '#eee';
        document.getElementById('col-feedback').textContent = '';
      }, 1200);
    }
  }
}

function endColors() {
  document.getElementById('col-area').classList.add('hidden');
  document.getElementById('col-result').classList.remove('hidden');
  document.getElementById('col-result-text').textContent = `Tu as trouvé ${colScore}/10 couleurs!`;
}

/* ============================================================
   DRAWING GAME
   ============================================================ */
const DRAW_COLORS = ['#000000','#FF3333','#FF8C00','#FFD700','#33CC66','#3399FF','#9B59B6','#FF69B4','#8B4513','#FFFFFF'];
let drawCanvas, drawCtx, isDrawing = false, drawColor = '#000000', drawSize = 5, isEraser = false;
let lastX = 0, lastY = 0;

function initDrawing() {
  drawCanvas = document.getElementById('draw-canvas');
  const container = drawCanvas.parentElement;
  drawCanvas.width = Math.min(container.clientWidth - 32, 900);
  drawCanvas.height = Math.min(window.innerHeight * 0.55, 500);

  drawCtx = drawCanvas.getContext('2d');
  drawCtx.fillStyle = 'white';
  drawCtx.fillRect(0, 0, drawCanvas.width, drawCanvas.height);
  drawCtx.lineCap = 'round';
  drawCtx.lineJoin = 'round';

  buildPalette();
  setupDrawEvents();
}

function buildPalette() {
  const pal = document.getElementById('draw-palette');
  pal.innerHTML = '';
  DRAW_COLORS.forEach((c, i) => {
    const div = document.createElement('div');
    div.className = 'draw-color' + (i === 0 ? ' active' : '');
    div.style.background = c;
    if (c === '#FFFFFF') div.style.border = '3px solid #ccc';
    div.onclick = () => {
      document.querySelectorAll('.draw-color').forEach(d => d.classList.remove('active'));
      div.classList.add('active');
      drawColor = c;
      isEraser = false;
      document.getElementById('eraser-btn').classList.remove('active');
    };
    pal.appendChild(div);
  });
}

function setupDrawEvents() {
  const c = drawCanvas;
  c.addEventListener('mousedown', startDraw);
  c.addEventListener('mousemove', draw);
  c.addEventListener('mouseup', stopDraw);
  c.addEventListener('mouseleave', stopDraw);
  c.addEventListener('touchstart', e => { e.preventDefault(); startDraw(getTouchPos(e)); }, { passive: false });
  c.addEventListener('touchmove', e => { e.preventDefault(); draw(getTouchPos(e)); }, { passive: false });
  c.addEventListener('touchend', stopDraw);
}

function getTouchPos(e) {
  const t = e.touches[0];
  const rect = drawCanvas.getBoundingClientRect();
  return { offsetX: (t.clientX - rect.left) * (drawCanvas.width / rect.width),
           offsetY: (t.clientY - rect.top) * (drawCanvas.height / rect.height) };
}

function startDraw(e) {
  isDrawing = true;
  lastX = e.offsetX; lastY = e.offsetY;
}

function draw(e) {
  if (!isDrawing) return;
  drawCtx.beginPath();
  drawCtx.moveTo(lastX, lastY);
  drawCtx.lineTo(e.offsetX, e.offsetY);
  drawCtx.strokeStyle = isEraser ? '#FFFFFF' : drawColor;
  drawCtx.lineWidth = isEraser ? drawSize * 3 : drawSize;
  drawCtx.stroke();
  lastX = e.offsetX; lastY = e.offsetY;
}

function stopDraw() { isDrawing = false; }

function setBrush(size) {
  drawSize = size;
  document.querySelectorAll('.brush-btn').forEach(b => b.classList.remove('active'));
  event && event.currentTarget && event.currentTarget.classList.add('active');
}

function toggleEraser() {
  isEraser = !isEraser;
  document.getElementById('eraser-btn').classList.toggle('active', isEraser);
}

function clearCanvas() {
  drawCtx.fillStyle = 'white';
  drawCtx.fillRect(0, 0, drawCanvas.width, drawCanvas.height);
}

function saveDrawing() {
  const link = document.createElement('a');
  link.download = 'mon-dessin.png';
  link.href = drawCanvas.toDataURL();
  link.click();
  showToast('🎨 Dessin sauvegardé!');
}

function setTemplate(name) {
  clearCanvas();
  drawCtx.strokeStyle = '#333';
  drawCtx.lineWidth = 3;
  const w = drawCanvas.width, h = drawCanvas.height;
  const cx = w / 2, cy = h / 2;

  if (name === 'maison') {
    drawCtx.beginPath();
    drawCtx.rect(cx - 80, cy - 20, 160, 120);
    drawCtx.stroke();
    drawCtx.beginPath();
    drawCtx.moveTo(cx - 100, cy - 20);
    drawCtx.lineTo(cx, cy - 120);
    drawCtx.lineTo(cx + 100, cy - 20);
    drawCtx.closePath();
    drawCtx.stroke();
    drawCtx.beginPath();
    drawCtx.rect(cx - 20, cy + 40, 40, 60);
    drawCtx.stroke();
  } else if (name === 'soleil') {
    drawCtx.beginPath();
    drawCtx.arc(cx, cy, 60, 0, Math.PI * 2);
    drawCtx.stroke();
    for (let i = 0; i < 8; i++) {
      const angle = (i / 8) * Math.PI * 2;
      drawCtx.beginPath();
      drawCtx.moveTo(cx + Math.cos(angle) * 70, cy + Math.sin(angle) * 70);
      drawCtx.lineTo(cx + Math.cos(angle) * 95, cy + Math.sin(angle) * 95);
      drawCtx.stroke();
    }
  } else if (name === 'arbre') {
    drawCtx.beginPath();
    drawCtx.rect(cx - 15, cy + 20, 30, 80);
    drawCtx.stroke();
    drawCtx.beginPath();
    drawCtx.arc(cx, cy - 30, 70, 0, Math.PI * 2);
    drawCtx.stroke();
  } else if (name === 'chat') {
    drawCtx.beginPath();
    drawCtx.arc(cx, cy, 60, 0, Math.PI * 2);
    drawCtx.stroke();
    drawCtx.beginPath();
    drawCtx.moveTo(cx - 50, cy - 40);
    drawCtx.lineTo(cx - 65, cy - 90);
    drawCtx.lineTo(cx - 20, cy - 55);
    drawCtx.stroke();
    drawCtx.beginPath();
    drawCtx.moveTo(cx + 50, cy - 40);
    drawCtx.lineTo(cx + 65, cy - 90);
    drawCtx.lineTo(cx + 20, cy - 55);
    drawCtx.stroke();
    drawCtx.beginPath();
    drawCtx.arc(cx - 20, cy - 10, 8, 0, Math.PI * 2);
    drawCtx.arc(cx + 20, cy - 10, 8, 0, Math.PI * 2);
    drawCtx.fill();
    drawCtx.beginPath();
    drawCtx.arc(cx, cy + 15, 10, 0, Math.PI);
    drawCtx.stroke();
  }
  showToast('🎨 Modèle chargé! À toi de colorier!');
}

/* ============================================================
   UTILITY FUNCTIONS
   ============================================================ */
function rand(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function generateWrongNumbers(correct, count, min = 0, max = 100) {
  const wrongs = new Set();
  while (wrongs.size < count) {
    let n = correct + rand(-10, 10);
    if (n !== correct && n >= min && n <= max) wrongs.add(n);
  }
  return [...wrongs];
}

/* ============================================================
   CONFETTI ON HIGH SCORES
   ============================================================ */
function confetti() {
  const colors = ['#FF6B6B','#4ECDC4','#FFE66D','#6C63FF','#FF8B94'];
  for (let i = 0; i < 40; i++) {
    const el = document.createElement('div');
    el.style.cssText = `
      position:fixed; width:10px; height:10px; border-radius:2px;
      background:${colors[i % colors.length]};
      left:${Math.random()*100}vw; top:-10px;
      animation: fall ${1+Math.random()*2}s ease ${Math.random()}s forwards;
      z-index:300; pointer-events:none;
    `;
    document.body.appendChild(el);
    setTimeout(() => el.remove(), 3500);
  }
}

const fallStyle = document.createElement('style');
fallStyle.textContent = `
  @keyframes fall {
    from { transform: translateY(-10px) rotate(0deg); opacity:1; }
    to   { transform: translateY(110vh)  rotate(720deg); opacity:0; }
  }
`;
document.head.appendChild(fallStyle);
