
import { GoogleGenAI } from "@google/genai";

if (window.gsap && window.Draggable) {
  gsap.registerPlugin(Draggable);
}

// RIASEC 유형별 테마 컬러 및 라벨
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
  targetGroup: 'adult'
};

const el = {};
const populateElements = () => {
  const ids = [
    'intro-section', 'sorting-section', 'select9-section', 'rank3-section', 'ads-overlay', 
    'result-section', 'intro-form', 'card-stack', 's9-grid', 's9-count', 'btn-s9-next', 
    'r3-grid', 'r3-count', 'btn-r3-next', 'btn-skip-ad', 'result-title', 'result-summary', 
    'result-traits', 'result-jobs', 'result-majors', 'result-gallery-grid', 
    'liked-list', 'held-list', 'progress-bar', 'progress-text-display', 
    'count-like', 'count-hold', 'ana-status-text', 'ai-result', 'ai-loader', 'debug-raw'
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
  } catch (e) {
    console.error("데이터 로드 실패:", e);
  }
}

function getImgSrc(card) {
  const groupData = card[state.targetGroup];
  if (!groupData || !groupData.img) return "";
  return `assets/images/${state.targetGroup}/${groupData.img}`;
}

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
    
    const keyword = card.keyword_kr || "제목 없음";
    const groupData = card[state.targetGroup] || {};
    const desc = groupData.desc || "상세 설명이 없습니다.";
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
    onDragEnd: function() {
      const threshold = 100;
      if (this.x > threshold) handleSwipe('right', cardEl, cardData);
      else if (this.x < -threshold) handleSwipe('left', cardEl, cardData);
      else if (this.y < -threshold && state.currentSortingStep === 'main') handleSwipe('up', cardEl, cardData);
      else gsap.to(this.target, { x: 0, y: 0, rotation: 0, duration: 0.5, ease: "back.out(1.7)" });
    }
  });
}

function handleSwipe(dir, cardEl, cardData) {
  if (dir === 'right') { state.likedCards.push(cardData); updateThumbnailList('liked', cardData); }
  else if (dir === 'up') { state.heldCards.push(cardData); updateThumbnailList('held', cardData); }

  gsap.to(cardEl, { 
    x: dir === 'right' ? 600 : dir === 'left' ? -600 : 0, 
    y: dir === 'up' ? -600 : 0, 
    opacity: 0, 
    duration: 0.4, 
    onComplete: () => { state.currentIndex++; renderStack(); }
  });
}

function updateThumbnailList(type, card) {
  const list = type === 'liked' ? el.likedList : el.heldList;
  if (!list) return;
  const item = document.createElement('div');
  item.className = 'w-full aspect-[3/4] rounded-xl bg-white border border-slate-100 overflow-hidden mb-3 shadow-sm';
  item.innerHTML = `<img src="${getImgSrc(card)}" class="w-full h-full object-cover" onerror="this.onerror=null; this.src='${getFallbackImg(card)}';">`;
  list.prepend(item);
}

