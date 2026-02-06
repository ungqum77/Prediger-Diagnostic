import { GoogleGenAI } from "@google/genai";

// --- STATE MANAGEMENT ---
const state = {
  language: 'EN', // 'EN' or 'KR'
  step: 'INTRO',
  user: { name: '', age: 0, group: 'CHILD' }, // group: CHILD (<13) or ADULT
  cards: [],
  likedCards: [],
  rankedCards: [], // IDs of top 3
  currentIndex: 0
};

// --- CONSTANTS & ASSETS ---
const ASSETS_PATH = 'assets/images';

// Fallback Data
const FALLBACK_CARDS_EN = [
  { id: 1, type: "D", keyword: "Recording", img: "card_01_D_records.png", desc: "Likes recording and organizing data." },
  { id: 2, type: "I", keyword: "Ideas", img: "card_02_I_ideas.png", desc: "Likes imagining and coming up with new ideas." },
  { id: 3, type: "P", keyword: "Helping", img: "card_03_P_help.png", desc: "Likes listening to friends' problems." },
  { id: 4, type: "T", keyword: "Making", img: "card_04_T_make.png", desc: "Likes assembling or making things by hand." },
  { id: 5, type: "D", keyword: "Analyzing", img: "card_05_D_analyze.png", desc: "Likes checking numbers or information." },
  { id: 6, type: "T", keyword: "Machines", img: "card_06_T_machine.png", desc: "Likes working with tools or machines." },
  { id: 7, type: "I", keyword: "Researching", img: "card_07_I_research.png", desc: "Likes digging deep into questions." },
  { id: 8, type: "P", keyword: "Teaching", img: "card_08_P_teach.png", desc: "Likes teaching knowledge to others." }
];

const FALLBACK_CARDS_KR = [
  { id: 1, type: "D", keyword: "기록하기", img: "card_01_D_records.png", desc: "자료를 기록하고 정리하는 것을 좋아합니다." },
  { id: 2, type: "I", keyword: "아이디어", img: "card_02_I_ideas.png", desc: "새로운 생각을 떠올리고 상상하는 것을 좋아합니다." },
  { id: 3, type: "P", keyword: "도와주기", img: "card_03_P_help.png", desc: "친구들의 고민을 들어주고 돕는 것을 좋아합니다." },
  { id: 4, type: "T", keyword: "만들기", img: "card_04_T_make.png", desc: "손으로 물건을 조립하거나 만드는 것을 좋아합니다." },
  { id: 5, type: "D", keyword: "분석하기", img: "card_05_D_analyze.png", desc: "숫자나 정보를 꼼꼼하게 따져보는 것을 좋아합니다." },
  { id: 6, type: "T", keyword: "기계 다루기", img: "card_06_T_machine.png", desc: "도구나 기계를 사용하여 작업하는 것을 좋아합니다." },
  { id: 7, type: "I", keyword: "연구하기", img: "card_07_I_research.png", desc: "궁금한 것을 깊이 파고들어 연구하는 것을 좋아합니다." },
  { id: 8, type: "P", keyword: "가르치기", img: "card_08_P_teach.png", desc: "다른 사람에게 지식을 알려주는 것을 좋아합니다." }
];

const CONTENT_DB = {
  "DATA_THINGS": { title: "Realistic Analyst", jobs: ["Engineer", "Accountant"], summary: "Systematic and skilled with tools." },
  "DATA_PEOPLE": { title: "Systematic Manager", jobs: ["Administrator", "Banker"], summary: "Organized and supportive." },
  "IDEAS_THINGS": { title: "Creative Investigator", jobs: ["Scientist", "Developer"], summary: "Curious and innovative." },
  "IDEAS_PEOPLE": { title: "Passionate Artist", jobs: ["Artist", "Teacher"], summary: "Expressive and helpful." },
  "UNKNOWN": { title: "Balanced Explorer", jobs: ["Consultant", "Planner"], summary: "Well-rounded interests." }
};

