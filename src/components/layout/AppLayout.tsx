"use client";
import { usePathname } from 'next/navigation';
import Sidebar from './Sidebar';

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  
  if (pathname === '/login') {
    return <main className="flex-1 bg-background h-screen">{children}</main>;
  }
  
  return (
    <div className="flex min-h-screen bg-background text-foreground overflow-x-hidden">
      <Sidebar />
      <div className="flex-1 pl-64 min-w-0">
        <main className="p-8">
          {children}
        </main>
      </div>
    </div>
  );
}
