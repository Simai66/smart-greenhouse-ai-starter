# 12 — Risk register

| Risk | Severity | Mitigation / owner | Gate |
|---|---|---|---|
| Relay wiring/output and emergency OFF unknown | Blocker for actuation | Hardware owner verifies circuit, de-energized boot state and interlock | Before S1-02 completion/actuation |
| Historical soil/BH1750 sensors absent from firmware evidence | Major | Verify modules/pins/calibration; don't show synthetic live values | Before sensor dashboard/automation |
| No configured pump/cooldown/threshold/expiry values | Blocker for automatic control | Owner supplies values; preserve `REQUIRES_CONFIGURATION` | Before control pilot |
| Pi endpoint/time/CA rotation owner unknown | Major | Reserve DNS/IP, trust root on clients, reliable cold-boot time | Before S2/S3 TLS |
| No labeled tomato image set | Major for thesis AI evaluation | Collect/label with manifest and split protocol | Before S4-03 claims |
| TFLite compatibility with Python 3.13 Alpine unknown | Major | Benchmark Ubuntu 24.04 arm64 before runtime choice | Before S4-02 integration |
| ESP32 offline buffer size/flash wear unknown | Major | Measure sample rate/outage target and test bounded policy | Before S2-02 release |
| SQLite media failure or disk exhaustion | Major | Capacity/retention measurement, backup and restore drills | Before local pilot |
| Cloud deployment/image authorization not verified live | Major | staging smoke tests for Access, signed reads, anonymous denial | Before S5/release |
| Local account recovery undefined | Major | Name administrator and test recovery without shared account | Before S3-02 |
| Operational image expiry conflicts with thesis retention | Major | Separate archive and manifest/checksum; explicit owner cleanup | Before S4-01 |
| Local CA not trusted on clients | Major | Provision/import trust chain; fail closed on mismatch | Before local dashboard pilot |

All unmeasured limits are `REQUIRES_CONFIGURATION`. No physical pilot until blocker risks have evidence and named owners.
