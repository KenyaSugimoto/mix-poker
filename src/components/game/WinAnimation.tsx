import { useEffect, useState } from 'react';
interface WinAnimationProps {
  amount: number;
  winnerName: string;
  onComplete: () => void;
}

export const WinAnimation = ({ amount, winnerName, onComplete }: WinAnimationProps) => {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
        setVisible(false);
        onComplete();
    }, 3000);
    return () => clearTimeout(timer);
  }, [onComplete]);

  if (!visible) return null;

  return (
    <div className="fixed inset-0 flex items-center justify-center z-[100] pointer-events-none">
       <div className="flex flex-col items-center animate-bounce-in">
          <div className="text-6xl font-black text-amber-500 drop-shadow-[0_0_20px_rgba(245,158,11,0.8)] stroke-black text-stroke-2">
             + ${amount}
          </div>
          <div className="text-2xl text-white font-bold mt-2 text-shadow">
             {winnerName} Wins!
          </div>
       </div>
    </div>
  );
};
