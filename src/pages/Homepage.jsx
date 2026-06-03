import { useState } from "react";

const HomePage = ({ startups, onSelectCompany, onAddStartupClick }) => {
  const [search, setSearch] = useState("");
  const [sector, setSector] = useState("");
  const [arrMax, setArrMax] = useState(10); // ARR in millions

  const getAiScore = (recommendation) => {
    switch (recommendation) {
      case "Strong Potential":
        return 90;
      case "Watchlist":
        return 60;
      case "Early-Stage Watchlist":
        return 75;
      default:
        return 50;
    }
  };

  // Apply filters
  const filteredStartups = startups.filter((s) => {
    const matchesSearch = s.name.toLowerCase().includes(search.toLowerCase());
    const matchesSector =
      !sector || s.sector.toLowerCase().includes(sector.toLowerCase());
    const matchesArr = s.metrics.arr <= arrMax * 1_000_000;
    return matchesSearch && matchesSector && matchesArr;
  });

  return (
    <div className="p-8">
      {/* Header */}
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-4xl font-bold text-gray-900">
          Your Deal Flow Dashboard
        </h1>
        <button
          onClick={onAddStartupClick}
          className="bg-indigo-600 text-white font-bold py-3 px-6 rounded-lg shadow-lg hover:bg-indigo-700 transition duration-200 transform hover:scale-105"
        >
          Add New Startup
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-4 mb-6">
        <input
          type="text"
          placeholder="Search by name..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="border rounded px-3 py-2 flex-1"
        />

        <select
          value={sector}
          onChange={(e) => setSector(e.target.value)}
          className="border rounded px-3 py-2"
        >
          <option value="">All Sectors</option>
          <option value="SaaS">SaaS</option>
          <option value="FinTech">FinTech</option>
          <option value="Ag-Tech">Ag-Tech</option>
        </select>

        <div className="flex items-center space-x-2">
          <label className="text-sm text-gray-600">Max ARR (M):</label>
          <input
            type="range"
            min="0"
            max="10"
            step="0.1"
            value={arrMax}
            onChange={(e) => setArrMax(Number(e.target.value))}
            className="w-40"
          />
          <span>{arrMax}M</span>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto bg-white rounded-lg shadow-lg">
        <table className="w-full">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Company
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Sector
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                ARR
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Customers
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                AI Score
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {filteredStartups.map((company) => (
              <tr
                key={company.id}
                onClick={() => onSelectCompany(company)}
                className="hover:bg-gray-50 cursor-pointer transition duration-150 ease-in-out"
              >
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                  {company.name}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {company.sector}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  ${company.metrics.arr.toLocaleString()}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {company.metrics.customers}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-indigo-600">
                  {getAiScore(company.aiAnalysis.recommendation)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default HomePage;
