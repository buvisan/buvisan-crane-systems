"use client"

import { useState, useEffect, useRef } from "react"
import { createClient } from "@/utils/supabase/client"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Trash2, Send, Loader2, MessageSquareQuote, Link as LinkIcon, AlertCircle, Users, User, Smile, X, ArrowLeft, Reply } from "lucide-react"

export function DashboardNotes() {
  const [notes, setNotes] = useState<any[]>([])
  const [newNote, setNewNote] = useState("")
  const [loading, setLoading] = useState(false)
  const [currentUser, setCurrentUser] = useState<any>(null)
  
  const [projects, setProjects] = useState<any[]>([])
  const [selectedProjectId, setSelectedProjectId] = useState("")

  const [users, setUsers] = useState<any[]>([]) 
  const [activeView, setActiveView] = useState<"list" | "chat">("list") 
  const [activeChat, setActiveChat] = useState<string | "genel" | null>(null) 
  
  const [activeEmojiNoteId, setActiveEmojiNoteId] = useState<number | null>(null) 
  const [replyTo, setReplyTo] = useState<any>(null) 

  const scrollRef = useRef<HTMLDivElement>(null)
  const supabase = createClient()

  const EMOJIS = ["👍", "❤️", "😂", "🚀", "🔥", "👀"]

  useEffect(() => {
    fetchUsers()
    fetchProjects() 
    fetchCurrentUser()
  }, [])

  useEffect(() => {
    if (activeView === "chat" && activeChat) fetchNotes()
  }, [activeView, activeChat])

  useEffect(() => {
      if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [notes])

  const fetchCurrentUser = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      setCurrentUser(user)
  }

  const fetchProjects = async () => {
      const { data } = await supabase.from('projects').select('id, project_code').order('created_at', { ascending: false })
      if (data) setProjects(data)
  }

  const fetchUsers = async () => {
      const { data } = await supabase.from('profiles').select('*').order('first_name', { ascending: true })
      if (data) setUsers(data)
  }

  // 🚀 MESAJLARI ÇEK (YENİ VE KUSURSUZ SİSTEM)
  const fetchNotes = async () => {
    if (!currentUser) return;
    
    // Güvenli ve basit Supabase Join Mantığı
    let query = supabase
        .from('notes')
        .select(`
            *,
            profiles (first_name, last_name, department),
            projects (project_code),
            reply_to:notes!reply_to_id ( content, profiles (first_name) )
        `)
        .order('created_at', { ascending: false })
        .limit(50)

    // Filtreler
    if (activeChat === "genel") {
        query = query.is('receiver_id', null)
    } else {
        query = query.or(`and(user_id.eq.${currentUser.id},receiver_id.eq.${activeChat}),and(user_id.eq.${activeChat},receiver_id.eq.${currentUser.id})`)
    }

    const { data, error } = await query
    
    // 🚨 HATA YAKALAYICI (Mesajlar giderse neden gittiğini söyler)
    if (error) {
        console.error("Mesaj Çekme Hatası:", error)
        alert("SİSTEM UYARISI: Mesajlar Supabase'den çekilemedi!\n\nHata: " + error.message)
    }
    
    if (data) setNotes(data.reverse())
  }

  const addNote = async () => {
    if (!newNote.trim()) return
    setLoading(true)

    try {
        const payload = { 
            content: newNote,
            user_id: currentUser?.id,
            project_id: selectedProjectId ? Number(selectedProjectId) : null,
            receiver_id: activeChat === "genel" ? null : activeChat,
            reply_to_id: replyTo ? replyTo.id : null 
        }

        const { error } = await supabase.from('notes').insert([payload])

        if (error) throw new Error(error.message)

        setNewNote("") 
        setSelectedProjectId("") 
        setReplyTo(null)
        fetchNotes()   
    } catch (error: any) {
        alert("❌ MESAJ GİTMEDİ! \nSupabase SQL kodunu çalıştırdığınıza emin olun.\n\nHata: " + error.message)
    } finally {
        setLoading(false)
    }
  }

  const deleteNote = async (id: number) => {
    if(!confirm("Bu mesajı silmek istediğinize emin misiniz?")) return;
    await supabase.from('notes').delete().eq('id', id)
    fetchNotes()
  }

  const addReaction = async (noteId: number, emoji: string, currentReactions: any) => {
      const reactions = currentReactions ? { ...currentReactions } : {}
      if (!reactions[emoji]) reactions[emoji] = []
      
      const userIndex = reactions[emoji].indexOf(currentUser?.id)
      if (userIndex > -1) {
          reactions[emoji].splice(userIndex, 1) 
      } else {
          reactions[emoji].push(currentUser?.id) 
      }

      if (reactions[emoji].length === 0) delete reactions[emoji] 

      await supabase.from('notes').update({ reactions }).eq('id', noteId)
      setActiveEmojiNoteId(null) 
      fetchNotes()
  }

  const formatTime = (dateStr: string) => new Date(dateStr).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })
  const activeChatUser = users.find(u => u.id === activeChat)

  return (
    <div className="flex flex-col h-[500px] md:h-[600px] font-sans bg-white border border-slate-200 rounded-[1.5rem] shadow-sm overflow-hidden w-full relative">
      
      {/* LİSTE GÖRÜNÜMÜ */}
      {activeView === "list" && (
          <div className="flex flex-col h-full w-full bg-slate-50">
              <div className="p-4 border-b border-slate-200 bg-white flex items-center justify-between sticky top-0 z-10 shadow-sm">
                  <h2 className="text-lg font-black text-slate-800 flex items-center gap-2">
                      <MessageSquareQuote className="h-5 w-5 text-emerald-500" /> Sohbetler
                  </h2>
              </div>
              <div className="flex-1 overflow-y-auto custom-scrollbar p-2 space-y-1">
                  
                  <button onClick={() => { setActiveChat("genel"); setActiveView("chat"); }} className="w-full flex items-center gap-3 p-3 rounded-2xl hover:bg-slate-200/50 transition-all border border-transparent hover:border-slate-200">
                      <div className="h-12 w-12 bg-emerald-500 rounded-full flex items-center justify-center shrink-0 shadow-inner"><Users className="h-6 w-6 text-white" /></div>
                      <div className="flex flex-col items-start">
                          <span className="font-bold text-slate-800 text-sm">Genel Pano</span>
                          <span className="text-[10px] text-slate-500 font-medium">Tüm şirkete açık duyurular</span>
                      </div>
                  </button>

                  <div className="pt-4 pb-2 px-3 border-t border-slate-200/50 mt-2">
                      <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Çalışma Arkadaşları</span>
                  </div>

                  {users.filter(u => u.id !== currentUser?.id).map((u) => (
                      <button key={u.id} onClick={() => { setActiveChat(u.id); setActiveView("chat"); }} className="w-full flex items-center gap-3 p-3 rounded-2xl hover:bg-slate-200/50 transition-all border border-transparent hover:border-slate-200">
                          <div className="h-12 w-12 bg-slate-800 rounded-full flex items-center justify-center shrink-0 text-white font-black text-sm shadow-inner">
                              {u.first_name?.charAt(0)}{u.last_name?.charAt(0)}
                          </div>
                          <div className="flex flex-col items-start overflow-hidden">
                              <span className="font-bold text-slate-800 text-sm truncate w-full text-left">{u.first_name} {u.last_name}</span>
                              <span className="text-[10px] text-slate-500 font-bold truncate w-full text-left">{u.department || "Personel"}</span>
                          </div>
                      </button>
                  ))}
              </div>
          </div>
      )}

      {/* SOHBET GÖRÜNÜMÜ */}
      {activeView === "chat" && (
          <div className="flex flex-col h-full w-full relative">
              <div className="flex items-center gap-3 p-3 bg-white border-b border-slate-200 shadow-sm z-10 shrink-0">
                  <button onClick={() => { setActiveView("list"); setNotes([]); }} className="p-2 bg-slate-100 hover:bg-slate-200 rounded-full transition-colors shrink-0">
                      <ArrowLeft className="h-5 w-5 text-slate-600" />
                  </button>
                  <div className={`h-10 w-10 rounded-full flex items-center justify-center shrink-0 shadow-inner text-white font-black text-xs ${activeChat === "genel" ? 'bg-emerald-500' : 'bg-slate-800'}`}>
                      {activeChat === "genel" ? <Users className="h-5 w-5" /> : `${activeChatUser?.first_name?.charAt(0)}${activeChatUser?.last_name?.charAt(0)}`}
                  </div>
                  <div className="flex flex-col overflow-hidden">
                      <h2 className="text-sm font-black text-slate-800 truncate">{activeChat === "genel" ? 'Genel Pano' : `${activeChatUser?.first_name} ${activeChatUser?.last_name}`}</h2>
                      <p className="text-[9px] font-bold text-emerald-600 truncate">{activeChat === "genel" ? 'Tüm Şirket' : activeChatUser?.department}</p>
                  </div>
              </div>
              
              <div ref={scrollRef} className="flex-1 min-h-0 overflow-y-auto p-3 space-y-3 custom-scrollbar bg-cover bg-center bg-[#e5ddd5]/30 relative" style={{backgroundImage: `url('https://i.pinimg.com/1200x/8c/98/99/8c98994518b575bfd8c949e91d20548b.jpg')`, backgroundBlendMode: 'soft-light'}}>
                  {notes.map((note: any) => {
                      const isMe = note.user_id === currentUser?.id;
                      const isEmojiMenuOpen = activeEmojiNoteId === note.id; 
                      
                      return (
                      <div key={note.id} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'} w-full`}>
                          {!isMe && activeChat === "genel" && (
                              <span className="text-[9px] font-black text-slate-500 ml-2 mb-0.5">{note.profiles?.first_name} {note.profiles?.last_name}</span>
                          )}

                          <div className={`relative max-w-[85%] p-2.5 rounded-2xl shadow-sm border group ${isMe ? 'bg-[#dcf8c6] border-[#c0e8a8] rounded-tr-sm' : 'bg-white border-slate-200 rounded-tl-sm'}`}>
                              
                              {/* 🚀 YANITLANAN MESAJ */}
                              {note.reply_to && (
                                  <div className="bg-black/5 border-l-4 border-emerald-500 p-1.5 rounded-lg mb-1.5 text-[10px] text-slate-600 font-medium">
                                      <span className="font-black text-emerald-600 block mb-0.5">{note.reply_to.profiles?.first_name || "Biri"}</span>
                                      <p className="truncate opacity-80">{note.reply_to.content}</p>
                                  </div>
                              )}

                              {note.projects && (
                                  <div className={`flex items-center gap-1 text-[8px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded mb-1.5 w-max ${isMe ? 'bg-emerald-100 text-emerald-800' : 'bg-blue-50 text-blue-700'}`}>
                                      <LinkIcon className="h-2.5 w-2.5" /> PROJE: {note.projects.project_code}
                                  </div>
                              )}
                              
                              <p className="text-xs text-slate-800 whitespace-pre-wrap font-medium pr-10">{note.content}</p>
                              <span className="absolute bottom-1 right-1.5 text-[8px] font-bold text-slate-400 mix-blend-multiply">{formatTime(note.created_at)}</span>

                              {/* Görünür Emojiler */}
                              {note.reactions && Object.keys(note.reactions).length > 0 && (
                                  <div className="absolute -bottom-3 left-2 flex gap-1 bg-white p-0.5 rounded-full shadow-sm border border-slate-200 z-10">
                                      {Object.entries(note.reactions).map(([emoji, users]: [string, any]) => (
                                          users.length > 0 && (
                                              <button key={emoji} onClick={() => addReaction(note.id, emoji, note.reactions)} className="text-[9px] bg-slate-50 hover:bg-slate-200 rounded-full px-1.5 flex items-center gap-1 cursor-pointer transition-colors">
                                                  {emoji} <span className="text-slate-400 font-bold">{users.length}</span>
                                              </button>
                                          )
                                      ))}
                                  </div>
                              )}

                              {/* EMOJİ & YANITLA MENÜSÜ */}
                              <div className={`absolute top-1/2 -translate-y-1/2 flex items-center gap-1 transition-opacity ${isEmojiMenuOpen ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'} ${isMe ? '-left-[5.5rem]' : '-right-[5.5rem]'} z-20`}>
                                  
                                  <button onClick={() => setReplyTo(note)} className="p-1.5 bg-white text-slate-500 hover:text-blue-500 rounded-full shadow-sm border border-slate-200 transition-colors" title="Yanıtla">
                                      <Reply className="h-3.5 w-3.5" />
                                  </button>

                                  <div className="relative">
                                      <button onClick={() => setActiveEmojiNoteId(isEmojiMenuOpen ? null : note.id)} className={`p-1.5 bg-white text-slate-500 hover:text-amber-500 rounded-full shadow-sm border border-slate-200 transition-colors ${isEmojiMenuOpen ? 'bg-amber-50 text-amber-500' : ''}`} title="Emoji Bırak">
                                          <Smile className="h-3.5 w-3.5" />
                                      </button>
                                      
                                      {isEmojiMenuOpen && (
                                          <div className={`absolute top-full mt-1 flex bg-white p-1.5 rounded-2xl shadow-xl border border-slate-100 gap-1 z-50 ${isMe ? 'right-0' : 'left-0'}`}>
                                              {EMOJIS.map(e => (
                                                  <button key={e} onClick={() => addReaction(note.id, e, note.reactions)} className="hover:bg-slate-100 p-1.5 rounded-xl text-lg transition-transform hover:scale-125">{e}</button>
                                              ))}
                                          </div>
                                      )}
                                  </div>

                                  {isMe && <button onClick={() => deleteNote(note.id)} className="p-1.5 bg-white text-slate-500 hover:text-rose-500 rounded-full shadow-sm border border-slate-200 transition-colors" title="Sil"><Trash2 className="h-3.5 w-3.5" /></button>}
                              </div>
                          </div>
                      </div>
                  )})}

                  {notes.length === 0 && !loading && (
                      <div className="flex flex-col items-center justify-center h-full text-slate-500">
                          <div className="bg-white/80 p-3 rounded-full backdrop-blur-sm mb-2"><MessageSquareQuote className="h-6 w-6 text-slate-400" /></div>
                          <span className="text-[10px] font-bold bg-white/80 px-3 py-1 rounded-full backdrop-blur-sm">Sohbeti başlatın...</span>
                      </div>
                  )}
              </div>

              {/* Mesaj Kutusu */}
              <div className="p-2 bg-[#f0f2f5] border-t border-slate-200 shrink-0 relative">
                  
                  {replyTo && (
                      <div className="absolute bottom-full left-0 right-0 p-2 bg-[#f0f2f5]">
                          <div className="bg-white p-2 rounded-xl border-l-4 border-blue-500 flex items-start justify-between shadow-sm mx-1">
                              <div className="flex flex-col overflow-hidden">
                                  <span className="text-[10px] font-black text-blue-600 mb-0.5">Yanıtlanıyor: {replyTo.profiles?.first_name || "Biri"}</span>
                                  <span className="text-[10px] text-slate-500 truncate">{replyTo.content}</span>
                              </div>
                              <button onClick={() => setReplyTo(null)} className="p-1 text-slate-400 hover:bg-slate-100 rounded-full shrink-0"><X className="h-4 w-4"/></button>
                          </div>
                      </div>
                  )}

                  <div className="flex flex-col gap-1.5 px-1 relative z-10">
                      <div className="flex bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm h-8">
                          <div className="bg-slate-100 px-2 flex items-center justify-center border-r border-slate-200"><LinkIcon className="h-3 w-3 text-slate-500" /></div>
                          <select className="flex-1 bg-transparent text-[10px] font-bold text-slate-600 px-2 outline-none cursor-pointer" value={selectedProjectId} onChange={(e) => setSelectedProjectId(e.target.value)}>
                              <option value="">-- Proje Seç (İsteğe Bağlı) --</option>
                              {projects.map(p => <option key={p.id} value={p.id}>{p.project_code}</option>)}
                          </select>
                      </div>
                      <div className="flex items-end gap-2">
                          <Textarea 
                              placeholder="Mesaj yazın..." 
                              className="min-h-[40px] max-h-[80px] resize-none bg-white border-none rounded-xl text-xs font-medium focus-visible:ring-0 p-2.5 placeholder:text-slate-400 shadow-sm custom-scrollbar"
                              value={newNote} onChange={(e) => setNewNote(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); addNote(); } }}
                          />
                          <Button onClick={addNote} disabled={loading || !newNote.trim()} className="h-10 w-10 rounded-full bg-emerald-500 hover:bg-emerald-600 text-white shadow-md transition-transform active:scale-95 shrink-0 p-0 flex items-center justify-center">
                              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4 ml-0.5" />}
                          </Button>
                      </div>
                  </div>
              </div>
          </div>
      )}
    </div>
  )
}