// --- DOM ELEMENTS (Initialized in init) ---
let screens = {};

// --- INIT ---
function init() {
  screens = {
    intro: document.getElementById('intro-section'),
    sorting: document.getElementById('sorting-section'),
    ranking: document.getElementById('ranking-section'),
    result: document.getElementById('result-section')
  };
  
  initIntro();
}

// Handle Module Loading Timing
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  // DOM already ready, run immediately
  init();
}

// --- STEP 1: INTRO ---
function initIntro() {
  const form = document.getElementById('intro-form');
  const langBtn = document.getElementById('lang-toggle');

  if (window.gsap) {
    gsap.from(".intro-anim", {
      y: 20,
      opacity: 0,
      duration: 0.8,
      stagger: 0.1,
      ease: "power3.out"
    });
  }

  langBtn.addEventListener('click', () => {
    state.language = state.language === 'EN' ? 'KR' : 'EN';
    langBtn.textContent = state.language === 'EN' ? 'Switch to Korean' : '영어로 변경';
    document.querySelector('h1').innerHTML = state.language === 'EN' ? 'Career<br>Diagnosis' : '나의 직업<br>진단하기';
    document.querySelector('p').textContent = state.language === 'EN' ? 'Discover your potential.' : '나의 잠재력을 발견해보세요.';
    const btnText = document.querySelector('button[type="submit"] span').previousSibling;
    if (btnText) btnText.textContent = state.language === 'EN' ? 'Start Diagnosis ' : '진단 시작하기 ';
  });

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const nameInput = document.getElementById('username');
    const birthInput = document.getElementById('birthdate');
    
    if (!nameInput.value || !birthInput.value) {
      alert("Please fill in all fields.");
      return;
    }

    const age = new Date().getFullYear() - new Date(birthInput.value).getFullYear();
    state.user = { name: nameInput.value, age, group: age < 13 ? 'CHILD' : 'ADULT' };

    // Change button state to indicate loading
    const btn = form.querySelector('button[type="submit"]');
    const originalText = btn.innerHTML;
    btn.innerHTML = `<span class="animate-spin inline-block mr-2">⟳</span> Loading...`;
    btn.disabled = true;

    try {
      await loadData();

      // Transition
      if (window.gsap) {
        gsap.to(screens.intro, {
          opacity: 0, 
          y: -20, 
          duration: 0.4, 
          onComplete: () => {
            screens.intro.classList.add('hidden');
            initSorting();
          }
        });
      } else {
        screens.intro.classList.add('hidden');
        initSorting();
      }
    } catch (err) {
      console.error("Initialization failed", err);
      btn.innerHTML = originalText;
      btn.disabled = false;
      alert("Failed to load data. Please try again.");
    }
  });
}

async function loadData() {
  try {
    const filename = state.language === 'KR' ? 'cards_kr.json' : 'cards_en.json';
    const response = await fetch(`assets/data/${filename}`);
    if (!response.ok) throw new Error('File not found');
    state.cards = await response.json();
  } catch (e) {
    console.warn("Using fallback data. JSON file missing or fetch error.", e);
    state.cards = state.language === 'KR' ? FALLBACK_CARDS_KR : FALLBACK_CARDS_EN;
  }
}

// --- STEP 2: SORTING (TINDER SWIPE) ---
function initSorting() {
  screens.sorting.classList.remove('hidden');
  screens.sorting.style.opacity = 1;
  state.currentIndex = 0;
  state.likedCards = [];
  
  updateProgress();
  renderCardStack();
  
  // Controls
  document.getElementById('btn-dislike').onclick = () => autoSwipe('left');
  document.getElementById('btn-like').onclick = () => autoSwipe('right');
  document.getElementById('btn-pass').onclick = () => autoSwipe('up');
  document.getElementById('back-to-intro').onclick = () => location.reload();
}

