import { GoogleGenAI } from "@google/genai";

/**
 * Google GenAI SDK 초기화
 */
const API_KEY = process.env.API_KEY;
window.ai = new GoogleGenAI({ apiKey: API_KEY });

// --- MOCK DATA (Fallback) ---
const MOCK_CARDS = [
  { id: 1, type: "D", keyword: "기록하기", adult: { desc: "자료를 기록하고 정리하는 것을 좋아합니다.", img: "card_01.png" }, riasec: "C" },
  { id: 2, type: "I", keyword: "아이디어", adult: { desc: "새로운 생각을 떠올리고 상상하는 것을 좋아합니다.", img: "card_02.png" }, riasec: "A" },
  { id: 3, type: "P", keyword: "도와주기", adult: { desc: "친구들의 고민을 들어주고 돕는 것을 좋아합니다.", img: "card_03.png" }, riasec: "S" },
  { id: 4, type: "T", keyword: "만들기", adult: { desc: "손으로 물건을 조립하거나 만드는 것을 좋아합니다.", img: "card_04.png" }, riasec: "R" },
  { id: 5, type: "D", keyword: "분석하기", adult: { desc: "숫자나 정보를 꼼꼼하게 따져보는 것을 좋아합니다.", img: "card_05.png" }, riasec: "C" },
  { id: 6, type: "T", keyword: "기계 다루기", adult: { desc: "도구나 기계를 사용하여 작업하는 것을 좋아합니다.", img: "card_06.png" }, riasec: "R" },
  { id: 7, type: "I", keyword: "연구하기", adult: { desc: "궁금한 것을 깊이 파고들어 연구하는 것을 좋아합니다.", img: "card_07.png" }, riasec: "I" },
  { id: 8, type: "P", keyword: "가르치기", adult: { desc: "다른 사람에게 지식을 알려주는 것을 좋아합니다.", img: "card_08.png" }, riasec: "S" },
  { id: 9, type: "D", keyword: "계산하기", adult: { desc: "돈이나 수치를 정확하게 계산하는 것을 좋아합니다.", img: "card_09.png" }, riasec: "E" },
  { id: 10, type: "T", keyword: "운전/조종", adult: { desc: "자동차나 드론 등을 조종하는 것을 좋아합니다.", img: "card_10.png" }, riasec: "R" },
  { id: 11, type: "I", keyword: "관찰하기", adult: { desc: "사물이나 자연을 자세히 관찰하는 것을 좋아합니다.", img: "card_11.png" }, riasec: "I" },
  { id: 12, type: "P", keyword: "상담하기", adult: { desc: "사람들의 마음을 위로하고 대화하는 것을 좋아합니다.", img: "card_12.png" }, riasec: "S" }
];

const MOCK_DB = {
  "DATA_THINGS": { title: "현실적인 분석가형", summary: "논리적이고 체계적이며, 구체적인 사물이나 도구를 다루는 데 능숙합니다.", job_families: ["엔지니어", "회계사", "데이터 분석가"], traits: { desc: "객관적인 데이터와 실재하는 도구를 활용하여 문제를 해결하는 것을 선호합니다." } },
  "DATA_PEOPLE": { title: "체계적인 관리자형", summary: "사람들과 함께 일하면서도 규칙과 질서를 중요하게 생각합니다.", job_families: ["행정가", "은행원", "비서"], traits: { desc: "조직을 체계적으로 관리하고 다른 사람들을 지원하는 역할을 잘 수행합니다." } },
  "IDEAS_THINGS": { title: "창의적인 탐구자형", summary: "새로운 아이디어를 구체적인 결과물로 만들어내는 것을 좋아합니다.", job_families: ["과학자", "소프트웨어 개발자", "발명가"], traits: { desc: "호기심이 많고 독창적이며, 기술적인 도구를 활용해 혁신을 만듭니다." } },
  "IDEAS_PEOPLE": { title: "열정적인 예술가/교육자형", summary: "자유로운 상상력을 바탕으로 사람들과 소통하고 영감을 줍니다.", job_families: ["예술가", "심리 상담사", "교사"], traits: { desc: "감수성이 풍부하고 다른 사람의 성장을 돕거나 자신을 표현하는 일을 즐깁니다." } },
  "CENTER": { title: "균형 잡힌 탐험가", summary: "다양한 분야에 고루 흥미를 가지고 있습니다.", job_families: ["기획자", "컨설턴트"], traits: { desc: "여러 분야를 융합하는 능력이 잠재되어 있습니다." } }
};

