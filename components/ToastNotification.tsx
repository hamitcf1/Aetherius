import React from 'react';

export interface ToastMessage {
  id: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error';
}

const toastColors: Record<string, string> = {
  info: '#2d72fc',
  success: '#2ecc40',
  warning: '#ffb700',
  error: '#ff3b30',
};

export const ToastNotification: React.FC<{
  messages: ToastMessage[];
  onClose?: (id: string) => void;
}> = ({ messages, onClose }) => {
  return (
    <div style={{
      position: 'fixed',
      bottom: 32,
      right: 32,
      zIndex: 9999,
      display: 'flex',
      flexDirection: 'column',
      gap: '12px',
      pointerEvents: 'none',
    }}>
      {messages.map(({ id, message, type }) => (
        <div
          key={id}
          style={{
            minWidth: 240,
            maxWidth: 400,
            background: toastColors[type] || toastColors.info,
            color: '#fff',
            borderRadius: 8,
            boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
            padding: '12px 20px',
            fontSize: 16,
            fontWeight: 500,
            pointerEvents: 'auto',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            opacity: 0.95,
            transition: 'opacity 0.2s',
          }}
        >
          <span>{message}</span>
          {onClose && (
            <button
              style={{
                marginLeft: 16,
                background: 'transparent',
                border: 'none',
                color: '#fff',
                fontSize: 18,
                cursor: 'pointer',
                pointerEvents: 'auto',
              }}
              onClick={() => onClose(id)}
              aria-label="Close notification"
            >
              ×
            </button>
          )}
        </div>
      ))}
    </div>
  );
};
