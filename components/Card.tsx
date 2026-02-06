import React, { useState } from 'react';
import { CardData, TargetGroup } from '../types';
import { ASSET_IMAGES_PATH } from '../constants';

interface CardProps {
  data: CardData;
  isSelected: boolean;
  targetGroup: TargetGroup;
  onToggle: (id: number) => void;
}

const Card: React.FC<CardProps> = ({ data, isSelected, targetGroup, onToggle }) => {
  const [imgError, setImgError] = useState(false);

  // LOGIC: IF currentMode === 'child' → assets/images/kids/ + card.img
  //        IF currentMode === 'adult' → assets/images/adult/ + card.img
  const subFolder = targetGroup === TargetGroup.CHILD ? 'kids' : 'adult';
  const imagePath = `${ASSET_IMAGES_PATH}/${subFolder}/${data.img}`;
  
  // Fallback placeholder
  const placeholder = `https://picsum.photos/seed/${data.id}/300/400`;

  return (
    <div 
      onClick={() => onToggle(data.id)}
      className={`
        relative group cursor-pointer rounded-xl overflow-hidden shadow-md transition-all duration-300
        border-4 
        ${isSelected ? 'border-blue-500 scale-105 shadow-xl' : 'border-transparent hover:shadow-lg hover:-translate-y-1'}
        bg-white
      `}
    >
      <div className="aspect-[3/4] w-full relative bg-gray-200">
        <img
          src={imgError ? placeholder : imagePath}
          alt={data.keyword}
          onError={() => setImgError(true)}
          className="w-full h-full object-cover"
        />
        {isSelected && (
          <div className="absolute inset-0 bg-blue-500/20 flex items-center justify-center">
            <div className="bg-blue-500 text-white rounded-full p-2 shadow-lg">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
              </svg>
            </div>
          </div>
        )}
      </div>
      <div className="p-4 bg-white h-full">
        <h3 className="font-bold text-lg text-gray-800 mb-1">{data.keyword}</h3>
        <p className="text-sm text-gray-500 line-clamp-3">{data.desc}</p>
      </div>
      
      {/* Type Badge */}
      <div className="absolute top-2 right-2 bg-white/90 backdrop-blur-sm px-2 py-1 rounded-md text-xs font-bold shadow-sm text-gray-600">
        {data.type}
      </div>
    </div>
  );
};

export default Card;