function updateProgress() {
  const pool = state.currentSortingStep === 'main' ? state.cards : state.heldCards;
  if (el.progressTextDisplay) el.progressTextDisplay.textContent = `${Math.min(state.currentIndex + 1, pool.length)} / ${pool.length}`;
  if (el.progressBar) el.progressBar.style.width = `${(state.currentIndex / Math.max(pool.length, 1)) * 100}%`;
  if (el.countLike) el.countLike.textContent = state.likedCards.length;
  if (el.countHold) el.countHold.textContent = state.heldCards.length;
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
      <img src="${getImgSrc(card)}" class="w-full h-full object-cover" onerror="this.onerror=null; this.src='${getFallbackImg(card)}';">
      <div class="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent p-2 text-white text-[10px] text-center font-black">${card.keyword_kr || "제목"}</div>
    `;
    d.onclick = () => {
      if (state.top9Cards.includes(card)) state.top9Cards = state.top9Cards.filter(c => c !== card);
      else if (state.top9Cards.length < 9) state.top9Cards.push(card);
      renderSelect9Grid();
      el.s9Count.textContent = state.top9Cards.length;
      el.btnS9Next.disabled = state.top9Cards.length !== 9;
    };
    el.s9Grid.appendChild(d);
  });
}

function renderRank3Grid() {
  if (!el.r3Grid) return;
  el.r3Grid.innerHTML = '';
  state.top9Cards.forEach(card => {
    const rankIndex = state.rankedCards.indexOf(card);
    const isRanked = rankIndex !== -1;
    const d = document.createElement('div');
    d.className = `selection-card relative rounded-2xl overflow-hidden aspect-[3/4] border-4 cursor-pointer transition-all ${isRanked ? 'border-indigo-500 scale-95 shadow-xl' : 'border-slate-50 bg-white shadow-md'}`;
    d.innerHTML = `
      <img src="${getImgSrc(card)}" class="w-full h-full object-cover" onerror="this.onerror=null; this.src='${getFallbackImg(card)}';">
      ${isRanked ? `<div class="rank-badge">${rankIndex + 1}</div>` : ''}
      <div class="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent p-2 text-white text-[10px] text-center font-black">${card.keyword_kr || "제목"}</div>
    `;
    d.onclick = () => {
      if (isRanked) state.rankedCards = state.rankedCards.filter(c => c !== card);
      else if (state.rankedCards.length < 3) state.rankedCards.push(card);
      renderRank3Grid();
      el.r3Count.textContent = state.rankedCards.length;
      el.btnR3Next.disabled = state.rankedCards.length !== 3;
    };
    el.r3Grid.appendChild(d);
  });
}

async function startAnalysis() {
  transition(el.rank3Section, el.adsOverlay, 'flex');
  el.anaStatusText.textContent = "AI가 심층 분석을 진행 중입니다...";
  el.btnSkipAd.classList.add('hidden');
  el.aiLoader.classList.remove('hidden');

  try {
    // 런타임 환경에서 주입된 API 키를 사용하여 호출 시점에 인스턴스 생성
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const prompt = `당신은 프레디저 직업 상담사입니다. 사용자가 선택한 최종 3가지 키워드는 [${state.rankedCards.map(c => c.keyword_kr).join(", ")}]입니다. 
    이 데이터를 바탕으로 사용자의 흥미 유형을 분석하고, 추천 직업 5가지와 추천 학과 3가지를 한국어로 친절하고 전문적인 어조로 리포트 형식으로 작성해 주세요. 
    HTML 태그(<b>, <br>, <ul>, <li>)를 사용하여 가독성 있게 응답해 주세요.`;

    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
      config: { 
        temperature: 0.8,
        systemInstruction: "사용자의 꿈을 응원하는 커리어 상담사로서 답변하세요."
      }
    });
    
    const analysisText = response.text;
    el.aiResult.innerHTML = analysisText;
    if (el.debugRaw) el.debugRaw.textContent = analysisText;
    
    el.aiLoader.classList.add('hidden');
    el.aiResult.classList.remove('hidden');
    el.btnSkipAd.classList.remove('hidden');
    el.anaStatusText.textContent = "분석이 완료되었습니다!";
  } catch (err) {
    console.error("[AI Analysis Error]", err);
    el.anaStatusText.textContent = "현재 분석 서버에 연결할 수 없습니다. 다시 시도해 주세요.";
    if (el.debugRaw) el.debugRaw.textContent = `Error Message: ${err.message}\n${err.stack}`;
    el.aiLoader.classList.add('hidden');
    el.btnSkipAd.classList.remove('hidden'); // 에러 상황에서도 결과 확인하기 버튼은 노출하여 다음 페이지 이동 가능하게 함
  }
}

function transition(from, to, display = 'block') { 
  if(!from || !to) return; 
  gsap.to(from, { opacity: 0, duration: 0.3, onComplete: () => {
    from.classList.add('hidden'); from.style.display = 'none'; 
    to.classList.remove('hidden'); to.style.display = display; 
    gsap.fromTo(to, { opacity: 0, y: 20 }, { opacity: 1, y: 0, duration: 0.5 });
  }});
}

function swipeManual(dir) {
  const pool = state.currentSortingStep === 'main' ? state.cards : state.heldCards;
  const topEl = el.cardStack.querySelector('.card-item:last-child');
  if (topEl && pool[state.currentIndex]) handleSwipe(dir, topEl, pool[state.currentIndex]);
}

function init() {
  populateElements();
  
  if (el.introForm) {
    el.introForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const birthDateVal = document.getElementById('birthdate').value;
      if (birthDateVal) {
        const birthYear = new Date(birthDateVal).getFullYear();
        state.targetGroup = (new Date().getFullYear() - birthYear) < 13 ? 'child' : 'adult';
      }
      await loadData();
      transition(el.introSection, el.sortingSection, 'flex');
      renderStack();
    });
  }
  
  el.btnS9Next.onclick = () => {
    transition(el.select9Section, el.rank3Section, 'flex');
    renderRank3Grid();
  };

  el.btnR3Next.onclick = startAnalysis;
  el.btnSkipAd.onclick = () => transition(el.adsOverlay, el.resultSection, 'block');

  const reg = (id, fn) => { const x = document.getElementById(id); if (x) x.onclick = fn; };
  reg('btn-swipe-left', () => swipeManual('left'));
  reg('btn-swipe-right', () => swipeManual('right'));
  reg('btn-swipe-up', () => swipeManual('up'));
  reg('btn-restart', () => location.reload());
  reg('btn-exit', () => location.reload());
}

document.addEventListener('DOMContentLoaded', init);
