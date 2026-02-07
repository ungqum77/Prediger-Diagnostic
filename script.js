import { GoogleGenAI } from "@google/genai";

// --- STATE ---
const state = {
  lang: 'KR', // KR or EN
  mode: 'adult', // child or adult
  cards: [],
  contentsDB: {},
  // Sorting groups
  likedCards: [],
  heldCards: [],
  rejectedCards: [],
  // Final selection groups
  top9Cards: [],
  rankedCards: [], // Sorted Top 3
  
  currentIndex: 0,
  currentSortingStep: 'main', // 'main' or 'hold'
  user: { name: '', age: 0 }
};

const STRINGS = {
  KR: {
    heroTitle: '프레디저<br>적성 검사',
    btnStart: '진단 시작하기',
    sortingTitleMain: '마음에 드는 활동인가요?',
    sortingSubtitleMain: '좋아하는 카드는 오른쪽으로 밀어주세요.',
    sortingTitleHold: '보류한 카드를 다시 확인해볼까요?',
    sortingSubtitleHold: '마음에 들면 오른쪽, 아니면 왼쪽으로 밀어주세요.',
    textExit: '나가기',
    likedLabel: '선택한 카드 (LIKED)',
    s9Title: '나를 가장 잘 설명하는 9장 선택',
    s9Subtitle: '좋아하는 카드들 중 나에게 가장 잘 맞는 9장을 선택해주세요.',
    s9TextSelected: '선택됨',
    btnS9Next: '다음 단계로',
    r3Title: '가장 중요한 3장 순서대로 선택',
    r3Subtitle: '선택한 9장 중 가장 핵심적인 3장을 순위대로 골라주세요.',
    r3TextSelected: '선택됨',
    btnR3Next: '분석 시작하기',
    anaTitle: '성향 분석 중...',
    anaSubtitle: '데이터를 기반으로 최적의 커리어를 찾고 있습니다.',
    textReportFor: 'DIAGNOSIS REPORT',
    labelAi: 'AI 분석 리포트',
    labelJobs: '추천 직업군',
    btnRestart: '다시 진단하기',
    aiLoading: '분석 결과를 정리하고 있습니다...',
    errorFetch: '데이터 파일을 불러오지 못했습니다.',
    birthPlaceholder: '' // Browser default
  },
  EN: {
    heroTitle: 'Prediger<br>Diagnosis',
    btnStart: 'Start Diagnosis',
    sortingTitleMain: 'Do you like this activity?',
    sortingSubtitleMain: 'Swipe right for things you enjoy.',
    sortingTitleHold: 'Review your held cards',
    sortingSubtitleHold: 'Swipe right to like, left to reject.',
    textExit: 'Exit',
    likedLabel: 'Selected Cards (LIKED)',
    s9Title: 'Select Exactly 9 Cards',
    s9Subtitle: 'Pick 9 cards that describe you best from your liked list.',
    s9TextSelected: 'Selected',
    btnS9Next: 'Next Step',
    r3Title: 'Rank Your Top 3',
    r3Subtitle: 'Select your Top 1, 2, and 3 from the 9 cards.',
    r3TextSelected: 'Selected',
    btnR3Next: 'Analyze My Profile',
    anaTitle: 'Analyzing your profile...',
    anaSubtitle: 'Finding the best career path based on your data.',
    textReportFor: 'DIAGNOSIS REPORT',
    labelAi: 'AI Analysis Report',
    labelJobs: 'Recommended Careers',
    btnRestart: 'Restart Diagnosis',
    aiLoading: 'Generating insights...',
    errorFetch: 'Failed to load data.',
    birthPlaceholder: 'YYYY-MM-DD'
  }
};

