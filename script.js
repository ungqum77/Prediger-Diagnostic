
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
    'liked-list', 'held-list', 'progress-bar', 'progress-text-display', 
    'count-like', 'count-hold', 'ana-status-text'
  ];
  ids.forEach(id => { el[id.replace(/-([a-z])/g, g => g[1].toUpperCase())] = document.getElementById(id); });
};

// --- CORE UTILS ---
const getCardKeyword = (c) => c.keyword || c.name || "";
const getCardType = (c) => c.type || "";
const getCardImg = (c) => c.img || "";

async function loadData() {
  try {
    const cardsRes = await fetch(`assets/data/cards_kr.json`);
    const data = await cardsRes.json();
    state.cards = data.cards || data;
  } catch (e) { 
    state.cards = [
      { id: 1, type: "D", keyword: "기록", desc: "정보 기록하기", img: "card_01.png" },
      { id: 2, type: "I", keyword: "상상", desc: "새로운 생각하기", img: "card_02.png" },
      { id: 3, type: "P", keyword: "도움", desc: "사람 돕기", img: "card_03.png" },
      { id: 4, type: "T", keyword: "제작", desc: "물건 만들기", img: "card_04.png" }
    ];
  }
}

// --- UI LOGIC ---
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
    if (depth === 0) setupDraggable(cardEl, card);
  });
  updateProgress();
}

function setupDraggable(cardEl, cardData) {
  Draggable.create(cardEl, {
    type: "x,y",
    onDragEnd: function() {
      if (this.x > 100) handleSwipe('right', cardEl, cardData);
      else if (this.x < -100) handleSwipe('left', cardEl, cardData);
      else if (this.y < -100 && state.currentSortingStep === 'main') handleSwipe('up', cardEl, cardData);
      else gsap.to(this.target, { x: 0, y: 0, rotation: 0, duration: 0.5 });
    }
  });
}

function handleSwipe(dir, cardEl, cardData) {
  if (dir === 'right') state.likedCards.push(cardData);
  else if (dir === 'up') state.heldCards.push(cardData);
  gsap.to(cardEl, { x: dir === 'right' ? 600 : dir === 'left' ? -600 : 0, y: dir === 'up' ? -600 : 0, opacity: 0, duration: 0.4, onComplete: () => {
    state.currentIndex++;
    const pool = state.currentSortingStep === 'main' ? state.cards : state.heldCards;
    if (state.currentIndex >= pool.length) {
      if (state.currentSortingStep === 'main' && state.heldCards.length > 0) {
        state.currentSortingStep = 'held'; state.currentIndex = 0; renderStack();
      } else { finishSorting(); }
    } else { renderStack(); }
  }});
}

function updateProgress() {
  const pool = state.currentSortingStep === 'main' ? state.cards : state.heldCards;
  if (el.progressTextDisplay) el.progressTextDisplay.textContent = `${state.currentIndex + 1} / ${pool.length}`;
}

function finishSorting() { transition(el.sortingSection, el.select9Section, 'flex'); renderSelect9Grid(); }

function renderSelect9Grid() {
  el.s9Grid.innerHTML = '';
  state.likedCards.forEach(card => {
    const isSelected = state.top9Cards.includes(card);
    const d = document.createElement('div');
    d.className = `selection-card relative rounded-xl overflow-hidden aspect-[3/4] border-4 cursor-pointer transition-all ${isSelected ? 'border-blue-500 scale-95' : 'border-slate-100 bg-white'}`;
    d.innerHTML = `<img src="assets/images/adult/${getCardImg(card)}" class="w-full h-full object-cover" onerror="this.src='https://placehold.co/100x130?text=${getCardKeyword(card)}'"><div class="absolute inset-x-0 bottom-0 bg-black/60 p-2 text-white text-[10px] text-center font-bold">${getCardKeyword(card)}</div>`;
    d.onclick = () => {
      if (state.top9Cards.includes(card)) state.top9Cards = state.top9Cards.filter(c => c !== card);
      else if (state.top9Cards.length < 9) state.top9Cards.push(card);
      renderSelect9Grid();
      el.s9Count.textContent = state.top9Cards.length;
      el.btnS9Next.disabled = state.top9Cards.length !== 9;
      el.btnS9Next.classList.toggle('bg-blue-600', state.top9Cards.length === 9);
    };
    el.s9Grid.appendChild(d);
  });
}

