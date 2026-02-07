import { GoogleGenAI } from "@google/genai";

// --- STATE MANAGEMENT ---
const state = {
  lang: 'KR', // 'KR' | 'EN'
  step: 'INTRO',
  user: { name: '', age: 0, group: 'kids' }, // kids | adult
  cards: [],
  likedCards: [],
  rankedCards: [], // Objects: { id, order }
  currentIndex: 0
};

// --- STRINGS & TRANSLATIONS ---
const STRINGS = {
  KR: {
    heroTitle: '프레디저<br>적성 검사',
    heroSubtitle: 'Prediger Career Diagnosis',
    btnStart: '진단 시작하기',
    labelName: '이름',
    labelBirth: '생년월일',
    namePlaceholder: '이름을 입력하세요',
    sortingTitle: '마음에 드는 활동인가요?',
    sortingSubtitle: '카드를 오른쪽으로 밀면 선택됩니다.',
    textExit: '나가기',
    labelLiked: '선택한 카드 리스트',
    rankingTitle: '가장 중요한 3가지 선택',
    rankingSubtitle: '선택한 카드들 중 당신을 가장 잘 나타내는 3장을 순서대로 골라주세요.',
    textSelected: '선택됨',
    textViewReport: '분석 리포트 생성하기',
    textReportFor: 'DIAGNOSIS REPORT',
    labelMap: 'Prediger Interest Map',
    labelDimension: 'Dimension Scores',
    labelAI: 'AI 커리어 인사이트',
    labelJobs: '추천 직업군',
    btnRestart: '검사 다시 시작하기',
    aiLoading: '분석 리포트를 생성하고 있습니다...',
    errorFetch: 'JSON 파일을 찾을 수 없습니다. 경로를 확인해주세요.',
    unknown: '균형 잡힌 탐험가'
  },
  EN: {
    heroTitle: 'Prediger<br>Diagnosis',
    heroSubtitle: 'Discover Your Potential',
    btnStart: 'Start Diagnosis',
    labelName: 'Name',
    labelBirth: 'Birth Date',
    namePlaceholder: 'Enter your name',
    sortingTitle: 'Is this an activity you like?',
    sortingSubtitle: 'Swipe right to select.',
    textExit: 'Exit',
    labelLiked: 'Liked Cards List',
    rankingTitle: 'Select Your Top 3',
    rankingSubtitle: 'Pick 3 cards that represent you best in order of importance.',
    textSelected: 'Selected',
    textViewReport: 'Generate Report',
    textReportFor: 'DIAGNOSIS REPORT',
    labelMap: 'Prediger Interest Map',
    labelDimension: 'Dimension Scores',
    labelAI: 'AI Career Insights',
    labelJobs: 'Recommended Careers',
    btnRestart: 'Restart Diagnosis',
    aiLoading: 'Generating professional insights...',
    errorFetch: 'JSON file not found. Please check paths.',
    unknown: 'Balanced Explorer'
  }
};

// --- DOM ELEMENTS ---
const el = {
  introSection: document.getElementById('intro-section'),
  sortingSection: document.getElementById('sorting-section'),
  rankingSection: document.getElementById('ranking-section'),
  resultSection: document.getElementById('result-section'),
  langToggle: document.getElementById('lang-toggle'),
  introForm: document.getElementById('intro-form'),
  cardStack: document.getElementById('card-stack'),
  likedList: document.getElementById('liked-list'),
  progressBar: document.getElementById('progress-bar'),
  progressText: document.getElementById('progress-text'),
  rankingGrid: document.getElementById('ranking-grid'),
  rankCount: document.getElementById('rank-count'),
  btnShowResult: document.getElementById('btn-show-result'),
  aiResult: document.getElementById('ai-result'),
  aiLoader: document.getElementById('ai-loader'),
  jobList: document.getElementById('job-list')
};

