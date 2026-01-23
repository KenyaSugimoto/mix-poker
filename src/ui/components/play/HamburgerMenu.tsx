import type React from "react";
import { useState } from "react";

interface HamburgerMenuProps {
  onHistoryClick: () => void;
  onSettingsClick: () => void;
  onExitGameClick: () => void;
}

export const HamburgerMenu: React.FC<HamburgerMenuProps> = ({
  onHistoryClick,
  onSettingsClick,
  onExitGameClick,
}) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="p-2 rounded hover:bg-muted/80 transition-colors"
        aria-label="メニューを開く"
      >
        <svg
          className="w-6 h-6"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <title>メニュー</title>
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M4 6h16M4 12h16M4 18h16"
          />
        </svg>
      </button>
      {isOpen && (
        <>
          {/* オーバーレイ */}
          <button
            type="button"
            className="fixed inset-0 z-40"
            onClick={() => setIsOpen(false)}
            onKeyDown={(e) => {
              if (e.key === "Escape") {
                setIsOpen(false);
              }
            }}
            aria-label="メニューを閉じる"
          />
          {/* メニュー */}
          <div className="absolute right-0 top-full mt-2 bg-card border rounded-lg shadow-lg z-50 min-w-[150px]">
            <button
              type="button"
              onClick={() => {
                setIsOpen(false);
                onHistoryClick();
              }}
              className="w-full text-left px-4 py-2 hover:bg-muted/80 transition-colors rounded-t-lg"
            >
              履歴
            </button>
            <button
              type="button"
              onClick={() => {
                setIsOpen(false);
                onSettingsClick();
              }}
              className="w-full text-left px-4 py-2 hover:bg-muted/80 transition-colors"
            >
              設定
            </button>
            <button
              type="button"
              onClick={() => {
                if (
                  window.confirm("現在のゲームを終了して設定画面に戻りますか？")
                ) {
                  setIsOpen(false);
                  onExitGameClick();
                }
              }}
              className="w-full text-left px-4 py-2 hover:bg-muted/80 transition-colors rounded-b-lg text-destructive"
            >
              退出
            </button>
          </div>
        </>
      )}
    </div>
  );
};
