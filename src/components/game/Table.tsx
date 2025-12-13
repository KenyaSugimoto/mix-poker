import React from 'react';
import { Seat } from './Seat';
import { GameInfo } from './GameInfo';
import type { Player, Street, ActionType } from '@/types';
import { cn } from '@/lib/utils';
import { ActionPanel } from './ActionPanel';

interface TableProps {
  players: Player[];
  heroIndex: number;
  pot: number;
  street: Street;
  activePlayerIndex: number | null;
  validActions: ActionType[];
  onAction: (action: ActionType) => void;
  className?: string;
}

export const Table = ({
  players,
  heroIndex,
  pot,
  street,
  activePlayerIndex,
  validActions,
  onAction,
  className
}: TableProps) => {

  // Layout Logic:
  // Using absolute percentages for positioning.
  const getPositionStyle = (relativeIndex: number, totalPlayers: number) => {
    // Hero is index 0 in relative terms.
    if (relativeIndex === 0) return { bottom: '8%', left: '50%', transform: 'translateX(-50%)' };

    const angleStep = 360 / totalPlayers;
    const startAngle = 90; // Bottom

    const angle = startAngle + (relativeIndex * angleStep);
    const radian = (angle * Math.PI) / 180;

    // Ellipse radii (assuming 100% width/height container)
    // We want margins, so radius is like 40% w, 35% h
    const radiusX = 40;
    const radiusY = 35;
    const centerX = 50;
    const centerY = 50;

    const left = centerX + radiusX * Math.cos(radian);
    const top = centerY + radiusY * Math.sin(radian);

    return { left: `${left}%`, top: `${top}%`, transform: 'translate(-50%, -50%)' };
  };

  // Reorder players so Hero is first for iteration
  const shift = heroIndex;
  const orderedPlayers = [
    ...players.slice(shift),
    ...players.slice(0, shift)
  ];

  return (
    <div className={cn("relative w-full h-full bg-surface/50 rounded-[100px] border-[20px] border-slate-900 shadow-2xl overflow-hidden", className)}>
      {/* Table Felt */}
      <div className="absolute inset-2 rounded-[80px] bg-green-900/20 shadow-inner border border-white/5"
           style={{ backgroundImage: 'radial-gradient(circle at center, #1e293b 0%, #0f172a 100%)' }} />

      {/* Center Info */}
      <GameInfo pot={pot} street={street} />

      {/* Seats with Positioning */}
      {orderedPlayers.map((player, idx) => {
          const originalIndex = (idx + shift) % players.length;
          const style = getPositionStyle(idx, orderedPlayers.length);

          // We use a wrapper div for positioning since Seat component styling is for internal layout
          return (
            <div key={`pos-${player.id}`} className="absolute" style={style as React.CSSProperties}>
               <Seat
                 player={player}
                 isActivePlayer={originalIndex === activePlayerIndex}
                 isHero={idx === 0}
                 positionStr=""
               />
            </div>
          );
      })}

      {/* Action Panel (Overlay at bottom) */}
      <div className="absolute bottom-0 left-0 right-0 z-50">
        <ActionPanel
           validActions={validActions}
           onAction={onAction}
           className="bg-transparent border-t-0 bg-gradient-to-t from-black via-black/90 to-transparent"
        />
      </div>
    </div>
  );
};
