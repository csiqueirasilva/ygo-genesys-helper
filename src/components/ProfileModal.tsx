import { useState, useEffect } from 'react';
import type { UserProfile } from '../types';

interface ProfileModalProps {
  onClose: () => void;
}

export function ProfileModal({ onClose }: ProfileModalProps) {
  const [profile, setProfile] = useState<UserProfile>({ fullName: '', konamiId: '' });

  useEffect(() => {
    const saved = localStorage.getItem('ygo-user-profile');
    if (saved) {
      try {
        setProfile(JSON.parse(saved));
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
      <div className="w-full max-w-md space-y-6 rounded-[28px] border border-white/10 bg-panel p-6 shadow-2xl" onClick={e => e.stopPropagation()}>
        <div>
          <p className="text-xs uppercase tracking-[0.35em] text-cyan-200/80">User Settings</p>
          <h2 className="text-2xl font-bold text-white">Player Profile</h2>
        </div>

        <div className="space-y-4">
          <div className="space-y-1">
            <label className="text-xs font-semibold uppercase tracking-wider text-slate-400">Full Name</label>
            <input
              type="text"
              value={profile.fullName}
              onChange={e => setProfile({ ...profile, fullName: e.target.value })}
              placeholder="e.g. Seto Kaiba"
              className="w-full rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-white outline-none focus:border-cyan-500/50"
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-semibold uppercase tracking-wider text-slate-400">Konami Player ID</label>
            <input
              type="text"
              value={profile.konamiId}
              onChange={e => setProfile({ ...profile, konamiId: e.target.value })}
              placeholder="e.g. 0123456789"
              className="w-full rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-white outline-none focus:border-cyan-500/50"
            />
          </div>
        </div>

        <div className="flex justify-end gap-3 pt-4">
          <button onClick={onClose} className="rounded-full border border-white/10 px-6 py-2 text-sm font-semibold text-white hover:bg-white/5">
            Cancel
          </button>
          <button onClick={handleSave} className="rounded-full bg-cyan-500 px-8 py-2 text-sm font-bold text-slate-900 hover:bg-cyan-400">
            Save Profile
          </button>
        </div>
      </div>
    </div>
  );
}
