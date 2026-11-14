from collections import Counter
import heapq
from typing import Dict, Optional
from .compat import APIRouter, HTTPException, BaseModel

router = APIRouter(prefix="/api/minigames", tags=["signal-transmission"])


class SignalTransmissionRequest(BaseModel):
    text: str
    session_id: Optional[str] = "default"


class Node:
    def __init__(self, char: Optional[str], freq: int):
        self.char = char
        self.freq = freq
        self.left: Optional[Node] = None
        self.right: Optional[Node] = None

    # Comparison operator so heapq sorts nodes by frequency
    def __lt__(self, other: "Node") -> bool:
        return self.freq < other.freq


def build_huffman_tree(text: str) -> Optional[Node]:
    if not text:
        return None

    frequencies = Counter(text)
    heap = [Node(char, freq) for char, freq in frequencies.items()]
    heapq.heapify(heap)

    # Edge case: string has only 1 unique character
    if len(heap) == 1:
        only_node = heapq.heappop(heap)
        root = Node(None, only_node.freq)
        root.left = only_node
        return root

    # Merge two lowest-frequency nodes iteratively until 1 root remains
    while len(heap) > 1:
        left = heapq.heappop(heap)
        right = heapq.heappop(heap)

        merged = Node(None, left.freq + right.freq)
        merged.left = left
        merged.right = right

        heapq.heappush(heap, merged)

    return heap[0]


def generate_codes(node: Optional[Node], current_code: str = "", codes: Optional[Dict[str, str]] = None) -> Dict[str, str]:
    if codes is None:
        codes = {}
    if node is None:
        return codes

    # Leaf node: store character binary code
    if node.char is not None:
        codes[node.char] = current_code if current_code else "0"
        return codes

    generate_codes(node.left, current_code + "0", codes)
    generate_codes(node.right, current_code + "1", codes)
    return codes


def huffman_encode(text: str):
    if not text:
        return "", None
    root = build_huffman_tree(text)
    codes = generate_codes(root)
    encoded_text = "".join(codes[char] for char in text)
    return encoded_text, root


def huffman_decode(encoded_text: str, root: Optional[Node]) -> str:
    if not encoded_text or root is None:
        return ""

    decoded_chars = []
    current_node = root

    for bit in encoded_text:
        current_node = current_node.left if bit == "0" else current_node.right
        if current_node is None:
            break

        # Reached leaf node
        if current_node.char is not None:
            decoded_chars.append(current_node.char)
            current_node = root

    return "".join(decoded_chars)


@router.post("/signal-transmission")
def signal_transmission_encode(req: SignalTransmissionRequest):
    text = req.text

    # Handle empty input safely
    if not text:
        return {
            "original_text": "",
            "character_frequencies": {},
            "code_map": {},
            "encoded_signal": "",
            "original_length_bits": 0,
            "encoded_length_bits": 0,
            "compression_ratio_percentage": 0.0,
            "decoded_text": "",
            "is_valid": True,
            "status": "EMPTY_INPUT",
            "message": "Empty transmission payload. 0 bits sent."
        }

    # Generate tree and code mapping
    encoded_str, tree_root = huffman_encode(text)
    decoded_str = huffman_decode(encoded_str, tree_root)
    code_map = generate_codes(tree_root)
    freqs = dict(Counter(text))

    original_bits = len(text) * 8
    encoded_bits = len(encoded_str)
    reduction = round((1.0 - (encoded_bits / original_bits)) * 100.0, 2) if original_bits > 0 else 0.0
    is_valid = (decoded_str == text)

    return {
        "original_text": text,
        "character_frequencies": freqs,
        "code_map": code_map,
        "encoded_signal": encoded_str,
        "original_length_bits": original_bits,
        "encoded_length_bits": encoded_bits,
        "compression_ratio_percentage": reduction,
        "decoded_text": decoded_str,
        "is_valid": is_valid,
        "status": "OPTIMAL_COMPRESSION" if is_valid else "VALIDATION_FAILED",
        "message": (
            f"Lossless compression complete! {original_bits} bits -> {encoded_bits} bits "
            f"({reduction}% reduction). Round-trip verified."
            if is_valid
            else "Huffman round-trip verification failed."
        )
    }