// --- STATE ---
const state = {
  lang: 'KR',
  mode: 'adult',
  cards: [],
  contentsDB: {},
  likedCards: [],
  heldCards: [],
  rejectedCards: [],
  top9Cards: [],
  rankedCards: [],
  currentIndex: 0,
  currentSortingStep: 'main',
  user: { name: '', age: 0 }
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
  cardStack: document.getElementById('card-stack'),
  s9Grid: document.getElementById('s9-grid'),
  s9Count: document.getElementById('s9-count'),
  btnS9Next: document.getElementById('btn-s9-next'),
  r3Grid: document.getElementById('r3-grid'),
  r3Count: document.getElementById('r3-count'),
  btnR3Next: document.getElementById('btn-r3-next'),
  btnSkipAd: document.getElementById('btn-skip-ad'),
  resTitle: document.getElementById('result-title'),
  resSummary: document.getElementById('result-summary'),
  resTraits: document.getElementById('result-traits'),
  resJobs: document.getElementById('result-jobs'),
  resMajors: document.getElementById('result-majors'),
  resTag: document.getElementById('result-tag'),
  resGallery: document.getElementById('result-gallery-grid'),
  btnDownloadPdf: document.getElementById('btn-download-pdf'),
  likedList: document.getElementById('liked-list'),
  heldList: document.getElementById('held-list'),
  progressBar: document.getElementById('progress-bar'),
  progressText: document.getElementById('progress-text-display'),
  countLike: document.getElementById('count-like'),
  countHold: document.getElementById('count-hold'),
  countNope: document.getElementById('count-nope')
};

// --- UTILITIES ---
function parseMarkdown(text) {
  if (!text) return "";
  return text.replace(/\*\*(.*?)\*\*/g, '<b>$1</b>').replace(/\n/g, '<br>');
}

function transition(from, to, display = 'block') {
  if (!from || !to) return;
  from.classList.add('hidden');
  from.style.display = 'none';
  to.classList.remove('hidden');
  to.style.display = display;
  window.scrollTo({ top: 0, behavior: 'smooth' });
  if (window.gsap) {
    gsap.fromTo(to, { opacity: 0, y: 20 }, { opacity: 1, y: 0, duration: 0.5 });
  }
}

// --- ALGORITHM ---
function calculatePredigerVector(rankedCards) {
  const riasecPoints = { R: 0, I: 0, A: 0, S: 0, E: 0, C: 0 };
  const weights = [4, 2, 1];

  rankedCards.forEach((card, idx) => {
    const type = card.riasec || (card.type === 'D' ? 'C' : card.type === 'I' ? 'A' : card.type === 'P' ? 'S' : 'R');
    if (riasecPoints[type] !== undefined) {
      riasecPoints[type] += weights[idx];
    }
  });

  const diScore = (1.73 * riasecPoints.E) + (1.73 * riasecPoints.C) - (1.73 * riasecPoints.I) - (1.73 * riasecPoints.A);
  const tpScore = (2.0 * riasecPoints.R) + (1.0 * riasecPoints.I) + (1.0 * riasecPoints.C) - (2.0 * riasecPoints.S) - (1.0 * riasecPoints.E) - (1.0 * riasecPoints.A);

  return { diScore, tpScore, riasecPoints };
}

