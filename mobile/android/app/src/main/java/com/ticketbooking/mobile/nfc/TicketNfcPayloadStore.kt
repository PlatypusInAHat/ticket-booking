package com.ticketbooking.mobile.nfc

import android.content.Context

object TicketNfcPayloadStore {
  private const val PREFERENCES_NAME = "ticketbooking_nfc"
  private const val KEY_ACTIVE_PAYLOAD = "active_payload"

  fun setPayload(context: Context, payload: String) {
    context
      .getSharedPreferences(PREFERENCES_NAME, Context.MODE_PRIVATE)
      .edit()
      .putString(KEY_ACTIVE_PAYLOAD, payload)
      .apply()
  }

  fun getPayload(context: Context): String? {
    return context
      .getSharedPreferences(PREFERENCES_NAME, Context.MODE_PRIVATE)
      .getString(KEY_ACTIVE_PAYLOAD, null)
  }

  fun clearPayload(context: Context) {
    context
      .getSharedPreferences(PREFERENCES_NAME, Context.MODE_PRIVATE)
      .edit()
      .remove(KEY_ACTIVE_PAYLOAD)
      .apply()
  }
}
