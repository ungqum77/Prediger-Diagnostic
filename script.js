
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
  }
};
initAI();

// --- MOCK DATA (데이터 파일 로드 실패 대비) ---
const MOCK_CARDS = [
  { id: 1, type: "D", keyword: "기록하기", desc: "자료를 기록하고 정리하는 것을 좋아합니다.", img: "card_01.png" },
  { id: 2, type: "I", keyword: "아이디어", desc: "새로운 생각을 떠올리고 상상하는 것을 좋아합니다.", img: "card_02.png" },
  { id: 3, type: "P", keyword: "도와주기", desc: "친구들의 고민을 들어주고 돕는 것을 좋아합니다.", img: "card_03.png" },
  { id: 4, type: "T", keyword: "만들기", desc: "손으로 물건을 조립하거나 만드는 것을 좋아합니다.", img: "card_04.png" },
  { id: 5, type: "D", keyword: "분석하기", desc: "숫자나 정보를 꼼꼼하게 따져보는 것을 좋아합니다.", img: "card_05.png" },
  { id: 6, type: "T", keyword: "기계 다루기", desc: "도구나 기계를 사용하여 작업하는 것을 좋아합니다.", img: "card_06.png" },
  { id: 7, type: "I", keyword: "연구하기", desc: "궁금한 것을 깊이 파고들어 연구하는 것을 좋아합니다.", img: "card_07.png" },
  { id: 8, type: "P", keyword: "가르치기", desc: "다른 사람에게 지식을 알려주는 것을 좋아합니다.", img: "card_08.png" },
  { id: 9, type: "D", keyword: "계산하기", desc: "돈이나 수치를 정확하게 계산하는 것을 좋아합니다.", img: "card_09.png" },
  { id: 10, type: "T", keyword: "조종하기", desc: "자동차나 기기를 세밀하게 조종하는 것을 좋아합니다.", img: "card_10.png" },
  { id: 11, type: "I", keyword: "관찰하기", desc: "사물이나 자연을 자세히 관찰하는 것을 좋아합니다.", img: "card_11.png" },
  { id: 12, type: "P", keyword: "대화하기", desc: "사람들과 즐겁게 이야기 나누는 것을 좋아합니다.", img: "card_12.png" }
];

// --- STATE ---
const state = {
  cards: [],
  likedCards: [],
  heldCards: [],
  rejectedCards: [],
  top9Cards: [],
  rankedCards: [],
  currentIndex: 0,
  currentSortingStep: 'main', // 'main' or 'held'
  aiAnalysisResult: null,
  isAnimating: false
};

const el = {};
const populateElements = () => {
  const ids = [
    'intro-section', 'sorting-section', 'select9-section', 'rank3-section', 'ads-overlay', 
    'result-section', 'intro-form', 'card-stack', 's9-grid', 's9-count', 'btn-s9-next', 
    'r3-grid', 'r3-count', 'btn-r3-next', 'btn-skip-ad', 'result-title', 'result-summary', 
    'result-traits', 'result-jobs', 'result-majors', 'result-gallery-grid', 
    'liked-list', 'held-list', 'progress-bar', 'progress-text-display', 
    'count-like', 'count-hold', 'ana-status-text'
  ];
  ids.forEach(id => { 
    const found = document.getElementById(id);
    if (found) el[id.replace(/-([a-z])/g, g => g[1].toUpperCase())] = found; 
  });
};

async function loadData() {
  try {
    const cardsRes = await fetch(`assets/data/cards_kr.json`);
    if (!cardsRes.ok) throw new Error("Fetch failed");
    const data = await cardsRes.json();
    state.cards = data.cards || data;
  } catch (e) { 
    console.warn("⚠️ JSON 데이터를 불러오지 못해 기본 데이터를 사용합니다.");
    state.cards = [...MOCK_CARDS];
  }
}

