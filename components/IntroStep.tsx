import React, { useState, useEffect, useRef } from 'react';
import { Language, TargetGroup, UserProfile } from '../types';

interface IntroStepProps {
  language: Language;
  onSetProfile: (profile: UserProfile, targetGroup: TargetGroup) => void;
  onToggleLanguage: () => void;
}

const IntroStep: React.FC<IntroStepProps> = ({ language, onSetProfile, onToggleLanguage }) => {
  const [name, setName] = useState('');
  const [birthDate, setBirthDate] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);

  const isEn = language === Language.EN;

  useEffect(() => {
    // GSAP Entry Animation
    if (window.gsap && containerRef.current) {
      const tl = window.gsap.timeline();
      tl.fromTo(containerRef.current.querySelector('.intro-logo'), 
        { y: -20, opacity: 0 },
        { y: 0, opacity: 1, duration: 0.8, ease: "power3.out" }
      )
      .fromTo(containerRef.current.querySelectorAll('.intro-field'),
        { y: 20, opacity: 0 },
        { y: 0, opacity: 1, duration: 0.5, stagger: 0.1, ease: "power2.out" },
        "-=0.4"
      )
      .fromTo(containerRef.current.querySelector('.intro-btn'),
        { scale: 0.9, opacity: 0 },
        { scale: 1, opacity: 1, duration: 0.4, ease: "back.out(1.7)" },
        "-=0.2"
      );
    }
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !birthDate) return;

    const birthYear = new Date(birthDate).getFullYear();
    const currentYear = new Date().getFullYear();
    const age = currentYear - birthYear;
    const targetGroup = age < 13 ? TargetGroup.CHILD : TargetGroup.ADULT;

    // Exit animation
    if (window.gsap && containerRef.current) {
      window.gsap.to(containerRef.current, {
        opacity: 0,
        y: -20,
        duration: 0.3,
        onComplete: () => onSetProfile({ name, birthDate, age }, targetGroup)
      });
    } else {
      onSetProfile({ name, birthDate, age }, targetGroup);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-[#F5F7FA]">
      <div ref={containerRef} className="max-w-md w-full bg-white rounded-3xl shadow-[0_10px_40px_-10px_rgba(0,0,0,0.08)] overflow-hidden p-10 border border-gray-100">
        <div className="text-center mb-10 intro-logo">
          <div className="inline-block p-4 rounded-2xl bg-gradient-to-tr from-blue-50 to-indigo-50 mb-4 shadow-sm">
            <span className="text-4xl">✨</span>
          </div>
          <h1 className="text-3xl font-bold text-gray-900 tracking-tight mb-3 font-sans">
            {isEn ? "Career Diagnosis" : "커리어 진단"}
          </h1>
          <p className="text-gray-500 font-medium leading-relaxed">
            {isEn ? "Discover your hidden potential." : "당신의 숨겨진 잠재력을 발견해보세요."}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="intro-field group">
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 ml-1">
              {isEn ? "Full Name" : "이름"}
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-5 py-4 rounded-2xl bg-gray-50 border border-gray-200 text-gray-900 placeholder-gray-400 focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 outline-none transition-all duration-300"
              placeholder={isEn ? "Enter your name" : "이름을 입력하세요"}
            />
          </div>

          <div className="intro-field group">
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 ml-1">
              {isEn ? "Date of Birth" : "생년월일"}
            </label>
            <input
              type="date"
              required
              value={birthDate}
              onChange={(e) => setBirthDate(e.target.value)}
              className="w-full px-5 py-4 rounded-2xl bg-gray-50 border border-gray-200 text-gray-900 focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 outline-none transition-all duration-300"
            />
          </div>

          <button
            type="submit"
            className="intro-btn w-full bg-[#1E88E5] text-white font-bold py-4 rounded-2xl hover:bg-blue-600 active:scale-[0.98] transition-all shadow-lg shadow-blue-500/30 flex items-center justify-center gap-2"
          >
            <span>{isEn ? "Start Analysis" : "분석 시작하기"}</span>
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" /></svg>
          </button>
        </form>

        <div className="intro-field mt-10 pt-6 border-t border-gray-50 flex justify-center">
          <button
            onClick={onToggleLanguage}
            className="text-xs font-semibold text-gray-400 hover:text-gray-700 tracking-wide transition-colors"
          >
            {isEn ? "한국어로 변경" : "Switch to English"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default IntroStep;
