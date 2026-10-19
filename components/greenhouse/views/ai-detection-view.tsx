/* eslint-disable @next/next/no-img-element */
"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Camera, CheckCircle2, ImageOff, RefreshCw, Radio, Upload } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { inspectionImagesApi, type InspectionImage } from "@/lib/inspection-images-api";
import type { DemoCamera, DemoPlant } from "@/lib/greenhouse-demo-store";

export type AiDetectionViewProps = {
  greenhouseId: string;
  plant: DemoPlant;
  cameras: DemoCamera[];
  reviewedCameraIds: string[];
  onSave: (cameraId: string) => void;
};

function displayTime(value: string | null): string {
  if (!value) return "ยังไม่มีเวลาที่บันทึก";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "เวลาภาพไม่ถูกต้อง" : date.toLocaleString("th-TH");
}

export function AiDetectionView({ greenhouseId, plant, cameras, reviewedCameraIds, onSave }: AiDetectionViewProps) {
  const initialCameraId = useMemo(() => cameras.find((camera) => camera.zone === plant.zone && camera.enabled)?.id ?? cameras.find((camera) => camera.enabled)?.id ?? cameras[0]?.id ?? "", [cameras, plant.zone]);
  const [selectedCameraId, setSelectedCameraId] = useState(initialCameraId);
  const [images, setImages] = useState<InspectionImage[]>([]);
  const [selectedImageId, setSelectedImageId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [cameraOpen, setCameraOpen] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const selectedCamera = cameras.find((camera) => camera.id === selectedCameraId) ?? cameras.find((camera) => camera.id === initialCameraId) ?? cameras[0];
  const selectedImage = images.find((image) => image.imageId === selectedImageId) ?? images[0] ?? null;
  const reviewed = Boolean(selectedCamera && reviewedCameraIds.includes(selectedCamera.id));

  const refreshImages = useCallback(async () => {
    if (!greenhouseId || !selectedCamera) return;
    setLoading(true);
    try {
      const result = await inspectionImagesApi.list(greenhouseId, selectedCamera.id);
      setImages(result);
      setSelectedImageId((current) => result.some((image) => image.imageId === current) ? current : result[0]?.imageId ?? null);
      setError("");
    } catch (caught) {
      setImages([]);
      setSelectedImageId(null);
      setError(caught instanceof Error ? caught.message : "ไม่สามารถโหลดภาพได้");
    } finally {
      setLoading(false);
    }
  }, [greenhouseId, selectedCamera]);

  useEffect(() => {
    const timer = window.setTimeout(() => void refreshImages(), 0);
    return () => window.clearTimeout(timer);
  }, [refreshImages]);

  const handleFile = async (file: File | undefined) => {
    if (!file || !selectedCamera) return;
    setUploading(true);
    setError("");
    try {
      const uploaded = await inspectionImagesApi.upload(file, { greenhouseId, cameraId: selectedCamera.id, plantId: plant.id, capturedAt: new Date().toISOString() });
      setImages((current) => [uploaded, ...current.filter((image) => image.imageId !== uploaded.imageId)]);
      setSelectedImageId(uploaded.imageId);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "อัปโหลดภาพไม่สำเร็จ");
    } finally {
      setUploading(false);
    }
  };

  const stopCamera = () => {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
    setCameraOpen(false);
  };

  const openCamera = async () => {
    if (!navigator.mediaDevices?.getUserMedia) {
      setError("เบราว์เซอร์นี้ไม่รองรับกล้อง หรือหน้าเว็บไม่ได้เปิดผ่าน HTTPS/localhost");
      return;
    }
    try {
      setError("");
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
      streamRef.current?.getTracks().forEach((track) => track.stop());
      streamRef.current = stream;
      setCameraOpen(true);
    } catch (caught) {
      setError(caught instanceof DOMException && caught.name === "NotAllowedError" ? "ไม่ได้รับสิทธิ์ใช้กล้อง เปิดสิทธิ์ Camera ให้เบราว์เซอร์แล้วลองใหม่" : "เปิดกล้องไม่สำเร็จ");
    }
  };

  useEffect(() => {
    if (!cameraOpen || !videoRef.current || !streamRef.current) return;
    videoRef.current.srcObject = streamRef.current;
    void videoRef.current.play();
  }, [cameraOpen]);

  useEffect(() => () => {
    streamRef.current?.getTracks().forEach((track) => track.stop());
  }, []);

  const captureCameraImage = async () => {
    const video = videoRef.current;
    if (!video || video.readyState < HTMLMediaElement.HAVE_CURRENT_DATA || !video.videoWidth) {
      setError("กล้องยังไม่พร้อม รอสักครู่แล้วลองถ่ายใหม่");
      return;
    }
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext("2d")?.drawImage(video, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.9));
    if (!blob) {
      setError("สร้างไฟล์ภาพจากกล้องไม่สำเร็จ");
      return;
    }
    stopCamera();
    await handleFile(new File([blob], `mac-camera-${Date.now()}.jpg`, { type: "image/jpeg" }));
  };

  if (!selectedCamera) return <Card><CardContent className="py-10 text-center text-muted-foreground">ยังไม่มีกล้องในโรงเรือนนี้ กรุณาเพิ่มและเปิดใช้งานกล้องจากหน้าการตั้งค่า</CardContent></Card>;
  const unavailable = !selectedCamera.enabled || selectedCamera.status === "offline";

  return <div className="space-y-6">
    <Card className="shadow-none"><CardHeader className="border-b border-border/70 pb-5"><div className="flex flex-wrap items-start justify-between gap-3"><div><p className="page-kicker">หลักฐานและโมเดล</p><h2 className="mt-1 font-semibold">แหล่งภาพสำหรับ AI</h2><p className="mt-1 text-sm text-muted-foreground">เลือกกล้อง ดูภาพจริง และตรวจผลหลายรายการต่อภาพ</p></div><Badge variant={images.length ? "secondary" : "outline"}>{images.length ? `${images.length} ภาพ` : "รอข้อมูลภาพ"}</Badge></div></CardHeader><CardContent className="pt-1"><div className="grid gap-2 md:grid-cols-3" role="radiogroup" aria-label="เลือกกล้อง"><span className="sr-only">เลือกกล้อง</span>{cameras.map((camera) => { const selected = camera.id === selectedCamera.id; const usable = camera.enabled && camera.status === "online"; return <button type="button" key={camera.id} role="radio" aria-checked={selected} onClick={() => setSelectedCameraId(camera.id)} className={`min-h-20 rounded-xl border p-3 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${selected ? "border-primary bg-primary/[0.06]" : "border-transparent bg-muted/45 hover:border-border hover:bg-muted/70"}`}><span className="flex items-center justify-between gap-2"><span className="grid size-8 place-items-center rounded-lg bg-card text-muted-foreground"><Camera className="size-4" aria-hidden="true" /></span><Badge variant={usable ? "secondary" : "outline"} className={usable ? "text-primary" : "text-muted-foreground"}>{usable ? "ออนไลน์" : camera.enabled ? "ออฟไลน์" : "ปิดใช้งาน"}</Badge></span><strong className="mt-2 block text-sm">{camera.name}</strong><span className="mt-1 block text-xs text-muted-foreground">{camera.id} · {camera.zone}</span></button>; })}</div><p className="mt-4 flex gap-2 border-t border-border/70 pt-4 text-sm text-muted-foreground"><Radio className="mt-0.5 size-4 shrink-0" aria-hidden="true" />อัปโหลดจาก Dashboard ได้แม้กล้องออฟไลน์; Pi จะใช้ HMAC และคิวออฟไลน์แยกกัน</p></CardContent></Card>
    <div className="grid gap-5 xl:grid-cols-[minmax(0,1.25fr)_minmax(22rem,.75fr)]"><Card className="overflow-hidden shadow-none"><CardHeader className="flex-row items-start justify-between gap-3"><div><p className="page-kicker">หลักฐานล่าสุด</p><h2 className="mt-1 font-semibold">ภาพจาก {selectedCamera.name}</h2><p className="mt-1 text-sm text-muted-foreground">{selectedCamera.zone}</p></div><div className="flex items-center gap-2"><Badge variant="outline">{selectedCamera.source}</Badge><Button variant="ghost" size="icon" aria-label="โหลดภาพใหม่" onClick={() => void refreshImages()} disabled={loading}><RefreshCw className={`size-4 ${loading ? "animate-spin" : ""}`} aria-hidden="true" /></Button></div></CardHeader><CardContent className="p-0"><div className="relative grid aspect-[16/10] place-items-center bg-muted p-4 text-center">{selectedImage?.publicUrl ? <img src={selectedImage.publicUrl} alt={`หลักฐานภาพจาก ${selectedCamera.name}`} className="size-full object-contain" /> : <div><ImageOff className="mx-auto size-9 text-muted-foreground" aria-hidden="true" /><strong className="mt-3 block">ยังไม่มีภาพที่บันทึก</strong><p className="mt-1 text-sm text-muted-foreground">{selectedImage?.status === "expired" ? "ไฟล์หมดอายุแล้ว แต่ผล AI และ metadata ยังเก็บอยู่" : unavailable ? "กล้องออฟไลน์; อัปโหลดไฟล์ทดสอบจาก Dashboard ได้" : "รอภาพจริงจากกล้องนี้ก่อน จึงจะแสดงหลักฐานและผลวิเคราะห์"}</p></div>}</div><div className="grid gap-1 border-t p-4 text-sm sm:grid-cols-2"><span><strong>{selectedCamera.id}</strong><small className="block text-muted-foreground">{selectedCamera.captureInterval} · {selectedCamera.status === "online" ? "พร้อมรับภาพ" : "ไม่พร้อมวิเคราะห์"}</small></span><span><strong>{displayTime(selectedImage?.capturedAt ?? null)}</strong><small className="block text-muted-foreground">{selectedImage ? `${selectedImage.detectionCount} ผลตรวจ · ${selectedImage.status}` : "ไม่มีหลักฐานภาพสำหรับการแสดงผล"}</small></span></div>{images.length ? <div className="flex gap-2 overflow-x-auto border-t p-3">{images.map((image) => <button type="button" key={image.imageId} aria-label={`เลือกภาพ ${displayTime(image.capturedAt)}`} aria-pressed={image.imageId === selectedImage?.imageId} onClick={() => setSelectedImageId(image.imageId)} className={`size-16 shrink-0 overflow-hidden rounded-lg border-2 bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${image.imageId === selectedImage?.imageId ? "border-primary" : "border-transparent"}`}>{image.publicUrl ? <img src={image.publicUrl} alt="" className="size-full object-cover" /> : <ImageOff className="mx-auto mt-5 size-5 text-muted-foreground" aria-hidden="true" />}</button>)}</div> : null}</CardContent></Card>
      <Card><CardHeader className="flex-row items-start justify-between gap-3"><div><h2 className="font-semibold">อัปโหลดและผลตรวจ</h2><p className="text-sm text-muted-foreground">ไฟล์ JPEG, PNG, WebP ไม่เกิน 10 MiB</p></div><Badge variant="outline">{selectedImage?.detectionCount ?? 0} ผลตรวจ</Badge></CardHeader><CardContent className="space-y-4"><div className="grid gap-2 sm:grid-cols-2"><label className={`flex min-h-11 cursor-pointer items-center justify-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 ${uploading || cameraOpen ? "pointer-events-none opacity-60" : ""}`}><Upload className="size-4" aria-hidden="true" />{uploading ? "กำลังอัปโหลด..." : "เลือกไฟล์ภาพ"}<input className="sr-only" type="file" accept="image/jpeg,image/png,image/webp" disabled={uploading || cameraOpen} onChange={(event) => { void handleFile(event.target.files?.[0]); event.currentTarget.value = ""; }} /></label><Button type="button" variant="outline" className="min-h-11" onClick={() => void openCamera()} disabled={uploading || cameraOpen}><Camera className="size-4" aria-hidden="true" />เปิดกล้อง Mac</Button></div>{cameraOpen ? <div className="space-y-3 rounded-lg border bg-muted/30 p-3"><video ref={videoRef} autoPlay muted playsInline className="aspect-video w-full rounded-md bg-black object-cover" aria-label="ภาพตัวอย่างจากกล้อง Mac" /><div className="grid gap-2 sm:grid-cols-2"><Button type="button" onClick={() => void captureCameraImage()} disabled={uploading}>ถ่ายภาพและอัปโหลด</Button><Button type="button" variant="ghost" onClick={stopCamera}>ปิดกล้อง</Button></div><p className="text-xs text-muted-foreground">ต้องอนุญาต Camera ให้เบราว์เซอร์ และเปิดเว็บผ่าน HTTPS หรือ localhost</p></div> : null}{error ? <p role="alert" className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">{error}</p> : null}<div className="rounded-lg bg-muted p-4 text-sm text-muted-foreground">{selectedImage ? "ภาพนี้เก็บ metadata และผล AI ต่อได้ แม้ไฟล์จะหมดอายุหลัง 15 วัน" : "เมื่อกล้องบันทึกภาพจริง ระบบจะแสดงความมั่นใจ หลักฐาน และขั้นตอนถัดไปของภาพนี้"}</div>{selectedImage?.detections.length ? <ul className="space-y-2" aria-label="ผลตรวจ AI">{selectedImage.detections.map((detection) => <li key={detection.id} className="rounded-lg border p-3 text-sm"><div className="flex items-center justify-between gap-2"><strong>{detection.classification}</strong><Badge variant={detection.severity === "none" ? "secondary" : "destructive"}>{detection.severity}</Badge></div><p className="mt-1 text-muted-foreground">{detection.plantId} · confidence {detection.confidence}% · {detection.modelVersion}</p></li>)}</ul> : null}<div className="rounded-lg bg-secondary p-4"><strong>ขั้นตอนถัดไป</strong><p className="mt-1 text-sm text-muted-foreground">{selectedImage?.detectionCount ? "ตรวจทานผลหลายรายการและบันทึกหลักฐาน" : "รอ Agent ส่งผล AI หรือเชื่อมโมเดลภายหลัง"}</p></div><Button className="min-h-11 w-full" onClick={() => onSave(selectedCamera.id)} disabled={!selectedImage || selectedImage.status !== "ready" || reviewed}><CheckCircle2 aria-hidden="true" />{reviewed ? "บันทึกผลตรวจแล้ว" : selectedImage ? "บันทึกผลตรวจ" : "รอภาพจากกล้อง"}</Button></CardContent></Card>
    </div>
  </div>;
}
