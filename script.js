import { GoogleGenAI } from "@google/genai";

// --- STATE ---
const state = {
  language: 'EN', 
  step: 'INTRO',
  user: { name: '', age: 0, group: 'CHILD' },
  cards: [],
  likedCards: [],
  rankedCards: [],
  currentIndex: 0
};

// --- CONFIG ---
const ASSETS_DATA_PATH = 'assets/data';
const ASSETS_IMG_PATH = 'assets/images';

const CONTENT_DB_FALLBACK = {
  "UNKNOWN": { title: "Explorer", summary: "Keep exploring!", jobs: [] }
};

// --- DOM INIT ---
let screens = {};

function init() {
  screens = {
    intro: document.getElementById('intro-section'),
    sorting: document.getElementById('sorting-section'),
    ranking: document.getElementById('ranking-section'),
    result: document.getElementById('result-section')
  };

  initIntro();
}

// Module Load Safety
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}

// --- 1. INTRO ---
function initIntro() {
  const form = document.getElementById('intro-form');
  const langBtn = document.getElementById('lang-toggle');

  if (window.gsap) {
    gsap.from(".intro-anim", {
      y: 20, opacity: 0, duration: 0.8, stagger: 0.1, ease: "power3.out"
    });
  }

  langBtn.addEventListener('click', () => {
    state.language = state.language === 'EN' ? 'KR' : 'EN';
    langBtn.textContent = state.language === 'EN' ? 'Switch to Korean' : '영어로 변경';
    document.querySelector('h1').innerHTML = state.language === 'EN' ? 'Prediger<br>Diagnosis' : '프레디저<br>적성 검사';
    document.querySelector('.intro-content p').textContent = state.language === 'EN' ? 'Discover your potential.' : '나의 잠재력을 발견해보세요.';
    
    const submitBtn = form.querySelector('button');
    submitBtn.innerHTML = state.language === 'EN' 
      ? `Start Diagnosis <span class="text-lg">&rarr;</span>` 
      : `진단 시작하기 <span class="text-lg">&rarr;</span>`;
  });

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const nameInput = document.getElementById('username');
    const birthInput = document.getElementById('birthdate');
    
    if (!nameInput.value || !birthInput.value) return;

    const age = new Date().getFullYear() - new Date(birthInput.value).getFullYear();
    state.user = { 
      name: nameInput.value, 
      age, 
      group: age < 13 ? 'CHILD' : 'ADULT' 
    };

    const btn = form.querySelector('button');
    const oldText = btn.innerHTML;
    btn.innerHTML = `<span class="animate-spin inline-block mr-2">⟳</span> Loading...`;
    btn.disabled = true;

    try {
      await loadData();
      
      if (window.gsap) {
        gsap.to(screens.intro, {
          opacity: 0, scale: 0.95, duration: 0.4, 
          onComplete: () => {
            screens.intro.classList.add('hidden');
            screens.intro.style.display = 'none';
            initSorting();
          }
        });
      } else {
        screens.intro.classList.add('hidden');
        initSorting();
      }
    } catch (err) {
      console.error(err);
      btn.innerHTML = oldText;
      btn.disabled = false;
      alert("Failed to load data. Ensure assets/data/ exists.");
    }
  });
}

async function loadData() {
  const file = state.language === 'KR' ? 'cards_kr.json' : 'cards_en.json';
  const res = await fetch(`${ASSETS_DATA_PATH}/${file}`);
  if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
  state.cards = await res.json();
}

// --- 2. SORTING ---
function initSorting() {
  screens.sorting.classList.remove('hidden');
  screens.sorting.style.display = 'flex';
  
  gsap.from(screens.sorting, { opacity: 0, y: 20, duration: 0.5 });

  state.currentIndex = 0;
  state.likedCards = [];
  
  document.getElementById('sorting-instruction').textContent = state.language === 'EN' 
    ? `What interests ${state.user.name}?` 
    : `${state.user.name}님은 무엇을 좋아하나요?`;
    
  updateProgress();
  renderCardStack();
  
  document.getElementById('btn-dislike').onclick = () => autoSwipe('left');
  document.getElementById('btn-like').onclick = () => autoSwipe('right');
  document.getElementById('btn-pass').onclick = () => autoSwipe('up');
  document.getElementById('back-to-intro').onclick = () => location.reload();
}

