import React, { useEffect, useState } from 'react';
import {
  Check,
  Copy,
  Download,
  ExternalLink,
  Heart,
  MessageSquarePlus,
  QrCode,
  Send,
  Smartphone,
  Sparkles,
  Star,
  UserCheck,
  X,
} from 'lucide-react';
import { gameAudio } from '../game/audio';
import {
  FeedbackCategory,
  fetchGameFeedback,
  GameFeedbackItem,
  loadLocalFeedback,
  submitGameFeedback,
} from '../services/syncService';

export type StudioTab = 'creator' | 'donate' | 'feedback';

interface Props {
  initialTab: StudioTab;
  playerName: string;
  userId: string | null;
  isOnline: boolean;
  onClose: () => void;
}

const RECIPIENT_NUMBER = '09064394314';
const RECIPIENT_NAME = 'Joseph Michael Codilla';

const DONATION_TIERS = [
  {
    id: 'tier20',
    amountValue: 20,
    amountLabel: '₱20.00',
    title: 'Starlight Coffee',
    description: 'Fuel late-night bug fixes & level polish at JMC Labs.',
    imagePath: '/assets/aistudio/GCash-MyQR-23112026224915.PNG_6780cf73.jpg',
    fileName: 'GCash-JMC-Labs-P20.jpg',
  },
  {
    id: 'tier50',
    amountValue: 50,
    amountLabel: '₱50.00',
    title: 'Gravity Booster',
    description: 'Support new galactic boss mechanics, weapons & music tracks.',
    imagePath: '/assets/aistudio/GCash-MyQR-23112026224843.PNG_2b361288.jpg',
    fileName: 'GCash-JMC-Labs-P50.jpg',
  },
  {
    id: 'tier100',
    amountValue: 100,
    amountLabel: '₱100.00',
    title: 'Galactic Patron',
    description: 'Sponsor major expansion zones & cross-platform updates.',
    imagePath: '/assets/aistudio/GCash-MyQR-23112026224903.PNG_7a02e399.jpg',
    fileName: 'GCash-JMC-Labs-P100.jpg',
  },
] as const;

const CATEGORIES: FeedbackCategory[] = [
  'Gameplay',
  'Zones & Bosses',
  'Weapons & Skills',
  'Audio & Controls',
  'Bug Report',
];

