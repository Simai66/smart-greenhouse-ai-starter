# 06 — Edge AI design

## Pipeline

Pi Camera → scheduled capture → validated preprocessing → versioned MobileNetV2/TFLite-compatible model → healthy/unhealthy prediction → SQLite → local dashboard → cloud metadata sync. Capture failure, corrupt image, model load failure and inference exception create safe system events; they do not affect actuator policy.

## Reproducibility

Record image ID/checksum, plant/device, capture time, preprocessing version, model version, label, confidence, latency and runtime version. No model or dataset currently verified. User reports no labeled dataset; first work is consented tomato image collection and labeling. Archive thesis images separately from operational objects subject to 15-day expiry.

Camera scheduling is configuration-driven: persist schedule version, requested/actual capture time, camera ID, plant/measurement-point assignment and result/error event. Cadence remains `REQUIRES_CONFIGURATION`. Permit supervised manual capture with actor recorded. A missed schedule is logged, not replayed as a burst after recovery.

## Runtime gate

Benchmark runtime on Raspberry Pi 5, Ubuntu 24.04 arm64. Current gateway container is Python 3.13 Alpine; TFLite compatibility is unverified. Keep inference isolated only if direct integration is incompatible or harms gateway reliability; do not select runtime before compatibility and resource benchmark.

## Evaluation

Split by plant/session to reduce leakage. Report confusion matrix, accuracy, precision, recall, F1, inference latency and CPU/RAM use with dataset/model versions. Publish no performance claim until test set is held out and experiment is repeatable.
