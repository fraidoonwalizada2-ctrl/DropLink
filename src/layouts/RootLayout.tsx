import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { Navbar } from '@/components/layout/Navbar';
import { Footer } from '@/components/layout/Footer';
import { PageContainer } from '@/components/layout/PageContainer';
import { Modal } from '@/components/common/Modal';
import { AboutPage } from '@/pages/AboutPage';

export const RootLayout: React.FC = () => {
  const [isAboutOpen, setIsAboutOpen] = useState(false);

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 transition-colors">
      <Navbar onOpenAbout={() => setIsAboutOpen(true)} />
      
      <PageContainer>
        <Outlet />
      </PageContainer>

      <Footer />

      {/* Global About Modal */}
      <Modal
        isOpen={isAboutOpen}
        onClose={() => setIsAboutOpen(false)}
      >
        <AboutPage />
      </Modal>
    </div>
  );
};
