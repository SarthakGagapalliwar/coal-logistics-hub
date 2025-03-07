
import React from 'react';

interface PageTransitionProps {
  children: React.ReactNode;
  className?: string;
}

const PageTransition: React.FC<PageTransitionProps> = ({ children, className = '' }) => {
  return (
    <div className={`page-transition-container animate-fade-in ${className}`}>
      {children}
    </div>
  );
};

export default PageTransition;
