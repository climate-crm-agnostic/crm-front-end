import React, { useEffect } from 'react';

export const Notification = ({ message = '', type = 'success', onClose }) => {
  useEffect(() => {
    if (!message) return;
    const timer = setTimeout(() => {
      onClose?.(); // Call onClose if defined
    }, 5000);

    return () => clearTimeout(timer);
  }, [message, onClose]);

  // Avoid rendering if there is no message
  if (!message) return null;

  let bgColor = 'bg-green-500'; // success by default
  if (type === 'error') bgColor = 'bg-red-500';
  else if (type === 'warning') bgColor = 'bg-[#FFC107]';

  return (
    <div
      className={`fixed top-4 right-4 p-4 rounded shadow-lg text-white font-bold ${bgColor} z-[9999]`}
    >
      <div className="flex justify-between items-center">
        <span>{message}</span>
        <button
          onClick={onClose}
          className="ml-4 text-white font-bold focus:outline-none"
        >
          ✖
        </button>
      </div>
    </div>
  );
};
