import AVFoundation

struct CallInfo {
  let hasEnded: Bool
  let hasConnected: Bool
  let isOutgoing: Bool
}

// If you are on a call and another one rings, you are still "connected".
func callFromCalls(_ calls: [CallInfo]) -> String {
  let activeCalls = calls.filter { call in
    !call.hasEnded
  }
  let hasConnectedCall = activeCalls.contains { call in
    call.hasConnected || call.isOutgoing
  }
  if hasConnectedCall { return "connected" }
  if !activeCalls.isEmpty { return "ringing" }
  return "none"
}

func routeFromPort(_ port: AVAudioSession.Port) -> String {
  switch port {
  case .bluetoothA2DP, .bluetoothHFP, .bluetoothLE:
    return "bluetooth"
  case .headphones, .usbAudio, .lineOut:
    return "wired"
  case .builtInSpeaker, .builtInReceiver:
    return "speaker"
  default:
    return "unknown"
  }
}

// Sorted so two lists with the same routes are equal when compared.
func routesFromPorts(_ ports: [AVAudioSession.Port]) -> [String] {
  let routes = ports.map { port in
    routeFromPort(port)
  }
  return Set(routes).sorted()
}
