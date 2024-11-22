from datetime import datetime, timedelta

from app.core.celery_app import celery_app
from app.core.database import SessionLocal
from app.models.item import Item


@celery_app.task
def cleanup_old_data():
    """清理30天前的旧数据"""
    db = SessionLocal()
    try:
        threshold = datetime.utcnow() - timedelta(days=30)
        old_items = db.query(Item).filter(Item.created_at < threshold).all()
        for item in old_items:
            db.delete(item)
        db.commit()
        return {"status": "success", "message": f"Cleaned up {len(old_items)} old items"}
    except Exception as e:
        return {"status": "error", "message": str(e)}
    finally:
        db.close()