function renderCardStack() {
  const container = document.getElementById('card-stack');
  container.innerHTML = '';

  // Render top 3 cards for stack effect
  const stack = state.cards.slice(state.currentIndex, state.currentIndex + 3).reverse();
  
  stack.forEach((card, index) => {
    const isTop = index === stack.length - 1;
    const el = document.createElement('div');
    el.className = 'card-item border-2 border-gray-100';
    
    const folder = state.user.group === 'CHILD' ? 'kids' : 'adult';
    // Use fallback image if asset missing in dev
    const imgSrc = `${ASSETS_PATH}/${folder}/${card.img}`;
    
    el.innerHTML = `
      <div class="relative w-full h-[70%] bg-gray-100 overflow-hidden">
        <img src="${imgSrc}" class="w-full h-full object-cover pointer-events-none" onerror="this.src='https://picsum.photos/300/400?random=${card.id}'">
        <div class="stamp stamp-like">LIKE</div>
        <div class="stamp stamp-nope">NOPE</div>
      </div>
      <div class="p-5 h-[30%] bg-white flex flex-col justify-center">
        <h3 class="text-xl font-bold text-gray-800 mb-1">${card.keyword}</h3>
        <p class="text-sm text-gray-500 leading-snug line-clamp-2">${card.desc}</p>
      </div>
      <div class="absolute top-3 right-3 bg-white/90 backdrop-blur px-2 py-1 rounded text-[10px] font-bold text-gray-400 border border-gray-200">
        ${card.type}
      </div>
    `;

    // Stack visual offset
    const offsetIndex = stack.length - 1 - index;
    if (window.gsap) {
      gsap.set(el, {
        scale: 1 - offsetIndex * 0.05,
        y: offsetIndex * 10,
        zIndex: index
      });
    }

    container.appendChild(el);

    if (isTop) setupDraggable(el, card);
  });

  // Fan out animation on first load
  if (state.currentIndex === 0 && window.gsap) {
    gsap.from(".card-item", {
      y: 200, opacity: 0, rotate: -10, duration: 0.8, stagger: 0.1, ease: "back.out(1)"
    });
  }
}

function setupDraggable(el, card) {
  if (!window.Draggable) return;
  
  Draggable.create(el, {
    type: "x,y",
    edgeResistance: 0.65,
    bounds: document.getElementById('app'),
    throwProps: true,
    onDrag: function() {
      const rot = this.x * 0.05;
      if (window.gsap) gsap.set(el, { rotation: rot });
      
      const likeOpacity = Math.min(1, Math.max(0, this.x / 100));
      const nopeOpacity = Math.min(1, Math.max(0, -this.x / 100));
      
      if (window.gsap) {
        gsap.set(el.querySelector('.stamp-like'), { opacity: likeOpacity });
        gsap.set(el.querySelector('.stamp-nope'), { opacity: nopeOpacity });
      }
    },
    onDragEnd: function() {
      if (this.x > 100) animateSwipe(el, 'right', card);
      else if (this.x < -100) animateSwipe(el, 'left', card);
      else if (this.y < -100) animateSwipe(el, 'up', card);
      else {
        if (window.gsap) {
          gsap.to(el, { x: 0, y: 0, rotation: 0, duration: 0.5, ease: "elastic.out(1, 0.5)" });
          gsap.to(el.querySelectorAll('.stamp'), { opacity: 0, duration: 0.2 });
        }
      }
    }
  });
}

function autoSwipe(dir) {
  const topCard = document.querySelector('.card-item:last-child');
  if (topCard) animateSwipe(topCard, dir, state.cards[state.currentIndex]);
}

function animateSwipe(el, dir, card) {
  let props = { duration: 0.4, ease: "power1.in" };
  
  if (dir === 'right') {
    props.x = 500; props.rotation = 20;
    state.likedCards.push(card.id);
  } else if (dir === 'left') {
    props.x = -500; props.rotation = -20;
  } else {
    props.y = -500;
  }

  const onComplete = () => {
    state.currentIndex++;
    updateProgress();
    if (state.currentIndex >= state.cards.length) {
      finishSorting();
    } else {
      renderCardStack();
    }
  };

  if (window.gsap) {
    gsap.to(el, {
      ...props,
      onComplete: onComplete
    });
  } else {
    // Fallback if no GSAP
    onComplete();
  }
}

