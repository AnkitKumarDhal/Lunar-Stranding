from typing import List
from .compat import APIRouter, BaseModel

router = APIRouter(prefix="/api/minigames", tags=["signal-match"])


class SignalMatchRequest(BaseModel):
    signal: List[int]
    pattern: List[int]


def rabin_karp_search(signal_list, pattern_list, d=10, q=13):
    n = len(signal_list)
    m = len(pattern_list)

    if m == 0 or m > n:
        return -1

    h = pow(d, m - 1) % q

    p = 0
    t0 = 0

    # Initial hash calculation.
    for i in range(m):
        p = (d * p + pattern_list[i]) % q
        t0 = (d * t0 + signal_list[i]) % q

    # Sliding window search.
    for i in range(n - m + 1):
        if p == t0:
            if signal_list[i:i + m] == pattern_list:
                return i

        if i < n - m:
            t0 = (
                d * (t0 - signal_list[i] * h)
                + signal_list[i + m]
            ) % q

    return -1


@router.post("/signal-match")
def signal_match(req: SignalMatchRequest):
    index = rabin_karp_search(req.signal, req.pattern)

    return {
        "match_found": index != -1,
        "index": index,
        "signal_length": len(req.signal),
        "pattern_length": len(req.pattern)
    }
