import React from 'react';
import { CardData, Language, TargetGroup } from '../types';
import Card from './Card';

interface RankingStepProps {
  likedCards: CardData[];
  rankedCardIds: number[];
  language: Language;
  targetGroup: TargetGroup;
  onToggleRank: (id: number) => void;
  onFinish: () => void;
}

const RankingStep: React.FC<RankingStepProps> = ({
  likedCards,
  rankedCardIds,
  language,
  targetGroup,
  onToggleRank,
  onFinish
}) => {
  const isEn = language === Language.EN;
  const isComplete = rankedCardIds.length === 3;

  return (
    <div className="min-h-screen bg-[#F5F7FA] pb-32">
      <div className="max-w-7xl mx-auto px-6 py-12">
        <div className="text-center mb-12">
          <span className="inline-block px-3 py-1 bg-blue-100 text-[#1E88E5] rounded-full text-xs font-bold tracking-wide mb-3">PHASE 2</span>
          <h2 className="text-3xl font-bold text-gray-900 mb-3">
            {isEn ? "Prioritize Your Choices" : "가장 중요한 3가지를 선택하세요"}
          </h2>
          <p className="text-gray-500 max-w-lg mx-auto">
            {isEn 
              ? `Review the cards you liked and select your top 3 preferences to finalize your career profile.` 
              : `좋아요한 카드들 중에서 가장 마음에 드는 순서대로 3장을 선택하여 프로필을 완성하세요.`}
          </p>
        </div>

        {likedCards.length === 0 ? (
          <div className="text-center py-20 bg-white rounded-3xl border border-gray-100 shadow-sm">
            <p className="text-gray-400 font-medium">{isEn ? "No cards liked." : "선택된 카드가 없습니다."}</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-6">
            {likedCards.map((card) => {
              const rankIndex = rankedCardIds.indexOf(card.id);
              const isRanked = rankIndex !== -1;
              
              return (
                <div key={card.id} className="relative group perspective-1000">
                  <div className={`transition-transform duration-300 ${isRanked ? 'scale-95' : 'group-hover:-translate-y-2'}`}>
                    <Card
                      data={card}
                      isSelected={isRanked}
                      targetGroup={targetGroup}
                      onToggle={onToggleRank}
                    />
                  </div>
                  
                  {isRanked && (
                    <div className="absolute -top-3 -right-3 w-10 h-10 bg-[#1E88E5] text-white rounded-full flex items-center justify-center font-bold text-xl shadow-lg border-4 border-[#F5F7FA] z-20 animate-[bounce_0.5s_ease-out]">
                      {rankIndex + 1}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Floating Action Bar */}
      <div className="fixed bottom-8 left-1/2 transform -translate-x-1/2 z-50 w-full max-w-md px-4">
        <button
          onClick={onFinish}
          disabled={!isComplete}
          className={`
            w-full py-4 rounded-2xl font-bold text-lg shadow-2xl transition-all duration-300 flex items-center justify-center gap-3
            ${isComplete
              ? 'bg-[#1E88E5] text-white hover:bg-blue-600 hover:scale-[1.02] active:scale-[0.98]' 
              : 'bg-white text-gray-300 border border-gray-200 cursor-not-allowed'}
          `}
        >
          <span>{isEn ? "Generate Report" : "결과 리포트 생성"}</span>
          {isComplete && (
            <svg className="w-5 h-5 animate-pulse" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
            </svg>
          )}
        </button>
        <div className="text-center mt-3 text-xs font-semibold text-gray-400">
          {rankedCardIds.length} / 3 {isEn ? "Selected" : "선택됨"}
        </div>
      </div>
    </div>
  );
};

export default RankingStep;
