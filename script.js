
import { GoogleGenAI } from "@google/genai";

// GSAP 플러그인 등록
if (window.gsap && window.Draggable) {
  gsap.registerPlugin(Draggable);
}

const getApiKey = () => {
  try { return process.env.API_KEY; } catch (e) { return ""; }
};

const API_KEY = getApiKey();
let aiInstance = null;

const initAI = () => {
  try {
    if (API_KEY) {
      aiInstance = new GoogleGenAI({ apiKey: API_KEY });
      console.log("✅ Google AI Connected Successfully.");
    }
  } catch (e) {
    console.error("❌ AI Initialization failed:", e);
  }
};

initAI();

// --- UTILITIES ---
const getVal = (obj, keys) => {
  if (!obj) return "";
  for (const key of keys) {
    if (obj[key] !== undefined && obj[key] !== null) return obj[key];
  }
  return "";
};

const getCardKeyword = (c) => getVal(c, ['keyword', 'keyword_kr', 'name', 'title']);
const getCardDesc = (c) => (c.adult && c.adult.desc) ? c.adult.desc : getVal(c, ['desc', 'description', 'desc_kr']);
const getCardImg = (c) => (c.adult && c.adult.img) ? c.adult.img : getVal(c, ['img', 'image', 'imageUrl']);
const getCardType = (c) => getVal(c, ['type', 'dimension', 'category']);

const MOCK_CARDS = [
  { id: 1, type: "D", keyword: "기록하기", desc: "자료를 기록하고 정리하는 것을 좋아합니다.", img: "card_01.png" },
  { id: 2, type: "I", keyword: "아이디어", desc: "새로운 생각을 떠올리고 상상하는 것을 좋아합니다.", img: "card_02.png" },
  { id: 3, type: "P", keyword: "도와주기", desc: "친구들의 고민을 들어주고 돕는 것을 좋아합니다.", img: "card_03.png" },
  { id: 4, type: "T", keyword: "만들기", desc: "손으로 물건을 조립하거나 만드는 것을 좋아합니다.", img: "card_04.png" },
  { id: 5, type: "D", keyword: "분석하기", desc: "숫자나 정보를 꼼꼼하게 따져보는 것을 좋아합니다.", img: "card_05.png" }
];

const state = {
  cards: [],
  contentsDB: {},
  likedCards: [],
  heldCards: [],
  rejectedCards: [],
  top9Cards: [],
  rankedCards: [],
  currentIndex: 0,
  currentSortingStep: 'main',
  aiAnalysisResult: null,
  user: { name: '' }
};

const el = {};
const populateElements = () => {
  const ids = [
    'intro-section', 'sorting-section', 'select9-section', 'rank3-section', 'ads-overlay', 
    'result-section', 'intro-form', 'card-stack', 's9-grid', 's9-count', 'btn-s9-next', 
    'r3-grid', 'r3-count', 'btn-r3-next', 'btn-skip-ad', 'result-title', 'result-summary', 
    'result-traits', 'result-jobs', 'result-majors', 'result-tag', 'result-gallery-grid', 
    'btn-download-pdf', 'liked-list', 'held-list', 'progress-bar', 'progress-text-display', 
    'count-like', 'count-hold', 'count-nope', 'ana-status-text'
  ];
  ids.forEach(id => { el[id.replace(/-([a-z])/g, g => g[1].toUpperCase())] = document.getElementById(id); });
};

async function loadData() {
  try {
    const cardsRes = await fetch(`assets/data/cards_kr.json`);
    const data = await cardsRes.json();
    state.cards = data.cards || data;
  } catch (e) { state.cards = MOCK_CARDS; }
  try {
    const contentRes = await fetch(`assets/data/contents_db_kr.json`);
    state.contentsDB = await contentRes.json();
  } catch (e) { state.contentsDB = {}; }
}

