+++
title = "High Performance Cache Replacement Using Re-Reference Interval Prediction (RRIP)"
[extra]
bio = """ """
[[extra.authors]]
name = " Thomas Pinon (Leader / Presentor)"
[[extra.authors]]
[[extra.authors]]
name = "Eric Morgan (scribe)"
[[extra.authors]]
name = "James S. Tappert (blogger)"
+++

## Introduction
Cache replacement policies play a central role in determining the effectiveness of modern cache hierarchies. Despite decades of architectural evolution, the dominant policy remains Least Recently Used (LRU), largely due to its intuitive appeal and historical simplicity. However, LRU operates off the assumption that recent access implies near-future reuse. While often true, this assumption fails for a wide range of contemporary workloads, including streaming applications, large working sets, and multiprogrammed environments where interference dominates cache behavior.

The paper *High Performance Cache Replacement Using Re-reference Interval Prediction (RRIP)* introduces RRIP as an alternative replacment policy to LRU. Rather than estimating reuse indirectly through recency, RRIP explicitly predicts how far in the future a cache block will be referenced again. This alternative prediction method enables replacement decisions that more closely approximate optimal behavior, while still remaining implementable in real hardware.

## Background and Motivation

### Limitations of LRU

LRU assumes that recently accessed data will be reused in the near future. This assumption breaks down in several common scenarios:

- **Streaming workloads**, where data is accessed once and never reused
- **Large working sets** that exceed cache capacity, leading to thrashing
- **Mixed access patterns**, where frequently reused data structures coexist with large scans

In such cases, LRU allows non-temporal data to evict frequently reused cache blocks, significantly degrading performance.

## Key Concepts and Terminology

- **Re-reference Interval Prediction (RRIP):** A cache replacement framework that predicts how long it will be before a cache block is reused, rather than relying solely on recency.
- **Re-reference Prediction Value (RRPV):** A small per-cache-line counter that encodes the predicted distance to the next reuse. Larger values indicate farther reuse.
- **Static RRIP (SRRIP):** A policy that inserts new cache lines with a long predicted re-reference interval, providing strong resistance to cache pollution from streaming accesses.
- **Bimodal RRIP (BRRIP):** A variant that usually inserts cache lines with a very long re-reference interval but occasionally inserts them as likely-to-be-reused, improving performance under thrashing workloads.
- **Dynamic RRIP (DRRIP):** A hybrid policy that dynamically selects between using SRRIP or BRIPP using Set Dueling.
- **Set Dueling:** A technique that dedicates a small number of cache sets to competing policies and uses their miss behavior to select the most effective policy at runtime.

## Overview of the RRIP Mechanism

RRIP associates each cache block with an RRPV counter that represents its predicted reuse distance. Conceptually:

- **RRPV = 0** indicates an expected near-immediate reuse
- **RRPV = Max** indicates reuse far in the future or no reuse at all

### Replacement Policy

On a cache miss:
1. The cache searches for a block with the maximum RRPV.
2. If no such block exists, all RRPVs are incremented until at least one reaches the maximum value.
3. A block with the maximum RRPV is selected for eviction.

On a cache hit:
- The accessed block’s RRPV is decremented, indicating high reuse potential.

### Scan Resistance and Adaptivity

SRRIP inserts new cache blocks with long predicted reuse distances, preventing streaming data from displacing frequently reused blocks. DRRIP extends this approach by dynamically choosing between SRRIP and BRRIP based on runtime behavior. Using set dueling, DRRIP adapts to workload characteristics without software intervention.

## Evaluation and Results

The authors evaluate RRIP across a wide range of single-core and multi-core workloads. Key findings include:

- **Performance Improvements**
  - SRRIP achieves approximately 4–7% performance improvement over LRU
  - DRRIP achieves approximately 9–10% improvement over LRU
- **Hardware Overhead**
  - Only 2 bits per cache block are required
  - Lower complexity than LRU implementations
- **Robustness**
  - Strong resistance to cache pollution from scans
  - Stable performance across diverse application behaviors
- **Multicore Benefits**
  - Reduced inter-core cache interference
  - Improved overall throughput and fairness

These results demonstrate that RRIP provides consistent gains with minimal additional hardware cost.

## Strengths and Limitations

### Strengths

- **Conceptual Clarity:** Explicitly modeling reuse distance aligns more closely with optimal replacement behavior than recency-based policies.
- **Low Implementation Cost:** RRIP requires minimal state and simpler logic than LRU.
- **Adaptability:** DRRIP dynamically adjusts to workload behavior without programmer or operating system involvement.

### Limitations

- **Predictive Approximation:** RRPVs provide only a coarse approximation of reuse distance, especially with small counters, and irregular access patterns may still lead to poor predictions.
- **Evaluation Scope:** Some highly pointer-intensive or unpredictable workloads are not extensively explored.




## Class Discussion
* **Where is the data going when it is not recently used? Is there demotion between levels of cache?:**
  * Yes, when you kick something from the L1, it goes to the L2. Caches are generally inclusive.
* **Why is this not implemented in higher levels of cache?:**
  * Latency constraints and hardware overhead. More computational logic for finding near and far values.. Not much gain in efficiency.
* **What eviction policy is used in L1?:**
  * NRU is used. Only one bit and very fast.
* **How often is L3 accessed in workloads such as gaming? Are the performance gains worth it?:"**
  * Depends on the workload. The paper showed that performance increased in all benchmarks expect photoshop. Performance increases across the board seem to show L3 cache access. L3 is designed to minimize cache misses, so additional hardware is fine because latency is not an issue.
* **What hardware was used to test this?**
  * CNP-based x86 simulator, as well as games, and productivity apps.
## Conclusion

The RRIP framework illustrates that cache replacement policies can be both simple and highly effective when they directly model reuse behavior. By predicting re-reference intervals instead of relying on recency, RRIP consistently outperforms traditional LRU while maintaining low hardware overhead. The success of DRRIP further demonstrates the importance of adaptive policies in handling modern, diverse workloads.


## References

- Jaleel, A., et al. *High Performance Cache Replacement Using Re-reference Interval Prediction* (https://dl.acm.org/doi/10.1145/1815961.1815971)

# Generative AI Disclosure
* ChatGPT was used to generate a Markdown file template and check spelling and grammar.

* Generative AI can be useful tools for tasks such as summarizing or drafting, however, they may give innacurate information confidently and should always have generated information validated
