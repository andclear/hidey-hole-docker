"use client";

import { Sidebar } from "@/components/layout/sidebar";
import { ModeToggle } from "@/components/mode-toggle";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Menu } from "lucide-react";
import { useState } from "react";

export default function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {/* Desktop Sidebar */}
      <aside className="hidden md:block h-full z-50">
        <Sidebar />
      </aside>

      {/* Mobile Sidebar & Main Content */}
      <div className="flex-1 flex flex-col h-full overflow-hidden">
        {/* Header - Mobile Only Trigger */}
        <header className="md:hidden h-14 border-b flex items-center justify-between px-4 bg-card shrink-0">
          <div className="flex items-center">
            <Sheet open={open} onOpenChange={setOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="mr-2">
                  <Menu className="h-5 w-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="p-0 w-auto border-r-0 bg-transparent shadow-none [&>button]:hidden">
                <Sidebar defaultExpanded={true} className="h-full w-56 border-r shadow-xl" />
              </SheetContent>
            </Sheet>
            <h1 className="font-semibold text-lg">囤囤小兄许</h1>
          </div>
        </header>

        {/* Main Content Area */}
        <main className="flex-1 overflow-auto p-4 md:p-8">
          {children}
        </main>
      </div>
    </div>
  );
}