function renderCardStack() {
  const container = document.getElementById('card-stack');
  container.innerHTML = '';
  
  const stack = state.cards.slice(state.currentIndex, state.currentIndex + 3).reverse();
  
  stack.forEach((card, index) => {
    const isTop = index === stack.length - 1;
    const el = document.createElement('div');
    el.className = 'card-item border border-gray-200';
    
    const folder = state.user.group === 'CHILD' ? 'kids' : 'adult';
    const imgSrc = `${ASSETS_IMG_PATH}/${folder}/${card.img}`;
    
    el.innerHTML = `
      <div class="relative w-full h-[75%] bg-gray-100 overflow-hidden">
        <img src="${imgSrc}" class="w-full h-full object-cover pointer-events-none" 
          onerror="this.src='https://placehold.co/300x400?text=No+Image'">
        <div class="stamp stamp-like">LIKE</div>
        <div class="stamp stamp-nope">NOPE</div>
      </div>
      <div class="p-6 h-[25%] bg-white flex flex-col justify-center text-center">
        <h3 class="text-xl font-bold text-gray-800 mb-1">${card.keyword}</h3>
        <p class="text-sm text-gray-500 line-clamp-2 leading-relaxed">${card.desc}</p>
      </div>
      <div class="absolute top-4 right-4 bg-white/90 backdrop-blur px-2 py-1 rounded-md text-[10px] font-bold text-gray-400 border border-gray-200 shadow-sm">
        ${card.type}
      </div>
    `;

    const offsetIndex = stack.length - 1 - index;
    gsap.set(el, {
      scale: 1 - offsetIndex * 0.04,
      y: offsetIndex * 12,
      zIndex: index
    });

    container.appendChild(el);

    if (isTop) setupDraggable(el, card);
  });
}

function setupDraggable(el, card) {
  if (!window.Draggable) return;
  
  Draggable.create(el, {
    type: "x,y",
    edgeResistance: 0.65,
    bounds: screens.sorting,
    throwProps: true,
    onDrag: function() {
      const rot = this.x * 0.05;
      gsap.set(el, { rotation: rot });
      
      const likeOpacity = Math.min(1, Math.max(0, this.x / 100));
      const nopeOpacity = Math.min(1, Math.max(0, -this.x / 100));
      
      gsap.set(el.querySelector('.stamp-like'), { opacity: likeOpacity });
      gsap.set(el.querySelector('.stamp-nope'), { opacity: nopeOpacity });
    },
    onDragEnd: function() {
      if (this.x > 100) animateSwipe(el, 'right', card);
      else if (this.x < -100) animateSwipe(el, 'left', card);
      else if (this.y < -100) animateSwipe(el, 'up', card);
      else {
        gsap.to(el, { x: 0, y: 0, rotation: 0, duration: 0.4, ease: "back.out(1.5)" });
        gsap.to(el.querySelectorAll('.stamp'), { opacity: 0, duration: 0.2 });
      }
    }
  });
}

function autoSwipe(dir) {
  const topCard = document.querySelector('.card-item:last-child');
  if (topCard) animateSwipe(topCard, dir, state.cards[state.currentIndex]);
}

function animateSwipe(el, dir, card) {
  let x = 0, y = 0, rot = 0;
  
  if (dir === 'right') { x = 600; rot = 30; state.likedCards.push(card); addLikedSidebar(card); }
  else if (dir === 'left') { x = -600; rot = -30; }
  else { y = -600; }

  gsap.to(el, {
    x, y, rotation: rot, opacity: 0, duration: 0.4, ease: "power1.in",
    onComplete: () => {
      state.currentIndex++;
      if (state.currentIndex >= state.cards.length) {
        finishSorting();
      } else {
        updateProgress();
        renderCardStack();
      }
    }
  });
}

function updateProgress() {
  const pct = (state.currentIndex / state.cards.length) * 100;
  document.getElementById('progress-bar').style.width = `${pct}%`;
  document.getElementById('progress-text').textContent = `${state.currentIndex + 1} / ${state.cards.length}`;
}

function addLikedSidebar(card) {
  const list = document.getElementById('liked-list-sidebar');
  if (list.children[0]?.classList.contains('italic')) list.innerHTML = '';
  
  const item = document.createElement('div');
  item.className = "flex items-center gap-2 p-2 bg-gray-50 rounded-lg border border-gray-100 animate-[fadeIn_0.3s_ease-out]";
  item.innerHTML = `
    <span class="w-2 h-2 rounded-full bg-blue-500"></span>
    <span class="text-xs font-bold text-gray-700">${card.keyword}</span>
  `;
  list.prepend(item);
}

