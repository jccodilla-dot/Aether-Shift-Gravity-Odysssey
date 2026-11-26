import React, { useRef, useState } from 'react';
import {
  Camera,
  Check,
  Gamepad2,
  Infinity as InfinityIcon,
  Maximize2,
  Music,
  Power,
  RotateCcw,
  Upload,
  User,
  Volume2,
  X,
} from 'lucide-react';
import { gameAudio } from '../game/audio';
import { CHARACTER_REFERENCE_IMAGE } from '../game/catalog';
import { PlayerProfile } from '../game/types';
import { AvatarPreviewCanvas } from './AvatarPreviewCanvas';

interface SettingsModalProps {
  profile: PlayerProfile;
  sfxOn: boolean;
  musicOn: boolean;
  showTouchPad: boolean;
  isFullscreen: boolean;
  onToggleSfx: () => void;
  onToggleMusic: () => void;
  onToggleTouchPad: () => void;
  onToggleFullscreen: () => void;
  onUpdateProfile: (next: PlayerProfile) => void;
  onExitGame: () => void;
  onClose: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  profile,
  sfxOn,
  musicOn,
  showTouchPad,
  isFullscreen,
  onToggleSfx,
  onToggleMusic,
  onToggleTouchPad,
  onToggleFullscreen,
  onUpdateProfile,
  onExitGame,
  onClose,
}) => {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [nameInput, setNameInput] = useState(profile.displayName || 'Sky Runner');
  const [uploadStatus, setUploadStatus] = useState<string | null>(null);
  const [savedNameNotice, setSavedNameNotice] = useState(false);

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      const result = typeof reader.result === 'string' ? reader.result : null;
      if (!result) return;

      const img = new Image();
      img.onload = () => {
        const size = 220;
        const canvas = document.createElement('canvas');
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        // Center-crop image into a crisp square medallion
        const side = Math.min(img.width, img.height);
        const sx = (img.width - side) / 2;
        const sy = Math.max(0, (img.height - side) * 0.25);
        ctx.drawImage(img, sx, sy, side, side, 0, 0, size, size);

        const dataUrl = canvas.toDataURL('image/jpeg', 0.84);
        gameAudio.playRewardChime();
        onUpdateProfile({
          ...profile,
          customPhotoDataUrl: dataUrl,
          usePhotoCharacter: true,
        });
        setUploadStatus('Your custom photo is now equipped on Sky Runner!');
      };
      img.src = result;
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const handleResetToAryaDefault = () => {
    gameAudio.playUiClick();
    onUpdateProfile({
      ...profile,
      customPhotoDataUrl: null,
      usePhotoCharacter: true,
    });
    setUploadStatus('Restored default Arya Sky Runner character image.');
  };

  const handleSaveName = () => {
    gameAudio.playUiClick();
    const clean = nameInput.trim().slice(0, 48) || 'Sky Runner';
    setNameInput(clean);
    onUpdateProfile({ ...profile, displayName: clean });
    setSavedNameNotice(true);
    setTimeout(() => setSavedNameNotice(false), 2000);
  };

  const activePortrait = profile.customPhotoDataUrl || CHARACTER_REFERENCE_IMAGE;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/85 p-4">
      <div className="flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-slate-800 bg-[#0D1326] text-slate-100 shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 px-6 py-4">
          <div>
            <h2 className="font-display text-xl font-bold text-white">Game Settings & Character Photo</h2>
            <p className="text-xs text-slate-400">
              Offline Profile · Upload Your Photo as Character · Audio & Display
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close Settings"
            className="rounded-lg border border-slate-700 p-2 text-slate-400 hover:text-white"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Custom Photo Character Section */}
          <div className="rounded-xl border border-slate-800 bg-slate-900/65 p-4 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm font-bold text-white">
                <Camera className="h-4 w-4 text-pink-400" />
                Character Portrait & Photo Upload
              </div>
              <span className="text-[11px] text-slate-400">
                {profile.customPhotoDataUrl ? 'Custom Photo Active' : 'Default: Arya (Sky Runner)'}
              </span>
            </div>

            <div className="grid gap-4 sm:grid-cols-[200px_1fr] items-center">
              <div className="flex items-center justify-center gap-2 rounded-xl border border-slate-800 bg-slate-950/70 p-3">
                <img
                  src={activePortrait}
                  alt="Equipped Portrait"
                  className="h-20 w-20 rounded-full border-2 border-pink-400 object-cover object-top"
                />
                <AvatarPreviewCanvas profile={profile} size={92} />
              </div>

              <div className="space-y-3">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handlePhotoUpload}
                  className="hidden"
                />
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="flex items-center gap-2 rounded-lg bg-pink-600 px-3.5 py-2 text-xs font-bold text-white hover:bg-pink-500"
                  >
                    <Upload className="h-3.5 w-3.5" />
                    Upload My Photo
                  </button>

                  {profile.customPhotoDataUrl && (
                    <button
                      type="button"
                      onClick={handleResetToAryaDefault}
                      className="flex items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-xs font-semibold text-slate-200 hover:bg-slate-800"
                    >
                      <RotateCcw className="h-3.5 w-3.5" />
                      Reset to Default
                    </button>
                  )}
                </div>

                <label className="flex cursor-pointer items-center justify-between rounded-lg border border-slate-800 bg-slate-950/60 px-3 py-2 text-xs">
                  <span className="text-slate-300">Show Photo Portrait as Character Head</span>
                  <input
                    type="checkbox"
                    checked={profile.usePhotoCharacter}
                    onChange={(e) => {
                      gameAudio.playUiClick();
                      onUpdateProfile({ ...profile, usePhotoCharacter: e.target.checked });
                    }}
                    className="h-4 w-4 accent-pink-500"
                  />
                </label>

                {uploadStatus && (
                  <div className="text-[11px] font-medium text-emerald-300">{uploadStatus}</div>
                )}
              </div>
            </div>
          </div>

          {/* Runner Display Name */}
          <div className="rounded-xl border border-slate-800 bg-slate-900/65 p-4 space-y-2.5">
            <label className="flex items-center gap-2 text-sm font-bold text-white">
              <User className="h-4 w-4 text-sky-400" />
              Runner Name
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={nameInput}
                maxLength={48}
                onChange={(e) => setNameInput(e.target.value)}
                placeholder="Sky Runner"
                className="flex-1 rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white focus:border-sky-400 focus:outline-none"
              />
              <button
                type="button"
                onClick={handleSaveName}
                className="flex items-center gap-1.5 rounded-lg bg-sky-500 px-4 py-2 text-xs font-bold text-slate-950 hover:bg-sky-400"
              >
                {savedNameNotice ? <Check className="h-3.5 w-3.5" /> : null}
                {savedNameNotice ? 'Saved' : 'Save Name'}
              </button>
            </div>
          </div>

          {/* Gameplay, Audio & Display Toggles */}
          <div className="grid gap-2.5 sm:grid-cols-2">
            <button
              type="button"
              onClick={() => {
                gameAudio.playUiClick();
                onUpdateProfile({ ...profile, infiniteLife: !profile.infiniteLife });
              }}
              className={`flex items-center justify-between rounded-xl border px-4 py-3 text-xs font-bold transition-colors ${
                profile.infiniteLife
                  ? 'border-emerald-400 bg-emerald-500/15 text-emerald-300'
                  : 'border-slate-700 bg-slate-900 text-slate-200'
              }`}
            >
              <span className="flex items-center gap-2">
                <InfinityIcon className="h-4 w-4" />
                Infinite Life Mode
              </span>
              <span>{profile.infiniteLife ? 'ON' : 'OFF'}</span>
            </button>

            <button
              type="button"
              onClick={onToggleSfx}
              className={`flex items-center justify-between rounded-xl border px-4 py-3 text-xs font-bold transition-colors ${
                sfxOn
                  ? 'border-sky-400/50 bg-slate-900 text-white'
                  : 'border-rose-500/40 bg-rose-950/40 text-rose-300'
              }`}
            >
              <span className="flex items-center gap-2">
                <Volume2 className="h-4 w-4" />
                Sound Effects
              </span>
              <span>{sfxOn ? 'ON' : 'OFF'}</span>
            </button>

            <button
              type="button"
              onClick={onToggleMusic}
              className={`flex items-center justify-between rounded-xl border px-4 py-3 text-xs font-bold transition-colors ${
                musicOn
                  ? 'border-sky-400/50 bg-slate-900 text-white'
                  : 'border-rose-500/40 bg-rose-950/40 text-rose-300'
              }`}
            >
              <span className="flex items-center gap-2">
                <Music className="h-4 w-4" />
                Background Music
              </span>
              <span>{musicOn ? 'ON' : 'OFF'}</span>
            </button>

            <button
              type="button"
              onClick={onToggleTouchPad}
              className={`flex items-center justify-between rounded-xl border px-4 py-3 text-xs font-bold transition-colors ${
                showTouchPad
                  ? 'border-pink-400/50 bg-slate-900 text-white'
                  : 'border-slate-700 bg-slate-900 text-slate-300'
              }`}
            >
              <span className="flex items-center gap-2">
                <Gamepad2 className="h-4 w-4" />
                On-Screen Touch Pad
              </span>
              <span>{showTouchPad ? 'ON' : 'OFF'}</span>
            </button>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-800 pt-4">
            <button
              type="button"
              onClick={onToggleFullscreen}
              className="flex items-center gap-2 rounded-xl border border-slate-700 bg-slate-900 px-4 py-2.5 text-xs font-semibold text-slate-200 hover:bg-slate-800"
            >
              <Maximize2 className="h-4 w-4" />
              {isFullscreen ? 'Exit HD Fullscreen' : 'Landscape HD Fullscreen'}
            </button>

            <button
              type="button"
              onClick={onExitGame}
              className="flex items-center gap-2 rounded-xl border border-rose-500/40 bg-rose-600/20 px-4 py-2.5 text-xs font-bold text-rose-200 hover:bg-rose-600/35"
            >
              <Power className="h-4 w-4" />
              Exit Game
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
