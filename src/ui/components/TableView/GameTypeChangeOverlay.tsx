import type React from "react";
import { useEffect, useState } from "react";
import type { GameType } from "../../../domain/types";
import { getGameTypeLabel } from "../../utils/labelHelper";

interface GameTypeChangeOverlayProps {
  /** 現在のゲーム種目 */
  currentGameType: GameType;
  /** 前回のゲーム種目（初回ディールの場合はnull） */
  previousGameType: GameType | null;
  /** ディールが進行中かどうか */
  isDealActive: boolean;
}

/**
 * ゲーム種目変更時にフルスクリーン通知を表示するオーバーレイコンポーネント
 * 種目が変わった場合のみ2.5秒間表示され、自動的にフェードアウトする
 */
export const GameTypeChangeOverlay: React.FC<GameTypeChangeOverlayProps> = ({
  currentGameType,
  previousGameType,
  isDealActive,
}) => {
  const [isVisible, setIsVisible] = useState(false);
  const [isFading, setIsFading] = useState(false);

  // ゲーム種目の変更を検知
  const hasGameTypeChanged =
    previousGameType !== null &&
    previousGameType !== currentGameType &&
    isDealActive;

  useEffect(() => {
    if (hasGameTypeChanged) {
      // 表示開始
      setIsVisible(true);
      setIsFading(false);

      // 2秒後にフェードアウト開始
      const fadeTimer = setTimeout(() => {
        setIsFading(true);
      }, 2000);

      // 2.5秒後に完全に非表示
      const hideTimer = setTimeout(() => {
        setIsVisible(false);
        setIsFading(false);
      }, 2500);

      return () => {
        clearTimeout(fadeTimer);
        clearTimeout(hideTimer);
      };
    }
  }, [hasGameTypeChanged]);

  if (!isVisible) {
    return null;
  }

  return (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center pointer-events-none transition-opacity duration-500 ${
        isFading ? "opacity-0" : "opacity-100"
      }`}
    >
      {/* 背景のオーバーレイ（半透明） */}
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />

      {/* 通知カード */}
      <div
        className={`relative transform transition-all duration-300 ${
          isFading ? "scale-95" : "scale-100"
        }`}
      >
        <div className="bg-gradient-to-br from-poker-gold to-yellow-600 rounded-2xl px-10 py-8 shadow-2xl border-2 border-white/40">
          {/* 装飾的なリングエフェクト */}
          <div className="absolute inset-0 rounded-2xl animate-pulse bg-white/20" />

          <div className="relative text-center space-y-3">
            {/* ヘッダーテキスト */}
            <p className="text-yellow-900 text-sm font-medium tracking-wider uppercase">
              Game Type Changed
            </p>

            {/* ゲーム種目名 */}
            <h2 className="text-yellow-950 text-4xl font-black tracking-tight drop-shadow-sm">
              {getGameTypeLabel(currentGameType)}
            </h2>

            {/* 下部のアクセント */}
            <div className="flex items-center justify-center gap-2 pt-2">
              <div className="h-0.5 w-12 bg-yellow-900/40 rounded-full" />
              <div className="h-1.5 w-1.5 bg-yellow-900 rounded-full" />
              <div className="h-0.5 w-12 bg-yellow-900/40 rounded-full" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
