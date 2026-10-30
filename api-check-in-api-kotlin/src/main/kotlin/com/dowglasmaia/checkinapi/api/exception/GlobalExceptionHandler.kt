package com.dowglasmaia.checkinapi.api.exception

import org.slf4j.LoggerFactory
import org.springframework.http.HttpHeaders
import org.springframework.http.HttpStatus
import org.springframework.http.HttpStatusCode
import org.springframework.http.ProblemDetail
import org.springframework.http.ResponseEntity
import org.springframework.http.converter.HttpMessageNotReadableException
import org.springframework.web.bind.MethodArgumentNotValidException
import org.springframework.web.bind.annotation.ExceptionHandler
import org.springframework.web.bind.annotation.RestControllerAdvice
import org.springframework.web.context.request.WebRequest
import org.springframework.web.method.annotation.HandlerMethodValidationException
import org.springframework.web.servlet.mvc.method.annotation.ResponseEntityExceptionHandler

/** Error body returned by every failing endpoint; [code] is stable, [message] is for humans and logs. */
data class ErrorResponse(
    val status: Int,
    val error: String,
    val message: String,
    val code: String
)

@RestControllerAdvice
class GlobalExceptionHandler : ResponseEntityExceptionHandler() {

    private val logger = LoggerFactory.getLogger(GlobalExceptionHandler::class.java)

    @ExceptionHandler(
        FlightNotFoundException::class,
        PassengerNotFoundException::class,
        PassengerNotOnFlightException::class
    )
    fun handleNotFound(ex: DomainException): ResponseEntity<ErrorResponse> =
        respond(HttpStatus.NOT_FOUND, ex.message, ex.code)

    @ExceptionHandler(CheckinAlreadyExistsException::class, CheckinNotAllowedException::class)
    fun handleConflict(ex: DomainException): ResponseEntity<ErrorResponse> =
        respond(HttpStatus.CONFLICT, ex.message, ex.code)

    @ExceptionHandler(IllegalArgumentException::class)
    fun handleBadRequest(ex: IllegalArgumentException): ResponseEntity<ErrorResponse> =
        respond(HttpStatus.BAD_REQUEST, ex.message ?: "Invalid request", VALIDATION_ERROR)

    @ExceptionHandler(Exception::class)
    fun handleUnexpected(ex: Exception): ResponseEntity<ErrorResponse> {
        logger.error("action=unexpected_error", ex)
        return respond(HttpStatus.INTERNAL_SERVER_ERROR, "Unexpected error. Please try again later.", "INTERNAL_ERROR")
    }

    override fun handleMethodArgumentNotValid(
        ex: MethodArgumentNotValidException,
        headers: HttpHeaders,
        status: HttpStatusCode,
        request: WebRequest
    ): ResponseEntity<Any>? {
        val message = ex.bindingResult.fieldErrors
            .sortedBy { it.field }
            .joinToString("; ") { "${it.field}: ${it.defaultMessage}" }
            .ifBlank { "Invalid request" }
        return ResponseEntity.status(status).body(body(status, message, VALIDATION_ERROR))
    }

    // Errors raised by Spring MVC itself (malformed JSON, wrong method, unknown route...) keep their
    // HTTP status but use the same body shape instead of the default ProblemDetail.
    override fun handleExceptionInternal(
        ex: Exception,
        body: Any?,
        headers: HttpHeaders,
        statusCode: HttpStatusCode,
        request: WebRequest
    ): ResponseEntity<Any>? {
        val message = (body as? ProblemDetail)?.detail ?: ex.message ?: "Request failed"
        val code = when (ex) {
            is HttpMessageNotReadableException -> "MALFORMED_REQUEST"
            is HandlerMethodValidationException -> VALIDATION_ERROR
            else -> HttpStatus.resolve(statusCode.value())?.name ?: "ERROR"
        }
        return ResponseEntity.status(statusCode).headers(headers).body(body(statusCode, message, code))
    }

    private fun respond(status: HttpStatus, message: String?, code: String): ResponseEntity<ErrorResponse> =
        ResponseEntity.status(status).body(body(status, message ?: status.reasonPhrase, code))

    private fun body(status: HttpStatusCode, message: String, code: String): ErrorResponse {
        val reason = HttpStatus.resolve(status.value())?.reasonPhrase ?: "Error"
        return ErrorResponse(status.value(), reason, message, code)
    }

    private companion object {
        const val VALIDATION_ERROR = "VALIDATION_ERROR"
    }
}
