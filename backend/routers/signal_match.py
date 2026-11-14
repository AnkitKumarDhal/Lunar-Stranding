from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

router = APIRouter(prefix="/api/minigames", tags=["signal-match"])


class SignalMatchRequest(BaseModel):
    signal: str | list[int]
    pattern: str | list[int]
    session_id: str | None = "default"


# Validate binary string or integer list input strictly without silently modifying
def parse_and_validate_binary(raw_val: str | list[int], field_name: str) -> tuple[list[int], str]:
    if isinstance(raw_val, str):
        cleaned = raw_val.strip()
        for ch in cleaned:
            if ch not in ("0", "1"):
                raise HTTPException(
                    status_code=400,
                    detail=f"Invalid character '{ch}' in {field_name}. Only binary digits '0' and '1' are allowed."
                )
        int_list = [int(ch) for ch in cleaned]
        return int_list, cleaned
    elif isinstance(raw_val, list):
        for item in raw_val:
            # Check for bool (isinstance(True, int) is True in Python) or numbers != 0 and 1
            if isinstance(item, bool) or not isinstance(item, int) or item not in (0, 1):
                raise HTTPException(
                    status_code=400,
                    detail=f"Invalid value '{item}' in {field_name}. Only 0 and 1 integer values are allowed."
                )
        int_list = [int(x) for x in raw_val]
        str_val = "".join(str(x) for x in int_list)
        return int_list, str_val
    else:
        raise HTTPException(
            status_code=400,
            detail=f"{field_name} must be a binary string or array of 0 and 1 integers."
        )


# Rabin-Karp substring search algorithm using rolling hash
def rabin_karp_search(signal_list: list[int], pattern_list: list[int], d: int = 10, q: int = 13) -> int:
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
    # Validate inputs strictly without silently stripping invalid characters
    signal_list, signal_str = parse_and_validate_binary(req.signal, "signal")
    pattern_list, pattern_str = parse_and_validate_binary(req.pattern, "pattern")

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
