import { GoogleGenAI } from "@google/genai";

// --- APPLICATION STATE ---
const state = {
  lang: 'KR', // 'KR' | 'EN'
  mode: 'adult', // 'child' | 'adult'
  cards: [],
  contentsDB: {},
  likedCards: [],
  rankedCards: [], // User's top 3 selection
  currentIndex: 0,
  user: { name: '', age: 0 }
};

// --- TRANSLATIONS (UI TEXT) ---
const UI_STRINGS = {
  KR: {
    heroTitle: '프레디저<br>적성 검사',
    heroSubtitle: 'Prediger Career Diagnosis',
    btnStart: '진단 시작하기',
    sortingTitle: '마음에 드는 활동인가요?',
    sortingSubtitle: '좋아하는 카드는 오른쪽으로 밀어주세요.',
    rankingTitle: '가장 중요한 3가지 선택',
    rankingSubtitle: '선택한 카드 중 나를 가장 잘 나타내는 3장을 순서대로 골라주세요.',
    resultReportFor: '커리어 진단 리포트',
    aiLoading: '사용자의 성향을 분석하고 있습니다...',
    btnRestart: '다시 진단하기',
    errorFetch: '데이터 파일을 불러오지 못했습니다. 경로를 확인해주세요.',
    unknownType: '균형 잡힌 탐험가'
  },
  EN: {
    heroTitle: 'Prediger<br>Diagnosis',
    heroSubtitle: 'Discover Your Potential',
    btnStart: 'Start Diagnosis',
    sortingTitle: 'Is this something you like?',
    sortingSubtitle: 'Swipe right for activities you enjoy.',
    rankingTitle: 'Select Your Top 3',
    rankingSubtitle: 'Pick 3 cards that represent you best in order of importance.',
    resultReportFor: 'Career Diagnosis Report',
    aiLoading: 'Analyzing your profile...',
    btnRestart: 'Restart Diagnosis',
    errorFetch: 'Failed to load data. Please check paths.',
    unknownType: 'Balanced Explorer'
  }
};

// --- DOM ELEMENTS ---
const el = {
  introSection: document.getElementById('intro-section'),
  sortingSection: document.getElementById('sorting-section'),
  rankingSection: document.getElementById('ranking-section'),
  resultSection: document.getElementById('result-section'),
  introForm: document.getElementById('intro-form'),
  langToggle: document.getElementById('lang-toggle'),
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
  updateUIStrings();

  // Event Listeners
  el.introForm.addEventListener('submit', handleIntroSubmit);
  el.langToggle.addEventListener('click', toggleLanguage);
  
  document.getElementById('btn-dislike').onclick = () => swipe('left');
  document.getElementById('btn-like').onclick = () => swipe('right');
  document.getElementById('btn-pass').onclick = () => swipe('up');
  document.getElementById('btn-exit').onclick = () => location.reload();
  document.getElementById('btn-restart').onclick = () => location.reload();
  el.btnShowResult.onclick = showResult;

  // Intro animation
  gsap.from(".intro-anim", { y: 30, opacity: 0, stagger: 0.1, duration: 0.8, ease: "power3.out" });
}

function toggleLanguage() {
  state.lang = state.lang === 'KR' ? 'EN' : 'KR';
  el.langToggle.textContent = state.lang === 'KR' ? 'Switch to English' : '한국어 버전으로 변경';
  updateUIStrings();
}

function updateUIStrings() {
  const s = UI_STRINGS[state.lang];
  document.querySelector('h1').innerHTML = s.heroTitle;
  document.querySelector('#intro-section p').textContent = s.heroSubtitle;
  document.querySelector('#btn-start span').textContent = s.btnStart;
  document.getElementById('sorting-title').textContent = s.sortingTitle;
  document.getElementById('sorting-subtitle').textContent = s.sortingSubtitle;
  document.querySelector('#ranking-section h2').textContent = s.rankingTitle;
  document.getElementById('ranking-subtitle').textContent = s.rankingSubtitle;
}

// --- FLOW: STEP 1 (INTRO & DATA LOADING) ---
async function handleIntroSubmit(e) {
  e.preventDefault();
  const name = document.getElementById('username').value;
  const birth = document.getElementById('birthdate').value;
  
  if (!name || !birth) return;

  const age = new Date().getFullYear() - new Date(birth).getFullYear();
  state.user = { name, age };
  state.mode = age < 13 ? 'child' : 'adult';

  const btn = document.getElementById('btn-start');
  btn.disabled = true;
  btn.innerHTML = `<div class="w-6 h-6 border-2 border-white/20 border-t-white rounded-full animate-spin"></div>`;

  try {
    await loadData();
    transition(el.introSection, el.sortingSection, 'flex');
    renderStack();
  } catch (err) {
    console.error("Data Load Error:", err);
    alert(UI_STRINGS[state.lang].errorFetch);
    btn.disabled = false;
    btn.innerHTML = `<span>${UI_STRINGS[state.lang].btnStart}</span> <span class="text-xl">&rarr;</span>`;
  }
}

