import React, { HTMLAttributes } from 'react';

export interface CardProps extends HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
}

export const Card: React.FC<CardProps> = ({ children, className = '', ...props }) => {
  return (
    <div
      className={`bg-white rounded-2xl p-6 border-2 border-gray-200 shadow-sm ${className}`.trim()}
      {...props}
    >
      {children}
    </div>
  );
};

export default Card;
