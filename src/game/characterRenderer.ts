import { COSMETICS } from './catalog';
import { GravityPreset, SkillId, WeaponId } from './types';

export interface CharacterRenderState {
  x: number;
  y: number;
  vx: number;
  vy: number;
  facing: 1 | -1;
  grounded: boolean;
  gravityPreset: GravityPreset;
  flipAngle: number; // smoothly interpolates 0 <-> Math.PI when inverted
  scaleX: number;
  scaleY: number;
  animTime: number;
  hitFlash: number;
  invulnTimer: number;
  shieldActive: boolean;
  wingsActive: boolean;
  weapon: WeaponId;
  attackTimer: number;
  comboStep: number;
  equippedOutfit: string;
  equippedGlasses: string;
  equippedHair: string;
  equippedAura: string;
  activeSkillEffect: SkillId | null;
}

function getCosmetic(id: string, fallbackId: string) {
  return COSMETICS.find((c) => c.id === id) || COSMETICS.find((c) => c.id === fallbackId)!;
}

export function drawPlayerCharacter(ctx: CanvasRenderingContext2D, p: CharacterRenderState) {
  const outfit = getCosmetic(p.equippedOutfit, 'original_ruffle');
  const glasses = getCosmetic(p.equippedGlasses, 'pink_blue_round');
  const hair = getCosmetic(p.equippedHair, 'high_ponytail');
  const aura = getCosmetic(p.equippedAura, 'pedestal_spark');

  // Flicker slightly during invulnerability frames
  if (p.invulnTimer > 0 && Math.floor(p.invulnTimer * 18) % 2 === 0 && !p.shieldActive) {
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
  // Rotate smoothly when inverted (-1G)
  ctx.rotate(p.flipAngle);
  ctx.scale(p.facing * p.scaleX, p.scaleY);

  const stride = p.grounded && Math.abs(p.vx) > 20 ? Math.sin(p.animTime * 15) : 0;
  const bob = p.grounded ? Math.abs(stride) * -2 : Math.sin(p.animTime * 6) * 2;

  // 1. Hover Pedestal / Gravity Disc Aura (inspired by figure stand in reference photo)
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

  // Optional Aether Wings when Skyward Wings skill active
  if (p.wingsActive) {
    ctx.save();
    const flap = Math.sin(p.animTime * 22) * 0.35;
    ctx.fillStyle = 'rgba(251, 191, 36, 0.85)';
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

  // 2. Back Hair (Ponytail / Twin-tails / Braid reacting to velocity & gravity)
  const hairTrail = Math.max(-14, Math.min(14, -p.vx * 0.03 * p.facing));
  const hairLift = Math.max(-10, Math.min(10, -p.vy * 0.02));
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
    // High ponytail swoop
    ctx.beginPath();
    ctx.moveTo(-6, -34 + bob);
    ctx.quadraticCurveTo(-22 + hairTrail, -36 + hairLift, -21 + hairTrail, -16 + hairLift);
    ctx.quadraticCurveTo(-13 + hairTrail * 0.5, -20, -8, -28 + bob);
    ctx.fill();
    // Hair tie
    ctx.fillStyle = hair.accentColor;
    ctx.beginPath();
    ctx.arc(-7, -32 + bob, 3, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();

  // 3. Legs & Jeans + Pink/Blue Sneakers
  ctx.save();
  const legSwing = stride * 6;
  // Back leg
  ctx.fillStyle = outfit.secondaryColor;
  ctx.beginPath();
  ctx.roundRect(-7 - legSwing * 0.5, 11 + bob, 6, 12, 2);
  ctx.fill();
  // Front leg
  ctx.beginPath();
  ctx.roundRect(1 + legSwing * 0.5, 11 + bob, 6, 12, 2);
  ctx.fill();

  // Rolled cuffs
  ctx.fillStyle = '#93C5FD';
  ctx.fillRect(-7 - legSwing * 0.5, 20 + bob, 6, 2.2);
  ctx.fillRect(1 + legSwing * 0.5, 20 + bob, 6, 2.2);

  // Sneakers (pink & blue matching image!)
  for (const offset of [-7 - legSwing * 0.5, 1 + legSwing * 0.5]) {
    ctx.fillStyle = outfit.primaryColor;
    ctx.beginPath();
    ctx.roundRect(offset - 1, 22 + bob, 8.5, 5.5, 2.5);
    ctx.fill();
    ctx.fillStyle = '#38BDF8';
    ctx.fillRect(offset + 3, 22.5 + bob, 4, 2.5);
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(offset - 1, 26.2 + bob, 8.5, 1.5);
  }
  ctx.restore();

  // 4. Torso (Ruffled Eyelet Pink Top or equipped Outfit)
  ctx.save();
  ctx.fillStyle = p.hitFlash > 0 ? '#FFFFFF' : outfit.primaryColor;
  ctx.beginPath();
  ctx.moveTo(-9, -4 + bob);
  ctx.lineTo(9, -4 + bob);
  ctx.lineTo(11, 11 + bob);
  ctx.lineTo(-11, 11 + bob);
  ctx.closePath();
  ctx.fill();

  // Ruffle collar / peplum trim
  ctx.fillStyle = outfit.accentColor;
  ctx.beginPath();
  ctx.ellipse(0, -2 + bob, 11.5, 4, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillRect(-10.5, 9.5 + bob, 21, 2.5);
  ctx.restore();

  // 5. Chibi Head (faithful large vinyl head proportions)
  ctx.save();
  ctx.translate(0, -17 + bob);

  // Ears & tiny pearl earrings
  ctx.fillStyle = '#F2C19E';
  ctx.beginPath();
  ctx.arc(-15.5, 1, 3.6, 0, Math.PI * 2);
  ctx.arc(15.5, 1, 3.6, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#F8FAFC';
  ctx.beginPath();
  ctx.arc(-15.5, 3, 1.4, 0, Math.PI * 2);
  ctx.arc(15.5, 3, 1.4, 0, Math.PI * 2);
  ctx.fill();

  // Head base
  ctx.fillStyle = p.hitFlash > 0 ? '#FFFFFF' : '#F4C6A4';
  ctx.beginPath();
  ctx.roundRect(-15.5, -14.5, 31, 26.5, 13);
  ctx.fill();

  // Subtle blush
  ctx.fillStyle = 'rgba(244, 114, 182, 0.28)';
  ctx.beginPath();
  ctx.ellipse(-8.5, 4.5, 3.5, 2, 0, 0, Math.PI * 2);
  ctx.ellipse(8.5, 4.5, 3.5, 2, 0, 0, Math.PI * 2);
  ctx.fill();

  // Hair cap & bangs
  ctx.fillStyle = hair.primaryColor;
  ctx.beginPath();
  ctx.arc(0, -4, 16, Math.PI, Math.PI * 2);
  ctx.fill();
  // Curved bangs strands
  ctx.beginPath();
  ctx.moveTo(-15, -5);
  ctx.quadraticCurveTo(-7, -14, -2, -6);
  ctx.quadraticCurveTo(4, -14, 10, -5);
  ctx.quadraticCurveTo(15, -10, 16, -2);
  ctx.lineTo(15, -10);
  ctx.arc(0, -5, 16, 0, Math.PI, true);
  ctx.fill();

  if (hair.id === 'crowned_bob') {
    ctx.fillStyle = hair.secondaryColor;
    ctx.beginPath();
    ctx.moveTo(-6, -17);
    ctx.lineTo(-4, -22);
    ctx.lineTo(0, -18);
    ctx.lineTo(4, -22);
    ctx.lineTo(6, -17);
    ctx.closePath();
    ctx.fill();
  }

  // Big glossy Funko-style eyes
  ctx.fillStyle = '#0F172A';
  ctx.beginPath();
  ctx.arc(-5.8, 0.5, 3.8, 0, Math.PI * 2);
  ctx.arc(6.6, 0.5, 3.8, 0, Math.PI * 2);
  ctx.fill();
  // Eye shine
  ctx.fillStyle = '#FFFFFF';
  ctx.beginPath();
  ctx.arc(-4.6, -0.7, 1.3, 0, Math.PI * 2);
  ctx.arc(7.8, -0.7, 1.3, 0, Math.PI * 2);
  ctx.fill();

  // Cheerful smile
  ctx.strokeStyle = '#9D4E3E';
  ctx.lineWidth = 1.4;
  ctx.beginPath();
  ctx.arc(0.5, 6.2, 3.4, 0.15, Math.PI - 0.15);
  ctx.stroke();

  // Signature Glasses!
  if (glasses.id === 'visor_cyan') {
    ctx.fillStyle = 'rgba(34, 211, 238, 0.35)';
    ctx.strokeStyle = glasses.primaryColor;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.roundRect(-13.5, -4, 27, 8.5, 4);
    ctx.fill();
    ctx.stroke();
  } else if (glasses.id === 'star_shades') {
    ctx.strokeStyle = glasses.primaryColor;
    ctx.lineWidth = 2.2;
    for (const gx of [-6, 6.8]) {
      ctx.beginPath();
      ctx.arc(gx, 0.5, 6.2, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.fillStyle = glasses.accentColor + '55';
    ctx.fill();
  } else {
    // Round Pink & Periwinkle Blue double-rim frames (matching photo!)
    for (const gx of [-6, 6.8]) {
      ctx.strokeStyle = glasses.secondaryColor;
      ctx.lineWidth = 2.8;
      ctx.beginPath();
      ctx.arc(gx, 0.5, 6.1, 0, Math.PI * 2);
      ctx.stroke();

      ctx.strokeStyle = glasses.primaryColor;
      ctx.lineWidth = 1.8;
      ctx.beginPath();
      ctx.arc(gx, 0.5, 7.1, 0, Math.PI * 2);
      ctx.stroke();
    }
    // Bridge
    ctx.strokeStyle = glasses.primaryColor;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0.2, 0.2);
    ctx.lineTo(0.8, 0.2);
    ctx.stroke();
  }

  ctx.restore(); // end head

  // 6. Equipped Weapon & Attack Animation
  ctx.save();
  ctx.translate(9, 2 + bob);
  const swinging = p.attackTimer > 0;
  const swingProg = swinging ? 1 - p.attackTimer / 0.26 : 0;

  if (p.weapon === 'sword') {
    const baseAngle = swinging ? -1.4 + swingProg * 2.7 + (p.comboStep === 2 ? -0.4 : 0) : -0.45;
    ctx.rotate(baseAngle);
    // Handle
    ctx.fillStyle = '#F59E0B';
    ctx.fillRect(-2, -3, 6, 6);
    // Starlight Blade
    const bladeGrad = ctx.createLinearGradient(4, 0, 34, 0);
    bladeGrad.addColorStop(0, '#F472B6');
    bladeGrad.addColorStop(1, '#38BDF8');
    ctx.fillStyle = bladeGrad;
    ctx.beginPath();
    ctx.moveTo(4, -3.5);
    ctx.lineTo(32 + (p.comboStep === 3 ? 8 : 0), 0);
    ctx.lineTo(4, 3.5);
    ctx.closePath();
    ctx.fill();
    // Slash energy arc
    if (swinging) {
      ctx.strokeStyle = p.comboStep === 3 ? '#FBBF24' : '#F472B6';
      ctx.lineWidth = p.comboStep === 3 ? 5 : 3;
      ctx.beginPath();
      ctx.arc(-4, 0, p.comboStep === 3 ? 44 : 36, -0.9, 0.9);
      ctx.stroke();
    }
  } else if (p.weapon === 'gun') {
    const recoil = swinging ? -4 * (1 - swingProg) : 0;
    ctx.translate(recoil, 0);
    ctx.fillStyle = '#1E293B';
    ctx.strokeStyle = '#38BDF8';
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.roundRect(0, -4, 18, 8, 2.5);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#EC4899';
    ctx.fillRect(14, -2.5, 5, 5);
    if (swinging) {
      ctx.fillStyle = p.comboStep === 3 ? '#FEF08A' : '#38BDF8';
      ctx.beginPath();
      ctx.arc(22, 0, p.comboStep === 3 ? 8 : 5, 0, Math.PI * 2);
      ctx.fill();
    }
  } else {
    // Orbital Nova Staff
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
