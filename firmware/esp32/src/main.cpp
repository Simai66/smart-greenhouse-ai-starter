#include <Arduino.h>
#include <ArduinoJson.h>
#include <HTTPClient.h>
#include <Preferences.h>
#include <Adafruit_SHT31.h>
#include <Wire.h>
#include <WiFi.h>
#include <cmath>
#include <ctime>
#include <vector>

#include "esp_idf_version.h"
#include "esp_task_wdt.h"

#if __has_include("local_config.h")
#include "local_config.h"
#endif

#ifndef WIFI_SSID
#define WIFI_SSID "replace-me"
#endif
#ifndef WIFI_PASSWORD
#define WIFI_PASSWORD "replace-me"
#endif
#ifndef PI_BASE_URL
#define PI_BASE_URL "http://192.168.1.10:8080"
#endif
#ifndef NODE_ID
#define NODE_ID "ESP32-01"
#endif
#ifndef NODE_TOKEN
#define NODE_TOKEN "replace-with-lan-token"
#endif

constexpr uint8_t SHT30_SDA_PIN = 21;
constexpr uint8_t SHT30_SCL_PIN = 22;
constexpr uint8_t SHT30_ADDRESS = 0x44;
constexpr uint32_t DEFAULT_INTERVAL_SECONDS = 30;
constexpr uint32_t CONFIG_REFRESH_MS = 60UL * 1000UL;
constexpr uint32_t WIFI_RETRY_MS = 10UL * 1000UL;

struct SensorConfig {
  String sensorId;
  String metric;
  String unit;
  uint32_t intervalSeconds = DEFAULT_INTERVAL_SECONDS;
  float scale = 1.0f;
  float offset = 0.0f;
  uint32_t configVersion = 1;
  bool enabled = true;
};

enum class SensorQuality { kValid, kSuspect, kInvalid };

Adafruit_SHT31 sht30;
bool sht30Ready = false;

class SensorAdapter {
 public:
  virtual ~SensorAdapter() = default;
  virtual SensorQuality readRaw(const SensorConfig& config, float& value) = 0;
};

class Sht30SensorAdapter final : public SensorAdapter {
 public:
  void begin() {
    Wire.begin(SHT30_SDA_PIN, SHT30_SCL_PIN);
    sht30Ready = sht30.begin(SHT30_ADDRESS);
    Serial.printf("[SHT30] %s | SDA=%u SCL=%u address=0x%02X\n",
                  sht30Ready ? "Connected" : "Not found",
                  SHT30_SDA_PIN,
                  SHT30_SCL_PIN,
                  SHT30_ADDRESS);
  }

  SensorQuality readRaw(const SensorConfig& config, float& value) override {
    if (!sht30Ready) return SensorQuality::kInvalid;
    if (config.metric == "temperature") value = sht30.readTemperature();
    else if (config.metric == "humidity") value = sht30.readHumidity();
    else return SensorQuality::kInvalid;
    return std::isfinite(value) ? SensorQuality::kValid : SensorQuality::kInvalid;
  }
};

std::vector<SensorConfig> sensorConfigs;
Sht30SensorAdapter sensorAdapter;
Preferences preferences;
uint32_t sequenceNumber = 0;
uint32_t lastConfigRefresh = 0;
uint32_t lastWifiAttempt = 0;
std::vector<uint32_t> lastPublishedAt;

void feedWatchdog() {
  esp_task_wdt_reset();
}

void setupWatchdog() {
#if ESP_IDF_VERSION_MAJOR >= 5
  esp_task_wdt_config_t config = {
      .timeout_ms = 10000,
      .idle_core_mask = (1 << portNUM_PROCESSORS) - 1,
      .trigger_panic = true,
  };
  esp_task_wdt_init(&config);
#else
  esp_task_wdt_init(10, true);
#endif
  esp_task_wdt_add(nullptr);
}

void saveConfig() {
  JsonDocument document;
  JsonArray sensors = document["sensors"].to<JsonArray>();
  for (const SensorConfig& config : sensorConfigs) {
    JsonObject item = sensors.add<JsonObject>();
    item["sensorId"] = config.sensorId;
    item["metric"] = config.metric;
    item["unit"] = config.unit;
    item["samplingIntervalSeconds"] = config.intervalSeconds;
    item["configVersion"] = config.configVersion;
    item["enabled"] = config.enabled;
    JsonObject calibration = item["calibration"].to<JsonObject>();
    calibration["scale"] = config.scale;
    calibration["offset"] = config.offset;
  }
  String encoded;
  serializeJson(document, encoded);
  preferences.begin("greenhouse", false);
  preferences.putString("config", encoded);
  preferences.putULong("sequence", sequenceNumber);
  preferences.end();
}

void loadConfig() {
  preferences.begin("greenhouse", true);
  String encoded = preferences.getString("config", "");
  sequenceNumber = preferences.getULong("sequence", 0);
  preferences.end();
  if (encoded.isEmpty()) return;

  JsonDocument document;
  if (deserializeJson(document, encoded) != DeserializationError::Ok) return;
  JsonArray sensors = document["sensors"].as<JsonArray>();
  sensorConfigs.clear();
  for (JsonObject item : sensors) {
    SensorConfig config;
    config.sensorId = item["sensorId"] | "";
    config.metric = item["metric"] | "";
    config.unit = item["unit"] | "";
    config.intervalSeconds = item["samplingIntervalSeconds"] | DEFAULT_INTERVAL_SECONDS;
    config.configVersion = item["configVersion"] | 1;
    config.enabled = item["enabled"] | true;
    config.scale = item["calibration"]["scale"] | 1.0f;
    config.offset = item["calibration"]["offset"] | 0.0f;
    if (!config.sensorId.isEmpty() && !config.metric.isEmpty()) sensorConfigs.push_back(config);
  }
  lastPublishedAt.assign(sensorConfigs.size(), 0);
}

