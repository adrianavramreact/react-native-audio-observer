import AVFoundation
import XCTest

@testable import AudioObserver

final class AudioRulesTests: XCTestCase {
  private func call(ended: Bool = false, connected: Bool = false, outgoing: Bool = false) -> CallInfo {
    CallInfo(hasEnded: ended, hasConnected: connected, isOutgoing: outgoing)
  }

  func testNoCallsIsNone() {
    XCTAssertEqual(callFromCalls([]), "none")
  }

  func testIncomingCallIsRinging() {
    XCTAssertEqual(callFromCalls([call()]), "ringing")
  }

  func testConnectedCallIsConnected() {
    XCTAssertEqual(callFromCalls([call(connected: true)]), "connected")
  }

  func testOutgoingCallIsConnected() {
    XCTAssertEqual(callFromCalls([call(outgoing: true)]), "connected")
  }

  func testSecondCallRingingDuringCallIsStillConnected() {
    XCTAssertEqual(callFromCalls([call(connected: true), call()]), "connected")
  }

  func testEndedCallsAreIgnored() {
    XCTAssertEqual(callFromCalls([call(ended: true, connected: true)]), "none")
  }

  func testPortsMapToRoutes() {
    XCTAssertEqual(routeFromPort(.bluetoothA2DP), "bluetooth")
    XCTAssertEqual(routeFromPort(.bluetoothLE), "bluetooth")
    XCTAssertEqual(routeFromPort(.headphones), "wired")
    XCTAssertEqual(routeFromPort(.usbAudio), "wired")
    XCTAssertEqual(routeFromPort(.builtInSpeaker), "speaker")
    XCTAssertEqual(routeFromPort(.builtInReceiver), "speaker")
    XCTAssertEqual(routeFromPort(.HDMI), "unknown")
  }

  func testRoutesAreUniqueAndSorted() {
    XCTAssertEqual(routesFromPorts([.headphones, .bluetoothA2DP, .usbAudio]), ["bluetooth", "wired"])
  }
}
