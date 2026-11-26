import React, { useEffect, useRef } from 'react';
import { drawPlayerCharacter } from '../game/characterRenderer';
import { PlayerProfile } from '../game/types';

interface Props {
  profile: PlayerProfile;
  size?: number;
}

export const AvatarPreviewCanvas: React.FC<Props> = ({ profile, size = 156 }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let raf = 0;
    const start = performance.now();

    const draw = (now: number) => {
      raf = requestAnimationFrame(draw);
      const t = (now - start) / 1000;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = size * dpr;
      canvas.height = size * dpr;

      ctx.save();
      ctx.scale(dpr, dpr);
      ctx.clearRect(0, 0, size, size);

      // Soft studio radial backdrop
      const grad = ctx.createRadialGradient(size / 2, size / 2, 10, size / 2, size / 2, size * 0.55);
      grad.addColorStop(0, 'rgba(56, 189, 248, 0.22)');
      grad.addColorStop(1, 'rgba(15, 23, 42, 0)');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, size, size);

      ctx.save();
      const zoom = size / 96;
      ctx.translate(size / 2, size * 0.58);
      ctx.scale(zoom, zoom);
      drawPlayerCharacter(ctx, {
        x: 0,
        y: Math.sin(t * 2.4) * 2,
        vx: 0,
        vy: 0,
        facing: 1,
        grounded: true,
        gravityPreset: 'normal',
        flipAngle: 0,
        scaleX: 1,
        scaleY: 1,
        animTime: t,
        hitFlash: 0,
        invulnTimer: 0,
        shieldActive: false,
        wingsActive: false,
        hiddenPowerActive: false,
        weapon: profile.equippedWeapon,
        attackTimer: 0,
        comboStep: 1,
        equippedOutfit: profile.equippedOutfit,
        equippedGlasses: profile.equippedGlasses,
        equippedHair: profile.equippedHair,
        equippedAura: profile.equippedAura,
        activeSkillEffect: null,
        photoUrl: profile.customPhotoDataUrl,
        usePhotoCharacter: profile.usePhotoCharacter,
      });
      ctx.restore();
      ctx.restore();
    };

    raf = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(raf);
  }, [profile, size]);

  return (
    <canvas
      ref={canvasRef}
      style={{ width: size, height: size }}
      className="block shrink-0"
      aria-label="Customized Sky Runner Preview"
    />
  );
};
