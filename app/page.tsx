import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { ShieldCheck, Anchor } from "lucide-react"

export default function Home() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <Card className="w-[350px] shadow-lg">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <div className="p-3 bg-blue-100 rounded-full">
              {/* Vinç ikonu niyetine çapa kullandık, sonra değiştiririz */}
              <Anchor className="h-8 w-8 text-blue-700" />
            </div>
          </div>
          <CardTitle className="text-2xl font-bold text-blue-900">Buvisan Crane</CardTitle>
          <CardDescription>Kurumsal Yönetim Sistemi</CardDescription>
        </CardHeader>
        <CardContent>
          <form>
            <div className="grid w-full items-center gap-4">
              <div className="flex flex-col space-y-1.5">
                <Label htmlFor="email">Email</Label>
                <Input id="email" placeholder="adiniz@buvisan.com" />
              </div>
              <div className="flex flex-col space-y-1.5">
                <Label htmlFor="password">Şifre</Label>
                <Input id="password" type="password" placeholder="******" />
              </div>
            </div>
          </form>
        </CardContent>
        <CardFooter className="flex flex-col gap-2">
          <Button className="w-full bg-blue-700 hover:bg-blue-800">Giriş Yap</Button>
          <div className="flex items-center justify-center gap-2 text-xs text-gray-500 mt-2">
            <ShieldCheck className="h-4 w-4" />
            <span>Güvenli Bağlantı - v1.0</span>
          </div>
        </CardFooter>
      </Card>
    </div>
  )
}