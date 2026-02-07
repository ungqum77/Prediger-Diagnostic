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
    anaStatusText: '심층 분석을 진행 중입니다...',
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
    anaStatusText: 'Deep analysis in progress...',
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
  adsOverlay: document.getElementById('adsense-overlay'),
  resultSection: document.getElementById('result-section'),
  
  introForm: document.getElementById('intro-form'),
  langToggle: document.getElementById('lang-toggle'),
  cardStack: document.getElementById('card-stack'),
  likedList: document.getElementById('liked-list'),
  progressBar: document.getElementById('progress-bar'),
  
  countLike: document.getElementById('count-like'),
  countHold: document.getElementById('count-hold'),
  countNope: document.getElementById('count-nope'),
  
  s9Grid: document.getElementById('s9-grid'),
  s9Count: document.getElementById('s9-count'),
  btnS9Next: document.getElementById('btn-s9-next'),
  
  r3Grid: document.getElementById('r3-grid'),
  r3Count: document.getElementById('r3-count'),
  btnR3Next: document.getElementById('btn-r3-next'),
  
  anaStatusText: document.getElementById('ana-status-text'),
  btnSkipAd: document.getElementById('btn-skip-ad'),
  
  aiResult: document.getElementById('ai-result'),
  aiLoader: document.getElementById('ai-loader'),
  jobList: document.getElementById('job-list')
};

// --- INITIALIZATION ---
function init() {
  updateUIStrings();

  if (el.introForm) el.introForm.addEventListener('submit', handleIntroSubmit);
  if (el.langToggle) el.langToggle.addEventListener('click', toggleLanguage);
  
  const btnL = document.getElementById('btn-swipe-left');
  const btnR = document.getElementById('btn-swipe-right');
  const btnU = document.getElementById('btn-swipe-up');
  const btnE = document.getElementById('btn-exit');
  const btnRestart = document.getElementById('btn-restart');
  
  if (btnL) btnL.onclick = () => swipe('left');
  if (btnR) btnR.onclick = () => swipe('right');
  if (btnU) btnU.onclick = () => swipe('up');
  if (btnE) btnE.onclick = () => location.reload();
  if (btnRestart) btnRestart.onclick = () => location.reload();
  
  if (el.btnS9Next) el.btnS9Next.onclick = startRanking;
  if (el.btnR3Next) el.btnR3Next.onclick = startAnalysis;
  if (el.btnSkipAd) el.btnSkipAd.onclick = showResult;

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
  if (startBtn) {
    const span = startBtn.querySelector('span');
    if (span) span.textContent = s.btnStart;
  }
  
  const birthInput = document.getElementById('birthdate');
  if (birthInput) birthInput.placeholder = s.birthPlaceholder;
  
  const textExit = document.getElementById('text-exit');
  if (textExit) textExit.textContent = s.textExit;
  
  const likedLabel = document.getElementById('text-liked-label');
  if (likedLabel) likedLabel.textContent = s.likedLabel;

  if (el.anaStatusText) el.anaStatusText.textContent = s.anaStatusText;
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
  
  const titleEl = document.getElementById('sorting-title');
  const subtitleEl = document.getElementById('sorting-subtitle');
  if (titleEl) titleEl.textContent = isMain ? s.sortingTitleMain : s.sortingTitleHold;
  if (subtitleEl) subtitleEl.textContent = isMain ? s.sortingSubtitleMain : s.sortingSubtitleHold;
  
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
    if (window.gsap) {
      gsap.set(cardEl, { scale: 1 - depth * 0.05, y: depth * 15, zIndex: i });
    }
    el.cardStack.appendChild(cardEl);
    if (isTop) setupDraggable(cardEl, card);
  });
  updateProgress();
}

