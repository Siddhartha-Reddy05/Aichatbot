from fastapi import APIRouter
from core.logger import get_logger
import random

router = APIRouter()
logger = get_logger("backend")

@router.get("/log-test")
async def log_test():
    # Emit logs at multiple levels
    trace_id = random.randint(1000, 9999)
    logger.debug("Debug message from /debug/log-test", extra={"trace_id": trace_id})
    logger.info("Info message from /debug/log-test", extra={"trace_id": trace_id})
    logger.warning("Warn message from /debug/log-test", extra={"trace_id": trace_id})
    logger.error("Error message from /debug/log-test", extra={"trace_id": trace_id})
    return {"ok": True, "trace_id": trace_id, "message": "Wrote debug/info/warn/error logs"}

@router.get("/log-error")
async def log_error():
    trace_id = random.randint(1000, 9999)
    try:
        raise RuntimeError("Synthetic error for logging test")
    except Exception as e:
        logger.exception("Exception captured in /debug/log-error", extra={"trace_id": trace_id})
        return {"ok": False, "trace_id": trace_id, "error": str(e)}