async function loadData() {
  const suffix = state.lang.toLowerCase();
  
  // 1. Load Cards
  const cardsRes = await fetch(`./assets/data/cards_${suffix}.json`);
  if (!cardsRes.ok) throw new Error("Cards file not found");
  const cardsJson = await cardsRes.json();
  state.cards = cardsJson.cards; // Structure: { meta, cards: [] }

  // 2. Load Contents DB
  const contentRes = await fetch(`./assets/data/contents_db_${suffix}.json`);
  if (!contentRes.ok) throw new Error("Contents DB file not found");
  state.contentsDB = await contentRes.json();
}

// --- FLOW: STEP 2 (SORTING) ---
function renderStack() {
  el.cardStack.innerHTML = '';
  // Show top 3 for the 3D depth effect
  const stack = state.cards.slice(state.currentIndex, state.currentIndex + 3).reverse();
  
  stack.forEach((card, i) => {
    const isTop = i === stack.length - 1;
    const cardEl = document.createElement('div');
    cardEl.className = 'card-item';
    
    // Logic: use state.mode (child/adult) and state.lang (KR/EN)
    const modeData = card[state.mode];
    const imgPath = `./assets/images/${state.mode}/${modeData.img}`;
    const keyword = state.lang === 'KR' ? card.keyword_kr : card.keyword_en;
    
    cardEl.innerHTML = `
      <div class="relative w-full h-[70%] bg-slate-100 overflow-hidden">
        <img src="${imgPath}" class="w-full h-full object-cover pointer-events-none" onerror="this.src='https://placehold.co/400x500?text=${keyword}'">
        <div class="stamp stamp-like">LIKE</div>
        <div class="stamp stamp-nope">NOPE</div>
      </div>
      <div class="p-8 h-[30%] bg-white flex flex-col justify-center text-center">
        <h3 class="text-2xl font-black text-slate-800 mb-2 leading-tight">${keyword}</h3>
        <p class="text-sm text-slate-400 font-medium line-clamp-2">${modeData.desc}</p>
      </div>
      <div class="absolute top-6 right-6 bg-white/90 backdrop-blur px-3 py-1.5 rounded-xl text-[10px] font-black text-slate-300 border border-slate-100 uppercase tracking-widest">
        ${card.dimension}
      </div>
    `;

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
      if (this.x > 120) handleSwipe('right', cardEl, cardData);
      else if (this.x < -120) handleSwipe('left', cardEl, cardData);
      else if (this.y < -120) handleSwipe('up', cardEl, cardData);
      else {
        gsap.to(cardEl, { x: 0, y: 0, rotation: 0, duration: 0.6, ease: "back.out(1.7)" });
        gsap.to(cardEl.querySelectorAll('.stamp'), { opacity: 0, duration: 0.3 });
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
  if (dir === 'right') { 
    x = 800; rot = 45; 
    state.likedCards.push(cardData); 
    addToLikedList(cardData); 
  }
  else if (dir === 'left') { x = -800; rot = -45; }
  else if (dir === 'up') { y = -800; }

  gsap.to(cardEl, { x, y, rotation: rot, opacity: 0, duration: 0.5, ease: "power2.in", onComplete: () => {
    state.currentIndex++;
    if (state.currentIndex >= state.cards.length) finishSorting();
    else renderStack();
  }});
}

function addToLikedList(card) {
  const keyword = state.lang === 'KR' ? card.keyword_kr : card.keyword_en;
  const item = document.createElement('div');
  item.className = 'flex items-center gap-4 p-4 bg-slate-50 rounded-2xl border border-slate-100 animate-fade-in shadow-sm';
  item.innerHTML = `
    <div class="w-10 h-10 rounded-xl bg-white flex items-center justify-center text-[10px] font-black shadow-inner text-blue-500 border border-slate-50">${card.dimension}</div>
    <span class="text-sm font-bold text-slate-700">${keyword}</span>
  `;
  el.likedList.prepend(item);
}

function updateProgress() {
  const p = (state.currentIndex / state.cards.length) * 100;
  el.progressBar.style.width = `${p}%`;
  el.progressText.textContent = `${state.currentIndex} / ${state.cards.length}`;
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
    el.rankingGrid.innerHTML = `<div class="col-span-full py-20 text-center text-slate-400 font-medium">선택된 카드가 없습니다.</div>`;
    return;
  }

  state.likedCards.forEach(card => {
    const cardEl = document.createElement('div');
    const keyword = state.lang === 'KR' ? card.keyword_kr : card.keyword_en;
    const imgPath = `./assets/images/${state.mode}/${card[state.mode].img}`;
    
    cardEl.className = 'selection-card relative rounded-3xl overflow-hidden cursor-pointer aspect-[3/4] shadow-md bg-white border border-slate-100 group';
    cardEl.innerHTML = `
      <img src="${imgPath}" class="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" onerror="this.src='https://placehold.co/400x500?text=${keyword}'">
      <div class="absolute inset-0 bg-gradient-to-t from-slate-900/90 via-slate-900/20 to-transparent"></div>
      <div class="absolute bottom-5 left-5 right-5">
        <h4 class="text-white font-black text-base drop-shadow-lg">${keyword}</h4>
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

  // 1. Prediger Scoring Algorithm
  // Count dimension frequency from liked cards + ranked bonus (Rank 1=+3, 2=+2, 3=+1)
  const scores = { D: 0, I: 0, P: 0, T: 0 };
  state.likedCards.forEach(c => scores[c.dimension]++);
  state.rankedCards.forEach((c, i) => scores[c.dimension] += (3 - i));

  // Axes: X = Things(T) - People(P), Y = Data(D) - Ideas(I)
  const x = scores.T - scores.P;
  const y = scores.D - scores.I;

  // 2. Determine Quadrant Key
  let typeKey = "UNKNOWN";
  if (y >= 0 && x >= 0) typeKey = "DATA_THINGS";
  if (y >= 0 && x < 0) typeKey = "DATA_PEOPLE";
  if (y < 0 && x >= 0) typeKey = "IDEAS_THINGS";
  if (y < 0 && x < 0) typeKey = "IDEAS_PEOPLE";

  const data = state.contentsDB[typeKey] || { 
    title: UI_STRINGS[state.lang].unknownType, 
    summary: "다양한 분야를 아우르는 조화로운 성향입니다.", 
    jobs: ["창의 기획자", "전략 컨설턴트"] 
  };

  // 3. UI Updates
  document.getElementById('result-type-title').textContent = data.title;
  document.getElementById('result-type-desc').textContent = data.summary;
  document.getElementById('result-tag').textContent = typeKey.replace('_', ' ');
  
  el.jobList.innerHTML = (data.jobs || []).map(j => 
    `<span class="px-5 py-2.5 bg-slate-50 border border-slate-100 rounded-2xl text-xs font-black text-slate-700 shadow-sm">${j}</span>`
  ).join('');

  // Dimensions & Map Pointer
  const max = Math.max(scores.D, scores.I, scores.P, scores.T, 10);
  ['D','I','P','T'].forEach(k => {
    document.getElementById(`score-${k}`).textContent = scores[k];
    document.getElementById(`bar-${k}`).style.width = `${(scores[k]/max)*100}%`;
  });

  const MAX_AXIS = 15;
  const mapX = Math.max(-1, Math.min(1, x / MAX_AXIS)) * 50; 
  const mapY = -Math.max(-1, Math.min(1, y / MAX_AXIS)) * 50;

  const pointer = document.getElementById('result-pointer');
  gsap.to(pointer, {
    left: `calc(50% + ${mapX}%)`,
    top: `calc(50% + ${mapY}%)`,
    opacity: 1,
    duration: 1.8,
    ease: "elastic.out(1, 0.4)",
    delay: 0.5
  });

  // 4. Gemini AI Professional Report
  generateAIReport(state.rankedCards);
}

async function generateAIReport(topCards) {
  el.aiLoader.classList.remove('hidden');
  el.aiResult.classList.add('hidden');

  try {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const keywordKey = state.lang === 'KR' ? 'keyword_kr' : 'keyword_en';
    const keywords = topCards.map(c => c[keywordKey]).join(", ");
    
    const prompt = state.lang === 'KR' 
      ? `상위 키워드: ${keywords}. 이 사용자의 프레디저(Prediger) 흥미 유형을 분석하고, ${state.mode === 'child' ? '어린이' : '성인'} 눈높이에서 미래를 위한 조언을 4문장으로 따뜻하게 해주세요.`
      : `Top keywords: ${keywords}. Analyze this user's Prediger type and provide career advice in 4 sentences, specifically for a ${state.mode === 'child' ? 'child' : 'adult'}.`;

    const res = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
      config: { temperature: 0.7 }
    });

    el.aiLoader.classList.add('hidden');
    el.aiResult.innerHTML = `<p class="whitespace-pre-wrap">${res.text}</p>`;
    el.aiResult.classList.remove('hidden');
    gsap.from(el.aiResult, { opacity: 0, y: 20, duration: 0.8, ease: "power2.out" });
  } catch (err) {
    el.aiLoader.innerHTML = `<p class="text-xs text-blue-100/50">현재 분석 리포트를 생성할 수 없습니다.</p>`;
  }
}

// --- UTILS ---
function transition(from, to, display = 'block') {
  gsap.to(from, { opacity: 0, y: -30, duration: 0.4, onComplete: () => {
    from.classList.add('hidden');
    to.classList.remove('hidden');
    to.style.display = display;
    gsap.fromTo(to, { opacity: 0, y: 30 }, { opacity: 1, y: 0, duration: 0.5, ease: "power3.out" });
  }});
}

// Start App
init();
