import React from 'react';
import myLogo from '../../../assets/LOGO.svg';

export const LoaderPage = () => {
  return (
    <div className="flex flex-col items-center justify-center h-screen gap-10">
      <img
        src={myLogo}
        alt="Logo"
        style={{ width: '220px', height: 'auto' }}
      />

      <style>{`
        @keyframes barPulse {
          0%, 100% { transform: scaleY(0.25); opacity: 0.3; }
          50% { transform: scaleY(1); opacity: 1; }
        }
        .bar {
          width: 5px;
          height: 36px;
          border-radius: 2px;
          background: #B12B89;
          transform-origin: center;
          animation: barPulse 1.1s ease-in-out infinite;
        }
        .bar:nth-child(1) { animation-delay: 0s; }
        .bar:nth-child(2) { animation-delay: 0.1s; }
        .bar:nth-child(3) { animation-delay: 0.2s; }
        .bar:nth-child(4) { animation-delay: 0.3s; }
        .bar:nth-child(5) { animation-delay: 0.4s; }
      `}</style>

      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
        <div className="bar" />
        <div className="bar" />
        <div className="bar" />
        <div className="bar" />
        <div className="bar" />
      </div>
    </div>
  );
};