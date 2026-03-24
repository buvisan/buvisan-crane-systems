"use client"

import { useState, useEffect } from "react"
import { createClient } from "@/utils/supabase/client"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Trash2, Save, StickyNote, Loader2, MessageSquareQuote, ChevronDown, ChevronUp, Clock, CalendarDays, Link as LinkIcon } from "lucide-react"
import { useRouter } from "next/navigation"

export function DashboardNotes() {
  const [notes, setNotes] = useState<any[]>([])
  const [newNote, setNewNote] = useState("")
  const [loading, setLoading] = useState(false)
  const [expandedUsers, setExpandedUsers] = useState<string[]>([]) 
  
  // 🚀 PROJE BAĞLAMA STATELERİ
  const [projects, setProjects] = useState<any[]>([])
  const [selectedProjectId, setSelectedProjectId] = useState("")

  const supabase = createClient()
  const router = useRouter()

  useEffect(() => {
    fetchNotes()
    fetchProjects() // 🚀 Projeleri çekiyoruz
  }, [])

  // 🚀 Müsait Projeleri Çek
  const fetchProjects = async () => {
      const { data } = await supabase.from('projects').select('id, project_code').order('created_at', { ascending: false })
      if (data) setProjects(data)
  }

  const fetchNotes = async () => {
    // 🚀 'projects' tablosundan proje kodunu da çekecek şekilde güncelledik
    const { data } = await supabase
        .from('notes')
        .select(`
            *,
            profiles ( first_name, last_name, department ),
            projects ( project_code )
        `)
        .order('created_at', { ascending: false })
        
    if (data) {
        setNotes(data)
        if (data.length > 0) {
            const firstUserId = data[0].user_id || 'bilinmeyen'
            setExpandedUsers([firstUserId])
        }
    }
  }

  const addNote = async () => {
    if (!newNote.trim()) return
    setLoading(true)

    try {
        const { data: { user } } = await supabase.auth.getUser()
        const userId = user ? user.id : null

        // 🚀 Seçili proje varsa onu da veritabanına yazıyoruz
        const { error } = await supabase.from('notes').insert([{ 
            content: newNote,
            user_id: userId,
            project_id: selectedProjectId ? Number(selectedProjectId) : null
        }])

        if (error) throw error

        setNewNote("") 
        setSelectedProjectId("") // İşlem bitince proje seçimini sıfırla
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

  const groupedNotes = notes.reduce((acc, note) => {
      const key = note.user_id || 'bilinmeyen';
      if (!acc[key]) {
          acc[key] = {
              profile: note.profiles || { first_name: 'Bilinmeyen', last_name: 'Kullanıcı', department: 'Sistem' },
              notes: []
          };
      }
      acc[key].notes.push(note);
      return acc;
  }, {} as Record<string, { profile: any, notes: any[] }>);

  const toggleUser = (userId: string) => {
      setExpandedUsers(prev => 
          prev.includes(userId) ? prev.filter(id => id !== userId) : [...prev, userId]
      )
  }

  const getInitials = (first: string, last: string) => {
      return `${first?.charAt(0) || ''}${last?.charAt(0) || ''}`.toUpperCase() || 'U'
  }

  const formatTime = (dateStr: string) => new Date(dateStr).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })
  const formatDate = (dateStr: string) => new Date(dateStr).toLocaleDateString('tr-TR', { day: '2-digit', month: '2-digit', year: 'numeric' })

  return (
    <div className="h-full flex flex-col font-sans">
      
      <div className="flex items-center gap-3 mb-4 px-2">
          <div className="bg-amber-100 p-2.5 rounded-xl shadow-inner">
              <MessageSquareQuote className="h-5 w-5 text-amber-600" />
          </div>
          <div>
              <h2 className="text-xl font-black text-slate-800">Ekip Panosu</h2>
              <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">Kişi Bazlı Duyurular & Notlar</p>
          </div>
      </div>
      
      <div className="flex-1 flex flex-col gap-5 overflow-hidden">
        
        {/* NOT EKLEME ALANI */}
        <div className="flex flex-col gap-3 bg-white/50 p-2 rounded-3xl border border-white shadow-sm shrink-0">
            <Textarea 
                placeholder="Ekip için bir not veya duyuru bırakın..." 
                className="min-h-[90px] resize-none bg-white/80 border-none rounded-2xl text-sm font-medium focus-visible:ring-0 px-4 pt-4 placeholder:text-slate-400 shadow-inner"
                value={newNote}
                onChange={(e) => setNewNote(e.target.value)}
            />
            
            {/* 🚀 PROJE SEÇİCİ VE KAYDET BUTONU YAN YANA */}
            <div className="flex flex-col sm:flex-row gap-2">
                <div className="flex-1 bg-slate-50 border border-slate-100 rounded-2xl px-3 flex items-center gap-2">
                    <LinkIcon className="h-4 w-4 text-slate-400 shrink-0" />
                    <select 
                        className="w-full bg-transparent text-xs font-bold text-slate-600 h-12 outline-none"
                        value={selectedProjectId}
                        onChange={(e) => setSelectedProjectId(e.target.value)}
                    >
                        <option value="">-- Projeye Bağla (İsteğe Bağlı) --</option>
                        {projects.map(p => (
                            <option key={p.id} value={p.id}>{p.project_code}</option>
                        ))}
                    </select>
                </div>

                <Button 
                    onClick={addNote} 
                    disabled={loading || !newNote.trim()}
                    className="h-12 px-6 rounded-2xl bg-slate-900 hover:bg-slate-800 text-white font-bold shadow-lg shadow-slate-900/20 transition-all flex items-center justify-center gap-2 shrink-0"
                >
                    {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Save className="h-5 w-5 text-amber-400" />}
                    {loading ? "Kaydediliyor..." : "YAPIŞTIR"}
                </Button>
            </div>
        </div>

        <div className="flex-1 overflow-y-auto space-y-4 pr-2 no-scrollbar pb-10">
            {Object.entries(groupedNotes).map(([userId, group]: [string, any]) => {
                const isExpanded = expandedUsers.includes(userId);
                
                return (
                <div key={userId} className="flex flex-col bg-white/80 backdrop-blur-md rounded-[2rem] border border-slate-100 shadow-sm overflow-hidden transition-all duration-300">
                    
                    <button 
                        onClick={() => toggleUser(userId)}
                        className="w-full flex items-center justify-between p-4 hover:bg-slate-50/50 transition-colors"
                    >
                        <div className="flex items-center gap-3">
                            <div className="h-12 w-12 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-black text-lg border-2 border-white shadow-sm shrink-0">
                                {getInitials(group.profile.first_name, group.profile.last_name)}
                            </div>
                            <div className="flex flex-col items-start">
                                <span className="font-black text-slate-800 text-sm">{group.profile.first_name} {group.profile.last_name}</span>
                                <span className="text-[10px] font-bold text-blue-600 uppercase tracking-widest">{group.profile.department}</span>
                            </div>
                        </div>
                        <div className="flex items-center gap-3">
                            <span className="bg-amber-100 text-amber-700 text-xs font-black px-3 py-1 rounded-xl shadow-inner">
                                {group.notes.length} Not
                            </span>
                            <div className="p-2 bg-slate-100 text-slate-400 rounded-full">
                                {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                            </div>
                        </div>
                    </button>

                    {isExpanded && (
                        <div className="p-4 pt-0 bg-slate-50/50 border-t border-slate-100 flex flex-col gap-3">
                            {group.notes.map((note: any) => (
                                <div key={note.id} className="group relative bg-white p-4 rounded-2xl border border-slate-100 shadow-sm hover:border-blue-200 transition-all flex flex-col gap-3">
                                    <p className="text-sm text-slate-700 whitespace-pre-wrap leading-relaxed font-medium">
                                        {note.content}
                                    </p>
                                    
                                    {/* 🚀 EĞER PROJEYE BAĞLIYSA ETİKET GÖSTER */}
                                    {note.projects && (
                                        <div className="inline-flex items-center gap-1.5 bg-indigo-50 text-indigo-700 px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest border border-indigo-100 w-max mt-1">
                                            <LinkIcon className="h-3.5 w-3.5" />
                                            BAĞLI PROJE: {note.projects.project_code}
                                        </div>
                                    )}
                                    
                                    <div className="flex items-center justify-between mt-1 pt-3 border-t border-slate-50">
                                        <div className="flex items-center gap-3 text-[11px] font-bold text-slate-400">
                                            <span className="flex items-center gap-1"><CalendarDays className="h-3.5 w-3.5 text-slate-300" /> {formatDate(note.created_at)}</span>
                                            <span className="flex items-center gap-1"><Clock className="h-3.5 w-3.5 text-slate-300" /> {formatTime(note.created_at)}</span>
                                        </div>
                                        
                                        <button 
                                            onClick={() => deleteNote(note.id)}
                                            className="opacity-0 group-hover:opacity-100 p-2 bg-rose-50 text-rose-500 hover:bg-rose-500 hover:text-white rounded-lg transition-all shadow-sm"
                                            title="Notu Sil"
                                        >
                                            <Trash2 className="h-4 w-4" />
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}

                </div>
            )})}
            
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