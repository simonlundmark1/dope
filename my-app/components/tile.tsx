import React from 'react';

interface TileProps {
  icon: string;
  isSpecial: boolean;
  onClick: () => void;
  disabled: boolean;
}

const Tile: React.FC<TileProps> = ({ icon, isSpecial, onClick, disabled }) => {
  return (
    <button
      className={`tile ${isSpecial ? 'special' : ''}`}
      onClick={onClick}
      disabled={disabled}
    >
      {icon}
    </button>
  );
};

export default Tile;
