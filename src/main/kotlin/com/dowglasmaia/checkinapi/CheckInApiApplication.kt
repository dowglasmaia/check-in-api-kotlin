package com.dowglasmaia.checkinapi

import org.springframework.boot.autoconfigure.SpringBootApplication
import org.springframework.boot.runApplication

@SpringBootApplication
class CheckInApiApplication

fun main(args: Array<String>) {
	runApplication<CheckInApiApplication>(*args)
}
