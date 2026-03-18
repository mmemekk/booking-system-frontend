"use client"

import { createContext, useContext, useState, ReactNode } from "react"

type TopBarContextType = {
  title: string
  rightContent?: React.ReactNode
  setTopBar: (title: string, rightContent?: React.ReactNode) => void
}

const TopBarContext = createContext<TopBarContextType | undefined>(undefined)

export function TopBarProvider({ children }: { children: ReactNode }) {
  const [title, setTitle] = useState('')
  const [rightContent, setRightContent] = useState<React.ReactNode>(undefined)

  const setTopBar = (newTitle: string, newRightContent?: React.ReactNode) => {
    setTitle(newTitle)
    setRightContent(newRightContent)
  }

  return (
    <TopBarContext.Provider value={{ title, rightContent, setTopBar }}>
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