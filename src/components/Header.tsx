import React from 'react';
import bannerImage from './ui/Banner.webp';

export function Header() {
  return (
    <div 
      className="relative w-full h-[500px] bg-cover bg-center"
      style={{
        backgroundImage: `url(${bannerImage})`,
        backgroundRepeat: 'no-repeat',
        backgroundSize: 'cover'
      }}
    >
      <div className="absolute inset-0 bg-gradient-to-b from-gray-900/50 via-gray-800/30 to-gray-100" />
      
      <div className="relative h-full flex items-center justify-center z-10">
        <div className="text-center px-4 max-w-4xl mx-auto">
          <h1 className="text-4xl md:text-6xl font-bold mb-6 text-white drop-shadow-lg">
            Precompilazione automatica
          </h1>
          <p className="text-lg md:text-xl text-gray-100 drop-shadow-lg max-w-2xl mx-auto leading-relaxed">
            Estrai i dati dai tuoi documenti con AI
          </p>
        </div>
      </div>
    </div>
  );
}