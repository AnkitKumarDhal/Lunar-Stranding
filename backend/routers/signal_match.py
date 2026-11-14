from typing import List, Optional, Union
from .compat import APIRouter, HTTPException, BaseModel

router = APIRouter(prefix="/api/minigames", tags=["signal-match"])


class SignalMatchRequest(BaseModel):
    signal: Union[str, List[int]]
    pattern: Union[str, List[int]]
    session_id: Optional[str] = "default"


# Rabin-Karp substring search algorithm using rolling hash
def rabin_karp_search(signal_list: List[int], pattern_list: List[int], d: int = 10, q: int = 13) -> int:
    n = len(signal_list)
    m = len(pattern_list)

    if m == 0 or n < m:
        return -1

    h = pow(d, m - 1) % q

    p = 0
    t0 = 0

    # Initial hash calculation
    for i in range(m):
        p = (d * p + pattern_list[i]) % q
        t0 = (d * t0 + signal_list[i]) % q

    # Sliding window search
    for i in range(n - m + 1):
        if p == t0:
            if signal_list[i : i + m] == pattern_list:
                return i

        if i < n - m:
            t0 = (d * (t0 - signal_list[i] * h) + signal_list[i + m]) % q

    return -1


@router.post("/signal-match")
def signal_match_search(req: SignalMatchRequest):
    # Convert input signal and pattern to integer lists
    if isinstance(req.signal, str):
        signal_clean = req.signal.strip()
        signal_list = [int(c) for c in signal_clean if c in "01"]
        signal_str = signal_clean
    else:
        signal_list = [int(x) for x in req.signal]
        signal_str = "".join(str(x) for x in signal_list)

    if isinstance(req.pattern, str):
        pattern_clean = req.pattern.strip()
        pattern_list = [int(c) for c in pattern_clean if c in "01"]
        pattern_str = pattern_clean
    else:
        pattern_list = [int(x) for x in req.pattern]
        pattern_str = "".join(str(x) for x in pattern_list)

    # Edge cases
    if not pattern_list:
        return {
            "signal": signal_str,
            "pattern": pattern_str,
            "pattern_found": False,
            "match_index": -1,
            "status": "EMPTY_PATTERN",
            "message": "Search pattern is empty. Provide at least one bit to match."
        }

    if not signal_list:
        return {
            "signal": signal_str,
            "pattern": pattern_str,
            "pattern_found": False,
            "match_index": -1,
            "status": "EMPTY_SIGNAL",
            "message": "Received carrier signal is empty. No transmission received."
        }

    if len(pattern_list) > len(signal_list):
        return {
            "signal": signal_str,
            "pattern": pattern_str,
            "pattern_found": False,
            "match_index": -1,
            "status": "PATTERN_TOO_LONG",
            "message": (
                f"Pattern length ({len(pattern_list)} bits) exceeds "
                f"carrier signal length ({len(signal_list)} bits)."
            )
        }

    # Execute Rabin-Karp search
    idx = rabin_karp_search(signal_list, pattern_list)

    if idx != -1:
        return {
            "signal": signal_str,
            "pattern": pattern_str,
            "pattern_found": True,
            "match_index": idx,
            "status": "PATTERN_LOCKED",
            "message": f"Signal lock established! Pattern verified at bit offset {idx}."
        }
    else:
        return {
            "signal": signal_str,
            "pattern": pattern_str,
            "pattern_found": False,
            "match_index": -1,
            "status": "PATTERN_NOT_FOUND",
            "message": "No matching telemetry sequence found in the received radio signal."
        }
