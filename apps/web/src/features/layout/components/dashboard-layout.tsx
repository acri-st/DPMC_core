import type { ReactNode } from 'react';

import { SidebarInset, SidebarProvider } from '@/shared/components/ui/sidebar';
import { TooltipProvider } from '@/shared/components/ui/tooltip';
import { PageContainer } from '@/shared/components/page-container';
import { DashboardHeader } from '@/features/layout/components/dashboard-header';
import { DashboardSidebar } from '@/features/layout/components/dashboard-sidebar';

type DashboardLayoutProps = {
  children: ReactNode;
};

export function DashboardLayout({ children }: DashboardLayoutProps) {
  return (
    <TooltipProvider delayDuration={0}>
      <SidebarProvider className="flex-col">
        <DashboardHeader />
        <div className="flex flex-1">
          <DashboardSidebar />
          <SidebarInset>
            <div className="flex flex-1 flex-col p-4">
              <PageContainer>{children}</PageContainer>
            </div>
          </SidebarInset>
        </div>
      </SidebarProvider>
    </TooltipProvider>
  );
}
