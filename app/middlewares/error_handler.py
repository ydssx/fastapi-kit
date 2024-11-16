from fastapi import Request, HTTPException, Response
from fastapi.responses import JSONResponse
from typing import Union
import traceback
from ..utils.logger import Logger
from ..config import settings

logger = Logger(__name__)

async def error_handler(
    request: Request,
    call_next
) -> Union[JSONResponse, Response]:
    try:
        return await call_next(request)
    except HTTPException as e:
        return JSONResponse(
            status_code=e.status_code,
            content={"detail": e.detail}
        )
    except Exception as e:
        logger.error(f"Unhandled error: {str(e)}\n{traceback.format_exc()}")
        return JSONResponse(
            status_code=500,
            content={
                "detail": "Internal server error",
                "message": str(e) if settings.DEBUG else None
            }
        )
