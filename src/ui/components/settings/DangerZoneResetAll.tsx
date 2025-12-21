import type React from "react";
import { useState } from "react";
import { useAppStore } from "../../../app/store/appStore";

export const DangerZoneResetAll: React.FC = () => {
  const resetAll = useAppStore((state) => state.resetAll);
  const setScreen = useAppStore((state) => state.setScreen);
  const [confirmText, setConfirmText] = useState("");
  const [showConfirm, setShowConfirm] = useState(false);

  const CONFIRM_TEXT = "DELETE ALL";

  const handleReset = () => {
    if (confirmText === CONFIRM_TEXT) {
      resetAll();
      setScreen("SETUP");
      setShowConfirm(false);
      setConfirmText("");
    }
  };

  const handleCancel = () => {
    setShowConfirm(false);
    setConfirmText("");
  };

  return (
    <div className="bg-destructive/10 border border-destructive p-4 rounded">
      <div className="mb-4">
        <h3 className="font-semibold text-destructive mb-2">全データ削除</h3>
        <p className="text-sm text-muted-foreground mb-4">
          すべてのゲームデータ、履歴、お気に入りを削除します。この操作は取り消せません。
        </p>
      </div>

      {!showConfirm ? (
        <button
          type="button"
          onClick={() => setShowConfirm(true)}
          className="px-4 py-2 bg-destructive text-destructive-foreground rounded hover:bg-destructive/90"
        >
          全データを削除
        </button>
      ) : (
        <div className="space-y-3">
          <div>
            <label
              htmlFor="confirm-input"
              className="block text-sm font-medium mb-2"
            >
              確認のため、以下を入力してください: <code>{CONFIRM_TEXT}</code>
            </label>
            <input
              id="confirm-input"
              type="text"
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              className="w-full px-3 py-2 border border-border rounded bg-background text-foreground"
              placeholder={CONFIRM_TEXT}
            />
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={handleReset}
              disabled={confirmText !== CONFIRM_TEXT}
              className="px-4 py-2 bg-destructive text-destructive-foreground rounded hover:bg-destructive/90 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              削除を実行
            </button>
            <button
              type="button"
              onClick={handleCancel}
              className="px-4 py-2 bg-muted text-muted-foreground rounded hover:bg-muted/80"
            >
              キャンセル
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
