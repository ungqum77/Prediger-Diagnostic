import { GoogleGenAI } from "@google/genai";

// --- STATE ---
const state = {
  lang: 'KR', // KR or EN
  mode: 'adult', // child or adult
  cards: [],
  contentsDB: {},
  likedCards: [],
  rankedCards: [],
  currentIndex: 0,
  user: { name: '', age: 0 }
};

const STRINGS = {
  KR: {
    heroTitle: '프레디저<br>적성 검사',
    btnStart: '진단 시작하기',
    sortingTitle: '마음에 드는 활동인가요?',
    sortingSubtitle: '좋아하는 카드는 오른쪽으로 밀어주세요.',
    textExit: '나가기',
    likedLabel: '선택한 카드 (LIKED)',
    rankingTitle: '가장 중요한 3가지 선택',
    rankingSubtitle: '선택한 카드 중 나를 가장 잘 나타내는 3장을 순서대로 골라주세요.',
    textSelected: '선택됨',
    textGenReport: '분석 리포트 확인하기',
    textReportFor: 'DIAGNOSIS REPORT',
    labelAi: 'AI 커리어 리포트',
    labelJobs: '추천 직업군',
    btnRestart: '다시 진단하기',
    aiLoading: '사용자의 성향을 분석하고 있습니다...',
    errorFetch: '데이터 파일을 불러오지 못했습니다.'
  },
  EN: {
    heroTitle: 'Prediger<br>Diagnosis',
    btnStart: 'Start Diagnosis',
    sortingTitle: 'Do you like this activity?',
    sortingSubtitle: 'Swipe right for things you enjoy.',
    textExit: 'Exit',
    likedLabel: 'Selected Cards (LIKED)',
    rankingTitle: 'Pick Your Top 3',
    rankingSubtitle: 'Select the 3 cards that represent you best in order of importance.',
    textSelected: 'Selected',
    textGenReport: 'Generate Report',
    textReportFor: 'DIAGNOSIS REPORT',
    labelAi: 'AI Career Report',
    labelJobs: 'Recommended Careers',
    btnRestart: 'Restart Diagnosis',
    aiLoading: 'Analyzing your profile...',
    errorFetch: 'Failed to load data.'
  }
};

// --- DOM ---
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

// --- INIT ---
function init() {
  updateUIStrings();

  el.introForm.addEventListener('submit', handleIntroSubmit);
  el.langToggle.addEventListener('click', toggleLanguage);
  
  document.getElementById('btn-swipe-left').onclick = () => swipe('left');
  document.getElementById('btn-swipe-right').onclick = () => swipe('right');
  document.getElementById('btn-swipe-up').onclick = () => swipe('up');
  document.getElementById('btn-exit').onclick = () => location.reload();
  document.getElementById('btn-restart').onclick = () => location.reload();
  el.btnShowResult.onclick = showResult;

  gsap.from(".intro-anim", { y: 30, opacity: 0, stagger: 0.1, duration: 0.8, ease: "power3.out" });
}

function toggleLanguage() {
  state.lang = state.lang === 'KR' ? 'EN' : 'KR';
  el.langToggle.textContent = state.lang === 'KR' ? 'Switch to English' : '한국어 버전으로 변경';
  updateUIStrings();
}

function updateUIStrings() {
  const s = STRINGS[state.lang];
  document.querySelector('h1').innerHTML = s.heroTitle;
  document.getElementById('btn-start').querySelector('span').textContent = s.btnStart;
  document.getElementById('sorting-title').textContent = s.sortingTitle;
  document.getElementById('sorting-subtitle').textContent = s.sortingSubtitle;
  document.getElementById('text-exit').textContent = s.textExit;
  document.getElementById('text-liked-label').textContent = s.likedLabel;
  document.getElementById('ranking-title').textContent = s.rankingTitle;
  document.getElementById('ranking-subtitle').textContent = s.rankingSubtitle;
  document.getElementById('text-selected').textContent = s.textSelected;
  document.getElementById('text-gen-report').textContent = s.textGenReport;
  document.getElementById('text-report-for').textContent = s.textReportFor;
  document.getElementById('label-ai').textContent = s.labelAi;
  document.getElementById('label-jobs').textContent = s.labelJobs;
  document.getElementById('btn-restart').textContent = s.btnRestart;
  document.getElementById('text-ai-loading').textContent = s.aiLoading;
}

