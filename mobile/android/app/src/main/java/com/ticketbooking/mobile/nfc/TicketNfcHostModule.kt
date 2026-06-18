package com.ticketbooking.mobile.nfc

import android.nfc.NfcAdapter
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod

class TicketNfcHostModule(private val reactContext: ReactApplicationContext) :
  ReactContextBaseJavaModule(reactContext) {

  override fun getName(): String = "TicketNfcHost"

  @ReactMethod
  fun setPayload(payload: String, promise: Promise) {
    if (payload.isBlank()) {
      promise.reject("EMPTY_PAYLOAD", "NFC payload is required")
      return
    }

    TicketNfcPayloadStore.setPayload(reactContext, payload)
    promise.resolve(true)
  }

  @ReactMethod
  fun clearPayload(promise: Promise) {
    TicketNfcPayloadStore.clearPayload(reactContext)
    promise.resolve(true)
  }

  @ReactMethod
  fun getPayload(promise: Promise) {
    promise.resolve(TicketNfcPayloadStore.getPayload(reactContext))
  }

  @ReactMethod
  fun isSupported(promise: Promise) {
    val adapter = NfcAdapter.getDefaultAdapter(reactContext)
    promise.resolve(adapter != null)
  }

  @ReactMethod
  fun isEnabled(promise: Promise) {
    val adapter = NfcAdapter.getDefaultAdapter(reactContext)
    promise.resolve(adapter?.isEnabled == true)
  }
}
