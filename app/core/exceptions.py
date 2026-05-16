from typing import Any

from fastapi import FastAPI, Request, status
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from starlette.exceptions import HTTPException as StarletteHTTPException

from app.core.config import get_settings
from app.schemas.common import ApiResponse


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


def register_exception_handlers(app: FastAPI) -> None:
    settings = get_settings()

    @app.exception_handler(AppException)
    async def app_exception_handler(_request: Request, exc: AppException) -> JSONResponse:
        return JSONResponse(
            status_code=exc.status_code,
            content=ApiResponse(
                code=exc.code,
                message=exc.message,
                data=exc.data,
            ).model_dump(),
        )

    @app.exception_handler(RequestValidationError)
    async def validation_exception_handler(
        _request: Request, exc: RequestValidationError
    ) -> JSONResponse:
        return JSONResponse(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            content=ApiResponse(
                code=42200,
                message="Validation error",
                data=exc.errors(),
            ).model_dump(),
        )

    @app.exception_handler(StarletteHTTPException)
    async def http_exception_handler(
        _request: Request, exc: StarletteHTTPException
    ) -> JSONResponse:
        return JSONResponse(
            status_code=exc.status_code,
            content=ApiResponse(
                code=exc.status_code * 100,
                message=str(exc.detail),
                data=None,
            ).model_dump(),
        )

    @app.exception_handler(Exception)
    async def unhandled_exception_handler(_request: Request, exc: Exception) -> JSONResponse:
        if not settings.is_production:
            message = str(exc)
        else:
            message = "Internal server error"
        return JSONResponse(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            content=ApiResponse(
                code=50000,
                message=message,
                data=None,
            ).model_dump(),
        )