function startRanking() { transition(el.select9Section, el.rank3Section, 'flex'); renderRank3Grid(); }

function renderRank3Grid() {
  el.r3Grid.innerHTML = '';
  state.top9Cards.forEach(card => {
    const d = document.createElement('div');
    d.className = 'selection-card relative rounded-xl overflow-hidden aspect-[3/4] border border-slate-200 cursor-pointer bg-white';
    d.innerHTML = `<img src="assets/images/adult/${getCardImg(card)}" class="w-full h-full object-cover" onerror="this.src='https://placehold.co/200x260?text=${getCardKeyword(card)}'"><div class="absolute inset-x-0 bottom-0 bg-black/60 p-2 text-white text-[10px] text-center font-bold">${getCardKeyword(card)}</div><div class="badge-container absolute top-2 right-2"></div>`;
    d.onclick = () => {
      const idx = state.rankedCards.indexOf(card);
      if (idx !== -1) state.rankedCards.splice(idx, 1);
      else if (state.rankedCards.length < 3) state.rankedCards.push(card);
      document.querySelectorAll('#r3-grid .selection-card').forEach((elCard, i) => {
        const rIdx = state.rankedCards.indexOf(state.top9Cards[i]);
        elCard.querySelector('.badge-container').innerHTML = rIdx !== -1 ? `<div class="w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center font-bold">${rIdx + 1}</div>` : '';
      });
      el.r3Count.textContent = state.rankedCards.length;
      el.btnR3Next.disabled = state.rankedCards.length !== 3;
      el.btnR3Next.classList.toggle('bg-blue-600', state.rankedCards.length === 3);
    };
    el.r3Grid.appendChild(d);
  });
}

async function startAnalysis() {
  transition(el.rank3Section, el.adsOverlay, 'flex');
  console.log("🚀 Starting AI Analysis...");
  
  const top3 = state.rankedCards.map(c => getCardKeyword(c)).join(', ');
  const top9 = state.top9Cards.map(c => getCardKeyword(c)).join(', ');

  const prompt = `당신은 전문 진로 상담사입니다. 프레디저 적성검사 결과를 분석해주세요.
- 사용자가 고른 상위 3개 카드: ${top3}
- 사용자가 고른 상위 9개 카드: ${top9}

다음의 정보를 반드시 포함하여 300자 내외의 한국어 리포트를 작성해주세요:
1. [유형명]: ~한 탐구자형 같은 스타일의 짧은 유형 이름
2. [한줄평]: 전체적인 성향을 요약하는 문장
3. [특성]: 사용자의 강점과 행동 양식 설명
4. [추천직업]: 어울리는 구체적인 직업 5가지 (쉼표로 구분)
5. [추천학과]: 어울리는 대학 전공 5가지 (쉼표로 구분)

출력 형식은 자유롭지만 위 5개 정보를 꼭 포함해야 합니다.`;

  try {
    if (!aiInstance) throw new Error("AI Instance not ready");
    
    const response = await aiInstance.models.generateContent({ 
      model: 'gemini-3-flash-preview', 
      contents: prompt,
      config: { temperature: 0.8 }
    });

    state.aiAnalysisResult = response.text;
    console.log("✅ AI Analysis Complete:", state.aiAnalysisResult);
    
    if (el.anaStatusText) el.anaStatusText.textContent = "분석 완료!";
    if (el.btnSkipAd) el.btnSkipAd.classList.remove('hidden');
    const debugRaw = document.getElementById('debug-raw');
    if (debugRaw) debugRaw.textContent = state.aiAnalysisResult;

  } catch (err) {
    console.error("❌ AI Error:", err);
    state.aiAnalysisResult = "AI 분석 중 오류가 발생했습니다. 수동 계산 결과로 대체합니다.";
    if (el.btnSkipAd) el.btnSkipAd.classList.remove('hidden');
  }
}