function renderStack() {
  if (!el.cardStack) return;
  el.cardStack.innerHTML = '';
  const pool = state.currentSortingStep === 'main' ? state.cards : state.heldCards;
  const current = pool.slice(state.currentIndex, state.currentIndex + 3).reverse();
  
  if (current.length === 0 && pool.length > 0) { finishSorting(); return; }

  current.forEach((card, i) => {
    const cardEl = document.createElement('div');
    cardEl.className = 'card-item';
    const depth = current.length - 1 - i;
    cardEl.style.zIndex = i;
    cardEl.style.transform = `scale(${1 - depth * 0.05}) translateY(${depth * 15}px)`;
    
    const keyword = getCardKeyword(card);
    const desc = getCardDesc(card);
    const type = getCardType(card);
    const imgFile = getCardImg(card);
    const imgSrc = imgFile ? `assets/images/adult/${imgFile}` : `https://placehold.co/400x300?text=${keyword}`;
    
    cardEl.innerHTML = `
      <div class="h-1/2 bg-slate-100 overflow-hidden relative">
        <img src="${imgSrc}" class="w-full h-full object-cover" onerror="this.src='https://placehold.co/400x300?text=${keyword}'">
        <!-- Stamps -->
        <div class="stamp stamp-like opacity-0 absolute top-4 left-4 border-4 border-blue-500 text-blue-500 px-4 py-2 rounded-xl font-black text-2xl rotate-[-15deg] z-50 bg-white/80">LIKE</div>
        <div class="stamp stamp-nope opacity-0 absolute top-4 right-4 border-4 border-slate-400 text-slate-400 px-4 py-2 rounded-xl font-black text-2xl rotate-[15deg] z-50 bg-white/80">NOPE</div>
        <div class="stamp stamp-hold opacity-0 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 border-4 border-amber-500 text-amber-500 px-4 py-2 rounded-xl font-black text-2xl z-50 bg-white/80">HOLD</div>
      </div>
      <div class="p-6 text-center">
        <h3 class="text-xl font-bold mb-2">${keyword}</h3>
        <p class="text-sm text-slate-500">${desc}</p>
      </div>
      <div class="absolute top-4 right-4 bg-white/80 px-2 py-1 rounded text-[10px] font-bold shadow-sm">${type}</div>
    `;
    el.cardStack.appendChild(cardEl);
    if (depth === 0) setupDraggable(cardEl, card);
  });
  updateProgress();
}

function setupDraggable(cardEl, cardData) {
  if (typeof Draggable === 'undefined') return;
  const stampLike = cardEl.querySelector('.stamp-like');
  const stampNope = cardEl.querySelector('.stamp-nope');
  const stampHold = cardEl.querySelector('.stamp-hold');

  Draggable.create(cardEl, {
    type: "x,y",
    onDrag: function() {
      gsap.set(this.target, { rotation: this.x * 0.05 });
      const xVal = this.x;
      const yVal = this.y;
      if (xVal > 50) { gsap.set(stampLike, { opacity: Math.min(xVal / 150, 1) }); gsap.set([stampNope, stampHold], { opacity: 0 }); }
      else if (xVal < -50) { gsap.set(stampNope, { opacity: Math.min(Math.abs(xVal) / 150, 1) }); gsap.set([stampLike, stampHold], { opacity: 0 }); }
      else if (yVal < -50) { gsap.set(stampHold, { opacity: Math.min(Math.abs(yVal) / 150, 1) }); gsap.set([stampLike, stampNope], { opacity: 0 }); }
      else { gsap.set([stampLike, stampNope, stampHold], { opacity: 0 }); }
    },
    onDragEnd: function() {
      if (this.x > 100) handleSwipe('right', cardEl, cardData);
      else if (this.x < -100) handleSwipe('left', cardEl, cardData);
      else if (this.y < -100 && state.currentSortingStep === 'main') handleSwipe('up', cardEl, cardData);
      else {
        gsap.to(this.target, { x: 0, y: 0, rotation: 0, duration: 0.5, ease: "elastic.out(1, 0.5)" });
        gsap.to([stampLike, stampNope, stampHold], { opacity: 0, duration: 0.2 });
      }
    }
  });
}

function handleSwipe(dir, cardEl, cardData) {
  if (dir === 'right') { state.likedCards.push(cardData); addToThumbnailList(cardData, 'liked'); }
  else if (dir === 'up') { state.heldCards.push(cardData); addToThumbnailList(cardData, 'held'); }
  else { state.rejectedCards.push(cardData); }
  gsap.to(cardEl, { x: dir === 'right' ? 600 : dir === 'left' ? -600 : 0, y: dir === 'up' ? -600 : 0, opacity: 0, duration: 0.4, onComplete: () => {
    state.currentIndex++;
    const pool = state.currentSortingStep === 'main' ? state.cards : state.heldCards;
    if (state.currentIndex >= pool.length) {
      if (state.currentSortingStep === 'main' && state.heldCards.length > 0) { state.currentSortingStep = 'held'; state.currentIndex = 0; renderStack(); }
      else { finishSorting(); }
    } else { renderStack(); }
  }});
  updateProgress();
}

