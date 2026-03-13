"use client"

import { User } from "lucide-react"

interface ActionUserBadgeProps {
  profile: {
    first_name?: string;
    last_name?: string;
    department?: string;
  } | null;
  actionText?: string; // Örn: "Oluşturan:", "Satışı Yapan:"
  date?: string;
}

export function ActionUserBadge({ profile, actionText = "İşlemi Yapan", date }: ActionUserBadgeProps) {
  const firstName = profile?.first_name || "Sistem";
  const lastName = profile?.last_name || "Otomatik";
  const department = profile?.department || "Genel";
  
  // İsme göre dinamik renk
  const getAvatarColor = (name: string) => {
    const colors = ["bg-blue-100 text-blue-700", "bg-emerald-100 text-emerald-700", "bg-violet-100 text-violet-700", "bg-amber-100 text-amber-700", "bg-rose-100 text-rose-700"];
    const index = name.charCodeAt(0) % colors.length;
    return colors[index];
  }

  const avatarClass = getAvatarColor(firstName);

  return (
    <div className="flex items-center gap-3 bg-slate-50/80 border border-slate-100 p-2.5 rounded-2xl w-max shadow-sm transition-all hover:bg-white hover:shadow-md">
        <div className={`h-10 w-10 shrink-0 rounded-xl border flex items-center justify-center text-sm font-black shadow-inner ${avatarClass}`}>
            {firstName.charAt(0)}
        </div>
        <div className="flex flex-col justify-center pr-2">
            <div className="flex items-center gap-1.5">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{actionText}</span>
                {date && <span className="text-[10px] font-bold text-slate-300">• {new Date(date).toLocaleDateString('tr-TR')}</span>}
            </div>
            <div className="flex items-baseline gap-2">
                <span className="text-sm font-black text-slate-800">{firstName} {lastName}</span>
                <span className="text-[10px] font-bold bg-slate-200/50 text-slate-500 px-1.5 py-0.5 rounded-md uppercase tracking-wider">
                    {department}
                </span>
            </div>
        </div>
    </div>
  )
}