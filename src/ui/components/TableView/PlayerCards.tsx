import type React from "react";
import type { Card, PlayerHand, PlayerKind } from "../../../domain/types";

interface PlayerCardsProps {
  hand: PlayerHand;
  playerKind: PlayerKind;
  isActive: boolean;
  isDealFinished: boolean; // ディールが終了しているかどうか
}

/**
 * カードを表示するコンポーネント（裏面）
 */
const CardBack: React.FC = () => {
  return (
    <div className="w-12 h-16 bg-gradient-to-br from-green-900 to-black rounded border-2 border-green-950 shadow-md flex items-center justify-center">
      <div className="text-white text-xs font-bold"></div>
    </div>
  );
};

/**
 * カードを表示するコンポーネント（表面）
 * 重ねても見えるように左上に数字とスートを小さく表示
 */
const CardFront: React.FC<{ card: Card }> = ({ card }) => {
  const suitSymbols: Record<Card["suit"], string> = {
    c: "♣",
    d: "♦",
    h: "♥",
    s: "♠",
  };

  const suitColors: Record<Card["suit"], string> = {
    c: "text-black",
    d: "text-red-600",
    h: "text-red-600",
    s: "text-black",
  };

  return (
    <div className="relative w-12 h-16 bg-white rounded border-2 border-gray-800 shadow-md">
      {/* 左上に数字とスートを小さく表示 */}
      <div className="absolute top-0.5 left-0.5 flex flex-col items-start">
        <div
          className={`text-xs font-bold leading-tight ${suitColors[card.suit]}`}
        >
          {card.rank}
        </div>
        <div className={`text-xs leading-tight ${suitColors[card.suit]}`}>
          {suitSymbols[card.suit]}
        </div>
      </div>
      {/* 中央にも大きく表示（見やすさのため） */}
      <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 flex flex-col items-center">
        <div className={`text-lg font-bold ${suitColors[card.suit]}`}>
          {card.rank}
        </div>
        <div className={`text-xl ${suitColors[card.suit]}`}>
          {suitSymbols[card.suit]}
        </div>
      </div>
    </div>
  );
};

/**
 * PlayerCardsコンポーネント
 * レイアウト：d1 d2 u1 u2 u3 u4 d3
 * Humanはdown表示、他は裏
 * カードは重ねて表示し、upCardsは上方向にオフセット
 */
export const PlayerCards: React.FC<PlayerCardsProps> = ({
  hand,
  playerKind,
  isActive,
  isDealFinished,
}) => {
  if (!isActive) {
    return null; // foldしたプレイヤーはカードを表示しない
  }

  const isHuman = playerKind === "human";
  // ディールが終了していて、プレイヤーがアクティブな場合、ダウンカードを公開する
  const shouldRevealDownCards = isHuman || (isDealFinished && isActive);
  const { downCards, upCards } = hand;

  // レイアウト：d1 d2 u1 u2 u3 u4 d3
  // downCards[0], downCards[1], upCards[0], upCards[1], upCards[2], upCards[3], downCards[2]

  // カードの幅は48px（w-12）
  // カードの配置: d1(0), d2(15), u1(30), u2(45), u3(60), u4(75), d3(90)
  // 全てのカードが存在する場合、最初のカードの左端が0px、最後のカードの右端が90+48=138px
  // SeatPanelの中心にカードの集合の中心が来るように、コンテナの幅を138pxにして中央揃え
  const cardWidth = 48; // w-12 = 48px
  const lastCardLeft = 90; // d3のleft位置
  const lastCardRight = lastCardLeft + cardWidth; // 138px

  return (
    <div
      className="relative flex items-end mt-2 mx-auto"
      style={{ height: "64px", width: `${lastCardRight}px` }}
    >
      {/* d1 */}
      {downCards[0] && (
        <div
          className="absolute bottom-0"
          style={{ left: `${0}px`, zIndex: 0 }}
        >
          {shouldRevealDownCards ? (
            <CardFront card={downCards[0]} />
          ) : (
            <CardBack />
          )}
        </div>
      )}

      {/* d2 */}
      {downCards[1] && (
        <div
          className="absolute bottom-0"
          style={{ left: `${15}px`, zIndex: 1 }}
        >
          {shouldRevealDownCards ? (
            <CardFront card={downCards[1]} />
          ) : (
            <CardBack />
          )}
        </div>
      )}

      {/* u1 */}
      {upCards[0] && (
        <div
          className="absolute"
          style={{ left: `${30}px`, bottom: "8px", zIndex: 2 }}
        >
          <CardFront card={upCards[0]} />
        </div>
      )}

      {/* u2 */}
      {upCards[1] && (
        <div
          className="absolute"
          style={{ left: `${45}px`, bottom: "8px", zIndex: 3 }}
        >
          <CardFront card={upCards[1]} />
        </div>
      )}

      {/* u3 */}
      {upCards[2] && (
        <div
          className="absolute"
          style={{ left: `${60}px`, bottom: "8px", zIndex: 4 }}
        >
          <CardFront card={upCards[2]} />
        </div>
      )}

      {/* u4 */}
      {upCards[3] && (
        <div
          className="absolute"
          style={{ left: `${75}px`, bottom: "8px", zIndex: 5 }}
        >
          <CardFront card={upCards[3]} />
        </div>
      )}

      {/* d3 */}
      {downCards[2] && (
        <div
          className="absolute bottom-0"
          style={{ left: `${90}px`, zIndex: 6 }}
        >
          {shouldRevealDownCards ? (
            <CardFront card={downCards[2]} />
          ) : (
            <CardBack />
          )}
        </div>
      )}
    </div>
  );
};
