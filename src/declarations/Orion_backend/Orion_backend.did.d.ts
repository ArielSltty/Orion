import type { Principal } from '@dfinity/principal';
import type { ActorMethod } from '@dfinity/agent';
import type { IDL } from '@dfinity/candid';

export interface ChatMessage {
  'session_id' : string,
  'text' : string,
  'user_id' : string,
  'timestamp' : bigint,
}
export interface ChatResponse {
  'session_id' : string,
  'requires_parameters' : boolean,
  'parameter_template' : [] | [SimulationParameters],
  'response' : string,
  'timestamp' : bigint,
}
export type RequestStatus = { 'pending' : null } |
  { 'completed' : null } |
  { 'processing' : null } |
  { 'failed' : null };
export interface SimulationParameters {
  'volatility' : number,
  'time_horizon' : number,
  'initial_price' : number,
  'n_simulations' : bigint,
  'drift' : number,
  'time_steps' : bigint,
}
export interface SimulationRequest {
  'id' : string,
  'status' : RequestStatus,
  'result' : [] | [SimulationResult],
  'parameters' : SimulationParameters,
  'agent_signature' : [] | [string],
  'timestamp' : bigint,
  'simulation_type' : SimulationType,
}
export interface SimulationResponse {
  'request_id' : string,
  'result' : [] | [string],
  'signature' : [] | [string],
  'error' : [] | [string],
  'success' : boolean,
}
export interface SimulationResult {
  'result' : [] | [string],
  'error' : [] | [string],
  'timestamp' : bigint,
  'success' : boolean,
}
export type SimulationType = { 'monte_carlo' : null };
export interface _SERVICE {
  'get_simulation_result' : ActorMethod<[string], [] | [SimulationRequest]>,
  'receive_simulation_result' : ActorMethod<[SimulationResponse], boolean>,
  'send_chat_message' : ActorMethod<[ChatMessage], ChatResponse>,
  'submit_simulation_request' : ActorMethod<
    [SimulationType, SimulationParameters],
    string
  >,
}
export declare const idlFactory: IDL.InterfaceFactory;
export declare const init: (args: { IDL: typeof IDL }) => IDL.Type[];
