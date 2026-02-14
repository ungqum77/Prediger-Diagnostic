
import { GoogleGenAI } from "@google/genai";

if (window.gsap && window.Draggable) {
  gsap.registerPlugin(Draggable);
}

const getApiKey = () => { try { return process.env.API_KEY; } catch (e) { return ""; } };
const API_KEY = getApiKey();
let aiInstance = null;

const initAI = () => {
  if (API_KEY) {
    aiInstance = new GoogleGenAI({ apiKey: API_KEY });
    console.log("✅ Google Gemini AI Connected.");
  } else {
    console.warn("❌ API_KEY not found. AI features will be disabled.");
  }
};
initAI();

// --- STATE ---
const state = {
  cards: [],
  contentsDB: {},
  likedCards: [],
  heldCards: [],
  rejectedCards: [],
  top9Cards: [],
  rankedCards: [],
  currentIndex: 0,
  currentSortingStep: 'main', // 'main' or 'held'
  aiAnalysisResult: null,
  isAnimating: false,
  user: { name: '' }
};

const el = {};
const populateElements = () => {
  const ids = [
    'intro-section', 'sorting-section', 'select9-section', 'rank3-section', 'ads-overlay', 
    'result-section', 'intro-form', 'card-stack', 's9-grid', 's9-count', 'btn-s9-next', 
    'r3-grid', 'r3-count', 'btn-r3-next', 'btn-skip-ad', 'result-title', 'result-summary', 
    'result-traits', 'result-jobs', 'result-majors', 'result-tag', 'result-gallery-grid', 
    'liked-list', 'held-list', 'progress-bar', 'progress-text-display', 
    'count-like', 'count-hold', 'ana-status-text'
  ];
  ids.forEach(id => { el[id.replace(/-([a-z])/g, g => g[1].toUpperCase())] = document.getElementById(id); });
};

// --- CORE UTILS ---
const getCardKeyword = (c) => c.keyword || c.name || "";
const getCardType = (c) => c.type || "";
const getCardImg = (c) => c.img || "";

const MOCK_CARDS = [
  { id: 1, type: "D", keyword: "기록하기", desc: "자료를 기록하고 정리하는 것을 좋아합니다.", img: "card_01.png" },
  { id: 2, type: "I", keyword: "아이디어", desc: "새로운 생각을 떠올리고 상상하는 것을 좋아합니다.", img: "card_02.png" },
  { id: 3, type: "P", keyword: "도와주기", desc: "친구들의 고민을 들어주고 돕는 것을 좋아합니다.", img: "card_03.png" },
  { id: 4, type: "T", keyword: "만들기", desc: "손으로 물건을 조립하거나 만드는 것을 좋아합니다.", img: "card_04.png" },
  { id: 5, type: "D", keyword: "분석하기", desc: "숫자나 정보를 꼼꼼하게 따져보는 것을 좋아합니다.", img: "card_05.png" }
];

async function loadData() {
  try {
    const cardsRes = await fetch(`assets/data/cards_kr.json`);
    const data = await cardsRes.json();
    state.cards = data.cards || data;
    if (!state.cards || state.cards.length === 0) throw new Error();
  } catch (e) { 
    state.cards = MOCK_CARDS;
  }
}