function renderStack() {
  if (!el.cardStack) return;
  el.cardStack.innerHTML = '';
  
  const pool = state.currentSortingStep === 'main' ? state.cards : state.heldCards;
  const currentBatch = pool.slice(state.currentIndex, state.currentIndex + 3).reverse();
  
  if (currentBatch.length === 0) {
    if (state.currentSortingStep === 'main' && state.heldCards.length > 0) {
      state.currentSortingStep = 'held';
      state.currentIndex = 0;
      renderStack();
    } else {
      finishSorting();
    }
    return;
  }

  currentBatch.forEach((card, i) => {
    const cardEl = document.createElement('div');
    cardEl.className = 'card-item';
    const depth = currentBatch.length - 1 - i;
    cardEl.style.zIndex = i;
    cardEl.style.transform = `scale(${1 - depth * 0.05}) translateY(${depth * 15}px)`;
    
    const keyword = card.keyword || card.name || "키워드 없음";
    const desc = card.desc || "설명이 없습니다.";
    const imgFile = card.img || "";
    
    cardEl.innerHTML = `
      <div class="h-1/2 bg-slate-100 overflow-hidden relative">
        <img src="assets/images/adult/${imgFile}" class="w-full h-full object-cover" 
          onerror="this.src='https://placehold.co/400x300?text=${encodeURIComponent(keyword)}'">
      </div>
      <div class="p-6 text-center">
        <h3 class="text-xl font-bold mb-2">${keyword}</h3>
        <p class="text-sm text-slate-500">${desc}</p>
      </div>
    `;
    el.cardStack.appendChild(cardEl);
    if (depth === 0) setupDraggable(cardEl, card);
  });
  updateProgress();
}

