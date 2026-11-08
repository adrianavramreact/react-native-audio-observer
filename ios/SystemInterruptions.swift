import AVFoundation

@objcMembers public class SystemInterruptions: NSObject {
  private let onAudioRouteChange: ([String]) -> Void
  // NotificationCenter needs an OperationQueue; this one runs on the module's serial queue.
  private let notificationQueue = OperationQueue()

  private var routeObserver: NSObjectProtocol?
  private var lastRoutes: [String] = []

  public init(queue: DispatchQueue, onAudioRouteChange: @escaping ([String]) -> Void) {
    self.onAudioRouteChange = onAudioRouteChange
    notificationQueue.underlyingQueue = queue
    super.init()
  }

  deinit {
    stopAudioRoute()
  }

  // Sorted so two lists with the same routes are equal when compared.
  public func currentRoutes() -> [String] {
    let outputs = AVAudioSession.sharedInstance().currentRoute.outputs
    return Set(outputs.map { output in route(for: output.portType) }).sorted()
  }

  public func startObserving(_ event: String) -> Bool {
    switch event {
    case "audioRoute":
      startAudioRoute()
    default:
      return false
    }
    return true
  }

  public func stopObserving(_ event: String) {
    switch event {
    case "audioRoute":
      stopAudioRoute()
    default:
      break
    }
  }

  private func startAudioRoute() {
    guard routeObserver == nil else { return }
    lastRoutes = currentRoutes()
    // Same serial queue as the module methods.
    routeObserver = NotificationCenter.default.addObserver(
      forName: AVAudioSession.routeChangeNotification,
      object: nil,
      queue: notificationQueue
    ) { [weak self] _ in
      self?.onRouteChanged()
    }
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
