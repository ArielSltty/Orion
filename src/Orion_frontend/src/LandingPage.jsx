import React, { useState } from "react";
import { login } from "./auth";

const developers = [
  { name: "Yondri", seed: "yondri" },
  { name: "Ariel", seed: "ariel" },
  { name: "Gerin", seed: "gerin" },
];

export default function LandingPage({ onRunSimulation }) {
  const [loading, setLoading] = useState(false);
  const [principal, setPrincipal] = useState(null);

  const handleRunSimulation = async () => {
    if (!principal) {
      try {
        const p = await login(); // munculkan popup Internet Identity
        setPrincipal(p);
        console.log("Logged in as:", p);
      } catch (err) {
        console.error("Login failed:", err);
        return;
      }
    }

    setLoading(true);

    try {
      const requestId = await Orion_backend.submit_simulation_request(
        { monte_carlo: null },
        {
          initial_price: 100,
          drift: 0.05,
          volatility: 0.2,
          time_horizon: 1,
          time_steps: 252,
          n_simulations: 1000,
        }
      );
      console.log("Request submitted:", requestId);
      setLoading(false);
      onRunSimulation(); // arahkan ke dashboard
    } catch (err) {
      console.error("Simulation request failed:", err);
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col justify-between bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 text-white font-sans">
      <main className="flex-1 flex flex-col items-center justify-center px-6 py-16 text-center">
        <h1 className="text-5xl md:text-6xl font-extrabold mb-6 animate-pulse">
          Orion Project
        </h1>
        <p className="max-w-3xl text-lg md:text-xl mb-8 leading-relaxed bg-black/30 p-6 rounded-xl border border-teal-400 shadow-lg">
          Orion is a next-generation decentralized simulation platform powered by blockchain and AI. 
          It enables users to run advanced Monte Carlo financial simulations, interact with autonomous smart agents, 
          and visualize results in a responsive, modern interface. The platform integrates blockchain verification 
          to ensure transparency, reliability, and auditability of every simulation. Orion brings the future of 
          finance to your fingertips, combining cutting-edge AI technology, decentralized trust, and user-friendly design.
        </p>
        <button
          onClick={handleRunSimulation}
          disabled={loading}
          className="px-10 py-4 text-2xl font-bold bg-gradient-to-r from-teal-400 via-cyan-500 to-teal-500 rounded-xl shadow-lg hover:scale-105 transition-transform animate-glow border-2 border-teal-300"
        >
          {loading ? "Running Simulation..." : "Run Simulation"}
        </button>
      </main>

      <footer className="w-full py-12 bg-black/40 border-t border-teal-400 flex flex-col items-center">
        <h2 className="text-2xl font-bold mb-6 text-teal-300">Meet the Developers</h2>
        <div className="flex gap-10 flex-wrap justify-center">
          {developers.map((dev, i) => (
            <div key={dev.name} className="flex flex-col items-center">
              <img
                src={`https://api.dicebear.com/8.x/identicon/svg?seed=${dev.seed}`}
                alt={dev.name}
                className="w-20 h-20 rounded-full border-4 border-teal-400 shadow-lg animate-bounce-slow"
                style={{ animationDelay: `${i * 0.3}s` }}
              />
              <span className="mt-2 font-semibold text-teal-200">{dev.name}</span>
            </div>
          ))}
        </div>
        <div className="mt-6 text-sm text-teal-500">&copy; 2025 Orion Project. All rights reserved.</div>
      </footer>

      <style>{`
        .animate-glow {
          animation: glow 2s infinite alternate;
        }
        @keyframes glow {
          from { box-shadow: 0 0 12px #0ff, 0 0 24px #0ff; }
          to { box-shadow: 0 0 24px #0ff, 0 0 48px #0ff; }
        }
        .animate-bounce-slow {
          animation: bounce-slow 2.5s infinite;
        }
        @keyframes bounce-slow {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-16px); }
        }
      `}</style>
    </div>
  );
}
