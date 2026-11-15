from collections import Counter
import heapq

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

router = APIRouter(prefix="/api/minigames", tags=["signal-transmission"])

MESSAGE = "RECEIVED"
ALLOWED_CHARS = set("ABCDEFGHIJKLMNOPQRSTUVWXYZ ")


class SignalTransmissionRequest(BaseModel):
    encoded_signal: str | None = None
    code_map: dict[str, str] | None = None
    answer: str | None = None


class Node:
    def __init__(self, char: str | None, freq: int):
        self.char = char
        self.freq = freq
        self.left: Node | None = None
        self.right: Node | None = None

    def __lt__(self, other: "Node") -> bool:
        return self.freq < other.freq


def build_huffman_codes(text: str) -> dict[str, str]:
    """Build Huffman codes for the characters in a message."""
    heap = [Node(char, freq) for char, freq in Counter(text).items()]
    heapq.heapify(heap)

    while len(heap) > 1:
        left, right = heapq.heappop(heap), heapq.heappop(heap)
        parent = Node(None, left.freq + right.freq)
        parent.left, parent.right = left, right
        heapq.heappush(heap, parent)

    codes = {}

    def visit(node: Node, code: str = "") -> None:
        if node.char is not None:
            codes[node.char] = code or "0"
        else:
            visit(node.left, code + "0")
            visit(node.right, code + "1")

    visit(heap[0])
    return codes


def decode_huffman(encoded: str, code_map: dict[str, str]) -> str:
    """Decode bits using the supplied character-to-code table."""
    if not encoded or not code_map or any(char not in ALLOWED_CHARS for char in code_map):
        raise HTTPException(status_code=400, detail="Invalid transmission or code table")

    codes = list(code_map.values())
    if any(not code or set(code) - {"0", "1"} for code in codes):
        raise HTTPException(status_code=400, detail="Codes must contain only 0 and 1")
    if len(codes) != len(set(codes)) or any(
        a != b and b.startswith(a) for a in codes for b in codes
    ):
        raise HTTPException(status_code=400, detail="Code table must be prefix-free")

    reverse_map = {code: char for char, code in code_map.items()}
    decoded, current = [], ""

    for bit in encoded:
        if bit not in "01":
            raise HTTPException(status_code=400, detail="Encoded signal must contain only 0 and 1")
        current += bit
        if current in reverse_map:
            decoded.append(reverse_map[current])
            current = ""
        elif not any(code.startswith(current) for code in codes):
            raise HTTPException(status_code=400, detail="Encoded signal does not match the code table")

    if current:
        raise HTTPException(status_code=400, detail="Encoded signal ends with an incomplete code")

    return "".join(decoded)


def generate_challenge() -> dict:
    code_map = build_huffman_codes(MESSAGE)
    encoded = "".join(code_map[char] for char in MESSAGE)
    return {"encoded_signal": encoded, "code_map": code_map}


@router.post("/signal-transmission")
def signal_transmission(req: SignalTransmissionRequest):
    # An empty request creates a new message; a completed request is evaluated.
    if req.encoded_signal is None and req.code_map is None and req.answer is None:
        return generate_challenge()

    if req.encoded_signal is None or req.code_map is None or req.answer is None:
        raise HTTPException(status_code=400, detail="Send the signal, code table and decoded answer")

    correct_answer = decode_huffman(req.encoded_signal, req.code_map)
    answer = req.answer.strip().upper()
    if any(char not in ALLOWED_CHARS for char in answer):
        raise HTTPException(status_code=400, detail="Answer may contain only A-Z and spaces")

    is_correct = answer == correct_answer
    return {
        "status": "CORRECT" if is_correct else "INCORRECT",
        "is_correct": is_correct,
        "correct_answer": correct_answer,
        "message": "Transmission decoded successfully." if is_correct else "The decoded message does not match. Try again.",
    }
