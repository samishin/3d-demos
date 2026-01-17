import React from 'react';
import './Preloader.css';

/**
 * Минималистичный прелоадер с тремя черными квадратами
 * Использует CSS-анимацию для создания эффекта загрузки
 */
const Preloader: React.FC = () => {
  return (
    <div className="preloader-overlay">
      <div className="preloader-container">
        <div className="square"></div>
        <div className="square"></div>
        <div className="square"></div>
      </div>
    </div>
  );
};

export default Preloader;