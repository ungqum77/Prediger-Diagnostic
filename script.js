
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
  }
};
initAI();

// --- RIASEC 유형별 테마 컬러 ---
const TYPE_THEMES = {
  D: { color: "1E88E5", label: "Data" },
  T: { color: "E53935", label: "Things" },
  P: { color: "FDD835", label: "People" },
  I: { color: "43A047", label: "Ideas" }
};

// --- 정교화된 52장 전체 카드 데이터 (constants.ts 기준) ---
const MOCK_CARDS = [
  { id: 1, type: "D", keyword: "기록하기", desc: "자료를 기록하고 정리하는 것을 좋아합니다.", img: "card_01_D_records.png" },
  { id: 2, type: "I", keyword: "아이디어", desc: "새로운 생각을 떠올리고 상상하는 것을 좋아합니다.", img: "card_02_I_ideas.png" },
  { id: 3, type: "P", keyword: "도와주기", desc: "친구들의 고민을 들어주고 돕는 것을 좋아합니다.", img: "card_03_P_help.png" },
  { id: 4, type: "T", keyword: "만들기", desc: "손으로 물건을 조립하거나 만드는 것을 좋아합니다.", img: "card_04_T_make.png" },
  { id: 5, type: "D", keyword: "분석하기", desc: "숫자나 정보를 꼼꼼하게 따져보는 것을 좋아합니다.", img: "card_05_D_analyze.png" },
  { id: 6, type: "T", keyword: "기계 다루기", desc: "도구나 기계를 사용하여 작업하는 것을 좋아합니다.", img: "card_06_T_machine.png" },
  { id: 7, type: "I", keyword: "연구하기", desc: "궁금한 것을 깊이 파고들어 연구하는 것을 좋아합니다.", img: "card_07_I_research.png" },
  { id: 8, type: "P", keyword: "가르치기", desc: "다른 사람에게 지식을 알려주는 것을 좋아합니다.", img: "card_08_P_teach.png" },
  { id: 9, type: "D", keyword: "계산하기", desc: "돈이나 수치를 정확하게 계산하는 것을 좋아합니다.", img: "card_09_D_calc.png" },
  { id: 10, type: "T", keyword: "운전/조종", desc: "자동차나 드론 등을 조종하는 것을 좋아합니다.", img: "card_10_T_drive.png" },
  { id: 11, type: "I", keyword: "관찰하기", desc: "사물이나 자연을 자세히 관찰하는 것을 좋아합니다.", img: "card_11_I_observe.png" },
  { id: 12, type: "P", keyword: "상담하기", desc: "사람들의 마음을 위로하고 대화하는 것을 좋아합니다.", img: "card_12_P_counsel.png" }
  // ... 필요한 경우 52장까지 추가 가능
];

const state = {
  cards: [],
  likedCards: [],
  heldCards: [],
  top9Cards: [],
  rankedCards: [],
  currentIndex: 0,
  currentSortingStep: 'main',
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
  ids.forEach(id => { el[id.replace(/-([a-z])/g, g => g[1].toUpperCase())] = document.getElementById(id); });
};

async function loadData() {
  try {
    const res = await fetch(`assets/data/cards_kr.json`);
    if (!res.ok) throw new Error();
    const data = await res.json();
    state.cards = data.cards || data;
  } catch (e) {
    state.cards = [...MOCK_CARDS];
  }
}

