import { CHARACTER_REFERENCE_IMAGE, COSMETICS } from './catalog';
import { GravityPreset, SkillId, WeaponId } from './types';

export interface CharacterRenderState {
  x: number;
  y: number;
  vx: number;
  vy: number;
  facing: 1 | -1;
  grounded: boolean;
  gravityPreset: GravityPreset;
  flipAngle: number;
  scaleX: number;
  scaleY: number;
  animTime: number;
  hitFlash: number;
  invulnTimer: number;
  shieldActive: boolean;
  wingsActive: boolean;
  hiddenPowerActive?: boolean;
  weapon: WeaponId;
  attackTimer: number;
  comboStep: number;
  equippedOutfit: string;
  equippedGlasses: string;
  equippedHair: string;
  equippedAura: string;
  activeSkillEffect: SkillId | null;
  photoUrl?: string | null;
  usePhotoCharacter?: boolean;
}

const imageCache = new Map<string, HTMLImageElement>();

function getCachedPortrait(url: string): HTMLImageElement | null {
  if (typeof window === 'undefined' || !url) return null;
  let img = imageCache.get(url);
  if (!img) {
    img = new Image();
    img.crossOrigin = 'anonymous';
    img.src = url;
    imageCache.set(url, img);
  }
  if (img.complete && img.naturalWidth > 0) {
    return img;
  }
  return null;
}

function getCosmetic(id: string, fallbackId: string) {
  return COSMETICS.find((c) => c.id === id) || COSMETICS.find((c) => c.id === fallbackId)!;
}

export function drawPlayerCharacter(ctx: CanvasRenderingContext2D, p: CharacterRenderState) {
  const outfit = getCosmetic(p.equippedOutfit, 'original_ruffle');
  const glasses = getCosmetic(p.equippedGlasses, 'pink_blue_round');
  const hair = getCosmetic(p.equippedHair, 'high_ponytail');
  const aura = getCosmetic(p.equippedAura, 'pedestal_spark');

  if (p.invulnTimer > 0 && Math.floor(p.invulnTimer * 18) % 2 === 0 && !p.shieldActive && !p.hiddenPowerActive) {
    ctx.save();
    ctx.globalAlpha = 0.55;
    drawCharacterInternal(ctx, p, outfit, glasses, hair, aura);
    ctx.restore();
    return;
  }
  drawCharacterInternal(ctx, p, outfit, glasses, hair, aura);
}

