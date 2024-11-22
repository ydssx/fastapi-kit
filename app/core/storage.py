import os
import shutil
from typing import Optional

from fastapi import UploadFile

from app.core.config import get_settings

settings = get_settings()


class FileStorage:
    def __init__(self):
        self.upload_dir = settings.UPLOAD_DIR
        os.makedirs(self.upload_dir, exist_ok=True)

    async def save_file(self, file: UploadFile, folder: Optional[str] = None) -> str:
        """保存上传的文件"""
        folder_path = (
            os.path.join(self.upload_dir, folder) if folder else self.upload_dir
        )
        os.makedirs(folder_path, exist_ok=True)

        file_path = os.path.join(folder_path, file.filename)

        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)

        return file_path

    async def delete_file(self, file_path: str) -> bool:
        """删除文件"""
        try:
            if os.path.exists(file_path):
                os.remove(file_path)
                return True
            return False
        except Exception:
            return False

    def get_file_url(self, file_path: str) -> str:
        """获取文件URL"""
        relative_path = os.path.relpath(file_path, self.upload_dir)
        return f"{settings.API_V1_STR}/files/{relative_path}"


# 创建全局存储实例
storage = FileStorage()
