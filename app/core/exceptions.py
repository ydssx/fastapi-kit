from typing import Any

from fastapi import FastAPI, Request, status
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from starlette.exceptions import HTTPException as StarletteHTTPException

from app.core.config import get_settings
from app.core.logging import get_logger
from app.middleware.request_id import apply_request_id_header
from app.schemas.common import ApiResponse

logger = get_logger(__name__)


class AppException(Exception):
    def __init__(
        self,
        message: str,
        *,
        code: int = 40001,
        status_code: int = status.HTTP_400_BAD_REQUEST,
        data: Any = None,
    ) -> None:
        self.message = message
        self.code = code
        self.status_code = status_code
        self.data = data
        super().__init__(message)


def _json_error_response(
    *,
    status_code: int,
    code: int,
    message: str,
    data: Any = None,
) -> JSONResponse:
    response = JSONResponse(
        status_code=status_code,
        content=ApiResponse(code=code, message=message, data=data).model_dump(),
    )
    return apply_request_id_header(response)


def register_exception_handlers(app: FastAPI) -> None:
    settings = get_settings()

    @app.exception_handler(AppException)
    async def app_exception_handler(_request: Request, exc: AppException) -> JSONResponse:
        return _json_error_response(
            status_code=exc.status_code,
            code=exc.code,
            message=exc.message,
            data=exc.data,
        )

    @app.exception_handler(RequestValidationError)
    async def validation_exception_handler(
        _request: Request, exc: RequestValidationError
    ) -> JSONResponse:
        return _json_error_response(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            code=42200,
            message="Validation error",
            data=exc.errors(),
        )

    @app.exception_handler(StarletteHTTPException)
    async def http_exception_handler(
        _request: Request, exc: StarletteHTTPException
    ) -> JSONResponse:
        return _json_error_response(
            status_code=exc.status_code,
            code=exc.status_code * 100,
            message=str(exc.detail),
        )

    @app.exception_handler(Exception)
    async def unhandled_exception_handler(_request: Request, exc: Exception) -> JSONResponse:
        logger.exception("unhandled_exception")
        if not settings.is_production:
            message = str(exc)
        else:
            message = "Internal server error"
        return _json_error_response(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            code=50000,
            message=message,
        )
