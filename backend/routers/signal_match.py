def rabin_karp_search(signal_list, pattern_list, d=10, q=13):
    n = len(signal_list)
    m = len(pattern_list)
    h = pow(d, m-1) % q

    p = 0
    t0 = 0
    
    # Initial hash calculation
    for i in range(m):
        p = (d * p + pattern_list[i]) % q
        t0 = (d * t0 + signal_list[i]) % q

    # Sliding window search
    for i in range(n - m + 1):
        if p == t0:
            if signal_list[i:i + m] == pattern_list:
                return i  # Return the index instead of printing
                
        if i < n - m:
            t0 = (d * (t0 - signal_list[i]*h) + signal_list[i + m]) % q
            
    return -1  # Return -1 if no match is found

# Execution block for your own testing
if __name__ == "__main__":
    test_signal = [3, 7, 2, 8, 4, 9, 1, 0, 2, 8, 3, 7, 4, 6, 5, 9, 2, 8, 1, 0, 4, 7]
    test_pattern = [4, 6, 5]
    
    winning_index = rabin_karp_search(test_signal, test_pattern)
    print(f"Algorithm finished. Target found at index: {winning_index}")