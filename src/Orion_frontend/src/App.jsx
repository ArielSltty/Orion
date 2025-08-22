import React, { useState, useEffect } from "react";
import LandingPage from "./LandingPage";
import { Orion_backend } from "declarations/Orion_backend";

function Dashboard() {
  const [parameters, setParameters] = useState({
    initial_price: 100,
    drift: 0.05,
    volatility: 0.2,
    time_horizon: 1.0,
    time_steps: 252,
    n_simulations: 1000,
  });
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [requestId, setRequestId] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setResult(null);

    try {
      const requestId = await Orion_backend.submit_simulation_request(
        { monte_carlo: null },
        parameters
      );
      setRequestId(requestId);

      const pollResult = async () => {
        const simulationResult = await Orion_backend.get_simulation_result(requestId);
        if (simulationResult) {
          const status = simulationResult.status;
          if ("#completed" in status) {
            setResult(simulationResult);
            setLoading(false);
          } else if ("#failed" in status) {
            setResult(simulationResult);
            setLoading(false);
          } else {
            setTimeout(pollResult, 2000);
          }
        } else {
          setTimeout(pollResult, 2000);
        }
      };

      pollResult();
    } catch (err) {
      console.error("Simulation request failed:", err);
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 text-cyan-100 font-sans">
      <header className="py-6 text-center text-3xl md:text-4xl font-extrabold drop-shadow-cyberpunk text-cyan-300 animate-pulse">
        Orion Dashboard
      </header>
      <main className="flex-1 flex flex-col items-center justify-center px-4 py-8">
        <form
          onSubmit={handleSubmit}
          className="w-full max-w-2xl bg-gray-800/70 p-8 rounded-2xl border border-cyan-700 shadow-cyberpunk mb-8"
        >
          <h2 className="text-2xl font-bold mb-6 text-cyan-200">Monte Carlo Financial Simulation</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            {Object.entries(parameters).map(([key, value]) => (
              <div key={key}>
                <label className="block text-sm font-medium mb-1">{key.replace("_", " ")}</label>
                <input
                  type="number"
                  step="any"
                  value={value}
                  onChange={(e) =>
                    setParameters({
                      ...parameters,
                      [key]: parseFloat(e.target.value),
                    })
                  }
                  className="w-full p-2 rounded bg-gray-900/60 border border-cyan-400 text-cyan-100"
                  required
                />
              </div>
            ))}
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full mt-4 py-3 text-xl font-bold rounded-xl bg-gradient-to-r from-teal-400 via-cyan-500 to-blue-500 shadow-cyberpunk hover:scale-105 transition-transform border-4 border-cyan-300 animate-glow disabled:opacity-50"
          >
            {loading ? "Running Simulation..." : "Run Simulation"}
          </button>
        </form>

        {requestId && <div className="mb-4 text-cyan-300">Request ID: {requestId}</div>}

        {result && (
          <div className="w-full max-w-2xl bg-gray-800/70 p-8 rounded-2xl border border-cyan-700 shadow-cyberpunk">
            <h3 className="text-xl font-bold mb-4 text-cyan-200">Simulation Results</h3>
            {result.status["#completed"] ? (
              <div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                  <div className="bg-gray-900/60 p-4 rounded border border-cyan-400">
                    <p className="text-sm text-cyan-400">Mean Price</p>
                    <p className="text-lg font-semibold">${result.result.mean_price.toFixed(2)}</p>
                  </div>
                  <div className="bg-gray-900/60 p-4 rounded border border-cyan-400">
                    <p className="text-sm text-cyan-400">Standard Deviation</p>
                    <p className="text-lg font-semibold">${result.result.std_dev.toFixed(2)}</p>
                  </div>
                  <div className="bg-gray-900/60 p-4 rounded border border-cyan-400">
                    <p className="text-sm text-cyan-400">95% Confidence Interval</p>
                    <p className="text-lg font-semibold">
                      ${result.result.confidence_interval[0].toFixed(2)} - ${result.result.confidence_interval[1].toFixed(2)}
                    </p>
                  </div>
                </div>
                <div className="mb-4">
                  <h4 className="font-semibold mb-2 text-cyan-300">Simulation Parameters</h4>
                  <pre className="bg-gray-900/60 p-4 rounded text-sm border border-cyan-400 text-cyan-100">
                    {JSON.stringify(result.result.parameters_used, null, 2)}
                  </pre>
                </div>
                <div>
                  <h4 className="font-semibold mb-2 text-cyan-300">Blockchain Verification</h4>
                  <p className="text-sm text-cyan-400">
                    Transaction Hash: {result.agent_signature || "Pending..."}
                  </p>
                </div>
              </div>
            ) : (
              <div className="text-pink-400">
                <p>Simulation failed or still processing...</p>
              </div>
            )}
          </div>
        )}
      </main>
      <style>{`
        .drop-shadow-cyberpunk {
          text-shadow: 0 0 8px #0ff, 0 0 24px #0ff, 0 0 32px #f0f, 0 0 48px #0ff;
        }
        .shadow-cyberpunk {
          box-shadow: 0 0 16px #0ff, 0 0 32px #f0f;
        }
        .animate-glow {
          animation: glow 2s infinite alternate;
        }
        @keyframes glow {
          from { box-shadow: 0 0 16px #0ff, 0 0 32px #f0f; }
          to { box-shadow: 0 0 32px #0ff, 0 0 64px #f0f; }
        }
      `}</style>
    </div>
  );
}

export default function App() {
  const [showDashboard, setShowDashboard] = useState(false);
  return showDashboard ? (
    <Dashboard />
  ) : (
    <LandingPage onRunSimulation={() => setShowDashboard(true)} />
  );
}
