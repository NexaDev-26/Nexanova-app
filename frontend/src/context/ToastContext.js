import React, { createContext, useContext, useState } from 'react';

const ToastContext = createContext();

export const useToast = () => useContext(ToastContext);

export const ToastProvider = ({ children }) => {
  const [messages, setMessages] = useState([]);

  const show = (msg) => {
    setMessages((m) => [...m, msg]);
    setTimeout(() => setMessages((m) => m.slice(1)), 3000);
  };

  return (
    <ToastContext.Provider value={{ show }}>
      {children}
      <div style={{ position: 'fixed', right: 12, bottom: 12, zIndex: 1000 }}>
        {messages.map((m, i) => (
          <div
            key={i}
            style={{
              background: '#222',
              color: '#fff',
              padding: '8px 12px',
              marginTop: 8,
              borderRadius: 6,
            }}
          >
            {m}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
};
