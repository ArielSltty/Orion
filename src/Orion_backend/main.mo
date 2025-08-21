import Array "mo:base/Array";
import Blob "mo:base/Blob";
import Buffer "mo:base/Buffer";
import Error "mo:base/Error";
import HashMap "mo:base/HashMap";
import Int "mo:base/Int";
import Iter "mo:base/Iter";
import Nat "mo:base/Nat";
import Nat16 "mo:base/Nat16"; // <-- BARIS INI DITAMBAHKAN
import Nat64 "mo:base/Nat64";
import Option "mo:base/Option";
import Principal "mo:base/Principal";
import Result "mo:base/Result";
import Text "mo:base/Text";
import Time "mo:base/Time";

actor OrionBackend {
  // Custom HTTP types since mo:base/Http is not available
  module Http {
    public type HttpRequest = {
      method : Text;
      url : Text;
      headers : [(Text, Text)];
      body : Blob;
      transform : ?TransformContext;
    };

    public type HttpResponse = {
      status_code : Nat16;
      headers : [(Text, Text)];
      body : Blob;
    };

    public type TransformContext = {
      function : shared query TransformArgs -> async TransformArgs;
      context : Blob;
    };

    public type TransformArgs = {
      response : HttpResponse;
      context : Blob;
    };
  };

  type SimulationType = {
    #monte_carlo;
  };

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

  type RequestStatus = {
    #pending;
    #processing;
    #completed;
    #failed;
  };

  type SimulationResult = {
    success : Bool;
    result : ?Text; // JSON string of results
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

// Tambahkan function untuk handle chat
public shared func send_chat_message(message : ChatMessage) : async ChatResponse {
};

  // Hardcoded values since environment variables don't work well
  let AGENTVERSE_URL : Text = "test-agent://agent1qfemzegy95c7t52h62epj3swsfwzfcqme56svuc8pthu8hcxnxvgzzx6qx4";
  let AGENTVERSE_API_KEY : Text = "eyJhbGciOiJSUzI1NiJ9.eyJleHAiOjE3NjM1MTg0NjgsImlhdCI6MTc1NTc0MjQ2OCwiaXNzIjoiZmV0Y2guYWkiLCJqdGkiOiJiZGRhMTE4OTJmNzYyNTcwNDRmYmQ3MTAiLCJzY29wZSI6ImF2Iiwic3ViIjoiZWUwZjU3NTA0ZjhlYTEwZmM4MTA0ZGJlNWNjN2VjMTg4ODAwZTZlMDJhZGVaOWRiIn0.gBNav0jgQc9wG_2rpsTsLhgySSQeyp9kDZzDO7z0zrvIA4Gt-CYwzMBMfV6yGa1ZR_DO_ZwTcjXR2jsfkT-fBJ3loZdgpYlSABrBHZJg88z4NnYjOOmVR4C8GypBSIi5v_oOgzkTwlZIKfh9ezJP4qqxcYS";
  
  stable var nextRequestId : Nat = 0;
  stable var requests : [(Text, SimulationRequest)] = [];

  let requestMap = HashMap.fromIter<Text, SimulationRequest>(
    requests.vals(), 10, Text.equal, Text.hash
  );

  // HTTP Outcall - using the management canister directly
  let IC : actor {
    http_request : Http.HttpRequest -> async Http.HttpResponse;
  } = actor "aaaaa-aa";

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

    // Send request to Agentverse asynchronously
    ignore _process_simulation_request(requestId, simulation_type, parameters);

    return requestId;
  };

  func _process_simulation_request(
    requestId : Text,
    simulation_type : SimulationType,
    parameters : SimulationParameters
  ) : async () {
    // Update status to processing
    _update_request_status(requestId, #processing);

    try {
      // Prepare request to Agentverse - simplified JSON
      let requestBody = "{" #
        "\"simulation_type\":\"" # _simulation_type_to_text(simulation_type) # "\"," #
        "\"parameters\":" # _parameters_to_json(parameters) # "," #
        "\"request_id\":\"" # requestId # "\"" #
        "}";

      let requestHeaders = [
        ("Content-Type", "application/json"),
        ("Authorization", "Bearer " # AGENTVERSE_API_KEY)
      ];

      let httpRequest : Http.HttpRequest = {
        method = "POST";
        url = AGENTVERSE_URL;
        headers = requestHeaders;
        body = Text.encodeUtf8(requestBody);
        transform = null;
      };

      // Make HTTP request
      let httpResponse = await IC.http_request(httpRequest);

      if (httpResponse.status_code == 200) {
        // Request accepted by agent
        _update_request_status(requestId, #processing);
      } else {
        throw Error.reject("Agentverse request failed: " # Nat16.toText(httpResponse.status_code));
      };
    } catch (e) {
      _update_request_status(requestId, #failed);
      _set_request_error(requestId, Error.message(e));
    };
  };

  // Callback endpoint for agent to post results
  public shared func receive_simulation_result(response : SimulationResponse) : async Bool {
    try {
      switch (requestMap.get(response.request_id)) {
        case (null) { return false; };
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
          return true;
        };
      };
    } catch (e) {
      return false;
    };
  };

  public shared query func get_simulation_result(request_id : Text) : async ?SimulationRequest {
    requestMap.get(request_id)
  };

  // Helper functions
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
    switch (simulation_type) {
      case (#monte_carlo) { "monte_carlo" };
    };
  };

  func _parameters_to_json(parameters : SimulationParameters) : Text {
    // Simple JSON serialization
    "{" #
    "\"initial_price\":" # debug_show(parameters.initial_price) # "," #
    "\"drift\":" # debug_show(parameters.drift) # "," #
    "\"volatility\":" # debug_show(parameters.volatility) # "," #
    "\"time_horizon\":" # debug_show(parameters.time_horizon) # "," #
    "\"time_steps\":" # Nat.toText(parameters.time_steps) # "," #
    "\"n_simulations\":" # Nat.toText(parameters.n_simulations) #
    "}";
  };

  // Stable storage for upgrade safety
  system func preupgrade() {
    requests := Iter.toArray(requestMap.entries());
  };

  system func postupgrade() {
    // The requestMap is re-initialized from the stable 'requests' variable
    // automatically when the canister code is re-run after an upgrade.
    // No action is needed here.
  };
};
