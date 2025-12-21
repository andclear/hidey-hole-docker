"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { LogOut, User, Settings, Loader2, Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";

interface UserProfile {
  display_name: string;
  avatar_url: string;
  bio?: string;
}

interface UserProfileNavProps {
  isCollapsed?: boolean;
}

export function UserProfileNav({ isCollapsed }: UserProfileNavProps) {
  const router = useRouter();
  const { setTheme, theme } = useTheme();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  
  // Dialog states
  const [isEditProfileOpen, setIsEditProfileOpen] = useState(false);
  const [isAvatarOpen, setIsAvatarOpen] = useState(false);
  
  // Form states
  const [displayName, setDisplayName] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [saving, setSaving] = useState(false);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [newAvatarUrl, setNewAvatarUrl] = useState("");

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      const res = await fetch("/api/user/profile?t=" + Date.now());
      const data = await res.json();
      if (data.success && data.data) {
        setProfile(data.data);
        setDisplayName(data.data.display_name);
        setAvatarUrl(data.data.avatar_url);
      }
    } catch (error) {
      console.error("Failed to fetch profile", error);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      router.push("/login");
      router.refresh();
    } catch (error) {
      console.error("Logout failed", error);
    }
  };

  const handleUpdateProfile = async (field: 'display_name' | 'avatar_url', value: string) => {
    setSaving(true);
    try {
      if (field === 'avatar_url' && avatarFile) {
          const formData = new FormData();
          formData.append("file", avatarFile);
          
          const res = await fetch("/api/user/avatar/upload", {
              method: "POST",
              body: formData
          });
          const data = await res.json();
          if (data.success) {
              setProfile((prev) => ({ ...prev!, avatar_url: data.avatar_url }));
              setAvatarUrl(data.avatar_url);
              setIsAvatarOpen(false);
              setAvatarFile(null);
              setNewAvatarUrl("");
              router.refresh();
          } else {
              console.error(data.error);
          }
      } else {
          // Standard text update
          const finalValue = field === 'avatar_url' ? (newAvatarUrl || value) : value;
          const res = await fetch("/api/user/profile", {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ [field]: finalValue }),
          });
          const data = await res.json();
          if (data.success) {
            setProfile((prev) => ({ ...prev!, [field]: finalValue }));
            if (field === 'display_name') setIsEditProfileOpen(false);
            if (field === 'avatar_url') {
                setIsAvatarOpen(false);
                setNewAvatarUrl("");
            }
            
            // Refresh dashboard if needed (or use context)
            router.refresh(); 
          }
      }
    } catch (error) {
      console.error("Update failed", error);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="p-4 flex items-center justify-center"><Loader2 className="h-4 w-4 animate-spin" /></div>;
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" className={cn("w-full justify-start px-2 h-14 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground", isCollapsed && "justify-center px-0")}>
            <div className={cn("flex items-center gap-3 w-full", isCollapsed && "justify-center")}>
              <Avatar className="h-8 w-8 rounded-lg shrink-0">
                <AvatarImage src={profile?.avatar_url} alt={profile?.display_name} />
                <AvatarFallback className="rounded-lg">{profile?.display_name?.substring(0, 2).toUpperCase()}</AvatarFallback>
              </Avatar>
              {!isCollapsed && (
                <div className="flex flex-col items-start text-sm w-full truncate animate-in fade-in duration-200">
                    <span className="font-semibold">{profile?.display_name}</span>
                    <span className="text-xs text-muted-foreground">Administrator</span>
                </div>
              )}
            </div>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent className="w-56" align="start" side={isCollapsed ? "right" : "bottom"} forceMount>
          <DropdownMenuLabel className="font-normal">
            <div className="flex flex-col space-y-1">
              <p className="text-sm font-medium leading-none">{profile?.display_name}</p>
              <p className="text-xs leading-none text-muted-foreground">
                Admin Account
              </p>
            </div>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuGroup>
            <DropdownMenuItem onClick={() => setIsEditProfileOpen(true)}>
              <User className="mr-2 h-4 w-4" />
              <span>修改昵称</span>
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setIsAvatarOpen(true)}>
              <Settings className="mr-2 h-4 w-4" />
              <span>更换头像</span>
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setTheme(theme === "dark" ? "light" : "dark")}>
              {theme === "dark" ? (
                <Sun className="mr-2 h-4 w-4" />
              ) : (
                <Moon className="mr-2 h-4 w-4" />
              )}
              <span>{theme === "dark" ? "浅色模式" : "深色模式"}</span>
            </DropdownMenuItem>
          </DropdownMenuGroup>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={handleLogout} className="text-destructive focus:text-destructive">
            <LogOut className="mr-2 h-4 w-4" />
            <span>退出登录</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Edit Name Dialog */}
      <Dialog open={isEditProfileOpen} onOpenChange={setIsEditProfileOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>修改昵称</DialogTitle>
            <DialogDescription>
              设置您在仪表盘显示的名称。
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="name" className="text-right">
                昵称
              </Label>
              <Input
                id="name"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                className="col-span-3"
              />
            </div>
          </div>
          <DialogFooter>
            <Button onClick={() => handleUpdateProfile('display_name', displayName)} disabled={saving}>
              {saving ? "保存中..." : "保存更改"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Avatar Dialog */}
      <Dialog open={isAvatarOpen} onOpenChange={setIsAvatarOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>更换头像</DialogTitle>
            <DialogDescription>
              上传新头像或使用图片链接。
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
                <Label>方式一：上传图片</Label>
                <Input 
                  type="file" 
                  accept="image/*"
                  onChange={(e) => {
                      if (e.target.files?.[0]) {
                          setAvatarFile(e.target.files[0]);
                          setNewAvatarUrl("");
                      }
                  }}
                />
                {avatarFile && <p className="text-xs text-muted-foreground">已选择: {avatarFile.name}</p>}
            </div>
            <div className="relative">
                <div className="absolute inset-0 flex items-center">
                    <span className="w-full border-t" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-background px-2 text-muted-foreground">或者</span>
                </div>
            </div>
            <div className="grid gap-2">
                <Label>方式二：图片链接</Label>
                <Input 
                  placeholder="https://example.com/avatar.png" 
                  value={newAvatarUrl}
                  onChange={(e) => {
                      setNewAvatarUrl(e.target.value);
                      setAvatarFile(null);
                  }}
                />
            </div>
            <div className="flex justify-center mt-2">
               <Avatar className="h-20 w-20">
                  <AvatarImage src={newAvatarUrl || (avatarFile ? URL.createObjectURL(avatarFile) : avatarUrl)} />
                  <AvatarFallback>预览</AvatarFallback>
               </Avatar>
            </div>
          </div>
          <DialogFooter>
            <Button onClick={() => handleUpdateProfile('avatar_url', newAvatarUrl)} disabled={saving || (!avatarFile && !newAvatarUrl)}>
              {saving ? "保存中..." : "保存更改"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
