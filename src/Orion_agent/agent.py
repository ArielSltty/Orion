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

# Load environment variables
load_dotenv()

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("OrionAgent")

# Get credentials
ORION_AGENT_SEED = os.getenv("AGENT_SEED")
if not ORION_AGENT_SEED:
    logger.error("AGENT_SEED not found!")
    exit(1)

# ==================== MODEL DEFINITIONS ====================
class SimulationRequest(Model):
    simulation_type: str
    parameters: dict
    request_id: str
    callback_url: str

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

# ==================== PROTOCOLS ====================
simulation_protocol = Protocol(name="OrionSimulation", version="1.0")
chat_protocol = Protocol(name="OrionChat", version="1.0")

# Initialize agent
agent = Agent(name="orion_simulation_agent", seed=ORION_AGENT_SEED)
fund_agent_if_low(agent.wallet.address())

# ==================== SIMULATION FUNCTIONS ====================
def run_monte_carlo_simulation(parameters):
    try:
        initial_price = float(parameters.get('initial_price', 100))
        drift = float(parameters.get('drift', 0.05))
        volatility = float(parameters.get('volatility', 0.2))
        time_horizon = float(parameters.get('time_horizon', 1.0))
        time_steps = int(parameters.get('time_steps', 252))
        n_simulations = int(parameters.get('n_simulations', 1000))
        
        if any(param <= 0 for param in [initial_price, time_horizon, time_steps, n_simulations]):
            raise ValueError("All parameters must be positive")
        
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
        
        result = {
            'mean_price': float(mean_price),
            'std_dev': float(std_dev),
            'confidence_interval': [float(confidence_interval[0]), float(confidence_interval[1])],
            'final_prices_sample': final_prices[:10].tolist(),
            'simulation_timestamp': datetime.utcnow().isoformat(),
            'parameters_used': parameters
        }
        
        return True, result
        
    except Exception as e:
        logger.error(f"Simulation error: {str(e)}")
        return False, {'error': str(e)}

# ==================== CHAT HANDLING ====================
def handle_chat_text(text: str):
    text_lower = text.lower()
    
    if any(greeting in text_lower for greeting in ['hello', 'hi', 'hey', 'hola']):
        return "Hello! I'm Orion Simulation Agent! 🤖 I can help you with financial simulations using Monte Carlo methods.", False, None
    
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
        return """Please provide parameters in this format:
{
  "initial_price": 100.0,
  "drift": 0.05,
  "volatility": 0.2,
  "time_horizon": 1.0,
  "time_steps": 252,
  "n_simulations": 1000
}""", False, None
    
    elif 'thank' in text_lower:
        return "You're welcome! Let me know if you need more simulations. 📊", False, None
    
    else:
        return "I'm a financial simulation agent. I can run Monte Carlo simulations for you. Try asking about 'Monte Carlo' or 'parameters'!", False, None

# ==================== PROTOCOL MESSAGE HANDLERS ====================
@simulation_protocol.on_message(model=SimulationRequest, replies=SimulationResult)
async def handle_simulation_request(ctx: Context, sender: str, msg: SimulationRequest):
    logger.info(f"Received simulation request: {msg.request_id}")
    
    try:
        if msg.simulation_type != "monte_carlo":
            error_msg = f"Unsupported simulation type: {msg.simulation_type}"
            result = SimulationResult(
                request_id=msg.request_id,
                success=False,
                error=error_msg
            )
        else:
            success, simulation_result = run_monte_carlo_simulation(msg.parameters)
            result = SimulationResult(
                request_id=msg.request_id,
                success=success,
                result=simulation_result if success else None,
                error=simulation_result.get('error') if not success else None
            )
        
        # Send back via callback
        try:
            response = requests.post(
                msg.callback_url,
                json=result.dict(),
                headers={'Content-Type': 'application/json'},
                timeout=30
            )
            logger.info(f"Callback status: {response.status_code}")
        except Exception as e:
            logger.error(f"Callback failed: {e}")
            
        # Also send direct reply
        await ctx.send(sender, result)
            
    except Exception as e:
        logger.error(f"Error processing simulation: {e}")
        error_result = SimulationResult(
            request_id=msg.request_id,
            success=False,
            error=f"Processing error: {str(e)}"
        )
        await ctx.send(sender, error_result)

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
        error_response = ChatResponse(
            response="Sorry, I encountered an error processing your message.",
            session_id=msg.session_id,
            timestamp=datetime.utcnow().isoformat()
        )
        await ctx.send(sender, error_response)

# ==================== MAIN ====================
if __name__ == "__main__":
    # Include both protocols
    agent.include(simulation_protocol)
    agent.include(chat_protocol)
    
    logger.info("Starting Orion Hybrid Agent (Chat + Simulation)...")
    logger.info(f"Agent address: {agent.address}")
    agent.run()