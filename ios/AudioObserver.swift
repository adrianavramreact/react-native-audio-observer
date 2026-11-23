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
  private var routeActiveObserver: NSObjectProtocol?
  private var lastRoutes: [String] = []

  // Lazy so it is created only when call state is first used.
  private lazy var callObserver = CXCallObserver()
  private var isObservingCalls = false
  private var callActiveObserver: NSObjectProtocol?
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

  public func currentCall() -> String {
    callFromCalls(callObserver.calls.map { call in
      CallInfo(hasEnded: call.hasEnded, hasConnected: call.hasConnected, isOutgoing: call.isOutgoing)
    })
  }

  public func currentRoutes() -> [String] {
    let outputs = AVAudioSession.sharedInstance().currentRoute.outputs
    let ports = outputs.map { output in
      output.portType
    }
    return routesFromPorts(ports)
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

  // iOS pauses the app soon after it leaves the screen, so the route is also read again when the app comes back.
  private func startAudioRoute() {
    guard routeObserver == nil else { return }
    routeObserver = NotificationCenter.default.addObserver(
      forName: AVAudioSession.routeChangeNotification,
      object: nil,
      queue: notificationQueue
    ) { [weak self] _ in
      self?.onRouteChanged()
    }
    routeActiveObserver = NotificationCenter.default.addObserver(
      forName: UIApplication.didBecomeActiveNotification,
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
    if let routeActiveObserver {
      NotificationCenter.default.removeObserver(routeActiveObserver)
    }
    routeActiveObserver = nil
  }

  private func onRouteChanged() {
    let routes = currentRoutes()
    if routes == lastRoutes { return }
    lastRoutes = routes
    onAudioRouteChange(routes)
  }

  // Subscribe first, then read the state, so no call change is missed in between.
  // iOS pauses the app in the background and call changes can get lost, so we check again when the app comes back.
  private func startCall() {
    guard !isObservingCalls else { return }
    callObserver.setDelegate(self, queue: queue)
    callActiveObserver = NotificationCenter.default.addObserver(
      forName: UIApplication.didBecomeActiveNotification,
      object: nil,
      queue: notificationQueue
    ) { [weak self] _ in
      self?.onCallChanged()
    }
    isObservingCalls = true
    lastCall = currentCall()
  }

  private func stopCall() {
    guard isObservingCalls else { return }
    callObserver.setDelegate(nil, queue: nil)
    if let callActiveObserver {
      NotificationCenter.default.removeObserver(callActiveObserver)
    }
    callActiveObserver = nil
    isObservingCalls = false
  }

  // Called by iOS when a call rings, connects or ends.
  public func callObserver(_: CXCallObserver, callChanged call: CXCall) {
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
}
