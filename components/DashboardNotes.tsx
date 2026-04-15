"use client"

import { useState, useEffect, useRef } from "react"
import { createClient } from "@/utils/supabase/client"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Trash2, Send, Loader2, MessageSquareQuote, Link as LinkIcon, AlertCircle, Users, User, Reply, Smile, X } from "lucide-react"
import { useRouter } from "next/navigation"

export function DashboardNotes() {
  const [notes, setNotes] = useState<any[]>([])
  const [newNote, setNewNote] = useState("")
  const [loading, setLoading] = useState(false)
  const [currentUser, setCurrentUser] = useState<any>(null)
  
  const [projects, setProjects] = useState<any[]>([])
  const [selectedProjectId, setSelectedProjectId] = useState("")

  // 🚀 FAZ 3: WHATSAPP ÖZELLİKLERİ İÇİN STATELER
  const [users, setUsers] = useState<any[]>([]) // DM atılacak kişiler
  const [activeChat, setActiveChat] = useState<string | null>(null) // null = Genel, string = userId (Özel Mesaj)
  const [replyTo, setReplyTo] = useState<any>(null) // Yanıtlanan mesaj

  const scrollRef = useRef<HTMLDivElement>(null)
  const supabase = createClient()
  const router = useRouter()

  const EMOJIS = ["👍", "❤️", "😂", "🚀", "👀"]

  useEffect(() => {
    fetchUsers()
    fetchProjects() 
  }, [])

  useEffect(() => {
    fetchUserAndNotes()
  }, [activeChat]) // Sohbet sekmesi (Genel/Özel) değiştiğinde mesajları yeniden çek

  useEffect(() => {
      if (scrollRef.current) {
          scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
      }
  }, [notes])

  const fetchProjects = async () => {
      const { data } = await supabase.from('projects').select('id, project_code').order('created_at', { ascending: false })
      if (data) setProjects(data)
  }

  const fetchUsers = async () => {
      const { data } = await supabase.from('profiles').select('*').order('first_name', { ascending: true })
      if (data) setUsers(data)
  }

  const fetchUserAndNotes = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    setCurrentUser(user)
    if (!user) return;

    let query = supabase
        .from('notes')
        .select(`
            *,
            profiles!notes_user_id_fkey( first_name, last_name, department ),
            projects( project_code ),
            reply_to:notes!notes_reply_to_id_fkey( content, profiles!notes_user_id_fkey(first_name) )
        `)
        .order('created_at', { ascending: false })
        .limit(100)

    // 🚀 SOHBET FİLTRESİ
    if (activeChat === null) {
        // Genel Sohbet (Alıcısı olmayan mesajlar)
        query = query.is('receiver_id', null)
    } else {
        // Özel Mesaj (Benim ona attıklarım VEYA onun bana attıkları)
        query = query.or(`and(user_id.eq.${user.id},receiver_id.eq.${activeChat}),and(user_id.eq.${activeChat},receiver_id.eq.${user.id})`)
    }

    const { data } = await query
        
    if (data) {
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
            project_id: selectedProjectId ? Number(selectedProjectId) : null,
            receiver_id: activeChat, // Null ise genel, doluysa özel mesaj
            reply_to_id: replyTo ? replyTo.id : null // Yanıtlanan mesaj id'si
        }])

        if (error) throw error

        setNewNote("") 
        setSelectedProjectId("") 
        setReplyTo(null)
        fetchUserAndNotes()   
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
  }

  const addReaction = async (noteId: number, emoji: string, currentReactions: any) => {
      // JSON formatında reaksiyonları güncelle (Örn: {"👍": ["user_id_1"]})
      const reactions = currentReactions || {}
      if (!reactions[emoji]) reactions[emoji] = []
      
      const userIndex = reactions[emoji].indexOf(currentUser?.id)
      if (userIndex > -1) {
          reactions[emoji].splice(userIndex, 1) // Varsa geri al (Toggle)
      } else {
          reactions[emoji].push(currentUser?.id) // Yoksa ekle
      }

      await supabase.from('notes').update({ reactions }).eq('id', noteId)
      fetchUserAndNotes()
  }

  const formatTime = (dateStr: string) => new Date(dateStr).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })

  // Aktif sohbetin adını bul
  const activeChatUser = users.find(u => u.id === activeChat)

  return (
    <div className="flex h-[600px] md:h-[700px] font-sans bg-white border border-slate-200 rounded-[2rem] shadow-lg overflow-hidden w-full relative">
      
      {/* 🚀 SOL KİŞİLER BÖLÜMÜ (Mobilde aktif chat varsa gizlenir) */}
      <div className={`w-full md:w-80 bg-slate-50 border-r border-slate-200 flex flex-col shrink-0 ${activeChat !== null ? 'hidden md:flex' : 'flex'}`}>
          <div className="p-5 border-b border-slate-200 bg-white">
              <h2 className="text-xl font-black text-slate-800">Sohbetler</h2>
          </div>
          <div className="flex-1 overflow-y-auto custom-scrollbar p-3 space-y-2">
              
              {/* Genel Pano Butonu */}
              <button 
                  onClick={() => setActiveChat(null)}
                  className={`w-full flex items-center gap-3 p-3 rounded-xl transition-all ${activeChat === null ? 'bg-indigo-100 border border-indigo-200' : 'hover:bg-slate-100 border border-transparent'}`}
              >
                  <div className="h-10 w-10 bg-indigo-500 rounded-full flex items-center justify-center shrink-0">
                      <Users className="h-5 w-5 text-white" />
                  </div>
                  <div className="flex flex-col items-start">
                      <span className="font-bold text-slate-800 text-sm">Genel Pano</span>
                      <span className="text-[10px] text-slate-500 font-medium">Şirket İçi Duyurular</span>
                  </div>
              </button>

              <div className="pt-3 pb-1 px-2">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Kişiler (Özel Mesaj)</span>
              </div>

              {/* Kullanıcı Listesi */}
              {users.filter(u => u.id !== currentUser?.id).map((u) => (
                  <button 
                      key={u.id}
                      onClick={() => setActiveChat(u.id)}
                      className={`w-full flex items-center gap-3 p-3 rounded-xl transition-all ${activeChat === u.id ? 'bg-emerald-100 border border-emerald-200' : 'hover:bg-slate-100 border border-transparent'}`}
                  >
                      <div className="h-10 w-10 bg-slate-800 rounded-full flex items-center justify-center shrink-0 text-white font-black text-xs">
                          {u.first_name?.charAt(0)}{u.last_name?.charAt(0)}
                      </div>
                      <div className="flex flex-col items-start overflow-hidden">
                          <span className="font-bold text-slate-800 text-sm truncate w-full text-left">{u.first_name} {u.last_name}</span>
                          <span className="text-[10px] text-slate-500 font-medium truncate w-full text-left">{u.department}</span>
                      </div>
                  </button>
              ))}
          </div>
      </div>

      {/* 🚀 SAĞ SOHBET BÖLÜMÜ */}
      <div className={`flex-1 flex flex-col bg-[#e5ddd5]/30 relative ${activeChat !== null ? 'flex' : 'hidden md:flex'}`}>
          
          {/* Chat Başlığı */}
          <div className="flex items-center gap-3 p-4 bg-white border-b border-slate-200 shadow-sm z-10 shrink-0">
              {/* Mobilde geri butonu */}
              {activeChat !== null && (
                  <button onClick={() => setActiveChat(null)} className="md:hidden p-2 bg-slate-100 rounded-full mr-2">
                      <X className="h-4 w-4" />
                  </button>
              )}
              
              <div className={`p-2.5 rounded-full shadow-inner flex items-center justify-center ${activeChat === null ? 'bg-indigo-500' : 'bg-slate-800'}`}>
                  {activeChat === null ? <MessageSquareQuote className="h-5 w-5 text-white" /> : <User className="h-5 w-5 text-white" />}
              </div>
              <div>
                  <h2 className="text-base md:text-lg font-black text-slate-800">
                      {activeChat === null ? 'Genel Sohbet & Duyurular' : `${activeChatUser?.first_name} ${activeChatUser?.last_name}`}
                  </h2>
                  <p className="text-[10px] md:text-xs font-bold text-slate-500 flex items-center gap-1">
                      {activeChat === null ? 'Tüm şirket burayı görebilir' : 'Uçtan uca şifreli özel mesajlaşma'}
                  </p>
              </div>
          </div>
          
          {/* Chat Baloncukları */}
          <div ref={scrollRef} className="flex-1 min-h-0 overflow-y-auto p-3 md:p-4 space-y-4 custom-scrollbar bg-cover bg-center" style={{backgroundImage: `url('https://i.pinimg.com/1200x/8c/98/99/8c98994518b575bfd8c949e91d20548b.jpg')`, backgroundBlendMode: 'soft-light', backgroundColor: 'rgba(255,255,255,0.7)'}}>
              {notes.map((note: any) => {
                  const isMe = note.user_id === currentUser?.id;
                  
                  return (
                  <div key={note.id} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'} group w-full`}>
                      
                      {!isMe && activeChat === null && (
                          <span className="text-[10px] font-black text-slate-500 ml-2 mb-1">
                              {note.profiles?.first_name} {note.profiles?.last_name}
                          </span>
                      )}

                      <div className={`relative max-w-[90%] md:max-w-[75%] p-2.5 md:p-3 rounded-2xl shadow-sm border ${isMe ? 'bg-[#dcf8c6] border-emerald-200 rounded-tr-sm' : 'bg-white border-slate-200 rounded-tl-sm'}`}>
                          
                          {/* YANITLANAN MESAJ (Varsa) */}
                          {note.reply_to && (
                              <div className="bg-black/5 border-l-4 border-emerald-500 p-2 rounded-lg mb-2 text-[10px] md:text-xs text-slate-600 font-medium">
                                  <span className="font-black text-emerald-600 block mb-0.5">{note.reply_to.profiles?.first_name}</span>
                                  <p className="truncate">{note.reply_to.content}</p>
                              </div>
                          )}

                          {/* PROJE ETİKETİ (Varsa) */}
                          {note.projects && (
                              <div className={`flex items-center gap-1 text-[9px] md:text-[10px] font-black uppercase tracking-widest px-1.5 py-1 rounded-md mb-1.5 w-max ${isMe ? 'bg-emerald-100 text-emerald-800' : 'bg-blue-50 text-blue-700'}`}>
                                  <LinkIcon className="h-3 w-3" /> PROJE: {note.projects.project_code}
                              </div>
                          )}
                          
                          <p className="text-xs md:text-sm text-slate-800 whitespace-pre-wrap font-medium pr-10">{note.content}</p>
                          <span className="absolute bottom-1 right-1.5 text-[8px] md:text-[9px] font-bold text-slate-400">{formatTime(note.created_at)}</span>

                          {/* EMOJİ REAKSİYONLARI GÖSTERİMİ */}
                          {note.reactions && Object.keys(note.reactions).length > 0 && (
                              <div className="absolute -bottom-3 left-2 flex gap-1 bg-white p-0.5 rounded-full shadow-sm border border-slate-200">
                                  {Object.entries(note.reactions).map(([emoji, users]: [string, any]) => (
                                      users.length > 0 && (
                                          <span key={emoji} className="text-[10px] bg-slate-50 rounded-full px-1.5 flex items-center gap-1">
                                              {emoji} <span className="text-slate-400">{users.length}</span>
                                          </span>
                                      )
                                  ))}
                              </div>
                          )}

                          {/* 🚀 MESAJ AKSİYON BUTONLARI (Hover olunca çıkar) */}
                          <div className={`absolute top-1/2 -translate-y-1/2 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity ${isMe ? '-left-20' : '-right-20'}`}>
                              <button onClick={() => setReplyTo(note)} className="p-1.5 bg-white text-slate-500 hover:text-blue-500 rounded-full shadow-sm border border-slate-200" title="Yanıtla"><Reply className="h-3.5 w-3.5" /></button>
                              
                              {/* EMOJİ EKLEME MENÜSÜ */}
                              <div className="relative group/emoji">
                                  <button className="p-1.5 bg-white text-slate-500 hover:text-amber-500 rounded-full shadow-sm border border-slate-200" title="Emoji Bırak"><Smile className="h-3.5 w-3.5" /></button>
                                  <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover/emoji:flex bg-white p-1.5 rounded-2xl shadow-xl border border-slate-100 gap-1 z-50">
                                      {EMOJIS.map(e => (
                                          <button key={e} onClick={() => addReaction(note.id, e, note.reactions)} className="hover:bg-slate-100 p-1.5 rounded-xl text-base transition-transform hover:scale-125">{e}</button>
                                      ))}
                                  </div>
                              </div>

                              {isMe && (
                                  <button onClick={() => deleteNote(note.id)} className="p-1.5 bg-white text-slate-500 hover:text-rose-500 rounded-full shadow-sm border border-slate-200" title="Sil"><Trash2 className="h-3.5 w-3.5" /></button>
                              )}
                          </div>

                      </div>
                  </div>
              )})}
          </div>

          {/* 🚀 MESAJ YAZMA ALANI */}
          <div className="p-2 md:p-4 bg-[#f0f2f5] border-t border-slate-200 shrink-0">
              
              {/* Yanıtlanan Mesaj Önizlemesi */}
              {replyTo && (
                  <div className="mb-2 bg-white p-2 md:p-3 rounded-xl border-l-4 border-blue-500 flex items-start justify-between shadow-sm">
                      <div className="flex flex-col overflow-hidden">
                          <span className="text-[10px] font-black text-blue-600 mb-0.5">Yanıtlanıyor: {replyTo.profiles?.first_name}</span>
                          <span className="text-xs text-slate-500 truncate">{replyTo.content}</span>
                      </div>
                      <button onClick={() => setReplyTo(null)} className="p-1 text-slate-400 hover:bg-slate-100 rounded-full"><X className="h-4 w-4"/></button>
                  </div>
              )}

              <div className="flex flex-col gap-2">
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

                  <div className="flex items-end gap-2">
                      <Textarea 
                          placeholder="Bir mesaj yazın..." 
                          className="min-h-[40px] md:min-h-[50px] max-h-[100px] resize-none bg-white border-none rounded-xl md:rounded-2xl text-xs md:text-sm font-medium focus-visible:ring-0 p-2 md:p-3 placeholder:text-slate-400 shadow-sm custom-scrollbar"
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
                          {loading ? <Loader2 className="h-4 w-4 md:h-5 md:w-5 animate-spin" /> : <Send className="h-4 w-4 md:h-5 md:w-5 ml-0.5" />}
                      </Button>
                  </div>
              </div>
          </div>
      </div>
    </div>
  )
}