function calculateResultKey(scores) {
  const ranks = Object.entries(scores).sort((a, b) => b[1] - a[1]);
  const r1 = ranks[0], r2 = ranks[1];
  
  if (r1[0] === 'D' || r1[0] === 'I') {
    if (r2[0] === 'T') return "DATA_THINGS";
    if (r2[0] === 'P') return "DATA_PEOPLE";
  } else {
    if (r2[0] === 'D') return "DATA_THINGS";
    if (r2[0] === 'I') return "IDEAS_THINGS";
  }
  
  // Default coordinate based
  const di = scores.D - scores.I;
  const tp = scores.T - scores.P;
  if (di >= 0 && tp >= 0) return "DATA_THINGS";
  if (di >= 0 && tp < 0) return "DATA_PEOPLE";
  if (di < 0 && tp >= 0) return "IDEAS_THINGS";
  return "IDEAS_PEOPLE";
}

// --- CORE FUNCTIONS ---
async function loadData() {
  try {
    const cardsRes = await fetch(`/assets/data/cards_kr.json`);
    if (!cardsRes.ok) throw new Error();
    state.cards = (await cardsRes.json()).cards;
  } catch (e) {
    state.cards = MOCK_CARDS;
  }

  try {
    const contentRes = await fetch(`/assets/data/contents_db_kr.json`);
    if (!contentRes.ok) throw new Error();
    state.contentsDB = await contentRes.json();
  } catch (e) {
    state.contentsDB = MOCK_DB;
  }
}

