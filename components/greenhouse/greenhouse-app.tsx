"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Search } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/greenhouse/app-sidebar";
import { AlertDialog } from "@/components/greenhouse/alert-dialog";
import { DeviceCommandDialog, type PendingDevice } from "@/components/greenhouse/device-command-dialog";
import { GlobalSearch } from "@/components/greenhouse/global-search";
import { LiveMessage, type LiveMessageValue } from "@/components/greenhouse/live-message";
import { PageHeader } from "@/components/greenhouse/page-header";
import { SiteHeader } from "@/components/greenhouse/site-header";
import { AppLoading, MemoryOnlyNotice, OfflineNotice, StaleDataNotice } from "@/components/greenhouse/view-state";
import { AiDetectionView } from "@/components/greenhouse/views/ai-detection-view";
import { AlertsView } from "@/components/greenhouse/views/alerts-view";
import { AnalyticsView } from "@/components/greenhouse/views/analytics-view";
import { CommandDeckView } from "@/components/greenhouse/views/command-deck-view";
import { DevicesView } from "@/components/greenhouse/views/devices-view";
import { PlantsView } from "@/components/greenhouse/views/plants-view";
import { SettingsView } from "@/components/greenhouse/views/settings-view";
import {
  buildDashboardSearchResults,
  createDemoCsv,
  executeConfirmedDemoDeviceCommand,
  setDemoAlertResolution,
} from "@/lib/dashboard-interactions";
import {
  demoInitialState,
  greenhouseDemoStore,
  type DemoAlert,
  type DemoGreenhouse,
  type DemoState,
} from "@/lib/greenhouse-demo-store";
import { createResource, deleteZone } from "@/lib/greenhouse-domain";
import {
  buildDashboardViewModel,
  pageMetadata,
  type ChartPeriod,
  type GreenhousePageId,
} from "@/lib/greenhouse-presentation";

