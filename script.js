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
  // ... (기존 el 정의 유지)
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
  resGuideContainer: document.getElementById('guide-container'),
  resTag: document.getElementById('result-tag'),
  resGallery: document.getElementById('result-gallery-grid'),
  btnDownloadPdf: document.getElementById('btn-download-pdf')
};

/**
 * 마크다운 형식의 텍스트를 HTML(br, b 태그)로 변환하는 유틸리티
 */
function parseMarkdown(text) {
  if (!text) return "";
  let html = text
    .replace(/\*\*(.*?)\*\*/g, '<b>$1</b>') // 볼드 처리
    .replace(/\n/g, '<br>'); // 줄바꿈 처리
  return html;
}

/**
 * AI 프롬프트용 핵심 데이터 추출 함수
 */
function extractAiData(userType, contentsDB) {
  const data = contentsDB[userType] || contentsDB["CENTER"];
  if (!data) return null;

  return {
    typeName: data.type_info?.name_kr || data.title || "정보 없음",
    coreEnergy: data.type_info?.core_energy || data.traits?.energy || "정보 없음",
    keywords: (data.ai_prompt_inputs?.personality_keywords || []).join(', '),
    workStyle: (data.ai_prompt_inputs?.work_style_keywords || []).join(', '),
    stress: (data.ai_prompt_inputs?.stress_factors || []).join(', '),
    jobs: (data.fact_data?.recomm_jobs || data.job_families || []).join(', '),
    models: (data.fact_data?.role_models || []).join(', ')
  };
}

/**
 * [핵심 기능] AI 리포트 생성 및 화면 표시 함수
 * @param {object} userResults - 사용자의 1,2,3순위 카드 및 점수 정보
 * @param {object} contentsDB - 전체 데이터베이스
 */
