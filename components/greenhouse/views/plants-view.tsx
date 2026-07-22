"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import { ArrowRight, Search } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useIsMobile } from "@/hooks/use-mobile";
import { filterPlants, type PlantFilter } from "@/lib/greenhouse-presentation";
import type { DemoCropBatch, DemoPlant } from "@/lib/greenhouse-demo-store";

export type PlantsViewProps = {
  plants: DemoPlant[];
  cropBatches: DemoCropBatch[];
  selectedPlantId: string;
  onSelectPlant: (plantId: string) => void;
  onInspectPlant: (plantId: string) => void;
};

function PlantDetail({
  plant,
  onInspect,
}: {
  plant: DemoPlant;
  onInspect: () => void;
}) {
  return (
    <div className="space-y-5">
      <div className="relative aspect-[16/10] overflow-hidden rounded-lg bg-muted">
        <Image
          src={plant.health === "ปกติ"
            ? "/images/tomato-healthy.png"
            : "/images/tomato-leaf-spot.png"}
          alt={"ภาพล่าสุดของ" + plant.name}
          fill
          unoptimized
          className="object-cover"
        />
      </div>
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="font-semibold">{plant.name}</h3>
          <p className="text-sm text-muted-foreground">
            {plant.id} · {plant.zone} · อายุ {plant.age}
          </p>
        </div>
        <Badge variant={plant.health === "ปกติ" ? "secondary" : "destructive"}>
          {plant.health}
        </Badge>
      </div>
      <dl className="grid grid-cols-2 gap-3 border-y border-border/70 py-4 text-sm">
        <div><dt className="text-muted-foreground">ความชื้นดิน</dt><dd className="font-medium tabular-nums">{plant.moisture}%</dd></div>
        <div><dt className="text-muted-foreground">AI confidence</dt><dd className="font-medium tabular-nums">{plant.confidence}%</dd></div>
      </dl>
      <Button className="w-full" onClick={onInspect}>
        เปิดหลักฐาน AI <ArrowRight aria-hidden="true" />
      </Button>
    </div>
  );
}

export function PlantsView({
  plants,
  cropBatches,
  selectedPlantId,
  onSelectPlant,
  onInspectPlant,
}: PlantsViewProps) {
  const isMobile = useIsMobile();
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<PlantFilter>("all");
  const [viewMode, setViewMode] = useState<"zone" | "plant">("zone");
  const [sheetOpen, setSheetOpen] = useState(false);
  const visible = useMemo(
    () => filterPlants(plants, query, filter),
    [filter, plants, query],
  );
  const selected = plants.find((plant) => plant.id === selectedPlantId) ?? plants[0];

  const selectPlant = (plantId: string) => {
    onSelectPlant(plantId);
    if (isMobile) setSheetOpen(true);
  };

  return (
    <div className="grid gap-5 lg:grid-cols-[minmax(0,1.3fr)_minmax(20rem,.7fr)]">
      <Card className="shadow-none">
        <CardHeader className="gap-4 border-b border-border/70 pb-5">
          <Tabs value={viewMode} onValueChange={(value) => setViewMode(value as "zone" | "plant")}>
            <TabsList aria-label="เลือกรูปแบบการดูข้อมูลพืช"><TabsTrigger value="zone">ตามโซน</TabsTrigger><TabsTrigger value="plant">รายต้น</TabsTrigger></TabsList>
          </Tabs>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
            <Input
              aria-label="ค้นหาต้นพืช"
              className="min-h-11 pl-9"
              placeholder="ค้นหารหัส ชื่อ หรือโซน"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />
          </div>
          {viewMode === "plant" ? <Tabs value={filter} onValueChange={(value) => setFilter(value as PlantFilter)}>
            <TabsList aria-label="กรองสุขภาพพืช">
              <TabsTrigger value="all">ทั้งหมด</TabsTrigger>
              <TabsTrigger value="ปกติ">แข็งแรง</TabsTrigger>
              <TabsTrigger value="ควรตรวจสอบ">ต้องตรวจสอบ</TabsTrigger>
            </TabsList>
          </Tabs> : null}
        </CardHeader>
        {viewMode === "zone" ? <CardContent className="space-y-3 p-4">{cropBatches.filter((batch) => batch.status === "active").map((batch) => {
          const batchPlants = plants.filter((plant) => plant.batchId === batch.id);
          const firstPlant = batchPlants[0];
          const zone = firstPlant?.zone ?? "โซนที่เลือก";
          return <button key={batch.id} type="button" className="flex w-full items-center justify-between gap-4 rounded-xl border border-border/70 p-4 text-left transition-colors hover:border-primary/30 hover:bg-muted/40" onClick={() => firstPlant && selectPlant(firstPlant.id)}><span><strong className="block">{zone} · {batch.cropName}</strong><span className="mt-1 block text-sm text-muted-foreground">{batch.cultivar ? `${batch.cultivar} · ` : ""}{batch.plantCount} ต้น · กดเพื่อดูรายต้น</span></span><Badge variant="secondary" className="text-primary">{batchPlants.filter((plant) => plant.health === "ปกติ").length}/{batch.plantCount} ปกติ</Badge></button>;
        })}{!cropBatches.filter((batch) => batch.status === "active").length ? <p className="py-8 text-center text-sm text-muted-foreground">ยังไม่มีรอบปลูกในโรงเรือนนี้</p> : null}</CardContent> : <CardContent className="overflow-x-auto p-0">
          <Table>
            <TableHeader><TableRow><TableHead>ต้นพืช</TableHead><TableHead>โซน</TableHead><TableHead>ความชื้น</TableHead><TableHead>ผลล่าสุด</TableHead></TableRow></TableHeader>
            <TableBody>
              {visible.map((plant) => (
                <TableRow
                  key={plant.id}
                  data-state={selected?.id === plant.id ? "selected" : undefined}
                >
                  <TableCell><Button variant="ghost" className="h-auto min-h-11 justify-start px-2 text-left" aria-current={selected?.id === plant.id ? "true" : undefined} onClick={() => selectPlant(plant.id)}><span><strong className="block">{plant.name}</strong><span className="block text-xs text-muted-foreground">{plant.id}</span></span></Button></TableCell>
                  <TableCell>{plant.zone}</TableCell>
                  <TableCell className="tabular-nums">{plant.moisture}%</TableCell>
                  <TableCell>{plant.health}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          {!visible.length ? <p className="p-8 text-center text-sm text-muted-foreground">ไม่พบต้นพืชตามตัวกรองนี้</p> : null}
        </CardContent>}
      </Card>
      {selected ? <Card className="hidden lg:block shadow-none"><CardContent className="p-5"><PlantDetail plant={selected} onInspect={() => onInspectPlant(selected.id)} /></CardContent></Card> : null}
      <Sheet open={Boolean(isMobile && sheetOpen && selected)} onOpenChange={setSheetOpen}>
        <SheetContent side="right" className="w-full overflow-y-auto sm:max-w-lg">
          <SheetHeader><SheetTitle>รายละเอียดต้นพืช</SheetTitle></SheetHeader>
          {selected ? <div className="p-4"><PlantDetail plant={selected} onInspect={() => onInspectPlant(selected.id)} /></div> : null}
        </SheetContent>
      </Sheet>
    </div>
  );
}