function updateProgress() {
  const pct = (state.currentIndex / state.cards.length) * 100;
  document.getElementById('progress-bar').style.width = `${pct}%`;
  document.getElementById('progress-text').textContent = `${state.currentIndex + 1} / ${state.cards.length}`;
}

function finishSorting() {
  if (window.gsap) {
    gsap.to(screens.sorting, {
      opacity: 0,
      duration: 0.3,
      onComplete: () => {
        screens.sorting.classList.add('hidden');
        initRanking();
      }
    });
  } else {
    screens.sorting.classList.add('hidden');
    initRanking();
  }
}

// --- STEP 3: RANKING ---
function initRanking() {
  screens.ranking.classList.remove('hidden');
  state.rankedCards = [];
  
  const grid = document.getElementById('ranking-grid');
  grid.innerHTML = '';
  
  const relevantCards = state.cards.filter(c => state.likedCards.includes(c.id));
  
  // Handle empty likes
  if (relevantCards.length === 0) {
     grid.innerHTML = `<div class="col-span-2 text-center py-10 text-gray-400">No cards liked.<br>Restarting...</div>`;
     setTimeout(() => location.reload(), 2000);
     return;
  }

  relevantCards.forEach(card => {
    const el = document.createElement('div');
    const folder = state.user.group === 'CHILD' ? 'kids' : 'adult';
    const imgSrc = `${ASSETS_PATH}/${folder}/${card.img}`;
    
    el.className = 'rank-card relative rounded-xl overflow-hidden shadow-sm bg-white cursor-pointer border border-gray-100 aspect-[3/4]';
    el.innerHTML = `
      <img src="${imgSrc}" class="w-full h-full object-cover opacity-90" onerror="this.src='https://picsum.photos/300/400?random=${card.id}'">
      <div class="absolute inset-0 bg-black/0 hover:bg-black/5 transition-colors"></div>
      <div class="absolute bottom-0 left-0 right-0 p-2 bg-gradient-to-t from-black/60 to-transparent">
        <span class="text-white font-bold text-xs">${card.keyword}</span>
      </div>
      <div class="badge-container absolute top-2 right-2"></div>
    `;
    
    el.onclick = () => toggleRank(card.id, el);
    grid.appendChild(el);
  });

  document.getElementById('btn-finish-ranking').onclick = initResult;
  updateRankUI();
}

function toggleRank(id, el) {
  if (state.rankedCards.includes(id)) {
    state.rankedCards = state.rankedCards.filter(cid => cid !== id);
  } else {
    if (state.rankedCards.length < 3) {
      state.rankedCards.push(id);
    }
  }
  updateRankUI();
}

function updateRankUI() {
  const cards = document.querySelectorAll('.rank-card');
  const relevantCards = state.cards.filter(c => state.likedCards.includes(c.id));

  cards.forEach((el, index) => {
    const cardId = relevantCards[index].id;
    const rankIndex = state.rankedCards.indexOf(cardId);
    
    if (rankIndex !== -1) {
      el.classList.add('selected');
      el.querySelector('.badge-container').innerHTML = `
        <div class="rank-badge w-6 h-6 bg-[#1E88E5] text-white rounded-full flex items-center justify-center font-bold text-xs shadow-md border border-white">
          ${rankIndex + 1}
        </div>
      `;
    } else {
      el.classList.remove('selected');
      el.querySelector('.badge-container').innerHTML = '';
    }
  });

  const btn = document.getElementById('btn-finish-ranking');
  const counter = document.getElementById('rank-counter');
  
  counter.textContent = `${state.rankedCards.length}/3`;
  
  if (state.rankedCards.length === 3) {
    btn.disabled = false;
    btn.classList.replace('bg-gray-300', 'bg-[#1E88E5]');
    btn.classList.add('shadow-blue-500/30');
  } else {
    btn.disabled = true;
    btn.classList.replace('bg-[#1E88E5]', 'bg-gray-300');
    btn.classList.remove('shadow-blue-500/30');
  }
}