String sampledAtUtc() {
  time_t timestamp = time(nullptr);
  if (timestamp < 1700000000) return "1970-01-01T00:00:00.000Z";
  struct tm utc;
  gmtime_r(&timestamp, &utc);
  char output[25];
  strftime(output, sizeof(output), "%Y-%m-%dT%H:%M:%S.000Z", &utc);
  return String(output);
}

bool clockReady() {
  return time(nullptr) >= 1700000000;
}

String readingId(const SensorConfig& config, uint32_t sequence) {
  return String(NODE_ID) + "-" + config.sensorId + "-" + String(sequence);
}

void connectWifi() {
  if (WiFi.status() == WL_CONNECTED) return;
  if (millis() - lastWifiAttempt < WIFI_RETRY_MS) return;
  lastWifiAttempt = millis();
  WiFi.mode(WIFI_STA);
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
}

bool getConfigFromPi() {
  if (WiFi.status() != WL_CONNECTED) return false;
  WiFiClient client;
  HTTPClient http;
  if (!http.begin(client, String(PI_BASE_URL) + "/v1/config")) return false;
  http.addHeader("X-Greenhouse-Node", NODE_ID);
  http.addHeader("X-Greenhouse-Token", NODE_TOKEN);
  const int status = http.GET();
  if (status < 200 || status >= 300) {
    http.end();
    return false;
  }
  JsonDocument document;
  const DeserializationError error = deserializeJson(document, http.getString());
  http.end();
  if (error) return false;
  JsonArray sensors = document["sensors"].as<JsonArray>();
  if (sensors.isNull()) return false;
  std::vector<SensorConfig> next;
  for (JsonObject item : sensors) {
    SensorConfig config;
    config.sensorId = item["sensorId"] | "";
    config.metric = item["metric"] | "";
    config.unit = item["unit"] | "";
    config.intervalSeconds = item["samplingIntervalSeconds"] | DEFAULT_INTERVAL_SECONDS;
    config.configVersion = item["configVersion"] | 1;
    config.enabled = item["enabled"] | true;
    config.scale = item["calibration"]["scale"] | 1.0f;
    config.offset = item["calibration"]["offset"] | 0.0f;
    if (!config.sensorId.isEmpty() && config.metric.length() > 0 && config.intervalSeconds > 0) next.push_back(config);
  }
  sensorConfigs = next;
  lastPublishedAt.assign(sensorConfigs.size(), 0);
  saveConfig();
  return true;
}

bool publishTelemetry() {
  if (WiFi.status() != WL_CONNECTED || sensorConfigs.empty() || !clockReady()) return false;
  if (lastPublishedAt.size() != sensorConfigs.size()) lastPublishedAt.assign(sensorConfigs.size(), 0);
  std::vector<size_t> due;
  for (size_t index = 0; index < sensorConfigs.size(); index += 1) {
    if (!sensorConfigs[index].enabled) continue;
    const uint32_t intervalMs = sensorConfigs[index].intervalSeconds * 1000UL;
    if (millis() - lastPublishedAt[index] >= intervalMs) due.push_back(index);
  }
  if (due.empty()) return false;
  const uint32_t sequence = sequenceNumber + 1;
  const String sampledAt = sampledAtUtc();
  JsonDocument document;
  document["nodeId"] = NODE_ID;
  JsonArray readings = document["readings"].to<JsonArray>();
  for (const size_t index : due) {
    const SensorConfig& config = sensorConfigs[index];
    float rawValue = 0.0f;
    const SensorQuality quality = sensorAdapter.readRaw(config, rawValue);
    const bool sensorOk = quality != SensorQuality::kInvalid && std::isfinite(rawValue);
    const float value = sensorOk ? rawValue * config.scale + config.offset : 0.0f;
    JsonObject reading = readings.add<JsonObject>();
    reading["readingId"] = readingId(config, sequence);
    reading["sensorId"] = config.sensorId;
    reading["metric"] = config.metric;
    reading["value"] = std::isfinite(value) ? value : 0.0f;
    reading["unit"] = config.unit;
    reading["sampledAt"] = sampledAt;
    reading["quality"] = !sensorOk || !std::isfinite(value) ? "invalid" : quality == SensorQuality::kSuspect ? "suspect" : "valid";
    reading["configVersion"] = config.configVersion;
  }
  String encoded;
  serializeJson(document, encoded);

  WiFiClient client;
  HTTPClient http;
  if (!http.begin(client, String(PI_BASE_URL) + "/v1/telemetry")) return false;
  http.addHeader("Content-Type", "application/json");
  http.addHeader("X-Greenhouse-Node", NODE_ID);
  http.addHeader("X-Greenhouse-Token", NODE_TOKEN);
  const int status = http.POST(encoded);
  http.end();
  if (status < 200 || status >= 300) return false;
  sequenceNumber = sequence;
  for (const size_t index : due) lastPublishedAt[index] = millis();
  saveConfig();
  return true;
}

void setup() {
  Serial.begin(115200);
  delay(1000);
  setupWatchdog();
  sensorAdapter.begin();
  loadConfig();
  configTime(0, 0, "pool.ntp.org", "time.nist.gov");
  connectWifi();
}

void loop() {
  feedWatchdog();
  connectWifi();
  if (WiFi.status() == WL_CONNECTED && millis() - lastConfigRefresh >= CONFIG_REFRESH_MS) {
    getConfigFromPi();
    lastConfigRefresh = millis();
  }
  if (WiFi.status() == WL_CONNECTED) {
    publishTelemetry();
  }
  delay(100);
}