// --- DOM ELEMENTS ---
const el = {
  introSection: document.getElementById('intro-section'),
  sortingSection: document.getElementById('sorting-section'),
  select9Section: document.getElementById('select9-section'),
  rank3Section: document.getElementById('rank3-section'),
  analysisSection: document.getElementById('analysis-section'),
  resultSection: document.getElementById('result-section'),
  
  introForm: document.getElementById('intro-form'),
  langToggle: document.getElementById('lang-toggle'),
  cardStack: document.getElementById('card-stack'),
  likedList: document.getElementById('liked-list'),
  progressBar: document.getElementById('progress-bar'),
  progressText: document.getElementById('progress-text'),
  
  countLike: document.getElementById('count-like'),
  countHold: document.getElementById('count-hold'),
  countNope: document.getElementById('count-nope'),
  
  s9Grid: document.getElementById('s9-grid'),
  s9Count: document.getElementById('s9-count'),
  btnS9Next: document.getElementById('btn-s9-next'),
  
  r3Grid: document.getElementById('r3-grid'),
  r3Count: document.getElementById('r3-count'),
  btnR3Next: document.getElementById('btn-r3-next'),
  
  aiResult: document.getElementById('ai-result'),
  aiLoader: document.getElementById('ai-loader'),
  jobList: document.getElementById('job-list')
};

// --- INITIALIZATION ---
function init() {
  updateUIStrings();

  if (el.introForm) el.introForm.addEventListener('submit', handleIntroSubmit);
  if (el.langToggle) el.langToggle.addEventListener('click', toggleLanguage);
  
  document.getElementById('btn-swipe-left').onclick = () => swipe('left');
  document.getElementById('btn-swipe-right').onclick = () => swipe('right');
  document.getElementById('btn-swipe-up').onclick = () => swipe('up');
  document.getElementById('btn-exit').onclick = () => location.reload();
  document.getElementById('btn-restart').onclick = () => location.reload();
  
  if (el.btnS9Next) el.btnS9Next.onclick = startRanking;
  if (el.btnR3Next) el.btnR3Next.onclick = startAnalysis;

  if (typeof gsap !== 'undefined') {
    gsap.from(".intro-anim", { y: 30, opacity: 0, stagger: 0.1, duration: 0.8, ease: "power3.out" });
  }
}

function toggleLanguage() {
  state.lang = state.lang === 'KR' ? 'EN' : 'KR';
  const toggleBtn = document.getElementById('lang-toggle');
  if (toggleBtn) toggleBtn.textContent = state.lang === 'KR' ? 'Switch to English' : '한국어 버전으로 변경';
  updateUIStrings();
}

function updateUIStrings() {
  const s = STRINGS[state.lang];
  const h1 = document.querySelector('h1');
  if (h1) h1.innerHTML = s.heroTitle;
  
  const startBtn = document.getElementById('btn-start');
  if (startBtn) startBtn.querySelector('span').textContent = s.btnStart;
  
  const birthInput = document.getElementById('birthdate');
  if (birthInput) birthInput.placeholder = s.birthPlaceholder;
  
  const textExit = document.getElementById('text-exit');
  if (textExit) textExit.textContent = s.textExit;
  
  const likedLabel = document.getElementById('text-liked-label');
  if (likedLabel) likedLabel.textContent = s.likedLabel;

  // Analysis screen
  const anaTitle = document.getElementById('ana-title');
  if (anaTitle) anaTitle.textContent = s.anaTitle;
  const anaSubtitle = document.getElementById('ana-subtitle');
  if (anaSubtitle) anaSubtitle.textContent = s.anaSubtitle;
}

// --- FLOW CONTROL ---
async function handleIntroSubmit(e) {
  e.preventDefault();
  const nameInput = document.getElementById('username');
  const birthInput = document.getElementById('birthdate');
  if (!nameInput.value || !birthInput.value) return;

  const age = new Date().getFullYear() - new Date(birthInput.value).getFullYear();
  state.user = { name: nameInput.value, age };
  state.mode = age < 13 ? 'child' : 'adult';

  const btn = document.getElementById('btn-start');
  btn.disabled = true;
  btn.innerHTML = `<div class="w-6 h-6 border-2 border-white/20 border-t-white rounded-full animate-spin"></div>`;

  try {
    await loadData();
    transition(el.introSection, el.sortingSection, 'flex');
    state.currentSortingStep = 'main';
    state.currentIndex = 0;
    renderStack();
  } catch (err) {
    console.error(err);
    alert(STRINGS[state.lang].errorFetch + "\n" + err.message);
    btn.disabled = false;
    btn.innerHTML = `<span>${STRINGS[state.lang].btnStart}</span> <span class="text-xl">&rarr;</span>`;
  }
}