// --- UI LOGIC ---
function renderStack() {
  if (!el.cardStack) return;
  el.cardStack.innerHTML = '';
  
  const pool = state.currentSortingStep === 'main' ? state.cards : state.heldCards;
  // 현재 인덱스부터 최대 3장까지만 보여줌 (스택 효과)
  const current = pool.slice(state.currentIndex, state.currentIndex + 3).reverse();
  
  if (current.length === 0) {
    if (state.currentSortingStep === 'main' && state.heldCards.length > 0) {
      state.currentSortingStep = 'held';
      state.currentIndex = 0;
      renderStack();
    } else {
      finishSorting();
    }
    return;
  }

  current.forEach((card, i) => {
    const cardEl = document.createElement('div');
    cardEl.className = 'card-item';
    const depth = current.length - 1 - i;
    cardEl.style.zIndex = i;
    cardEl.style.transform = `scale(${1 - depth * 0.05}) translateY(${depth * 15}px)`;
    
    cardEl.innerHTML = `
      <div class="h-1/2 bg-slate-100 overflow-hidden relative">
        <img src="assets/images/adult/${getCardImg(card)}" class="w-full h-full object-cover" onerror="this.src='https://placehold.co/400x300?text=${getCardKeyword(card)}'">
      </div>
      <div class="p-6 text-center">
        <h3 class="text-xl font-bold mb-2">${getCardKeyword(card)}</h3>
        <p class="text-sm text-slate-500">${card.desc || ""}</p>
      </div>
    `;
    el.cardStack.appendChild(cardEl);
    // 가장 위에 있는 카드에만 드래그 기능 부여
    if (depth === 0) setupDraggable(cardEl, card);
  });
  updateProgress();
}

function setupDraggable(cardEl, cardData) {
  Draggable.create(cardEl, {
    type: "x,y",
    onDragStart: () => { state.isAnimating = true; },
    onDragEnd: function() {
      if (this.x > 100) handleSwipe('right', cardEl, cardData);
      else if (this.x < -100) handleSwipe('left', cardEl, cardData);
      else if (this.y < -100 && state.currentSortingStep === 'main') handleSwipe('up', cardEl, cardData);
      else {
        gsap.to(this.target, { x: 0, y: 0, rotation: 0, duration: 0.5 });
        state.isAnimating = false;
      }
    }
  });
}

function handleSwipe(dir, cardEl, cardData) {
  state.isAnimating = true;
  
  if (dir === 'right') {
    state.likedCards.push(cardData);
    updateThumbnailList('liked', cardData);
  } else if (dir === 'up') {
    state.heldCards.push(cardData);
    updateThumbnailList('held', cardData);
  }

  gsap.to(cardEl, { 
    x: dir === 'right' ? 600 : dir === 'left' ? -600 : 0, 
    y: dir === 'up' ? -600 : 0, 
    opacity: 0, 
    duration: 0.4, 
    onComplete: () => {
      state.currentIndex++;
      state.isAnimating = false;
      renderStack();
    }
  });
}

function updateThumbnailList(type, card) {
  const list = type === 'liked' ? el.likedList : el.heldList;
  if (!list) return;
  const item = document.createElement('div');
  item.className = 'w-full aspect-[3/4] rounded-lg bg-slate-50 border border-slate-200 overflow-hidden mb-2';
  item.innerHTML = `<img src="assets/images/adult/${getCardImg(card)}" class="w-full h-full object-cover" onerror="this.src='https://placehold.co/100x130?text=${getCardKeyword(card)}'">`;
  list.prepend(item);
}

function updateProgress() {
  const pool = state.currentSortingStep === 'main' ? state.cards : state.heldCards;
  const total = pool.length;
  const currentNum = Math.min(state.currentIndex + 1, total);
  
  if (el.progressTextDisplay) el.progressTextDisplay.textContent = `${currentNum} / ${total}`;
  if (el.progressBar) el.progressBar.style.width = `${(state.currentIndex / Math.max(total, 1)) * 100}%`;
  
  if (el.countLike) el.countLike.textContent = state.likedCards.length;
  if (el.countHold) el.countHold.textContent = state.heldCards.length;
  
  // 페이즈 표시 업데이트
  const badges = document.querySelectorAll('.phase-badge');
  badges.forEach(b => {
    const p = b.getAttribute('data-phase');
    b.classList.toggle('active', (state.currentSortingStep === 'main' && p === '1') || (state.currentSortingStep === 'held' && p === '2'));
  });
}

