import React from "react";
import { useAppStore } from "./app/store/appStore";
import { HistoryPage } from "./ui/pages/HistoryPage";
import { PlayPage } from "./ui/pages/PlayPage";
import { SettingsPage } from "./ui/pages/SettingsPage";
import { SetupPage } from "./ui/pages/SetupPage";

const App: React.FC = () => {
  const initialize = useAppStore((state) => state.initialize);
  const screen = useAppStore((state) => state.ui.screen);

  React.useEffect(() => {
    initialize();
  }, [initialize]);

  return (
    <div className="h-screen w-screen bg-background text-foreground flex flex-col overflow-hidden">
      {/* Routing logic based on screen state */}
      {screen === "SETUP" && (
        <div className="flex-1 overflow-auto">
          <SetupPage />
        </div>
      )}
      {screen === "PLAY" && <PlayPage />}
      {screen === "HISTORY" && <HistoryPage />}
      {screen === "SETTINGS" && <SettingsPage />}
    </div>
  );
};

export default App;