// --- DATA ---
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
    // Improved error message for debugging
    alert(`${STRINGS[state.lang].errorFetch}\n\n[Debug Info]\n${err.message}`);
    btn.disabled = false;
    btn.innerHTML = `<span>${STRINGS[state.lang].btnStart}</span> <span class="text-xl">&rarr;</span>`;
  }
}

async function loadData() {
  const suffix = state.lang.toLowerCase();
  
  const cardsPath = `./assets/data/cards_${suffix}.json`;
  const contentPath = `./assets/data/contents_db_${suffix}.json`;

  const cardsRes = await fetch(cardsPath);
  if (!cardsRes.ok) {
    throw new Error(`Failed to fetch cards data from path: ${cardsPath} (Status: ${cardsRes.status})`);
  }
  const cardsJson = await cardsRes.json();
  state.cards = cardsJson.cards;

  const contentRes = await fetch(contentPath);
  if (!contentRes.ok) {
    throw new Error(`Failed to fetch contents DB from path: ${contentPath} (Status: ${contentRes.status})`);
  }
  state.contentsDB = await contentRes.json();
}

// --- SORTING ---
function renderStack() {
  el.cardStack.innerHTML = '';
  const stack = state.cards.slice(state.currentIndex, state.currentIndex + 3).reverse();
  
  stack.forEach((card, i) => {
    const isTop = i === stack.length - 1;
    const cardEl = document.createElement('div');
    cardEl.className = 'card-item';
    
    const modeData = card[state.mode];
    const keyword = card['keyword_' + state.lang.toLowerCase()];
    const imgPath = `./assets/images/${state.mode}/${modeData.img}`;
    
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
  if (dir === 'right') { x = 800; rot = 45; state.likedCards.push(cardData); addToLikedList(cardData); }
  else if (dir === 'left') { x = -800; rot = -45; }
  else if (dir === 'up') { y = -800; }

  gsap.to(cardEl, { x, y, rotation: rot, opacity: 0, duration: 0.5, onComplete: () => {
    state.currentIndex++;
    if (state.currentIndex >= state.cards.length) finishSorting();
    else renderStack();
  }});
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
  const p = (state.currentIndex / state.cards.length) * 100;
  el.progressBar.style.width = `${p}%`;
  el.progressText.textContent = `${state.currentIndex} / ${state.cards.length}`;
}

function finishSorting() {
  transition(el.sortingSection, el.rankingSection, 'flex');
  renderRankingGrid();
}

// --- RANKING ---
function renderRankingGrid() {
  el.rankingGrid.innerHTML = '';
  state.rankedCards = [];
  el.rankCount.textContent = '0';
  el.btnShowResult.disabled = true;

  if (state.likedCards.length === 0) {
    el.rankingGrid.innerHTML = `<div class="col-span-full py-20 text-center text-slate-400">선택된 카드가 없습니다.</div>`;
    return;
  }

  state.likedCards.forEach(card => {
    const cardEl = document.createElement('div');
    const keyword = card['keyword_' + state.lang.toLowerCase()];
    cardEl.className = 'selection-card relative rounded-3xl overflow-hidden cursor-pointer aspect-[3/4] shadow-md bg-white border border-slate-100 group';
    cardEl.innerHTML = `
      <img src="./assets/images/${state.mode}/${card[state.mode].img}" class="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" onerror="this.src='https://placehold.co/400x500?text=${keyword}'">
      <div class="absolute inset-0 bg-gradient-to-t from-slate-900/90 via-slate-900/20 to-transparent"></div>
      <div class="absolute bottom-5 left-5 right-5"><h4 class="text-white font-black text-base">${keyword}</h4></div>
      <div class="badge-container"></div>
    `;
    cardEl.onclick = () => {
      const idx = state.rankedCards.findIndex(c => c.id === card.id);
      if (idx > -1) state.rankedCards.splice(idx, 1);
      else if (state.rankedCards.length < 3) state.rankedCards.push(card);
      updateRankUI();
    };
    el.rankingGrid.appendChild(cardEl);
  });
}

function updateRankUI() {
  Array.from(el.rankingGrid.children).forEach((cardEl, i) => {
    const cardData = state.likedCards[i];
    const rankIdx = state.rankedCards.findIndex(c => c.id === cardData.id);
    cardEl.classList.toggle('selected', rankIdx > -1);
    cardEl.querySelector('.badge-container').innerHTML = rankIdx > -1 ? `<div class="rank-badge">${rankIdx + 1}</div>` : '';
  });
  el.rankCount.textContent = state.rankedCards.length;
  el.btnShowResult.disabled = state.rankedCards.length < 3;
  el.btnShowResult.className = `w-full sm:w-[350px] py-5 font-black rounded-3xl transition-all shadow-lg flex items-center justify-center gap-3 ${state.rankedCards.length === 3 ? 'bg-slate-900 text-white' : 'bg-slate-200 text-slate-400'}`;
}

// --- RESULT ---
async function showResult() {
  transition(el.rankingSection, el.resultSection, 'block');
  const scores = { D: 0, I: 0, P: 0, T: 0 };
  state.likedCards.forEach(c => scores[c.dimension]++);
  state.rankedCards.forEach((c, i) => scores[c.dimension] += (3 - i));

  const x = scores.T - scores.P;
  const y = scores.D - scores.I;

  const getResultKey = (x, y, s) => {
    const threshold = 3;
    if (Math.abs(x) <= threshold && Math.abs(y) <= threshold) return "CENTER";
    const sorted = Object.entries(s).sort((a,b) => b[1] - a[1]);
    if (sorted[0][1] > sorted[1][1] + 5) {
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
  const data = state.contentsDB[key] || { title: STRINGS[state.lang].heroTitle, summary: "...", jobs: [] };

  document.getElementById('result-type-title').textContent = data.title;
  document.getElementById('result-type-desc').textContent = data.summary;
  document.getElementById('result-tag').textContent = key;
  el.jobList.innerHTML = (data.jobs || []).map(j => `<span class="px-5 py-2.5 bg-slate-50 border border-slate-100 rounded-2xl text-xs font-black">${j}</span>`).join('');

  const max = Math.max(scores.D, scores.I, scores.P, scores.T, 10);
  ['D','I','P','T'].forEach(k => {
    document.getElementById(`score-${k}`).textContent = scores[k];
    document.getElementById(`bar-${k}`).style.width = `${(scores[k]/max)*100}%`;
  });

  gsap.to(document.getElementById('result-pointer'), {
    left: `calc(50% + ${Math.max(-1, Math.min(1, x/15))*50}%)`,
    top: `calc(50% + ${-Math.max(-1, Math.min(1, y/15))*50}%)`,
    opacity: 1, duration: 1.8, ease: "elastic.out(1, 0.4)", delay: 0.5
  });

  generateAIReport();
}

async function generateAIReport() {
  el.aiLoader.classList.remove('hidden');
  el.aiResult.classList.add('hidden');
  try {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const keywordKey = 'keyword_' + state.lang.toLowerCase();
    const keywords = state.rankedCards.map(c => c[keywordKey]).join(", ");
    const prompt = state.lang === 'KR' 
      ? `사용자 상위 키워드: ${keywords}. 이 사용자의 프레디저 흥미 유형을 분석하고, ${state.mode === 'child' ? '어린이' : '성인'} 수준 조언을 4문장으로 따뜻하게 해주세요.`
      : `Top keywords: ${keywords}. Analyze this Prediger type and provide advice in 4 sentences for a ${state.mode}.`;
    const res = await ai.models.generateContent({ model: 'gemini-3-flash-preview', contents: prompt });
    el.aiLoader.classList.add('hidden');
    el.aiResult.innerHTML = `<p>${res.text}</p>`;
    el.aiResult.classList.remove('hidden');
    gsap.from(el.aiResult, { opacity: 0, y: 20, duration: 0.8 });
  } catch (err) { el.aiLoader.innerHTML = `<p>Error generating AI insights.</p>`; }
}

function transition(from, to, display = 'block') {
  gsap.to(from, { opacity: 0, y: -30, duration: 0.4, onComplete: () => {
    from.classList.add('hidden');
    to.classList.remove('hidden');
    to.style.display = display;
    gsap.fromTo(to, { opacity: 0, y: 30 }, { opacity: 1, y: 0, duration: 0.5 });
  }});
}

init();