// 유형별로 예쁜 대체 이미지를 반환하는 함수
function getFallbackImg(card) {
  const theme = TYPE_THEMES[card.type] || { color: "CBD5E1", label: "Card" };
  const text = encodeURIComponent(card.keyword || theme.label);
  return `https://placehold.co/400x300/${theme.color}/FFFFFF?text=${text}`;
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
    
    const keyword = card.keyword || card.name || "전문 분야";
    const desc = card.desc || "상세 설명이 곧 업데이트될 예정입니다.";
    const imgSrc = `assets/images/adult/${card.img}`;
    
    cardEl.innerHTML = `
      <div class="h-1/2 overflow-hidden relative" style="background-color: #${TYPE_THEMES[card.type]?.color || 'F1F5F9'}22">
        <img src="${imgSrc}" class="w-full h-full object-cover" 
          onerror="this.onerror=null; this.src='${getFallbackImg(card)}';">
        <div class="absolute top-4 right-4 px-2 py-1 bg-white/90 backdrop-blur rounded text-[10px] font-black shadow-sm">
          ${card.type} TYPE
        </div>
      </div>
      <div class="p-6 text-center flex flex-col justify-center flex-1">
        <h3 class="text-xl font-black mb-2 text-slate-800">${keyword}</h3>
        <p class="text-xs text-slate-500 leading-relaxed font-medium">${desc}</p>
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
        gsap.to(this.target, { x: 0, y: 0, rotation: 0, duration: 0.5, ease: "back.out" });
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
  item.className = 'w-full aspect-[3/4] rounded-xl bg-white border border-slate-100 overflow-hidden mb-3 shadow-sm transition-all hover:scale-105';
  item.innerHTML = `
    <img src="assets/images/adult/${card.img}" class="w-full h-full object-cover" 
      onerror="this.onerror=null; this.src='${getFallbackImg(card)}';">
  `;
  list.prepend(item);
}

function updateProgress() {
  const pool = state.currentSortingStep === 'main' ? state.cards : state.heldCards;
  const total = pool.length;
  const displayNum = Math.min(state.currentIndex + 1, total);
  
  if (el.progressTextDisplay) el.progressTextDisplay.textContent = `${displayNum} / ${total}`;
  if (el.progressBar) el.progressBar.style.width = `${(state.currentIndex / Math.max(total, 1)) * 100}%`;
  
  if (el.countLike) el.countLike.textContent = state.likedCards.length;
  if (el.countHold) el.countHold.textContent = state.heldCards.length;
  
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
    d.className = `selection-card relative rounded-2xl overflow-hidden aspect-[3/4] border-4 cursor-pointer transition-all ${isSelected ? 'border-blue-500 scale-95 shadow-xl' : 'border-slate-50 bg-white shadow-md'}`;
    d.innerHTML = `
      <img src="assets/images/adult/${card.img}" class="w-full h-full object-cover" 
        onerror="this.onerror=null; this.src='${getFallbackImg(card)}';">
      <div class="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent p-2 text-white text-[10px] text-center font-black">${card.keyword}</div>
    `;
    d.onclick = () => {
      if (state.top9Cards.includes(card)) state.top9Cards = state.top9Cards.filter(c => c !== card);
      else if (state.top9Cards.length < 9) state.top9Cards.push(card);
      renderSelect9Grid();
      el.s9Count.textContent = state.top9Cards.length;
      const ready = state.top9Cards.length === 9;
      el.btnS9Next.disabled = !ready;
      el.btnS9Next.className = `w-[320px] py-4 font-black rounded-2xl transition-all shadow-lg ${ready ? 'bg-blue-600 text-white' : 'bg-slate-200 text-slate-400'}`;
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
      try { 
        await loadData(); 
        transition(el.introSection, el.sortingSection, 'flex'); 
        renderStack(); 
      } catch (err) { console.error(err); }
    });
  }
  
  const reg = (id, fn) => { const x = document.getElementById(id); if (x) x.onclick = fn; };
  reg('btn-swipe-left', () => swipeManual('left'));
  reg('btn-swipe-right', () => swipeManual('right'));
  reg('btn-swipe-up', () => swipeManual('up'));
  reg('btn-restart', () => location.reload());
  reg('btn-exit', () => location.reload());
  
  if (el.btnS9Next) el.btnS9Next.onclick = () => transition(el.select9Section, el.rank3Section, 'flex');
}

document.addEventListener('DOMContentLoaded', init);
