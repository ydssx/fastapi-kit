from typing import List

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile
from typing import Optional

from app.core.security import get_current_user
from app.core.storage import storage

router = APIRouter(prefix="/files")

@router.post("/upload")
async def upload_file(
    file: UploadFile = File(...),
    folder: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    """
    上传文件
    """
    try:
        file_path = await storage.save_file(file, folder)
        return {
            "filename": file.filename,
            "file_path": file_path,
            "url": storage.get_file_url(file_path)
        }
    except Exception as e:
        raise HTTPException(
            status_code=400,
            detail=f"Could not upload file: {str(e)}"
        )

@router.post("/upload-multiple")
async def upload_multiple_files(
    files: List[UploadFile] = File(...),
    folder: str = None,
    current_user: dict = Depends(get_current_user)
):
    """
    上传多个文件
    """
    result = []
    for file in files:
        try:
            file_path = await storage.save_file(file, folder)
            result.append({
                "filename": file.filename,
                "file_path": file_path,
                "url": storage.get_file_url(file_path)
            })
        except Exception as e:
            # 继续处理其他文件
            result.append({
                "filename": file.filename,
                "error": str(e)
            })
    return result

@router.delete("/{file_path:path}")
async def delete_file(
    file_path: str,
    current_user: dict = Depends(get_current_user)
):
    """
    删除文件
    """
    success = await storage.delete_file(file_path)
    if not success:
        raise HTTPException(
            status_code=404,
            detail="File not found or could not be deleted"
        )
    return {"status": "success", "message": "File deleted"}
