import { useState, useEffect } from 'react';
import type { UserProfile } from '../types';

interface ProfileModalProps {
  onClose: () => void;
}

export function ProfileModal({ onClose }: ProfileModalProps) {
  const [profile, setProfile] = useState<UserProfile>({ 
    fullName: '', 
    konamiId: '',
    residency: '',
    eventName: '',
    eventDate: new Date().toISOString().split('T')[0]
  });

  useEffect(() => {
    const saved = localStorage.getItem('ygo-user-profile');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setProfile(prev => ({ ...prev, ...parsed }));
      } catch (e) {
        console.error('Failed to load profile', e);
      }
    }
  }, []);

  const handleSave = () => {
    localStorage.setItem('ygo-user-profile', JSON.stringify(profile));
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-md p-4" onClick={onClose}>
      <div className="w-full max-w-md space-y-5 rounded-[28px] border border-white/10 bg-panel p-6 shadow-2xl" onClick={e => e.stopPropagation()}>
        <div>
          <p className="text-xs uppercase tracking-[0.35em] text-cyan-200/80">User Settings</p>
          <h2 className="text-2xl font-bold text-white">Player Profile</h2>
        </div>

        <div className="grid gap-4 max-h-[60vh] overflow-y-auto pr-2">
          <div className="space-y-1">
            <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Full Name</label>
            <input
              type="text"
              value={profile.fullName}
              onChange={e => setProfile({ ...profile, fullName: e.target.value })}
              placeholder="Seto Kaiba"
              className="w-full rounded-xl border border-white/5 bg-black/40 px-4 py-2.5 text-sm text-white outline-none focus:border-cyan-500/50"
            />
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Konami Player ID</label>
            <input
              type="text"
              value={profile.konamiId}
              onChange={e => setProfile({ ...profile, konamiId: e.target.value })}
              placeholder="0123456789"
              className="w-full rounded-xl border border-white/5 bg-black/40 px-4 py-2.5 text-sm text-white outline-none focus:border-cyan-500/50"
            />
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Country of Residency</label>
            <input
              type="text"
              value={profile.residency}
              onChange={e => setProfile({ ...profile, residency: e.target.value })}
              placeholder="e.g. Brazil"
              className="w-full rounded-xl border border-white/5 bg-black/40 px-4 py-2.5 text-sm text-white outline-none focus:border-cyan-500/50"
            />
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Event Name</label>
            <input
              type="text"
              value={profile.eventName}
              onChange={e => setProfile({ ...profile, eventName: e.target.value })}
              placeholder="e.g. YCS São Paulo"
              className="w-full rounded-xl border border-white/5 bg-black/40 px-4 py-2.5 text-sm text-white outline-none focus:border-cyan-500/50"
            />
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Event Date</label>
            <input
              type="date"
              value={profile.eventDate}
              onChange={e => setProfile({ ...profile, eventDate: e.target.value })}
              className="w-full rounded-xl border border-white/5 bg-black/40 px-4 py-2.5 text-sm text-white outline-none focus:border-cyan-500/50"
            />
          </div>
        </div>

        <div className="flex justify-end gap-3 pt-2">
          <button onClick={onClose} className="rounded-full border border-white/10 px-5 py-2 text-xs font-semibold text-white hover:bg-white/5">
            Cancel
          </button>
          <button onClick={handleSave} className="rounded-full bg-cyan-500 px-6 py-2 text-xs font-bold text-slate-900 hover:bg-cyan-400">
            Save Profile
          </button>
        </div>
      </div>
    </div>
  );
}