function addToThumbnailList(card, target) {
  const listEl = target === 'liked' ? el.likedList : el.heldList;
  if (!listEl) return;
  const thumb = document.createElement('div');
  thumb.className = 'liked-thumb relative rounded-xl overflow-hidden aspect-[3/4] bg-slate-100 border border-slate-200 shadow-sm animate-pop-in';
  const keyword = getCardKeyword(card);
  const imgFile = getCardImg(card);
  const imgSrc = imgFile ? `assets/images/adult/${imgFile}` : `https://placehold.co/100x130?text=${keyword}`;
  thumb.innerHTML = `<img src="${imgSrc}" class="w-full h-full object-cover" onerror="this.src='https://placehold.co/100x130?text=${keyword}'"><div class="absolute inset-x-0 bottom-0 bg-black/40 p-1 text-white text-[8px] text-center font-bold truncate">${keyword}</div>`;
  listEl.prepend(thumb);
}

function updateProgress() {
  const pool = state.currentSortingStep === 'main' ? state.cards : state.heldCards;
  const total = pool.length;
  const currentNum = Math.min(state.currentIndex + 1, total);
  if (el.progressBar) el.progressBar.style.width = `${(state.currentIndex / Math.max(total, 1)) * 100}%`;
  if (el.progressTextDisplay) el.progressTextDisplay.textContent = `${currentNum} / ${total}`;
  if (el.countLike) el.countLike.textContent = state.likedCards.length;
  if (el.countHold) el.countHold.textContent = state.heldCards.length;
  if (el.countNope) el.countNope.textContent = state.rejectedCards.length;
}

function finishSorting() { transition(el.sortingSection, el.select9Section, 'flex'); renderSelect9Grid(); }

function renderSelect9Grid() {
  el.s9Grid.innerHTML = '';
  state.likedCards.forEach(card => {
    const isSelected = state.top9Cards.includes(card);
    const d = document.createElement('div');
    // 선택 여부에 따른 스타일 바인딩 강화
    d.className = `selection-card relative rounded-xl overflow-hidden aspect-[3/4] shadow-sm border-4 cursor-pointer transition-all duration-300 ${isSelected ? 'border-blue-500 scale-95 shadow-blue-200' : 'border-slate-100 hover:border-slate-300 bg-white'}`;
    const keyword = getCardKeyword(card);
    const imgFile = getCardImg(card);
    const imgSrc = imgFile ? `assets/images/adult/${imgFile}` : `https://placehold.co/200x260?text=${keyword}`;
    d.innerHTML = `
      <img src="${imgSrc}" class="w-full h-full object-cover">
      <div class="absolute inset-x-0 bottom-0 bg-black/60 p-2 text-white text-[10px] text-center font-bold">${keyword}</div>
      ${isSelected ? '<div class="absolute top-2 right-2 bg-blue-500 text-white rounded-full p-1 shadow-lg"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="4"><path d="M5 13l4 4L19 7"/></svg></div>' : ''}
    `;
    d.onclick = () => {
      if (state.top9Cards.includes(card)) state.top9Cards = state.top9Cards.filter(c => c !== card);
      else if (state.top9Cards.length < 9) state.top9Cards.push(card);
      renderSelect9Grid(); // 상태 변화 시 전체 그리드 리렌더링 (UI 동기화)
      el.s9Count.textContent = state.top9Cards.length;
      el.btnS9Next.disabled = state.top9Cards.length !== 9;
      el.btnS9Next.classList.toggle('bg-blue-600', state.top9Cards.length === 9);
      el.btnS9Next.classList.toggle('text-white', state.top9Cards.length === 9);
    };
    el.s9Grid.appendChild(d);
  });
}

function startRanking() { transition(el.select9Section, el.rank3Section, 'flex'); renderRank3Grid(); }

