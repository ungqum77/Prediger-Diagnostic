
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

// --- RIASEC 유형별 테마 컬러 (D, I, P, T) ---
const TYPE_THEMES = {
  D: { color: "1E88E5", label: "Data" },
  T: { color: "E53935", label: "Things" },
  P: { color: "FDD835", label: "People" },
  I: { color: "43A047", label: "Ideas" },
  DEFAULT: { color: "CBD5E1", label: "General" }
};

const state = {
  cards: [],
  likedCards: [],
  heldCards: [],
  top9Cards: [],
  rankedCards: [],
  currentIndex: 0,
  currentSortingStep: 'main',
  isAnimating: false,
  targetGroup: 'adult' // 'adult' | 'child'
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
    if (!res.ok) throw new Error("JSON 파일을 찾을 수 없습니다.");
    const data = await res.json();
    state.cards = data.cards || (Array.isArray(data) ? data : []);
    console.log("[Debug] JSON 데이터 로드 완료:", state.cards.length, "개의 카드");
  } catch (e) {
    console.error("데이터 로드 실패:", e);
    alert("카드 데이터를 불러오지 못했습니다. 경로를 확인해주세요.");
  }
}

/**
 * 동적 이미지 경로 생성 함수
 * JSON 구조 반영: card[state.targetGroup].img
 */
function getImgSrc(card) {
  const groupData = card[state.targetGroup];
  if (!groupData || !groupData.img) {
    console.warn(`[Debug] 해당 연령대(${state.targetGroup})의 이미지 정보가 없습니다.`, card);
    return "";
  }
  const fullPath = `assets/images/${state.targetGroup}/${groupData.img}`;
  console.log(`[Debug] 이미지 로딩 시도 - 폴더: ${state.targetGroup}, 경로: ${fullPath}`);
  return fullPath;
}

// 플레이스홀더 생성 함수 (이미지 로드 실패 시 보완책)
function getFallbackImg(card) {
  const type = card.dimension || 'DEFAULT';
  const theme = TYPE_THEMES[type] || TYPE_THEMES.DEFAULT;
  const keyword = card.keyword_kr || "Card";
  return `https://placehold.co/400x300/${theme.color}/FFFFFF?text=${encodeURIComponent(keyword)}`;
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
    
    // JSON 구조에 따른 데이터 맵핑 (keyword_kr, dimension, nested desc)
    const keyword = card.keyword_kr || "제목 없음";
    const groupData = card[state.targetGroup] || {};
    const desc = groupData.desc || "상세 설명이 존재하지 않습니다.";
    const type = card.dimension || "D";
    const themeColor = TYPE_THEMES[type]?.color || TYPE_THEMES.DEFAULT.color;
    
    cardEl.innerHTML = `
      <div class="h-1/2 overflow-hidden relative" style="background-color: #${themeColor}22">
        <img src="${getImgSrc(card)}" class="w-full h-full object-cover" 
          onerror="this.onerror=null; this.src='${getFallbackImg(card)}';">
        <div class="absolute top-4 right-4 px-2 py-1 bg-white/95 backdrop-blur rounded text-[10px] font-black shadow-sm text-slate-800 border border-slate-100">
          ${type} TYPE
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
    <img src="${getImgSrc(card)}" class="w-full h-full object-cover" 
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
      <img src="${getImgSrc(card)}" class="w-full h-full object-cover" 
        onerror="this.onerror=null; this.src='${getFallbackImg(card)}';">
      <div class="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent p-2 text-white text-[10px] text-center font-black">${card.keyword_kr || "제목"}</div>
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
      
      const birthDateVal = document.getElementById('birthdate').value;
      if (birthDateVal) {
        const birthYear = new Date(birthDateVal).getFullYear();
        const currentYear = new Date().getFullYear();
        const age = currentYear - birthYear;
        state.targetGroup = age < 13 ? 'child' : 'adult';
        console.log(`[Debug] 사용자 설정 - 나이: ${age}, 그룹: ${state.targetGroup}`);
      }

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
