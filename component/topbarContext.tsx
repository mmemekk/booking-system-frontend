"use client"

import { createContext, useContext, useState, useCallback, useMemo, ReactNode } from "react"

type TopBarContextType = {
  title: string
  rightContent?: React.ReactNode
  setTopBar: (title: string, rightContent?: React.ReactNode) => void
}

const TopBarContext = createContext<TopBarContextType | undefined>(undefined)

export function TopBarProvider({ children }: { children: ReactNode }) {
  const [title, setTitle] = useState('')
  const [rightContent, setRightContent] = useState<React.ReactNode>(undefined)

  // Stabilize function identity to avoid triggering effects that depend on `setTopBar`
  // (prevents React "Maximum update depth exceeded" loops).
  const setTopBar = useCallback((newTitle: string, newRightContent?: React.ReactNode) => {
    setTitle(newTitle)
    setRightContent(newRightContent)
  }, [])

  const value = useMemo(
    () => ({
      title,
      rightContent,
      setTopBar,
    }),
    [title, rightContent, setTopBar],
  )

  return (
    <TopBarContext.Provider value={value}>
      {children}
    </TopBarContext.Provider>
  )
}

export function useTopBar() {
  const context = useContext(TopBarContext)
  if (!context) {
    throw new Error("useTopBar must be used within TopBarProvider")
  }
  return context
}