// --- STEP 4: RESULT ---
async function initResult() {
  screens.ranking.classList.add('hidden');
  screens.result.classList.remove('hidden');

  // 1. Calculate Scores
  const scores = { D: 0, I: 0, P: 0, T: 0 };
  
  // Points from Likes (+1)
  state.likedCards.forEach(id => {
    const c = state.cards.find(x => x.id === id);
    if(c) scores[c.type]++;
  });
  
  // Points from Ranking (+3, +2, +1)
  state.rankedCards.forEach((id, idx) => {
    const c = state.cards.find(x => x.id === id);
    if(c) scores[c.type] += (3 - idx);
  });

  // Calculate Coordinates
  const x = scores.T - scores.P;
  const y = scores.D - scores.I;
  
  // Determine Type
  let typeKey = "UNKNOWN";
  if (y >= 0 && x >= 0) typeKey = "DATA_THINGS";
  if (y >= 0 && x < 0) typeKey = "DATA_PEOPLE";
  if (y < 0 && x >= 0) typeKey = "IDEAS_THINGS";
  if (y < 0 && x < 0) typeKey = "IDEAS_PEOPLE";

  // Render Static Content
  const resultData = CONTENT_DB[typeKey] || CONTENT_DB["UNKNOWN"];
  
  document.getElementById('result-title').textContent = resultData.title;
  document.getElementById('result-summary').textContent = resultData.summary;
  document.getElementById('result-coords').textContent = `Prediger: X(${x}) Y(${y})`;
  
  const jobContainer = document.getElementById('result-jobs');
  jobContainer.innerHTML = resultData.jobs.map(j => 
    `<span class="px-2 py-1 bg-white rounded-md text-xs font-bold text-gray-600 border border-blue-100">${j}</span>`
  ).join('');

  // Animate Charts
  const maxScore = Math.max(scores.D, scores.I, scores.P, scores.T, 10);
  
  ['D', 'I', 'P', 'T'].forEach(type => {
    document.getElementById(`score-${type}`).textContent = scores[type];
    if (window.gsap) {
      gsap.to(`#bar-${type}`, {
        width: `${(scores[type] / maxScore) * 100}%`,
        duration: 1.2,
        ease: "power3.out",
        delay: 0.2
      });
    } else {
      document.getElementById(`bar-${type}`).style.width = `${(scores[type] / maxScore) * 100}%`;
    }
  });

  // Fetch AI Analysis
  const topCards = state.rankedCards.map(id => state.cards.find(c => c.id === id)).filter(Boolean);
  await generateAIAnalysis(topCards);

  document.getElementById('btn-restart').onclick = () => location.reload();
}

async function generateAIAnalysis(topCards) {
  const loading = document.getElementById('ai-loading');
  const content = document.getElementById('ai-content');
  
  try {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const keywords = topCards.map(c => c.keyword).join(", ");
    
    const prompt = `Analyze career path for a user interested in: ${keywords}. 
    Provide a professional, encouraging 3-sentence summary suitable for a ${state.user.group.toLowerCase()}.`;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-lite-latest',
      contents: prompt
    });

    loading.classList.add('hidden');
    content.textContent = response.text;
    content.classList.remove('hidden');
    
    // Fade in text
    if (window.gsap) {
      gsap.from(content, { opacity: 0, y: 10 });
    }

  } catch (error) {
    console.error("AI Error:", error);
    loading.classList.add('hidden');
    content.textContent = "AI analysis currently unavailable. Please try again later.";
    content.classList.remove('hidden');
  }
}