function renderRank3Grid() {
  el.r3Grid.innerHTML = '';
  state.top9Cards.forEach(card => {
    const d = document.createElement('div');
    d.className = 'selection-card relative rounded-xl overflow-hidden aspect-[3/4] shadow-sm border border-slate-200 cursor-pointer bg-white';
    const keyword = getCardKeyword(card);
    const imgSrc = getCardImg(card) ? `assets/images/adult/${getCardImg(card)}` : `https://placehold.co/200x260?text=${keyword}`;
    d.innerHTML = `<img src="${imgSrc}" class="w-full h-full object-cover"><div class="absolute inset-x-0 bottom-0 bg-black/60 p-2 text-white text-[10px] text-center font-bold">${keyword}</div><div class="badge-container absolute top-2 right-2"></div>`;
    d.onclick = () => {
      const idx = state.rankedCards.indexOf(card);
      if (idx !== -1) state.rankedCards.splice(idx, 1);
      else if (state.rankedCards.length < 3) state.rankedCards.push(card);
      document.querySelectorAll('#r3-grid .selection-card').forEach((elCard, i) => {
        const rIdx = state.rankedCards.indexOf(state.top9Cards[i]);
        elCard.querySelector('.badge-container').innerHTML = rIdx !== -1 ? `<div class="rank-badge">${rIdx + 1}</div>` : '';
      });
      el.r3Count.textContent = state.rankedCards.length;
      el.btnR3Next.disabled = state.rankedCards.length !== 3;
      el.btnR3Next.classList.toggle('bg-blue-600', state.rankedCards.length === 3);
      el.btnR3Next.classList.toggle('text-white', state.rankedCards.length === 3);
    };
    el.r3Grid.appendChild(d);
  });
}

async function startAnalysis() {
  // transition 호출 시 대상 el.adsOverlay가 null이 아니어야 함 (HTML ID 수정 완료)
  transition(el.rank3Section, el.adsOverlay, 'flex');
  const messages = ["1단계: 키워드 분류 중...", "2단계: 좌표 연산 중...", "3단계: 리포트 작성 중..."];
  let msgIdx = 0;
  const msgInterval = setInterval(() => {
    if (msgIdx < messages.length - 1) {
      msgIdx++;
      if (el.anaStatusText) el.anaStatusText.textContent = messages[msgIdx];
    }
  }, 2000);

  try {
    const scores = { D: 0, I: 0, P: 0, T: 0 };
    state.likedCards.forEach(c => { const type = getCardType(c); if(scores[type]!==undefined) scores[type]++; });
    state.rankedCards.forEach((c, i) => { const type = getCardType(c); if(scores[type]!==undefined) scores[type] += (3 - i); });

    const top3 = state.rankedCards.map(c => getCardKeyword(c)).join(', ');
    const prompt = `프레디저 분석 리포트 작성. 상위카드: ${top3}.`;

    if (aiInstance) {
      const response = await aiInstance.models.generateContent({ model: 'gemini-3-flash-preview', contents: prompt });
      state.aiAnalysisResult = response.text;
    }
    
    clearInterval(msgInterval);
    if (el.anaStatusText) el.anaStatusText.textContent = "분석 완료!";
    if (el.btnSkipAd) el.btnSkipAd.classList.remove('hidden');
  } catch (err) {
    clearInterval(msgInterval);
    if (el.btnSkipAd) el.btnSkipAd.classList.remove('hidden');
  }
}

async function showResult() {
  transition(el.adsOverlay, el.resultSection, 'block');
  const aiReportEl = document.getElementById('ai-result');
  const aiLoaderEl = document.getElementById('ai-loader');
  if (aiReportEl && aiLoaderEl) {
    aiLoaderEl.classList.add('hidden');
    aiReportEl.classList.remove('hidden');
    aiReportEl.innerHTML = parseMarkdown(state.aiAnalysisResult || "분석 결과를 생성 중이거나 오류가 발생했습니다.");
  }
}

function parseMarkdown(text) { return text ? text.replace(/\*\*(.*?)\*\*/g, '<b>$1</b>').replace(/\n/g, '<br>') : ""; }
function transition(from, to, display = 'block') { if(!from || !to) { console.error("Transition failed: element missing", {from, to}); return; } from.classList.add('hidden'); from.style.display = 'none'; to.classList.remove('hidden'); to.style.display = display; window.scrollTo({ top: 0, behavior: 'smooth' }); }

function init() {
  populateElements();
  if (el.introForm) {
    el.introForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const btn = document.getElementById('btn-start');
      btn.disabled = true; btn.innerHTML = '<div class="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>';
      try { await loadData(); transition(el.introSection, el.sortingSection, 'flex'); renderStack(); } 
      catch (err) { alert('로딩 오류'); btn.disabled = false; btn.textContent = '진단 시작하기'; }
    });
  }
  const reg = (id, fn) => { const x = document.getElementById(id); if (x) x.onclick = fn; };
  reg('btn-exit', () => location.reload());
  reg('btn-restart', () => location.reload());
  if (el.btnS9Next) el.btnS9Next.onclick = startRanking;
  if (el.btnR3Next) el.btnR3Next.onclick = startAnalysis;
  if (el.btnSkipAd) el.btnSkipAd.onclick = showResult;
}

document.addEventListener('DOMContentLoaded', init);
