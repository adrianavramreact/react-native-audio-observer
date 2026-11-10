import AVFoundation
import CallKit
import UIKit

@objcMembers public class AudioObserverImpl: NSObject, CXCallObserverDelegate {
  private let queue: DispatchQueue
  private let onAudioRouteChange: ([String]) -> Void
  private let onCallChange: (String) -> Void
  private let onOtherAudioChange: (String) -> Void
  private let notificationQueue = OperationQueue()

  private var routeObserver: NSObjectProtocol?
  private var lastRoutes: [String] = []

  // Lazy so it is created only when call state is first used.
  private lazy var callObserver = CXCallObserver()
  private var isObservingCalls = false
  private var lastCall = "none"

  private var otherAudioObserver: NSObjectProtocol?
  private var lastOtherAudio = false

  public init(
    queue: DispatchQueue,
    onAudioRouteChange: @escaping ([String]) -> Void,
    onCallChange: @escaping (String) -> Void,
    onOtherAudioChange: @escaping (String) -> Void
  ) {
    self.queue = queue
    self.onAudioRouteChange = onAudioRouteChange
    self.onCallChange = onCallChange
    self.onOtherAudioChange = onOtherAudioChange
    notificationQueue.underlyingQueue = queue
    super.init()
  }

  deinit {
    stopAudioRoute()
    stopCall()
    stopOtherAudio()
  }

  // If you are on a call and another one rings, you are still "connected".
  public func currentCall() -> String {
    let activeCalls = callObserver.calls.filter { call in
      !call.hasEnded
    }
    let hasConnectedCall = activeCalls.contains { call in
      call.hasConnected || call.isOutgoing
    }
    if hasConnectedCall { return "connected" }
    if !activeCalls.isEmpty { return "ringing" }
    return "none"
  }

  // Sorted so two lists with the same routes are equal when compared.
  public func currentRoutes() -> [String] {
    let outputs = AVAudioSession.sharedInstance().currentRoute.outputs
    return Set(outputs.map { output in route(for: output.portType) }).sorted()
  }

  // Another app's audio; your own app's sound does not count.
  public func isOtherAudioPlaying() -> Bool {
    AVAudioSession.sharedInstance().isOtherAudioPlaying
  }

  // mediaPlayback is Android only.
  public func isAvailable(_ event: String) -> Bool {
    switch event {
    case "audioRoute", "call", "otherAudio":
      return true
    default:
      return false
    }
  }

  public func startObserving(_ event: String) -> Bool {
    switch event {
    case "audioRoute":
      startAudioRoute()
    case "call":
      startCall()
    case "otherAudio":
      startOtherAudio()
    default:
      return false
    }
    return true
  }

  public func stopObserving(_ event: String) {
    switch event {
    case "audioRoute":
      stopAudioRoute()
    case "call":
      stopCall()
    case "otherAudio":
      stopOtherAudio()
    default:
      break
    }
  }

  private func startAudioRoute() {
    guard routeObserver == nil else { return }
    routeObserver = NotificationCenter.default.addObserver(
      forName: AVAudioSession.routeChangeNotification,
      object: nil,
      queue: notificationQueue
    ) { [weak self] _ in
      self?.onRouteChanged()
    }
    lastRoutes = currentRoutes()
  }

  private func stopAudioRoute() {
    if let routeObserver {
      NotificationCenter.default.removeObserver(routeObserver)
    }
    routeObserver = nil
  }

  private func onRouteChanged() {
    let routes = currentRoutes()
    if routes == lastRoutes { return }
    lastRoutes = routes
    onAudioRouteChange(routes)
  }

  // Subscribe first, then read the state, so no call change is missed in between.
  private func startCall() {
    guard !isObservingCalls else { return }
    callObserver.setDelegate(self, queue: queue)
    isObservingCalls = true
    lastCall = currentCall()
  }

  private func stopCall() {
    guard isObservingCalls else { return }
    callObserver.setDelegate(nil, queue: nil)
    isObservingCalls = false
  }

  // Called by iOS when a call rings, connects or ends.
  public func callObserver(_: CXCallObserver, callChanged _: CXCall) {
    onCallChanged()
  }

  // Checks all calls, not just the changed one: ending one call while another is still on is not "ended".
  private func onCallChanged() {
    let state = currentCall()
    if state == lastCall { return }
    lastCall = state
    onCallChange(state == "none" ? "ended" : state)
  }

  // iOS sends no notice when another app starts or stops, so we check each time the app comes back on screen.
  private func startOtherAudio() {
    guard otherAudioObserver == nil else { return }
    otherAudioObserver = NotificationCenter.default.addObserver(
      forName: UIApplication.didBecomeActiveNotification,
      object: nil,
      queue: notificationQueue
    ) { [weak self] _ in
      self?.onAppBecameActive()
    }
    lastOtherAudio = isOtherAudioPlaying()
  }

  private func stopOtherAudio() {
    if let otherAudioObserver {
      NotificationCenter.default.removeObserver(otherAudioObserver)
    }
    otherAudioObserver = nil
  }

  private func onAppBecameActive() {
    let playing = isOtherAudioPlaying()
    if playing == lastOtherAudio { return }
    lastOtherAudio = playing
    onOtherAudioChange(playing ? "started" : "stopped")
  }

  private func route(for port: AVAudioSession.Port) -> String {
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
}
