package com.ticketbooking.mobile.nfc

import android.nfc.cardemulation.HostApduService
import android.os.Bundle
import java.nio.charset.StandardCharsets

class TicketNfcHostApduService : HostApduService() {
  override fun processCommandApdu(commandApdu: ByteArray?, extras: Bundle?): ByteArray {
    if (commandApdu == null) {
      return STATUS_FAILED
    }

    if (!commandApdu.contentEquals(SELECT_AID_APDU)) {
      return STATUS_AID_NOT_FOUND
    }

    val payload = TicketNfcPayloadStore.getPayload(this)
      ?: return STATUS_CONDITIONS_NOT_SATISFIED

    return payload.toByteArray(StandardCharsets.UTF_8) + STATUS_SUCCESS
  }

  override fun onDeactivated(reason: Int) = Unit

  companion object {
    private val SELECT_AID_APDU = byteArrayOf(
      0x00.toByte(),
      0xA4.toByte(),
      0x04.toByte(),
      0x00.toByte(),
      0x07.toByte(),
      0xF0.toByte(),
      0x01.toByte(),
      0x02.toByte(),
      0x03.toByte(),
      0x04.toByte(),
      0x05.toByte(),
      0x06.toByte(),
      0x00.toByte()
    )
    private val STATUS_SUCCESS = byteArrayOf(0x90.toByte(), 0x00.toByte())
    private val STATUS_AID_NOT_FOUND = byteArrayOf(0x6A.toByte(), 0x82.toByte())
    private val STATUS_CONDITIONS_NOT_SATISFIED = byteArrayOf(0x69.toByte(), 0x85.toByte())
    private val STATUS_FAILED = byteArrayOf(0x6F.toByte(), 0x00.toByte())
  }
}