// --- INITIALIZATION ---
function init() {
  updateLanguageUI();
  
  el.langToggle.addEventListener('click', () => {
    state.lang = state.lang === 'KR' ? 'EN' : 'KR';
    el.langToggle.textContent = state.lang === 'KR' ? 'English' : '한국어';
    updateLanguageUI();
  });

  el.introForm.addEventListener('submit', handleIntroSubmit);
  document.getElementById('btn-exit').addEventListener('click', () => location.reload());
  document.getElementById('btn-swipe-left').addEventListener('click', () => swipe('left'));
  document.getElementById('btn-swipe-right').addEventListener('click', () => swipe('right'));
  document.getElementById('btn-swipe-up').addEventListener('click', () => swipe('up'));
  document.getElementById('btn-restart').addEventListener('click', () => location.reload());
  el.btnShowResult.addEventListener('click', showResult);

  // GSAP Initial
  gsap.from(".intro-anim", { y: 20, opacity: 0, stagger: 0.1, ease: "power3.out" });
}

function updateLanguageUI() {
  const s = STRINGS[state.lang];
  document.getElementById('hero-title').innerHTML = s.heroTitle;
  document.getElementById('hero-subtitle').textContent = s.heroSubtitle;
  document.getElementById('btn-start').innerHTML = `${s.btnStart} <span class="text-xl">&rarr;</span>`;
  document.getElementById('label-name').textContent = s.labelName;
  document.getElementById('label-birth').textContent = s.labelBirth;
  document.getElementById('username').placeholder = s.namePlaceholder;
  document.getElementById('sorting-title').textContent = s.sortingTitle;
  document.getElementById('sorting-subtitle').textContent = s.sortingSubtitle;
  document.getElementById('text-exit').textContent = s.textExit;
  document.getElementById('label-liked').textContent = s.labelLiked;
  document.getElementById('ranking-title').textContent = s.rankingTitle;
  document.getElementById('ranking-subtitle').textContent = s.rankingSubtitle;
  document.getElementById('text-selected').textContent = s.textSelected;
  document.getElementById('text-view-report').textContent = s.textViewReport;
  document.getElementById('text-report-for').textContent = s.textReportFor;
  document.getElementById('label-map').textContent = s.labelMap;
  document.getElementById('label-dimension').textContent = s.labelDimension;
  document.getElementById('label-ai').textContent = s.labelAI;
  document.getElementById('label-jobs').textContent = s.labelJobs;
  document.getElementById('btn-restart').textContent = s.btnRestart;
  document.getElementById('text-ai-loading').textContent = s.aiLoading;
}

// --- FLOW: STEP 1 (INTRO) ---
async function handleIntroSubmit(e) {
  e.preventDefault();
  const name = document.getElementById('username').value;
  const birth = document.getElementById('birthdate').value;
  
  if (!name || !birth) return;

  const age = new Date().getFullYear() - new Date(birth).getFullYear();
  state.user = { name, age, group: age < 13 ? 'kids' : 'adult' };

  const btn = document.getElementById('btn-start');
  btn.disabled = true;
  btn.innerHTML = `<div class="w-6 h-6 border-2 border-white/20 border-t-white rounded-full animate-spin"></div>`;

  try {
    await loadCards();
    transition(el.introSection, el.sortingSection, 'flex');
    renderStack();
  } catch (err) {
    alert(STRINGS[state.lang].errorFetch);
    btn.disabled = false;
    btn.innerHTML = `${STRINGS[state.lang].btnStart} <span class="text-xl">&rarr;</span>`;
  }
}

async function loadCards() {
  const suffix = state.lang === 'KR' ? 'kr' : 'en';
  const res = await fetch(`./assets/data/cards_${suffix}.json`);
  if (!res.ok) throw new Error();
  state.cards = await res.json();
}