export const CreatorDonateFeedbackModal: React.FC<Props> = ({
  initialTab,
  playerName,
  userId,
  isOnline,
  onClose,
}) => {
  const [tab, setTab] = useState<StudioTab>(initialTab);
  const [selectedTierId, setSelectedTierId] = useState<string>('tier50');
  const [wallet, setWallet] = useState<'gcash' | 'maya'>('gcash');
  const [copiedNumber, setCopiedNumber] = useState(false);
  const [payNotice, setPayNotice] = useState<string | null>(null);
  const [donationThanks, setDonationThanks] = useState(false);
  const [failedImages, setFailedImages] = useState<Record<string, boolean>>({});

  // Feedback state
  const [comments, setComments] = useState<GameFeedbackItem[]>(() => loadLocalFeedback());
  const [category, setCategory] = useState<FeedbackCategory>('Gameplay');
  const [rating, setRating] = useState<number>(5);
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submittedNotice, setSubmittedNotice] = useState(false);

  useEffect(() => {
    if (tab === 'feedback') {
      fetchGameFeedback().then(setComments).catch(() => {});
    }
  }, [tab]);

  const activeTier = DONATION_TIERS.find((t) => t.id === selectedTierId) || DONATION_TIERS[1];

  const handleCopyNumber = async () => {
    gameAudio.playUiClick();
    try {
      await navigator.clipboard.writeText(RECIPIENT_NUMBER);
      setCopiedNumber(true);
      setTimeout(() => setCopiedNumber(false), 2400);
    } catch {
      setCopiedNumber(true);
      setTimeout(() => setCopiedNumber(false), 2400);
    }
  };

  const handleWalletPay = async (chosenWallet: 'gcash' | 'maya') => {
    setWallet(chosenWallet);
    gameAudio.playUiClick();
    try {
      await navigator.clipboard.writeText(RECIPIENT_NUMBER);
      setCopiedNumber(true);
      setTimeout(() => setCopiedNumber(false), 2500);
    } catch {}

    const walletLabel = chosenWallet === 'gcash' ? 'GCash' : 'Maya';
    setPayNotice(
      `Copied ${RECIPIENT_NUMBER} (${RECIPIENT_NAME}) · Send ${activeTier.amountLabel} via ${walletLabel} Express Send or upload the saved QR.`
    );

    // Trigger deep link on mobile devices where GCash/Maya app is installed
    const scheme = chosenWallet === 'gcash' ? 'gcash://' : 'maya://';
    const link = document.createElement('a');
    link.href = scheme;
    link.style.display = 'none';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleSubmitFeedback = async (e: React.FormEvent) => {
    e.preventDefault();
    if (message.trim().length < 3 || submitting) return;
    setSubmitting(true);
    try {
      const saved = await submitGameFeedback(userId, playerName, category, rating, message);
      setComments((prev) => [saved, ...prev.filter((c) => c.id !== saved.id)]);
      setMessage('');
      setSubmittedNotice(true);
      gameAudio.playRewardChime();
      setTimeout(() => setSubmittedNotice(false), 2600);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/85 p-4">
      <div className="flex max-h-[90vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl border border-slate-800 bg-[#0D1326] text-slate-100 shadow-2xl">
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 px-6 py-4">
          <div>
            <h2 className="font-display text-xl font-bold text-white">JMC Labs Studio</h2>
            <p className="text-xs text-slate-400">
              Creator Credits · Support & Donate · Community Feedback
            </p>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex rounded-lg bg-slate-900 p-1">
              <button
                type="button"
                onClick={() => {
                  gameAudio.playUiClick();
                  setTab('creator');
                }}
                className={`rounded-md px-3 py-1.5 text-xs font-semibold transition-colors whitespace-nowrap ${
                  tab === 'creator' ? 'bg-sky-600 text-white' : 'text-slate-400 hover:text-white'
                }`}
              >
                Creator
              </button>
              <button
                type="button"
                onClick={() => {
                  gameAudio.playUiClick();
                  setTab('donate');
                }}
                className={`rounded-md px-3 py-1.5 text-xs font-semibold transition-colors whitespace-nowrap ${
                  tab === 'donate' ? 'bg-pink-600 text-white' : 'text-slate-400 hover:text-white'
                }`}
              >
                Donate
              </button>
              <button
                type="button"
                onClick={() => {
                  gameAudio.playUiClick();
                  setTab('feedback');
                }}
                className={`rounded-md px-3 py-1.5 text-xs font-semibold transition-colors whitespace-nowrap ${
                  tab === 'feedback' ? 'bg-emerald-600 text-white' : 'text-slate-400 hover:text-white'
                }`}
              >
                Comments
              </button>
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close Studio Modal"
              className="rounded-lg border border-slate-700 p-2 text-slate-400 hover:text-white"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* ==================== CREATOR PAGE ==================== */}
          {tab === 'creator' && (
            <div className="space-y-6">
              <div className="rounded-2xl border border-sky-500/30 bg-gradient-to-br from-slate-900 via-[#0F172A] to-sky-950/30 p-6">
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div>
                    <div className="text-xs font-semibold uppercase tracking-widest text-sky-400">
                      Crafted With Passion By
                    </div>
                    <h3 className="mt-1 font-display text-3xl font-extrabold text-white">
                      JMC Labs
                    </h3>
                    <p className="mt-1 text-sm text-slate-300">
                      Independent Interactive Games & Physics Experiences
                    </p>
                  </div>
                  <div className="flex h-16 w-16 items-center justify-center rounded-2xl border border-pink-400/40 bg-pink-500/15 font-display text-2xl font-extrabold text-pink-300">
                    JMC
                  </div>
                </div>

                {/* Heartfelt Thank You Message */}
                <div className="mt-6 rounded-xl border border-slate-800 bg-slate-950/70 p-5">
                  <div className="flex items-center gap-2 text-sm font-bold text-pink-300">
                    <Heart className="h-4 w-4 fill-pink-400 text-pink-400" />
                    A Heartfelt Thank You for Patronizing Aether Shift
                  </div>
                  <p className="mt-2.5 text-sm leading-relaxed text-slate-300">
                    Thank you so much for playing and supporting <strong className="text-white">Aether Shift: Gravity Odyssey</strong>! Every jump through the Abyssal Coral Trench, every mid-air gravity flip across the Nimbus Sky Citadel, and every boss battle in Outer Space was designed by <strong className="text-white">JMC Labs</strong> to bring you joyful, creative platforming action—online or offline.
                  </p>
                  <p className="mt-2 text-sm leading-relaxed text-slate-300">
                    Your time, enthusiasm, and feedback mean the world to our small studio and keep new worlds, weapons, and bosses coming!
                  </p>
                </div>

                <div className="mt-5 grid gap-3 sm:grid-cols-3 text-xs">
                  <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-3.5">
                    <div className="font-bold text-white">5 Diverse Worlds</div>
                    <div className="mt-1 text-slate-400">Undersea, Sky Flight, Crystal Caves, Outer Space & Galactic Core</div>
                  </div>
                  <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-3.5">
                    <div className="font-bold text-white">Seamless Gravity</div>
                    <div className="mt-1 text-slate-400">Zero-G, Low-G, Heavy-G & Inverted ceiling platforming</div>
                  </div>
                  <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-3.5">
                    <div className="font-bold text-white">Cross-Platform Sync</div>
                    <div className="mt-1 text-slate-400">Cloud saves, offline PWA play & global leaderboards</div>
                  </div>
                </div>

                <div className="mt-6 flex flex-wrap gap-3">
                  <button
                    type="button"
                    onClick={() => setTab('donate')}
                    className="flex items-center gap-2 rounded-xl bg-pink-600 px-5 py-2.5 text-xs font-bold text-white hover:bg-pink-500"
                  >
                    <Heart className="h-4 w-4" />
                    Support JMC Labs (Donate)
                  </button>
                  <button
                    type="button"
                    onClick={() => setTab('feedback')}
                    className="flex items-center gap-2 rounded-xl border border-slate-700 bg-slate-900 px-5 py-2.5 text-xs font-bold text-slate-200 hover:bg-slate-800"
                  >
                    <MessageSquarePlus className="h-4 w-4 text-emerald-400" />
                    Leave Improvement Feedback
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ==================== DONATE PAGE ==================== */}
          {tab === 'donate' && (
            <div className="space-y-5">
              <div className="rounded-xl border border-pink-500/30 bg-pink-500/10 p-4 text-sm text-slate-200">
                <strong className="text-white">Thank you for patronizing JMC Labs!</strong> Choose any GCash support tier below—your generosity directly powers new zones, custom outfits, and smoother updates.
              </div>

              {/* 3 Tier Selector */}
              <div className="grid gap-3 sm:grid-cols-3">
                {DONATION_TIERS.map((tier) => {
                  const active = tier.id === activeTier.id;
                  return (
                    <button
                      key={tier.id}
                      type="button"
                      onClick={() => {
                        gameAudio.playUiClick();
                        setSelectedTierId(tier.id);
                      }}
                      className={`rounded-xl border p-4 text-left transition-colors ${
                        active
                          ? 'border-sky-400 bg-sky-500/15'
                          : 'border-slate-800 bg-slate-900/60 hover:border-slate-600'
                      }`}
                    >
                      <div className="font-mono-num text-xl font-extrabold text-white">
                        {tier.amountLabel}
                      </div>
                      <div className="mt-1 text-xs font-bold text-sky-300">{tier.title}</div>
                      <div className="mt-1 text-[11px] text-slate-400">{tier.description}</div>
                    </button>
                  );
                })}
              </div>

              {/* Selected GCash QR Card Display (unaltered clickable original QR image) */}
              <div className="grid gap-6 rounded-2xl border border-slate-800 bg-slate-900/70 p-5 sm:grid-cols-[260px_1fr] items-start">
                <div className="mx-auto w-full max-w-[260px] space-y-2.5 text-center">
                  <button
                    type="button"
                    onClick={() => handleWalletPay('gcash')}
                    title="Click to pay via GCash or copy recipient number"
                    className="group relative block w-full overflow-hidden rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-400"
                  >
                    {!failedImages[activeTier.id] ? (
                      <img
                        src={activeTier.imagePath}
                        alt={`GCash QR ${activeTier.amountLabel}`}
                        referrerPolicy="no-referrer"
                        onError={() =>
                          setFailedImages((prev) => ({ ...prev, [activeTier.id]: true }))
                        }
                        className="mx-auto block h-auto w-full max-h-[430px] rounded-xl object-contain shadow-lg transition-transform duration-150 group-hover:scale-[1.01]"
                      />
                    ) : (
                      <div className="flex flex-col items-center justify-center rounded-xl bg-white py-6 px-4 text-slate-900">
                        <QrCode className="h-16 w-16 text-sky-600" />
                        <div className="mt-3 text-xs font-bold text-[#0056D2]">
                          {RECIPIENT_NAME}
                        </div>
                        <div className="font-mono-num text-xs text-slate-600">{RECIPIENT_NUMBER}</div>
                        <div className="mt-2 font-mono-num text-lg font-extrabold text-slate-900">
                          {activeTier.amountLabel}
                        </div>
                      </div>
                    )}
                  </button>
                  <div className="flex items-center justify-center gap-3 text-[11px]">
                    <button
                      type="button"
                      onClick={() => handleWalletPay('gcash')}
                      className="font-semibold text-sky-400 hover:text-sky-300"
                    >
                      Tap QR to Pay ({activeTier.amountLabel})
                    </button>
                    <span className="text-slate-600">·</span>
                    <a
                      href={activeTier.imagePath}
                      download={activeTier.fileName}
                      onClick={() => gameAudio.playUiClick()}
                      className="inline-flex items-center gap-1 font-semibold text-slate-300 hover:text-white"
                    >
                      <Download className="h-3 w-3" /> Save QR
                    </a>
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <h3 className="font-display text-lg font-bold text-white">
                      {activeTier.title} · {activeTier.amountLabel}
                    </h3>
                    <p className="mt-1 text-xs leading-relaxed text-slate-300">
                      Scan the QR code as-is, tap the QR image, or use instant send via <strong>GCash</strong> or <strong>Maya</strong>.
                    </p>
                  </div>

                  {/* Wallet Switcher */}
                  <div className="flex rounded-xl bg-slate-950 p-1 border border-slate-800">
                    <button
                      type="button"
                      onClick={() => {
                        gameAudio.playUiClick();
                        setWallet('gcash');
                      }}
                      className={`flex-1 rounded-lg py-2 text-xs font-bold transition-colors ${
                        wallet === 'gcash'
                          ? 'bg-[#007DFE] text-white'
                          : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      Pay with GCash
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        gameAudio.playUiClick();
                        setWallet('maya');
                      }}
                      className={`flex-1 rounded-lg py-2 text-xs font-bold transition-colors ${
                        wallet === 'maya'
                          ? 'bg-emerald-600 text-white'
                          : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      Pay with Maya
                    </button>
                  </div>

                  {/* Direct Recipient Details */}
                  <div className="space-y-2 rounded-xl border border-slate-800 bg-slate-950/75 p-3.5 text-xs">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-slate-400">Account Name</span>
                      <span className="font-bold text-white">{RECIPIENT_NAME}</span>
                    </div>
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-slate-400">
                        {wallet === 'gcash' ? 'GCash Number' : 'Maya Number'}
                      </span>
                      <div className="flex items-center gap-2">
                        <span className="font-mono-num text-sm font-bold text-sky-300">
                          {RECIPIENT_NUMBER}
                        </span>
                        <button
                          type="button"
                          onClick={handleCopyNumber}
                          className="inline-flex items-center gap-1 rounded-md border border-slate-700 bg-slate-900 px-2 py-1 text-[11px] font-semibold text-slate-200 hover:bg-slate-800"
                        >
                          {copiedNumber ? (
                            <>
                              <Check className="h-3 w-3 text-emerald-400" /> Copied
                            </>
                          ) : (
                            <>
                              <Copy className="h-3 w-3" /> Copy
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-slate-400">Donation Amount</span>
                      <span className="font-mono-num font-bold text-pink-300">
                        {activeTier.amountLabel}
                      </span>
                    </div>
                  </div>

                  {/* Primary Action Buttons */}
                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                    <button
                      type="button"
                      onClick={() => handleWalletPay(wallet)}
                      className={`flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-xs font-bold text-white transition-colors ${
                        wallet === 'gcash'
                          ? 'bg-[#007DFE] hover:bg-blue-500'
                          : 'bg-emerald-600 hover:bg-emerald-500'
                      }`}
                    >
                      <Smartphone className="h-4 w-4" />
                      Pay {activeTier.amountLabel} via {wallet === 'gcash' ? 'GCash' : 'Maya'}
                      <ExternalLink className="h-3.5 w-3.5" />
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        gameAudio.playRewardChime();
                        setDonationThanks(true);
                      }}
                      className="flex items-center justify-center gap-2 rounded-xl border border-pink-500/40 bg-pink-500/15 px-4 py-2.5 text-xs font-bold text-pink-200 hover:bg-pink-500/25"
                    >
                      <Heart className="h-4 w-4 text-pink-400" />
                      I&apos;ve Sent Donation
                    </button>
                  </div>

                  {payNotice && (
                    <div className="rounded-lg border border-sky-500/30 bg-sky-500/10 p-2.5 text-[11px] leading-relaxed text-sky-200">
                      {payNotice}
                    </div>
                  )}

                  {donationThanks && (
                    <div className="rounded-xl border border-emerald-500/40 bg-emerald-500/15 p-3 text-xs text-emerald-200">
                      <strong className="text-white">Maraming salamat!</strong> Thank you from <strong>Joseph Michael Codilla & JMC Labs</strong> for your generous {activeTier.amountLabel} support!
                    </div>
                  )}

                  <p className="text-[11px] text-slate-400 flex items-center gap-1.5">
                    <Sparkles className="h-3.5 w-3.5 text-amber-400" />
                    100% of donations go toward server sync & new playable levels by JMC Labs.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* ==================== COMMENTS / FEEDBACK PAGE ==================== */}
          {tab === 'feedback' && (
            <div className="space-y-6">
              <form
                onSubmit={handleSubmitFeedback}
                className="rounded-xl border border-slate-800 bg-slate-900/60 p-4 space-y-4"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h3 className="font-display text-sm font-bold text-white">
                    Help JMC Labs Improve the Game
                  </h3>
                  <span className="text-[11px] text-slate-400">
                    {userId && isOnline
                      ? 'Signed in · Posts sync publicly to JMC Labs'
                      : 'Saved locally · Sign in online to sync publicly'}
                  </span>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  {CATEGORIES.map((cat) => (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => setCategory(cat)}
                      className={`rounded-lg px-2.5 py-1.5 text-xs font-semibold transition-colors ${
                        category === cat
                          ? 'bg-emerald-600 text-white'
                          : 'bg-slate-950 text-slate-400 hover:text-white'
                      }`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-400">Rating:</span>
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      onClick={() => setRating(star)}
                      aria-label={`Rate ${star} stars`}
                      className="p-0.5"
                    >
                      <Star
                        className={`h-5 w-5 ${
                          star <= rating
                            ? 'fill-amber-400 text-amber-400'
                            : 'text-slate-600'
                        }`}
                      />
                    </button>
                  ))}
                </div>

                <textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  maxLength={500}
                  rows={3}
                  placeholder="Share ideas for new gravity levels, weapons, boss fights, or mobile controls..."
                  className="w-full rounded-xl border border-slate-700 bg-slate-950 p-3 text-sm text-white placeholder:text-slate-500 focus:border-emerald-500 focus:outline-none"
                />

                <div className="flex items-center justify-between">
                  <span className="font-mono-num text-[11px] text-slate-500">
                    {message.length}/500
                  </span>
                  <button
                    type="submit"
                    disabled={message.trim().length < 3 || submitting}
                    className="flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-xs font-bold text-white hover:bg-emerald-500 disabled:opacity-45"
                  >
                    <Send className="h-3.5 w-3.5" />
                    {submitting ? 'Sending...' : 'Submit Feedback'}
                  </button>
                </div>

                {submittedNotice && (
                  <div className="text-xs font-semibold text-emerald-400 flex items-center gap-1.5">
                    <UserCheck className="h-4 w-4" /> Thank you! Your feedback has been recorded for JMC Labs.
                  </div>
                )}
              </form>

              <div className="space-y-2.5">
                <h4 className="text-xs font-semibold text-slate-400">Recent Player Suggestions</h4>
                {comments.length === 0 ? (
                  <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-6 text-center text-xs text-slate-400">
                    No comments yet—be the first to share ideas to improve Aether Shift!
                  </div>
                ) : (
                  comments.map((c) => (
                    <div
                      key={c.id}
                      className="rounded-xl border border-slate-800 bg-slate-900/50 p-3.5"
                    >
                      <div className="flex items-center justify-between gap-2 text-xs">
                        <div className="font-semibold text-white">
                          {c.authorName}{' '}
                          <span className="font-normal text-slate-400">· {c.category}</span>
                        </div>
                        <div className="flex items-center gap-1 text-amber-400 font-mono-num">
                          <Star className="h-3.5 w-3.5 fill-amber-400" />
                          {c.rating}/5
                        </div>
                      </div>
                      <p className="mt-1.5 text-xs leading-relaxed text-slate-300">{c.message}</p>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
