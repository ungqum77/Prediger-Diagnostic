
import { GoogleGenAI } from "@google/genai";

/**
 * Google GenAI SDK 초기화
 */
const API_KEY = process.env.API_KEY;
window.ai = new GoogleGenAI({ apiKey: API_KEY });

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
  aiResult: document.getElementById('ai-result'),
  aiLoader: document.getElementById('ai-loader'),
  resTitle: document.getElementById('result-title'),
  resSummary: document.getElementById('result-summary'),
  resTraits: document.getElementById('result-traits'),
  resEnergy: document.getElementById('result-energy'),
  resEnergyContainer: document.getElementById('energy-container'),
  resJobs: document.getElementById('result-jobs'),
  resMajors: document.getElementById('result-majors'),
  resGuide: document.getElementById('result-guide'),
  resTag: document.getElementById('result-tag'),
  resGallery: document.getElementById('result-gallery-grid'),
  btnDownloadPdf: document.getElementById('btn-download-pdf')
};

/**
 * 마크다운 형식의 텍스트를 HTML로 변환
 */
function parseMarkdown(text) {
  if (!text) return "";
  return text
    .replace(/\*\*(.*?)\*\*/g, '<b>$1</b>')
    .replace(/\n/g, '<br>');
}

/**
 * AI 프롬프트용 데이터 추출 (RIASEC 결과 포함)
 */
function extractAiData(userType, contentsDB, vectorData) {
  const data = contentsDB[userType] || contentsDB["CENTER"];
  if (!data) return null;

  return {
    typeName: data.type_info?.name_kr || data.title || "정보 없음",
    coreEnergy: data.type_info?.core_energy || data.traits?.energy || "정보 없음",
    keywords: (data.ai_prompt_inputs?.personality_keywords || []).join(', '),
    workStyle: (data.ai_prompt_inputs?.work_style_keywords || []).join(', '),
    stress: (data.ai_prompt_inputs?.stress_factors || []).join(', '),
    jobs: (data.fact_data?.recomm_jobs || data.job_families || []).join(', '),
    models: (data.fact_data?.role_models || []).join(', '),
    vectorAnalysis: `D/I 성향치: ${vectorData.diScore.toFixed(2)}, T/P 성향치: ${vectorData.tpScore.toFixed(2)}`
  };
}

/**
 * [공식 적용] RIASEC 기반 정밀 점수 및 벡터 산출
 */
function calculatePredigerVector(rankedCards) {
  const riasecPoints = { R: 0, I: 0, A: 0, S: 0, E: 0, C: 0 };
  const weights = [4, 2, 1]; // 1순위: 4점, 2순위: 2점, 3순위: 1점

  rankedCards.forEach((card, idx) => {
    // 카드 데이터에 riasec 타입이 없을 경우 dimension을 기반으로 매핑 (안전장치)
    const type = card.riasec || (card.dimension === 'D' ? 'C' : card.dimension === 'I' ? 'A' : card.dimension === 'P' ? 'S' : 'R');
    if (riasecPoints[type] !== undefined) {
      riasecPoints[type] += weights[idx];
    }
  });

  // 1. 자료 vs 아이디어 (Data/Ideas) 차원 점수
  // 공식: (1.73 * E) + (1.73 * C) - (1.73 * I) - (1.73 * A)
  const diScore = (1.73 * riasecPoints.E) + (1.73 * riasecPoints.C) - (1.73 * riasecPoints.I) - (1.73 * riasecPoints.A);

  // 2. 사물 vs 사람 (Things/People) 차원 점수
  // 공식: (2.0 * R) + (1.0 * I) + (1.0 * C) - (2.0 * S) - (1.0 * E) - (1.0 * A)
  const tpScore = (2.0 * riasecPoints.R) + (1.0 * riasecPoints.I) + (1.0 * riasecPoints.C) - (2.0 * riasecPoints.S) - (1.0 * riasecPoints.E) - (1.0 * riasecPoints.A);

  return { diScore, tpScore, riasecPoints };
}

/**
 * 최종 리포트 생성 및 표시
 */
