import React, { createContext, useContext, useState } from 'react';

const ToastContext = createContext();
export const useToast = () => useContext(ToastContext);

export const ToastProvider = ({ children }) => {
  const [messages, setMessages] = useState([]);

  const addToast = (msg) => {
    setMessages([...messages, msg]);
    setTimeout(() => setMessages((msgs) => msgs.slice(1)), 3000);
  };

  return (
    <ToastContext.Provider value={{ addToast }}>
      {children}
      <div className="toast-container">
        {messages.map((msg, idx) => (
          <div key={idx} className="toast">{msg}</div>
        ))}
      </div>
    </ToastContext.Provider>
  );
};
