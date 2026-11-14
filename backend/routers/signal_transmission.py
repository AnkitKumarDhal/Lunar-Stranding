# Compressed signal transmission using huffman coding

from collections import Counter
import heapq


class Node:

  def __init__(self, char, freq):
    self.char = char
    self.freq = freq
    self.left = None
    self.right = None

  # Define comparison so heapq can sort nodes by frequency
  def __lt__(self, other):
    return self.freq < other.freq


def build_huffman_tree(text):
  # Count frequency of each character
  frequencies = Counter(text)

  # Create a min-heap of leaf nodes
  heap = [Node(char, freq) for char, freq in frequencies.items()]
  heapq.heapify(heap)

  # Edge case: string has only 1 unique character
  if len(heap) == 1:
    only_node = heap[0]
    root = Node(None, only_node.freq)
    root.left = only_node
    return root

  # Merge the two lowest-frequency nodes until one root remains
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

  # If it's a leaf node, store the character's binary code
  if node.char is not None:
    codes[node.char] = current_code
    return codes

  generate_codes(node.left, current_code + "0", codes)
  generate_codes(node.right, current_code + "1", codes)
  return codes

# converts a string "text" into huffman code string 
# return encoded string and the huffman tree root
def huffman_encode(text):
  if not text:
    return "", None
  root = build_huffman_tree(text)
  codes = generate_codes(root)
  encoded_text = "".join(codes[char] for char in text)
  return encoded_text, root

#  Take huffman code string and huffman tree root to return the decoded string
def huffman_decode(encoded_text, root):
  if not encoded_text or root is None:
    return ""

  decoded_chars = []
  current_node = root

  for bit in encoded_text:
    current_node = current_node.left if bit == "0" else current_node.right

    # Reached a leaf/end node
    if current_node.char is not None:
      decoded_chars.append(current_node.char)
      current_node = root

  return "".join(decoded_chars)


# Example Use
if __name__ == "__main__":
  sample_text = "health is wealth"

  encoded, tree_root = huffman_encode(sample_text)
  decoded = huffman_decode(encoded, tree_root)
  code_map = generate_codes(tree_root)

  print(f"Original: {sample_text}")
  print(f"Code Map: {code_map}")
  print(f"Encoded:  {encoded}")
  print(f"Decoded:  {decoded}")