function drawCharacterInternal(
  ctx: CanvasRenderingContext2D,
  p: CharacterRenderState,
  outfit: ReturnType<typeof getCosmetic>,
  glasses: ReturnType<typeof getCosmetic>,
  hair: ReturnType<typeof getCosmetic>,
  aura: ReturnType<typeof getCosmetic>
) {
  ctx.save();
  ctx.translate(p.x, p.y);
  ctx.rotate(p.flipAngle);
  ctx.scale(p.facing * p.scaleX, p.scaleY);

  const stride = p.grounded && Math.abs(p.vx) > 20 ? Math.sin(p.animTime * 15) : 0;
  const bob = p.grounded ? Math.abs(stride) * -2 : Math.sin(p.animTime * 6) * 2;

  // Hidden 10s Power Golden-Prismatic Aura
  if (p.hiddenPowerActive) {
    ctx.save();
    const r = 42 + Math.sin(p.animTime * 14) * 4;
    const hGrad = ctx.createRadialGradient(0, -4, 6, 0, -4, r);
    hGrad.addColorStop(0, 'rgba(253, 224, 71, 0.35)');
    hGrad.addColorStop(0.65, 'rgba(244, 114, 182, 0.25)');
    hGrad.addColorStop(1, 'rgba(56, 189, 248, 0)');
    ctx.fillStyle = hGrad;
    ctx.beginPath();
    ctx.arc(0, -4, r, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = p.animTime % 0.3 < 0.15 ? '#FDE047' : '#38BDF8';
    ctx.lineWidth = 2.6;
    ctx.setLineDash([7, 5]);
    ctx.beginPath();
    ctx.arc(0, -4, r - 4, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.restore();
  }

  // 1. Hover Pedestal / Gravity Disc Aura
  ctx.save();
  const discGlow = ctx.createRadialGradient(0, 29, 2, 0, 29, 24);
  discGlow.addColorStop(0, aura.secondaryColor + '99');
  discGlow.addColorStop(1, aura.secondaryColor + '00');
  ctx.fillStyle = discGlow;
  ctx.beginPath();
  ctx.ellipse(0, 29, 24, 7, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = aura.primaryColor;
  ctx.strokeStyle = aura.accentColor;
  ctx.lineWidth = 1.6;
  ctx.beginPath();
  ctx.ellipse(0, 29, 17, 4.2, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.restore();

  // Optional Aether Wings
  if (p.wingsActive || p.hiddenPowerActive) {
    ctx.save();
    const flap = Math.sin(p.animTime * 22) * 0.35;
    ctx.fillStyle = p.hiddenPowerActive ? 'rgba(244, 114, 182, 0.85)' : 'rgba(251, 191, 36, 0.85)';
    ctx.strokeStyle = '#FEF08A';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(-6, -2 + bob);
    ctx.quadraticCurveTo(-34, -22 + flap * 24, -28, 6 + bob);
    ctx.quadraticCurveTo(-16, 4 + bob, -6, 6 + bob);
    ctx.fill();
    ctx.stroke();
    ctx.restore();
  }

  // 2. Back Hair
  const hairTrail = Math.max(-14, Math.min(14, -p.vx * 0.03 * p.facing));
  const hairLift = Math.max(-10, Math.min(10, -p.vy * 0.02));
  const usePhoto = p.usePhotoCharacter !== false;
  const activePhotoSrc = p.photoUrl || CHARACTER_REFERENCE_IMAGE;
  const portraitImg = usePhoto ? getCachedPortrait(activePhotoSrc) : null;

  if (!portraitImg) {
    ctx.save();
    ctx.fillStyle = hair.primaryColor;
    if (hair.id === 'cosmic_twintails') {
      for (const side of [-1, 1]) {
        ctx.beginPath();
        ctx.moveTo(side * 12, -24 + bob);
        ctx.quadraticCurveTo(side * 24 + hairTrail, -14 + hairLift, side * 19 + hairTrail, 2 + hairLift);
        ctx.quadraticCurveTo(side * 12, -8, side * 10, -18 + bob);
        ctx.fill();
        ctx.fillStyle = hair.secondaryColor;
        ctx.beginPath();
        ctx.arc(side * 19 + hairTrail, 2 + hairLift, 3.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = hair.primaryColor;
      }
    } else if (hair.id === 'nebula_braid') {
      ctx.beginPath();
      ctx.moveTo(-10, -24 + bob);
      ctx.quadraticCurveTo(-24 + hairTrail, -8 + hairLift, -20 + hairTrail, 12 + hairLift);
      ctx.quadraticCurveTo(-11, 2, -6, -18 + bob);
      ctx.fill();
      ctx.fillStyle = hair.accentColor;
      ctx.beginPath();
      ctx.arc(-20 + hairTrail, 12 + hairLift, 3.5, 0, Math.PI * 2);
      ctx.fill();
    } else if (hair.id === 'high_ponytail') {
      ctx.beginPath();
      ctx.moveTo(-6, -34 + bob);
      ctx.quadraticCurveTo(-22 + hairTrail, -36 + hairLift, -21 + hairTrail, -16 + hairLift);
      ctx.quadraticCurveTo(-13 + hairTrail * 0.5, -20, -8, -28 + bob);
      ctx.fill();
      ctx.fillStyle = hair.accentColor;
      ctx.beginPath();
      ctx.arc(-7, -32 + bob, 3, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  // 3. Legs & Boots / Sneakers
  ctx.save();
  const legSwing = stride * 6;
  ctx.fillStyle = outfit.secondaryColor;
  ctx.beginPath();
  ctx.roundRect(-7 - legSwing * 0.5, 11 + bob, 6, 12, 2);
  ctx.fill();
  ctx.beginPath();
  ctx.roundRect(1 + legSwing * 0.5, 11 + bob, 6, 12, 2);
  ctx.fill();

  for (const offset of [-7 - legSwing * 0.5, 1 + legSwing * 0.5]) {
    ctx.fillStyle = outfit.primaryColor;
    ctx.beginPath();
    ctx.roundRect(offset - 1, 22 + bob, 8.5, 5.5, 2.5);
    ctx.fill();
    ctx.fillStyle = '#FEF08A';
    ctx.fillRect(offset + 3, 22.5 + bob, 4, 2.5);
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(offset - 1, 26.2 + bob, 8.5, 1.5);
  }
  ctx.restore();

  // 4. Princess / Runner Dress & Tunic Torso
  ctx.save();
  ctx.fillStyle = p.hitFlash > 0 ? '#FFFFFF' : outfit.primaryColor;
  ctx.beginPath();
  ctx.moveTo(-9, -4 + bob);
  ctx.lineTo(9, -4 + bob);
  ctx.lineTo(14, 13 + bob);
  ctx.lineTo(-14, 13 + bob);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = outfit.accentColor;
  ctx.beginPath();
  ctx.ellipse(0, -2 + bob, 11.5, 4, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillRect(-13, 10 + bob, 26, 2.8);
  ctx.restore();

  // 5. Head (Circular Portrait Avatar OR Classic Stylized Head)
  ctx.save();
  ctx.translate(0, -18 + bob);

  if (portraitImg) {
    // Draw unflipped portrait inside circular gold/rose medallion frame so faces always look crisp
    ctx.save();
    ctx.scale(p.facing, 1);
    const radius = 17.5;
    ctx.beginPath();
    ctx.arc(0, 0, radius, 0, Math.PI * 2);
    ctx.closePath();
    ctx.save();
    ctx.clip();

    const iw = portraitImg.naturalWidth;
    const ih = portraitImg.naturalHeight;
    const cropSize = Math.min(iw, ih) * 0.65;
    const sx = (iw - cropSize) * 0.5;
    const sy = Math.max(0, (ih - cropSize) * 0.14);
    ctx.drawImage(portraitImg, sx, sy, cropSize, cropSize, -radius, -radius, radius * 2, radius * 2);

    if (p.hitFlash > 0) {
      ctx.fillStyle = 'rgba(255,255,255,0.65)';
      ctx.fillRect(-radius, -radius, radius * 2, radius * 2);
    }
    ctx.restore();

    ctx.strokeStyle = p.hiddenPowerActive ? '#FDE047' : outfit.accentColor;
    ctx.lineWidth = 2.4;
    ctx.beginPath();
    ctx.arc(0, 0, radius, 0, Math.PI * 2);
    ctx.stroke();

    // Subtle royal sparkle glint on top of portrait ring
    ctx.fillStyle = '#FEF08A';
    ctx.beginPath();
    ctx.arc(0, -radius - 1, 2.2, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  } else {
    // Classic chibi fallback if photo head is turned off
    ctx.fillStyle = p.hitFlash > 0 ? '#FFFFFF' : '#F4C6A4';
    ctx.beginPath();
    ctx.roundRect(-15.5, -14.5, 31, 26.5, 13);
    ctx.fill();

    ctx.fillStyle = hair.primaryColor;
    ctx.beginPath();
    ctx.arc(0, -4, 16, Math.PI, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#0F172A';
    ctx.beginPath();
    ctx.arc(-5.8, 0.5, 3.8, 0, Math.PI * 2);
    ctx.arc(6.6, 0.5, 3.8, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#FFFFFF';
    ctx.beginPath();
    ctx.arc(-4.6, -0.7, 1.3, 0, Math.PI * 2);
    ctx.arc(7.8, -0.7, 1.3, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = '#9D4E3E';
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.arc(0.5, 6.2, 3.4, 0.15, Math.PI - 0.15);
    ctx.stroke();
  }

  ctx.restore(); // end head

  // 6. Equipped Weapon (3 starter + 5 Super Weapons)
  ctx.save();
  ctx.translate(10, 2 + bob);
  const swinging = p.attackTimer > 0;
  const swingProg = swinging ? 1 - p.attackTimer / 0.26 : 0;

  if (p.weapon === 'sword' || p.weapon === 'super_laser_sword') {
    const isSuperSword = p.weapon === 'super_laser_sword';
    const baseAngle = swinging ? -1.4 + swingProg * 2.7 + (p.comboStep === 2 ? -0.4 : 0) : -0.45;
    ctx.rotate(baseAngle);
    ctx.fillStyle = isSuperSword ? '#22D3EE' : '#F59E0B';
    ctx.fillRect(-2, -3, 7, 6);
    const bladeLen = (isSuperSword ? 68 : 32) + (p.comboStep === 3 ? 10 : 0);
    const bladeGrad = ctx.createLinearGradient(4, 0, bladeLen, 0);
    bladeGrad.addColorStop(0, isSuperSword ? '#E879F9' : '#F472B6');
    bladeGrad.addColorStop(1, isSuperSword ? '#22D3EE' : '#38BDF8');
    ctx.fillStyle = bladeGrad;
    ctx.beginPath();
    ctx.moveTo(4, isSuperSword ? -5 : -3.5);
    ctx.lineTo(bladeLen, 0);
    ctx.lineTo(4, isSuperSword ? 5 : 3.5);
    ctx.closePath();
    ctx.fill();
    if (swinging) {
      ctx.strokeStyle = isSuperSword ? '#E879F9' : p.comboStep === 3 ? '#FBBF24' : '#F472B6';
      ctx.lineWidth = isSuperSword ? 5.5 : p.comboStep === 3 ? 5 : 3;
      ctx.beginPath();
      ctx.arc(-4, 0, isSuperSword ? 74 : p.comboStep === 3 ? 44 : 36, -0.95, 0.95);
      ctx.stroke();
    }
  } else if (p.weapon === 'staff') {
    const angle = swinging ? -0.8 + swingProg * 1.6 : -0.3;
    ctx.rotate(angle);
    ctx.strokeStyle = '#C084FC';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(0, 8);
    ctx.lineTo(16, -16);
    ctx.stroke();
    ctx.fillStyle = swinging ? '#FDE047' : '#A855F7';
    ctx.beginPath();
    ctx.arc(17, -18, swinging ? 6.5 : 4.8, 0, Math.PI * 2);
    ctx.fill();
  } else {
    // Gun / Super Guns
    const recoil = swinging ? -4 * (1 - swingProg) : 0;
    ctx.translate(recoil, 0);
    const gunBodyColor =
      p.weapon === 'super_ultra_laser'
        ? '#0E7490'
        : p.weapon === 'super_spread_fireball'
        ? '#9A3412'
        : p.weapon === 'super_round_fireball'
        ? '#854D0E'
        : p.weapon === 'super_machine_gun'
        ? '#14532D'
        : '#1E293B';
    const gunTrimColor =
      p.weapon === 'super_ultra_laser'
        ? '#22D3EE'
        : p.weapon === 'super_spread_fireball'
        ? '#F97316'
        : p.weapon === 'super_round_fireball'
        ? '#FACC15'
        : p.weapon === 'super_machine_gun'
        ? '#4ADE80'
        : '#38BDF8';
    const len = p.weapon === 'gun' ? 18 : 25;
    ctx.fillStyle = gunBodyColor;
    ctx.strokeStyle = gunTrimColor;
    ctx.lineWidth = 1.8;
    ctx.beginPath();
    ctx.roundRect(0, -5, len, 10, 3);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = gunTrimColor;
    ctx.fillRect(len - 4, -3, 6, 6);
    if (swinging) {
      ctx.fillStyle = '#FEF08A';
      ctx.beginPath();
      ctx.arc(len + 6, 0, p.weapon === 'gun' ? 6 : 9, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  ctx.restore();

  // 7. Tidal Bubble Shield Overlay
  if (p.shieldActive) {
    ctx.save();
    ctx.strokeStyle = '#22D3EE';
    ctx.fillStyle = 'rgba(34, 211, 238, 0.16)';
    ctx.lineWidth = 2.4;
    ctx.beginPath();
    ctx.arc(0, -4, 34 + Math.sin(p.animTime * 8) * 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.restore();
  }

  ctx.restore();
}
