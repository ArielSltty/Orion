import Array "mo:base/Array";
import Blob "mo:base/Blob";
import Error "mo:base/Error";
import HashMap "mo:base/HashMap";
import Int "mo:base/Int";
import Iter "mo:base/Iter";
import Nat "mo:base/Nat";
import Nat16 "mo:base/Nat16";
import Option "mo:base/Option";
import Principal "mo:base/Principal";
import Text "mo:base/Text";
import Time "mo:base/Time";

actor OrionBackend {

  // ========= Konfigurasi Agentverse =========
  let AGENTVERSE_URL : Text = "http://127.0.0.1:8000/simulation";
  let AGENTVERSE_API_KEY : Text = "";

  stable var nextRequestId : Nat = 0;
  stable var requests : [(Text, SimulationRequest)] = [];
  let requestMap = HashMap.fromIter<Text, SimulationRequest>(
    requests.vals(), 10, Text.equal, Text.hash
  );

  // ========= Definisi tipe HTTP =========
  public type HttpRequest = {
    method : Text;
    url : Text;
    headers : [(Text, Text)];
    body : Blob;
  };

  public type HttpResponse = {
    status_code : Nat16;
    headers : [(Text, Text)];
    body : Blob;
  };

  let IC : actor {
    http_request : HttpRequest -> async HttpResponse;
  } = actor "aaaaa-aa";

  // ========= Tipe Data =========
  type SimulationType = { #monte_carlo };

  type SimulationParameters = {
    initial_price : Float;
    drift : Float;
    volatility : Float;
    time_horizon : Float;
    time_steps : Nat;
    n_simulations : Nat;
  };

  type SimulationRequest = {
    id : Text;
    simulation_type : SimulationType;
    parameters : SimulationParameters;
    timestamp : Int;
    status : RequestStatus;
    result : ?SimulationResult;
    agent_signature : ?Text;
  };

  type RequestStatus = { #pending; #processing; #completed; #failed };

  type SimulationResult = {
    success : Bool;
    result : ?Text;
    error : ?Text;
    timestamp : Int;
  };

  type SimulationResponse = {
    request_id : Text;
    success : Bool;
    result : ?Text;
    error : ?Text;
    signature : ?Text;
  };

  type ChatMessage = {
    text : Text;
    user_id : Text;
    session_id : Text;
    timestamp : Int;
  };

  type ChatResponse = {
    response : Text;
    session_id : Text;
    timestamp : Int;
    requires_parameters : Bool;
    parameter_template : ?SimulationParameters;
  };

  // ========= Chat Dummy =========
  public shared func send_chat_message(message : ChatMessage) : async ChatResponse {
    {
      response = "This is a dummy response.";
      session_id = message.session_id;
      timestamp = Time.now();
      requires_parameters = false;
      parameter_template = null;
    }
  };

  // ========= Submit Simulation =========
  public shared func submit_simulation_request(
    simulation_type : SimulationType,
    parameters : SimulationParameters
  ) : async Text {
    let requestId = Nat.toText(nextRequestId);
    nextRequestId += 1;

    let request : SimulationRequest = {
      id = requestId;
      simulation_type = simulation_type;
      parameters = parameters;
      timestamp = Time.now();
      status = #pending;
      result = null;
      agent_signature = null;
    };

    requestMap.put(requestId, request);

    ignore _process_simulation_request(requestId, simulation_type, parameters);

    requestId
  };

  func _process_simulation_request(
    requestId : Text,
    simulation_type : SimulationType,
    parameters : SimulationParameters
  ) : async () {
    _update_request_status(requestId, #processing);

    try {
      let requestBody =
        "{" #
        "\"simulation_type\":\"" # _simulation_type_to_text(simulation_type) # "\"," #
        "\"parameters\":" # _parameters_to_json(parameters) # "," #
        "\"request_id\":\"" # requestId # "\"," #
        "\"callback_url\":\"" # "http://127.0.0.1:4943/?canisterId=uzt4z-lp777-77774-qaabq-cai&method=receive" # "\"" #
        "}";

      let requestHeaders = [
        ("Content-Type", "application/json"),
        ("Authorization", "Bearer " # AGENTVERSE_API_KEY)
      ];

      let httpRequest : HttpRequest = {
        method = "POST";
        url = AGENTVERSE_URL;
        headers = requestHeaders;
        body = Text.encodeUtf8(requestBody);
      };

      let httpResponse = await IC.http_request(httpRequest);

      if (httpResponse.status_code == 200) {
        _update_request_status(requestId, #processing);
      } else {
        throw Error.reject("Agentverse failed: " # Nat16.toText(httpResponse.status_code));
      };
    } catch (e) {
      _update_request_status(requestId, #failed);
      _set_request_error(requestId, Error.message(e));
    };
  };

  // ========= Callback dari Agent Python =========
  public shared func receive_simulation_result(response : SimulationResponse) : async Bool {
    switch (requestMap.get(response.request_id)) {
      case (null) { false };
      case (?request) {
        let updatedRequest : SimulationRequest = {
          id = request.id;
          simulation_type = request.simulation_type;
          parameters = request.parameters;
          timestamp = request.timestamp;
          status = if (response.success) #completed else #failed;
          result = ?{
            success = response.success;
            result = response.result;
            error = response.error;
            timestamp = Time.now();
          };
          agent_signature = response.signature;
        };
        requestMap.put(response.request_id, updatedRequest);
        true
      };
    }
  };

  public shared query func get_simulation_result(request_id : Text) : async ?SimulationRequest {
    requestMap.get(request_id)
  };

  // ========= Helpers =========
  func _update_request_status(requestId : Text, status : RequestStatus) {
    switch (requestMap.get(requestId)) {
      case (null) {};
      case (?request) {
        let updatedRequest : SimulationRequest = {
          id = request.id;
          simulation_type = request.simulation_type;
          parameters = request.parameters;
          timestamp = request.timestamp;
          status = status;
          result = request.result;
          agent_signature = request.agent_signature;
        };
        requestMap.put(requestId, updatedRequest);
      };
    };
  };

  func _set_request_error(requestId : Text, error : Text) {
    switch (requestMap.get(requestId)) {
      case (null) {};
      case (?request) {
        let updatedRequest : SimulationRequest = {
          id = request.id;
          simulation_type = request.simulation_type;
          parameters = request.parameters;
          timestamp = request.timestamp;
          status = #failed;
          result = ?{
            success = false;
            result = null;
            error = ?error;
            timestamp = Time.now();
          };
          agent_signature = request.agent_signature;
        };
        requestMap.put(requestId, updatedRequest);
      };
    };
  };

  func _simulation_type_to_text(simulation_type : SimulationType) : Text {
    switch (simulation_type) { case (#monte_carlo) { "monte_carlo" } }
  };

  func _parameters_to_json(parameters : SimulationParameters) : Text {
    "{" #
    "\"initial_price\":" # debug_show(parameters.initial_price) # "," #
    "\"drift\":" # debug_show(parameters.drift) # "," #
    "\"volatility\":" # debug_show(parameters.volatility) # "," #
    "\"time_horizon\":" # debug_show(parameters.time_horizon) # "," #
    "\"time_steps\":" # Nat.toText(parameters.time_steps) # "," #
    "\"n_simulations\":" # Nat.toText(parameters.n_simulations) #
    "}"
  };

  system func preupgrade() { requests := Iter.toArray(requestMap.entries()); };
  system func postupgrade() {};
};
