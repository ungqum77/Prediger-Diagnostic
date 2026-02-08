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
    heldListTitle: '보류한 카드 목록',
    likedListTitle: '선택한 카드 목록',
    textExit: '나가기',
    s9Title: '나를 가장 잘 설명하는 9장 선택',
    s9Subtitle: '좋아하는 카드들 중 나에게 가장 잘 맞는 9장을 골라주세요.',
    s9TextSelected: '선택됨',
    btnS9Next: '다음 단계로 이동',
    r3Title: '최종 핵심 3장 순위 결정',
    r3Subtitle: '선택한 9장 중 가장 나다운 3장을 순서대로 클릭하세요.',
    r3TextSelected: '순위 결정됨',
    btnR3Next: '분석 리포트 생성하기',
    anaStatusText: '심층 분석을 진행 중입니다...',
    textReportFor: '최종 분석 결과 리포트',
    labelAi: 'AI 종합 분석 리포트',
    labelAiSub: '핵심 흥미 분석',
    labelMap: '흥미 유형 맵 (Interpersonal Map)',
    labelScores: '성향 점수 분석 (Propensity Scores)',
    labelTraits: '특성 분석 (Traits)',
    labelEnergy: '에너지 흐름 (Energy Flow)',
    labelJobs: '추천 직업군 (Careers)',
    labelMajors: '추천 학과 (Majors)',
    labelNcs: 'NCS 직무 코드',
    labelGuide: '활동 가이드 (Guide)',
    labelRoleModels: '추천 롤모델 (Role Models)',
    labelAxisData: '현실 (Data)',
    labelAxisIdeas: '사고 (Ideas)',
    labelAxisPeople: '사람 (People)',
    labelAxisThings: '사물 (Things)',
    labelInterestTitle: '당신의 핵심 흥미 발견',
    labelGalleryTitle: '당신이 선택한 9장의 키워드',
    btnRestart: '다시 진단하기',
    btnDownload: 'PDF 리포트 저장하기',
    aiLoading: '분석 결과를 정리하고 있습니다...',
    errorFetch: '데이터 파일을 불러오지 못했습니다.',
    birthPlaceholder: ''
  },
  EN: {
    heroTitle: 'Prediger<br>Diagnosis',
    btnStart: 'Start Diagnosis',
    sortingTitleMain: 'Do you like this activity?',
    sortingSubtitleMain: 'Swipe right for things you enjoy.',
    sortingTitleHold: 'Review your held cards',
    sortingSubtitleHold: 'Swipe right to like, left to reject.',
    heldListTitle: 'Saved for Review',
    likedListTitle: 'Realtime Selections',
    textExit: 'Exit',
    s9Title: 'Select Exactly 9 Cards',
    s9Subtitle: 'Pick 9 cards that describe you best from your liked list.',
    s9TextSelected: 'Selected',
    btnS9Next: 'Next Step',
    r3Title: 'Rank Your Top 3',
    r3Subtitle: 'Select your Top 1, 2, and 3 from the 9 cards.',
    r3TextSelected: 'Ranked',
    btnR3Next: 'Analyze My Profile',
    anaStatusText: 'Deep analysis in progress...',
    textReportFor: 'DIAGNOSIS REPORT',
    labelAi: 'AI Analysis Report',
    labelAiSub: 'Core Interest Analysis',
    labelMap: 'Interpersonal Map',
    labelScores: 'Propensity Scores',
    labelTraits: 'Traits Analysis',
    labelEnergy: 'Energy Flow',
    labelJobs: 'Recommended Careers',
    labelMajors: 'Recommended Majors',
    labelNcs: 'NCS Codes',
    labelGuide: 'Activity Guide',
    labelRoleModels: 'Potential Role Models',
    labelAxisData: 'Data',
    labelAxisIdeas: 'Ideas',
    labelAxisPeople: 'People',
    labelAxisThings: 'Things',
    labelInterestTitle: 'Discovery of Your Core Interests',
    labelGalleryTitle: 'Your Top 9 Keywords',
    btnRestart: 'Restart Diagnosis',
    btnDownload: 'Download PDF Report',
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
  heldList: document.getElementById('held-list'),
  progressBar: document.getElementById('progress-bar'),
  progressText: document.getElementById('progress-text-display'),
  
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
  
  resTitle: document.getElementById('result-title'),
  resSummary: document.getElementById('result-summary'),
  resTraits: document.getElementById('result-traits'),
  resEnergy: document.getElementById('result-energy'),
  resEnergyContainer: document.getElementById('energy-container'),
  resJobs: document.getElementById('result-jobs'),
  resMajors: document.getElementById('result-majors'),
  resNCS: document.getElementById('result-ncs'),
  resNCSContainer: document.getElementById('ncs-container'),
  resGuide: document.getElementById('result-guide'),
  resGuideContainer: document.getElementById('guide-container'),
  resRoleModels: document.getElementById('result-role-models'),
  resTag: document.getElementById('result-tag'),
  resGallery: document.getElementById('result-gallery-grid'),
  
  btnDownloadPdf: document.getElementById('btn-download-pdf')
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
  if (el.btnDownloadPdf) el.btnDownloadPdf.onclick = downloadPDF;

  if (typeof gsap !== 'undefined') {
    gsap.from(".intro-anim", { y: 30, opacity: 0, stagger: 0.1, duration: 0.8, ease: "power3.out" });
  }
}