function finishSorting() {
  gsap.to(screens.sorting, {
    opacity: 0, duration: 0.3,
    onComplete: () => {
      screens.sorting.classList.add('hidden');
      screens.sorting.style.display = 'none';
      initRanking();
    }
  });
}

// --- 3. RANKING ---
function initRanking() {
  screens.ranking.classList.remove('hidden');
  screens.ranking.style.display = 'flex';
  gsap.from(screens.ranking, { opacity: 0, y: 20, duration: 0.5 });
  
  state.rankedCards = [];
  const grid = document.getElementById('ranking-grid');
  grid.innerHTML = '';
  
  if (state.likedCards.length === 0) {
    grid.innerHTML = `<div class="col-span-full text-center py-20 text-gray-400">No cards liked.<br><button onclick="location.reload()" class="underline text-blue-500 mt-2">Restart</button></div>`;
    return;
  }

  state.likedCards.forEach(card => {
    const el = document.createElement('div');
    const folder = state.user.group === 'CHILD' ? 'kids' : 'adult';
    const imgSrc = `${ASSETS_IMG_PATH}/${folder}/${card.img}`;
    
    el.className = 'rank-card relative rounded-2xl overflow-hidden bg-white cursor-pointer border border-gray-100 shadow-sm aspect-[3/4] group';
    el.innerHTML = `
      <img src="${imgSrc}" class="w-full h-full object-cover opacity-90 transition-transform duration-500 group-hover:scale-110" 
        onerror="this.src='https://placehold.co/300x400'">
      <div class="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent opacity-60"></div>
      <div class="absolute bottom-3 left-3 right-3">
        <span class="text-white font-bold text-sm drop-shadow-md">${card.keyword}</span>
      </div>
      <div class="badge-container absolute top-3 right-3"></div>
    `;
    
    el.onclick = () => toggleRank(card.id, el);
    grid.appendChild(el);
  });

  const btn = document.getElementById('btn-finish-ranking');
  btn.onclick = initResult;
  updateRankUI();
}

function toggleRank(id, el) {
  if (state.rankedCards.includes(id)) {
    state.rankedCards = state.rankedCards.filter(cid => cid !== id);
  } else {
    if (state.rankedCards.length < 3) state.rankedCards.push(id);
  }
  updateRankUI();
}

function updateRankUI() {
  const cards = document.getElementById('ranking-grid').children;
  
  Array.from(cards).forEach((el, idx) => {
    const cardId = state.likedCards[idx].id; 
    const rankIndex = state.rankedCards.indexOf(cardId);
    
    if (rankIndex !== -1) {
      el.classList.add('selected');
      el.querySelector('.badge-container').innerHTML = `
        <div class="rank-badge w-8 h-8 bg-[#1E88E5] text-white rounded-full flex items-center justify-center font-bold text-lg shadow-md border-2 border-white">
          ${rankIndex + 1}
        </div>
      `;
    } else {
      el.classList.remove('selected');
      el.querySelector('.badge-container').innerHTML = '';
    }
  });

  const count = state.rankedCards.length;
  document.getElementById('rank-counter').textContent = `${count}/3`;
  document.getElementById('rank-counter-desktop').textContent = count;
  
  const btn = document.getElementById('btn-finish-ranking');
  if (count === 3) {
    btn.disabled = false;
    btn.classList.replace('bg-gray-200', 'bg-[#1E88E5]');
    btn.classList.replace('text-gray-400', 'text-white');
    btn.classList.add('shadow-lg', 'shadow-blue-500/30', 'hover:bg-blue-600');
  } else {
    btn.disabled = true;
    btn.classList.replace('bg-[#1E88E5]', 'bg-gray-200');
    btn.classList.replace('text-white', 'text-gray-400');
    btn.classList.remove('shadow-lg', 'shadow-blue-500/30', 'hover:bg-blue-600');
  }
}