async function loadData() {
  const suffix = state.lang.toLowerCase();
  const cardsRes = await fetch(`/assets/data/cards_${suffix}.json`);
  if (!cardsRes.ok) throw new Error(`Cards not found: cards_${suffix}.json`);
  const cardsJson = await cardsRes.json();
  state.cards = cardsJson.cards;

  const contentRes = await fetch(`/assets/data/contents_db_${suffix}.json`);
  if (!contentRes.ok) throw new Error(`DB not found: contents_db_${suffix}.json`);
  state.contentsDB = await contentRes.json();
}

// --- STEP 2 & 3: SORTING ---
function renderStack() {
  window.scrollTo(0, 0);
  if (!el.cardStack) return;
  el.cardStack.innerHTML = '';
  
  const isMain = state.currentSortingStep === 'main';
  const currentPool = isMain ? state.cards : state.heldCards;
  const s = STRINGS[state.lang];
  
  document.getElementById('sorting-title').textContent = isMain ? s.sortingTitleMain : s.sortingTitleHold;
  document.getElementById('sorting-subtitle').textContent = isMain ? s.sortingSubtitleMain : s.sortingSubtitleHold;
  
  // Update Pass Button Visibility
  const btnPass = document.getElementById('btn-swipe-up');
  if (btnPass) btnPass.style.visibility = isMain ? 'visible' : 'hidden';

  const stack = currentPool.slice(state.currentIndex, state.currentIndex + 3).reverse();
  
  stack.forEach((card, i) => {
    const isTop = i === stack.length - 1;
    const cardEl = document.createElement('div');
    cardEl.className = 'card-item';
    
    const modeData = card[state.mode];
    const keyword = card['keyword_' + state.lang.toLowerCase()];
    const imgFolder = state.mode === 'child' ? 'kids' : 'adult';
    const imgPath = `/assets/images/${imgFolder}/${modeData.img}`;
    
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
      gsap.set(cardEl, { rotation: this.x * 0.05 });
      gsap.set(cardEl.querySelector('.stamp-like'), { opacity: Math.max(0, Math.min(1, this.x / 100)) });
      gsap.set(cardEl.querySelector('.stamp-nope'), { opacity: Math.max(0, Math.min(1, -this.x / 100)) });
    },
    onDragEnd: function() {
      if (this.x > 120) handleSwipe('right', cardEl, cardData);
      else if (this.x < -120) handleSwipe('left', cardEl, cardData);
      else if (this.y < -120 && state.currentSortingStep === 'main') handleSwipe('up', cardEl, cardData);
      else {
        gsap.to(cardEl, { x: 0, y: 0, rotation: 0, duration: 0.6, ease: "back.out(1.7)" });
        gsap.to(cardEl.querySelectorAll('.stamp'), { opacity: 0, duration: 0.3 });
      }
    }
  });
}

function swipe(dir) {
  const currentPool = state.currentSortingStep === 'main' ? state.cards : state.heldCards;
  const top = el.cardStack?.querySelector('.card-item:last-child');
  if (top) handleSwipe(dir, top, currentPool[state.currentIndex]);
}

function handleSwipe(dir, cardEl, cardData) {
  let x = 0, y = 0, rot = 0;
  if (dir === 'right') { 
    x = 800; rot = 45; state.likedCards.push(cardData); addToLikedList(cardData); 
  }
  else if (dir === 'left') { x = -800; rot = -45; state.rejectedCards.push(cardData); }
  else if (dir === 'up') { y = -800; state.heldCards.push(cardData); }

  gsap.to(cardEl, { x, y, rotation: rot, opacity: 0, duration: 0.5, onComplete: () => {
    state.currentIndex++;
    checkSortingCompletion();
  }});
}