function renderStack() {
  if (!el.cardStack) return;
  el.cardStack.innerHTML = '';
  const isMain = state.currentSortingStep === 'main';
  const pool = isMain ? state.cards : state.heldCards;
  const current = pool.slice(state.currentIndex, state.currentIndex + 3).reverse();

  current.forEach((card, i) => {
    const cardEl = document.createElement('div');
    cardEl.className = 'card-item';
    const depth = current.length - 1 - i;
    cardEl.style.zIndex = i;
    cardEl.style.transform = `scale(${1 - depth * 0.05}) translateY(${depth * 15}px)`;
    
    cardEl.innerHTML = `
      <div class="h-1/2 bg-slate-100 flex items-center justify-center overflow-hidden">
        <img src="/assets/images/adult/${card.adult.img}" class="w-full h-full object-cover" onerror="this.src='https://placehold.co/400x300?text=${card.keyword}'">
      </div>
      <div class="p-6 text-center">
        <h3 class="text-xl font-bold mb-2">${card.keyword}</h3>
        <p class="text-sm text-slate-500">${card.adult.desc}</p>
      </div>
      <div class="absolute top-4 right-4 bg-white/80 px-2 py-1 rounded text-[10px] font-bold shadow-sm">${card.type}</div>
    `;
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
  if (dir === 'right') {
    state.likedCards.push(cardData);
    addToThumbnailList(cardData, 'liked');
  } else if (dir === 'up') {
    state.heldCards.push(cardData);
    addToThumbnailList(cardData, 'held');
  } else {
    state.rejectedCards.push(cardData);
  }

  gsap.to(cardEl, {
    x: dir === 'right' ? 500 : dir === 'left' ? -500 : 0,
    y: dir === 'up' ? -500 : 0,
    opacity: 0,
    duration: 0.3,
    onComplete: () => {
      state.currentIndex++;
      const pool = state.currentSortingStep === 'main' ? state.cards : state.heldCards;
      if (state.currentIndex >= pool.length) {
        if (state.currentSortingStep === 'main' && state.heldCards.length > 0) {
          state.currentSortingStep = 'held';
          state.currentIndex = 0;
          renderStack();
        } else {
          finishSorting();
        }
      } else {
        renderStack();
      }
    }
  });
}

function addToThumbnailList(card, target) {
  const listEl = target === 'liked' ? el.likedList : el.heldList;
  if (!listEl) return;
  const thumb = document.createElement('div');
  thumb.className = 'liked-thumb relative rounded-lg overflow-hidden h-20 bg-slate-100 border border-slate-200';
  thumb.innerHTML = `<img src="/assets/images/adult/${card.adult.img}" class="w-full h-full object-cover" onerror="this.src='https://placehold.co/100x100?text=${card.keyword}'">`;
  listEl.appendChild(thumb);
}

function updateProgress() {
  const pool = state.currentSortingStep === 'main' ? state.cards : state.heldCards;
  const p = (state.currentIndex / Math.max(pool.length, 1)) * 100;
  if (el.progressBar) el.progressBar.style.width = `${p}%`;
  if (el.progressText) el.progressText.textContent = `${state.currentIndex} / ${pool.length}`;
  if (el.countLike) el.countLike.textContent = state.likedCards.length;
  if (el.countHold) el.countHold.textContent = state.heldCards.length;
  if (el.countNope) el.countNope.textContent = state.rejectedCards.length;
}

function finishSorting() {
  transition(el.sortingSection, el.select9Section, 'flex');
  renderSelect9Grid();
}

function renderSelect9Grid() {
  if (!el.s9Grid) return;
  el.s9Grid.innerHTML = '';
  state.likedCards.forEach(card => {
    const d = document.createElement('div');
    d.className = 'selection-card relative rounded-xl overflow-hidden aspect-[3/4] shadow-sm border border-slate-200 cursor-pointer bg-white';
    d.innerHTML = `
      <img src="/assets/images/adult/${card.adult.img}" class="w-full h-full object-cover" onerror="this.src='https://placehold.co/200x260?text=${card.keyword}'">
      <div class="absolute inset-x-0 bottom-0 bg-black/60 p-2 text-white text-[10px] text-center font-bold">${card.keyword}</div>
    `;
    d.onclick = () => {
      if (state.top9Cards.includes(card)) {
        state.top9Cards = state.top9Cards.filter(c => c !== card);
        d.classList.remove('selected');
      } else if (state.top9Cards.length < 9) {
        state.top9Cards.push(card);
        d.classList.add('selected');
      }
      if (el.s9Count) el.s9Count.textContent = state.top9Cards.length;
      if (el.btnS9Next) el.btnS9Next.disabled = state.top9Cards.length !== 9;
    };
    el.s9Grid.appendChild(d);
  });
}

function startRanking() {
  transition(el.select9Section, el.rank3Section, 'flex');
  renderRank3Grid();
}

function renderRank3Grid() {
  if (!el.r3Grid) return;
  el.r3Grid.innerHTML = '';
  state.top9Cards.forEach(card => {
    const d = document.createElement('div');
    d.className = 'selection-card relative rounded-xl overflow-hidden aspect-[3/4] shadow-sm border border-slate-200 cursor-pointer bg-white';
    d.innerHTML = `
      <img src="/assets/images/adult/${card.adult.img}" class="w-full h-full object-cover" onerror="this.src='https://placehold.co/200x260?text=${card.keyword}'">
      <div class="absolute inset-x-0 bottom-0 bg-black/60 p-2 text-white text-[10px] text-center font-bold">${card.keyword}</div>
      <div class="badge-container absolute top-2 right-2"></div>
    `;
    d.onclick = () => {
      const idx = state.rankedCards.indexOf(card);
      if (idx !== -1) {
        state.rankedCards.splice(idx, 1);
        d.classList.remove('selected');
        d.querySelector('.badge-container').innerHTML = '';
      } else if (state.rankedCards.length < 3) {
        state.rankedCards.push(card);
        d.classList.add('selected');
        d.querySelector('.badge-container').innerHTML = `<div class="rank-badge">${state.rankedCards.length}</div>`;
      }
      // Re-render all badges to ensure order is correct
      document.querySelectorAll('#r3-grid .selection-card').forEach((elCard, i) => {
        const c = state.top9Cards[i];
        const rIdx = state.rankedCards.indexOf(c);
        if (rIdx !== -1) {
           elCard.querySelector('.badge-container').innerHTML = `<div class="rank-badge">${rIdx + 1}</div>`;
        }
      });
      if (el.r3Count) el.r3Count.textContent = state.rankedCards.length;
      if (el.btnR3Next) el.btnR3Next.disabled = state.rankedCards.length !== 3;
    };
    el.r3Grid.appendChild(d);
  });
}

function startAnalysis() {
  transition(el.rank3Section, el.adsOverlay, 'flex');
  setTimeout(() => el.btnSkipAd.classList.remove('hidden'), 2500);
}

async function showResult() {
  const scores = { D: 0, I: 0, P: 0, T: 0 };
  state.likedCards.forEach(c => { scores[c.type]++; });
  state.rankedCards.forEach((c, i) => { scores[c.type] += (3 - i); });

  const finalKey = calculateResultKey(scores);
  const vectorData = calculatePredigerVector(state.rankedCards);
  
  renderReport(finalKey, scores, vectorData);
  transition(el.adsOverlay, el.resultSection, 'block');
  
  const userResults = { finalKey, scores, rankedCards: state.rankedCards };
  generateAndDisplayReport(userResults, state.contentsDB);
}

function renderReport(key, scores, vector) {
  const data = state.contentsDB[key] || state.contentsDB["CENTER"];
  if (el.resTitle) el.resTitle.innerHTML = `<span class="text-blue-600">${data.title}</span> 타입입니다.`;
  if (el.resSummary) el.resSummary.textContent = data.summary;
  if (el.resTag) el.resTag.textContent = key;
  if (el.resTraits) el.resTraits.textContent = data.traits?.desc || "";
  
  const pointer = document.getElementById('result-pointer');
  if (pointer && window.gsap) {
    gsap.to(pointer, { 
      left: `calc(50% + ${Math.max(-1, Math.min(1, vector.tpScore / 10)) * 50}%)`, 
      top: `calc(50% + ${-Math.max(-1, Math.min(1, vector.diScore / 10)) * 50}%)`, 
      opacity: 1, duration: 2, ease: "elastic.out(1, 0.4)" 
    });
  }

  if (el.resJobs) el.resJobs.innerHTML = (data.job_families || []).map(j => `<span class="px-4 py-2 bg-blue-50 text-blue-700 rounded-xl text-sm font-bold border border-blue-100">${j}</span>`).join('');
  
  const max = Math.max(...Object.values(scores), 1);
  ['D','I','P','T'].forEach(k => {
    const sEl = document.getElementById(`score-${k}`), bEl = document.getElementById(`bar-${k}`);
    if (sEl) sEl.textContent = scores[k];
    if (bEl && window.gsap) gsap.to(bEl, { width: `${(scores[k]/max)*100}%`, duration: 1.5 });
  });

  if (el.resGallery) {
    el.resGallery.innerHTML = '';
    state.top9Cards.forEach(card => {
      const g = document.createElement('div');
      g.className = 'relative rounded-lg overflow-hidden aspect-[3/4] border border-slate-100 shadow-sm';
      g.innerHTML = `<img src="/assets/images/adult/${card.adult.img}" class="w-full h-full object-cover" onerror="this.src='https://placehold.co/100x130?text=${card.keyword}'">`;
      el.resGallery.appendChild(g);
    });
  }
}

async function generateAndDisplayReport(userResults, contentsDB) {
  const reportContainer = document.getElementById('ai-report-section') || (function() {
    const newDiv = document.createElement('div');
    newDiv.id = 'ai-report-section';
    newDiv.className = 'mt-12 p-8 bg-white rounded-[3rem] border border-slate-100 shadow-sm';
    const container = document.getElementById('result-content-container');
    if (container) container.appendChild(newDiv);
    return newDiv;
  })();

  reportContainer.innerHTML = `<div class="flex flex-col items-center py-12 gap-4"><div class="w-8 h-8 border-4 border-blue-600/20 border-t-blue-600 rounded-full animate-spin"></div><p class="text-slate-500 font-bold">진로 컨설턴트 AI가 분석 리포트를 작성 중입니다...</p></div>`;

  try {
    const vectorData = calculatePredigerVector(userResults.rankedCards);
    const aiData = extractAiData(userResults.finalKey, contentsDB, vectorData);
    const top3 = userResults.rankedCards.map(c => c.keyword).join(', ');

    const prompt = `[System] 당신은 20년 경력의 진로 컨설턴트입니다. 아래 데이터를 바탕으로 전문적이고 따뜻한 분석 리포트를 작성하세요.
    [Data] 유형: ${aiData.typeName}, 벡터: ${aiData.vectorAnalysis}, 핵심 카드: ${top3}, RIASEC: R(${vectorData.riasecPoints.R}) I(${vectorData.riasecPoints.I}) A(${vectorData.riasecPoints.A}) S(${vectorData.riasecPoints.S}) E(${vectorData.riasecPoints.E}) C(${vectorData.riasecPoints.C})
    [Fact] 특징: ${aiData.keywords}, 직업: ${aiData.jobs}
    [Request] 수치적 근거를 언급하며 잠재력과 커리어 로드맵을 마크다운 형식으로 풍성하게 작성해 주세요.`;

    const response = await window.ai.models.generateContent({ model: 'gemini-3-flash-preview', contents: prompt });
    reportContainer.innerHTML = `<div class="flex items-center gap-4 mb-6"><div class="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center text-white text-xl">📋</div><h3 class="text-xl font-black">AI 심층 커리어 리포트</h3></div><div class="prose prose-slate max-w-none text-slate-700 leading-relaxed font-medium">${parseMarkdown(response.text)}</div>`;
  } catch (e) {
    reportContainer.innerHTML = `<div class="p-6 bg-red-50 text-red-600 rounded-2xl text-center font-bold">분석 리포트를 생성하는 중 오류가 발생했습니다.</div>`;
  }
}

function extractAiData(userType, contentsDB, vectorData) {
  const data = contentsDB[userType] || contentsDB["CENTER"];
  return {
    typeName: data.title || "정보 없음",
    keywords: (data.job_families || []).join(', '),
    jobs: (data.job_families || []).join(', '),
    vectorAnalysis: `D/I: ${vectorData.diScore.toFixed(2)}, T/P: ${vectorData.tpScore.toFixed(2)}`
  };
}

// --- INITIALIZATION ---
function init() {
  if (el.introForm) {
    el.introForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const name = document.getElementById('username').value;
      const birth = document.getElementById('birthdate').value;
      if (!name || !birth) return;
      
      const btn = document.getElementById('btn-start');
      btn.disabled = true;
      btn.innerHTML = '<div class="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>';
      
      try {
        state.user = { name };
        await loadData();
        transition(el.introSection, el.sortingSection, 'flex');
        state.currentIndex = 0;
        state.currentSortingStep = 'main';
        renderStack();
      } catch (err) {
        alert('데이터를 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.');
        btn.disabled = false;
        btn.textContent = '진단 시작하기';
      }
    });
  }

  document.getElementById('btn-swipe-left').onclick = () => swipeManual('left');
  document.getElementById('btn-swipe-right').onclick = () => swipeManual('right');
  document.getElementById('btn-swipe-up').onclick = () => swipeManual('up');
  document.getElementById('btn-exit').onclick = () => location.reload();
  document.getElementById('btn-restart').onclick = () => location.reload();
  
  if (el.btnS9Next) el.btnS9Next.onclick = startRanking;
  if (el.btnR3Next) el.btnR3Next.onclick = startAnalysis;
  if (el.btnSkipAd) el.btnSkipAd.onclick = showResult;
  if (el.btnDownloadPdf) el.btnDownloadPdf.onclick = () => window.print();
}

function swipeManual(dir) {
  const top = el.cardStack.querySelector('.card-item:last-child');
  const pool = state.currentSortingStep === 'main' ? state.cards : state.heldCards;
  if (top) handleSwipe(dir, top, pool[state.currentIndex]);
}

document.addEventListener('DOMContentLoaded', init);