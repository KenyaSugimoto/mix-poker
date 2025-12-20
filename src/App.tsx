import React from "react";
import { useAppStore } from "./app/store/appStore";
import { SetupPage } from "./ui/pages/SetupPage";

const App: React.FC = () => {
  const initialize = useAppStore((state) => state.initialize);
  const screen = useAppStore((state) => state.ui.screen);

  React.useEffect(() => {
    initialize();
  }, [initialize]);

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      {/* Routing logic based on screen state */}
      {screen === "SETUP" && <SetupPage />}
      {screen === "PLAY" && (
        <div className="p-8 text-center">PLAY SCREEN (Coming Soon)</div>
      )}
    </div>
  );
};

export default App;