function checkSortingCompletion() {
  const currentPool = state.currentSortingStep === 'main' ? state.cards : state.heldCards;
  if (state.currentIndex >= currentPool.length) {
    if (state.currentSortingStep === 'main' && state.heldCards.length > 0) {
      state.currentSortingStep = 'hold';
      state.currentIndex = 0;
      renderStack();
    } else {
      finishSorting();
    }
  } else {
    renderStack();
  }
}

function addToLikedList(card) {
  const keyword = card['keyword_' + state.lang.toLowerCase()];
  const item = document.createElement('div');
  item.className = 'flex items-center gap-4 p-4 bg-slate-50 rounded-2xl border border-slate-100 animate-fade-in shadow-sm';
  item.innerHTML = `
    <div class="w-10 h-10 rounded-xl bg-white flex items-center justify-center text-[10px] font-black text-blue-500">${card.dimension}</div>
    <span class="text-sm font-bold text-slate-700">${keyword}</span>
  `;
  el.likedList.prepend(item);
}

function updateProgress() {
  const currentPool = state.currentSortingStep === 'main' ? state.cards : state.heldCards;
  const p = (state.currentIndex / currentPool.length) * 100;
  el.progressBar.style.width = `${p}%`;
  el.progressText.textContent = `${state.currentIndex} / ${currentPool.length}`;
  el.countLike.textContent = state.likedCards.length;
  el.countHold.textContent = state.heldCards.length;
  el.countNope.textContent = state.rejectedCards.length;
}

function finishSorting() {
  transition(el.sortingSection, el.select9Section, 'flex');
  renderSelect9Grid();
}

// --- STEP 4: SELECT TOP 9 ---
function renderSelect9Grid() {
  window.scrollTo(0, 0);
  el.s9Grid.innerHTML = '';
  state.top9Cards = [];
  updateS9UI();
  
  const s = STRINGS[state.lang];
  document.getElementById('s9-title').textContent = s.s9Title;
  document.getElementById('s9-subtitle').textContent = s.s9Subtitle;
  document.getElementById('s9-text-selected').textContent = s.s9TextSelected;
  el.btnS9Next.textContent = s.btnS9Next;

  state.likedCards.forEach(card => {
    const cardEl = document.createElement('div');
    const keyword = card['keyword_' + state.lang.toLowerCase()];
    const folder = state.mode === 'child' ? 'kids' : 'adult';
    
    cardEl.className = 'selection-card relative rounded-3xl overflow-hidden cursor-pointer aspect-[3/4] shadow-md bg-white border border-slate-100 group';
    cardEl.innerHTML = `
      <img src="/assets/images/${folder}/${card[state.mode].img}" class="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" onerror="this.src='https://placehold.co/400x500?text=${keyword}'">
      <div class="absolute inset-0 bg-gradient-to-t from-slate-900/90 via-slate-900/20 to-transparent"></div>
      <div class="absolute bottom-5 left-5 right-5"><h4 class="text-white font-black text-sm">${keyword}</h4></div>
      <div class="badge-container"></div>
    `;
    cardEl.onclick = () => {
      const idx = state.top9Cards.findIndex(c => c.id === card.id);
      if (idx > -1) state.top9Cards.splice(idx, 1);
      else if (state.top9Cards.length < 9) state.top9Cards.push(card);
      updateS9UI();
    };
    el.s9Grid.appendChild(cardEl);
  });
}

function updateS9UI() {
  Array.from(el.s9Grid.children).forEach((cardEl, i) => {
    const cardData = state.likedCards[i];
    const isSelected = state.top9Cards.some(c => c.id === cardData.id);
    cardEl.classList.toggle('selected', isSelected);
  });
  el.s9Count.textContent = state.top9Cards.length;
  el.btnS9Next.disabled = state.top9Cards.length !== 9;
  el.btnS9Next.className = `w-full sm:w-[350px] py-5 font-black rounded-3xl transition-all shadow-lg ${state.top9Cards.length === 9 ? 'bg-slate-900 text-white' : 'bg-slate-200 text-slate-400'}`;
}

