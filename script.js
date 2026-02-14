
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

// 1) AI 연결 상태 체크 및 초기화
const initAI = () => {
  try {
    if (API_KEY) {
      aiInstance = new GoogleGenAI({ apiKey: API_KEY });
      console.log("✅ Google AI (Gemini) Connected Successfully.");
    } else {
      console.warn("⚠️ API_KEY is missing. AI features will be disabled.");
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
  { id: 4, type: "T", keyword: "만들기", desc: "손으로 물건을 조립하거나 만드는 것을 좋아합니다.", img: "card_04.png" }
];

const MOCK_DB = {
  "DATA_THINGS": { title: "현실적인 분석가형", summary: "논리적이고 체계적이며, 구체적인 사물이나 도구를 다루는 데 능숙합니다.", job_families: ["엔지니어", "회계사", "데이터 분석가"], traits: { desc: "객관적인 데이터와 실재하는 도구를 활용하여 문제를 해결하는 것을 선호합니다." } },
  "CENTER": { title: "균형 잡힌 탐험가", summary: "다양한 분야에 고루 흥미를 가지고 있습니다.", job_families: ["기획자", "컨설턴트"], traits: { desc: "여러 분야를 융합하는 능력이 잠재되어 있습니다." } }
};

const state = {
  cards: [],
  contentsDB: {},
  likedCards: [],
  heldCards: [],
  top9Cards: [],
  rankedCards: [],
  currentIndex: 0,
  currentSortingStep: 'main',
  aiAnalysisResult: null, // AI 분석 결과 저장용
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
    state.cards = (await cardsRes.json()).cards || MOCK_CARDS;
  } catch (e) { state.cards = MOCK_CARDS; }
  try {
    const contentRes = await fetch(`assets/data/contents_db_kr.json`);
    state.contentsDB = await contentRes.json();
  } catch (e) { state.contentsDB = MOCK_DB; }
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
    const imgSrc = getCardImg(card) ? `assets/images/adult/${getCardImg(card)}` : `https://placehold.co/400x300?text=${keyword}`;
    cardEl.innerHTML = `<div class="h-1/2 bg-slate-100 overflow-hidden"><img src="${imgSrc}" class="w-full h-full object-cover"></div><div class="p-6 text-center"><h3 class="text-xl font-bold mb-2">${keyword}</h3><p class="text-sm text-slate-500">${desc}</p></div><div class="absolute top-4 right-4 bg-white/80 px-2 py-1 rounded text-[10px] font-bold shadow-sm">${type}</div>`;
    el.cardStack.appendChild(cardEl);
    if (depth === 0) setupDraggable(cardEl, card);
  });
  updateProgress();
}

function setupDraggable(cardEl, cardData) {
  if (typeof Draggable === 'undefined') return;
  Draggable.create(cardEl, {
    type: "x,y",
    onDragEnd: function() {
      if (this.x > 100) handleSwipe('right', cardEl, cardData);
      else if (this.x < -100) handleSwipe('left', cardEl, cardData);
      else if (this.y < -100 && state.currentSortingStep === 'main') handleSwipe('up', cardEl, cardData);
      else gsap.to(cardEl, { x: 0, y: 0, rotation: 0, duration: 0.5 });
    }
  });
}

function handleSwipe(dir, cardEl, cardData) {
  if (dir === 'right') state.likedCards.push(cardData);
  else if (dir === 'up') state.heldCards.push(cardData);
  gsap.to(cardEl, { x: dir === 'right' ? 500 : dir === 'left' ? -500 : 0, y: dir === 'up' ? -500 : 0, opacity: 0, duration: 0.3, onComplete: () => {
    state.currentIndex++;
    const pool = state.currentSortingStep === 'main' ? state.cards : state.heldCards;
    if (state.currentIndex >= pool.length) {
      if (state.currentSortingStep === 'main' && state.heldCards.length > 0) {
        state.currentSortingStep = 'held'; state.currentIndex = 0; renderStack();
      } else finishSorting();
    } else renderStack();
  }});
}

function updateProgress() {
  const pool = state.currentSortingStep === 'main' ? state.cards : state.heldCards;
  const p = (state.currentIndex / Math.max(pool.length, 1)) * 100;
  if (el.progressBar) el.progressBar.style.width = `${p}%`;
}

function finishSorting() { transition(el.sortingSection, el.select9Section, 'flex'); renderSelect9Grid(); }

