export const SectionLoader = ({ text = 'Loading...' }) => {
  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        minHeight: '300px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '16px',
      }}
    >
      <style>{`
        @keyframes barPulse {
          0%, 100% { transform: scaleY(0.25); opacity: 0.3; }
          50% { transform: scaleY(1); opacity: 1; }
        }
        .s-bar {
          width: 3px;
          height: 20px;
          border-radius: 2px;
          background: #B12B89;
          transform-origin: center;
          animation: barPulse 1.1s ease-in-out infinite;
        }
        .s-bar:nth-child(1) { animation-delay: 0s; }
        .s-bar:nth-child(2) { animation-delay: 0.1s; }
        .s-bar:nth-child(3) { animation-delay: 0.2s; }
        .s-bar:nth-child(4) { animation-delay: 0.3s; }
        .s-bar:nth-child(5) { animation-delay: 0.4s; }
      `}</style>

      <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
        <div className="s-bar" />
        <div className="s-bar" />
        <div className="s-bar" />
        <div className="s-bar" />
        <div className="s-bar" />
      </div>

      {text && (
        <p style={{ fontSize: '13px', color: '#6b7280', margin: 0 }}>{text}</p>
      )}
    </div>
  );
};