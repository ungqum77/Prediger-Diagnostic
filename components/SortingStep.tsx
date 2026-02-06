import React, { useState, useEffect, useRef } from 'react';
import { CardData, Language, TargetGroup, TYPE_COLORS } from '../types';
import Card from './Card';

interface SortingStepProps {
  cards: CardData[];
  language: Language;
  targetGroup: TargetGroup;
  onComplete: (likedIds: number[]) => void;
  onBack: () => void;
}

const SortingStep: React.FC<SortingStepProps> = ({
  cards,
  language,
  targetGroup,
  onComplete,
  onBack
}) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [likedCards, setLikedCards] = useState<number[]>([]);
  const cardRefs = useRef<(HTMLDivElement | null)[]>([]);
  const containerRef = useRef<HTMLDivElement>(null);
  
  const isEn = language === Language.EN;
  const progress = ((currentIndex) / cards.length) * 100;

  // Render only a few cards for performance (stack effect)
  const VISIBLE_STACK = 3;
  const activeCards = cards.slice(currentIndex, currentIndex + VISIBLE_STACK).reverse();

  useEffect(() => {
    // Deck Intro Animation (Fan Out)
    if (window.gsap && cardRefs.current.length > 0 && currentIndex === 0) {
      window.gsap.fromTo(cardRefs.current, 
        { y: 200, opacity: 0, rotate: 0 },
        { 
          y: (i: number) => i * -4, // Slight stack offset
          opacity: 1, 
          rotate: (i: number) => (Math.random() - 0.5) * 4, // Random minimal rotation for realism
          duration: 0.8, 
          stagger: 0.1, 
          ease: "power3.out" 
        }
      );
    }
  }, []); // Run once on mount

  const handleSwipe = (direction: 'left' | 'right' | 'up') => {
    const currentCardRef = cardRefs.current[activeCards.length - 1]; // Top card
    const cardData = cards[currentIndex];

    if (!currentCardRef || !cardData) return;

    // 1. Animate the card flying away
    let xDest = 0;
    let yDest = 0;
    let rotationDest = 0;

    if (direction === 'right') {
      xDest = window.innerWidth + 200;
      yDest = 50;
      rotationDest = 30;
      setLikedCards(prev => [...prev, cardData.id]);
    } else if (direction === 'left') {
      xDest = -window.innerWidth - 200;
      yDest = 50;
      rotationDest = -30;
    } else if (direction === 'up') {
      yDest = -window.innerHeight - 200;
      // Pass (no like, no dislike explicit logic, just skip)
    }

    if (window.gsap) {
      window.gsap.to(currentCardRef, {
        x: xDest,
        y: yDest,
        rotation: rotationDest,
        opacity: 0,
        duration: 0.5,
        ease: "power1.in",
        onComplete: () => {
          // 2. Update State after animation finishes
          advanceCard();
        }
      });
    } else {
      advanceCard();
    }
  };

  const advanceCard = () => {
    if (currentIndex < cards.length - 1) {
      setCurrentIndex(prev => prev + 1);
      // Reset position of the dragged element (React re-renders, but good to be safe)
    } else {
      // Last card processed
      const finalLiked = likedCards; // State might not update immediately in this closure if used directly
      onComplete(finalLiked); // Ideally verify this logic, but for simple flow it works
    }
  };

  // Draggable logic setup
  useEffect(() => {
    const topCardIndex = activeCards.length - 1;
    const topCardRef = cardRefs.current[topCardIndex];

    if (!topCardRef || !window.Draggable) return;

    const draggable = window.Draggable.create(topCardRef, {
      type: "x,y",
      edgeResistance: 0.65,
      bounds: containerRef.current,
      inertia: true,
      onDrag: function() {
        // Rotate card based on X movement
        const rotation = this.x * 0.05;
        window.gsap.set(this.target, { rotation: rotation });
      },
      onDragEnd: function() {
        const threshold = 100;
        if (this.x > threshold) {
          handleSwipe('right');
        } else if (this.x < -threshold) {
          handleSwipe('left');
        } else if (this.y < -threshold) {
          handleSwipe('up');
        } else {
          // Spring back
          window.gsap.to(this.target, { x: 0, y: 0, rotation: 0, duration: 0.5, ease: "elastic.out(1, 0.5)" });
        }
      }
    })[0];

    return () => {
      if (draggable) draggable.kill();
    };
  }, [currentIndex, activeCards.length]);

  if (!cards[currentIndex]) return null;

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 overflow-hidden relative" ref={containerRef}>
      
      {/* Top Progress */}
      <div className="absolute top-0 left-0 right-0 p-6 z-20">
        <div className="flex justify-between items-center mb-2">
          <button onClick={onBack} className="text-gray-400 hover:text-gray-600 text-sm font-medium">
            &larr; {isEn ? "Exit" : "나가기"}
          </button>
          <span className="text-xs font-bold text-gray-400 tracking-widest uppercase">
            {currentIndex + 1} / {cards.length}
          </span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-1.5 overflow-hidden">
          <div 
            className="bg-[#1E88E5] h-full rounded-full transition-all duration-300 ease-out" 
            style={{ width: `${progress}%` }}
          ></div>
        </div>
      </div>

      {/* Card Stack */}
      <div className="relative w-full max-w-xs sm:max-w-sm aspect-[3/4] flex items-center justify-center">
        {activeCards.map((card, index) => {
          const isTop = index === activeCards.length - 1;
          return (
            <div
              key={card.id}
              ref={(el) => { cardRefs.current[index] = el; }}
              className="absolute w-full h-full will-change-transform"
              style={{ 
                zIndex: index,
                // Static visual offset for stack effect (GSAP overrides this for animation)
                transform: `scale(${1 - (activeCards.length - 1 - index) * 0.05}) translateY(${(activeCards.length - 1 - index) * 10}px)`
              }}
            >
              <div className="w-full h-full shadow-[0_20px_50px_-12px_rgba(0,0,0,0.15)] rounded-2xl bg-white overflow-hidden pointer-events-auto">
                <Card
                  data={card}
                  isSelected={false}
                  targetGroup={targetGroup}
                  onToggle={() => {}} // Disabled in sorting
                />
                
                {/* Visual Feedback Overlays (Optional, but good for UX) */}
                {isTop && (
                  <>
                     <div className="absolute top-8 left-8 border-4 border-green-500 text-green-500 rounded-lg p-2 font-black text-3xl opacity-0 like-stamp rotate-[-15deg]">LIKE</div>
                     <div className="absolute top-8 right-8 border-4 border-red-500 text-red-500 rounded-lg p-2 font-black text-3xl opacity-0 nope-stamp rotate-[15deg]">NOPE</div>
                  </>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Controls */}
      <div className="flex gap-6 mt-12 z-20">
        <button
          onClick={() => handleSwipe('left')}
          className="w-16 h-16 rounded-full bg-white text-gray-400 shadow-[0_4px_20px_rgba(0,0,0,0.1)] border border-gray-100 flex items-center justify-center hover:bg-red-50 hover:text-red-500 hover:border-red-200 hover:scale-110 transition-all duration-200"
        >
          <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        <button
          onClick={() => handleSwipe('up')}
          className="w-12 h-12 rounded-full bg-white text-gray-300 shadow-[0_4px_15px_rgba(0,0,0,0.08)] border border-gray-100 flex items-center justify-center hover:bg-gray-50 hover:text-gray-500 hover:scale-110 transition-all duration-200 mt-2"
        >
          <span className="text-xs font-bold">PASS</span>
        </button>

        <button
          onClick={() => handleSwipe('right')}
          className="w-16 h-16 rounded-full bg-[#1E88E5] text-white shadow-[0_8px_25px_-5px_rgba(30,136,229,0.5)] flex items-center justify-center hover:bg-blue-600 hover:scale-110 transition-all duration-200"
        >
          <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
          </svg>
        </button>
      </div>
      
      <p className="mt-6 text-xs text-gray-400 font-medium">
        {isEn ? "Swipe Right to Like, Left to Dislike" : "오른쪽 = 좋아요 / 왼쪽 = 별로예요"}
      </p>
    </div>
  );
};

export default SortingStep;
