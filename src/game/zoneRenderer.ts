import { getZoneConfig } from './catalog';
import { EnemyKind, ZoneId } from './types';

export interface RenderEnemy {
  id: number;
  kind: EnemyKind;
  x: number;
  y: number;
  w: number;
  h: number;
  hp: number;
  maxHp: number;
  facing: 1 | -1;
  hitFlash: number;
  telegraphTimer: number;
  animSeed: number;
}

export interface RenderBoss {
  active: boolean;
  zoneId: ZoneId;
  x: number;
  y: number;
  w: number;
  h: number;
  hp: number;
  maxHp: number;
  phase: number;
  hitFlash: number;
  telegraphTimer: number;
  attackPattern: string;
  animTime: number;
}

export function drawZoneBackground(
  ctx: CanvasRenderingContext2D,
  zoneId: ZoneId,
  camX: number,
  width: number,
  height: number,
  time: number
) {
  const zone = getZoneConfig(zoneId);
  const grad = ctx.createLinearGradient(0, 0, 0, height);
  grad.addColorStop(0, zone.skyTop);
  grad.addColorStop(1, zone.skyBottom);
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, width, height);

  if (zone.key === 'sea' || zone.key === 'forest') {
    const isForest = zone.key === 'forest';
    ctx.save();
    for (let i = 0; i < 6; i++) {
      const rx = ((i * 290 - camX * 0.12) % (width + 320)) - 120;
      const beamGrad = ctx.createLinearGradient(rx, 0, rx + 80, height);
      beamGrad.addColorStop(0, isForest ? 'rgba(134, 239, 172, 0.14)' : 'rgba(103, 232, 249, 0.14)');
      beamGrad.addColorStop(1, 'rgba(6, 70, 99, 0)');
      ctx.fillStyle = beamGrad;
      ctx.beginPath();
      ctx.moveTo(rx, 0);
      ctx.lineTo(rx + 90, 0);
      ctx.lineTo(rx + 190, height);
      ctx.lineTo(rx + 40, height);
      ctx.closePath();
      ctx.fill();
    }
    ctx.fillStyle = isForest ? '#064E3B' : '#032B43';
    for (let i = 0; i < 12; i++) {
      const kx = ((i * 180 - camX * 0.28) % (width + 240)) - 80;
      const sway = Math.sin(time * 1.8 + i) * 14;
      ctx.beginPath();
      ctx.moveTo(kx, height);
      ctx.quadraticCurveTo(kx + sway, height - 110, kx + sway * 0.6, height - 190 - (i % 3) * 40);
      ctx.quadraticCurveTo(kx + 22 + sway, height - 110, kx + 28, height);
      ctx.fill();
    }
    ctx.strokeStyle = isForest ? 'rgba(134, 239, 172, 0.42)' : 'rgba(165, 243, 252, 0.38)';
    ctx.lineWidth = 1.5;
    for (let i = 0; i < 24; i++) {
      const bx = ((i * 97 - camX * 0.4) % width + width) % width;
      const by = height - ((time * (28 + (i % 5) * 9) + i * 73) % (height + 40));
      ctx.beginPath();
      ctx.arc(bx, by, 3 + (i % 4) * 2, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.restore();
  } else if (zone.key === 'sky' || zone.key === 'solar') {
    const isSolar = zone.key === 'solar';
    ctx.save();
    const sunGrad = ctx.createRadialGradient(
      width * 0.78,
      height * 0.22,
      12,
      width * 0.78,
      height * 0.22,
      isSolar ? 220 : 180
    );
    sunGrad.addColorStop(0, 'rgba(254, 240, 138, 0.95)');
    sunGrad.addColorStop(0.35, isSolar ? 'rgba(249, 115, 22, 0.45)' : 'rgba(251, 191, 36, 0.35)');
    sunGrad.addColorStop(1, 'rgba(251, 191, 36, 0)');
    ctx.fillStyle = sunGrad;
    ctx.beginPath();
    ctx.arc(width * 0.78, height * 0.22, isSolar ? 220 : 180, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = isSolar ? 'rgba(254, 215, 170, 0.14)' : 'rgba(255, 255, 255, 0.16)';
    for (let i = 0; i < 8; i++) {
      const cx =
        (((i * 260 - camX * 0.18 - time * 14) % (width + 300)) + (width + 300)) % (width + 300) - 120;
      const cy = 90 + (i % 4) * 85;
      ctx.beginPath();
      ctx.ellipse(cx, cy, 85, 26, 0, 0, Math.PI * 2);
      ctx.ellipse(cx - 38, cy + 6, 48, 20, 0, 0, Math.PI * 2);
      ctx.ellipse(cx + 42, cy + 8, 52, 20, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  } else if (zone.key === 'cave' || zone.key === 'glacial' || zone.key === 'forge') {
    ctx.save();
    ctx.fillStyle =
      zone.key === 'glacial' ? '#0C4A6E' : zone.key === 'forge' ? '#451A03' : '#140824';
    for (let i = 0; i < 16; i++) {
      const sx =
        (((i * 140 - camX * 0.25) % (width + 200)) + (width + 200)) % (width + 200) - 80;
      const sh = 65 + (i % 4) * 35;
      ctx.beginPath();
      ctx.moveTo(sx - 28, 0);
      ctx.lineTo(sx + 28, 0);
      ctx.lineTo(sx, sh);
      ctx.closePath();
      ctx.fill();
    }
    for (let i = 0; i < 10; i++) {
      const cx =
        (((i * 210 - camX * 0.35) % (width + 220)) + (width + 220)) % (width + 220) - 60;
      const cy = height - 45 - (i % 3) * 28;
      ctx.fillStyle =
        zone.key === 'glacial'
          ? 'rgba(125, 211, 252, 0.28)'
          : zone.key === 'forge'
          ? 'rgba(251, 146, 60, 0.28)'
          : i % 2 === 0
          ? 'rgba(232, 121, 249, 0.25)'
          : 'rgba(168, 85, 247, 0.25)';
      ctx.beginPath();
      ctx.moveTo(cx - 16, height);
      ctx.lineTo(cx - 6, cy);
      ctx.lineTo(cx + 8, cy + 16);
      ctx.lineTo(cx + 20, height);
      ctx.closePath();
      ctx.fill();
    }
    ctx.restore();
  } else if (zone.key === 'space') {
    ctx.save();
    for (let i = 0; i < 65; i++) {
      const sx = ((i * 137 - camX * (0.05 + (i % 3) * 0.04)) % width + width) % width;
      const sy = (i * 89) % height;
      const twinkle = 0.4 + 0.6 * Math.abs(Math.sin(time * 2 + i));
      ctx.fillStyle = `rgba(248, 250, 252, ${twinkle.toFixed(2)})`;
      ctx.fillRect(sx, sy, (i % 3) + 1, (i % 3) + 1);
    }
    const px = width * 0.72 - ((camX * 0.04) % 240);
    const py = height * 0.28;
    const pGrad = ctx.createRadialGradient(px - 18, py - 18, 10, px, py, 64);
    pGrad.addColorStop(0, '#F472B6');
    pGrad.addColorStop(1, '#4C1D95');
    ctx.fillStyle = pGrad;
    ctx.beginPath();
    ctx.arc(px, py, 58, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = 'rgba(244, 114, 182, 0.5)';
    ctx.lineWidth = 7;
    ctx.beginPath();
    ctx.ellipse(px, py, 108, 22, -0.25, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  } else {
    // galactic or cyber
    ctx.save();
    const gx = width * 0.5;
    const gy = height * 0.42;
    for (let arm = 0; arm < 3; arm++) {
      ctx.strokeStyle =
        zone.key === 'cyber'
          ? 'rgba(34, 211, 238, 0.18)'
          : arm === 0
          ? 'rgba(52, 211, 153, 0.22)'
          : 'rgba(168, 85, 247, 0.22)';
      ctx.lineWidth = 18;
      ctx.beginPath();
      for (let t = 0; t < 36; t++) {
        const ang = t * 0.24 + (arm * Math.PI * 2) / 3 + time * 0.15;
        const rad = t * 8;
        const x = gx + Math.cos(ang) * rad;
        const y = gy + Math.sin(ang) * rad * 0.48;
        if (t === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();
    }
    ctx.strokeStyle = zone.key === 'cyber' ? 'rgba(34, 211, 238, 0.14)' : 'rgba(52, 211, 153, 0.12)';
    ctx.lineWidth = 1;
    for (let i = 0; i < 16; i++) {
      const lx = ((i * 120 - camX * 0.2) % width + width) % width;
      ctx.beginPath();
      ctx.moveTo(lx, 0);
      ctx.lineTo(lx, height);
      ctx.stroke();
    }
    ctx.restore();
  }
}

export function drawEnemySprite(ctx: CanvasRenderingContext2D, e: RenderEnemy, time: number) {
  ctx.save();
  ctx.translate(e.x, e.y);

  if (e.telegraphTimer > 0) {
    ctx.strokeStyle = 'rgba(248, 113, 113, 0.9)';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.arc(0, 0, e.w * 0.72 + Math.sin(time * 24) * 4, 0, Math.PI * 2);
    ctx.stroke();
  }

  ctx.scale(e.facing, 1);
  const flash = e.hitFlash > 0;
  const bob = Math.sin(time * 5 + e.animSeed) * 3;

  switch (e.kind) {
    case 'puffer': {
      ctx.fillStyle = flash ? '#FFFFFF' : '#F59E0B';
      ctx.beginPath();
      ctx.arc(0, bob, 18, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#FEF08A';
      ctx.lineWidth = 2;
      for (let a = 0; a < 8; a++) {
        const ang = (a * Math.PI) / 4 + time;
        ctx.beginPath();
        ctx.moveTo(Math.cos(ang) * 16, bob + Math.sin(ang) * 16);
        ctx.lineTo(Math.cos(ang) * 24, bob + Math.sin(ang) * 24);
        ctx.stroke();
      }
      break;
    }
    case 'jelly': {
      ctx.fillStyle = flash ? '#FFFFFF' : '#22D3EE';
      ctx.beginPath();
      ctx.arc(0, -4 + bob, 17, Math.PI, 0);
      ctx.fill();
      ctx.strokeStyle = '#A5F3FC';
      ctx.lineWidth = 2;
      for (let t = -10; t <= 10; t += 10) {
        ctx.beginPath();
        ctx.moveTo(t, -4 + bob);
        ctx.quadraticCurveTo(t + Math.sin(time * 6 + t) * 6, 10, t, 20 + bob);
        ctx.stroke();
      }
      break;
    }
    case 'crab': {
      ctx.fillStyle = flash ? '#FFFFFF' : '#EF4444';
      ctx.beginPath();
      ctx.roundRect(-20, -10, 40, 22, 8);
      ctx.fill();
      ctx.fillStyle = '#FCA5A5';
      ctx.beginPath();
      ctx.arc(-18, -14, 7, 0, Math.PI * 2);
      ctx.arc(18, -14, 7, 0, Math.PI * 2);
      ctx.fill();
      break;
    }
    case 'corsair':
    case 'harpy': {
      ctx.fillStyle = flash ? '#FFFFFF' : e.kind === 'corsair' ? '#3B82F6' : '#F472B6';
      ctx.beginPath();
      ctx.moveTo(18, bob);
      ctx.lineTo(-16, -14 + bob);
      ctx.lineTo(-10, bob);
      ctx.lineTo(-16, 14 + bob);
      ctx.closePath();
      ctx.fill();
      break;
    }
    case 'aeroturret':
    case 'astralturret': {
      ctx.fillStyle = flash ? '#FFFFFF' : '#475569';
      ctx.beginPath();
      ctx.roundRect(-18, -14, 36, 28, 6);
      ctx.fill();
      ctx.fillStyle = e.kind === 'aeroturret' ? '#FBBF24' : '#34D399';
      ctx.fillRect(8, -4, 16, 8);
      break;
    }
    case 'bat': {
      const wing = Math.sin(time * 16 + e.animSeed) * 10;
      ctx.fillStyle = flash ? '#FFFFFF' : '#A855F7';
      ctx.beginPath();
      ctx.moveTo(0, bob);
      ctx.lineTo(-22, -12 + wing + bob);
      ctx.lineTo(-10, 8 + bob);
      ctx.lineTo(10, 8 + bob);
      ctx.lineTo(22, -12 + wing + bob);
      ctx.closePath();
      ctx.fill();
      break;
    }
    case 'golem':
    case 'chronoknight': {
      ctx.fillStyle = flash ? '#FFFFFF' : e.kind === 'golem' ? '#7E22CE' : '#0EA5E9';
      ctx.beginPath();
      ctx.roundRect(-20, -24, 40, 46, 6);
      ctx.fill();
      ctx.fillStyle = '#F0ABFC';
      ctx.fillRect(4, -14, 10, 5);
      break;
    }
    case 'magmaslime': {
      ctx.fillStyle = flash ? '#FFFFFF' : '#F97316';
      ctx.beginPath();
      ctx.arc(0, 4, 18, Math.PI, 0);
      ctx.lineTo(18, 16);
      ctx.lineTo(-18, 16);
      ctx.closePath();
      ctx.fill();
      break;
    }
    case 'saucer': {
      ctx.fillStyle = flash ? '#FFFFFF' : '#38BDF8';
      ctx.beginPath();
      ctx.ellipse(0, bob, 24, 9, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#EC4899';
      ctx.beginPath();
      ctx.arc(0, -6 + bob, 11, Math.PI, 0);
      ctx.fill();
      break;
    }
    case 'prism':
    case 'stalker': {
      ctx.save();
      ctx.rotate(time * 2);
      ctx.fillStyle = flash ? '#FFFFFF' : e.kind === 'prism' ? '#EC4899' : '#10B981';
      ctx.beginPath();
      ctx.moveTo(0, -20);
      ctx.lineTo(16, 0);
      ctx.lineTo(0, 20);
      ctx.lineTo(-16, 0);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
      break;
    }
    case 'meteor': {
      ctx.fillStyle = flash ? '#FFFFFF' : '#B45309';
      ctx.beginPath();
      ctx.arc(0, 0, 19, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#F59E0B';
      ctx.lineWidth = 3;
      ctx.stroke();
      break;
    }
  }

  ctx.fillStyle = '#FFFFFF';
  ctx.beginPath();
  ctx.arc(6, -3 + (e.kind === 'crab' || e.kind === 'golem' ? -2 : bob), 3, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();

  if (e.hp < e.maxHp) {
    const bw = 34;
    ctx.fillStyle = 'rgba(15, 23, 42, 0.8)';
    ctx.fillRect(e.x - bw / 2, e.y - e.h / 2 - 12, bw, 5);
    ctx.fillStyle = '#F43F5E';
    ctx.fillRect(e.x - bw / 2, e.y - e.h / 2 - 12, bw * Math.max(0, e.hp / e.maxHp), 5);
  }
}

export function drawColossalBoss(ctx: CanvasRenderingContext2D, b: RenderBoss) {
  if (!b.active) return;
  const zoneCfg = getZoneConfig(b.zoneId);
  const model = zoneCfg.bossModelIndex;

  ctx.save();
  ctx.translate(b.x, b.y);

  const flash = b.hitFlash > 0;
  const pulse = Math.sin(b.animTime * 4) * 8;

  if (b.telegraphTimer > 0) {
    ctx.strokeStyle = 'rgba(251, 191, 36, 0.85)';
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.arc(0, 0, Math.max(b.w, b.h) * 0.58 + Math.sin(b.animTime * 20) * 6, 0, Math.PI * 2);
    ctx.stroke();
  }

  if (model === 1) {
    ctx.strokeStyle = flash ? '#FFFFFF' : zoneCfg.platformTrim;
    ctx.lineWidth = 18;
    ctx.lineCap = 'round';
    for (let i = -2; i <= 2; i++) {
      if (i === 0) continue;
      const sway = Math.sin(b.animTime * 3.5 + i) * 28;
      ctx.beginPath();
      ctx.moveTo(i * 22, 20);
      ctx.quadraticCurveTo(i * 46 + sway, 75, i * 32 + sway * 1.3, 120);
      ctx.stroke();
    }
    ctx.fillStyle = flash ? '#FFFFFF' : zoneCfg.platformColor;
    ctx.beginPath();
    ctx.ellipse(0, -10 + pulse * 0.4, 78, 88, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = zoneCfg.accentColor;
    ctx.lineWidth = 5;
    ctx.stroke();
    ctx.fillStyle = b.phase > 1 ? '#F43F5E' : '#FACC15';
    ctx.beginPath();
    ctx.arc(-18, -6 + pulse * 0.4, 22, 0, Math.PI * 2);
    ctx.fill();
  } else if (model === 2) {
    const flap = Math.sin(b.animTime * 5) * 22;
    ctx.fillStyle = flash ? '#FFFFFF' : zoneCfg.accentColor;
    ctx.beginPath();
    ctx.moveTo(0, -25);
    ctx.lineTo(95, -90 + flap);
    ctx.lineTo(70, 0);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = flash ? '#FFFFFF' : zoneCfg.skyTop;
    ctx.beginPath();
    ctx.roundRect(-95, -35, 190, 82, 22);
    ctx.fill();
    ctx.strokeStyle = zoneCfg.accentColor;
    ctx.lineWidth = 5;
    ctx.stroke();
    ctx.fillStyle = '#F8FAFC';
    for (let c = -55; c <= 55; c += 36) {
      ctx.beginPath();
      ctx.arc(c, 12, 11, 0, Math.PI * 2);
      ctx.fill();
    }
  } else if (model === 3) {
    ctx.fillStyle = flash ? '#FFFFFF' : zoneCfg.platformColor;
    ctx.beginPath();
    ctx.moveTo(-90, 10);
    ctx.lineTo(-40, -78);
    ctx.lineTo(65, -62);
    ctx.lineTo(98, 5);
    ctx.lineTo(50, 74);
    ctx.lineTo(-60, 72);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = zoneCfg.accentColor;
    ctx.lineWidth = 6;
    ctx.stroke();
    ctx.fillStyle = zoneCfg.platformTrim;
    ctx.beginPath();
    ctx.moveTo(10, -68);
    ctx.lineTo(42, -120);
    ctx.lineTo(50, -62);
    ctx.fill();
    ctx.fillStyle = '#F43F5E';
    ctx.beginPath();
    ctx.arc(-28, -10, 18, 0, Math.PI * 2);
    ctx.fill();
  } else if (model === 4) {
    ctx.fillStyle = flash ? '#FFFFFF' : '#312E81';
    ctx.beginPath();
    ctx.arc(0, 0, 86, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = zoneCfg.accentColor;
    ctx.lineWidth = 6;
    ctx.stroke();
    ctx.fillStyle = '#F472B6';
    ctx.beginPath();
    ctx.arc(0, 0, 32 + Math.sin(b.animTime * 8) * 5, 0, Math.PI * 2);
    ctx.fill();
    for (let s = 0; s < 4; s++) {
      const ang = b.animTime * 2 + (s * Math.PI) / 2;
      const sx = Math.cos(ang) * 116;
      const sy = Math.sin(ang) * 116;
      ctx.fillStyle = '#38BDF8';
      ctx.beginPath();
      ctx.arc(sx, sy, 16, 0, Math.PI * 2);
      ctx.fill();
    }
  } else {
    ctx.strokeStyle = zoneCfg.accentColor;
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(0, 0, 118, 0, Math.PI * 2);
    ctx.stroke();

    ctx.fillStyle = flash ? '#FFFFFF' : '#0F172A';
    ctx.beginPath();
    ctx.moveTo(0, -102);
    ctx.lineTo(86, 0);
    ctx.lineTo(0, 102);
    ctx.lineTo(-86, 0);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = b.phase > 1 ? '#F43F5E' : zoneCfg.platformTrim;
    ctx.lineWidth = 6;
    ctx.stroke();

    ctx.fillStyle = zoneCfg.accentColor;
    ctx.beginPath();
    ctx.arc(0, 0, 30, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.restore();
}