async function generateAndDisplayReport(userResults, contentsDB) {
  const reportContainer = document.getElementById('ai-report-section') || (function() {
    const newDiv = document.createElement('div');
    newDiv.id = 'ai-report-section';
    newDiv.className = 'mt-12 p-8 bg-white rounded-[3rem] border border-slate-100 shadow-sm';
    el.resultSection.querySelector('#result-content-container').appendChild(newDiv);
    return newDiv;
  })();

  // 1. 로딩 상태 표시
  reportContainer.innerHTML = `
    <div class="flex flex-col items-center justify-center py-12 gap-4">
      <div class="w-10 h-10 border-4 border-blue-600/20 border-t-blue-600 rounded-full animate-spin"></div>
      <p class="text-slate-500 font-bold animate-pulse">20년 경력의 진로 컨설턴트 AI가 리포트를 작성 중입니다...</p>
    </div>
  `;

  try {
    const ai = window.ai;
    const aiData = extractAiData(userResults.finalKey, contentsDB);
    const top3Names = userResults.rankedCards.map(c => c.keyword || c.keyword_kr).join(', ');

    // 2. 페르소나 및 데이터 기반 프롬프트 구성
    const prompt = `
      [System Instruction]
      당신은 20년 경력의 베테랑 진로 컨설턴트입니다. 
      입력된 팩트 데이터(JSON 기반 추출 데이터)를 바탕으로 할루시네이션(거짓 정보) 없이 매우 풍성하고 전문적인 리포트를 작성하세요.

      [User Data]
      - 진단 유형: ${aiData.typeName}
      - 핵심 흥미 카드: ${top3Names}
      - 성향 점수: D(${userResults.scores.D}), I(${userResults.scores.I}), P(${userResults.scores.P}), T(${userResults.scores.T})

      [Fact Data for Reference]
      - 성격적 특징: ${aiData.keywords}
      - 업무 스타일: ${aiData.workStyle}
      - 스트레스 요인: ${aiData.stress}
      - 추천 직업군: ${aiData.jobs}
      - 롤모델: ${aiData.models}

      [Request]
      위 데이터를 활용하여 다음 목차를 포함한 종합 리포트를 작성해 주세요:
      1. 유형의 심층적 이해 및 성격 분석
      2. 업무 현장에서의 강점과 잠재력
      3. 주의해야 할 스트레스 관리 및 환경
      4. 장기적인 커리어 로드맵과 롤모델 활용법

      어조는 따뜻하면서도 매우 전문적이어야 하며, 사용자에게 실질적인 통찰을 제공할 수 있도록 텍스트를 풍부하게 작성해 주세요.
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt
    });

    const reportHtml = parseMarkdown(response.text);

    // 3. 결과 표시 (기존 그래프/카드 아래에 추가)
    reportContainer.innerHTML = `
      <div class="flex items-center gap-4 mb-8">
        <div class="w-12 h-12 bg-blue-600 rounded-2xl flex items-center justify-center text-white text-2xl shadow-lg">📋</div>
        <div>
          <h3 class="text-2xl font-black text-slate-900">AI 심층 커리어 리포트</h3>
          <p class="text-slate-400 text-xs font-bold tracking-widest uppercase">Expert Consulting Insight</p>
        </div>
      </div>
      <div class="prose prose-slate max-w-none text-slate-700 leading-relaxed space-y-4 font-medium">
        ${reportHtml}
      </div>
    `;

    if (window.gsap) {
      gsap.from(reportContainer, { opacity: 0, y: 30, duration: 1, ease: "power3.out" });
    }

  } catch (error) {
    console.error("AI Report Generation Error:", error);
    reportContainer.innerHTML = `
      <div class="p-6 bg-red-50 text-red-600 rounded-2xl border border-red-100 text-center font-bold">
        리포트 생성 중 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.
      </div>
    `;
  }
}

// --- FLOW CONTROL (기존 함수와 연결) ---

async function showResult() {
  const scores = { D: 0, I: 0, P: 0, T: 0 };
  state.likedCards.forEach(card => { if (card.dimension && scores[card.dimension] !== undefined) scores[card.dimension] += 1; });
  state.rankedCards.forEach((card, idx) => { const bonus = 5 - idx; if (card.dimension && scores[card.dimension] !== undefined) scores[card.dimension] += bonus; });
  
  const finalKey = calculateResultKey(scores);
  
  // 1. 기존 UI 업데이트 (그래프, 추천 직업 등)
  renderReport(finalKey, scores); 
  transition(el.adsOverlay, el.resultSection, 'block'); 

  // 2. 신규 AI 리포트 생성 및 표시 함수 호출
  const userResults = {
    finalKey: finalKey,
    scores: scores,
    rankedCards: state.rankedCards
  };
  
  // 기존 generateAIReport 대신 신규 함수 호출
  generateAndDisplayReport(userResults, state.contentsDB);
}

// ... (나머지 init, loadData, renderStack 등 기존 코드 유지)

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
  if (el.resSummary) el.resSummary.textContent = data.summary || "상세 설명이 없습니다.";
  if (el.resTag) el.resTag.textContent = key;
  if (el.resTraits) el.resTraits.textContent = data.traits?.desc || (typeof data.traits === 'string' ? data.traits : "");
  if (el.resEnergy && el.resEnergyContainer) { el.resEnergy.textContent = data.traits?.energy || ""; el.resEnergyContainer.style.display = data.traits?.energy ? 'block' : 'none'; }
  if (el.resJobs) el.resJobs.innerHTML = (data.job_families || []).map(j => `<span class="px-6 py-3 bg-blue-50 text-blue-700 rounded-2xl text-sm font-black border border-blue-100">${j}</span>`).join('');
  if (el.resMajors) el.resMajors.innerHTML = (data.majors || []).map(m => `<span class="px-4 py-2 bg-indigo-50 text-indigo-700 rounded-xl text-xs font-bold border border-indigo-100">${m}</span>`).join('');
  if (el.resGallery) { el.resGallery.innerHTML = ''; state.top9Cards.forEach(card => { const cardEl = document.createElement('div'), rankIdx = state.rankedCards.findIndex(rc => rc.id === card.id), folder = state.mode === 'child' ? 'kids' : 'adult', keywordKey = 'keyword_' + state.lang.toLowerCase(), keyword = card[keywordKey] || card.keyword; cardEl.className = 'relative rounded-xl overflow-hidden aspect-[3/4] shadow-sm border border-slate-100 bg-white group'; cardEl.innerHTML = `<img src="/assets/images/${folder}/${card[state.mode].img}" class="w-full h-full object-cover grayscale-[0.2]" onerror="this.src='https://placehold.co/400x500?text=${keyword}'"><div class="absolute inset-0 bg-gradient-to-t from-slate-900/80 via-transparent to-transparent"></div><div class="absolute bottom-2 left-2 right-2 text-center text-white text-[9px] font-black uppercase truncate">${keyword}</div>${rankIdx > -1 ? `<div class="absolute top-2 right-2 w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-black border-2 border-white shadow-lg ${getRankColorClass(rankIdx)} text-white">${rankIdx + 1}</div>` : ''}`; el.resGallery.appendChild(cardEl); }); }
  const max = Math.max(...Object.values(scores), 1);
  ['D','I','P','T'].forEach(k => { const sEl = document.getElementById(`score-${k}`), bEl = document.getElementById(`bar-${k}`); if (sEl) sEl.textContent = scores[k]; if (bEl && window.gsap) gsap.to(bEl, { width: `${(scores[k]/max)*100}%`, duration: 1.5, ease: "power4.out" }); });
  const pointer = document.getElementById('result-pointer');
  if (pointer && window.gsap) { const xCoord = scores.T - scores.P, yCoord = scores.D - scores.I; gsap.to(pointer, { left: `calc(50% + ${Math.max(-1, Math.min(1, xCoord/15))*50}%)`, top: `calc(50% + ${-Math.max(-1, Math.min(1, yCoord/15))*50}%)`, opacity: 1, duration: 2, ease: "elastic.out(1, 0.4)", delay: 0.5 }); }
}

function getRankColorClass(rank) { if (rank === 0) return 'bg-amber-400'; if (rank === 1) return 'bg-slate-400'; if (rank === 2) return 'bg-orange-400'; return 'bg-blue-600'; }

function transition(from, to, display = 'block') {
  if (!from || !to) return; from.classList.add('hidden'); from.style.display = 'none'; to.classList.remove('hidden'); to.style.display = display; window.scrollTo({ top: 0, behavior: 'instant' }); document.body.scrollTop = 0; document.documentElement.scrollTop = 0; setTimeout(() => window.scrollTo({ top: 0, behavior: 'instant' }), 10);
  if (window.gsap) { gsap.set(to, { clearProps: "all" }); gsap.fromTo(to, { opacity: 0, y: 0 }, { opacity: 1, y: 0, duration: 0.4, ease: "power2.out", clearProps: "all" }); } else { to.style.opacity = '1'; to.style.transform = 'none'; }
}

document.addEventListener('DOMContentLoaded', init);
// ... (기존 loadData 및 기타 로직 유지)
