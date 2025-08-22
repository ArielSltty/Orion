import os
from dotenv import load_dotenv
import requests
from uagents import Agent, Context, Model
from uagents.protocol import Protocol
from uagents.setup import fund_agent_if_low
import numpy as np
import logging
from datetime import datetime
import json

load_dotenv()

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("OrionAgent")

# ---------------- CONFIG ----------------
ORION_AGENT_SEED = os.getenv("AGENT_SEED")
if not ORION_AGENT_SEED:
    logger.error("AGENT_SEED not found!")
    exit(1)

LOCAL_CALLBACK_URL = "http://127.0.0.1:4943/?canisterId=uzt4z-lp777-77774-qaabq-cai&method=receive"

# ---------------- MODELS ----------------
class SimulationRequest(Model):
    simulation_type: str
    parameters: dict
    request_id: str
    callback_url: str = LOCAL_CALLBACK_URL

class SimulationResult(Model):
    request_id: str
    success: bool
    result: dict = None
    error: str = None
    signature: str = None

class ChatMessage(Model):
    text: str
    user_id: str = None
    session_id: str = None
    timestamp: str = None

class ChatResponse(Model):
    response: str
    session_id: str = None
    timestamp: str = None
    requires_parameters: bool = False
    parameter_template: dict = None

# ---------------- PROTOCOLS ----------------
simulation_protocol = Protocol(name="OrionSimulation", version="1.0")
chat_protocol = Protocol(name="OrionChat", version="1.0")

agent = Agent(name="orion_simulation_agent", seed=ORION_AGENT_SEED)
fund_agent_if_low(agent.wallet.address())

# ---------------- MONTE CARLO ----------------
def run_monte_carlo_simulation(parameters):
    try:
        initial_price = float(parameters.get('initial_price', 100))
        drift = float(parameters.get('drift', 0.05))
        volatility = float(parameters.get('volatility', 0.2))
        time_horizon = float(parameters.get('time_horizon', 1.0))
        time_steps = int(parameters.get('time_steps', 252))
        n_simulations = int(parameters.get('n_simulations', 1000))
        
        dt = time_horizon / time_steps
        prices = np.zeros((time_steps, n_simulations))
        prices[0] = initial_price
        
        for t in range(1, time_steps):
            shock = np.random.normal(loc=0, scale=1, size=n_simulations)
            prices[t] = prices[t-1] * np.exp((drift - 0.5 * volatility**2) * dt 
                                           + volatility * np.sqrt(dt) * shock)
        
        final_prices = prices[-1]
        mean_price = np.mean(final_prices)
        std_dev = np.std(final_prices)
        confidence_interval = np.percentile(final_prices, [5, 95])
        
        return True, {
            'mean_price': float(mean_price),
            'std_dev': float(std_dev),
            'confidence_interval': [float(confidence_interval[0]), float(confidence_interval[1])],
            'final_prices_sample': final_prices[:10].tolist(),
            'simulation_timestamp': datetime.utcnow().isoformat(),
            'parameters_used': parameters
        }
        
    except Exception as e:
        logger.error(f"Simulation error: {str(e)}")
        return False, {'error': str(e)}

# ---------------- CHAT ----------------
def handle_chat_text(text: str):
    text_lower = text.lower()
    if any(greeting in text_lower for greeting in ['hello', 'hi', 'hey', 'hola']):
        return "Hello! I'm Orion Simulation Agent! 🤖 I can help you with Monte Carlo simulations.", False, None
    elif 'monte carlo' in text_lower:
        template = {
            "initial_price": 100.0,
            "drift": 0.05,
            "volatility": 0.2,
            "time_horizon": 1.0,
            "time_steps": 252,
            "n_simulations": 1000
        }
        return "I can run Monte Carlo simulations! Please provide parameters like this:", True, template
    elif 'parameter' in text_lower or 'how to' in text_lower:
        return json.dumps({
            "initial_price": 100.0,
            "drift": 0.05,
            "volatility": 0.2,
            "time_horizon": 1.0,
            "time_steps": 252,
            "n_simulations": 1000
        }, indent=2), False, None
    elif 'thank' in text_lower:
        return "You're welcome! Let me know if you need more simulations. 📊", False, None
    else:
        return "I'm a financial simulation agent. Ask about 'Monte Carlo' or 'parameters'!", False, None

# ---------------- HANDLERS ----------------
@simulation_protocol.on_message(model=SimulationRequest, replies=SimulationResult)
async def handle_simulation_request(ctx: Context, sender: str, msg: SimulationRequest):
    logger.info(f"Received simulation request: {msg.request_id}")
    try:
        if msg.simulation_type != "monte_carlo":
            result = SimulationResult(
                request_id=msg.request_id,
                success=False,
                error=f"Unsupported simulation type: {msg.simulation_type}"
            )
        else:
            success, simulation_result = run_monte_carlo_simulation(msg.parameters)
            result = SimulationResult(
                request_id=msg.request_id,
                success=success,
                result=simulation_result if success else None,
                error=simulation_result.get('error') if not success else None
            )
        
        # POST callback ke Motoko lokal
        try:
            response = requests.post(
                msg.callback_url,
                json=result.dict(),
                headers={'Content-Type': 'application/json'},
                timeout=30
            )
            logger.info(f"Callback sent: {response.status_code}")
        except Exception as e:
            logger.error(f"Callback failed: {e}")
        
        await ctx.send(sender, result)
    except Exception as e:
        logger.error(f"Error processing simulation: {e}")
        await ctx.send(sender, SimulationResult(
            request_id=msg.request_id,
            success=False,
            error=str(e)
        ))

@chat_protocol.on_message(model=ChatMessage, replies=ChatResponse)
async def handle_chat_message(ctx: Context, sender: str, msg: ChatMessage):
    logger.info(f"Received chat from {msg.user_id}: {msg.text}")
    try:
        response_text, requires_params, param_template = handle_chat_text(msg.text)
        response = ChatResponse(
            response=response_text,
            session_id=msg.session_id,
            timestamp=datetime.utcnow().isoformat(),
            requires_parameters=requires_params,
            parameter_template=param_template
        )
        await ctx.send(sender, response)
    except Exception as e:
        logger.error(f"Error handling chat: {e}")
        await ctx.send(sender, ChatResponse(
            response="Error processing your message.",
            session_id=msg.session_id,
            timestamp=datetime.utcnow().isoformat()
        ))

# ---------------- MAIN ----------------
if __name__ == "__main__":
    agent.include(simulation_protocol)
    agent.include(chat_protocol)
    logger.info("Starting Orion Hybrid Agent (Chat + Simulation)...")
    logger.info(f"Agent address: {agent.address}")
    agent.run()
