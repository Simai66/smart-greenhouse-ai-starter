"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Search } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
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
  type DemoState,
} from "@/lib/greenhouse-demo-store";
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

  const dashboard = useMemo(() => buildDashboardViewModel(state), [state]);
  const openAlerts = dashboard.openAlerts;
  const searchResults = useMemo(
    () => buildDashboardSearchResults(state, search),
    [search, state],
  );
  const selectedPlant =
    state.plants.find((plant) => plant.id === selectedPlantId) ??
    state.plants[0];

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
        state.alerts.find((alert) => alert.id === result.alertId) ?? null,
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
      state,
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
        devices={state.devices}
        plants={state.plants}
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
        plants={state.plants}
        selectedPlantId={selectedPlantId}
        onSelectPlant={setSelectedPlantId}
        onInspectPlant={(plantId) => { setSelectedPlantId(plantId); navigate("ai"); }}
      />
    ) : activePage === "ai" && selectedPlant ? (
      <AiDetectionView
        plant={selectedPlant}
        reviewed={state.aiReviewedPlantId === selectedPlant.id}
        onSave={() => {
          setState((current) => ({ ...current, aiReviewedPlantId: selectedPlant.id }));
          notify("บันทึกผลตรวจเดโมแล้ว การแจ้งเตือนยังคงเปิดอยู่");
        }}
      />
    ) : activePage === "devices" ? (
      <DevicesView
        devices={state.devices}
        pendingDeviceId={pendingDevice?.device.id ?? null}
        online={online}
        onRequest={(device) => setPendingDevice({ device, nextActive: !device.active })}
      />
    ) : activePage === "analytics" ? (
      <AnalyticsView period={period} onPeriodChange={setPeriod} />
    ) : activePage === "alerts" ? (
      <AlertsView alerts={state.alerts} onOpen={setSelectedAlert} />
    ) : (
      <SettingsView
        settings={state.settings}
        onSave={(settings) => {
          setState((current) => ({ ...current, settings }));
          notify("บันทึกการตั้งค่าเดโมแล้ว");
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
      <AppSidebar activePage={activePage} openAlerts={openAlerts} deviceCount={state.devices.length} online={online} onNavigate={navigate} />
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
        />
        <main id="main-content" tabIndex={-1} className="mx-auto w-full max-w-[90rem] space-y-6 p-4 pb-12 sm:p-6 lg:p-8">
          <PageHeader metadata={pageMetadata[activePage]} refreshing={refreshing} onExport={exportCsv} onRefresh={refresh} />
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
