package com.dowglasmaia.checkinapi.domain.event

import io.kotest.core.spec.style.FunSpec
import io.kotest.matchers.shouldBe
import io.kotest.matchers.string.shouldNotContain

class CheckinCompletedEventTest : FunSpec({

    test("toString masks the passenger e-mail so logs never contain PII") {
        val event = CheckinCompletedEvent("joao.silva@email.com", "FL-001", "CK-1")

        event.toString() shouldNotContain "joao.silva"
        event.toString() shouldBe "CheckinCompletedEvent(passengerEmail=j***@email.com, flightId=FL-001, checkinId=CK-1)"
    }

    test("maskEmail handles malformed values") {
        CheckinCompletedEvent.maskEmail("not-an-email") shouldBe "***"
        CheckinCompletedEvent.maskEmail("") shouldBe "***"
    }
})
