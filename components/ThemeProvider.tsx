"use client"

import { createContext, useContext, useEffect, useState } from "react"
import { createClient } from "@/utils/supabase/client"

const ThemeContext = createContext<any>(null)

export function ThemeProvider({ children }: { children: React.ReactNode }) {
    const [theme, setTheme] = useState('light')
    const [accentColor, setAccentColor] = useState('blue')
    const supabase = createClient()

    useEffect(() => {
        // 1. Sayfa açıldığında Supabase'den kullanıcının tercihini çek
        const loadPreferences = async () => {
            const { data: { user } } = await supabase.auth.getUser()
            if (user) {
                const { data } = await supabase.from('profiles').select('theme, accent_color').eq('id', user.id).single()
                if (data) {
                    setTheme(data.theme || 'light')
                    setAccentColor(data.accent_color || 'blue')
                }
            }
        }
        loadPreferences()
    }, [])

    useEffect(() => {
        // 2. Tercih değiştiğinde HTML'in en tepesine bu ayarı işle!
        const root = document.documentElement
        
        if (theme === 'dark') {
            root.classList.add('dark')
        } else {
            root.classList.remove('dark')
        }
        
        // Vurgu rengini data attribute olarak ata
        root.setAttribute('data-accent', accentColor)
    }, [theme, accentColor])

    return (
        <ThemeContext.Provider value={{ theme, setTheme, accentColor, setAccentColor }}>
            {children}
        </ThemeContext.Provider>
    )
}

export const useTheme = () => useContext(ThemeContext)