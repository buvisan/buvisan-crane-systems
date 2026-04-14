"use client"

import { useState, useEffect, useRef } from "react"
import { createClient } from "@/utils/supabase/client"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Trash2, Send, Loader2, MessageSquareQuote, Link as LinkIcon, AlertCircle } from "lucide-react"
import { useRouter } from "next/navigation"

export function DashboardNotes() {
  const [notes, setNotes] = useState<any[]>([])
  const [newNote, setNewNote] = useState("")
  const [loading, setLoading] = useState(false)
  const [currentUser, setCurrentUser] = useState<any>(null)
  
  const [projects, setProjects] = useState<any[]>([])
  const [selectedProjectId, setSelectedProjectId] = useState("")

  const scrollRef = useRef<HTMLDivElement>(null)
  const supabase = createClient()
  const router = useRouter()

  useEffect(() => {
    fetchUserAndNotes()
    fetchProjects() 
  }, [])

  // 🚀 Sohbetin her zaman en altta (son mesajda) kalmasını sağlar
  useEffect(() => {
      if (scrollRef.current) {
          scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
      }
  }, [notes])

  const fetchProjects = async () => {
      const { data } = await supabase.from('projects').select('id, project_code').order('created_at', { ascending: false })
      if (data) setProjects(data)
  }

  const fetchUserAndNotes = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    setCurrentUser(user)

    const { data } = await supabase
        .from('notes')
        .select(`
            *,
            profiles ( first_name, last_name, department ),
            projects ( project_code )
        `)
        // 🚀 SİHİR 1: Sadece son 50 mesajı çekiyoruz ki sistem çökmesin!
        .order('created_at', { ascending: false }) 
        .limit(50)
        
    if (data) {
        // Çektiğimiz son 50 mesajı ekranda eskiden yeniye dizebilmek için tersine (reverse) çeviriyoruz
        setNotes(data.reverse())
    }
  }

  const addNote = async () => {
    if (!newNote.trim()) return
    setLoading(true)

    try {
        const { error } = await supabase.from('notes').insert([{ 
            content: newNote,
            user_id: currentUser?.id,
            project_id: selectedProjectId ? Number(selectedProjectId) : null
        }])

        if (error) throw error

        setNewNote("") 
        setSelectedProjectId("") 
        fetchUserAndNotes()   
        router.refresh()
    } catch (error: any) {
        alert("Mesaj gönderilirken hata oluştu: " + error.message)
    } finally {
        setLoading(false)
    }
  }

  const deleteNote = async (id: number) => {
    if(!confirm("Bu mesajı silmek istediğinize emin misiniz?")) return;
    await supabase.from('notes').delete().eq('id', id)
    fetchUserAndNotes()
    router.refresh()
  }

  const formatTime = (dateStr: string) => new Date(dateStr).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })

  return (
    // 🚀 SİHİR 2: h-[500px] md:h-[600px] vererek kutunun uzamasını YASAKLADIK!
    <div className="flex flex-col h-[500px] md:h-[650px] font-sans bg-[#e5ddd5]/30 rounded-none w-full relative">
      
      {/* CHAT ÜST BİLGİ */}
      <div className="flex items-center gap-3 p-4 bg-white border-b border-slate-200 shadow-sm z-10 shrink-0">
          <div className="bg-emerald-500 p-2 md:p-2.5 rounded-full shadow-inner flex items-center justify-center">
              <MessageSquareQuote className="h-4 w-4 md:h-5 md:w-5 text-white" />
          </div>
          <div>
              <h2 className="text-sm md:text-base lg:text-lg font-black text-slate-800">Genel Sohbet & Duyurular</h2>
              <p className="text-[9px] md:text-[10px] lg:text-xs font-bold text-slate-500 flex items-center gap-1"><AlertCircle className="h-3 w-3"/> Ekip içi anlık iletişim alanı</p>
          </div>
      </div>
      
      {/* CHAT BALONCUKLARI ALANI */}
      {/* 🚀 min-h-0 ekleyerek flexbox'ın dışarı taşmasını kesin olarak engelledik */}
      <div ref={scrollRef} className="flex-1 min-h-0 overflow-y-auto p-3 md:p-4 space-y-4 custom-scrollbar bg-cover bg-center" style={{backgroundImage: `url('https://i.pinimg.com/1200x/8c/98/99/8c98994518b575bfd8c949e91d20548b.jpg')`, backgroundBlendMode: 'soft-light', backgroundColor: 'rgba(255,255,255,0.7)'}}>
          
          {notes.map((note: any) => {
              const isMe = note.user_id === currentUser?.id;
              
              return (
              <div key={note.id} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'} group w-full`}>
                  
                  {/* Mesaj Gönderen İsmi (Sadece karşı tarafsa göster) */}
                  {!isMe && (
                      <span className="text-[9px] md:text-[10px] font-black text-slate-500 ml-2 mb-1">
                          {note.profiles?.first_name} {note.profiles?.last_name} <span className="text-slate-400 font-medium">({note.profiles?.department})</span>
                      </span>
                  )}

                  {/* MESAJ BALONCUĞU */}
                  <div className={`relative max-w-[90%] md:max-w-[85%] lg:max-w-[75%] p-2.5 md:p-3 rounded-2xl shadow-sm border ${isMe ? 'bg-[#dcf8c6] border-emerald-200 rounded-tr-sm' : 'bg-white border-slate-200 rounded-tl-sm'}`}>
                      
                      {/* Proje Etiketi */}
                      {note.projects && (
                          <div className={`flex items-center gap-1 md:gap-1.5 text-[8px] md:text-[9px] lg:text-[10px] font-black uppercase tracking-widest px-1.5 md:px-2 py-1 rounded-md mb-1.5 md:mb-2 w-max ${isMe ? 'bg-emerald-100 text-emerald-800 border border-emerald-200' : 'bg-blue-50 text-blue-700 border border-blue-100'}`}>
                              <LinkIcon className="h-2.5 w-2.5 md:h-3 md:w-3" /> PROJE: {note.projects.project_code}
                          </div>
                      )}
                      
                      <p className="text-[11px] md:text-xs lg:text-sm text-slate-800 whitespace-pre-wrap font-medium pr-8 md:pr-10">{note.content}</p>
                      
                      <span className="absolute bottom-1 right-1.5 md:bottom-1.5 md:right-2 text-[8px] md:text-[9px] font-bold text-slate-400">{formatTime(note.created_at)}</span>

                      {/* Silme Butonu (Sadece mesajın sahibi silebilir) */}
                      {isMe && (
                          <button onClick={() => deleteNote(note.id)} className="absolute -left-6 md:-left-8 top-1/2 -translate-y-1/2 opacity-100 lg:opacity-0 lg:group-hover:opacity-100 p-1 md:p-1.5 bg-rose-100 text-rose-500 hover:bg-rose-500 hover:text-white rounded-full transition-all shadow-sm">
                              <Trash2 className="h-3 w-3" />
                          </button>
                      )}
                  </div>
              </div>
          )})}

          {notes.length === 0 && (
              <div className="flex flex-col items-center justify-center h-full text-slate-500">
                  <div className="bg-white/60 p-3 md:p-4 rounded-full backdrop-blur-sm mb-2"><MessageSquareQuote className="h-6 w-6 md:h-8 md:w-8 text-slate-400" /></div>
                  <span className="text-[10px] md:text-xs font-bold bg-white/60 px-3 py-1 rounded-full backdrop-blur-sm">Sohbeti başlatın...</span>
              </div>
          )}
      </div>

      {/* MESAJ YAZMA ALANI */}
      <div className="p-2 md:p-3 lg:p-4 bg-[#f0f2f5] border-t border-slate-200 shrink-0">
          <div className="flex flex-col gap-2">
              
              {/* Proje Seçici */}
              <div className="flex bg-white rounded-lg md:rounded-xl border border-slate-200 overflow-hidden shadow-sm h-8 md:h-10">
                  <div className="bg-slate-100 px-2 md:px-3 flex items-center justify-center border-r border-slate-200">
                      <LinkIcon className="h-3 w-3 md:h-4 md:w-4 text-slate-500" />
                  </div>
                  <select 
                      className="flex-1 bg-transparent text-[10px] md:text-xs font-bold text-slate-600 px-2 outline-none cursor-pointer"
                      value={selectedProjectId}
                      onChange={(e) => setSelectedProjectId(e.target.value)}
                  >
                      <option value="">-- Proje Seç (İsteğe Bağlı) --</option>
                      {projects.map(p => <option key={p.id} value={p.id}>{p.project_code}</option>)}
                  </select>
              </div>

              {/* Mesaj Kutusu ve Gönder Butonu */}
              <div className="flex items-end gap-2">
                  <Textarea 
                      placeholder="Bir mesaj yazın..." 
                      className="min-h-[40px] md:min-h-[50px] max-h-[100px] md:max-h-[120px] resize-none bg-white border-none rounded-xl md:rounded-2xl text-xs md:text-sm font-medium focus-visible:ring-0 p-2 md:p-3 lg:p-4 placeholder:text-slate-400 shadow-sm custom-scrollbar"
                      value={newNote}
                      onChange={(e) => setNewNote(e.target.value)}
                      onKeyDown={(e) => {
                          if (e.key === 'Enter' && !e.shiftKey) {
                              e.preventDefault();
                              addNote();
                          }
                      }}
                  />
                  <Button 
                      onClick={addNote} 
                      disabled={loading || !newNote.trim()}
                      className="h-10 w-10 md:h-12 md:w-12 rounded-full bg-emerald-500 hover:bg-emerald-600 text-white shadow-md transition-transform active:scale-95 shrink-0 p-0 flex items-center justify-center"
                  >
                      {loading ? <Loader2 className="h-4 w-4 md:h-5 md:w-5 animate-spin" /> : <Send className="h-4 w-4 md:h-5 md:w-5 ml-0.5 md:ml-1" />}
                  </Button>
              </div>
          </div>
      </div>
    </div>
  )
}