function finishSorting() { transition(el.sortingSection, el.select9Section, 'flex'); renderSelect9Grid(); }

function renderSelect9Grid() {
  el.s9Grid.innerHTML = '';
  state.likedCards.forEach(card => {
    const isSelected = state.top9Cards.includes(card);
    const d = document.createElement('div');
    d.className = `selection-card relative rounded-xl overflow-hidden aspect-[3/4] border-4 cursor-pointer transition-all ${isSelected ? 'border-blue-500 scale-95' : 'border-slate-100 bg-white shadow-sm'}`;
    d.innerHTML = `<img src="assets/images/adult/${getCardImg(card)}" class="w-full h-full object-cover" onerror="this.src='https://placehold.co/100x130?text=${getCardKeyword(card)}'"><div class="absolute inset-x-0 bottom-0 bg-black/60 p-2 text-white text-[10px] text-center font-bold">${getCardKeyword(card)}</div>`;
    d.onclick = () => {
      if (state.top9Cards.includes(card)) state.top9Cards = state.top9Cards.filter(c => c !== card);
      else if (state.top9Cards.length < 9) state.top9Cards.push(card);
      renderSelect9Grid();
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
    d.className = 'selection-card relative rounded-xl overflow-hidden aspect-[3/4] border border-slate-200 cursor-pointer bg-white shadow-sm';
    d.innerHTML = `<img src="assets/images/adult/${getCardImg(card)}" class="w-full h-full object-cover" onerror="this.src='https://placehold.co/200x260?text=${getCardKeyword(card)}'"><div class="absolute inset-x-0 bottom-0 bg-black/60 p-2 text-white text-[10px] text-center font-bold">${getCardKeyword(card)}</div><div class="badge-container absolute top-2 right-2"></div>`;
    d.onclick = () => {
      const idx = state.rankedCards.indexOf(card);
      if (idx !== -1) state.rankedCards.splice(idx, 1);
      else if (state.rankedCards.length < 3) state.rankedCards.push(card);
      document.querySelectorAll('#r3-grid .selection-card').forEach((elCard, i) => {
        const rIdx = state.rankedCards.indexOf(state.top9Cards[i]);
        elCard.querySelector('.badge-container').innerHTML = rIdx !== -1 ? `<div class="w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center font-bold shadow-lg">${rIdx + 1}</div>` : '';
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
  transition(el.rank3Section, el.adsOverlay, 'flex');
  console.log("🚀 AI 분석 시작...");
  
  const top3 = state.rankedCards.map(c => getCardKeyword(c)).join(', ');
  const top9 = state.top9Cards.map(c => getCardKeyword(c)).join(', ');

  const prompt = `프레디저 적성검사 분석 리포트 요청:
- 핵심 카드: ${top3}
- 보조 카드: ${top9}

위 내용을 바탕으로 다음 정보를 생성하세요:
[유형명]: 성향을 나타내는 짧은 이름
[한줄평]: 전체 요약
[특성]: 강점 및 스타일
[추천직업]: 5가지
[추천학과]: 5가지`;

  try {
    if (aiInstance) {
      const response = await aiInstance.models.generateContent({ model: 'gemini-3-flash-preview', contents: prompt });
      state.aiAnalysisResult = response.text;
    } else {
      state.aiAnalysisResult = "[유형명]: 탐험가 \n[한줄평]: 새로운 길을 찾는 사람 \n[특성]: 호기심이 많음 \n[추천직업]: 기획자, 개발자 \n[추천학과]: 경영학, 공학";
    }
    
    if (el.anaStatusText) el.anaStatusText.textContent = "분석 완료!";
    if (el.btnSkipAd) el.btnSkipAd.classList.remove('hidden');
    const debugRaw = document.getElementById('debug-raw');
    if (debugRaw) debugRaw.textContent = state.aiAnalysisResult;
  } catch (err) {
    if (el.btnSkipAd) el.btnSkipAd.classList.remove('hidden');
  }
}

function showResult() {
  transition(el.adsOverlay, el.resultSection, 'block');
  const raw = state.aiAnalysisResult || "";
  
  const getSection = (marker) => {
    const regex = new RegExp(`\\[${marker}\\]:?\\s*([^\\n\\[]+)`, 'i');
    const match = raw.match(regex);
    return match ? match[1].trim() : "...";
  };

  if (el.resultTitle) el.resultTitle.innerHTML = `<span class="text-blue-600">${getSection("유형명")}</span> 타입입니다.`;
  if (el.resultSummary) el.resultSummary.textContent = getSection("한줄평");
  if (el.resultTraits) el.resultTraits.textContent = getSection("특성");
  
  const jobs = getSection("추천직업").split(',').map(s => s.trim());
  const majors = getSection("추천학과").split(',').map(s => s.trim());

  if (el.resultJobs) el.resultJobs.innerHTML = jobs.map(j => `<span class="px-3 py-1 bg-blue-50 text-blue-600 rounded-lg text-sm font-bold shadow-sm">${j}</span>`).join('');
  if (el.resultMajors) el.resultMajors.innerHTML = majors.map(m => `<span class="px-3 py-1 bg-indigo-50 text-indigo-600 rounded-lg text-sm font-bold shadow-sm">${m}</span>`).join('');

  if (el.resultGalleryGrid) {
    el.resultGalleryGrid.innerHTML = state.top9Cards.map(c => `
      <div class="rounded-xl overflow-hidden bg-white shadow-sm border border-slate-100">
        <img src="assets/images/adult/${getCardImg(c)}" class="w-full aspect-square object-cover" onerror="this.src='https://placehold.co/100x100?text=${getCardKeyword(c)}'">
        <div class="p-1 text-[8px] font-bold text-center truncate">${getCardKeyword(c)}</div>
      </div>
    `).join('');
  }

  const aiReportEl = document.getElementById('ai-result');
  const aiLoaderEl = document.getElementById('ai-loader');
  if (aiReportEl && aiLoaderEl) {
    aiLoaderEl.classList.add('hidden');
    aiReportEl.classList.remove('hidden');
    aiReportEl.innerHTML = raw.replace(/\n/g, '<br>').replace(/\*\*(.*?)\*\*/g, '<b>$1</b>');
  }
}

function transition(from, to, display = 'block') { 
  if(!from || !to) return; 
  from.classList.add('hidden'); from.style.display = 'none'; 
  to.classList.remove('hidden'); to.style.display = display; 
  window.scrollTo({ top: 0, behavior: 'smooth' }); 
}

function swipeManual(dir) {
  if (state.isAnimating) return;
  const top = el.cardStack.querySelector('.card-item:last-child');
  const pool = state.currentSortingStep === 'main' ? state.cards : state.heldCards;
  const cardData = pool[state.currentIndex];
  if (top && cardData) handleSwipe(dir, top, cardData);
}

function init() {
  populateElements();
  if (el.introForm) {
    el.introForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      try { await loadData(); transition(el.introSection, el.sortingSection, 'flex'); renderStack(); } 
      catch (err) { console.error(err); }
    });
  }
  
  const reg = (id, fn) => { const x = document.getElementById(id); if (x) x.onclick = fn; };
  reg('btn-swipe-left', () => swipeManual('left'));
  reg('btn-swipe-right', () => swipeManual('right'));
  reg('btn-swipe-up', () => swipeManual('up'));
  reg('btn-restart', () => location.reload());
  reg('btn-exit', () => location.reload());
  
  if (el.btnS9Next) el.btnS9Next.onclick = startRanking;
  if (el.btnR3Next) el.btnR3Next.onclick = startAnalysis;
  if (el.btnSkipAd) el.btnSkipAd.onclick = showResult;
}

document.addEventListener('DOMContentLoaded', init);