async function generateAndDisplayReport(userResults, contentsDB) {
  const reportContainer = document.getElementById('ai-report-section') || (function() {
    const newDiv = document.createElement('div');
    newDiv.id = 'ai-report-section';
    newDiv.className = 'mt-12 p-8 bg-white rounded-[3rem] border border-slate-100 shadow-sm';
    const container = el.resultSection.querySelector('#result-content-container');
    if (container) container.appendChild(newDiv);
    return newDiv;
  })();

  reportContainer.innerHTML = `
    <div class="flex flex-col items-center justify-center py-12 gap-4">
      <div class="w-10 h-10 border-4 border-blue-600/20 border-t-blue-600 rounded-full animate-spin"></div>
      <p class="text-slate-500 font-bold animate-pulse">20년 경력의 진로 컨설턴트 AI가 정밀 벡터 분석 중입니다...</p>
    </div>
  `;

  try {
    const ai = window.ai;
    const vectorData = calculatePredigerVector(userResults.rankedCards);
    const aiData = extractAiData(userResults.finalKey, contentsDB, vectorData);
    const top3Names = userResults.rankedCards.map(c => c.keyword || c.keyword_kr).join(', ');

    const prompt = `
      [System Instruction]
      너는 20년 경력의 베테랑 진로 컨설턴트다. 
      입력된 프레디저 정밀 벡터 값과 팩트 데이터를 바탕으로, 할루시네이션 없이 풍성한 리포트를 작성하라.

      [User Analysis Data]
      - 진단 유형: ${aiData.typeName}
      - 정밀 벡터 수치: ${aiData.vectorAnalysis}
      - 핵심 흥미 카드: ${top3Names}
      - RIASEC 가중치 결과: R(${vectorData.riasecPoints.R}), I(${vectorData.riasecPoints.I}), A(${vectorData.riasecPoints.A}), S(${vectorData.riasecPoints.S}), E(${vectorData.riasecPoints.E}), C(${vectorData.riasecPoints.C})

      [Fact Data for Reference]
      - 성격 키워드: ${aiData.keywords}
      - 업무 스타일: ${aiData.workStyle}
      - 추천 직업군: ${aiData.jobs}
      - 롤모델: ${aiData.models}

      [Request]
      위의 수치적 근거(벡터 값)를 언급하며 사용자의 잠재력을 매우 구체적으로 분석해줘. 
      특히 '자료/아이디어'와 '사물/사람' 중 어느 쪽으로 에너지가 얼마나 더 치우쳐 있는지 수치를 바탕으로 설명하고, 그에 맞는 커리어 로드맵을 제시해라. 
      어조는 전문적이고 따뜻하게 작성해라.
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt
    });

    reportContainer.innerHTML = `
      <div class="flex items-center gap-4 mb-8">
        <div class="w-12 h-12 bg-blue-600 rounded-2xl flex items-center justify-center text-white text-2xl shadow-lg">📋</div>
        <div>
          <h3 class="text-2xl font-black text-slate-900">AI 심층 커리어 리포트 (정밀 분석)</h3>
          <p class="text-slate-400 text-xs font-bold tracking-widest uppercase">Precision Vector Consultation</p>
        </div>
      </div>
      <div class="prose prose-slate max-w-none text-slate-700 leading-relaxed space-y-4 font-medium">
        ${parseMarkdown(response.text)}
      </div>
    `;

    if (window.gsap) gsap.from(reportContainer, { opacity: 0, y: 30, duration: 1, ease: "power3.out" });

  } catch (error) {
    console.error("AI Report Error:", error);
    reportContainer.innerHTML = `<div class="p-6 bg-red-50 text-red-600 rounded-2xl border border-red-100 text-center font-bold">리포트 생성 중 오류가 발생했습니다.</div>`;
  }
}

/**
 * 결과 로직 통합 실행
 */
async function showResult() {
  const scores = { D: 0, I: 0, P: 0, T: 0 };
  
  // 기존 차원 점수 계산 (바 그래프 표시용)
  state.likedCards.forEach(card => { if (card.dimension && scores[card.dimension] !== undefined) scores[card.dimension] += 1; });
  state.rankedCards.forEach((card, idx) => { 
    const weights = [4, 2, 1]; // 정통 가중치 적용
    if (card.dimension && scores[card.dimension] !== undefined) scores[card.dimension] += weights[idx]; 
  });
  
  const finalKey = calculateResultKey(scores);
  renderReport(finalKey, scores); 
  transition(el.adsOverlay, el.resultSection, 'block'); 

  const userResults = {
    finalKey: finalKey,
    scores: scores,
    rankedCards: state.rankedCards
  };
  
  generateAndDisplayReport(userResults, state.contentsDB);
}

// --- 나머지 기존 UI 로직 (transition, renderReport, calculateResultKey 등) ---

function calculateResultKey(scores) {
  const ranks = Object.entries(scores).map(([key, score]) => ({ key, score })).sort((a, b) => b.score - a.score), r1 = ranks[0], r2 = ranks[1], r4 = ranks[3];
  if (r1.score - r4.score <= 2) return "CENTER";
  if (r1.score - r2.score >= 3) return r1.key;
  const isBipolar = ((r1.key === 'D' && r2.key === 'I') || (r1.key === 'I' && r2.key === 'D') || (r1.key === 'T' && r2.key === 'P') || (r1.key === 'P' && r2.key === 'T'));
  if (isBipolar) return r1.key;
  return r1.key + r2.key;
}

function renderReport(key, scores) {
  const data = state.contentsDB[key] || state.contentsDB["CENTER"];
  if (el.resTitle) el.resTitle.innerHTML = `<span class="text-blue-600">${data.title || "정보 없음"}</span> 타입입니다.`;
  if (el.resSummary) el.resSummary.textContent = data.summary || "";
  if (el.resTag) el.resTag.textContent = key;
  
  // 정밀 벡터 시각화 (포인터 이동)
  const vector = calculatePredigerVector(state.rankedCards);
  const pointer = document.getElementById('result-pointer');
  if (pointer && window.gsap) {
    // tpScore가 X축 (Things - People), diScore가 Y축 (Data - Ideas)
    // 최대 가중치 합이 7이므로 적절히 스케일링
    gsap.to(pointer, { 
      left: `calc(50% + ${Math.max(-1, Math.min(1, vector.tpScore / 10)) * 50}%)`, 
      top: `calc(50% + ${-Math.max(-1, Math.min(1, vector.diScore / 10)) * 50}%)`, 
      opacity: 1, duration: 2, ease: "elastic.out(1, 0.4)" 
    });
  }

  // 나머지 UI 매핑
  if (el.resTraits) el.resTraits.textContent = data.traits?.desc || "";
  if (el.resEnergy && el.resEnergyContainer) { el.resEnergy.textContent = data.traits?.energy || ""; el.resEnergyContainer.style.display = data.traits?.energy ? 'block' : 'none'; }
  if (el.resJobs) el.resJobs.innerHTML = (data.job_families || []).map(j => `<span class="px-6 py-3 bg-blue-50 text-blue-700 rounded-2xl text-sm font-black border border-blue-100">${j}</span>`).join('');
  if (el.resMajors) el.resMajors.innerHTML = (data.majors || []).map(m => `<span class="px-4 py-2 bg-indigo-50 text-indigo-700 rounded-xl text-xs font-bold border border-indigo-100">${m}</span>`).join('');
  
  const max = Math.max(...Object.values(scores), 1);
  ['D','I','P','T'].forEach(k => { 
    const sEl = document.getElementById(`score-${k}`), bEl = document.getElementById(`bar-${k}`); 
    if (sEl) sEl.textContent = scores[k]; 
    if (bEl && window.gsap) gsap.to(bEl, { width: `${(scores[k]/max)*100}%`, duration: 1.5 }); 
  });
}

function transition(from, to, display = 'block') {
  if (!from || !to) return; from.classList.add('hidden'); from.style.display = 'none'; to.classList.remove('hidden'); to.style.display = display; window.scrollTo({ top: 0, behavior: 'instant' });
  if (window.gsap) { gsap.fromTo(to, { opacity: 0, y: 0 }, { opacity: 1, y: 0, duration: 0.4 }); }
}

// 초기화 로직 등 기존 코드 유지...
function init() {
  if (el.introForm) el.introForm.addEventListener('submit', handleIntroSubmit);
  const btnL = document.getElementById('btn-swipe-left'), btnR = document.getElementById('btn-swipe-right'), btnU = document.getElementById('btn-swipe-up'), btnE = document.getElementById('btn-exit'), btnRestart = document.getElementById('btn-restart');
  if (btnL) btnL.onclick = () => swipe('left');
  if (btnR) btnR.onclick = () => swipe('right');
  if (btnU) btnU.onclick = () => swipe('up');
  if (btnE) btnE.onclick = () => location.reload();
  if (btnRestart) btnRestart.onclick = () => location.reload();
  if (el.btnS9Next) el.btnS9Next.onclick = startRanking;
  if (el.btnR3Next) el.btnR3Next.onclick = startAnalysis;
  if (el.btnSkipAd) el.btnSkipAd.onclick = showResult;
  if (el.btnDownloadPdf) el.btnDownloadPdf.onclick = () => window.print();
}

async function handleIntroSubmit(e) {
  e.preventDefault();
  const nameInput = document.getElementById('username'), birthInput = document.getElementById('birthdate');
  if (!nameInput.value || !birthInput.value) return;
  state.user = { name: nameInput.value };
  await loadData();
  transition(el.introSection, el.sortingSection, 'flex');
  renderStack();
}

async function loadData() {
  const cardsRes = await fetch(`/assets/data/cards_kr.json`);
  state.cards = (await cardsRes.json()).cards;
  const contentRes = await fetch(`/assets/data/contents_db_kr.json`);
  state.contentsDB = await contentRes.json();
}

function renderStack() {
  if (!el.cardStack) return;
  el.cardStack.innerHTML = '';
  const currentPool = state.cards;
  const stack = currentPool.slice(state.currentIndex, state.currentIndex + 3).reverse();
  stack.forEach((card, i) => {
    const cardEl = document.createElement('div');
    cardEl.className = 'card-item';
    cardEl.innerHTML = `<div class="p-6 text-center"><h3>${card.keyword}</h3><p>${card.adult.desc}</p></div>`;
    el.cardStack.appendChild(cardEl);
    if (i === stack.length - 1) setupDraggable(cardEl, card);
  });
}

function setupDraggable(cardEl, cardData) {
  if (typeof Draggable === 'undefined') return;
  Draggable.create(cardEl, {
    type: "x,y",
    onDragEnd: function() {
      if (this.x > 100) handleSwipe('right', cardEl, cardData);
      else if (this.x < -100) handleSwipe('left', cardEl, cardData);
      else gsap.to(cardEl, { x: 0, y: 0, duration: 0.5 });
    }
  });
}

function handleSwipe(dir, cardEl, cardData) {
  if (dir === 'right') state.likedCards.push(cardData);
  gsap.to(cardEl, { opacity: 0, duration: 0.3, onComplete: () => {
    state.currentIndex++;
    if (state.currentIndex >= state.cards.length) finishSorting();
    else renderStack();
  }});
}

function finishSorting() { transition(el.sortingSection, el.select9Section, 'flex'); renderSelect9Grid(); }

function renderSelect9Grid() {
  el.s9Grid.innerHTML = '';
  state.likedCards.forEach(card => {
    const d = document.createElement('div');
    d.className = 'p-4 border rounded cursor-pointer';
    d.textContent = card.keyword;
    d.onclick = () => {
      if (state.top9Cards.includes(card)) state.top9Cards = state.top9Cards.filter(c => c !== card);
      else if (state.top9Cards.length < 9) state.top9Cards.push(card);
      d.classList.toggle('bg-blue-100', state.top9Cards.includes(card));
      el.btnS9Next.disabled = state.top9Cards.length !== 9;
    };
    el.s9Grid.appendChild(d);
  });
}

function startRanking() { transition(el.select9Section, el.rank3Section, 'flex'); renderRank3Grid(); }

function renderRank3Grid() {
  el.r3Grid.innerHTML = '';
  state.top9Cards.forEach(card => {
    const d = document.createElement('div');
    d.className = 'p-4 border rounded cursor-pointer';
    d.textContent = card.keyword;
    d.onclick = () => {
      if (state.rankedCards.includes(card)) state.rankedCards = state.rankedCards.filter(c => c !== card);
      else if (state.rankedCards.length < 3) state.rankedCards.push(card);
      d.classList.toggle('bg-indigo-100', state.rankedCards.includes(card));
      el.btnR3Next.disabled = state.rankedCards.length !== 3;
    };
    el.r3Grid.appendChild(d);
  });
}

function startAnalysis() { transition(el.rank3Section, el.adsOverlay, 'flex'); setTimeout(() => el.btnSkipAd.classList.remove('hidden'), 2000); }

document.addEventListener('DOMContentLoaded', init);
