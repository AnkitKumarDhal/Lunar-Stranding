import random

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

router = APIRouter(prefix="/api/minigames", tags=["signal-match"])
SIGNAL_LENGTH = 80
PATTERN_LENGTH = 10


class SignalMatchRequest(BaseModel):
    signal: str | None = None
    pattern: str | None = None
    player_index: int | None = None


def rabin_karp_search(signal: str, pattern: str) -> int:
    """Return the first index of pattern in signal using a rolling hash."""
    n, m = len(signal), len(pattern)
    if not m or n < m:
        return -1

    base, prime = 2, 101
    highest = pow(base, m - 1, prime)
    pattern_hash = signal_hash = 0

    for i in range(m):
        pattern_hash = (base * pattern_hash + int(pattern[i])) % prime
        signal_hash = (base * signal_hash + int(signal[i])) % prime

    for i in range(n - m + 1):
        if pattern_hash == signal_hash and signal[i:i + m] == pattern:
            return i
        if i < n - m:
            signal_hash = (
                base * (signal_hash - int(signal[i]) * highest) + int(signal[i + m])
            ) % prime

    return -1


def generate_signal_challenge() -> dict[str, str]:
    """Create a binary signal containing one unique target substring."""
    while True:
        signal = "".join(random.choices("01", k=SIGNAL_LENGTH))
        start = random.randint(0, SIGNAL_LENGTH - PATTERN_LENGTH)
        pattern = signal[start:start + PATTERN_LENGTH]
        matches = sum(
            signal[i:i + PATTERN_LENGTH] == pattern
            for i in range(SIGNAL_LENGTH - PATTERN_LENGTH + 1)
        )
        if matches == 1:
            return {"signal": signal, "pattern": pattern}


@router.post("/signal-match")
def signal_match_search(req: SignalMatchRequest):
    # An empty request starts a new round.
    if req.signal is None and req.pattern is None and req.player_index is None:
        return generate_signal_challenge()

    if not req.signal or not req.pattern or req.player_index is None:
        raise HTTPException(status_code=400, detail="A signal, target and selected window are required.")
    if any(bit not in "01" for bit in req.signal + req.pattern):
        raise HTTPException(status_code=400, detail="Only binary digits 0 and 1 are allowed.")
    if len(req.pattern) > len(req.signal):
        raise HTTPException(status_code=400, detail="Target is longer than the signal.")
    if not 0 <= req.player_index <= len(req.signal) - len(req.pattern):
        raise HTTPException(status_code=400, detail="Selected window is outside the signal.")

    match_index = rabin_karp_search(req.signal, req.pattern)
    found = req.player_index == match_index
    return {
        "pattern_found": found,
        "status": "PATTERN_LOCKED" if found else "WRONG_WINDOW",
        "message": (
            "Signal lock established! Target pattern found."
            if found else "This window does not match the target. Keep sliding."
        ),
    }
