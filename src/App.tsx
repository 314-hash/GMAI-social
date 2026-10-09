import React, { useState } from 'react';
import { WalletProvider, useWallet } from './contexts/WalletContext';
import { ChatProvider, useChat } from './contexts/ChatContext';
import { Header } from './components/Header';
import { Sidebar } from './components/Sidebar';
import { ChatArea } from './components/ChatArea';
import { RoomDetailsPanel } from './components/RoomDetailsPanel';
import { CreateRoomModal } from './components/CreateRoomModal';
import { AuthModal } from './components/AuthModal';
import { DiscoverRoomsModal } from './components/DiscoverRoomsModal';
import { WalletConnectModal } from './components/WalletConnectModal';
import { ToastContainer, ToastMessage } from './components/Toast';
import { ErrorBoundary } from './components/ErrorBoundary';

const MainApp: React.FC = () => {
  const { setActiveRoomId } = useChat();

  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isDiscoverModalOpen, setIsDiscoverModalOpen] = useState(false);
  const [isWalletModalOpen, setIsWalletModalOpen] = useState(false);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const showToast = (text: string, type: 'success' | 'error' | 'info' = 'info') => {
    const newToast: ToastMessage = {
      id: 'toast_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4),
      text,
      type,
    };
    setToasts(prev => [...prev, newToast]);
  };

  const dismissToast = (id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  };

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-gmai-dark text-slate-100 font-sans">
      {/* Top Application Header */}
      <Header
        onOpenAuthModal={() => setIsAuthModalOpen(true)}
        onOpenWalletModal={() => setIsWalletModalOpen(true)}
        onToggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)}
        onShowToast={showToast}
      />

      {/* Main Multi-Column Chat Interface */}
      <div className="flex flex-1 min-h-0 overflow-hidden relative">
        {/* Left Navigation Sidebar */}
        <Sidebar
          isOpen={isSidebarOpen}
          onClose={() => setIsSidebarOpen(false)}
          onOpenCreateModal={() => setIsCreateModalOpen(true)}
          onOpenDiscoverModal={() => setIsDiscoverModalOpen(true)}
        />

        {/* Central Real-Time Chat Area */}
        <ChatArea
          onToggleDetails={() => setIsDetailsOpen(!isDetailsOpen)}
          isDetailsOpen={isDetailsOpen}
          onOpenAuthModal={() => setIsAuthModalOpen(true)}
          onShowToast={showToast}
        />

        {/* Right Collapsible Room Intelligence Panel */}
        <RoomDetailsPanel
          isOpen={isDetailsOpen}
          onClose={() => setIsDetailsOpen(false)}
          onShowToast={showToast}
        />
      </div>

      {/* Modals & Dialogs */}
      <WalletConnectModal
        isOpen={isWalletModalOpen}
        onClose={() => setIsWalletModalOpen(false)}
        onShowToast={showToast}
      />

      <CreateRoomModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onShowToast={showToast}
      />

      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        onOpenWalletModal={() => setIsWalletModalOpen(true)}
        onShowToast={showToast}
      />

      <DiscoverRoomsModal
        isOpen={isDiscoverModalOpen}
        onClose={() => setIsDiscoverModalOpen(false)}
        onSelectRoom={roomId => setActiveRoomId(roomId)}
        onOpenCreateModal={() => {
          setIsDiscoverModalOpen(false);
          setIsCreateModalOpen(true);
        }}
      />

      {/* Global Notifications */}
      <ToastContainer toasts={toasts} onDismiss={dismissToast} />
    </div>
  );
};

export default function App() {
  return (
    <ErrorBoundary>
      <WalletProvider>
        <ChatProvider>
          <MainApp />
        </ChatProvider>
      </WalletProvider>
    </ErrorBoundary>
  );
}
