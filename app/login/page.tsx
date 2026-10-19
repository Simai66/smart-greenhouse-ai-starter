import type { Metadata } from "next";

import { LoginPage } from "@/components/login-page";

export const metadata: Metadata = {
  title: "เข้าสู่ระบบ | Smart Greenhouse",
  description: "เข้าสู่ระบบ Smart Greenhouse ด้วยบัญชี Google",
};

export default function LoginRoute() {
  return <LoginPage />;
}
