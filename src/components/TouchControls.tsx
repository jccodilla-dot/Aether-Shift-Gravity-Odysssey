import React from 'react';
import { ArrowLeft, ArrowRight, ArrowUp, ArrowUpDown, Orbit, Sparkles, Swords } from 'lucide-react';
import { GRAVITY_PRESETS } from '../game/catalog';
import { GravityPreset, SkillId } from '../game/types';

interface Props {
  onMoveChange: (dir: number) => void;
  onAction: (action: 'jump' | 'attack' | 'invert' | 'cycle_grav' | 'skill') => void;
  onAttackHoldChange?: (held: boolean) => void;
  gravityPreset: GravityPreset;
  equippedSkill: SkillId | null;
  skillCooldown: number;
  hiddenPowerTimer?: number;
}

export const TouchControls: React.FC<Props> = ({
  onMoveChange,
  onAction,
  onAttackHoldChange,
  gravityPreset,
  equippedSkill,
  skillCooldown,
  hiddenPowerTimer = 0,
}) => {
  const gravInfo = GRAVITY_PRESETS[gravityPreset];

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-0 z-30 flex items-end justify-between safe-area-touch">
      {/* Left Thumb Movement Cluster */}
      <div className="pointer-events-auto flex items-center gap-2.5 sm:gap-3">
        <button
          type="button"
          aria-label="Move Left"
          onPointerDown={(e) => {
            e.preventDefault();
            onMoveChange(-1);
          }}
          onPointerUp={() => onMoveChange(0)}
          onPointerLeave={() => onMoveChange(0)}
          onPointerCancel={() => onMoveChange(0)}
          className="flex h-12 w-12 sm:h-14 sm:w-14 items-center justify-center rounded-xl border border-white/20 bg-slate-900/75 text-white active:scale-95 active:bg-pink-600/80"
        >
          <ArrowLeft className="h-5 w-5 sm:h-6 sm:w-6" />
        </button>
        <button
          type="button"
          aria-label="Move Right"
          onPointerDown={(e) => {
            e.preventDefault();
            onMoveChange(1);
          }}
          onPointerUp={() => onMoveChange(0)}
          onPointerLeave={() => onMoveChange(0)}
          onPointerCancel={() => onMoveChange(0)}
          className="flex h-12 w-12 sm:h-14 sm:w-14 items-center justify-center rounded-xl border border-white/20 bg-slate-900/75 text-white active:scale-95 active:bg-pink-600/80"
        >
          <ArrowRight className="h-5 w-5 sm:h-6 sm:w-6" />
        </button>
      </div>

      {/* Right Thumb Action & Gravity Cluster */}
      <div className="pointer-events-auto grid grid-cols-3 gap-2 sm:gap-2.5">
        {equippedSkill ? (
          <button
            type="button"
            aria-label="Activate Special Skill"
            onPointerDown={(e) => {
              e.preventDefault();
              onAction('skill');
            }}
            disabled={skillCooldown > 0}
            className="flex h-11 w-11 sm:h-13 sm:w-13 flex-col items-center justify-center rounded-xl border border-emerald-400/40 bg-slate-900/80 text-emerald-300 disabled:opacity-45 active:scale-95"
          >
            <Sparkles className="h-4 w-4" />
            <span className="font-mono-num text-[10px] font-bold">
              {skillCooldown > 0 ? Math.ceil(skillCooldown) : 'SKILL'}
            </span>
          </button>
        ) : (
          <div className="h-11 w-11 sm:h-13 sm:w-13" />
        )}

        <button
          type="button"
          aria-label="Cycle Gravity Level"
          onPointerDown={(e) => {
            e.preventDefault();
            onAction('cycle_grav');
          }}
          className="flex h-11 w-11 sm:h-13 sm:w-13 flex-col items-center justify-center rounded-xl border border-sky-400/40 bg-slate-900/80 text-sky-300 active:scale-95"
        >
          <Orbit className="h-4 w-4" />
          <span className="font-mono-num text-[10px] font-bold">{gravInfo.shortLabel}</span>
        </button>

        <button
          type="button"
          aria-label="Invert Gravity"
          onPointerDown={(e) => {
            e.preventDefault();
            onAction('invert');
          }}
          className="flex h-11 w-11 sm:h-13 sm:w-13 flex-col items-center justify-center rounded-xl border border-purple-400/45 bg-slate-900/80 text-purple-300 active:scale-95"
        >
          <ArrowUpDown className="h-4 w-4" />
          <span className="text-[10px] font-bold">FLIP</span>
        </button>

        <div className="flex h-12 w-12 sm:h-14 sm:w-14 items-center justify-center">
          {hiddenPowerTimer > 0 && (
            <div className="rounded-lg border border-amber-300/60 bg-amber-500/25 px-1.5 py-1 text-center font-mono-num text-[10px] font-extrabold text-amber-200">
              {hiddenPowerTimer.toFixed(0)}s
            </div>
          )}
        </div>

        <button
          type="button"
          aria-label="Attack Combo"
          onPointerDown={(e) => {
            e.preventDefault();
            onAction('attack');
            onAttackHoldChange?.(true);
          }}
          onPointerUp={() => onAttackHoldChange?.(false)}
          onPointerLeave={() => onAttackHoldChange?.(false)}
          onPointerCancel={() => onAttackHoldChange?.(false)}
          className="flex h-12 w-12 sm:h-14 sm:w-14 flex-col items-center justify-center rounded-xl border border-pink-400/50 bg-pink-600/85 text-white active:scale-95"
        >
          <Swords className="h-5 w-5" />
          <span className="text-[10px] font-bold">ATK</span>
        </button>

        <button
          type="button"
          aria-label="Jump"
          onPointerDown={(e) => {
            e.preventDefault();
            onAction('jump');
          }}
          className="flex h-12 w-12 sm:h-14 sm:w-14 flex-col items-center justify-center rounded-xl border border-amber-400/50 bg-amber-500/85 text-slate-950 active:scale-95"
        >
          <ArrowUp className="h-5 w-5" />
          <span className="text-[10px] font-bold">JUMP</span>
        </button>
      </div>
    </div>
  );
};