function renderSelect9Grid() {
  el.s9Grid.innerHTML = '';
  state.likedCards.forEach(card => {
    const d = document.createElement('div');
    d.className = 'selection-card relative rounded-xl overflow-hidden aspect-[3/4] shadow-sm border border-slate-200 cursor-pointer bg-white';
    const keyword = getCardKeyword(card);
    const imgSrc = getCardImg(card) ? `assets/images/adult/${getCardImg(card)}` : `https://placehold.co/200x260?text=${keyword}`;
    d.innerHTML = `<img src="${imgSrc}" class="w-full h-full object-cover"><div class="absolute inset-x-0 bottom-0 bg-black/60 p-2 text-white text-[10px] text-center font-bold">${keyword}</div>`;
    d.onclick = () => {
      if (state.top9Cards.includes(card)) state.top9Cards = state.top9Cards.filter(c => c !== card);
      else if (state.top9Cards.length < 9) state.top9Cards.push(card);
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

// 2, 3, 4) 심층 분석 및 동적 메시지 처리
async function startAnalysis() {
  transition(el.rank3Section, el.adsOverlay, 'flex');
  
  // 로딩 메시지 순환
  const messages = [
    "1단계: 사용자의 흥미 키워드 분류 중...",
    "2단계: 프레디저 좌표 데이터 연산 중...",
    "3단계: 최신 프레디저 알고리즘 분석 중...",
    "최종 단계: AI 전문 컨설턴트 리포트 작성 중..."
  ];
  let msgIdx = 0;
  const msgInterval = setInterval(() => {
    if (msgIdx < messages.length - 1) {
      msgIdx++;
      if (el.anaStatusText) el.anaStatusText.textContent = messages[msgIdx];
    }
  }, 2000);

  // AI 분석 즉시 시작 (Pre-fetching)
  try {
    const scores = { D: 0, I: 0, P: 0, T: 0 };
    state.likedCards.forEach(c => { const type = getCardType(c); if(scores[type]!==undefined) scores[type]++; });
    state.rankedCards.forEach((c, i) => { const type = getCardType(c); if(scores[type]!==undefined) scores[type] += (3 - i); });

    const finalKey = calculateResultKey(scores);
    const vectorData = calculatePredigerVector(state.rankedCards);
    
    // AI 리포트 생성 시작
    const aiData = extractAiData(finalKey, state.contentsDB, vectorData);
    const top3 = state.rankedCards.map(c => getCardKeyword(c)).join(', ');
    const prompt = `[System] 당신은 20년 경력의 진로 컨설턴트입니다. 아래 데이터를 바탕으로 전문적이고 따뜻한 분석 리포트를 작성하세요.
    [Data] 유형: ${aiData.typeName}, 벡터: D/I ${vectorData.diScore.toFixed(2)} T/P ${vectorData.tpScore.toFixed(2)}, 핵심 카드: ${top3}
    [Request] 수치적 근거를 언급하며 잠재력과 커리어 로드맵을 마크다운 형식으로 작성해 주세요.`;

    if (aiInstance) {
      const response = await aiInstance.models.generateContent({ model: 'gemini-3-flash-preview', contents: prompt });
      state.aiAnalysisResult = response.text;
    } else {
      state.aiAnalysisResult = "AI 인스턴스가 설정되지 않았습니다. (API Key 확인 필요)";
    }
    
    // 분석 완료 시 버튼 활성화
    clearInterval(msgInterval);
    if (el.anaStatusText) el.anaStatusText.textContent = "분석이 완료되었습니다!";
    if (el.btnSkipAd) {
      el.btnSkipAd.classList.remove('hidden');
      el.btnSkipAd.classList.add('flex');
    }
  } catch (err) {
    console.error("AI Analysis pre-fetch failed:", err);
    clearInterval(msgInterval);
    if (el.anaStatusText) el.anaStatusText.textContent = "분석 중 오류가 발생했습니다.";
    if (el.btnSkipAd) el.btnSkipAd.classList.remove('hidden'); // 에러 시에도 버튼은 보여줌 (결과는 수동 표시)
  }
}

async function showResult() {
  const scores = { D: 0, I: 0, P: 0, T: 0 };
  state.likedCards.forEach(c => { const type = getCardType(c); if(scores[type]!==undefined) scores[type]++; });
  state.rankedCards.forEach((c, i) => { const type = getCardType(c); if(scores[type]!==undefined) scores[type] += (3 - i); });

  const finalKey = calculateResultKey(scores);
  const vectorData = calculatePredigerVector(state.rankedCards);
  
  renderReport(finalKey, scores, vectorData);
  transition(el.adsOverlay, el.resultSection, 'block');
  
  // 이미 생성된 AI 리포트가 있으면 표시
  const aiReportEl = document.getElementById('ai-result');
  const aiLoaderEl = document.getElementById('ai-loader');
  if (aiReportEl && aiLoaderEl) {
    aiLoaderEl.classList.add('hidden');
    aiReportEl.classList.remove('hidden');
    aiReportEl.innerHTML = parseMarkdown(state.aiAnalysisResult || "분석 결과를 불러올 수 없습니다.");
  }
}

function calculatePredigerVector(rankedCards) {
  const riasecPoints = { R: 0, I: 0, A: 0, S: 0, E: 0, C: 0 };
  const weights = [4, 2, 1];
  rankedCards.forEach((card, idx) => {
    const type = card.riasec || (getCardType(card) === 'D' ? 'C' : getCardType(card) === 'I' ? 'A' : getCardType(card) === 'P' ? 'S' : 'R');
    if (riasecPoints[type] !== undefined) riasecPoints[type] += weights[idx];
  });
  return { 
    diScore: (1.73 * riasecPoints.E) + (1.73 * riasecPoints.C) - (1.73 * riasecPoints.I) - (1.73 * riasecPoints.A),
    tpScore: (2.0 * riasecPoints.R) + (1.0 * riasecPoints.I) + (1.0 * riasecPoints.C) - (2.0 * riasecPoints.S) - (1.0 * riasecPoints.E) - (1.0 * riasecPoints.A)
  };
}

function calculateResultKey(scores) {
  const ranks = Object.entries(scores).sort((a, b) => b[1] - a[1]);
  const r1 = ranks[0], r2 = ranks[1];
  if (r1[0] === 'D' || r1[0] === 'I') return r2[0] === 'T' ? "DATA_THINGS" : "DATA_PEOPLE";
  return r2[0] === 'D' ? "DATA_THINGS" : "IDEAS_THINGS";
}

function renderReport(key, scores, vector) {
  const data = state.contentsDB[key] || state.contentsDB["CENTER"];
  if (el.resultTitle) el.resultTitle.innerHTML = `<span class="text-blue-600">${data.title}</span> 타입입니다.`;
  if (el.resultSummary) el.resultSummary.textContent = data.summary;
  if (el.resultTag) el.resultTag.textContent = key;
  if (el.resultTraits) el.resultTraits.textContent = data.traits?.desc || data.traits || "";
  if (el.resultJobs) el.resultJobs.innerHTML = (data.job_families || data.jobs || []).map(j => `<span class="px-4 py-2 bg-blue-50 text-blue-700 rounded-xl text-sm font-bold border border-blue-100">${j}</span>`).join('');
  
  const pointer = document.getElementById('result-pointer');
  if (pointer) gsap.to(pointer, { left: `calc(50% + ${Math.max(-1, Math.min(1, vector.tpScore / 10)) * 50}%)`, top: `calc(50% + ${-Math.max(-1, Math.min(1, vector.diScore / 10)) * 50}%)`, opacity: 1, duration: 2 });
}

function extractAiData(userType, contentsDB) {
  const data = contentsDB[userType] || contentsDB["CENTER"];
  return { typeName: data.title || "정보 없음", keywords: (data.job_families || data.jobs || []).join(', '), jobs: (data.job_families || data.jobs || []).join(', ') };
}

function parseMarkdown(text) { return text ? text.replace(/\*\*(.*?)\*\*/g, '<b>$1</b>').replace(/\n/g, '<br>') : ""; }
function transition(from, to, display = 'block') { from.classList.add('hidden'); from.style.display = 'none'; to.classList.remove('hidden'); to.style.display = display; window.scrollTo({ top: 0, behavior: 'smooth' }); }

function init() {
  populateElements();
  if (el.introForm) {
    el.introForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const btn = document.getElementById('btn-start');
      btn.disabled = true; btn.innerHTML = '<div class="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>';
      try { await loadData(); transition(el.introSection, el.sortingSection, 'flex'); renderStack(); } 
      catch (err) { alert('데이터 로딩 오류'); btn.disabled = false; btn.textContent = '진단 시작하기'; }
    });
  }
  const reg = (id, fn) => { const x = document.getElementById(id); if (x) x.onclick = fn; };
  reg('btn-swipe-left', () => swipeManual('left'));
  reg('btn-swipe-right', () => swipeManual('right'));
  reg('btn-swipe-up', () => swipeManual('up'));
  reg('btn-exit', () => location.reload());
  reg('btn-restart', () => location.reload());
  if (el.btnS9Next) el.btnS9Next.onclick = startRanking;
  if (el.btnR3Next) el.btnR3Next.onclick = startAnalysis;
  if (el.btnSkipAd) el.btnSkipAd.onclick = showResult;
}

function swipeManual(dir) {
  const top = el.cardStack.querySelector('.card-item:last-child');
  const pool = state.currentSortingStep === 'main' ? state.cards : state.heldCards;
  if (top) handleSwipe(dir, top, pool[state.currentIndex]);
}

document.addEventListener('DOMContentLoaded', init);
