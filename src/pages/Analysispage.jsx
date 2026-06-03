const AnalysisPage = ({ company }) => {
    return (
      <div className="p-8 bg-white rounded-lg shadow-lg">
        <h1 className="text-3xl font-bold mb-4">{company.name} Analysis</h1>
        <p className="text-gray-600 mb-4">
          Sector: <strong>{company.sector}</strong>
        </p>
        <p className="text-gray-600 mb-4">
          ARR: ${company.metrics.arr.toLocaleString()}
        </p>
        <p className="text-gray-600 mb-4">
          Customers: {company.metrics.customers}
        </p>
        <p className="text-gray-600 mb-4">
          AI Recommendation:{" "}
          <span className="font-semibold text-indigo-600">
            {company.aiAnalysis.recommendation}
          </span>
        </p>
      </div>
    );
  };
  
  export default AnalysisPage;
  