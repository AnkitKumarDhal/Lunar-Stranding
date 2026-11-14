from collections import Counter
import heapq
from .compat import APIRouter, BaseModel

router = APIRouter(prefix="/api/minigames", tags=["signal-transmission"])


class SignalTransmissionRequest(BaseModel):
    text: str


class Node:
    def __init__(self, char, freq):
        self.char = char
        self.freq = freq
        self.left = None
        self.right = None

    def __lt__(self, other):
        return self.freq < other.freq


def build_huffman_tree(text):
    frequencies = Counter(text)
    heap = [Node(char, freq) for char, freq in frequencies.items()]
    heapq.heapify(heap)

    if not heap:
        return None

    if len(heap) == 1:
        only_node = heap[0]
        root = Node(None, only_node.freq)
        root.left = only_node
        return root

    while len(heap) > 1:
        left = heapq.heappop(heap)
        right = heapq.heappop(heap)

        merged = Node(None, left.freq + right.freq)
        merged.left = left
        merged.right = right

        heapq.heappush(heap, merged)

    return heap[0]


def generate_codes(node, current_code="", codes=None):
    if codes is None:
        codes = {}

    if node is None:
        return codes

    if node.char is not None:
        codes[node.char] = current_code or "0"
        return codes

    generate_codes(node.left, current_code + "0", codes)
    generate_codes(node.right, current_code + "1", codes)

    return codes


def huffman_encode(text):
    if not text:
        return "", None

    root = build_huffman_tree(text)
    codes = generate_codes(root)

    encoded_text = "".join(
        codes[char] for char in text
    )

    return encoded_text, root


def huffman_decode(encoded_text, root):
    if not encoded_text or root is None:
        return ""

    decoded_chars = []
    current_node = root

    for bit in encoded_text:
        current_node = (
            current_node.left
            if bit == "0"
            else current_node.right
        )

        if current_node.char is not None:
            decoded_chars.append(current_node.char)
            current_node = root

    return "".join(decoded_chars)


@router.post("/signal-transmission")
def signal_transmission(req: SignalTransmissionRequest):
    encoded, tree_root = huffman_encode(req.text)
    decoded = huffman_decode(encoded, tree_root)
    codes = generate_codes(tree_root)

    original_bits = len(req.text.encode("utf-8")) * 8
    encoded_bits = len(encoded)

    ratio = (encoded_bits / original_bits if original_bits else 0)

    return {
        "original_text": req.text,
        "encoded_text": encoded,
        "decoded_text": decoded,
        "codes": codes,
        "original_bits": original_bits,
        "encoded_bits": encoded_bits,
        "compression_ratio": round(ratio, 4),
        "space_saved_percentage": (round((1 - ratio) * 100, 2) if original_bits else 0),
        "round_trip_valid": decoded == req.text
    }