// --- FLOW: STEP 2 (SORTING) ---
function renderStack() {
  el.cardStack.innerHTML = '';
  // Show 3 cards at most for visual depth
  const stack = state.cards.slice(state.currentIndex, state.currentIndex + 3).reverse();
  
  stack.forEach((card, i) => {
    const isTop = i === stack.length - 1;
    const cardEl = document.createElement('div');
    cardEl.className = 'card-item';
    
    // Path logic
    const imgPath = `./assets/images/${state.user.group}/${card.img}`;
    
    cardEl.innerHTML = `
      <div class="relative w-full h-[70%] bg-slate-100 overflow-hidden">
        <img src="${imgPath}" class="w-full h-full object-cover pointer-events-none" onerror="this.src='https://placehold.co/400x500?text=${card.keyword}'">
        <div class="stamp stamp-like">LIKE</div>
        <div class="stamp stamp-nope">NOPE</div>
      </div>
      <div class="p-6 h-[30%] bg-white flex flex-col justify-center text-center">
        <h3 class="text-xl font-black text-slate-800 mb-1 leading-tight">${card.keyword}</h3>
        <p class="text-xs text-slate-400 font-medium line-clamp-2">${card.desc}</p>
      </div>
      <div class="absolute top-4 right-4 bg-white/90 backdrop-blur px-2 py-1 rounded-lg text-[10px] font-black text-slate-300 border border-slate-100 uppercase tracking-widest">
        ${card.type}
      </div>
    `;

    // Positional depth
    const depth = stack.length - 1 - i;
    gsap.set(cardEl, { scale: 1 - depth * 0.05, y: depth * 15, zIndex: i });
    el.cardStack.appendChild(cardEl);

    if (isTop) setupDraggable(cardEl, card);
  });

  updateProgress();
}

function setupDraggable(cardEl, cardData) {
  Draggable.create(cardEl, {
    type: "x,y",
    onDrag: function() {
      const rot = this.x * 0.05;
      gsap.set(cardEl, { rotation: rot });
      const likeOp = Math.max(0, Math.min(1, this.x / 100));
      const nopeOp = Math.max(0, Math.min(1, -this.x / 100));
      gsap.set(cardEl.querySelector('.stamp-like'), { opacity: likeOp });
      gsap.set(cardEl.querySelector('.stamp-nope'), { opacity: nopeOp });
    },
    onDragEnd: function() {
      if (this.x > 100) handleSwipe('right', cardEl, cardData);
      else if (this.x < -100) handleSwipe('left', cardEl, cardData);
      else if (this.y < -100) handleSwipe('up', cardEl, cardData);
      else {
        gsap.to(cardEl, { x: 0, y: 0, rotation: 0, duration: 0.5, ease: "back.out(1.7)" });
        gsap.to(cardEl.querySelectorAll('.stamp'), { opacity: 0, duration: 0.2 });
      }
    }
  });
}

function swipe(dir) {
  const top = el.cardStack.querySelector('.card-item:last-child');
  if (top) handleSwipe(dir, top, state.cards[state.currentIndex]);
}

function handleSwipe(dir, cardEl, cardData) {
  let x = 0, y = 0, rot = 0;
  if (dir === 'right') { x = 600; rot = 30; state.likedCards.push(cardData); addToLikedList(cardData); }
  else if (dir === 'left') { x = -600; rot = -30; }
  else if (dir === 'up') { y = -600; }

  gsap.to(cardEl, { x, y, rotation: rot, opacity: 0, duration: 0.4, onComplete: () => {
    state.currentIndex++;
    if (state.currentIndex >= state.cards.length) finishSorting();
    else renderStack();
  }});
}

function addToLikedList(card) {
  const item = document.createElement('div');
  item.className = 'flex items-center gap-3 p-3 bg-slate-50 rounded-2xl border border-slate-100 animate-fade-in';
  item.innerHTML = `
    <div class="w-8 h-8 rounded-lg bg-white flex items-center justify-center text-[10px] font-black shadow-sm text-blue-500">${card.type}</div>
    <span class="text-xs font-bold text-slate-700">${card.keyword}</span>
  `;
  el.likedList.prepend(item);
}

