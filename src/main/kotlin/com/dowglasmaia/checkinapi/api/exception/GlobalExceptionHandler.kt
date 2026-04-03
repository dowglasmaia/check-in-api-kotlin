package com.dowglasmaia.checkinapi.api.exception

import org.springframework.http.HttpStatus
import org.springframework.http.ResponseEntity
import org.springframework.web.bind.annotation.ExceptionHandler
import org.springframework.web.bind.annotation.RestControllerAdvice

/**
 * Standardised HTTP error body returned by [GlobalExceptionHandler].
 *
 * @property status the HTTP status code (e.g., 404, 409).
 * @property error a short machine-readable error label (e.g., "Not Found").
 * @property message a human-readable description of the problem.
 */
data class ErrorResponse(
    val status: Int,
    val error: String,
    val message: String
)

/**
 * Translates domain exceptions into HTTP responses, centralising error-handling
 * logic outside of individual controllers.
 *
 * <p>Controllers must not contain try/catch blocks for domain exceptions —
 * they throw, and this handler catches. This keeps controllers focused solely on
 * request/response mapping and satisfies the Single Responsibility Principle.</p>
 */
@RestControllerAdvice
class GlobalExceptionHandler {

    /**
     * Handles missing flight or passenger resources.
     *
     * @return `404 Not Found` with an [ErrorResponse] body.
     */
    @ExceptionHandler(FlightNotFoundException::class, PassengerNotFoundException::class)
    fun handleNotFound(ex: RuntimeException): ResponseEntity<ErrorResponse> =
        ResponseEntity.status(HttpStatus.NOT_FOUND).body(
            ErrorResponse(HttpStatus.NOT_FOUND.value(), "Not Found", ex.message ?: "Resource not found")
        )

    /**
     * Handles business rule violations that prevent a check-in from proceeding.
     *
     * @return `409 Conflict` with an [ErrorResponse] body.
     */
    @ExceptionHandler(CheckinAlreadyExistsException::class, CheckinNotAllowedException::class)
    fun handleConflict(ex: RuntimeException): ResponseEntity<ErrorResponse> =
        ResponseEntity.status(HttpStatus.CONFLICT).body(
            ErrorResponse(HttpStatus.CONFLICT.value(), "Conflict", ex.message ?: "Check-in not allowed")
        )

    /**
     * Handles invalid input detected before reaching the domain layer.
     *
     * @return `400 Bad Request` with an [ErrorResponse] body.
     */
    @ExceptionHandler(IllegalArgumentException::class)
    fun handleBadRequest(ex: IllegalArgumentException): ResponseEntity<ErrorResponse> =
        ResponseEntity.status(HttpStatus.BAD_REQUEST).body(
            ErrorResponse(HttpStatus.BAD_REQUEST.value(), "Bad Request", ex.message ?: "Invalid request")
        )
}