// --- 4. RESULT ---
async function initResult() {
  screens.ranking.classList.add('hidden');
  screens.ranking.style.display = 'none';
  screens.result.classList.remove('hidden');
  
  // Fetch Content DB
  const contentFile = state.language === 'KR' ? 'contents_db_kr.json' : 'contents_db_en.json';
  let contentDB = CONTENT_DB_FALLBACK;
  try {
    const res = await fetch(`${ASSETS_DATA_PATH}/${contentFile}`);
    if (res.ok) contentDB = await res.json();
  } catch(e) { console.error(e); }

  // Calc Scores
  const scores = { D: 0, I: 0, P: 0, T: 0 };
  state.likedCards.forEach(c => scores[c.type]++); // +1 for liked
  state.rankedCards.forEach((id, idx) => { // +3, +2, +1 for ranked
    const c = state.likedCards.find(x => x.id === id);
    if(c) scores[c.type] += (3 - idx);
  });

  // Coordinates: X = Things - People, Y = Data - Ideas
  const x = scores.T - scores.P;
  const y = scores.D - scores.I;
  
  // Determine Type
  let typeKey = "UNKNOWN";
  if (y >= 0 && x >= 0) typeKey = "DATA_THINGS";
  if (y >= 0 && x < 0) typeKey = "DATA_PEOPLE";
  if (y < 0 && x >= 0) typeKey = "IDEAS_THINGS";
  if (y < 0 && x < 0) typeKey = "IDEAS_PEOPLE";

  const data = contentDB[typeKey] || contentDB["UNKNOWN"];
  
  // UI Update Text
  document.getElementById('result-title').textContent = data.title;
  document.getElementById('result-summary').textContent = data.summary;
  document.getElementById('result-coords').textContent = `X: ${x} / Y: ${y}`;
  
  const jobsEl = document.getElementById('result-jobs');
  jobsEl.innerHTML = (data.jobs || []).map(j => 
    `<span class="px-3 py-1 bg-white rounded-lg text-sm font-bold text-gray-700 border border-blue-100 shadow-sm">${j}</span>`
  ).join('');

  // Update Map Position
  // Assuming max score per axis is roughly 15 (12 cards + rank bonuses)
  // We clamp values to -100% to 100% relative to center
  const MAX_SCALE = 15;
  const xPercent = Math.max(-1, Math.min(1, x / MAX_SCALE)) * 50; // 50% max movement from center
  const yPercent = Math.max(-1, Math.min(1, y / MAX_SCALE)) * 50;
  
  // Invert Y because CSS top is 0, typically Y+ is up (top)
  // If Y is Data (Top), then yPercent should move UP (negative translate Y relative to center?)
  // Let's assume standard math cartesian: Y+ is Up. CSS Y+ is Down.
  // So -yPercent for visual Y axis.
  const visualX = xPercent;
  const visualY = -yPercent;

  const dot = document.getElementById('map-dot');
  // Use translate3d for performance, keeping centering translate(-50%, -50%)
  // GSAP or direct style
  if (window.gsap) {
    gsap.to(dot, { 
      xPercent: visualX * 2, // GSAP xPercent is relative to element width? No, use x/y pixels or %
      // Easier: just set CSS left/top percentages
      left: `${50 + visualX}%`,
      top: `${50 + visualY}%`,
      opacity: 1,
      duration: 1.5,
      ease: "elastic.out(1, 0.7)",
      delay: 0.2
    });
  } else {
    dot.style.left = `${50 + visualX}%`;
    dot.style.top = `${50 + visualY}%`;
    dot.style.opacity = 1;
  }

  // Update Bar Charts
  const max = Math.max(scores.D, scores.I, scores.P, scores.T, 10);
  ['D','I','P','T'].forEach(k => {
    document.getElementById(`score-${k}`).textContent = scores[k];
    gsap.to(`#bar-${k}`, { width: `${(scores[k]/max)*100}%`, duration: 1, ease: "power2.out", delay: 0.3 });
  });

  // AI Generation
  generateAI(state.rankedCards.map(id => state.likedCards.find(c => c.id === id)));

  document.getElementById('btn-restart').onclick = () => location.reload();
}

async function generateAI(topCards) {
  const loading = document.getElementById('ai-loading');
  const content = document.getElementById('ai-content');
  
  try {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const keywords = topCards.map(c => c.keyword).join(", ");
    
    const prompt = state.language === 'KR' 
      ? `사용자 특성: ${keywords}. 이 사용자의 프레디저(Prediger) 흥미 유형을 분석하고, ${state.user.group === 'CHILD' ? '어린이' : '성인'}에게 적합한 진로 조언을 3문장으로 따뜻하게 해주세요.`
      : `User interests: ${keywords}. Analyze Prediger interest type and give 3 sentences of warm career advice for a ${state.user.group.toLowerCase()}.`;

    const res = await ai.models.generateContent({
      model: 'gemini-2.5-flash-lite-latest',
      contents: prompt
    });

    loading.classList.add('hidden');
    content.innerHTML = `<p>${res.text}</p>`;
    content.classList.remove('hidden');
    gsap.from(content, { opacity: 0, y: 10 });

  } catch (error) {
    console.warn("AI Failed", error);
    loading.innerHTML = `<span class="text-white/50 text-sm">AI Analysis Unavailable</span>`;
  }
}
