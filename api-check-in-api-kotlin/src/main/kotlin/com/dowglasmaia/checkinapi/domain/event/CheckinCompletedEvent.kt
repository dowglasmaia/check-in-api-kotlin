package com.dowglasmaia.checkinapi.domain.event

data class CheckinCompletedEvent(
    val passengerEmail: String,
    val flightId: String,
    val checkinId: String
) {
    // Logged by LoggingEventPublisher, so the address must never appear in clear text.
    override fun toString(): String =
        "CheckinCompletedEvent(passengerEmail=${maskEmail(passengerEmail)}, flightId=$flightId, checkinId=$checkinId)"

    companion object {
        fun maskEmail(email: String): String {
            val at = email.indexOf('@')
            return if (at <= 0) "***" else "${email[0]}***${email.substring(at)}"
        }
    }
}
