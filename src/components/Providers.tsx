"use client"

import { App, ConfigProvider } from "antd"
import type { ReactNode } from "react"

export function Providers({ children }: { children: ReactNode }) {
  return (
    <ConfigProvider>
      <App>{children}</App>
    </ConfigProvider>
  )
}