function updateProgress() {
  const p = (state.currentIndex / state.cards.length) * 100;
  el.progressBar.style.width = `${p}%`;
  el.progressText.textContent = `${state.currentIndex + 1} / ${state.cards.length}`;
}

function finishSorting() {
  transition(el.sortingSection, el.rankingSection, 'flex');
  renderRankingGrid();
}

// --- FLOW: STEP 3 (RANKING) ---
function renderRankingGrid() {
  el.rankingGrid.innerHTML = '';
  state.rankedCards = [];
  el.rankCount.textContent = '0';
  el.btnShowResult.disabled = true;

  if (state.likedCards.length === 0) {
    el.rankingGrid.innerHTML = `<div class="col-span-full py-20 text-center text-slate-400 font-medium">선택된 카드가 없습니다.<br>다시 시작해주세요.</div>`;
    return;
  }

  state.likedCards.forEach(card => {
    const cardEl = document.createElement('div');
    cardEl.className = 'selection-card relative rounded-2xl overflow-hidden cursor-pointer aspect-[3/4] shadow-sm bg-white border border-slate-100 group';
    cardEl.innerHTML = `
      <img src="./assets/images/${state.user.group}/${card.img}" class="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" onerror="this.src='https://placehold.co/400x500?text=${card.keyword}'">
      <div class="absolute inset-0 bg-gradient-to-t from-slate-900/80 via-transparent to-transparent"></div>
      <div class="absolute bottom-4 left-4 right-4">
        <h4 class="text-white font-black text-sm">${card.keyword}</h4>
      </div>
      <div class="badge-container"></div>
    `;
    cardEl.onclick = () => toggleRank(card, cardEl);
    el.rankingGrid.appendChild(cardEl);
  });
}

function toggleRank(card, cardEl) {
  const idx = state.rankedCards.findIndex(c => c.id === card.id);
  if (idx > -1) {
    state.rankedCards.splice(idx, 1);
  } else {
    if (state.rankedCards.length < 3) {
      state.rankedCards.push(card);
    }
  }
  updateRankUI();
}

function updateRankUI() {
  const cards = el.rankingGrid.children;
  Array.from(cards).forEach((cardEl, i) => {
    const cardData = state.likedCards[i];
    const rankIdx = state.rankedCards.findIndex(c => c.id === cardData.id);
    const badgeContainer = cardEl.querySelector('.badge-container');
    
    if (rankIdx > -1) {
      cardEl.classList.add('selected');
      badgeContainer.innerHTML = `<div class="rank-badge">${rankIdx + 1}</div>`;
    } else {
      cardEl.classList.remove('selected');
      badgeContainer.innerHTML = '';
    }
  });

  const count = state.rankedCards.length;
  el.rankCount.textContent = count;
  if (count === 3) {
    el.btnShowResult.disabled = false;
    el.btnShowResult.classList.replace('bg-slate-200', 'bg-slate-900');
    el.btnShowResult.classList.replace('text-slate-400', 'text-white');
  } else {
    el.btnShowResult.disabled = true;
    el.btnShowResult.classList.replace('bg-slate-900', 'bg-slate-200');
    el.btnShowResult.classList.replace('text-white', 'text-slate-400');
  }
}

