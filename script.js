
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
    console.log("✅ AI Service Ready.");
  }
};
initAI();

// --- 정교화된 기본 카드 데이터 ---
const MOCK_CARDS = [
  { id: 1, type: "D", keyword: "기록하기", desc: "자료를 기록하고 체계적으로 정리하는 것을 좋아합니다.", img: "card_01.png" },
  { id: 2, type: "I", keyword: "아이디어", desc: "새로운 생각을 떠올리고 창의적으로 상상하는 것을 좋아합니다.", img: "card_02.png" },
  { id: 3, type: "P", keyword: "도와주기", desc: "어려운 사람을 돕고 고민을 들어주는 일에 보람을 느낍니다.", img: "card_03.png" },
  { id: 4, type: "T", keyword: "제작하기", desc: "손으로 물건을 조립하거나 도구를 다루는 것을 즐깁니다.", img: "card_04.png" },
  { id: 5, type: "D", keyword: "분석하기", desc: "복잡한 데이터를 논리적으로 분석하는 것을 좋아합니다.", img: "card_05.png" },
  { id: 6, type: "T", keyword: "기계조작", desc: "정밀한 기계나 장비를 직접 운전하거나 조작합니다.", img: "card_06.png" },
  { id: 7, type: "I", keyword: "연구조사", desc: "새로운 지식을 탐구하고 실험하는 과정을 즐깁니다.", img: "card_07.png" },
  { id: 8, type: "P", keyword: "교육하기", desc: "자신이 아는 것을 남에게 가르치고 전달하는 것을 좋아합니다.", img: "card_08.png" },
  { id: 9, type: "D", keyword: "수치계산", desc: "정확한 계산과 통계를 다루는 일에 흥미가 있습니다.", img: "card_09.png" },
  { id: 10, type: "T", keyword: "정밀작업", desc: "도구를 사용하여 아주 세밀하고 정확한 물건을 만듭니다.", img: "card_10.png" },
  { id: 11, type: "I", keyword: "관찰분석", desc: "현상을 자세히 관찰하여 원리를 찾아내는 것을 좋아합니다.", img: "card_11.png" },
  { id: 12, type: "P", keyword: "카운슬링", desc: "사람의 마음을 위로하고 대화로 문제를 해결합니다.", img: "card_12.png" }
];

// --- APP STATE ---
const state = {
  cards: [],
  likedCards: [],
  heldCards: [],
  top9Cards: [],
  rankedCards: [],
  currentIndex: 0,
  currentSortingStep: 'main', // 'main' | 'held'
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
    const res = await fetch(`assets/data/cards_kr.json`);
    if (!res.ok) throw new Error();
    const data = await res.json();
    state.cards = data.cards || data;
  } catch (e) {
    console.log("Using Mock Data");
    state.cards = [...MOCK_CARDS];
  }
}

