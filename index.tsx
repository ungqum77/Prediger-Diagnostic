
import React, { useState, useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import { GoogleGenAI } from "@google/genai";

// --- Types ---
type Dimension = 'D' | 'I' | 'P' | 'T';
interface CardData {
  id: number;
  dimension: Dimension;
  keyword_kr: string;
  adult: { img: string; desc: string; };
  child: { img: string; desc: string; };
}

const TYPE_THEMES: Record<Dimension, { color: string; label: string }> = {
  D: { color: "#1E88E5", label: "Data" },
  T: { color: "#E53935", label: "Things" },
  P: { color: "#FDD835", label: "People" },
  I: { color: "#43A047", label: "Ideas" }
};

// --- Fallback Data ---
const FALLBACK_CARDS: CardData[] = [
  { id: 1, dimension: 'D', keyword_kr: '분석하기', adult: { img: '', desc: '데이터를 분석합니다.' }, child: { img: '', desc: '숫자를 살펴봐요.' } },
  { id: 2, dimension: 'I', keyword_kr: '기획하기', adult: { img: '', desc: '아이디어를 냅니다.' }, child: { img: '', desc: '새로운 생각을 해요.' } },
  { id: 3, dimension: 'P', keyword_kr: '가르치기', adult: { img: '', desc: '사람들을 가르칩니다.' }, child: { img: '', desc: '친구들에게 알려줘요.' } },
  { id: 4, dimension: 'T', keyword_kr: '만들기', adult: { img: '', desc: '도구로 만듭니다.' }, child: { img: '', desc: '장난감을 조립해요.' } },
];

const App: React.FC = () => {
  const [step, setStep] = useState<'intro' | 'sorting' | 'select9' | 'rank3' | 'result'>('intro');
  const [user, setUser] = useState({ name: '', birth: '' });
  const [targetGroup, setTargetGroup] = useState<'adult' | 'child'>('adult');
  const [cards, setCards] = useState<CardData[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [liked, setLiked] = useState<CardData[]>([]);
  const [top9, setTop9] = useState<CardData[]>([]);
  const [rank3, setRank3] = useState<CardData[]>([]);
  const [analysis, setAnalysis] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load Data
  useEffect(() => {
    fetch('assets/data/cards_kr.json')
      .then(res => res.json())
      .then(data => setCards(data.cards || data))
      .catch(() => setCards(FALLBACK_CARDS));
  }, []);

  const handleStart = (e: React.FormEvent) => {
    e.preventDefault();
    if (!user.name || !user.birth) return;
    const birthYear = new Date(user.birth).getFullYear();
    const age = new Date().getFullYear() - birthYear;
    setTargetGroup(age < 13 ? 'child' : 'adult');
    setStep('sorting');
  };

  const handleSwipe = (dir: 'right' | 'left' | 'up', card: CardData) => {
    if (dir === 'right') setLiked(prev => [...prev, card]);
    if (currentIndex < cards.length - 1) {
      setCurrentIndex(prev => prev + 1);
    } else {
      setStep('select9');
    }
  };

  const startAnalysis = async () => {
    setLoading(true);
    setError(null);
    setStep('result');

    try {
      // API Key check inside function to ensure environment is ready
      if (!process.env.API_KEY) {
        throw new Error("API_KEY가 시스템에 설정되어 있지 않습니다. 프로젝트 설정을 확인해 주세요.");
      }

      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const cardList = rank3.map(c => c.keyword_kr).join(', ');
      const prompt = `당신은 전문적인 프레디저 직업 상담사입니다. 사용자가 선택한 최상위 3가지 키워드는 [${cardList}]입니다. 이 정보를 바탕으로 사용자의 흥미 유형을 깊이 있게 분석하고, 추천 직업 5가지와 추천 학과 3가지를 한국어로 따뜻하고 논리적인 어조로 작성해 주세요. 반드시 HTML 태그(<b>, <br>, <ul>, <li>)를 활용하여 시각적으로 구조화된 리포트 형식으로 응답해 주세요.`;

      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: prompt,
        config: {
          systemInstruction: "당신은 프레디저 카드 소팅 결과를 바탕으로 진로를 제안하는 커리어 전문가입니다. 격려와 전문성이 느껴지는 어조를 사용하세요.",
          temperature: 0.7,
        }
      });

      if (response && response.text) {
        setAnalysis(response.text);
      } else {
        throw new Error("AI로부터 유효한 응답을 받지 못했습니다.");
      }
    } catch (err: any) {
      console.error("AI Analysis Failed:", err);
      // 구체적인 에러 메시지를 표시하여 문제 진단을 돕습니다.
      let message = "분석 중 예기치 못한 오류가 발생했습니다.";
      if (err.message) message = `오류 상세: ${err.message}`;
      if (err.status === 403 || err.status === 401) message = "API 키가 올바르지 않거나 권한이 없습니다.";
      
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  // --- RENDERING ---

  if (step === 'intro') return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-[#F8FAFC]">
      <div className="bg-white p-10 rounded-[2.5rem] shadow-2xl shadow-slate-200 max-w-md w-full text-center border border-slate-50">
        <div className="text-5xl mb-6">✨</div>
        <h1 className="text-3xl font-black mb-2 text-slate-800 tracking-tight">AI 프레디저 진단</h1>
        <p className="text-slate-400 text-sm mb-8 font-medium">당신의 잠재된 커리어를 발견하세요</p>
        <form onSubmit={handleStart} className="space-y-4">
          <input required type="text" placeholder="이름" value={user.name} onChange={e=>setUser({...user, name: e.target.value})} className="w-full px-6 py-4 bg-slate-50 rounded-2xl border border-slate-100 outline-none focus:ring-4 focus:ring-blue-500/10 transition-all font-bold" />
          <input required type="date" value={user.birth} onChange={e=>setUser({...user, birth: e.target.value})} className="w-full px-6 py-4 bg-slate-50 rounded-2xl border border-slate-100 outline-none focus:ring-4 focus:ring-blue-500/10 transition-all font-bold" />
          <button type="submit" className="w-full py-5 bg-blue-600 text-white rounded-2xl font-black shadow-xl shadow-blue-500/30 hover:bg-blue-700 transition-all active:scale-95">진단 시작하기</button>
        </form>
      </div>
    </div>
  );

  if (step === 'sorting') {
    const currentCard = cards[currentIndex];
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 p-6 overflow-hidden">
        <div className="w-full max-w-lg mb-8">
          <div className="flex justify-between items-center mb-2">
             <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Progress</span>
             <span className="text-xs font-black text-blue-600">{currentIndex + 1} / {cards.length}</span>
          </div>
          <div className="h-1.5 w-full bg-white rounded-full overflow-hidden shadow-inner">
            <div className="h-full bg-blue-600 transition-all" style={{ width: `${((currentIndex+1)/cards.length)*100}%` }}></div>
          </div>
        </div>

        <div className="relative w-full max-w-[320px] aspect-[3/4]">
          {currentCard && (
            <div className="w-full h-full bg-white rounded-[2.5rem] shadow-2xl shadow-slate-200 overflow-hidden flex flex-col border border-slate-50 animate-in fade-in zoom-in duration-300">
              <div className="h-3/5 relative bg-slate-100">
                <img src={`assets/images/${targetGroup}/${currentCard[targetGroup].img}`} className="w-full h-full object-cover" onError={(e:any)=>{e.target.src=`https://placehold.co/400x600/${TYPE_THEMES[currentCard.dimension].color.replace('#','')}/ffffff?text=${currentCard.keyword_kr}`}} />
                <div className="absolute top-6 right-6 px-3 py-1.5 bg-white/90 backdrop-blur rounded-xl text-[10px] font-black shadow-sm text-slate-800">
                  {currentCard.dimension} TYPE
                </div>
              </div>
              <div className="flex-1 p-8 text-