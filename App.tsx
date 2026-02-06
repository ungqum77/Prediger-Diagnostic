import React, { useState, useMemo } from 'react';
import { AppState, Language, TargetGroup, UserProfile } from './types';
import { getCards } from './constants';
import IntroStep from './components/IntroStep';
import SortingStep from './components/SortingStep';
import RankingStep from './components/RankingStep';
import ResultStep from './components/ResultStep';

const App: React.FC = () => {
  const [state, setState] = useState<AppState>({
    language: Language.KR,
    targetGroup: TargetGroup.CHILD,
    step: 'INTRO',
    userProfile: null,
    likedCards: [],
    rankedCards: []
  });

  // Load the correct set of cards based on language
  const currentCards = useMemo(() => getCards(state.language), [state.language]);

  const toggleLanguage = () => {
    setState(prev => ({
      ...prev,
      language: prev.language === Language.KR ? Language.EN : Language.KR,
      likedCards: [],
      rankedCards: []
    }));
  };

  // Step 1: Intro -> Set Profile & Mode -> Sorting
  const handleSetProfile = (profile: UserProfile, targetGroup: TargetGroup) => {
    setState(prev => ({
      ...prev,
      userProfile: profile,
      targetGroup: targetGroup,
      step: 'SORTING'
    }));
  };

  // Step 2: Sorting Complete -> Ranking
  const handleSortingComplete = (likedIds: number[]) => {
    setState(prev => ({
      ...prev,
      likedCards: likedIds,
      step: 'RANKING'
    }));
  };

  // Step 3: Ranking (Select Top 3)
  const handleToggleRank = (id: number) => {
    setState(prev => {
      const currentRanked = prev.rankedCards;
      if (currentRanked.includes(id)) {
        // Remove if already ranked
        return { ...prev, rankedCards: currentRanked.filter(cid => cid !== id) };
      } else {
        // Add if less than 3
        if (currentRanked.length < 3) {
          return { ...prev, rankedCards: [...currentRanked, id] };
        }
      }
      return prev;
    });
  };

  // Step 4: Finish Ranking -> Result
  const handleFinishRanking = () => {
    setState(prev => ({ ...prev, step: 'RESULT' }));
  };

  const handleRestart = () => {
    setState(prev => ({
      ...prev,
      step: 'INTRO',
      likedCards: [],
      rankedCards: [],
      userProfile: null
    }));
  };

  // --- RENDER ---

  if (state.step === 'INTRO') {
    return (
      <IntroStep 
        language={state.language}
        onSetProfile={handleSetProfile}
        onToggleLanguage={toggleLanguage}
      />
    );
  }

  if (state.step === 'SORTING') {
    return (
      <SortingStep
        cards={currentCards}
        language={state.language}
        targetGroup={state.targetGroup}
        onComplete={handleSortingComplete}
        onBack={handleRestart}
      />
    );
  }

  if (state.step === 'RANKING') {
    // Only pass the liked cards to the ranking step
    const likedCardsData = currentCards.filter(c => state.likedCards.includes(c.id));
    return (
      <RankingStep
        likedCards={likedCardsData}
        rankedCardIds={state.rankedCards}
        language={state.language}
        targetGroup={state.targetGroup}
        onToggleRank={handleToggleRank}
        onFinish={handleFinishRanking}
      />
    );
  }

  if (state.step === 'RESULT') {
    const likedCardsData = currentCards.filter(c => state.likedCards.includes(c.id));
    return (
      <ResultStep
        likedCards={likedCardsData}
        rankedCardIds={state.rankedCards}
        language={state.language}
        userProfile={state.userProfile}
        onRestart={handleRestart}
      />
    );
  }

  return null;
};

export default App;
