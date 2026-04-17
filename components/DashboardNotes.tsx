"use client"

import { useState, useEffect, useRef } from "react"
import { createClient } from "@/utils/supabase/client"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Trash2, Send, Loader2, MessageSquareQuote, Link as LinkIcon, Users, Smile, X, ArrowLeft, Reply, CheckCheck, Eye, HardHat } from "lucide-react"

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
  const [unreadCounts, setUnreadCounts] = useState<Record<string, number>>({})

  const [refreshTrigger, setRefreshTrigger] = useState(0)

  const scrollRef = useRef<HTMLDivElement>(null)
  const supabase = createClient()
  const EMOJIS = ["👍", "❤️", "😂", "🚀", "🔥", "👀"]

  useEffect(() => {
    const init = async () => {
        const { data: { user } } = await supabase.auth.getUser()
        setCurrentUser(user)
        
        const { data: profiles } = await supabase.from('profiles').select('*').order('first_name')
        if (profiles) setUsers(profiles)

        const { data: projs } = await supabase.from('projects').select('id, project_code').order('created_at', { ascending: false })
        if (projs) setProjects(projs)
    }
    init()
  }, [])

  useEffect(() => {
    if (!currentUser) return;
    const channel = supabase
      .channel('public:notes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'notes' }, () => {
          setRefreshTrigger(prev => prev + 1)
      })
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [currentUser])

  useEffect(() => {
    if (activeView === "chat" && activeChat) {
        fetchNotes()
        markAsRead(activeChat)
    }
    loadUnreadCounts()
  }, [activeView, activeChat, refreshTrigger, currentUser])

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [notes])

  // 🚀 SOHBET FİLTRELEME MOTORU (Proje vs Genel)
  const fetchNotes = async () => {
    if (!currentUser || !activeChat) return;
    let query = supabase.from('notes').select(`*, profiles (first_name, last_name, department), projects (project_code), reply_to:reply_to_id ( content, profiles (first_name, last_name) )`).order('created_at', { ascending: true });
    
    const isProjectChat = activeChat.startsWith("project_");

    if (activeChat === "genel") {
        query = query.is('receiver_id', null); 
    } else if (isProjectChat) {
        const pId = activeChat.replace("project_", "");
        // Sadece bu projeye ait "Genel" mesajlar
        query = query.eq('project_id', pId).is('receiver_id', null);
    } else {
        query = query.or(`and(user_id.eq.${currentUser.id},receiver_id.eq.${activeChat}),and(user_id.eq.${activeChat},receiver_id.eq.${currentUser.id})`);
    }
    
    const { data } = await query.limit(50);
    
    if (data) {
        setNotes(data);
        
        // GRUP VEYA PROJE SOHBETİ İÇİN GÖRÜLDÜ
        if (activeChat === "genel" || isProjectChat) {
            const unreadGroup = data.filter(n => n.user_id !== currentUser.id && !(n.read_by || []).includes(currentUser.id));
            if (unreadGroup.length > 0) {
                unreadGroup.forEach(async (note) => {
                    const newReadBy = [...(note.read_by || []), currentUser.id];
                    await supabase.from('notes').update({ read_by: newReadBy }).eq('id', note.id);
                });
            }
        }
    }
  }

  const loadUnreadCounts = async () => {
    if (!currentUser) return;
    const { data: dms } = await supabase.from('notes').select('user_id').eq('receiver_id', currentUser.id).eq('is_read', false);
    const counts: Record<string, number> = {};
    if (dms) dms.forEach(dm => counts[dm.user_id] = (counts[dm.user_id] || 0) + 1);
    
    const lastReadGenel = localStorage.getItem(`lastReadGenel_${currentUser.id}`);
    let genelQuery = supabase.from('notes').select('id', { count: 'exact' }).is('receiver_id', null);
    if (lastReadGenel) genelQuery = genelQuery.gt('created_at', lastReadGenel);
    const { count: genelCount } = await genelQuery;
    if (genelCount) counts["genel"] = genelCount;

    setUnreadCounts(counts);
  }

  const markAsRead = async (chatId: string) => {
    if (!currentUser) return;
    if (chatId === "genel" || chatId.startsWith("project_")) {
        localStorage.setItem(`lastReadGenel_${currentUser.id}`, new Date().toISOString());
    } else {
        await supabase.from('notes').update({ is_read: true }).eq('receiver_id', currentUser.id).eq('user_id', chatId).eq('is_read', false);
    }
  }

  // 🚀 MESAJ GÖNDERİRKEN PROJE ODASI KONTROLÜ
  const addNote = async () => {
    if (!newNote.trim()) return
    setLoading(true)

    const isProjectChat = activeChat?.startsWith("project_");
    let pId = selectedProjectId ? Number(selectedProjectId) : null;
    let rId = activeChat === "genel" ? null : activeChat;

    if (isProjectChat) {
        pId = Number(activeChat?.replace("project_", ""));
        rId = null; // Proje mesajları özel DM değildir, şirkette o projeyi açan herkes görebilir.
    }

    const payload = { 
        content: newNote, 
        user_id: currentUser?.id, 
        project_id: pId,
        receiver_id: rId,
        reply_to_id: replyTo ? replyTo.id : null,
        is_read: false,
        read_by: []
    }
    const { error } = await supabase.from('notes').insert([payload])
    if (!error) { 
        setNewNote(""); setSelectedProjectId(""); setReplyTo(null); 
        fetchNotes(); 
    }
    setLoading(false)
  }

  const deleteNote = async (id: number) => {
    if(confirm("Silinsin mi?")) await supabase.from('notes').delete().eq('id', id);
  }

  const addReaction = async (noteId: number, emoji: string, currentReactions: any) => {
    const reactions = currentReactions ? { ...currentReactions } : {}
    if (!reactions[emoji]) reactions[emoji] = []
    const userIndex = reactions[emoji].indexOf(currentUser?.id)
    if (userIndex > -1) reactions[emoji].splice(userIndex, 1); else reactions[emoji].push(currentUser?.id);
    if (reactions[emoji].length === 0) delete reactions[emoji];
    await supabase.from('notes').update({ reactions }).eq('id', noteId);
    setActiveEmojiNoteId(null);
  }

  const formatMessageDate = (dateStr: string) => {
      const date = new Date(dateStr);
      const today = new Date();
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);

      if (date.toDateString() === today.toDateString()) return "Bugün";
      if (date.toDateString() === yesterday.toDateString()) return "Dün";

      return date.toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', weekday: 'long' });
  }

  const formatTime = (dateStr: string) => new Date(dateStr).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })
  const activeChatUser = users.find(u => u.id === activeChat)

  // 🚀 ÜST BAŞLIK LOGİC
  const isProjectChat = activeChat?.startsWith("project_");
  let chatTitle = "";
  let chatSubtitle = "";
  let ChatAvatarIcon = <Users className="h-5 w-5" />;
  let avatarBg = "bg-slate-800";

  if (activeChat === "genel") {
      chatTitle = "Genel Pano"; chatSubtitle = "Tüm Şirket"; avatarBg = "bg-emerald-500";
  } else if (isProjectChat) {
      const pId = activeChat?.replace("project_", "");
      const proj = projects.find(p => p.id.toString() === pId);
      chatTitle = proj ? `Proje: ${proj.project_code}` : "Proje Odası";
      chatSubtitle = "Projeye Özel Sohbet";
      avatarBg = "bg-blue-600";
      ChatAvatarIcon = <HardHat className="h-5 w-5" />;
  } else {
      chatTitle = `${activeChatUser?.first_name} ${activeChatUser?.last_name}`;
      chatSubtitle = activeChatUser?.department || "";
      ChatAvatarIcon = <span className="text-xs">{activeChatUser?.first_name?.charAt(0)}{activeChatUser?.last_name?.charAt(0)}</span>;
  }

  const UnreadBadge = ({ count }: { count: number }) => {
      if (!count || count === 0) return null;
      return (
          <span className="bg-rose-500 text-white text-[10px] font-black px-2 py-0.5 rounded-full shadow-sm ml-auto shrink-0">
              {count > 9 ? '9+' : count}
          </span>
      )
  }

  return (
    <div className="flex flex-col h-[500px] md:h-[600px] font-sans bg-white border border-slate-200 rounded-[1.5rem] shadow-sm overflow-hidden w-full relative">
      {activeView === "list" ? (
          <div className="flex flex-col h-full bg-slate-50">
              <div className="p-4 border-b border-slate-200 bg-white flex items-center justify-between shadow-sm">
                  <h2 className="text-lg font-black text-slate-800 flex items-center gap-2"><MessageSquareQuote className="h-5 w-5 text-emerald-500" /> Sohbetler</h2>
              </div>
              <div className="flex-1 overflow-y-auto p-2 space-y-1 custom-scrollbar">
                  <button onClick={() => { setActiveChat("genel"); setActiveView("chat"); }} className="w-full flex items-center gap-3 p-3 rounded-2xl hover:bg-slate-200/50 transition-all border border-transparent hover:border-slate-200">
                      <div className="h-12 w-12 bg-emerald-500 rounded-full flex items-center justify-center text-white shadow-inner shrink-0"><Users className="h-6 w-6" /></div>
                      <div className="flex flex-col items-start flex-1"><span className="font-bold text-slate-800 text-sm">Genel Pano</span><span className="text-[10px] text-slate-500">Tüm şirkete açık</span></div>
                      <UnreadBadge count={unreadCounts["genel"]} />
                  </button>

                  <div className="pt-4 pb-2 px-3"><span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Kişiler</span></div>
                  {users.filter(u => u.id !== currentUser?.id).map((u) => (
                      <button key={u.id} onClick={() => { setActiveChat(u.id); setActiveView("chat"); }} className="w-full flex items-center gap-3 p-3 rounded-2xl hover:bg-slate-200/50 transition-all border border-transparent hover:border-slate-200 relative">
                          <div className="h-12 w-12 bg-slate-800 rounded-full flex items-center justify-center text-white font-black text-sm shrink-0">{u.first_name?.charAt(0)}{u.last_name?.charAt(0)}</div>
                          <div className="flex flex-col items-start overflow-hidden flex-1"><span className="font-bold text-slate-800 text-sm truncate w-full text-left">{u.first_name} {u.last_name}</span><span className="text-[10px] text-slate-500 truncate w-full text-left">{u.department}</span></div>
                          <UnreadBadge count={unreadCounts[u.id]} />
                      </button>
                  ))}

                  {/* 🚀 LİSTEDE YENİ: PROJE ODALARI */}
                  {projects.length > 0 && (
                      <>
                          <div className="pt-4 pb-2 px-3"><span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Açık Proje Odaları (Son 10)</span></div>
                          {projects.slice(0, 10).map((p) => (
                              <button key={`proj_${p.id}`} onClick={() => { setActiveChat(`project_${p.id}`); setActiveView("chat"); }} className="w-full flex items-center gap-3 p-3 rounded-2xl hover:bg-slate-200/50 transition-all border border-transparent hover:border-slate-200 relative">
                                  <div className="h-12 w-12 bg-blue-600 rounded-full flex items-center justify-center text-white font-black text-sm shrink-0"><HardHat className="h-5 w-5" /></div>
                                  <div className="flex flex-col items-start overflow-hidden flex-1">
                                      <span className="font-bold text-slate-800 text-sm truncate w-full text-left">{p.project_code}</span>
                                      <span className="text-[10px] font-bold text-blue-600 truncate w-full text-left">Proje Özel Odası</span>
                                  </div>
                              </button>
                          ))}
                      </>
                  )}
              </div>
          </div>
      ) : (
          <div className="flex flex-col h-full relative">
              <div className="flex items-center gap-3 p-3 bg-white border-b border-slate-200 shadow-sm z-10 shrink-0">
                  <button onClick={() => { setActiveView("list"); setNotes([]); }} className="p-2 bg-slate-100 hover:bg-slate-200 rounded-full transition-colors"><ArrowLeft className="h-5 w-5 text-slate-600" /></button>
                  <div className={`h-10 w-10 rounded-full flex items-center justify-center text-white font-black text-xs shrink-0 ${avatarBg}`}>{ChatAvatarIcon}</div>
                  <div className="flex flex-col overflow-hidden">
                      <h2 className="text-sm font-black text-slate-800 truncate">{chatTitle}</h2>
                      <p className={`text-[9px] font-bold truncate ${isProjectChat ? 'text-blue-600' : 'text-emerald-600'}`}>{chatSubtitle}</p>
                  </div>
              </div>
              <div ref={scrollRef} className="flex-1 overflow-y-auto p-3 custom-scrollbar bg-cover bg-center bg-[#e5ddd5]/30 relative flex flex-col gap-2 pb-6" style={{backgroundImage: `url('https://i.pinimg.com/1200x/8c/98/99/8c98994518b575bfd8c949e91d20548b.jpg')`, backgroundBlendMode: 'soft-light'}}>
                  {notes.map((note, index) => {
                      const isMe = note.user_id === currentUser?.id;
                      const isEmojiMenuOpen = activeEmojiNoteId === note.id;
                      
                      const currentNoteDate = new Date(note.created_at).toDateString();
                      const prevNoteDate = index > 0 ? new Date(notes[index - 1].created_at).toDateString() : null;
                      const showDateLabel = currentNoteDate !== prevNoteDate;

                      return (
                      <div key={note.id} className="flex flex-col w-full">
                          
                          {showDateLabel && (
                              <div className="flex justify-center w-full my-3">
                                  <span className="bg-white/90 backdrop-blur-sm text-[10px] font-black text-slate-500 uppercase tracking-widest px-3 py-1 rounded-full shadow-sm border border-slate-200">
                                      {formatMessageDate(note.created_at)}
                                  </span>
                              </div>
                          )}

                          <div className={`flex flex-col ${isMe ? 'items-end' : 'items-start'} w-full animate-in fade-in duration-300 mb-1`}>
                              {!isMe && (activeChat === "genel" || isProjectChat) && <span className="text-[9px] font-black text-slate-500 ml-2 mb-0.5">{note.profiles?.first_name}</span>}
                              
                              <div className={`relative max-w-[85%] p-2.5 rounded-2xl shadow-sm border group ${isMe ? 'bg-[#dcf8c6] border-[#c0e8a8] rounded-tr-sm' : 'bg-white border-slate-200 rounded-tl-sm'}`}>
                                  {note.reply_to && <div className="bg-black/5 border-l-4 border-emerald-500 p-1.5 rounded-lg mb-1.5 text-[10px] text-slate-700 font-medium"><span className="font-black text-emerald-600 block">{note.reply_to.profiles?.first_name || "Biri"}</span><p className="truncate opacity-80">{note.reply_to.content}</p></div>}
                                  
                                  {/* 🚀 TIKLANABİLİR PROJE ETİKETİ (SADECE GENEL SOHBETTE İSE TIKLANIR) */}
                                  {note.projects && !isProjectChat && (
                                      <button 
                                          onClick={() => { setActiveChat(`project_${note.project_id}`); setActiveView("chat"); }} 
                                          className="flex items-center gap-1 text-[8px] font-black uppercase px-2 py-1 rounded mb-1.5 bg-blue-50 text-blue-700 w-max hover:bg-blue-600 hover:text-white transition-all shadow-sm border border-blue-200"
                                      >
                                          <LinkIcon className="h-2.5 w-2.5" /> PROJE: {note.projects.project_code} (ODAYA GİT)
                                      </button>
                                  )}
                                  
                                  <div className="flex flex-col relative min-w-[70px]">
                                      <p className="text-xs text-slate-800 whitespace-pre-wrap font-medium pr-12 pb-3">{note.content}</p>
                                      
                                      <div className="absolute bottom-0 right-0 flex items-center gap-1 text-[9px] font-bold text-slate-400">
                                          <span>{formatTime(note.created_at)}</span>
                                          
                                          {isMe && activeChat !== "genel" && !isProjectChat && (
                                              <CheckCheck className={`h-3.5 w-3.5 ${note.is_read ? 'text-blue-500' : 'text-slate-400'}`} />
                                          )}
                                      </div>
                                  </div>

                                  {/* KİMLER GÖRDÜ LİSTESİ */}
                                  {isMe && (activeChat === "genel" || isProjectChat) && note.read_by && note.read_by.length > 0 && (
                                      <div className="absolute -bottom-3 -right-2 flex items-center gap-1 bg-white border border-slate-200 rounded-full px-1.5 py-0.5 shadow-sm group/seen cursor-help z-30 hover:border-blue-300 transition-colors">
                                          <Eye className="h-3 w-3 text-blue-500" />
                                          <span className="text-[9px] font-black text-slate-500">{note.read_by.length}</span>
                                          
                                          <div className="absolute bottom-full right-0 mb-2 hidden group-hover/seen:flex flex-col bg-slate-800 text-white text-[10px] p-2.5 rounded-xl shadow-xl w-max max-w-[200px] z-50 animate-in slide-in-from-bottom-1 fade-in">
                                              <span className="font-black text-blue-300 mb-1.5 border-b border-slate-600 pb-1 uppercase tracking-widest">Okuyanlar:</span>
                                              <div className="flex flex-col gap-1 max-h-32 overflow-y-auto custom-scrollbar">
                                                  {note.read_by.map((uid: string) => {
                                                      const reader = users.find(u => u.id === uid);
                                                      return <span key={uid} className="font-medium">{reader?.first_name} {reader?.last_name}</span>
                                                  })}
                                              </div>
                                          </div>
                                      </div>
                                  )}

                                  {note.reactions && Object.keys(note.reactions).length > 0 && (
                                      <div className="absolute -bottom-3 left-2 flex gap-1 bg-white p-0.5 rounded-full shadow-sm border border-slate-200 z-10">
                                          {Object.entries(note.reactions).map(([emoji, userIds]: [string, any]) => {
                                              if (!userIds || userIds.length === 0) return null;
                                              const names = userIds.map((uid: string) => users.find(u => u.id === uid)?.first_name || "Biri").join(", ");
                                              return <button key={emoji} onClick={() => addReaction(note.id, emoji, note.reactions)} title={names} className="text-[9px] bg-slate-50 rounded-full px-1.5 flex items-center gap-1">{emoji} <span className="text-slate-400 font-bold">{userIds.length}</span></button>
                                          })}
                                      </div>
                                  )}
                                  <div className={`absolute top-1/2 -translate-y-1/2 flex items-center gap-1 transition-opacity ${isEmojiMenuOpen ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'} ${isMe ? '-left-[5.5rem]' : '-right-[5.5rem]'} z-20`}>
                                      <button onClick={() => setReplyTo(note)} className="p-1.5 bg-white text-slate-500 hover:text-blue-500 rounded-full shadow-sm border border-slate-200"><Reply className="h-3.5 w-3.5" /></button>
                                      <div className="relative"><button onClick={() => setActiveEmojiNoteId(isEmojiMenuOpen ? null : note.id)} className={`p-1.5 bg-white text-slate-500 hover:text-amber-500 rounded-full shadow-sm border border-slate-200 ${isEmojiMenuOpen ? 'bg-amber-50 text-amber-500' : ''}`}><Smile className="h-3.5 w-3.5" /></button>
                                          {isEmojiMenuOpen && <div className={`absolute top-full mt-1 flex bg-white p-1.5 rounded-2xl shadow-xl border border-slate-100 gap-1 z-50 ${isMe ? 'right-0' : 'left-0'}`}>{EMOJIS.map(e => <button key={e} onClick={() => addReaction(note.id, e, note.reactions)} className="hover:bg-slate-100 p-1.5 rounded-xl text-lg transition-transform hover:scale-125">{e}</button>)}</div>}
                                      </div>
                                      {isMe && <button onClick={() => deleteNote(note.id)} className="p-1.5 bg-white text-slate-500 hover:text-rose-500 rounded-full shadow-sm border border-slate-200"><Trash2 className="h-3.5 w-3.5" /></button>}
                                  </div>
                              </div>
                          </div>
                      </div>
                  )})}
              </div>
              <div className="p-2 bg-[#f0f2f5] border-t border-slate-200 shrink-0 relative">
                  {replyTo && <div className="absolute bottom-full left-0 right-0 p-2 bg-[#f0f2f5] z-10"><div className="bg-white p-2 rounded-xl border-l-4 border-blue-500 flex items-start justify-between shadow-sm mx-1"><div className="flex flex-col overflow-hidden"><span className="text-[10px] font-black text-blue-600">Yanıtlanıyor: {replyTo.profiles?.first_name}</span><span className="text-[10px] text-slate-500 truncate">{replyTo.content}</span></div><button onClick={() => setReplyTo(null)} className="p-1 text-slate-400 hover:bg-slate-100 rounded-full shrink-0"><X className="h-4 w-4"/></button></div></div>}
                  <div className="flex flex-col gap-1.5 px-1 relative z-20">
                      
                      {/* PROJE ODASINDA DEĞİLSEK PROJE SEÇME DROPDOWN ÇIKSIN */}
                      {!isProjectChat && (
                          <div className="flex bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm h-8">
                              <div className="bg-slate-100 px-2 flex items-center border-r border-slate-200"><LinkIcon className="h-3 w-3 text-slate-500" /></div>
                              <select className="flex-1 bg-transparent text-[10px] font-bold text-slate-600 px-2 outline-none cursor-pointer" value={selectedProjectId} onChange={(e) => setSelectedProjectId(e.target.value)}>
                                  <option value="">-- Proje Seç (İsteğe Bağlı) --</option>
                                  {projects.map(p => <option key={p.id} value={p.id}>{p.project_code}</option>)}
                              </select>
                          </div>
                      )}

                      <div className="flex items-end gap-2">
                          <Textarea placeholder={isProjectChat ? `${chatTitle} odasına mesaj yazın...` : "Mesaj yazın..."} className="min-h-[40px] max-h-[80px] resize-none bg-white border-none rounded-xl text-xs font-medium focus-visible:ring-0 p-2.5 shadow-sm custom-scrollbar" value={newNote} onChange={(e) => setNewNote(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); addNote(); } }} />
                          <Button onClick={addNote} disabled={loading || !newNote.trim()} className="h-10 w-10 rounded-full bg-emerald-500 hover:bg-emerald-600 text-white shadow-md active:scale-95 p-0 shrink-0 flex items-center justify-center">{loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4 ml-0.5" />}</Button>
                      </div>
                  </div>
              </div>
          </div>
      )}
    </div>
  )
}