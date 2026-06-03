import { useState } from "react";
import Sidebar from "./components/Sidebar";
import HomePage from "./pages/HomePage";
import AnalysisPage from "./pages/AnalysisPage";
import ChatbotPage from "./pages/ChatbotPage";
import GraphPage from "./pages/GraphPage";
import startupsData from "./data/mockStartups";

function App() {
  const [currentPage, setCurrentPage] = useState("home");
  const [selectedCompany, setSelectedCompany] = useState(null);
  const [startups, setStartups] = useState(startupsData);

  const handleNavigate = (page) => {
    setCurrentPage(page);
  };


  const handleAddStartup = () => {
    const newStartup = {
      id: startups.length + 1,
      name: "NewCo " + (startups.length + 1),
      sector: "SaaS",
      metrics: { arr: 150000, customers: 20 },
      aiAnalysis: { recommendation: "Watchlist" },
    };
  
    setStartups((prev) => [...prev, newStartup]);
  };
  return (
    <div className="flex min-h-screen">
      {/* Sidebar */}
      <Sidebar
        onNavigate={handleNavigate}
        hasSelectedCompany={!!selectedCompany}
        currentPage={currentPage}
      />

      {/* Main Content */}
      <main className="flex-1 bg-gray-100 p-6 overflow-y-auto">
        {currentPage === "home" && (
          <HomePage
            startups={startups}
            onSelectCompany={setSelectedCompany}
            onAddStartupClick={handleAddStartup}
          />
        )}
        {currentPage === "analysis" && selectedCompany && (
          <AnalysisPage company={selectedCompany} />
        )}
        {currentPage === "chatbot" && <ChatbotPage />}
        {currentPage === "graph" && <GraphPage />}
      </main>
    </div>
  );
}

export default App;
