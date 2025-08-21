import React, { useState } from 'react';
import { Orion_backend } from 'declarations/Orion_backend';

function MonteCarloSimulator() {
  const [parameters, setParameters] = useState({
    initial_price: 100,
    drift: 0.05,
    volatility: 0.2,
    time_horizon: 1.0,
    time_steps: 252,
    n_simulations: 1000
  });
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [requestId, setRequestId] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      const requestId = await orbis.submit_simulation_request(
        { monte_carlo: null },
        parameters
      );
      
      setRequestId(requestId);
      
      // Poll for results
      const checkResult = async () => {
        const simulationResult = await orbis.get_simulation_result(requestId);
        
        if (simulationResult && simulationResult.status.completed) {
          setResult(simulationResult);
          setLoading(false);
        } else if (simulationResult && simulationResult.status.failed) {
          setResult(simulationResult);
          setLoading(false);
        } else {
          setTimeout(checkResult, 2000); // Check again after 2 seconds
        }
      };
      
      checkResult();
    } catch (error) {
      console.error('Simulation request failed:', error);
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      <h1 className="text-3xl font-bold mb-6">Monte Carlo Financial Simulation</h1>
      
      <form onSubmit={handleSubmit} className="bg-white p-6 rounded-lg shadow-md mb-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <div>
            <label className="block text-sm font-medium mb-1">Initial Price</label>
            <input
              type="number"
              step="0.01"
              value={parameters.initial_price}
              onChange={(e) => setParameters({...parameters, initial_price: parseFloat(e.target.value)})}
              className="w-full p-2 border rounded"
              required
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-1">Drift Rate</label>
            <input
              type="number"
              step="0.001"
              value={parameters.drift}
              onChange={(e) => setParameters({...parameters, drift: parseFloat(e.target.value)})}
              className="w-full p-2 border rounded"
              required
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-1">Volatility</label>
            <input
              type="number"
              step="0.01"
              value={parameters.volatility}
              onChange={(e) => setParameters({...parameters, volatility: parseFloat(e.target.value)})}
              className="w-full p-2 border rounded"
              required
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-1">Time Horizon (Years)</label>
            <input
              type="number"
              step="0.1"
              value={parameters.time_horizon}
              onChange={(e) => setParameters({...parameters, time_horizon: parseFloat(e.target.value)})}
              className="w-full p-2 border rounded"
              required
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-1">Time Steps</label>
            <input
              type="number"
              value={parameters.time_steps}
              onChange={(e) => setParameters({...parameters, time_steps: parseInt(e.target.value)})}
              className="w-full p-2 border rounded"
              required
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-1">Number of Simulations</label>
            <input
              type="number"
              value={parameters.n_simulations}
              onChange={(e) => setParameters({...parameters, n_simulations: parseInt(e.target.value)})}
              className="w-full p-2 border rounded"
              required
            />
          </div>
        </div>
        
        <button
          type="submit"
          disabled={loading}
          className="bg-blue-500 text-white px-6 py-2 rounded hover:bg-blue-600 disabled:opacity-50"
        >
          {loading ? 'Running Simulation...' : 'Run Simulation'}
        </button>
      </form>
      
      {requestId && (
        <div className="mb-4">
          <p className="text-sm text-gray-600">Request ID: {requestId}</p>
        </div>
      )}
      
      {result && (
        <div className="bg-white p-6 rounded-lg shadow-md">
          <h2 className="text-xl font-semibold mb-4">Simulation Results</h2>
          
          {result.success ? (
            <div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                <div className="bg-gray-50 p-4 rounded">
                  <p className="text-sm text-gray-600">Mean Price</p>
                  <p className="text-lg font-semibold">${result.result.mean_price.toFixed(2)}</p>
                </div>
                
                <div className="bg-gray-50 p-4 rounded">
                  <p className="text-sm text-gray-600">Standard Deviation</p>
                  <p className="text-lg font-semibold">${result.result.std_dev.toFixed(2)}</p>
                </div>
                
                <div className="bg-gray-50 p-4 rounded">
                  <p className="text-sm text-gray-600">95% Confidence Interval</p>
                  <p className="text-lg font-semibold">
                    ${result.result.confidence_interval[0].toFixed(2)} - ${result.result.confidence_interval[1].toFixed(2)}
                  </p>
                </div>
              </div>
              
              <div className="mb-4">
                <h3 className="font-semibold mb-2">Simulation Parameters</h3>
                <pre className="bg-gray-50 p-4 rounded text-sm">
                  {JSON.stringify(result.result.parameters_used, null, 2)}
                </pre>
              </div>
              
              <div>
                <h3 className="font-semibold mb-2">Blockchain Verification</h3>
                <p className="text-sm text-gray-600">
                  Transaction Hash: {result.agent_signature || 'Pending...'}
                </p>
              </div>
            </div>
          ) : (
            <div className="text-red-600">
              <p>Simulation failed: {result.error}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// pesan 
function ChatInterface() {
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');

  const sendMessage = async () => {
  };

  return (
    <div className="chat-interface">
      <div className="messages">
        {messages.map((msg, index) => (
          <div key={index} className={`message ${msg.type}`}>
            {msg.text}
          </div>
        ))}
      </div>
      <input
        value={inputText}
        onChange={(e) => setInputText(e.target.value)}
        placeholder="Type your message..."
      />
      <button onClick={sendMessage}>Send</button>
    </div>
  );
}

export default MonteCarloSimulator;