// --- STEP 5: RANK TOP 3 ---
function startRanking() {
  transition(el.select9Section, el.rank3Section, 'flex');
  renderRank3Grid();
}

function renderRank3Grid() {
  window.scrollTo(0, 0);
  el.r3Grid.innerHTML = '';
  state.rankedCards = [];
  updateR3UI();

  const s = STRINGS[state.lang];
  document.getElementById('r3-title').textContent = s.r3Title;
  document.getElementById('r3-subtitle').textContent = s.r3Subtitle;
  document.getElementById('r3-text-selected').textContent = s.r3TextSelected;
  el.btnR3Next.textContent = s.btnR3Next;

  state.top9Cards.forEach(card => {
    const cardEl = document.createElement('div');
    const keyword = card['keyword_' + state.lang.toLowerCase()];
    const folder = state.mode === 'child' ? 'kids' : 'adult';
    
    cardEl.className = 'selection-card relative rounded-3xl overflow-hidden cursor-pointer aspect-[3/4] shadow-md bg-white border border-slate-100 group';
    cardEl.innerHTML = `
      <img src="/assets/images/${folder}/${card[state.mode].img}" class="w-full h-full object-cover" onerror="this.src='https://placehold.co/400x500?text=${keyword}'">
      <div class="absolute inset-0 bg-gradient-to-t from-slate-900/90 via-slate-900/20 to-transparent"></div>
      <div class="absolute bottom-5 left-5 right-5"><h4 class="text-white font-black text-sm">${keyword}</h4></div>
      <div class="badge-container"></div>
    `;
    cardEl.onclick = () => {
      const idx = state.rankedCards.findIndex(c => c.id === card.id);
      if (idx > -1) state.rankedCards.splice(idx, 1);
      else if (state.rankedCards.length < 3) state.rankedCards.push(card);
      updateR3UI();
    };
    el.r3Grid.appendChild(cardEl);
  });
}

function updateR3UI() {
  Array.from(el.r3Grid.children).forEach((cardEl, i) => {
    const cardData = state.top9Cards[i];
    const rankIdx = state.rankedCards.findIndex(c => c.id === cardData.id);
    cardEl.classList.toggle('selected', rankIdx > -1);
    const badge = cardEl.querySelector('.badge-container');
    badge.innerHTML = rankIdx > -1 ? `<div class="rank-badge">${rankIdx + 1}</div>` : '';
  });
  el.r3Count.textContent = state.rankedCards.length;
  el.btnR3Next.disabled = state.rankedCards.length !== 3;
  el.btnR3Next.className = `w-full sm:w-[350px] py-5 font-black rounded-3xl transition-all shadow-lg ${state.rankedCards.length === 3 ? 'bg-slate-900 text-white' : 'bg-slate-200 text-slate-400'}`;
}

// --- STEP 6: ANALYSIS & ADS ---
function startAnalysis() {
  transition(el.rank3Section, el.analysisSection, 'block');
  window.scrollTo(0, 0);

  // Simulation steps
  const dots = document.querySelectorAll('.step-dot');
  setTimeout(() => { dots[1].classList.replace('bg-slate-200', 'bg-blue-500'); }, 1500);
  setTimeout(() => { dots[2].classList.replace('bg-slate-200', 'bg-blue-500'); }, 3000);
  
  // Wait for Ads/Analysis simulation
  setTimeout(showResult, 4500);
}

