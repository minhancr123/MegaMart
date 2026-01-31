"use client"

import * as React from "react"
import { Moon, Sun } from "lucide-react"
import { useTheme } from "next-themes"

export function ThemeToggle() {
  const { theme, setTheme } = useTheme()
  const [mounted, setMounted] = React.useState(false)

  React.useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) {
    return (
      <div className="relative inline-flex h-6 w-11 items-center rounded-full bg-gray-200">
        <span className="inline-block h-5 w-5 transform rounded-full bg-white transition ml-0.5" />
      </div>
    )
  }

  const isDark = theme === "dark"

  return (
    <button
      onClick={() => setTheme(isDark ? "light" : "dark")}
      className={`group relative inline-flex h-6 w-11 items-center rounded-full transition-all duration-300 ease-in-out focus:outline-none focus:ring-2 focus:ring-offset-2 ${
        isDark 
          ? "bg-blue-600 focus:ring-blue-500 hover:bg-blue-700" 
          : "bg-gray-300 focus:ring-gray-400 hover:bg-gray-400"
      }`}
      role="switch"
      aria-checked={isDark}
      aria-label="Toggle dark mode"
    >
      <span
        className={`inline-flex h-5 w-5 items-center justify-center transform rounded-full bg-white shadow-md ring-0 transition-all duration-300 ease-in-out ${
          isDark ? "translate-x-5" : "translate-x-0.5"
        }`}
      >
        {isDark ? (
          <Moon className="h-3 w-3 text-blue-600 transition-transform duration-300 group-hover:scale-110" />
        ) : (
          <Sun className="h-3 w-3 text-yellow-500 transition-transform duration-300 group-hover:scale-110" />
        )}
      </span>
    </button>
  )
}
