package com.dowglasmaia.checkinapi.api

import org.junit.jupiter.api.Test
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.boot.test.context.SpringBootTest
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc
import org.springframework.test.web.servlet.MockMvc
import org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get
import org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post
import org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath
import org.springframework.test.web.servlet.result.MockMvcResultMatchers.status

@SpringBootTest(properties = ["app.demo.enabled=false"])
@AutoConfigureMockMvc
class DemoDisabledIntegrationTest(@Autowired private val mockMvc: MockMvc) {

    @Test
    fun `demo endpoint answers 404 with the standard error body when disabled`() {
        mockMvc.perform(get("/demo/test-data"))
            .andExpect(status().isNotFound)
            .andExpect(jsonPath("$.status").value(404))
    }

    @Test
    fun `demo reset is not available when disabled`() {
        mockMvc.perform(post("/demo/reset")).andExpect(status().isNotFound)
    }
}