function downloadPDF() {
  const element = document.getElementById('result-content-container');
  const btn = el.btnDownloadPdf;
  if (!element) return;
  
  const originalText = btn.innerHTML;
  btn.innerHTML = `<div class="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div> PDF 리포트 생성 중...`;
  btn.disabled = true;

  element.classList.add('pdf-export-mode');

  const opt = {
    margin: [20, 20, 20, 20],
    filename: `프레디저_진단리포트_${state.user.name || '사용자'}.pdf`,
    image: { type: 'jpeg', quality: 0.98 },
    html2canvas: { 
      scale: 2, 
      useCORS: true,
      scrollY: 0,
      windowWidth: 1024,
      backgroundColor: '#ffffff'
    },
    jsPDF: { unit: 'pt', format: 'a4', orientation: 'portrait' },
    pagebreak: { mode: ['avoid-all', 'css', 'legacy'] }
  };
  
  if (typeof html2pdf !== 'undefined') {
    html2pdf().set(opt).from(element).save().then(() => {
       element.classList.remove('pdf-export-mode');
       btn.innerHTML = originalText;
       btn.disabled = false;
    }).catch(err => {
       console.error(err);
       element.classList.remove('pdf-export-mode');
       btn.innerHTML = originalText;
       btn.disabled = false;
       alert("PDF 생성에 실패했습니다.");
    });
  } else {
    alert("PDF 라이브러리를 찾을 수 없습니다.");
    element.classList.remove('pdf-export-mode');
    btn.innerHTML = originalText;
    btn.disabled = false;
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
  const idMap = {
    'heroTitle': 'hero-title',
    'heldListTitle': 'held-list-title',
    'likedListTitle': 'liked-list-title',
    'textExit': 'text-exit',
    's9Title': 's9-title',
    's9Subtitle': 's9-subtitle',
    's9TextSelected': 's9-text-selected',
    'btnS9Next': 'btn-s9-next-text',
    'r3Title': 'r3-title',
    'r3Subtitle': 'r3-subtitle',
    'r3TextSelected': 'r3-text-selected',
    'btnR3Next': 'btn-r3-next-text',
    'textReportFor': 'text-report-for',
    'labelAi': 'label-ai',
    'labelAiSub': 'label-ai-sub',
    'labelMap': 'label-map',
    'labelScores': 'label-scores',
    'labelTraits': 'label-traits',
    'labelEnergy': 'label-energy',
    'labelJobs': 'label-jobs',
    'labelMajors': 'label-majors',
    'labelNcs': 'label-ncs',
    'labelGuide': 'label-guide',
    'labelRoleModels': 'label-rolemodels',
    'labelAxisData': 'label-axis-data',
    'labelAxisIdeas': 'label-axis-ideas',
    'labelAxisPeople': 'label-axis-people',
    'labelAxisThings': 'label-axis-things',
    'labelInterestTitle': 'label-interest-title',
    'labelGalleryTitle': 'label-gallery-title',
    'btnRestart': 'btn-restart-text',
    'btnDownload': 'btn-download-text',
    'anaStatusText': 'ana-status-text'
  };

  Object.keys(idMap).forEach(key => {
    const elTarget = document.getElementById(idMap[key]);
    if (elTarget) {
      if (elTarget.tagName === 'SPAN' || elTarget.tagName === 'H1' || elTarget.tagName === 'H2' || elTarget.tagName === 'H3' || elTarget.tagName === 'P') {
        elTarget.innerHTML = s[key];
      } else {
        elTarget.textContent = s[key];
      }
    }
  });

  const startBtn = document.getElementById('btn-start');
  if (startBtn) {
    const span = startBtn.querySelector('span');
    if (span) span.textContent = s.btnStart;
  }
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
  btn.innerHTML = `<div class="w-10 h-10 border-4 border-white/20 border-t-white rounded-full animate-spin"></div>`;

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
  if (!el.cardStack) return;
  el.cardStack.innerHTML = '';
  const isMain = state.currentSortingStep === 'main';
  const currentPool = isMain ? state.cards : state.heldCards;
  const s = STRINGS[state.lang];
  const titleEl = document.getElementById('sorting-title');
  const subtitleEl = document.getElementById('sorting-subtitle');
  if (titleEl) titleEl.textContent = isMain ? s.sortingTitleMain : s.sortingTitleHold;
  if (subtitleEl) subtitleEl.textContent = isMain ? s.sortingSubtitleMain : s.sortingSubtitleHold;
  const indicators = document.querySelectorAll('#phase-indicator .phase-badge');
  indicators.forEach((ind, idx) => {
    ind.classList.toggle('active', (isMain && idx === 0) || (!isMain && idx === 1));
    ind.classList.toggle('done', !isMain && idx === 0);
  });
  const btnPass = document.getElementById('btn-swipe-up');
  if (btnPass) btnPass.style.display = isMain ? 'flex' : 'none';
  const stack = currentPool.slice(state.currentIndex, state.currentIndex + 3).reverse();
  stack.forEach((card, i) => {
    const isTop = i === stack.length - 1;
    const cardEl = document.createElement('div');
    cardEl.className = 'card-item';
    const modeData = card[state.mode];
    const keywordKey = 'keyword_' + state.lang.toLowerCase();
    const keyword = card[keywordKey] || card.keyword;
    const imgFolder = state.mode === 'child' ? 'kids' : 'adult';
    const imgPath = `/assets/images/${imgFolder}/${modeData.img}`;
    cardEl.innerHTML = `
      <div class="relative w-full h-[55%] bg-slate-100 overflow-hidden">
        <img src="${imgPath}" class="w-full h-full object-cover pointer-events-none" onerror="this.src='https://placehold.co/400x500?text=${keyword}'">
        <div class="stamp stamp-like">LIKE</div>
        <div class="stamp stamp-nope">NOPE</div>
        ${isMain ? '<div class="stamp stamp-hold">HELD</div>' : ''}
      </div>
      <div class="px-6 py-4 h-[45%] bg-white flex flex-col items-center justify-center text-center overflow-hidden">
        <h3 class="leading-tight shrink-0 text-xl font-black">${keyword}</h3>
        <p class="mt-1 text-slate-500 overflow-hidden line-clamp-3 font-medium">${modeData.desc}</p>
      </div>
      <div class="absolute top-4 right-4 bg-white/95 backdrop-blur-xl px-2 py-1 rounded-lg text-[8px] font-black text-slate-400 border border-slate-100 uppercase tracking-widest shadow-sm">
        ${card.dimension}
      </div>
    `;
    const depth = stack.length - 1 - i;
    if (window.gsap) gsap.set(cardEl, { scale: 1 - depth * 0.05, y: depth * 15, zIndex: i });
    el.cardStack.appendChild(cardEl);
    if (isTop) setupDraggable(cardEl, card);
  });
  updateProgress();
}

function setupDraggable(cardEl, cardData) {
  if (typeof Draggable === 'undefined') return;
  const isMain = state.currentSortingStep === 'main';
  Draggable.create(cardEl, {
    type: isMain ? "x,y" : "x",
    onDrag: function() {
      gsap.set(cardEl, { rotation: this.x * 0.05 });
      const likeStamp = cardEl.querySelector('.stamp-like');
      const nopeStamp = cardEl.querySelector('.stamp-nope');
      const holdStamp = cardEl.querySelector('.stamp-hold');
      if (likeStamp) gsap.set(likeStamp, { opacity: Math.max(0, Math.min(1, this.x / 100)) });
      if (nopeStamp) gsap.set(nopeStamp, { opacity: Math.max(0, Math.min(1, -this.x / 100)) });
      if (isMain && holdStamp) gsap.set(holdStamp, { opacity: Math.max(0, Math.min(1, Math.abs(this.y) / 100)) });
    },
    onDragEnd: function() {
      if (this.x > 120) handleSwipe('right', cardEl, cardData);
      else if (this.x < -120) handleSwipe('left', cardEl, cardData);
      else if (isMain && Math.abs(this.y) > 120) handleSwipe(this.y < 0 ? 'up' : 'down', cardEl, cardData);
      else {
        gsap.to(cardEl, { x: 0, y: 0, rotation: 0, duration: 0.6, ease: "back.out(1.7)" });
        gsap.to(cardEl.querySelectorAll('.stamp'), { opacity: 0, duration: 0.3 });
      }
    }
  });
}

function swipe(dir) {
  if (state.currentSortingStep === 'hold' && (dir === 'up' || dir === 'down')) return;
  const currentPool = state.currentSortingStep === 'main' ? state.cards : state.heldCards;
  const top = el.cardStack?.querySelector('.card-item:last-child');
  if (top) handleSwipe(dir, top, currentPool[state.currentIndex]);
}

function handleSwipe(dir, cardEl, cardData) {
  let x = 0, y = 0, rot = 0;
  const isMain = state.currentSortingStep === 'main';
  if (dir === 'right') { x = 800; rot = 45; state.likedCards.push(cardData); addToThumbnailList(cardData, 'liked'); }
  else if (dir === 'left') { x = -800; rot = -45; state.rejectedCards.push(cardData); }
  else if (isMain && (dir === 'up' || dir === 'down')) { y = dir === 'up' ? -800 : 800; state.heldCards.push(cardData); addToThumbnailList(cardData, 'held'); }
  else { if (window.gsap) gsap.to(cardEl, { x: 0, y: 0, rotation: 0, duration: 0.6, ease: "back.out(1.7)" }); return; }
  if (window.gsap) gsap.to(cardEl, { x, y, rotation: rot, opacity: 0, duration: 0.5, onComplete: () => { state.currentIndex++; checkSortingCompletion(); }});
  else { state.currentIndex++; checkSortingCompletion(); }
}

function checkSortingCompletion() {
  const currentPool = state.currentSortingStep === 'main' ? state.cards : state.heldCards;
  if (state.currentIndex >= currentPool.length) {
    if (state.currentSortingStep === 'main' && state.heldCards.length > 0) { state.currentSortingStep = 'hold'; state.currentIndex = 0; renderStack(); }
    else { finishSorting(); }
  } else { renderStack(); }
}

function addToThumbnailList(card, target) {
  const listEl = target === 'liked' ? el.likedList : el.heldList;
  if (!listEl) return;
  const imgFolder = state.mode === 'child' ? 'kids' : 'adult';
  const imgPath = `/assets/images/${imgFolder}/${card[state.mode].img}`;
  const keywordKey = 'keyword_' + state.lang.toLowerCase();
  const keyword = card[keywordKey] || card.keyword;
  const item = document.createElement('div');
  item.className = 'liked-thumb';
  item.innerHTML = `<img src="${imgPath}" class="w-full h-full object-cover" title="${keyword}" onerror="this.src='https://placehold.co/100x130?text=${keyword}'"><div class="absolute inset-x-0 bottom-0 bg-black/60 py-1 text-[8px] text-white font-black text-center">${keyword}</div>`;
  listEl.appendChild(item);
}

function updateProgress() {
  const isMain = state.currentSortingStep === 'main';
  const currentPool = isMain ? state.cards : state.heldCards;
  const p = (state.currentIndex / currentPool.length) * 100;
  if (el.progressBar) el.progressBar.style.width = `${p}%`;
  if (el.progressText) el.progressText.textContent = `${state.currentIndex} / ${currentPool.length}`;
  if (el.countLike) el.countLike.textContent = state.likedCards.length;
  if (el.countHold) { const heldCount = isMain ? state.heldCards.length : (state.heldCards.length - state.currentIndex); el.countHold.textContent = Math.max(0, heldCount); }
  if (el.countNope) el.countNope.textContent = state.rejectedCards.length;
}

function finishSorting() { renderSelect9Grid(); transition(el.sortingSection, el.select9Section, 'flex'); }

// --- STEP 4: SELECT TOP 9 ---
function renderSelect9Grid() {
  if (!el.s9Grid) return;
  el.s9Grid.innerHTML = '';
  state.top9Cards = [];
  updateS9UI();
  state.likedCards.forEach(card => {
    const cardEl = document.createElement('div');
    const keywordKey = 'keyword_' + state.lang.toLowerCase();
    const keyword = card[keywordKey] || card.keyword;
    const folder = state.mode === 'child' ? 'kids' : 'adult';
    cardEl.className = 'selection-card relative rounded-2xl overflow-hidden cursor-pointer aspect-[3/4] shadow-md bg-white border border-slate-100 group';
    cardEl.innerHTML = `<img src="/assets/images/${folder}/${card[state.mode].img}" class="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" onerror="this.src='https://placehold.co/400x500?text=${keyword}'"><div class="absolute inset-0 bg-gradient-to-t from-slate-900/90 via-slate-900/10 to-transparent"></div><div class="absolute bottom-3 left-3 right-3"><h4 class="text-white font-black text-[10px] truncate">${keyword}</h4></div><div class="badge-container"></div>`;
    cardEl.onclick = () => { const idx = state.top9Cards.findIndex(c => c.id === card.id); if (idx > -1) state.top9Cards.splice(idx, 1); else if (state.top9Cards.length < 9) state.top9Cards.push(card); updateS9UI(); };
    el.s9Grid.appendChild(cardEl);
  });
}

function updateS9UI() {
  if (!el.s9Grid) return;
  Array.from(el.s9Grid.children).forEach((cardEl, i) => { const cardData = state.likedCards[i]; const isSelected = state.top9Cards.some(c => c.id === cardData.id); cardEl.classList.toggle('selected', isSelected); });
  if (el.s9Count) el.s9Count.textContent = state.top9Cards.length;
  if (el.btnS9Next) { el.btnS9Next.disabled = state.top9Cards.length !== 9; el.btnS9Next.className = `w-full sm:w-[320px] py-4 font-black rounded-2xl transition-all shadow-lg hover:translate-y-[-2px] flex items-center justify-center gap-3 ${state.top9Cards.length === 9 ? 'bg-slate-900 text-white' : 'bg-slate-200 text-slate-400'}`; }
}

// --- STEP 5: RANK TOP 3 ---
function startRanking() { renderRank3Grid(); transition(el.select9Section, el.rank3Section, 'flex'); }

function renderRank3Grid() {
  if (!el.r3Grid) return;
  el.r3Grid.innerHTML = '';
  state.rankedCards = [];
  updateR3UI();
  state.top9Cards.forEach(card => {
    const cardEl = document.createElement('div');
    const keywordKey = 'keyword_' + state.lang.toLowerCase();
    const keyword = card[keywordKey] || card.keyword;
    const folder = state.mode === 'child' ? 'kids' : 'adult';
    cardEl.className = 'selection-card relative rounded-2xl overflow-hidden cursor-pointer aspect-[3/4] shadow-md bg-white border border-slate-100 group w-full';
    cardEl.innerHTML = `<img src="/assets/images/${folder}/${card[state.mode].img}" class="w-full h-full object-cover" onerror="this.src='https://placehold.co/400x500?text=${keyword}'"><div class="absolute inset-0 bg-gradient-to-t from-slate-900/90 via-slate-900/10 to-transparent"></div><div class="absolute bottom-3 left-3 right-3"><h4 class="text-white font-black text-[10px] truncate">${keyword}</h4></div><div class="badge-container"></div>`;
    cardEl.onclick = () => { const idx = state.rankedCards.findIndex(c => c.id === card.id); if (idx > -1) state.rankedCards.splice(idx, 1); else if (state.rankedCards.length < 3) state.rankedCards.push(card); updateR3UI(); };
    el.r3Grid.appendChild(cardEl);
  });
}

function updateR3UI() {
  if (!el.r3Grid) return;
  Array.from(el.r3Grid.children).forEach((cardEl, i) => { const cardData = state.top9Cards[i]; const rankIdx = state.rankedCards.findIndex(c => c.id === cardData.id); cardEl.classList.toggle('selected', rankIdx > -1); const badge = cardEl.querySelector('.badge-container'); if (badge) badge.innerHTML = rankIdx > -1 ? `<div class="rank-badge">${rankIdx + 1}</div>` : ''; });
  if (el.r3Count) el.r3Count.textContent = state.rankedCards.length;
  if (el.btnR3Next) { el.btnR3Next.disabled = state.rankedCards.length !== 3; el.btnR3Next.className = `w-full sm:w-[320px] py-4 font-black rounded-2xl transition-all shadow-lg hover:translate-y-[-2px] flex items-center justify-center gap-3 ${state.rankedCards.length === 3 ? 'bg-slate-900 text-white' : 'bg-slate-200 text-slate-400'}`; }
}

// --- STEP 6: ANALYSIS & ADS ---
function startAnalysis() { transition(el.rank3Section, el.adsOverlay, 'flex'); setTimeout(() => { if (el.btnSkipAd) el.btnSkipAd.classList.remove('hidden'); }, 4000); }

// --- STEP 7: FINAL RESULT & ALGORITHM ---

/**
 * 프레디저(Prediger) 이론 '일의 세계 지도' 원리에 따른 결과 산출 알고리즘
 * 1. 점수 집계 (D, I, P, T)
 * 2. CENTER(미분화) 판별 (1순위-4순위 차이 <= 2)
 * 3. 단일 vs 복합 유형 판별 (1순위-2순위 차이 >= 3 이면 단일)
 * 4. Bipolar(반대성향) 예외 처리 (D-I, P-T는 섞일 수 없음)
 */
function calculateResultKey(scores) {
  // 점수 객체를 배열로 변환하여 내림차순 정렬
  const ranks = Object.entries(scores)
    .map(([key, score]) => ({ key, score }))
    .sort((a, b) => b.score - a.score);

  const r1 = ranks[0]; // 1순위
  const r2 = ranks[1]; // 2순위
  const r3 = ranks[2]; // 3순위
  const r4 = ranks[3]; // 4순위 (꼴찌)

  // 1. CENTER 판별: 가장 높은 점수와 가장 낮은 점수의 차이가 2 이하일 때
  if (r1.score - r4.score <= 2) {
    return "CENTER";
  }

  // 2. 단일 유형 판별: 1순위와 2순위의 차이가 3 이상일 때
  if (r1.score - r2.score >= 3) {
    return r1.key;
  }

  // 3. Bipolar(반대 성향) 체크: D-I 혹은 P-T 조합은 복합 유형이 될 수 없음
  const isBipolar = (
    (r1.key === 'D' && r2.key === 'I') || (r1.key === 'I' && r2.key === 'D') ||
    (r1.key === 'P' && r2.key === 'T') || (r1.key === 'T' && r2.key === 'P')
  );

  if (isBipolar) {
    // 반대 성향이면 1순위 단일 유형으로 결정
    return r1.key;
  }

  // 4. 복합 유형 결정: 1순위와 2순위 결합 (알파벳 순서가 아닌 점수 순서로 결합)
  // contentsDB의 키값 규약에 따라 정렬 (예: DT, DP 등)
  return r1.key + r2.key;
}

async function showResult() {
  const scores = { D: 0, I: 0, P: 0, T: 0 };
  
  // 1. 모든 선택된 카드(liked) 기본 1점
  state.likedCards.forEach(card => {
    if (card.dimension && scores[card.dimension] !== undefined) scores[card.dimension] += 1;
  });

  // 2. 핵심 Top 3 가중치 부여 (1등 +5, 2등 +4, 3등 +3)
  state.rankedCards.forEach((card, idx) => {
    const bonus = 5 - idx;
    if (card.dimension && scores[card.dimension] !== undefined) scores[card.dimension] += bonus;
  });

  // 새 알고리즘 적용
  const finalKey = calculateResultKey(scores);
  
  // 결과 데이터 기반 렌더링
  renderReport(finalKey, scores); 
  transition(el.adsOverlay, el.resultSection, 'block'); 
  generateAIReport();
}

function renderReport(key, scores) {
  const data = state.contentsDB[key] || state.contentsDB["CENTER"] || { 
    title: "균형 잡힌 탐험가", 
    summary: "다양한 분야에 고루 흥미를 가지고 있습니다.", 
    traits: { desc: "유연한 관심사.", energy: "상황에 적응함." },
    job_families: [],
    majors: [],
    activity_guide: "다양한 활동을 시도해보세요."
  };

  if (el.resTitle) el.resTitle.innerHTML = `<span class="text-blue-600">${data.title}</span> 타입입니다.`;
  if (el.resSummary) el.resSummary.textContent = data.summary;
  if (el.resTag) el.resTag.textContent = key;
  if (el.resTraits) el.resTraits.textContent = data.traits?.desc || (typeof data.traits === 'string' ? data.traits : "");
  if (el.resEnergy && el.resEnergyContainer) {
    el.resEnergy.textContent = data.traits?.energy || "";
    el.resEnergyContainer.style.display = data.traits?.energy ? 'block' : 'none';
  }
  if (el.resJobs) el.resJobs.innerHTML = (data.job_families || []).map(j => `<span class="px-6 py-3 bg-blue-50 text-blue-700 rounded-2xl text-sm font-black border border-blue-100">${j}</span>`).join('');
  if (el.resMajors) el.resMajors.innerHTML = (data.majors || []).map(m => `<span class="px-4 py-2 bg-indigo-50 text-indigo-700 rounded-xl text-xs font-bold border border-indigo-100">${m}</span>`).join('');
  if (el.resGuide && el.resGuideContainer) { el.resGuide.textContent = data.activity_guide || ""; el.resGuideContainer.style.display = data.activity_guide ? 'block' : 'none'; }

  if (el.resGallery) {
      el.resGallery.innerHTML = '';
      state.top9Cards.forEach(card => {
          const cardEl = document.createElement('div');
          const rankIdx = state.rankedCards.findIndex(rc => rc.id === card.id);
          const folder = state.mode === 'child' ? 'kids' : 'adult';
          const keywordKey = 'keyword_' + state.lang.toLowerCase();
          const keyword = card[keywordKey] || card.keyword;
          cardEl.className = 'relative rounded-xl overflow-hidden aspect-[3/4] shadow-sm border border-slate-100 bg-white group';
          cardEl.innerHTML = `
              <img src="/assets/images/${folder}/${card[state.mode].img}" class="w-full h-full object-cover grayscale-[0.2]" onerror="this.src='https://placehold.co/400x500?text=${keyword}'">
              <div class="absolute inset-0 bg-gradient-to-t from-slate-900/80 via-transparent to-transparent"></div>
              <div class="absolute bottom-2 left-2 right-2 text-center text-white text-[9px] font-black uppercase truncate">${keyword}</div>
              ${rankIdx > -1 ? `<div class="absolute top-2 right-2 w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-black border-2 border-white shadow-lg ${getRankColorClass(rankIdx)} text-white">${rankIdx + 1}</div>` : ''}
          `;
          el.resGallery.appendChild(cardEl);
      });
  }

  const max = Math.max(...Object.values(scores), 1);
  ['D','I','P','T'].forEach(k => {
    const sEl = document.getElementById(`score-${k}`);
    const bEl = document.getElementById(`bar-${k}`);
    if (sEl) sEl.textContent = scores[k];
    if (bEl && window.gsap) gsap.to(bEl, { width: `${(scores[k]/max)*100}%`, duration: 1.5, ease: "power4.out" });
  });

  const pointer = document.getElementById('result-pointer');
  if (pointer && window.gsap) {
    const xCoord = scores.T - scores.P;
    const yCoord = scores.D - scores.I;
    gsap.to(pointer, {
      left: `calc(50% + ${Math.max(-1, Math.min(1, xCoord/15))*50}%)`,
      top: `calc(50% + ${-Math.max(-1, Math.min(1, yCoord/15))*50}%)`,
      opacity: 1, duration: 2, ease: "elastic.out(1, 0.4)", delay: 0.5
    });
  }
}

function getRankColorClass(rank) { if (rank === 0) return 'bg-amber-400'; if (rank === 1) return 'bg-slate-400'; if (rank === 2) return 'bg-orange-400'; return 'bg-blue-600'; }

async function generateAIReport() {
  if (!el.aiLoader || !el.aiResult) return;
  el.aiLoader.classList.remove('hidden');
  el.aiResult.classList.add('hidden');
  try {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const keywordKey = 'keyword_' + state.lang.toLowerCase();
    const keywords = state.rankedCards.map(c => c[keywordKey]).join(", ");
    const prompt = state.lang === 'KR' ? `상위 키워드: ${keywords}. 이 사용자의 프레디저 흥미 유형을 분석하고, 조언을 4문장으로 따뜻하게 해주세요.` : `Keywords: ${keywords}. Analyze this Prediger profile and give career advice in 4 sentences.`;
    const res = await ai.models.generateContent({ model: 'gemini-3-flash-preview', contents: prompt });
    el.aiLoader.classList.add('hidden');
    el.aiResult.innerHTML = `<div class="text-slate-50 font-medium leading-relaxed">${res.text}</div>`;
    el.aiResult.classList.remove('hidden');
    if (window.gsap) gsap.from(el.aiResult, { opacity: 0, y: 20, duration: 0.8 });
  } catch (err) { el.aiLoader.innerHTML = `<p class="text-xs text-blue-100/50">분석 결과를 불러올 수 없습니다.</p>`; }
}

function transition(from, to, display = 'block') {
  if (!from || !to) return;
  from.classList.add('hidden');
  from.style.display = 'none';
  to.classList.remove('hidden');
  to.style.display = display;
  window.scrollTo({ top: 0, behavior: 'instant' });
  document.body.scrollTop = 0;
  document.documentElement.scrollTop = 0;
  setTimeout(() => window.scrollTo({ top: 0, behavior: 'instant' }), 10);
  if (window.gsap) { gsap.set(to, { clearProps: "all" }); gsap.fromTo(to, { opacity: 0, y: 0 }, { opacity: 1, y: 0, duration: 0.4, ease: "power2.out", clearProps: "all" }); }
  else { to.style.opacity = '1'; to.style.transform = 'none'; }
}

document.addEventListener('DOMContentLoaded', init);