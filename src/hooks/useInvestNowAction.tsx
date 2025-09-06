
import { useCallback } from 'react';

export const useInvestNowAction = () => {
  const handleInvestNowClick = useCallback(() => {
    const tiersSection = document.getElementById('perks');
    if (tiersSection) {
      const offset = 80; // Account for navbar height
      const elementPosition = tiersSection.getBoundingClientRect().top + window.pageYOffset;
      window.scrollTo({
        top: elementPosition - offset,
        behavior: 'smooth'
      });
    }
  }, []);

  return {
    handleInvestNowClick,
  };
};