// --- FLOW: STEP 4 (RESULT) ---
async function showResult() {
  transition(el.rankingSection, el.resultSection, 'block');

  // Load Content DB
  let contentDB = {};
  try {
    const suffix = state.lang === 'KR' ? 'kr' : 'en';
    const res = await fetch(`./assets/data/contents_db_${suffix}.json`);
    contentDB = await res.json();
  } catch(e) {}

  // 1. Prediger Calculation
  // Scoring: Liked + Ranked Bonus (Rank 1=+3, Rank 2=+2, Rank 3=+1)
  const scores = { D: 0, I: 0, P: 0, T: 0 };
  state.likedCards.forEach(c => scores[c.type]++);
  state.rankedCards.forEach((c, i) => scores[c.type] += (3 - i));

  // Coordinates: X = Things - People, Y = Data - Ideas
  const x = scores.T - scores.P;
  const y = scores.D - scores.I;

  // Determine Quadrant
  let typeKey = "UNKNOWN";
  if (y >= 0 && x >= 0) typeKey = "DATA_THINGS";
  if (y >= 0 && x < 0) typeKey = "DATA_PEOPLE";
  if (y < 0 && x >= 0) typeKey = "IDEAS_THINGS";
  if (y < 0 && x < 0) typeKey = "IDEAS_PEOPLE";

  const data = contentDB[typeKey] || { title: STRINGS[state.lang].unknown, summary: "", jobs: [] };

  // UI Updates
  document.getElementById('result-type-title').textContent = data.title;
  document.getElementById('result-type-desc').textContent = data.summary;
  document.getElementById('result-tag').textContent = typeKey.replace('_', ' ');
  
  el.jobList.innerHTML = (data.jobs || []).map(j => 
    `<span class="px-4 py-2 bg-slate-100 rounded-xl text-xs font-bold text-slate-700">${j}</span>`
  ).join('');

  // Dimensions & Map
  const max = Math.max(scores.D, scores.I, scores.P, scores.T, 10);
  ['D','I','P','T'].forEach(k => {
    document.getElementById(`score-${k}`).textContent = scores[k];
    document.getElementById(`bar-${k}`).style.width = `${(scores[k]/max)*100}%`;
  });

  const MAX_AXIS = 15;
  const mapX = Math.max(-1, Math.min(1, x / MAX_AXIS)) * 50; 
  const mapY = -Math.max(-1, Math.min(1, y / MAX_AXIS)) * 50; // CSS top is inverted

  const pointer = document.getElementById('result-pointer');
  gsap.to(pointer, {
    left: `calc(50% + ${mapX}%)`,
    top: `calc(50% + ${mapY}%)`,
    opacity: 1,
    duration: 1.5,
    ease: "elastic.out(1, 0.5)",
    delay: 0.5
  });

  // AI Analysis
  generateAIReport(state.rankedCards);
}

async function generateAIReport(topCards) {
  el.aiLoader.classList.remove('hidden');
  el.aiResult.classList.add('hidden');

  try {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const keywords = topCards.map(c => c.keyword).join(", ");
    
    const prompt = state.lang === 'KR' 
      ? `사용자 선호 키워드: ${keywords}. 이 사용자의 프레디저(Prediger) 흥미 유형을 분석하고, ${state.user.group === 'kids' ? '어린이' : '성인'}에게 적합한 진로 조언을 3문장으로 따뜻하고 전문적으로 해주세요.`
      : `User preferred keywords: ${keywords}. Analyze this user's Prediger interest type and provide professional career advice in 3 sentences, tailored for a ${state.user.group === 'kids' ? 'child' : 'adult'}.`;

    const res = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt
    });

    el.aiLoader.classList.add('hidden');
    el.aiResult.innerHTML = `<p>${res.text}</p>`;
    el.aiResult.classList.remove('hidden');
    gsap.from(el.aiResult, { opacity: 0, y: 10, duration: 0.5 });
  } catch (err) {
    el.aiLoader.innerHTML = `<p class="text-xs text-slate-500">AI 분석을 일시적으로 사용할 수 없습니다.</p>`;
  }
}

// --- UTILS ---
function transition(from, to, display = 'block') {
  gsap.to(from, { opacity: 0, y: -20, duration: 0.3, onComplete: () => {
    from.classList.add('hidden');
    to.classList.remove('hidden');
    to.style.display = display;
    gsap.fromTo(to, { opacity: 0, y: 20 }, { opacity: 1, y: 0, duration: 0.4 });
  }});
}

init();
