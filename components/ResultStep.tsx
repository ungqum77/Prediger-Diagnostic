import React, { useEffect, useState, useRef } from 'react';
import { CardData, Language, Scores, UserProfile, TYPE_COLORS } from '../types';
import { getContent } from '../constants';
import { analyzeCareerPath } from '../services/geminiService';

interface ResultStepProps {
  likedCards: CardData[];
  rankedCardIds: number[];
  language: Language;
  userProfile: UserProfile | null;
  onRestart: () => void;
}

const ResultStep: React.FC<ResultStepProps> = ({ likedCards, rankedCardIds, language, userProfile, onRestart }) => {
  const [analysis, setAnalysis] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(true);
  const chartRef = useRef<HTMLDivElement>(null);
  const isEn = language === Language.EN;
  const contentDB = getContent(language);

  // 1. Calculate Scores (Prediger Algorithm)
  const calculateScores = (): { scores: Scores, x: number, y: number } => {
    const scores: Scores = { D: 0, I: 0, P: 0, T: 0 };
    
    // Phase 1: 1 point per liked card
    likedCards.forEach(card => {
      const type = card.type as keyof Scores;
      if (scores[type] !== undefined) scores[type] += 1;
    });

    // Phase 2: Bonus for Top 3 (3, 2, 1 points)
    rankedCardIds.forEach((id, index) => {
      const card = likedCards.find(c => c.id === id);
      if (card) {
        const type = card.type as keyof Scores;
        scores[type] += (3 - index);
      }
    });

    // Prediger Map Coordinates
    // X axis: Things (Positive) vs People (Negative) -> X = T - P
    // Y axis: Data (Positive) vs Ideas (Negative) -> Y = D - I
    const x = scores.T - scores.P;
    const y = scores.D - scores.I;

    return { scores, x, y };
  };

  const { scores, x, y } = calculateScores();

  // 2. Determine Result Type
  const getResultTypeKey = (x: number, y: number): string => {
    if (y >= 0 && x >= 0) return "DATA_THINGS"; 
    if (y >= 0 && x < 0) return "DATA_PEOPLE";  
    if (y < 0 && x >= 0) return "IDEAS_THINGS"; 
    if (y < 0 && x < 0) return "IDEAS_PEOPLE";  
    return "UNKNOWN";
  };

  const resultKey = getResultTypeKey(x, y);
  const staticResult = contentDB[resultKey] || contentDB["UNKNOWN"];

  // 3. GSAP Animations
  useEffect(() => {
    if (window.gsap && chartRef.current) {
      const tl = window.gsap.timeline();
      
      // Animate Bars
      tl.fromTo(chartRef.current.querySelectorAll('.bar-fill'), 
        { width: '0%' },
        { 
          width: (i: number, target: HTMLElement) => target.dataset.width, 
          duration: 1.2, 
          ease: "power3.out",
          stagger: 0.1
        }
      );
      
      // Fade in text
      tl.fromTo('.result-fade-in',
        { opacity: 0, y: 20 },
        { opacity: 1, y: 0, duration: 0.6, stagger: 0.1 },
        "-=0.8"
      );
    }
  }, []);

  // 4. Gemini AI Analysis
  useEffect(() => {
    let mounted = true;
    const fetchAnalysis = async () => {
      // Use Top 3 ranked cards for the prompt
      const top3Cards = rankedCardIds.map(id => likedCards.find(c => c.id === id)).filter((c): c is CardData => !!c);
      if (top3Cards.length > 0) {
        setLoading(true);
        const result = await analyzeCareerPath(top3Cards, language);
        if (mounted) {
          setAnalysis(result);
          setLoading(false);
        }
      }
    };
    fetchAnalysis();
    return () => { mounted = false; };
  }, [rankedCardIds, likedCards, language]);

  return (
    <div className="min-h-screen bg-[#F5F7FA] py-12 px-4 sm:px-6">
      <div className="max-w-4xl mx-auto">
        
        {/* Header Section */}
        <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-8 sm:p-10 mb-8 text-center result-fade-in">
          <div className="inline-block px-4 py-1.5 bg-gray-100 text-gray-600 rounded-full text-xs font-bold tracking-widest uppercase mb-6">
            Diagnosis Report for {userProfile?.name}
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-gray-900 mb-4 tracking-tight">
            {staticResult.title}
          </h1>
          <p className="text-gray-600 font-medium text-lg leading-relaxed max-w-2xl mx-auto">
            {staticResult.summary}
          </p>
        </div>

        {/* Static DB Content (Jobs & Traits) */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8 result-fade-in">
          <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100">
            <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-4">
              {isEn ? "Key Traits" : "주요 특징"}
            </h3>
            <p className="text-gray-800 font-medium leading-relaxed">
              {staticResult.traits}
            </p>
          </div>
          <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100">
            <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-4">
              {isEn ? "Recommended Careers" : "추천 직업군"}
            </h3>
            <div className="flex flex-wrap gap-2">
              {staticResult.jobs.map(job => (
                <span key={job} className="px-3 py-1 bg-blue-50 text-blue-700 rounded-lg text-sm font-bold">
                  {job}
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* Score Charts (Prediger Dimensions) */}
        <div ref={chartRef} className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8 result-fade-in">
          {/* Data & Ideas (Y Axis) */}
          <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100">
            <h3 className="text-lg font-bold text-gray-800 mb-6 flex items-center gap-2">
              <span className="w-2 h-6 bg-[#1E88E5] rounded-full"></span>
              Data vs Ideas
            </h3>
            <div className="space-y-6">
              <div>
                <div className="flex justify-between mb-2 text-sm font-bold text-gray-600">
                  <span>Data (Systematic)</span>
                  <span className="text-[#1E88E5]">{scores.D}</span>
                </div>
                <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
                  <div className="bar-fill h-full bg-[#1E88E5] rounded-full" data-width={`${Math.min(scores.D * 15, 100)}%`}></div>
                </div>
              </div>
              <div>
                <div className="flex justify-between mb-2 text-sm font-bold text-gray-600">
                  <span>Ideas (Creative)</span>
                  <span className="text-[#43A047]">{scores.I}</span>
                </div>
                <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
                  <div className="bar-fill h-full bg-[#43A047] rounded-full" data-width={`${Math.min(scores.I * 15, 100)}%`}></div>
                </div>
              </div>
            </div>
          </div>

          {/* Things & People (X Axis) */}
          <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100">
            <h3 className="text-lg font-bold text-gray-800 mb-6 flex items-center gap-2">
              <span className="w-2 h-6 bg-[#E53935] rounded-full"></span>
              Things vs People
            </h3>
            <div className="space-y-6">
              <div>
                <div className="flex justify-between mb-2 text-sm font-bold text-gray-600">
                  <span>Things (Technical)</span>
                  <span className="text-[#E53935]">{scores.T}</span>
                </div>
                <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
                  <div className="bar-fill h-full bg-[#E53935] rounded-full" data-width={`${Math.min(scores.T * 15, 100)}%`}></div>
                </div>
              </div>
              <div>
                <div className="flex justify-between mb-2 text-sm font-bold text-gray-600">
                  <span>People (Social)</span>
                  <span className="text-[#FDD835]">{scores.P}</span>
                </div>
                <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
                  <div className="bar-fill h-full bg-[#FDD835] rounded-full" data-width={`${Math.min(scores.P * 15, 100)}%`}></div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* AI Insight */}
        <div className="bg-gradient-to-br from-indigo-50 to-white rounded-3xl p-8 shadow-sm border border-indigo-100 mb-12 result-fade-in">
          <div className="flex items-center gap-4 mb-6 pb-6 border-b border-indigo-100">
            <div className="w-12 h-12 bg-indigo-600 rounded-2xl flex items-center justify-center text-white text-2xl shadow-lg shadow-indigo-200 transform -rotate-3">
               ✨
            </div>
            <div>
              <h3 className="text-xl font-bold text-indigo-900">
                {isEn ? "AI Career Consultant Analysis" : "AI 커리어 컨설턴트 분석"}
              </h3>
              <p className="text-indigo-500 text-sm font-medium">Powered by Gemini 3 Flash</p>
            </div>
          </div>

          {loading ? (
            <div className="flex flex-col items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mb-4"></div>
              <p className="text-indigo-600 font-medium animate-pulse text-sm">
                {isEn ? "Generating professional insights..." : "전문적인 분석 결과를 생성하고 있습니다..."}
              </p>
            </div>
          ) : (
            <div className="prose prose-indigo max-w-none text-gray-700 leading-relaxed text-sm sm:text-base">
              <div className="whitespace-pre-wrap font-medium">{analysis}</div>
            </div>
          )}
        </div>

        <div className="text-center pb-12 result-fade-in">
          <button
            onClick={onRestart}
            className="px-8 py-4 rounded-2xl border border-gray-200 text-gray-500 font-bold hover:bg-white hover:text-gray-900 hover:shadow-lg transition-all"
          >
            {isEn ? "Start New Diagnosis" : "새로운 진단 시작하기"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ResultStep;
