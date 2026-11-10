package com.audioobserver
import android.media.AudioAttributes
import android.media.AudioDeviceInfo
import android.media.AudioManager
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test

class AudioRulesTest {
  @Test
  fun callFromMode_ringtone_isRinging() {
    assertEquals("ringing", callFromMode(AudioManager.MODE_RINGTONE))
  }

  @Test
  fun callFromMode_cellularAndVoip_areConnected() {
    assertEquals("connected", callFromMode(AudioManager.MODE_IN_CALL))
    assertEquals("connected", callFromMode(AudioManager.MODE_IN_COMMUNICATION))
  }

  @Test
  fun callFromMode_normal_isNone() {
    assertEquals("none", callFromMode(AudioManager.MODE_NORMAL))
  }

  @Test
  fun callFromMode_screening_isIgnored() {
    assertNull(callFromMode(AudioManager.MODE_CALL_SCREENING))
  }

  @Test
  fun isMediaPlayback_music_isTrue() {
    assertTrue(isMediaPlayback(AudioAttributes.USAGE_MEDIA, AudioAttributes.CONTENT_TYPE_MUSIC))
  }

  @Test
  fun isMediaPlayback_spotifyUnknownMedia_isTrue() {
    assertTrue(isMediaPlayback(AudioAttributes.USAGE_MEDIA, AudioAttributes.CONTENT_TYPE_UNKNOWN))
  }

  @Test
  fun isMediaPlayback_voiceCall_isFalse() {
    assertFalse(isMediaPlayback(AudioAttributes.USAGE_VOICE_COMMUNICATION, AudioAttributes.CONTENT_TYPE_SPEECH))
  }

  @Test
  fun isMediaPlayback_notification_isFalse() {
    assertFalse(isMediaPlayback(AudioAttributes.USAGE_NOTIFICATION, AudioAttributes.CONTENT_TYPE_SONIFICATION))
  }

  @Test
  fun isEventSupported_call_needsApi31() {
    assertTrue(isEventSupported(EVENT_CALL, 31))
    assertFalse(isEventSupported(EVENT_CALL, 30))
  }

  @Test
  fun isEventSupported_mediaPlayback_needsApi26() {
    assertTrue(isEventSupported(EVENT_MEDIA_PLAYBACK, 26))
    assertFalse(isEventSupported(EVENT_MEDIA_PLAYBACK, 25))
  }

  @Test
  fun isEventSupported_otherAudio_isFalse() {
    assertFalse(isEventSupported("otherAudio", 36))
  }

  @Test
  fun isEventSupported_audioRoute_needsApi33() {
    assertTrue(isEventSupported(EVENT_AUDIO_ROUTE, 33))
    assertFalse(isEventSupported(EVENT_AUDIO_ROUTE, 32))
  }

  @Test
  fun routeFromDeviceType_bleSpeaker_isBluetooth() {
    assertEquals("bluetooth", routeFromDeviceType(AudioDeviceInfo.TYPE_BLE_SPEAKER))
  }

  @Test
  fun routeFromDeviceType_usbDevice_isWired() {
    assertEquals("wired", routeFromDeviceType(AudioDeviceInfo.TYPE_USB_DEVICE))
  }

  @Test
  fun routeFromDeviceType_otherType_isUnknown() {
    assertEquals("unknown", routeFromDeviceType(AudioDeviceInfo.TYPE_HDMI))
    assertEquals("unknown", routeFromDeviceType(AudioDeviceInfo.TYPE_DOCK))
  }

  @Test
  fun routesFromDeviceTypes_phoneOnly_isSpeaker() {
    val types = listOf(AudioDeviceInfo.TYPE_BUILTIN_SPEAKER, AudioDeviceInfo.TYPE_BUILTIN_EARPIECE)
    assertEquals(listOf("speaker"), routesFromDeviceTypes(types))
  }

  @Test
  fun routesFromDeviceTypes_allConnected_returnsAllOnceSorted() {
    val types = listOf(
      AudioDeviceInfo.TYPE_WIRED_HEADPHONES,
      AudioDeviceInfo.TYPE_BUILTIN_SPEAKER,
      AudioDeviceInfo.TYPE_BLUETOOTH_A2DP,
      AudioDeviceInfo.TYPE_BLUETOOTH_SCO,
    )
    assertEquals(listOf("bluetooth", "speaker", "wired"), routesFromDeviceTypes(types))
  }
}
