import React, { useState, useEffect } from 'react';
import { Header } from './components/Header';
import { HomeView } from './components/HomeView';
import { DeductionRoom } from './components/DeductionRoom';
import { ScriptManager } from './components/ScriptManager';
import { GuideView } from './components/GuideView';
import { RoomCreateModal } from './components/RoomCreateModal';
import { ServerSettingsModal } from './components/ServerSettingsModal';
import { ExportModal } from './components/ExportModal';
import { DEFAULT_SCRIPTS } from './data/defaultScripts';
import {
  Script,
  RoomState,
  OpenClawConfig,
  EngineMode,
} from './types/script';
import { OpenClawOrchestrator } from './services/openclawService';

export default function App() {
  const [activeTab, setActiveTab] = useState<'home' | 'room' | 'scripts' | 'guide'>('home');
  const [scripts, setScripts] = useState<Script[]>(() => {
    const saved = localStorage.getItem('claw_scripts');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        return DEFAULT_SCRIPTS;
      }
    }
    return DEFAULT_SCRIPTS;
  });

  const [openclawConfig, setOpenclawConfig] = useState<OpenClawConfig>(() => {
    const saved = localStorage.getItem('claw_server_config');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        // default fallback
      }
    }
    return {
      serverUrl: 'http://47.98.120.88:8000',
      wsUrl: 'ws://47.98.120.88:8000/ws',
      apiToken: '',
      engineMode: 'LOCAL_AUTONOMOUS',
      speed: 'normal',
      allowPrivateChat: true,
      status: 'simulated',
    };
  });

  const [orchestrator, setOrchestrator] = useState<OpenClawOrchestrator | null>(null);
  const [roomState, setRoomState] = useState<RoomState | null>(null);

  // Modals
  const [showCreateRoomModal, setShowCreateRoomModal] = useState(false);
  const [showServerSettingsModal, setShowServerSettingsModal] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);
  const [selectedScriptForRoom, setSelectedScriptForRoom] = useState<string | undefined>(undefined);

  // Persist scripts
  useEffect(() => {
    localStorage.setItem('claw_scripts', JSON.stringify(scripts));
  }, [scripts]);

  // Persist server config
  useEffect(() => {
    localStorage.setItem('claw_server_config', JSON.stringify(openclawConfig));
  }, [openclawConfig]);

  // Quick launch deduction
  const handleLaunchScript = (
    script: Script,
    engineMode: EngineMode = openclawConfig.engineMode,
    speed: 'slow' | 'normal' | 'fast' = 'normal',
    allowPrivateChat: boolean = true
  ) => {
    const newOrchestrator = new OpenClawOrchestrator(
      script,
      {
        ...openclawConfig,
        engineMode,
        speed,
        allowPrivateChat,
      },
      (updatedState) => {
        setRoomState(updatedState);
      }
    );

    setOrchestrator(newOrchestrator);
    setRoomState(newOrchestrator.getState());
    setActiveTab('room');
    setShowCreateRoomModal(false);

    // Auto start deduction loop
    setTimeout(() => {
      newOrchestrator.play();
    }, 400);
  };

  const handleSelectScriptToPlay = (script: Script) => {
    // Open creation modal with this script selected
    setSelectedScriptForRoom(script.id);
    setShowCreateRoomModal(true);
  };

  const handleSaveScript = (savedScript: Script) => {
    setScripts((prev) => {
      const idx = prev.findIndex((s) => s.id === savedScript.id);
      if (idx >= 0) {
        const copy = [...prev];
        copy[idx] = savedScript;
        return copy;
      }
      return [savedScript, ...prev];
    });
  };

  const handleDeleteScript = (id: string) => {
    setScripts((prev) => prev.filter((s) => s.id !== id));
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-amber-500/30 selection:text-amber-200">
      <Header
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        openclawConfig={openclawConfig}
        onOpenServerSettings={() => setShowServerSettingsModal(true)}
        onOpenCreateRoom={() => {
          setSelectedScriptForRoom(scripts[0]?.id);
          setShowCreateRoomModal(true);
        }}
        hasActiveRoom={!!roomState}
      />

      <div className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 pt-6">
        {activeTab === 'home' && (
          <HomeView
            scripts={scripts}
            openclawConfig={openclawConfig}
            onSelectScriptToPlay={handleSelectScriptToPlay}
            onOpenCreateRoom={() => {
              setSelectedScriptForRoom(scripts[0]?.id);
              setShowCreateRoomModal(true);
            }}
            onOpenServerSettings={() => setShowServerSettingsModal(true)}
            onGoToScripts={() => setActiveTab('scripts')}
            onGoToGuide={() => setActiveTab('guide')}
          />
        )}

        {activeTab === 'room' && orchestrator && roomState && (
          <DeductionRoom
            orchestrator={orchestrator}
            roomState={roomState}
            onExit={() => setActiveTab('home')}
            onOpenExportModal={() => setShowExportModal(true)}
          />
        )}

        {activeTab === 'scripts' && (
          <ScriptManager
            scripts={scripts}
            onSaveScript={handleSaveScript}
            onDeleteScript={handleDeleteScript}
            onSelectScriptToPlay={handleSelectScriptToPlay}
          />
        )}

        {activeTab === 'guide' && <GuideView />}
      </div>

      {/* Modals */}
      {showCreateRoomModal && (
        <RoomCreateModal
          scripts={scripts}
          selectedScriptId={selectedScriptForRoom}
          openclawConfig={openclawConfig}
          onClose={() => setShowCreateRoomModal(false)}
          onStartDeduction={handleLaunchScript}
        />
      )}

      {showServerSettingsModal && (
        <ServerSettingsModal
          config={openclawConfig}
          onSaveConfig={(newConfig) => setOpenclawConfig(newConfig)}
          onClose={() => setShowServerSettingsModal(false)}
        />
      )}

      {showExportModal && roomState && (
        <ExportModal
          roomState={roomState}
          onClose={() => setShowExportModal(false)}
        />
      )}
    </div>
  );
}
