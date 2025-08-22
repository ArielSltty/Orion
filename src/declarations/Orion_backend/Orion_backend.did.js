export const idlFactory = ({ IDL }) => {
  const RequestStatus = IDL.Variant({
    'pending' : IDL.Null,
    'completed' : IDL.Null,
    'processing' : IDL.Null,
    'failed' : IDL.Null,
  });
  const SimulationResult = IDL.Record({
    'result' : IDL.Opt(IDL.Text),
    'error' : IDL.Opt(IDL.Text),
    'timestamp' : IDL.Int,
    'success' : IDL.Bool,
  });
  const SimulationParameters = IDL.Record({
    'volatility' : IDL.Float64,
    'time_horizon' : IDL.Float64,
    'initial_price' : IDL.Float64,
    'n_simulations' : IDL.Nat,
    'drift' : IDL.Float64,
    'time_steps' : IDL.Nat,
  });
  const SimulationType = IDL.Variant({ 'monte_carlo' : IDL.Null });
  const SimulationRequest = IDL.Record({
    'id' : IDL.Text,
    'status' : RequestStatus,
    'result' : IDL.Opt(SimulationResult),
    'parameters' : SimulationParameters,
    'agent_signature' : IDL.Opt(IDL.Text),
    'timestamp' : IDL.Int,
    'simulation_type' : SimulationType,
  });
  const SimulationResponse = IDL.Record({
    'request_id' : IDL.Text,
    'result' : IDL.Opt(IDL.Text),
    'signature' : IDL.Opt(IDL.Text),
    'error' : IDL.Opt(IDL.Text),
    'success' : IDL.Bool,
  });
  const ChatMessage = IDL.Record({
    'session_id' : IDL.Text,
    'text' : IDL.Text,
    'user_id' : IDL.Text,
    'timestamp' : IDL.Int,
  });
  const ChatResponse = IDL.Record({
    'session_id' : IDL.Text,
    'requires_parameters' : IDL.Bool,
    'parameter_template' : IDL.Opt(SimulationParameters),
    'response' : IDL.Text,
    'timestamp' : IDL.Int,
  });
  return IDL.Service({
    'get_simulation_result' : IDL.Func(
        [IDL.Text],
        [IDL.Opt(SimulationRequest)],
        ['query'],
      ),
    'receive_simulation_result' : IDL.Func(
        [SimulationResponse],
        [IDL.Bool],
        [],
      ),
    'send_chat_message' : IDL.Func([ChatMessage], [ChatResponse], []),
    'submit_simulation_request' : IDL.Func(
        [SimulationType, SimulationParameters],
        [IDL.Text],
        [],
      ),
  });
};
export const init = ({ IDL }) => { return []; };
