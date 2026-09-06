import { Search, ChevronLeft } from 'lucide-react';

export const NotFound = ({ 
  icon: Icon = Search, 
  title = 'Non trouvé',
  message = 'L’élément demandé est introuvable.',
  // Default action label with the icon already included
  actionLabel = (
    <>
      <ChevronLeft size={16} />
      Retour
    </>
  ),
  onAction,
  minHeight = '300px'
}) => {
  return (
    <div style={{
        width: '100%',
        height: '100%',
        minHeight: minHeight,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '20px',
        padding: '32px 16px',
      }}
    >
      <style>{`
        @keyframes gentleFade {
          0%, 100% { opacity: 0.4; }
          50% { opacity: 1; }
        }
        .nf-icon {
          animation: gentleFade 3s ease-in-out infinite;
        }
        .nf-action-btn {
          background: #B12B89;
          color: white;
          border: none;
          padding: 10px 24px;
          border-radius: 12px;
          font-size: 14px;
          font-weight: 600;
          cursor: pointer;
          display: flex;
          align-items: center;
          gap: 8px;
          transition: all 0.2s ease;
        }
        .nf-action-btn:hover {
          background: #0d6ecc;
          transform: translateY(-1px);
          box-shadow: 0 4px 12px rgba(15, 131, 239, 0.2);
        }
        .nf-action-btn:active {
          transform: translateY(0);
        }
      `}</style>

      <div className="nf-icon">
        <Icon 
          size={48} 
          strokeWidth={1.5}
          style={{ color: '#cbd5e1' }} 
        />
      </div>

      <div style={{ textAlign: 'center', maxWidth: '400px' }}>
        <h3 style={{ fontSize: '18px', fontWeight: '700', color: '#2e2e2e', margin: '0 0 8px 0' }}>
          {title}
        </h3>
        {message && (
          <p style={{ fontSize: '13px', color: '#64748b', margin: 0, lineHeight: '1.5' }}>
            {message}
          </p>
        )}
      </div>

      {onAction && (
        <button onClick={onAction} className="nf-action-btn">
          {actionLabel}
        </button>
      )}
    </div>
  );
};