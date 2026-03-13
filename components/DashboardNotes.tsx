"use client"

import { useState, useEffect } from "react"
import { createClient } from "@/utils/supabase/client"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Trash2, Save, StickyNote, Loader2, MessageSquareQuote } from "lucide-react"
import { useRouter } from "next/navigation"
import { ActionUserBadge } from "@/components/ActionUserBadge" // 🚀 Rozetimizi içeri aktarıyoruz!

export function DashboardNotes() {
  const [notes, setNotes] = useState<any[]>([])
  const [newNote, setNewNote] = useState("")
  const [loading, setLoading] = useState(false)
  const supabase = createClient()
  const router = useRouter()

  useEffect(() => {
    fetchNotes()
  }, [])

  const fetchNotes = async () => {
    // 🚀 SİHRİN OLDUĞU YER: Notları çekerken 'profiles' tablosundan kullanıcıyı da çekiyoruz!
    const { data } = await supabase
        .from('notes')
        .select(`
            *,
            profiles ( first_name, last_name, department )
        `)
        .order('created_at', { ascending: false })
        
    if (data) setNotes(data)
  }

  const addNote = async () => {
    if (!newNote.trim()) return
    setLoading(true)

    try {
        // 1. O anki oturumdaki (giriş yapmış) kullanıcıyı bul
        const { data: { user } } = await supabase.auth.getUser()
        const userId = user ? user.id : null

        // 2. Notu veritabanına kaydederken user_id ile birlikte gönder
        const { error } = await supabase.from('notes').insert([{ 
            content: newNote,
            user_id: userId // 🚀 Notun kime ait olduğunu mühürlüyoruz
        }])

        if (error) throw error

        setNewNote("") 
        fetchNotes()   
        router.refresh()
    } catch (error: any) {
        alert("Not eklenirken hata oluştu: " + error.message)
    } finally {
        setLoading(false)
    }
  }

  const deleteNote = async (id: number) => {
    if(!confirm("Bu notu silmek istediğinize emin misiniz?")) return;
    await supabase.from('notes').delete().eq('id', id)
    fetchNotes()
    router.refresh()
  }

  return (
    <div className="h-full flex flex-col font-sans">
      
      {/* 🚀 BAŞLIK ALANI */}
      <div className="flex items-center gap-3 mb-4 px-2">
          <div className="bg-amber-100 p-2.5 rounded-xl shadow-inner">
              <MessageSquareQuote className="h-5 w-5 text-amber-600" />
          </div>
          <div>
              <h2 className="text-xl font-black text-slate-800">Ekip Panosu</h2>
              <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">Genel Duyurular & Notlar</p>
          </div>
      </div>
      
      <div className="flex-1 flex flex-col gap-5 overflow-hidden">
        
        {/* 🚀 1. NOT EKLEME ALANI (Premium Form) */}
        <div className="flex flex-col gap-3 bg-white/50 p-1 rounded-3xl border border-white shadow-sm">
            <Textarea 
                placeholder="Ekip için bir not veya duyuru bırakın..." 
                className="min-h-[100px] resize-none bg-white/80 border-none rounded-2xl text-sm font-medium focus-visible:ring-0 px-5 pt-4 placeholder:text-slate-400 shadow-inner"
                value={newNote}
                onChange={(e) => setNewNote(e.target.value)}
            />
            <Button 
                onClick={addNote} 
                disabled={loading || !newNote.trim()}
                className="h-12 rounded-2xl bg-slate-900 hover:bg-slate-800 text-white font-bold shadow-lg shadow-slate-900/20 transition-all mx-1 mb-1 flex items-center justify-center gap-2"
            >
                {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Save className="h-5 w-5 text-amber-400" />}
                {loading ? "Kaydediliyor..." : "PANOYA YAPIŞTIR"}
            </Button>
        </div>

        {/* 🚀 2. NOT LİSTESİ (Akışkan ve İmzalı) */}
        <div className="flex-1 overflow-y-auto space-y-4 pr-2 no-scrollbar pb-10">
            {notes.map((note) => (
                <div key={note.id} className="group relative bg-white/80 backdrop-blur-md p-5 rounded-[2rem] border border-slate-100 shadow-sm hover:shadow-md transition-all duration-300 flex flex-col gap-4">
                    
                    {/* Not İçeriği */}
                    <p className="text-sm text-slate-700 whitespace-pre-wrap leading-relaxed font-medium">
                        {note.content}
                    </p>
                    
                    {/* Alt Kısım: İmza Rozeti ve Sil Butonu */}
                    <div className="flex items-end justify-between mt-2 pt-4 border-t border-slate-100/50">
                        {/* 🚀 İŞTE O EFSANE ROZET BURADA ÇALIŞIYOR */}
                        <ActionUserBadge 
                            profile={note.profiles} 
                            actionText="Notu Bırakan" 
                            date={note.created_at} 
                        />
                        
                        {/* Silme Butonu (Sadece üzerine gelince belirir) */}
                        <button 
                            onClick={() => deleteNote(note.id)}
                            className="opacity-0 group-hover:opacity-100 p-3 bg-rose-50 text-rose-500 hover:bg-rose-500 hover:text-white rounded-xl transition-all shadow-sm shrink-0"
                            title="Notu Sil"
                        >
                            <Trash2 className="h-4 w-4" />
                        </button>
                    </div>

                </div>
            ))}
            
            {notes.length === 0 && (
                <div className="flex flex-col items-center justify-center h-48 text-slate-400 bg-white/40 rounded-[2rem] border-2 border-dashed border-slate-200">
                    <StickyNote className="h-10 w-10 mb-3 opacity-30" />
                    <span className="text-sm font-bold">Panoda hiç not yok.</span>
                </div>
            )}
        </div>
      </div>
    </div>
  )
}