export function GreenhouseApp() {
  const [state, setState] = useState<DemoState>(demoInitialState);
  const [ready, setReady] = useState(false);
  const [storageAvailable, setStorageAvailable] = useState(true);
  const [activePage, setActivePage] = useState<GreenhousePageId>("dashboard");
  const [activeGreenhouseId, setActiveGreenhouseId] = useState("GH-01");
  const [period, setPeriod] = useState<ChartPeriod>("วันนี้");
  const [search, setSearch] = useState("");
  const [searchIndex, setSearchIndex] = useState(0);
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false);
  const [lastUpdated, setLastUpdated] = useState("07:42 น.");
  const [refreshing, setRefreshing] = useState(false);
  const [online, setOnline] = useState(true);
  const [dataStale, setDataStale] = useState(false);
  const [message, setMessage] = useState<LiveMessageValue>(null);
  const [pendingDevice, setPendingDevice] = useState<PendingDevice>(null);
  const [commandPending, setCommandPending] = useState(false);
  const [selectedPlantId, setSelectedPlantId] = useState("TOM-003");
  const [selectedAlert, setSelectedAlert] = useState<DemoAlert | null>(null);
  const messageTimer = useRef<number | null>(null);
  const staleTimer = useRef<number | null>(null);

  const notify = useCallback((
    text: string,
    tone: "success" | "info" | "error" = "success",
  ) => {
    setMessage({ message: text, tone });
    if (messageTimer.current) window.clearTimeout(messageTimer.current);
    messageTimer.current = window.setTimeout(() => setMessage(null), 3500);
  }, []);

  useEffect(() => {
    let active = true;
    const syncOnlineState = () => {
      const nextOnline = navigator.onLine;
      setOnline(nextOnline);
      if (!nextOnline) setDataStale(true);
    };
    syncOnlineState();
    window.addEventListener("online", syncOnlineState);
    window.addEventListener("offline", syncOnlineState);
    void greenhouseDemoStore.load().then((result) => {
      if (!active) return;
      setState(result.state);
      setStorageAvailable(result.storageAvailable);
      setDataStale(!navigator.onLine);
      if (staleTimer.current) window.clearTimeout(staleTimer.current);
      if (navigator.onLine) {
        staleTimer.current = window.setTimeout(() => setDataStale(true), 300_000);
      }
      setReady(true);
      if (result.recovered) notify("ข้อมูลเดโมไม่สมบูรณ์ จึงรีเซ็ตข้อมูลตัวอย่างแล้ว", "info");
      if (!result.storageAvailable) notify("บันทึกข้อมูลเดโมไม่ได้ การเปลี่ยนแปลงจะอยู่ในหน่วยความจำ", "error");
    });
    return () => {
      active = false;
      window.removeEventListener("online", syncOnlineState);
      window.removeEventListener("offline", syncOnlineState);
      if (messageTimer.current) window.clearTimeout(messageTimer.current);
      if (staleTimer.current) window.clearTimeout(staleTimer.current);
    };
  }, [notify]);

  useEffect(() => {
    if (!ready) return;
    void greenhouseDemoStore.save(state).then(({ persisted }) => {
      if (!persisted) setStorageAvailable(false);
    });
  }, [ready, state]);

  const activeGreenhouse = useMemo(
    () => state.greenhouses.find((greenhouse) => greenhouse.id === activeGreenhouseId && greenhouse.status === "active") ?? state.greenhouses.find((greenhouse) => greenhouse.status === "active") ?? demoInitialState.greenhouses[0]!,
    [activeGreenhouseId, state.greenhouses],
  );
  const greenhouseState = useMemo(() => ({
    ...state,
    devices: state.devices.filter((device) => (device.greenhouseId ?? "GH-01") === activeGreenhouse.id),
    plants: state.plants.filter((plant) => (plant.greenhouseId ?? "GH-01") === activeGreenhouse.id),
    alerts: state.alerts.filter((alert) => (alert.greenhouseId ?? "GH-01") === activeGreenhouse.id),
    settings: {
      ...state.settings,
      cameras: state.settings.cameras.filter((camera) => (camera.greenhouseId ?? "GH-01") === activeGreenhouse.id),
    },
  }), [activeGreenhouse.id, state]);
  const dashboard = useMemo(() => buildDashboardViewModel(greenhouseState), [greenhouseState]);
  const openAlerts = dashboard.openAlerts;
  const searchResults = useMemo(
    () => buildDashboardSearchResults(greenhouseState, search),
    [greenhouseState, search],
  );
  const selectedPlant =
    greenhouseState.plants.find((plant) => plant.id === selectedPlantId) ??
    greenhouseState.plants[0];

  const changeGreenhouse = (greenhouseId: string) => {
    setActiveGreenhouseId(greenhouseId);
    setSearch("");
    setSelectedPlantId("");
    setSelectedAlert(null);
  };

  const navigate = (page: GreenhousePageId) => {
    setActivePage(page);
    setSearch("");
    window.scrollTo({
      top: 0,
      behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches
        ? "auto"
        : "smooth",
    });
  };

  const chooseSearch = (result: (typeof searchResults)[number]) => {
    if (result.plantId) setSelectedPlantId(result.plantId);
    if (result.alertId) {
      setSelectedAlert(
      greenhouseState.alerts.find((alert) => alert.id === result.alertId) ?? null,
      );
    }
    navigate(result.page);
    setMobileSearchOpen(false);
  };

  const refresh = async () => {
    setRefreshing(true);
    const result = await greenhouseDemoStore.load();
    setState(result.state);
    setStorageAvailable(result.storageAvailable);
    setLastUpdated("เมื่อสักครู่");
    setDataStale(!navigator.onLine);
    if (staleTimer.current) window.clearTimeout(staleTimer.current);
    if (navigator.onLine) {
      staleTimer.current = window.setTimeout(() => setDataStale(true), 300_000);
    }
    setRefreshing(false);
    notify(
      result.recovered
        ? "รีเซ็ตข้อมูลเดโมที่ไม่สมบูรณ์แล้ว"
        : "โหลดข้อมูลเดโมล่าสุดแล้ว",
      "info",
    );
  };

  const exportCsv = () => {
    const sensorRows = [
      ["อุณหภูมิ", "24.8", "°C"],
      ["ความชื้นอากาศ", "68", "%"],
      ["ความชื้นดินโซน A", "46", "%"],
    ] as const;
    const csv = createDemoCsv(
      greenhouseState,
      sensorRows,
      new Date().toLocaleString("th-TH"),
    );
    const url = URL.createObjectURL(
      new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8" }),
    );
    const link = document.createElement("a");
    link.href = url;
    link.download = "smart-greenhouse-demo-report.csv";
    link.click();
    URL.revokeObjectURL(url);
    notify("ดาวน์โหลดรายงาน CSV เดโมแล้ว");
  };

  const confirmDeviceCommand = async () => {
    if (!pendingDevice) return;
    if (!online) {
      notify("ระบบออฟไลน์ จึงยังส่งคำสั่งอุปกรณ์ไม่ได้", "error");
      return;
    }
    setCommandPending(true);
    try {
      const outcome = await executeConfirmedDemoDeviceCommand(
        state,
        pendingDevice.device.id,
        pendingDevice.nextActive,
        greenhouseDemoStore.requestDeviceCommand,
      );
      setState(outcome.state);
      notify(
        pendingDevice.device.name +
          ": " +
          (pendingDevice.nextActive ? "เปิดแล้ว" : "ปิดแล้ว") +
          " (เดโมตอบรับแล้ว)",
      );
      setPendingDevice(null);
    } catch (error) {
      notify(
        error instanceof Error ? error.message : "อุปกรณ์ไม่ตอบรับคำสั่ง",
        "error",
      );
    } finally {
      setCommandPending(false);
    }
  };

  const updateAlert = (id: string, resolved: boolean) => {
    setState((current) => setDemoAlertResolution(current, id, resolved));
    setSelectedAlert((alert) =>
      alert?.id === id ? { ...alert, resolved } : alert,
    );
    notify(
      resolved
        ? "บันทึกการดำเนินการเดโมแล้ว"
        : "เปิดการแจ้งเตือนเดโมอีกครั้งแล้ว",
    );
  };

  const page = ready ? (
    activePage === "dashboard" ? (
      <CommandDeckView
        viewModel={dashboard}
        devices={greenhouseState.devices}
        plants={greenhouseState.plants}
        period={period}
        lastUpdated={lastUpdated}
        pendingDeviceId={pendingDevice?.device.id ?? null}
        online={online}
        onPeriodChange={setPeriod}
        onNavigate={navigate}
        onDeviceRequest={(device) => setPendingDevice({ device, nextActive: !device.active })}
        onInspectPlant={(plantId) => { setSelectedPlantId(plantId); navigate("ai"); }}
      />
    ) : activePage === "plants" ? (
      <PlantsView
        plants={greenhouseState.plants}
        cropBatches={state.cropBatches.filter((batch) => batch.greenhouseId === activeGreenhouse.id)}
        selectedPlantId={selectedPlantId}
        onSelectPlant={setSelectedPlantId}
        onInspectPlant={(plantId) => { setSelectedPlantId(plantId); navigate("ai"); }}
      />
    ) : activePage === "ai" ? (
      selectedPlant ? (
      <AiDetectionView
        plant={selectedPlant}
        cameras={greenhouseState.settings.cameras}
        reviewedCameraIds={state.aiReviewedEvidence?.[selectedPlant.id] ?? []}
        onSave={(cameraId) => {
          setState((current) => ({
            ...current,
            aiReviewedPlantId: selectedPlant.id,
            aiReviewedEvidence: {
              ...current.aiReviewedEvidence,
              [selectedPlant.id]: Array.from(new Set([
                ...(current.aiReviewedEvidence?.[selectedPlant.id] ?? []),
                cameraId,
              ])),
            },
          }));
          notify("บันทึกผลตรวจเดโมแล้ว การแจ้งเตือนยังคงเปิดอยู่");
        }}
      />
      ) : <Card className="shadow-none"><CardContent className="flex min-h-56 flex-col items-center justify-center gap-3 p-6 text-center"><p className="font-semibold">ยังไม่มีพืชสำหรับตรวจด้วย AI</p><p className="max-w-md text-sm text-muted-foreground">เพิ่มรอบปลูกและข้อมูลพืชของ {activeGreenhouse.name} ก่อน แล้วจึงเริ่มตรวจหลักฐานจากกล้องได้</p><Button variant="outline" onClick={() => navigate("settings")}>ไปที่ตั้งค่า</Button></CardContent></Card>
    ) : activePage === "devices" ? (
      <DevicesView
        devices={greenhouseState.devices}
        pendingDeviceId={pendingDevice?.device.id ?? null}
        online={online}
        onRequest={(device) => setPendingDevice({ device, nextActive: !device.active })}
      />
    ) : activePage === "analytics" ? (
      <AnalyticsView period={period} onPeriodChange={setPeriod} />
    ) : activePage === "alerts" ? (
      <AlertsView alerts={greenhouseState.alerts} onOpen={setSelectedAlert} />
    ) : (
      <SettingsView
        settings={state.settings}
        greenhouses={state.greenhouses}
        cropBatches={state.cropBatches}
        activeGreenhouseId={activeGreenhouse.id}
        devices={state.devices}
        sensors={state.sensors}
        onSave={(settings) => {
          setState((current) => ({ ...current, settings }));
          notify("บันทึกการตั้งค่าเดโมแล้ว");
        }}
        onSaveGreenhouse={(id, draft) => {
          setState((current) => {
            if (id) {
              return {
                ...current,
                greenhouses: current.greenhouses.map((greenhouse) =>
                  greenhouse.id === id ? { ...greenhouse, ...draft } : greenhouse,
                ),
              };
            }
            const greenhouse: DemoGreenhouse = {
              id: `GH-${crypto.randomUUID().slice(0, 8).toUpperCase()}`,
              ...draft,
              status: "active",
              zones: [],
            };
            return { ...current, greenhouses: [...current.greenhouses, greenhouse] };
          });
          notify(id ? "แก้ไขข้อมูลโรงเรือนแล้ว" : "เพิ่มโรงเรือนแล้ว");
        }}
        onArchiveGreenhouse={(id) => {
          setState((current) => ({
            ...current,
            greenhouses: current.greenhouses.map((greenhouse) =>
              greenhouse.id === id ? { ...greenhouse, status: "archived" } : greenhouse,
            ),
          }));
          notify("เก็บโรงเรือนถาวรแล้ว", "info");
        }}
        onRestoreGreenhouse={(id) => {
          setState((current) => ({
            ...current,
            greenhouses: current.greenhouses.map((greenhouse) =>
              greenhouse.id === id ? { ...greenhouse, status: "active" } : greenhouse,
            ),
          }));
          notify("เรียกคืนโรงเรือนแล้ว");
        }}
        onAddZone={(greenhouseId, name) => {
          setState((current) => ({
            ...current,
            greenhouses: current.greenhouses.map((greenhouse) =>
              greenhouse.id === greenhouseId
                ? {
                    ...greenhouse,
                    zones: [...greenhouse.zones, {
                      id: `ZONE-${crypto.randomUUID().slice(0, 8).toUpperCase()}`,
                      name,
                      status: "active",
                    }],
                  }
                : greenhouse,
            ),
          }));
          notify(`เพิ่ม ${name} แล้ว`);
        }}
        onArchiveZone={(greenhouseId, zoneId) => {
          try {
            const nextState = deleteZone(state, { greenhouseId, zoneId });
            setState(nextState);
            notify("เก็บโซนถาวรแล้ว", "info");
          } catch (error) {
            notify(
              error instanceof Error ? error.message : "ไม่สามารถเก็บโซนได้",
              "error",
            );
          }
        }}
        onRestoreZone={(greenhouseId, zoneId) => {
          setState((current) => ({
            ...current,
            greenhouses: current.greenhouses.map((greenhouse) =>
              greenhouse.id === greenhouseId
                ? {
                    ...greenhouse,
                    zones: greenhouse.zones.map((zone) =>
                      zone.id === zoneId ? { ...zone, status: "active" } : zone,
                    ),
                  }
                : greenhouse,
            ),
          }));
          notify("เรียกคืนโซนแล้ว");
        }}
        onSaveBatch={(id, draft) => {
          setState((current) => {
            const greenhouse = current.greenhouses.find((item) => item.id === draft.greenhouseId);
            const zone = greenhouse?.zones.find((item) => item.id === draft.zoneId);
            const zoneName = zone?.name ?? "ไม่ระบุโซน";
            const makePlants = (batchId: string, from: number, count: number) => Array.from({ length: count }, (_, index) => ({
              id: `${batchId}-P-${String(from + index + 1).padStart(2, "0")}`,
              name: `${draft.cropName} ${String(from + index + 1).padStart(2, "0")}`,
              zone: zoneName,
              age: "เริ่มปลูก",
              moisture: 50,
              health: "ปกติ" as const,
              confidence: 0,
              greenhouseId: draft.greenhouseId,
              batchId,
            }));
            if (!id) {
              const batchId = `BATCH-${crypto.randomUUID().slice(0, 8).toUpperCase()}`;
              return {
                ...current,
                cropBatches: [...current.cropBatches, { id: batchId, ...draft, status: "active" }],
                plants: [...current.plants, ...makePlants(batchId, 0, draft.plantCount)],
              };
            }
            const batchPlants = current.plants.filter((plant) => plant.batchId === id);
            const retainedPlants = batchPlants.slice(0, draft.plantCount).map((plant, index) => ({
              ...plant,
              name: `${draft.cropName} ${String(index + 1).padStart(2, "0")}`,
              zone: zoneName,
              greenhouseId: draft.greenhouseId,
            }));
            return {
              ...current,
              cropBatches: current.cropBatches.map((batch) => batch.id === id ? { ...batch, ...draft } : batch),
              plants: [...current.plants.filter((plant) => plant.batchId !== id), ...retainedPlants, ...makePlants(id, retainedPlants.length, Math.max(0, draft.plantCount - retainedPlants.length))],
            };
          });
          notify(id ? "อัปเดตรอบปลูกและรายชื่อต้นแล้ว" : `เพิ่ม ${draft.cropName} ${draft.plantCount} ต้นแล้ว`);
        }}
        onArchiveBatch={(id) => {
          setState((current) => ({ ...current, cropBatches: current.cropBatches.map((batch) => batch.id === id ? { ...batch, status: "archived" } : batch) }));
          notify("เก็บรอบปลูกถาวรแล้ว", "info");
        }}
        onRestoreBatch={(id) => {
          setState((current) => ({ ...current, cropBatches: current.cropBatches.map((batch) => batch.id === id ? { ...batch, status: "active" } : batch) }));
          notify("เรียกคืนรอบปลูกแล้ว");
        }}
        onCreateResource={(value) => {
          const zone = activeGreenhouse.zones.find((item) => item.id === value.zoneId && item.status === "active");
          if (!zone) { notify("กรุณาเลือกโซนที่กำลังใช้งานก่อนเพิ่มทรัพยากร", "error"); return; }
          setState((current) => {
            if (value.kind === "device") {
              return createResource(current, {
                kind: "device",
                name: value.name,
                greenhouseId: activeGreenhouse.id,
                zoneId: value.zoneId,
                deviceKind: "pump",
                detail: `ผูกกับ ${zone.name}`,
                active: value.enabled,
              });
            }
            if (value.kind === "sensor") {
              return createResource(current, {
                kind: "sensor",
                name: value.name,
                greenhouseId: activeGreenhouse.id,
                zoneId: value.zoneId,
                metric: "soilMoisture",
                status: value.enabled ? "online" : "offline",
              });
            }
            return createResource(current, {
              kind: "camera",
              name: value.name,
              greenhouseId: activeGreenhouse.id,
              zoneId: value.zoneId,
              source: "IP camera",
              status: value.enabled ? "online" : "offline",
              captureInterval: "15 นาที",
              enabled: value.enabled,
            });
          });
          notify(value.kind === "device" ? "เพิ่มอุปกรณ์ใหม่แล้ว" : value.kind === "sensor" ? "เพิ่มเซ็นเซอร์ใหม่แล้ว" : "เพิ่มกล้องใหม่แล้ว");
        }}
        onMoveResource={(kind, id, zoneId) => {
          const zoneName = activeGreenhouse.zones.find((zone) => zone.id === zoneId)?.name ?? "ไม่ระบุโซน";
          setState((current) => {
            if (kind === "device") return { ...current, devices: current.devices.map((item) => item.id === id && item.greenhouseId === activeGreenhouse.id ? { ...item, zoneId, detail: `ผูกกับ ${zoneName}` } : item) };
            if (kind === "sensor") return { ...current, sensors: current.sensors.map((item) => item.id === id && item.greenhouseId === activeGreenhouse.id ? { ...item, zoneId } : item) };
            return { ...current, settings: { ...current.settings, cameras: current.settings.cameras.map((item) => item.id === id && item.greenhouseId === activeGreenhouse.id ? { ...item, zoneId, zone: zoneName } : item) } };
          });
          notify(`ย้ายทรัพยากรไป${zoneName}แล้ว`);
        }}
        onRenameResource={(kind, id, name) => {
          setState((current) => {
            if (kind === "device") return { ...current, devices: current.devices.map((item) => item.id === id && item.greenhouseId === activeGreenhouse.id ? { ...item, name } : item) };
            if (kind === "sensor") return { ...current, sensors: current.sensors.map((item) => item.id === id && item.greenhouseId === activeGreenhouse.id ? { ...item, name } : item) };
            return { ...current, settings: { ...current.settings, cameras: current.settings.cameras.map((item) => item.id === id && item.greenhouseId === activeGreenhouse.id ? { ...item, name } : item) } };
          });
          notify("แก้ไขชื่อทรัพยากรแล้ว");
        }}
        onUpdateResourceStatus={(kind, id, { enabled, status }) => {
          setState((current) => {
            if (kind === "device") return {
              ...current,
              devices: current.devices.map((item) => item.id === id && item.greenhouseId === activeGreenhouse.id ? { ...item, active: enabled } : item),
            };
            if (kind === "sensor") return {
              ...current,
              sensors: current.sensors.map((item) => item.id === id && item.greenhouseId === activeGreenhouse.id ? { ...item, status: status === "online" ? "online" : "offline" } : item),
            };
            return {
              ...current,
              settings: {
                ...current.settings,
                cameras: current.settings.cameras.map((item) => item.id === id && item.greenhouseId === activeGreenhouse.id
                  ? { ...item, enabled, status: status === "online" ? "online" : "offline" }
                  : item),
              },
            };
          });
          notify("อัปเดตสถานะทรัพยากรแล้ว");
        }}
        onDeleteResource={(kind, id) => {
          setState((current) => {
            if (kind === "device") return { ...current, devices: current.devices.filter((item) => item.id !== id || item.greenhouseId !== activeGreenhouse.id) };
            if (kind === "sensor") return { ...current, sensors: current.sensors.filter((item) => item.id !== id || item.greenhouseId !== activeGreenhouse.id) };
            return { ...current, settings: { ...current.settings, cameras: current.settings.cameras.filter((item) => item.id !== id || item.greenhouseId !== activeGreenhouse.id) } };
          });
          if (pendingDevice?.device.id === id) setPendingDevice(null);
          notify("ลบทรัพยากรแล้ว", "info");
        }}
      />
    )
  ) : (
    <AppLoading />
  );

  return (
    <SidebarProvider defaultOpen>
      <a className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100] focus:rounded-md focus:bg-primary focus:px-4 focus:py-3 focus:text-primary-foreground" href="#main-content">
        ข้ามไปยังเนื้อหาหลัก
      </a>
      <AppSidebar activePage={activePage} openAlerts={openAlerts} deviceCount={greenhouseState.devices.length} online={online} onNavigate={navigate} greenhouse={activeGreenhouse} />
      <SidebarInset>
        <SiteHeader
          pageTitle={pageMetadata[activePage].title}
          openAlerts={openAlerts}
          search={search}
          searchIndex={searchIndex}
          searchResults={searchResults}
          onSearchChange={setSearch}
          onSearchIndexChange={setSearchIndex}
          onChooseSearch={chooseSearch}
          onOpenMobileSearch={() => setMobileSearchOpen(true)}
          onOpenAlerts={() => navigate("alerts")}
          onNotify={(text) => notify(text, "info")}
          greenhouses={state.greenhouses}
          activeGreenhouseId={activeGreenhouse.id}
          onGreenhouseChange={changeGreenhouse}
        />
        <main id="main-content" tabIndex={-1} className="mx-auto w-full max-w-[86rem] space-y-7 p-4 pb-12 sm:p-6 lg:px-8 lg:py-7">
          <PageHeader metadata={pageMetadata[activePage]} greenhouse={activeGreenhouse} refreshing={refreshing} onExport={exportCsv} onRefresh={refresh} />
          {!storageAvailable ? <MemoryOnlyNotice /> : null}
          {!online ? <OfflineNotice lastUpdated={lastUpdated} /> : dataStale ? <StaleDataNotice lastUpdated={lastUpdated} onRefresh={refresh} /> : null}
          {page}
        </main>
      </SidebarInset>

      <Dialog open={mobileSearchOpen} onOpenChange={setMobileSearchOpen}>
        <DialogContent className="top-4 translate-y-0 sm:top-1/2 sm:-translate-y-1/2">
          <DialogHeader><DialogTitle className="flex items-center gap-2"><Search aria-hidden="true" />ค้นหาทั่วทั้งโรงเรือน</DialogTitle><DialogDescription>ค้นหาพืช อุปกรณ์ หรือเหตุการณ์</DialogDescription></DialogHeader>
          <GlobalSearch idPrefix="mobile-search" value={search} activeIndex={searchIndex} results={searchResults} autoFocus onValueChange={setSearch} onActiveIndexChange={setSearchIndex} onChoose={chooseSearch} />
        </DialogContent>
      </Dialog>
      <DeviceCommandDialog pending={pendingDevice} commandPending={commandPending} online={online} onClose={() => setPendingDevice(null)} onConfirm={confirmDeviceCommand} />
      <AlertDialog alert={selectedAlert} onClose={() => setSelectedAlert(null)} onToggleResolution={updateAlert} />
      <LiveMessage value={message} onClose={() => setMessage(null)} />
    </SidebarProvider>
  );
}