// --- STEP 7: FINAL RESULT ---
async function showResult() {
  transition(el.analysisSection, el.resultSection, 'block');
  window.scrollTo(0, 0);

  // 1. SCORING LOGIC (New requirements)
  const scores = { D: 0, I: 0, P: 0, T: 0 };
  
  // Top 1: 5pts, Top 2: 4pts, Top 3: 3pts
  state.rankedCards.forEach((card, idx) => {
    scores[card.dimension] += (5 - idx);
  });
  
  // Remaining 6 cards in Top 9: 1pt each
  state.top9Cards.forEach(card => {
    if (!state.rankedCards.some(r => r.id === card.id)) {
      scores[card.dimension] += 1;
    }
  });

  const x = scores.T - scores.P;
  const y = scores.D - scores.I;

  const getResultKey = (x, y, s) => {
    const threshold = 3;
    if (Math.abs(x) <= threshold && Math.abs(y) <= threshold) return "CENTER";
    
    // Check dominance
    const sorted = Object.entries(s).sort((a,b) => b[1] - a[1]);
    if (sorted[0][1] > sorted[1][1] + 6) {
      const map = { D: 'DATA', I: 'IDEA', P: 'PEOPLE', T: 'THING' };
      return map[sorted[0][0]];
    }
    
    // Quadrant logic
    if (y >= 0 && x >= 0) return "DATA_THING";
    if (y >= 0 && x < 0) return "DATA_PEOPLE";
    if (y < 0 && x >= 0) return "IDEA_THING";
    if (y < 0 && x < 0) return "IDEA_PEOPLE";
    return "CENTER";
  };

  const key = getResultKey(x, y, scores);
  const data = state.contentsDB[key] || { title: "Balanced Type", summary: "Exploring all possibilities.", jobs: [] };

  document.getElementById('result-type-title').textContent = data.title;
  document.getElementById('result-type-desc').textContent = data.summary;
  document.getElementById('result-tag').textContent = key;
  el.jobList.innerHTML = (data.jobs || []).map(j => `<span class="px-5 py-2.5 bg-slate-50 border border-slate-100 rounded-2xl text-xs font-black">${j}</span>`).join('');

  // Dimensions UI
  const max = Math.max(scores.D, scores.I, scores.P, scores.T, 10);
  ['D','I','P','T'].forEach(k => {
    document.getElementById(`score-${k}`).textContent = scores[k];
    document.getElementById(`bar-${k}`).style.width = `${(scores[k]/max)*100}%`;
  });

  // Map UI
  gsap.to(document.getElementById('result-pointer'), {
    left: `calc(50% + ${Math.max(-1, Math.min(1, x/15))*50}%)`,
    top: `calc(50% + ${-Math.max(-1, Math.min(1, y/15))*50}%)`,
    opacity: 1, duration: 2, ease: "elastic.out(1, 0.4)", delay: 0.5
  });

  generateAIReport();
}

async function generateAIReport() {
  if (!el.aiLoader || !el.aiResult) return;
  el.aiLoader.classList.remove('hidden');
  el.aiResult.classList.add('hidden');
  try {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const keywordKey = 'keyword_' + state.lang.toLowerCase();
    const keywords = state.rankedCards.map(c => c[keywordKey]).join(", ");
    const prompt = state.lang === 'KR' 
      ? `상위 키워드: ${keywords}. 이 사용자의 프레디저 흥미 유형을 분석하고, 조언을 4문장으로 따뜻하게 해주세요.`
      : `Keywords: ${keywords}. Analyze this Prediger profile and give career advice in 4 sentences.`;
    const res = await ai.models.generateContent({ model: 'gemini-3-flash-preview', contents: prompt });
    el.aiLoader.classList.add('hidden');
    el.aiResult.innerHTML = `<p>${res.text}</p>`;
    el.aiResult.classList.remove('hidden');
    gsap.from(el.aiResult, { opacity: 0, y: 20, duration: 0.8 });
  } catch (err) { 
    el.aiLoader.innerHTML = `<p class="text-xs text-blue-100/50">Report generation paused.</p>`; 
  }
}

// --- UTILS ---
function transition(from, to, display = 'block') {
  if (!from || !to) return;
  gsap.to(from, { opacity: 0, y: -30, duration: 0.4, onComplete: () => {
    from.classList.add('hidden');
    to.classList.remove('hidden');
    to.style.display = display;
    gsap.fromTo(to, { opacity: 0, y: 30 }, { opacity: 1, y: 0, duration: 0.5 });
  }});
}

document.addEventListener('DOMContentLoaded', init);
