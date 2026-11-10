# ADR-0005: Unsupervised Anomaly Detection via Isolation Forest

## Context
Signature-based port checks cannot detect zero-day vulnerabilities, stealthy lateral movement, or behavioral compromises where a legitimate device begins behaving abnormally (e.g. an IoT camera beaconing out at 3:00 AM or opening an ephemeral reverse shell).

## Decision
NetScope adopts a **two-tier anomaly architecture**:
1. **Tier 1 (Statistical Baselines):**
   - Fast, in-memory rolling heuristics tracking known open ports, typical active hours, and baseline latency.
   - Triggers immediate alerts when a known device exposes an unexpected port.
2. **Tier 2 (Unsupervised Isolation Forest):**
   - Utilizes `sklearn.ensemble.IsolationForest` on multidimensional feature vectors:
     $$\mathbf{x} = [\text{hour\_of\_day}, \text{open\_ports\_count}, \text{response\_time\_ms}, \text{has\_new\_port}]$$
   - Isolation Forest isolates anomalies by randomly partitioning feature space, requiring fewer partitions to isolate outliers.
   - Models are trained per device with $n=50$ estimators and a 5% contamination factor.

## Consequences
- Requires no labeled training data (works in home networks and enterprise networks out of the box).
- Low computational footprint allowing retraining via asynchronous Celery background workers.