function showResult() {
  transition(el.adsOverlay, el.resultSection, 'block');
  
  const raw = state.aiAnalysisResult || "";
  
  // AI 응답 파싱 및 UI 업데이트
  const getSection = (marker) => {
    const regex = new RegExp(`\\[${marker}\\]:?\\s*([^\\n\\[]+)`, 'i');
    const match = raw.match(regex);
    return match ? match[1].trim() : "";
  };

  const typeName = getSection("유형명") || "탐험가";
  const summary = getSection("한줄평") || "자신만의 길을 찾는 개척자입니다.";
  const traits = getSection("특성") || "다양한 분야에 호기심이 많고 문제 해결 능력이 뛰어납니다.";
  const jobs = (getSection("추천직업") || "기획자, 마케터, 컨설턴트").split(',').map(s => s.trim());
  const majors = (getSection("추천학과") || "경영학, 사회학, 심리학").split(',').map(s => s.trim());

  if (el.resultTitle) el.resultTitle.innerHTML = `<span class="text-blue-600">${typeName}</span> 타입입니다.`;
  if (el.resultSummary) el.resultSummary.textContent = summary;
  if (el.resultTraits) el.resultTraits.textContent = traits;
  
  if (el.resultJobs) {
    el.resultJobs.innerHTML = jobs.map(j => `<span class="px-3 py-1 bg-blue-50 text-blue-600 rounded-lg text-sm font-bold">${j}</span>`).join('');
  }
  if (el.resultMajors) {
    el.resultMajors.innerHTML = majors.map(m => `<span class="px-3 py-1 bg-indigo-50 text-indigo-600 rounded-lg text-sm font-bold">${m}</span>`).join('');
  }

  // 9장 갤러리 렌더링
  if (el.resultGalleryGrid) {
    el.resultGalleryGrid.innerHTML = state.top9Cards.map(c => `
      <div class="rounded-xl overflow-hidden bg-slate-50 border border-slate-200">
        <img src="assets/images/adult/${getCardImg(c)}" class="w-full aspect-square object-cover" onerror="this.src='https://placehold.co/100x100?text=${getCardKeyword(c)}'">
        <div class="p-1 text-[8px] font-bold text-center truncate">${getCardKeyword(c)}</div>
      </div>
    `).join('');
  }

  // 포인터 애니메이션 (간단 계산 기반)
  const scores = { D: 0, I: 0, P: 0, T: 0 };
  state.top9Cards.forEach(c => { const t = getCardType(c); if(scores[t]!==undefined) scores[t]++; });
  const tx = (scores.T - scores.P) * 10;
  const ty = (scores.D - scores.I) * 10;
  const ptr = document.getElementById('result-pointer');
  if (ptr) gsap.to(ptr, { left: `calc(50% + ${tx}%)`, top: `calc(50% - ${ty}%)`, opacity: 1, duration: 1.5 });

  const aiReportEl = document.getElementById('ai-result');
  const aiLoaderEl = document.getElementById('ai-loader');
  if (aiReportEl && aiLoaderEl) {
    aiLoaderEl.classList.add('hidden');
    aiReportEl.classList.remove('hidden');
    aiReportEl.innerHTML = parseMarkdown(raw);
  }
}

function parseMarkdown(text) { return text ? text.replace(/\*\*(.*?)\*\*/g, '<b>$1</b>').replace(/\n/g, '<br>') : ""; }
function transition(from, to, display = 'block') { 
  if(!from || !to) return; 
  from.classList.add('hidden'); from.style.display = 'none'; 
  to.classList.remove('hidden'); to.style.display = display; 
  window.scrollTo({ top: 0, behavior: 'smooth' }); 
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
  if (el.btnS9Next) el.btnS9Next.onclick = startRanking;
  if (el.btnR3Next) el.btnR3Next.onclick = startAnalysis;
  if (el.btnSkipAd) el.btnSkipAd.onclick = showResult;
}

function swipeManual(dir) {
  const top = el.cardStack.querySelector('.card-item:last-child');
  if (top) handleSwipe(dir, top, state.cards[state.currentIndex]);
}

document.addEventListener('DOMContentLoaded', init);
