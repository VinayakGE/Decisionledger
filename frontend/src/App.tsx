import React from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Sidebar } from "./components/Sidebar";
import { UploadPage } from "./pages/UploadPage";
import { DecisionsPage } from "./pages/DecisionsPage";
import { GoalsPage } from "./pages/GoalsPage";
import { OpenQuestionsPage } from "./pages/OpenQuestionsPage";
import { ActionItemsPage } from "./pages/ActionItemsPage";
import { ConstraintsPage } from "./pages/ConstraintsPage";
import { InsightsPage } from "./pages/InsightsPage";
import { SourcesPage } from "./pages/SourcesPage";
import { colors } from "./lib/styles";

export default function App() {
  return (
    <BrowserRouter>
      <div style={{ display: "flex", minHeight: "100vh", background: colors.bg }}>
        <Sidebar />
        <main style={{ flex: 1, overflowY: "auto" }}>
          <Routes>
            <Route path="/" element={<UploadPage />} />
            <Route path="/decisions" element={<DecisionsPage />} />
            <Route path="/goals" element={<GoalsPage />} />
            <Route path="/questions" element={<OpenQuestionsPage />} />
            <Route path="/actions" element={<ActionItemsPage />} />
            <Route path="/constraints" element={<ConstraintsPage />} />
            <Route path="/insights" element={<InsightsPage />} />
            <Route path="/sources" element={<SourcesPage />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  );
}
