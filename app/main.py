from fastapi import FastAPI, HTTPException
from .routers import chat
from .middleware import setup_middleware
from .cache import setup_cache
from .config import settings
import uvicorn

app = FastAPI(title=settings.APP_NAME)


@app.on_event("startup")
async def startup_event():
    await setup_cache()


# 设置中间件
setup_middleware(app)

# 注册路由
app.include_router(chat.router, prefix=settings.API_PREFIX)


if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