function setupDraggable(cardEl, cardData) {
  Draggable.create(cardEl, {
    type: "x,y",
    onDragStart: () => { state.isAnimating = true; },
    onDragEnd: function() {
      const threshold = 100;
      if (this.x > threshold) handleSwipe('right', cardEl, cardData);
      else if (this.x < -threshold) handleSwipe('left', cardEl, cardData);
      else if (this.y < -threshold && state.currentSortingStep === 'main') handleSwipe('up', cardEl, cardData);
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
    rotation: dir === 'right' ? 30 : dir === 'left' ? -30 : 0,
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
  item.className = 'w-full aspect-[3/4] rounded-lg bg-slate-50 border border-slate-200 overflow-hidden mb-2 shadow-sm animate-pop-in';
  item.innerHTML = `<img src="assets/images/adult/${card.img}" class="w-full h-full object-cover" onerror="this.src='https://placehold.co/100x130?text=${encodeURIComponent(card.keyword)}'">`;
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
    const isActive = (state.currentSortingStep === 'main' && p === '1') || (state.currentSortingStep === 'held' && p === '2');
    b.classList.toggle('active', isActive);
  });
}

function finishSorting() { transition(el.sortingSection, el.select9Section, 'flex'); renderSelect9Grid(); }

function renderSelect9Grid() {
  if (!el.s9Grid) return;
  el.s9Grid.innerHTML = '';
  state.likedCards.forEach(card => {
    const isSelected = state.top9Cards.includes(card);
    const d = document.createElement('div');
    d.className = `selection-card relative rounded-xl overflow-hidden aspect-[3/4] border-4 cursor-pointer transition-all ${isSelected ? 'border-blue-500 scale-95 shadow-lg' : 'border-slate-100 bg-white shadow-sm'}`;
    d.innerHTML = `<img src="assets/images/adult/${card.img}" class="w-full h-full object-cover" onerror="this.src='https://placehold.co/100x130?text=${encodeURIComponent(card.keyword)}'"><div class="absolute inset-x-0 bottom-0 bg-black/60 p-2 text-white text-[10px] text-center font-bold">${card.keyword}</div>`;
    d.onclick = () => {
      if (state.top9Cards.includes(card)) state.top9Cards = state.top9Cards.filter(c => c !== card);
      else if (state.top9Cards.length < 9) state.top9Cards.push(card);
      renderSelect9Grid();
      el.s9Count.textContent = state.top9Cards.length;
      const ready = state.top9Cards.length === 9;
      el.btnS9Next.disabled = !ready;
      el.btnS9Next.classList.toggle('bg-blue-600', ready);
      el.btnS9Next.classList.toggle('text-white', ready);
    };
    el.s9Grid.appendChild(d);
  });
}

function startRanking() { transition(el.select9Section, el.rank3Section, 'flex'); renderRank3Grid(); }

function renderRank3Grid() {
  if (!el.r3Grid) return;
  el.r3Grid.innerHTML = '';
  state.top9Cards.forEach(card => {
    const d = document.createElement('div');
    d.className = 'selection-card relative rounded-xl overflow-hidden aspect-[3/4] border border-slate-200 cursor-pointer bg-white shadow-sm';
    d.innerHTML = `<img src="assets/images/adult/${card.img}" class="w-full h-full object-cover" onerror="this.src='https://placehold.co/200x260?text=${encodeURIComponent(card.keyword)}'"><div class="absolute inset-x-0 bottom-0 bg-black/60 p-2 text-white text-[10px] text-center font-bold">${card.keyword}</div><div class="badge-container absolute top-2 right-2"></div>`;
    d.onclick = () => {
      const idx = state.rankedCards.indexOf(card);
      if (idx !== -1) state.rankedCards.splice(idx, 1);
      else if (state.rankedCards.length < 3) state.rankedCards.push(card);
      
      document.querySelectorAll('#r3-grid .selection-card').forEach((elCard, i) => {
        const targetCard = state.top9Cards[i];
        const rIdx = state.rankedCards.indexOf(targetCard);
        elCard.querySelector('.badge-container').innerHTML = rIdx !== -1 ? `<div class="w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center font-bold shadow-lg animate-pop-in">${rIdx + 1}</div>` : '';
      });
      
      el.r3Count.textContent = state.rankedCards.length;
      const ready = state.rankedCards.length === 3;
      el.btnR3Next.disabled = !ready;
      el.btnR3Next.classList.toggle('bg-blue-600', ready);
      el.btnR3Next.classList.toggle('text-white', ready);
    };
    el.r3Grid.appendChild(d);
  });
}

function transition(from, to, display = 'block') { 
  if(!from || !to) return; 
  from.classList.add('hidden'); from.style.display = 'none'; 
  to.classList.remove('hidden'); to.style.display = display; 
  window.scrollTo({ top: 0, behavior: 'smooth' }); 
}

function swipeManual(dir) {
  if (state.isAnimating) return;
  const pool = state.currentSortingStep === 'main' ? state.cards : state.heldCards;
  const cardData = pool[state.currentIndex];
  const topEl = el.cardStack.querySelector('.card-item:last-child');
  if (topEl && cardData) handleSwipe(dir, topEl, cardData);
}

function init() {
  populateElements();
  if (el.introForm) {
    el.introForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const btn = document.getElementById('btn-start');
      btn.disabled = true;
      try { 
        await loadData(); 
        transition(el.introSection, el.sortingSection, 'flex'); 
        renderStack(); 
      } catch (err) { 
        console.error(err);
        btn.disabled = false;
      }
    });
  }
  
  const reg = (id, fn) => { const x = document.getElementById(id); if (x) x.onclick = fn; };
  reg('btn-swipe-left', () => swipeManual('left'));
  reg('btn-swipe-right', () => swipeManual('right'));
  reg('btn-swipe-up', () => swipeManual('up'));
  reg('btn-restart', () => location.reload());
  reg('btn-exit', () => location.reload());
  
  if (el.btnS9Next) el.btnS9Next.onclick = startRanking;
  // startAnalysis와 showResult는 index.html의 UI와 연결됨 (기존 로직 유지)
}

document.addEventListener('DOMContentLoaded', init);