function setupDraggable(cardEl, cardData) {
  if (typeof Draggable === 'undefined') return;
  Draggable.create(cardEl, {
    type: "x,y",
    onDrag: function() {
      gsap.set(cardEl, { rotation: this.x * 0.05 });
      const likeStamp = cardEl.querySelector('.stamp-like');
      const nopeStamp = cardEl.querySelector('.stamp-nope');
      if (likeStamp) gsap.set(likeStamp, { opacity: Math.max(0, Math.min(1, this.x / 100)) });
      if (nopeStamp) gsap.set(nopeStamp, { opacity: Math.max(0, Math.min(1, -this.x / 100)) });
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

  if (window.gsap) {
    gsap.to(cardEl, { x, y, rotation: rot, opacity: 0, duration: 0.5, onComplete: () => {
      state.currentIndex++;
      checkSortingCompletion();
    }});
  } else {
    state.currentIndex++;
    checkSortingCompletion();
  }
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
  if (!el.likedList) return;
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
  if (el.progressBar) el.progressBar.style.width = `${p}%`;
  
  if (el.countLike) el.countLike.textContent = state.likedCards.length;
  if (el.countHold) el.countHold.textContent = state.heldCards.length;
  if (el.countNope) el.countNope.textContent = state.rejectedCards.length;
}

function finishSorting() {
  transition(el.sortingSection, el.select9Section, 'flex');
  renderSelect9Grid();
}

// --- STEP 4: SELECT TOP 9 ---
function renderSelect9Grid() {
  window.scrollTo(0, 0);
  if (!el.s9Grid) return;
  el.s9Grid.innerHTML = '';
  state.top9Cards = [];
  updateS9UI();
  
  const s = STRINGS[state.lang];
  const s9Title = document.getElementById('s9-title');
  const s9Subtitle = document.getElementById('s9-subtitle');
  const s9SelectedText = document.getElementById('s9-text-selected');
  
  if (s9Title) s9Title.textContent = s.s9Title;
  if (s9Subtitle) s9Subtitle.textContent = s.s9Subtitle;
  if (s9SelectedText) s9SelectedText.textContent = s.s9TextSelected;
  if (el.btnS9Next) el.btnS9Next.querySelector('span').textContent = s.btnS9Next;

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
  if (!el.s9Grid) return;
  Array.from(el.s9Grid.children).forEach((cardEl, i) => {
    const cardData = state.likedCards[i];
    const isSelected = state.top9Cards.some(c => c.id === cardData.id);
    cardEl.classList.toggle('selected', isSelected);
  });
  if (el.s9Count) el.s9Count.textContent = state.top9Cards.length;
  if (el.btnS9Next) {
    el.btnS9Next.disabled = state.top9Cards.length !== 9;
    el.btnS9Next.className = `w-full sm:w-[400px] py-6 font-black rounded-3xl transition-all shadow-xl hover:translate-y-[-2px] flex items-center justify-center gap-3 ${state.top9Cards.length === 9 ? 'bg-slate-900 text-white' : 'bg-slate-200 text-slate-400'}`;
  }
}

// --- STEP 5: RANK TOP 3 ---
function startRanking() {
  transition(el.select9Section, el.rank3Section, 'flex');
  renderRank3Grid();
}

function renderRank3Grid() {
  window.scrollTo(0, 0);
  if (!el.r3Grid) return;
  el.r3Grid.innerHTML = '';
  state.rankedCards = [];
  updateR3UI();

  const s = STRINGS[state.lang];
  const r3Title = document.getElementById('r3-title');
  const r3Subtitle = document.getElementById('r3-subtitle');
  const r3SelectedText = document.getElementById('r3-text-selected');
  
  if (r3Title) r3Title.textContent = s.r3Title;
  if (r3Subtitle) r3Subtitle.textContent = s.r3Subtitle;
  if (r3SelectedText) r3SelectedText.textContent = s.r3TextSelected;
  if (el.btnR3Next) el.btnR3Next.querySelector('span').textContent = s.btnR3Next;

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
  if (!el.r3Grid) return;
  Array.from(el.r3Grid.children).forEach((cardEl, i) => {
    const cardData = state.top9Cards[i];
    const rankIdx = state.rankedCards.findIndex(c => c.id === cardData.id);
    cardEl.classList.toggle('selected', rankIdx > -1);
    const badge = cardEl.querySelector('.badge-container');
    if (badge) badge.innerHTML = rankIdx > -1 ? `<div class="rank-badge">${rankIdx + 1}</div>` : '';
  });
  if (el.r3Count) el.r3Count.textContent = state.rankedCards.length;
  if (el.btnR3Next) {
    el.btnR3Next.disabled = state.rankedCards.length !== 3;
    el.btnR3Next.className = `w-full sm:w-[400px] py-6 font-black rounded-3xl transition-all shadow-xl hover:translate-y-[-2px] flex items-center justify-center gap-3 ${state.rankedCards.length === 3 ? 'bg-slate-900 text-white' : 'bg-slate-200 text-slate-400'}`;
  }
}

// --- STEP 6: ANALYSIS & ADS ---
function startAnalysis() {
  transition(el.rank3Section, el.adsOverlay, 'flex');
  window.scrollTo(0, 0);

  // Analysis simulation
  setTimeout(() => {
    if (el.btnSkipAd) el.btnSkipAd.classList.remove('hidden');
  }, 4000);
}

// --- STEP 7: FINAL RESULT ---
async function showResult() {
  transition(el.adsOverlay, el.resultSection, 'block');
  window.scrollTo(0, 0);

  // 1. SCORING LOGIC
  const scores = { D: 0, I: 0, P: 0, T: 0 };
  
  state.rankedCards.forEach((card, idx) => {
    scores[card.dimension] += (5 - idx);
  });
  
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
    
    const sorted = Object.entries(s).sort((a,b) => b[1] - a[1]);
    if (sorted[0][1] > sorted[1][1] + 6) {
      const map = { D: 'DATA', I: 'IDEA', P: 'PEOPLE', T: 'THING' };
      return map[sorted[0][0]];
    }
    
    if (y >= 0 && x >= 0) return "DATA_THING";
    if (y >= 0 && x < 0) return "DATA_PEOPLE";
    if (y < 0 && x >= 0) return "IDEA_THING";
    if (y < 0 && x < 0) return "IDEA_PEOPLE";
    return "CENTER";
  };

  const key = getResultKey(x, y, scores);
  const data = state.contentsDB[key] || { title: "Balanced Type", summary: "Exploring all possibilities.", jobs: [] };

  const resTitle = document.getElementById('result-type-title');
  const resDesc = document.getElementById('result-type-desc');
  const resTag = document.getElementById('result-tag');
  
  if (resTitle) resTitle.textContent = data.title;
  if (resDesc) resDesc.textContent = data.summary;
  if (resTag) resTag.textContent = key;
  
  if (el.jobList) {
    el.jobList.innerHTML = (data.jobs || []).map(j => `<span class="px-5 py-2.5 bg-slate-50 border border-slate-100 rounded-2xl text-xs font-black">${j}</span>`).join('');
  }

  const max = Math.max(scores.D, scores.I, scores.P, scores.T, 10);
  ['D','I','P','T'].forEach(k => {
    const sEl = document.getElementById(`score-${k}`);
    const bEl = document.getElementById(`bar-${k}`);
    if (sEl) sEl.textContent = scores[k];
    if (bEl) bEl.style.width = `${(scores[k]/max)*100}%`;
  });

  const pointer = document.getElementById('result-pointer');
  if (pointer && window.gsap) {
    gsap.to(pointer, {
      left: `calc(50% + ${Math.max(-1, Math.min(1, x/15))*50}%)`,
      top: `calc(50% + ${-Math.max(-1, Math.min(1, y/15))*50}%)`,
      opacity: 1, duration: 2, ease: "elastic.out(1, 0.4)", delay: 0.5
    });
  }

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
    if (window.gsap) {
      gsap.from(el.aiResult, { opacity: 0, y: 20, duration: 0.8 });
    }
  } catch (err) { 
    el.aiLoader.innerHTML = `<p class="text-xs text-blue-100/50">Report generation paused.</p>`; 
  }
}

// --- UTILS ---
function transition(from, to, display = 'block') {
  if (!from || !to) return;
  if (window.gsap) {
    gsap.to(from, { opacity: 0, y: -30, duration: 0.4, onComplete: () => {
      from.classList.add('hidden');
      to.classList.remove('hidden');
      to.style.display = display;
      gsap.fromTo(to, { opacity: 0, y: 30 }, { opacity: 1, y: 0, duration: 0.5 });
    }});
  } else {
    from.classList.add('hidden');
    to.classList.remove('hidden');
    to.style.display = display;
  }
}

document.addEventListener('DOMContentLoaded', init);