function getSafeImg(card) {
  const keyword = card.keyword || "Career";
  // 실제 서버에 파일이 없을 경우를 대비해 picsum placeholder를 기본으로 설정하되, 로컬 경로도 시도함
  return `assets/images/adult/${card.img}`;
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
    
    const keyword = card.keyword || "미정";
    const desc = card.desc || "상세 설명이 준비되지 않았습니다.";
    const imgSrc = getSafeImg(card);
    
    cardEl.innerHTML = `
      <div class="h-1/2 bg-slate-100 overflow-hidden relative">
        <img src="${imgSrc}" class="w-full h-full object-cover" 
          onerror="this.src='https://placehold.co/400x300/2563EB/FFFFFF?text=${encodeURIComponent(keyword)}'">
      </div>
      <div class="p-6 text-center">
        <h3 class="text-xl font-bold mb-2 text-slate-800">${keyword}</h3>
        <p class="text-sm text-slate-500 leading-relaxed">${desc}</p>
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
      const threshold = 120;
      if (this.x > threshold) handleSwipe('right', cardEl, cardData);
      else if (this.x < -threshold) handleSwipe('left', cardEl, cardData);
      else if (this.y < -threshold && state.currentSortingStep === 'main') handleSwipe('up', cardEl, cardData);
      else {
        gsap.to(this.target, { x: 0, y: 0, rotation: 0, duration: 0.5, ease: "back.out(1.7)" });
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
    rotation: dir === 'right' ? 35 : dir === 'left' ? -35 : 0,
    duration: 0.5, 
    ease: "power2.in",
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
  item.className = 'w-full aspect-[3/4] rounded-xl bg-white border border-slate-200 overflow-hidden mb-3 shadow-sm transition-all hover:scale-105';
  const keyword = card.keyword || "Card";
  item.innerHTML = `
    <img src="${getSafeImg(card)}" class="w-full h-full object-cover" 
      onerror="this.src='https://placehold.co/150x200/F1F5F9/64748B?text=${encodeURIComponent(keyword)}'">
  `;
  list.prepend(item);
}

function updateProgress() {
  const pool = state.currentSortingStep === 'main' ? state.cards : state.heldCards;
  const total = pool.length;
  // 현재 카운트는 1부터 시작하게 표시
  const displayNum = Math.min(state.currentIndex + 1, total);
  
  if (el.progressTextDisplay) el.progressTextDisplay.textContent = `${displayNum} / ${total}`;
  if (el.progressBar) {
    const pct = (state.currentIndex / Math.max(total, 1)) * 100;
    el.progressBar.style.width = `${pct}%`;
  }
  
  if (el.countLike) el.countLike.textContent = state.likedCards.length;
  if (el.countHold) el.countHold.textContent = state.heldCards.length;
  
  // Phase Badge Active State
  const badges = document.querySelectorAll('.phase-badge');
  badges.forEach(b => {
    const p = b.getAttribute('data-phase');
    const active = (state.currentSortingStep === 'main' && p === '1') || (state.currentSortingStep === 'held' && p === '2');
    b.classList.toggle('active', active);
  });
}

function finishSorting() { transition(el.sortingSection, el.select9Section, 'flex'); renderSelect9Grid(); }

function renderSelect9Grid() {
  if (!el.s9Grid) return;
  el.s9Grid.innerHTML = '';
  state.likedCards.forEach(card => {
    const isSelected = state.top9Cards.includes(card);
    const d = document.createElement('div');
    d.className = `selection-card relative rounded-2xl overflow-hidden aspect-[3/4] border-4 cursor-pointer transition-all ${isSelected ? 'border-blue-500 scale-95 shadow-xl' : 'border-slate-100 bg-white shadow-md'}`;
    const keyword = card.keyword || "Card";
    d.innerHTML = `
      <img src="${getSafeImg(card)}" class="w-full h-full object-cover" 
        onerror="this.src='https://placehold.co/200x260/2563EB/FFFFFF?text=${encodeURIComponent(keyword)}'">
      <div class="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent p-3 text-white text-xs text-center font-black">${keyword}</div>
    `;
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

function transition(from, to, display = 'block') { 
  if(!from || !to) return; 
  gsap.to(from, { opacity: 0, duration: 0.3, onComplete: () => {
    from.classList.add('hidden'); from.style.display = 'none'; 
    to.classList.remove('hidden'); to.style.display = display; 
    gsap.fromTo(to, { opacity: 0, y: 20 }, { opacity: 1, y: 0, duration: 0.5 });
    window.scrollTo({ top: 0, behavior: 'smooth' }); 
  }});
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
      if (btn) btn.disabled = true;
      try { 
        await loadData(); 
        transition(el.introSection, el.sortingSection, 'flex'); 
        renderStack(); 
      } catch (err) { 
        console.error(err);
        if (btn) btn.disabled = false;
      }
    });
  }
  
  const reg = (id, fn) => { const x = document.getElementById(id); if (x) x.onclick = fn; };
  reg('btn-swipe-left', () => swipeManual('left'));
  reg('btn-swipe-right', () => swipeManual('right'));
  reg('btn-swipe-up', () => swipeManual('up'));
  reg('btn-restart', () => location.reload());
  reg('btn-exit', () => location.reload());
  
  if (el.btnS9Next) el.btnS9Next.onclick = () => {
    transition(el.select9Section, el.rank3Section, 'flex');
    // renderRank3Grid logic remains similar to script.js provided logic
  };
}

document.addEventListener('DOMContentLoaded', init);
