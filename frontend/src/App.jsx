import React, { useState, useEffect, useCallback } from "react";
import {
  Stamp,
  Plane,
  FileCheck2,
  Circle,
  CheckCircle2,
  ChevronRight,
  ArrowLeft,
  Copy,
  Users,
  Plus,
  Loader2,
  Search,
  Building2,
  UserRound,
  AlertCircle,
} from "lucide-react";

/* ---------------------------------------------------------------
   Backend — remplacez par l'URL publique de votre serveur une fois
   déployé (voir paydunya-backend/README.md). En local, laissez tel quel.
---------------------------------------------------------------- */
const API_BASE_URL = "https://visassistance-pro.onrender.com";

/* ---------------------------------------------------------------
   Design tokens
   Navy passport cover / paper document / stamp red / brass seal.
   Deliberately not the cream+terracotta or dark+neon defaults.
---------------------------------------------------------------- */
const C = {
  navy: "#4338CA",
  navyDeep: "#312E81",
  paper: "#F8F9FF",
  paperCard: "#FFFFFF",
  stamp: "#F43F5E",
  gold: "#F59E0B",
  goldLight: "#FCD34D",
  ink: "#14162B",
  slate: "#6B7280",
  line: "#E5E7EB",
  green: "#10B981",
  gradA: "#4F46E5",
  gradB: "#8B5CF6",
  gradC: "#FB7185",
};

/* ---------------------------------------------------------------
   Domain data
---------------------------------------------------------------- */
const COUNTRIES = [
  "Allemagne", "Autriche", "Belgique", "Bulgarie", "Croatie", "Danemark",
  "Espagne", "Estonie", "Finlande", "France", "Grèce", "Hongrie", "Islande",
  "Italie", "Lettonie", "Liechtenstein", "Lituanie", "Luxembourg", "Malte",
  "Norvège", "Pays-Bas", "Pologne", "Portugal", "République tchèque",
  "Roumanie", "Slovaquie", "Slovénie", "Suède", "Suisse",
];

// Tarifs indicatifs — à ajuster selon votre offre réelle.
const PRICING = [
  {
    id: "essentiel",
    label: "Essentiel",
    price: "15 000 FCFA",
    desc: "Checklist personnalisée + guide de montage du dossier",
  },
  {
    id: "accompagnement",
    label: "Accompagnement",
    price: "35 000 FCFA",
    desc: "Essentiel + suivi de dossier avec l'agence jusqu'au dépôt",
  },
  {
    id: "premium",
    label: "Premium",
    price: "60 000 FCFA",
    desc: "Accompagnement + relecture complète du dossier par un conseiller",
  },
];

const MOTIFS = [
  { id: "tourisme", label: "Tourisme" },
  { id: "affaires", label: "Affaires" },
  { id: "etudes", label: "Études" },
  { id: "famille", label: "Visite familiale" },
  { id: "transit", label: "Transit" },
];

const SITUATIONS = [
  { id: "salarie", label: "Salarié(e)" },
  { id: "independant", label: "Indépendant(e) / Entrepreneur" },
  { id: "etudiant", label: "Étudiant(e)" },
  { id: "sans_emploi", label: "Sans emploi" },
  { id: "retraite", label: "Retraité(e)" },
];

// La liste des documents par motif/situation vit désormais côté serveur
// (paydunya-backend/server.js), qui reste la seule source de vérité.

const STATUS_STEPS = [
  { id: "ouvert", label: "Dossier ouvert" },
  { id: "collecte", label: "Collecte des documents" },
  { id: "complet", label: "Dossier complet" },
  { id: "soumis", label: "Soumis au consulat" },
  { id: "rdv", label: "RDV biométrique pris" },
  { id: "decision", label: "Décision reçue" },
];

// La génération de la checklist et de la référence se fait désormais côté
// serveur (voir paydunya-backend/server.js) pour garder une seule source de vérité.

function progressOf(dossier) {
  if (!dossier?.documents?.length) return 0;
  const done = dossier.documents.filter((d) => d.checked).length;
  return Math.round((done / dossier.documents.length) * 100);
}

/* ---------------------------------------------------------------
   API helpers — parlent au backend Node (voir paydunya-backend/)
---------------------------------------------------------------- */
async function apiCreateDossier(form) {
  const res = await fetch(`${API_BASE_URL}/api/dossiers`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(form),
  });
  if (!res.ok) throw new Error((await res.json()).error || "Erreur de création.");
  return res.json();
}

async function apiGetDossier(ref) {
  const res = await fetch(`${API_BASE_URL}/api/dossiers/${encodeURIComponent(ref.trim().toUpperCase())}`);
  if (res.status === 404) return null;
  if (!res.ok) throw new Error("Erreur de récupération du dossier.");
  return res.json();
}

async function apiUpdateDossier(ref, patch, agencePin) {
  const headers = { "Content-Type": "application/json" };
  if (agencePin) headers["x-agence-pin"] = agencePin;
  const res = await fetch(`${API_BASE_URL}/api/dossiers/${encodeURIComponent(ref)}`, {
    method: "PATCH",
    headers,
    body: JSON.stringify(patch),
  });
  if (!res.ok) throw new Error((await res.json()).error || "Erreur de mise à jour.");
  return res.json();
}

async function apiListDossiers(agencePin) {
  const res = await fetch(`${API_BASE_URL}/api/dossiers`, {
    headers: { "x-agence-pin": agencePin },
  });
  if (!res.ok) throw new Error("Erreur de récupération des dossiers.");
  return res.json();
}

async function apiAgenceLogin(pin) {
  const res = await fetch(`${API_BASE_URL}/api/agence/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ pin }),
  });
  return res.ok;
}

async function apiCheckout(ref, tier) {
  const res = await fetch(`${API_BASE_URL}/api/checkout`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ref, tier }),
  });
  if (!res.ok) throw new Error((await res.json()).error || "Erreur de paiement.");
  return res.json();
}

async function apiSubmitReview(ref, note, commentaire) {
  const res = await fetch(`${API_BASE_URL}/api/reviews`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ref, note, commentaire }),
  });
  if (!res.ok) throw new Error((await res.json()).error || "Erreur lors de l'envoi de l'avis.");
  return res.json();
}

async function apiGetReviews() {
  const res = await fetch(`${API_BASE_URL}/api/reviews`);
  if (!res.ok) throw new Error("Erreur de récupération des avis.");
  return res.json();
}

async function apiReviewExists(ref) {
  const res = await fetch(`${API_BASE_URL}/api/reviews/${encodeURIComponent(ref)}`);
  if (!res.ok) return false;
  return (await res.json()).exists;
}

async function apiGetStats(agencePin) {
  const res = await fetch(`${API_BASE_URL}/api/stats`, {
    headers: { "x-agence-pin": agencePin },
  });
  if (!res.ok) throw new Error("Erreur de récupération des statistiques.");
  return res.json();
}

/* ---------------------------------------------------------------
   Small UI primitives
---------------------------------------------------------------- */
function Seal({ percent, size = 88 }) {
  return (
    <div
      className="relative flex items-center justify-center shrink-0"
      style={{
        width: size,
        height: size,
        borderRadius: "9999px",
        background: `conic-gradient(${C.gold} ${percent}%, ${C.line} 0)`,
        padding: 6,
      }}
    >
      <div
        className="flex items-center justify-center w-full h-full"
        style={{ borderRadius: "9999px", background: C.paperCard, border: `1px solid ${C.line}` }}
      >
        <span
          className="font-mono font-medium"
          style={{ color: C.navy, fontSize: size * 0.24, fontFamily: "'JetBrains Mono', monospace" }}
        >
          {percent}%
        </span>
      </div>
    </div>
  );
}

function StatusStepper({ status, editable = false, onChange }) {
  const activeIdx = STATUS_STEPS.findIndex((s) => s.id === status);
  return (
    <div className="flex flex-col gap-0">
      {STATUS_STEPS.map((step, i) => {
        const done = i < activeIdx;
        const active = i === activeIdx;
        return (
          <button
            key={step.id}
            disabled={!editable}
            onClick={() => onChange && onChange(step.id)}
            className="flex items-center gap-3 text-left py-2"
            style={{ cursor: editable ? "pointer" : "default", background: "transparent", border: "none" }}
          >
            <span className="flex flex-col items-center">
              {done || active ? (
                <CheckCircle2 size={18} color={active ? C.stamp : C.gold} />
              ) : (
                <Circle size={18} color={C.line} />
              )}
              {i < STATUS_STEPS.length - 1 && (
                <span style={{ width: 1, height: 18, background: done ? C.gold : C.line }} />
              )}
            </span>
            <span
              style={{
                fontFamily: "'Inter', sans-serif",
                fontSize: 14,
                fontWeight: active ? 600 : 500,
                color: active ? C.stamp : done ? C.ink : C.slate,
              }}
            >
              {step.label}
            </span>
          </button>
        );
      })}
    </div>
  );
}

function Checklist({ documents, onToggle, onNoteChange, editable = true }) {
  const byCategory = {};
  documents.forEach((d) => {
    byCategory[d.category] = byCategory[d.category] || [];
    byCategory[d.category].push(d);
  });
  return (
    <div className="flex flex-col gap-5">
      {Object.entries(byCategory).map(([cat, docs]) => (
        <div key={cat}>
          <p
            className="uppercase tracking-wide mb-2"
            style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11, color: C.slate, letterSpacing: "0.08em" }}
          >
            {cat}
          </p>
          <div className="flex flex-col gap-1">
            {docs.map((doc) => (
              <div
                key={doc.id}
                className="flex flex-col gap-2 py-2 px-3"
                style={{ background: C.paperCard, border: `1px solid ${C.line}` }}
              >
                <label className="flex items-start gap-3" style={{ cursor: editable ? "pointer" : "default" }}>
                  <input
                    type="checkbox"
                    checked={doc.checked}
                    disabled={!editable}
                    onChange={() => onToggle(doc.id)}
                    className="mt-1"
                    style={{ accentColor: C.gold, width: 16, height: 16 }}
                  />
                  <span
                    style={{
                      fontFamily: "'Inter', sans-serif",
                      fontSize: 14,
                      color: doc.checked ? C.slate : C.ink,
                      textDecoration: doc.checked ? "line-through" : "none",
                    }}
                  >
                    {doc.label}
                  </span>
                </label>
                {onNoteChange && (
                  <input
                    placeholder="Note (ex : lien du document, remarque…)"
                    defaultValue={doc.note || ""}
                    onBlur={(e) => onNoteChange(doc.id, e.target.value)}
                    className="ml-7"
                    style={{
                      fontFamily: "'Inter', sans-serif",
                      fontSize: 12,
                      color: C.ink,
                      background: "#fff",
                      border: `1px solid ${C.line}`,
                      padding: "6px 8px",
                    }}
                  />
                )}
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function PrimaryButton({ children, onClick, disabled, type = "button" }) {
  const [hover, setHover] = useState(false);
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      className="flex items-center justify-center gap-2 px-5 py-3 w-full"
      style={{
        background: disabled
          ? C.slate
          : `linear-gradient(135deg, ${C.gradA}, ${C.gradB})`,
        color: "#fff",
        fontFamily: "'Inter', sans-serif",
        fontWeight: 600,
        fontSize: 14,
        border: "none",
        borderRadius: 12,
        opacity: disabled ? 0.6 : 1,
        cursor: disabled ? "not-allowed" : "pointer",
        boxShadow: !disabled && hover ? `0 10px 24px -8px ${C.gradB}77` : "none",
        transform: !disabled && hover ? "translateY(-1px)" : "none",
        transition: "all 0.2s ease",
      }}
    >
      {children}
    </button>
  );
}

function Field({ label, children }) {
  return (
    <div className="flex flex-col gap-1.5 w-full">
      <label
        style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11, color: C.slate, letterSpacing: "0.05em" }}
        className="uppercase"
      >
        {label}
      </label>
      {children}
    </div>
  );
}

const inputStyle = {
  fontFamily: "'Inter', sans-serif",
  fontSize: 14,
  color: C.ink,
  background: "#fff",
  border: `1.5px solid ${C.line}`,
  borderRadius: 10,
  padding: "10px 12px",
  width: "100%",
  outline: "none",
};

/* ---------------------------------------------------------------
   Logo mark — a gradient badge with a slow-orbiting ring. Reads as
   a modern, living stamp: the digital equivalent of the physical
   visa stamp, animated to feel alive rather than static.
---------------------------------------------------------------- */
function LogoMark({ size = 88, animated = false }) {
  return (
    <div className="relative flex items-center justify-center shrink-0" style={{ width: size, height: size }}>
      <div
        style={{
          position: "absolute",
          inset: -10,
          borderRadius: 9999,
          border: `1.5px dashed ${C.gradB}66`,
          animation: animated ? "spinSlow 22s linear infinite" : undefined,
        }}
      />
      <div
        className="flex items-center justify-center"
        style={{
          width: size * 0.74,
          height: size * 0.74,
          borderRadius: size * 0.22,
          background: `linear-gradient(135deg, ${C.gradA}, ${C.gradB} 55%, ${C.gradC})`,
          boxShadow: `0 14px 32px -10px ${C.gradB}77`,
          animation: animated ? "popIn 0.6s cubic-bezier(.2,.9,.3,1) both" : undefined,
        }}
      >
        <Plane size={size * 0.32} color="#fff" strokeWidth={1.8} style={{ transform: "rotate(45deg)" }} />
      </div>
    </div>
  );
}

/* ---------------------------------------------------------------
   Logo lockup — mark + wordmark, used in the nav and footer.
---------------------------------------------------------------- */
function Logo({ size = 40, light = false }) {
  return (
    <div className="flex items-center gap-2.5">
      <LogoMark size={size} />
      <span style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 700, fontSize: size * 0.36, lineHeight: 1, color: light ? "#fff" : C.ink }}>
        VisAssistance
        <span style={{ color: C.gradB }}>.</span>
      </span>
    </div>
  );
}

/* ---------------------------------------------------------------
   Flying planes — a continuous background motif. Small, quiet,
   never competing with the foreground content.
---------------------------------------------------------------- */
const PLANE_ROUTES = [
  { top: "14%", size: 20, duration: "16s", delay: "0s", opacity: 0.5, color: "#4F46E5" },
  { top: "38%", size: 15, duration: "22s", delay: "5s", opacity: 0.35, color: "#8B5CF6" },
  { top: "62%", size: 18, duration: "19s", delay: "11s", opacity: 0.4, color: "#FB7185" },
  { top: "82%", size: 13, duration: "25s", delay: "2s", opacity: 0.3, color: "#4F46E5" },
];

function FlyingPlanes() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none" aria-hidden="true">
      {PLANE_ROUTES.map((p, i) => (
        <div
          key={i}
          style={{
            position: "absolute",
            top: p.top,
            left: 0,
            animation: `flyAcross ${p.duration} linear infinite`,
            animationDelay: p.delay,
          }}
        >
          <Plane size={p.size} color={p.color} style={{ opacity: p.opacity, transform: "rotate(45deg)" }} />
        </div>
      ))}
    </div>
  );
}

/* ---------------------------------------------------------------
   Role select
---------------------------------------------------------------- */
/* ---------------------------------------------------------------
   Navigation bar — sticky, glass, smooth-scrolls to page sections.
---------------------------------------------------------------- */
function NavBar({ onSelect }) {
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);
  const links = [
    { href: "#accueil", label: "Accueil" },
    { href: "#services", label: "Services" },
    { href: "#tarifs", label: "Tarifs" },
    { href: "#avis", label: "Avis clients" },
    { href: "#contact", label: "Contact" },
  ];
  return (
    <div
      className="sticky top-0 z-50 w-full flex items-center justify-between px-5 md:px-10"
      style={{
        height: 68,
        background: scrolled ? "rgba(248,249,255,0.85)" : "transparent",
        backdropFilter: scrolled ? "blur(14px)" : "none",
        WebkitBackdropFilter: scrolled ? "blur(14px)" : "none",
        borderBottom: scrolled ? `1px solid ${C.line}` : "1px solid transparent",
        transition: "all 0.25s ease",
      }}
    >
      <Logo size={34} />
      <div className="hidden md:flex items-center gap-7">
        {links.map((l) => (
          <a
            key={l.href}
            href={l.href}
            style={{ fontFamily: "'Inter', sans-serif", fontSize: 13.5, fontWeight: 500, color: C.ink, textDecoration: "none" }}
          >
            {l.label}
          </a>
        ))}
      </div>
      <div className="flex items-center gap-2">
        <button
          onClick={() => onSelect("agence")}
          className="hidden sm:block"
          style={{
            fontFamily: "'Inter', sans-serif",
            fontSize: 13,
            fontWeight: 600,
            color: C.ink,
            background: "transparent",
            border: `1.5px solid ${C.line}`,
            borderRadius: 10,
            padding: "8px 14px",
            cursor: "pointer",
          }}
        >
          Espace agence
        </button>
        <button
          onClick={() => onSelect("client")}
          style={{
            fontFamily: "'Inter', sans-serif",
            fontSize: 13,
            fontWeight: 600,
            color: "#fff",
            background: `linear-gradient(135deg, ${C.gradA}, ${C.gradB})`,
            border: "none",
            borderRadius: 10,
            padding: "9px 16px",
            cursor: "pointer",
          }}
        >
          Espace client
        </button>
      </div>
    </div>
  );
}

/* ---------------------------------------------------------------
   Star rating — used for review submission and display.
---------------------------------------------------------------- */
function Stars({ value, size = 16, interactive = false, onChange }) {
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((n) => (
        <span
          key={n}
          onClick={interactive ? () => onChange(n) : undefined}
          style={{ cursor: interactive ? "pointer" : "default", lineHeight: 0 }}
        >
          <svg width={size} height={size} viewBox="0 0 24 24" fill={n <= value ? C.gold : "none"} stroke={n <= value ? C.gold : C.line} strokeWidth="1.5">
            <path d="M12 2 L14.9 8.6 L22 9.3 L16.7 14 L18.2 21 L12 17.3 L5.8 21 L7.3 14 L2 9.3 L9.1 8.6 Z" strokeLinejoin="round" />
          </svg>
        </span>
      ))}
    </div>
  );
}

/* ---------------------------------------------------------------
   Section — shared heading treatment for the marketing page.
---------------------------------------------------------------- */
function Section({ id, eyebrow, title, subtitle, children, dark }) {
  return (
    <section id={id} className="w-full px-5 md:px-10 py-16 md:py-20" style={{ scrollMarginTop: 68 }}>
      <div className="max-w-5xl mx-auto flex flex-col items-center text-center gap-3 mb-12">
        {eyebrow && (
          <span
            className="uppercase"
            style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11.5, letterSpacing: "0.12em", color: C.gradB, fontWeight: 500 }}
          >
            {eyebrow}
          </span>
        )}
        <h2
          style={{
            fontFamily: "'Space Grotesk', sans-serif",
            fontWeight: 700,
            fontSize: 30,
            letterSpacing: "-0.01em",
            color: dark ? "#fff" : C.ink,
            maxWidth: 560,
          }}
        >
          {title}
        </h2>
        {subtitle && (
          <p style={{ fontFamily: "'Inter', sans-serif", fontSize: 14.5, color: dark ? "rgba(255,255,255,0.75)" : C.slate, maxWidth: 480 }}>
            {subtitle}
          </p>
        )}
      </div>
      <div className="max-w-5xl mx-auto">{children}</div>
    </section>
  );
}

const SERVICES = [
  { icon: <FileCheck2 />, title: "Dossier guidé", desc: "Une checklist personnalisée selon votre motif de voyage et votre situation — rien d'oublié." },
  { icon: <Search />, title: "Vérification des documents", desc: "Chaque pièce est relue avant dépôt pour éviter les refus liés à un dossier incomplet." },
  { icon: <Users />, title: "Accompagnement humain", desc: "Un conseiller dédié répond à vos questions du début du dossier jusqu'au rendez-vous." },
  { icon: <Stamp />, title: "Suivi en temps réel", desc: "Votre numéro de dossier vous permet de suivre chaque étape, à tout moment." },
];

function ServiceCard({ icon, title, desc, delay }) {
  return (
    <div
      className="flex flex-col gap-3 p-6"
      style={{
        background: "#fff",
        borderRadius: 16,
        border: `1px solid ${C.line}`,
        animation: "riseIn 0.5s ease both",
        animationDelay: delay,
      }}
    >
      <span
        className="flex items-center justify-center shrink-0"
        style={{ width: 44, height: 44, borderRadius: 12, background: `linear-gradient(135deg, ${C.gradA}18, ${C.gradC}18)` }}
      >
        {React.cloneElement(icon, { color: C.gradB, size: 20 })}
      </span>
      <span style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 600, fontSize: 16, color: C.ink }}>{title}</span>
      <span style={{ fontFamily: "'Inter', sans-serif", fontSize: 13.5, color: C.slate, lineHeight: 1.5 }}>{desc}</span>
    </div>
  );
}

function PricingPreviewCard({ tier, onSelect, featured }) {
  return (
    <div
      className="flex flex-col gap-4 p-6"
      style={{
        background: featured ? C.navy : "#fff",
        borderRadius: 16,
        border: `1px solid ${featured ? C.navy : C.line}`,
        boxShadow: featured ? `0 20px 44px -18px ${C.gradB}66` : "none",
      }}
    >
      {featured && (
        <span
          className="self-start uppercase"
          style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10, letterSpacing: "0.1em", color: C.goldLight, background: "rgba(255,255,255,0.1)", padding: "3px 8px", borderRadius: 999 }}
        >
          Le plus choisi
        </span>
      )}
      <span style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 600, fontSize: 18, color: featured ? "#fff" : C.ink }}>
        {tier.label}
      </span>
      <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 26, fontWeight: 600, color: featured ? C.goldLight : C.gradB }}>
        {tier.price}
      </span>
      <span style={{ fontFamily: "'Inter', sans-serif", fontSize: 13.5, color: featured ? "rgba(255,255,255,0.75)" : C.slate, lineHeight: 1.5, minHeight: 40 }}>
        {tier.desc}
      </span>
      <button
        onClick={() => onSelect("client")}
        style={{
          fontFamily: "'Inter', sans-serif",
          fontWeight: 600,
          fontSize: 13.5,
          color: featured ? C.navy : "#fff",
          background: featured ? "#fff" : `linear-gradient(135deg, ${C.gradA}, ${C.gradB})`,
          border: "none",
          borderRadius: 10,
          padding: "10px 0",
          cursor: "pointer",
        }}
      >
        Choisir cette offre
      </button>
    </div>
  );
}

function ReviewsSection() {
  const [reviews, setReviews] = useState(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    apiGetReviews()
      .then(setReviews)
      .catch(() => setError(true));
  }, []);

  const average = reviews?.length ? (reviews.reduce((s, r) => s + r.note, 0) / reviews.length).toFixed(1) : null;

  return (
    <Section
      id="avis"
      eyebrow="Avis clients"
      title="Ce que disent nos clients"
      subtitle={average ? `Note moyenne de ${average} / 5 sur ${reviews.length} avis.` : "Les avis apparaissent ici une fois les premiers dossiers accompagnés."}
    >
      {error && (
        <p className="text-center" style={{ fontFamily: "'Inter', sans-serif", fontSize: 13, color: C.slate }}>
          Les avis ne sont pas disponibles pour le moment.
        </p>
      )}
      {reviews && reviews.length === 0 && !error && (
        <div className="flex flex-col items-center gap-2 py-8">
          <Stars value={0} size={20} />
          <p style={{ fontFamily: "'Inter', sans-serif", fontSize: 13.5, color: C.slate, textAlign: "center" }}>
            Aucun avis pour le moment — les clients accompagnés sont invités à en laisser un après leur dossier.
          </p>
        </div>
      )}
      {reviews && reviews.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {reviews.slice(0, 6).map((r, i) => (
            <div key={i} className="flex flex-col gap-2 p-5" style={{ background: "#fff", borderRadius: 14, border: `1px solid ${C.line}` }}>
              <Stars value={r.note} size={14} />
              {r.commentaire && (
                <p style={{ fontFamily: "'Inter', sans-serif", fontSize: 13.5, color: C.ink, lineHeight: 1.5 }}>
                  « {r.commentaire} »
                </p>
              )}
              <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11, color: C.slate }}>{r.nom}</span>
            </div>
          ))}
        </div>
      )}
    </Section>
  );
}

function ContactSection() {
  const CONTACT = {
    phone: "+221 77 000 00 00",
    whatsapp: "221770000000",
    email: "contact@visassistance-pro.com",
  };
  return (
    <Section id="contact" eyebrow="Contact" title="Une question avant de commencer ?" subtitle="Notre équipe répond du lundi au samedi.">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <a
          href={`https://wa.me/${CONTACT.whatsapp}`}
          target="_blank"
          rel="noreferrer"
          className="flex flex-col items-center gap-2 p-6 text-center"
          style={{ background: "#fff", borderRadius: 16, border: `1px solid ${C.line}`, textDecoration: "none" }}
        >
          <span className="flex items-center justify-center" style={{ width: 44, height: 44, borderRadius: 12, background: `${C.green}18` }}>
            <Users size={20} color={C.green} />
          </span>
          <span style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 600, fontSize: 14, color: C.ink }}>WhatsApp</span>
          <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 12.5, color: C.slate }}>{CONTACT.phone}</span>
        </a>
        <a
          href={`tel:${CONTACT.phone.replace(/\s/g, "")}`}
          className="flex flex-col items-center gap-2 p-6 text-center"
          style={{ background: "#fff", borderRadius: 16, border: `1px solid ${C.line}`, textDecoration: "none" }}
        >
          <span className="flex items-center justify-center" style={{ width: 44, height: 44, borderRadius: 12, background: `${C.gradB}18` }}>
            <Building2 size={20} color={C.gradB} />
          </span>
          <span style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 600, fontSize: 14, color: C.ink }}>Téléphone</span>
          <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 12.5, color: C.slate }}>{CONTACT.phone}</span>
        </a>
        <a
          href={`mailto:${CONTACT.email}`}
          className="flex flex-col items-center gap-2 p-6 text-center"
          style={{ background: "#fff", borderRadius: 16, border: `1px solid ${C.line}`, textDecoration: "none" }}
        >
          <span className="flex items-center justify-center" style={{ width: 44, height: 44, borderRadius: 12, background: `${C.stamp}18` }}>
            <FileCheck2 size={20} color={C.stamp} />
          </span>
          <span style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 600, fontSize: 14, color: C.ink }}>Email</span>
          <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 12.5, color: C.slate }}>{CONTACT.email}</span>
        </a>
      </div>
      <p className="text-center mt-6" style={{ fontFamily: "'Inter', sans-serif", fontSize: 11.5, color: C.slate }}>
        Coordonnées provisoires — à remplacer par les vôtres.
      </p>
    </Section>
  );
}

function LandingPage({ onSelect }) {
  return (
    <div style={{ background: C.paper }}>
      <NavBar onSelect={onSelect} />

      {/* Hero */}
      <div id="accueil" className="flex flex-col items-center justify-center px-5 py-16 md:py-24 relative overflow-hidden" style={{ scrollMarginTop: 68 }}>
        <div className="absolute inset-0 overflow-hidden pointer-events-none" aria-hidden="true">
          <div style={{ position: "absolute", top: "-12%", left: "-10%", width: 420, height: 420, borderRadius: "50%", background: `radial-gradient(circle, ${C.gradA}55, transparent 70%)`, filter: "blur(10px)", animation: "floatSlow 13s ease-in-out infinite" }} />
          <div style={{ position: "absolute", top: "8%", right: "-14%", width: 380, height: 380, borderRadius: "50%", background: `radial-gradient(circle, ${C.gradC}4d, transparent 70%)`, filter: "blur(10px)", animation: "floatSlower 16s ease-in-out infinite" }} />
          <div style={{ position: "absolute", bottom: "-16%", left: "18%", width: 460, height: 460, borderRadius: "50%", background: `radial-gradient(circle, ${C.gradB}40, transparent 70%)`, filter: "blur(10px)", animation: "floatSlow 19s ease-in-out infinite reverse" }} />
        </div>
        <FlyingPlanes />

        <div className="w-full max-w-lg flex flex-col items-center text-center gap-2 mb-10 relative">
          <LogoMark size={92} animated />
          <h1
            className="mt-5"
            style={{
              fontFamily: "'Space Grotesk', sans-serif",
              fontWeight: 700,
              fontSize: 36,
              letterSpacing: "-0.02em",
              background: `linear-gradient(100deg, ${C.gradA}, ${C.gradB} 45%, ${C.gradC})`,
              backgroundSize: "200% auto",
              WebkitBackgroundClip: "text",
              backgroundClip: "text",
              color: "transparent",
              animation: "gradientShift 6s ease infinite, riseIn 0.6s ease 0.1s both",
            }}
          >
            VisAssistance Pro
          </h1>
          <p style={{ fontFamily: "'Inter', sans-serif", fontSize: 15, color: C.slate, animation: "riseIn 0.6s ease 0.18s both" }}>
            Montez votre dossier de visa Schengen, étape par étape, avec un vrai suivi jusqu'à la décision.
          </p>
        </div>

        <div className="w-full max-w-sm flex flex-col gap-3 relative">
          <RoleCard icon={<UserRound />} title="Je prépare mon dossier" desc="Créer ou retrouver mon dossier" onClick={() => onSelect("client")} delay="0.22s" />
          <RoleCard icon={<Building2 />} title="Espace agence" desc="Suivre l'ensemble des dossiers clients" onClick={() => onSelect("agence")} delay="0.3s" />
        </div>
      </div>

      {/* Services */}
      <Section id="services" eyebrow="Services" title="Un accompagnement complet, pas juste une checklist" subtitle="Chaque étape du dossier est prise en charge, du premier document au jour du rendez-vous.">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {SERVICES.map((s, i) => (
            <ServiceCard key={s.title} {...s} delay={`${i * 0.08}s`} />
          ))}
        </div>
      </Section>

      {/* Tarifs */}
      <Section id="tarifs" eyebrow="Tarifs" title="Une offre pour chaque niveau d'accompagnement" subtitle="Le tarif exact se confirme une fois votre dossier créé.">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {PRICING.map((t, i) => (
            <PricingPreviewCard key={t.id} tier={t} onSelect={onSelect} featured={i === 1} />
          ))}
        </div>
      </Section>

      {/* Avis clients */}
      <ReviewsSection />

      {/* Contact */}
      <ContactSection />

      {/* Footer */}
      <footer className="w-full px-5 md:px-10 py-10 flex flex-col md:flex-row items-center justify-between gap-4" style={{ borderTop: `1px solid ${C.line}` }}>
        <Logo size={28} />
        <p style={{ fontFamily: "'Inter', sans-serif", fontSize: 12, color: C.slate, textAlign: "center" }}>
          Démo — les dossiers créés ici sont visibles par tous les utilisateurs de cet aperçu.
        </p>
        <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11, color: C.slate }}>
          © {new Date().getFullYear()} VisAssistance Pro
        </span>
      </footer>
    </div>
  );
}

/* ---------------------------------------------------------------
   Client portal
---------------------------------------------------------------- */
function ClientPortal({ onBack }) {
  const [mode, setMode] = useState("choice"); // choice | lookup | onboarding | dossier
  const [dossier, setDossier] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [refInput, setRefInput] = useState("");
  const [copied, setCopied] = useState(false);

  const [form, setForm] = useState({ nom: "", telephone: "", pays: COUNTRIES[0], motif: "", situation: "" });
  const [selectedTier, setSelectedTier] = useState(null);

  const [reviewDone, setReviewDone] = useState(false);
  const [reviewNote, setReviewNote] = useState(0);
  const [reviewComment, setReviewComment] = useState("");
  const [reviewSent, setReviewSent] = useState(false);

  useEffect(() => {
    if (dossier?.paid) {
      apiReviewExists(dossier.ref)
        .then(setReviewDone)
        .catch(() => {});
    }
  }, [dossier?.ref, dossier?.paid]);

  const handleSubmitReview = async () => {
    if (!reviewNote) {
      setError("Merci de choisir une note avant d'envoyer.");
      return;
    }
    setError("");
    setLoading(true);
    try {
      await apiSubmitReview(dossier.ref, reviewNote, reviewComment);
      setReviewSent(true);
      setReviewDone(true);
    } catch (e) {
      setError(e.message || "Erreur lors de l'envoi de l'avis.");
    }
    setLoading(false);
  };

  const handleLookup = async () => {
    setError("");
    if (!refInput.trim()) return;
    setLoading(true);
    try {
      const found = await apiGetDossier(refInput);
      if (!found) {
        setError("Aucun dossier trouvé pour cette référence.");
      } else {
        setDossier(found);
        setMode("dossier");
      }
    } catch {
      setError("Impossible de joindre le serveur. Réessayez.");
    }
    setLoading(false);
  };

  const handleContinueToPayment = async () => {
    if (!form.nom.trim() || !form.motif || !form.situation) {
      setError("Merci de compléter tous les champs.");
      return;
    }
    setError("");
    setLoading(true);
    try {
      const created = await apiCreateDossier(form);
      setDossier(created);
      setMode("paiement");
    } catch {
      setError("Impossible de créer le dossier. Vérifiez que le serveur est démarré.");
    }
    setLoading(false);
  };

  const handlePay = async () => {
    if (!selectedTier) {
      setError("Merci de choisir une offre.");
      return;
    }
    setError("");
    setLoading(true);
    try {
      const { checkout_url } = await apiCheckout(dossier.ref, selectedTier);
      window.open(checkout_url, "_blank");
      setMode("verification");
    } catch (e) {
      setError(e.message || "Erreur lors de la création du paiement.");
    }
    setLoading(false);
  };

  const handleVerifyPayment = async () => {
    setLoading(true);
    setError("");
    try {
      const refreshed = await apiGetDossier(dossier.ref);
      setDossier(refreshed);
      if (refreshed.paid) {
        setMode("dossier");
      } else {
        setError("Paiement pas encore confirmé — patientez quelques secondes après avoir payé, puis réessayez.");
      }
    } catch {
      setError("Impossible de vérifier le paiement pour le moment.");
    }
    setLoading(false);
  };

  const toggleDoc = async (id) => {
    const updatedDocs = dossier.documents.map((d) => (d.id === id ? { ...d, checked: !d.checked } : d));
    setDossier({ ...dossier, documents: updatedDocs });
    try {
      await apiUpdateDossier(dossier.ref, { documents: updatedDocs });
    } catch {
      // la mise à jour locale reste visible même si la sauvegarde échoue
    }
  };

  const updateNote = async (id, note) => {
    const updatedDocs = dossier.documents.map((d) => (d.id === id ? { ...d, note } : d));
    setDossier({ ...dossier, documents: updatedDocs });
    try {
      await apiUpdateDossier(dossier.ref, { documents: updatedDocs });
    } catch {
      // la mise à jour locale reste visible même si la sauvegarde échoue
    }
  };

  const copyRef = async () => {
    try {
      await navigator.clipboard.writeText(dossier.ref);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // clipboard unavailable — ignore silently
    }
  };

  return (
    <div className="min-h-screen px-5 py-8" style={{ background: C.paper }}>
      <div className="max-w-md mx-auto">
        <button
          onClick={() => {
            if (mode === "choice") onBack();
            else if (mode === "recu" || mode === "avis") setMode("dossier");
            else setMode("choice");
          }}
          className="flex items-center gap-1 mb-6"
          style={{ background: "transparent", border: "none", cursor: "pointer" }}
        >
          <ArrowLeft size={16} color={C.slate} />
          <span style={{ fontFamily: "'Inter', sans-serif", fontSize: 13, color: C.slate }}>Retour</span>
        </button>

        {mode === "choice" && (
          <div className="flex flex-col gap-3">
            <h2 style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 600, fontSize: 22, color: C.navy }}>
              Votre dossier
            </h2>
            <button
              onClick={() => setMode("onboarding")}
              className="flex items-center gap-3 p-4 w-full text-left"
              style={{ background: C.navy, color: "#fff", border: "none" }}
            >
              <Plus size={18} />
              <span style={{ fontFamily: "'Inter', sans-serif", fontWeight: 600, fontSize: 14 }}>
                Créer un nouveau dossier
              </span>
            </button>
            <button
              onClick={() => setMode("lookup")}
              className="flex items-center gap-3 p-4 w-full text-left"
              style={{ background: C.paperCard, border: `1px solid ${C.line}` }}
            >
              <Search size={18} color={C.navy} />
              <span style={{ fontFamily: "'Inter', sans-serif", fontWeight: 600, fontSize: 14, color: C.ink }}>
                Retrouver mon dossier existant
              </span>
            </button>
          </div>
        )}

        {mode === "lookup" && (
          <div className="flex flex-col gap-4">
            <h2 style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 600, fontSize: 22, color: C.navy }}>
              Retrouver mon dossier
            </h2>
            <Field label="Référence du dossier">
              <input
                style={inputStyle}
                placeholder="VP-2026-1234"
                value={refInput}
                onChange={(e) => setRefInput(e.target.value)}
              />
            </Field>
            {error && (
              <p className="flex items-center gap-2" style={{ color: C.stamp, fontSize: 13, fontFamily: "'Inter', sans-serif" }}>
                <AlertCircle size={14} /> {error}
              </p>
            )}
            <PrimaryButton onClick={handleLookup} disabled={loading}>
              {loading ? <Loader2 size={16} className="animate-spin" /> : "Retrouver"}
            </PrimaryButton>
          </div>
        )}

        {mode === "onboarding" && (
          <div className="flex flex-col gap-4">
            <h2 style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 600, fontSize: 22, color: C.navy }}>
              Nouveau dossier
            </h2>
            <Field label="Nom complet">
              <input style={inputStyle} value={form.nom} onChange={(e) => setForm({ ...form, nom: e.target.value })} />
            </Field>
            <Field label="Téléphone">
              <input style={inputStyle} value={form.telephone} onChange={(e) => setForm({ ...form, telephone: e.target.value })} />
            </Field>
            <Field label="Pays de destination">
              <select style={inputStyle} value={form.pays} onChange={(e) => setForm({ ...form, pays: e.target.value })}>
                {COUNTRIES.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </Field>
            <Field label="Motif du voyage">
              <select style={inputStyle} value={form.motif} onChange={(e) => setForm({ ...form, motif: e.target.value })}>
                <option value="">Sélectionner…</option>
                {MOTIFS.map((m) => (
                  <option key={m.id} value={m.id}>{m.label}</option>
                ))}
              </select>
            </Field>
            <Field label="Situation professionnelle">
              <select style={inputStyle} value={form.situation} onChange={(e) => setForm({ ...form, situation: e.target.value })}>
                <option value="">Sélectionner…</option>
                {SITUATIONS.map((s) => (
                  <option key={s.id} value={s.id}>{s.label}</option>
                ))}
              </select>
            </Field>
            {error && (
              <p className="flex items-center gap-2" style={{ color: C.stamp, fontSize: 13, fontFamily: "'Inter', sans-serif" }}>
                <AlertCircle size={14} /> {error}
              </p>
            )}
            <PrimaryButton onClick={handleContinueToPayment} disabled={loading}>
              Choisir mon offre
            </PrimaryButton>
          </div>
        )}

        {mode === "paiement" && (
          <div className="flex flex-col gap-4">
            <h2 style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 600, fontSize: 22, color: C.navy }}>
              Choisissez votre offre
            </h2>
            <div className="flex flex-col gap-3">
              {PRICING.map((tier) => {
                const active = selectedTier === tier.id;
                return (
                  <button
                    key={tier.id}
                    onClick={() => setSelectedTier(tier.id)}
                    className="flex flex-col gap-1 p-4 text-left w-full relative"
                    style={{
                      background: active ? `linear-gradient(135deg, ${C.gradA}12, ${C.gradC}12)` : C.paperCard,
                      borderRadius: 14,
                      border: `2px solid ${active ? C.gradB : C.line}`,
                      boxShadow: active ? `0 8px 22px -12px ${C.gradB}66` : "none",
                      transform: active ? "scale(1.015)" : "scale(1)",
                      transition: "all 0.18s ease",
                    }}
                  >
                    <div className="flex items-center justify-between">
                      <span className="flex items-center gap-2">
                        <span
                          className="flex items-center justify-center shrink-0"
                          style={{
                            width: 20,
                            height: 20,
                            borderRadius: 999,
                            border: `2px solid ${active ? C.gradB : C.line}`,
                            background: active ? `linear-gradient(135deg, ${C.gradA}, ${C.gradB})` : "transparent",
                            transition: "all 0.18s ease",
                          }}
                        >
                          {active && <CheckCircle2 size={20} color="#fff" style={{ marginLeft: -2, marginTop: -2 }} />}
                        </span>
                        <span style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 600, fontSize: 16, color: C.ink }}>
                          {tier.label}
                        </span>
                      </span>
                      <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 14, color: active ? C.gradB : C.gold, fontWeight: 600 }}>
                        {tier.price}
                      </span>
                    </div>
                    <span style={{ fontFamily: "'Inter', sans-serif", fontSize: 13, color: C.slate, marginLeft: 28 }}>
                      {tier.desc}
                    </span>
                  </button>
                );
              })}
            </div>
            {!selectedTier && (
              <p style={{ fontFamily: "'Inter', sans-serif", fontSize: 12, color: C.slate, textAlign: "center" }}>
                Choisissez une offre ci-dessus, puis payez juste en dessous.
              </p>
            )}
            {error && (
              <p className="flex items-center gap-2" style={{ color: C.stamp, fontSize: 13, fontFamily: "'Inter', sans-serif" }}>
                <AlertCircle size={14} /> {error}
              </p>
            )}
            <PrimaryButton onClick={handlePay} disabled={loading}>
              {loading ? <Loader2 size={16} className="animate-spin" /> : "Payer avec Wave / Orange Money"}
            </PrimaryButton>
            <p style={{ fontFamily: "'Inter', sans-serif", fontSize: 11, color: C.slate, textAlign: "center" }}>
              Votre dossier {dossier?.ref} est déjà créé — le paiement l'active.
            </p>
          </div>
        )}

        {mode === "verification" && (
          <div className="flex flex-col gap-4 items-center text-center py-6">
            <Stamp size={28} color={C.gold} />
            <h2 style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 600, fontSize: 20, color: C.navy }}>
              Paiement en cours
            </h2>
            <p style={{ fontFamily: "'Inter', sans-serif", fontSize: 13, color: C.slate }}>
              Une fois le paiement terminé dans l'onglet ouvert (Wave, Orange Money…), revenez ici et vérifiez.
            </p>
            {error && (
              <p className="flex items-center gap-2" style={{ color: C.stamp, fontSize: 13, fontFamily: "'Inter', sans-serif" }}>
                <AlertCircle size={14} /> {error}
              </p>
            )}
            <PrimaryButton onClick={handleVerifyPayment} disabled={loading}>
              {loading ? <Loader2 size={16} className="animate-spin" /> : "J'ai payé — vérifier"}
            </PrimaryButton>
          </div>
        )}

        {mode === "dossier" && dossier && (
          <div className="flex flex-col gap-6">
            <div className="flex items-center gap-4">
              <Seal percent={progressOf(dossier)} />
              <div className="flex-1">
                <p style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 600, fontSize: 18, color: C.navy }}>
                  {dossier.nom}
                </p>
                <p style={{ fontFamily: "'Inter', sans-serif", fontSize: 13, color: C.slate }}>
                  {dossier.pays} · {MOTIFS.find((m) => m.id === dossier.motif)?.label}
                  {dossier.tier && ` · Offre ${PRICING.find((t) => t.id === dossier.tier)?.label}`}
                </p>
                <button
                  onClick={copyRef}
                  className="flex items-center gap-1 mt-1"
                  style={{ background: "transparent", border: "none", cursor: "pointer" }}
                >
                  <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 12, color: C.gold }}>
                    {dossier.ref}
                  </span>
                  <Copy size={12} color={C.gold} />
                  {copied && <span style={{ fontSize: 11, color: C.green }}>copié</span>}
                </button>
              </div>
            </div>

            <div>
              <p
                className="uppercase mb-2"
                style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11, color: C.slate, letterSpacing: "0.08em" }}
              >
                Statut du dossier
              </p>
              <StatusStepper status={dossier.status} editable={false} />
            </div>

            <div>
              <p
                className="uppercase mb-2"
                style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11, color: C.slate, letterSpacing: "0.08em" }}
              >
                Documents à réunir
              </p>
              <Checklist documents={dossier.documents} onToggle={toggleDoc} onNoteChange={updateNote} />
            </div>

            <p style={{ fontFamily: "'Inter', sans-serif", fontSize: 12, color: C.slate }}>
              Conservez votre référence <strong>{dossier.ref}</strong> pour retrouver ce dossier plus tard.
            </p>

            {dossier.paid && (
              <div className="flex flex-col gap-3">
                <button
                  onClick={() => setMode("recu")}
                  className="flex items-center justify-center gap-2 p-3 w-full"
                  style={{
                    fontFamily: "'Inter', sans-serif",
                    fontWeight: 600,
                    fontSize: 13.5,
                    color: C.ink,
                    background: "#fff",
                    border: `1.5px solid ${C.line}`,
                    borderRadius: 12,
                    cursor: "pointer",
                  }}
                >
                  <FileCheck2 size={16} color={C.gradB} /> Voir mon reçu de paiement
                </button>

                {!reviewDone && (
                  <div
                    className="flex flex-col items-center gap-2 p-4 text-center"
                    style={{ background: `linear-gradient(135deg, ${C.gradA}0d, ${C.gradC}0d)`, borderRadius: 14, border: `1px solid ${C.line}` }}
                  >
                    <span style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 600, fontSize: 14, color: C.ink }}>
                      Comment s'est passée votre expérience ?
                    </span>
                    <button
                      onClick={() => setMode("avis")}
                      style={{
                        fontFamily: "'Inter', sans-serif",
                        fontWeight: 600,
                        fontSize: 13,
                        color: "#fff",
                        background: `linear-gradient(135deg, ${C.gradA}, ${C.gradB})`,
                        border: "none",
                        borderRadius: 10,
                        padding: "8px 16px",
                        cursor: "pointer",
                      }}
                    >
                      Laisser un avis
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {mode === "recu" && dossier && (
          <div className="flex flex-col gap-5">
            <div className="flex flex-col items-center gap-3 p-6" style={{ background: "#fff", borderRadius: 18, border: `1px solid ${C.line}` }}>
              <Logo size={32} />
              <span className="uppercase" style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11, letterSpacing: "0.12em", color: C.slate }}>
                Reçu de paiement
              </span>
              <span
                className="uppercase"
                style={{
                  fontFamily: "'Inter', sans-serif",
                  fontWeight: 700,
                  fontSize: 12,
                  color: C.green,
                  background: `${C.green}18`,
                  padding: "4px 12px",
                  borderRadius: 999,
                }}
              >
                Payé
              </span>

              <div className="w-full flex flex-col gap-3 mt-2" style={{ borderTop: `1px dashed ${C.line}`, paddingTop: 16 }}>
                <div className="flex items-center justify-between">
                  <span style={{ fontFamily: "'Inter', sans-serif", fontSize: 13, color: C.slate }}>Numéro de suivi</span>
                  <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 14, fontWeight: 600, color: C.ink }}>{dossier.ref}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span style={{ fontFamily: "'Inter', sans-serif", fontSize: 13, color: C.slate }}>Client</span>
                  <span style={{ fontFamily: "'Inter', sans-serif", fontSize: 13, color: C.ink }}>{dossier.nom}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span style={{ fontFamily: "'Inter', sans-serif", fontSize: 13, color: C.slate }}>Offre</span>
                  <span style={{ fontFamily: "'Inter', sans-serif", fontSize: 13, color: C.ink }}>
                    {PRICING.find((t) => t.id === dossier.tier)?.label || "—"}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span style={{ fontFamily: "'Inter', sans-serif", fontSize: 13, color: C.slate }}>Montant</span>
                  <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 14, fontWeight: 600, color: C.gradB }}>
                    {PRICING.find((t) => t.id === dossier.tier)?.price || "—"}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span style={{ fontFamily: "'Inter', sans-serif", fontSize: 13, color: C.slate }}>Date</span>
                  <span style={{ fontFamily: "'Inter', sans-serif", fontSize: 13, color: C.ink }}>
                    {dossier.paid_at ? new Date(dossier.paid_at).toLocaleDateString("fr-FR") : new Date().toLocaleDateString("fr-FR")}
                  </span>
                </div>
              </div>
            </div>

            <button
              onClick={() => window.print()}
              className="flex items-center justify-center gap-2 p-3 w-full"
              style={{
                fontFamily: "'Inter', sans-serif",
                fontWeight: 600,
                fontSize: 13.5,
                color: "#fff",
                background: `linear-gradient(135deg, ${C.gradA}, ${C.gradB})`,
                border: "none",
                borderRadius: 12,
                cursor: "pointer",
              }}
            >
              Imprimer / Enregistrer en PDF
            </button>
            <p className="text-center" style={{ fontFamily: "'Inter', sans-serif", fontSize: 11.5, color: C.slate }}>
              Conservez ce numéro de suivi ({dossier.ref}) : il fait foi en cas de question sur votre dossier.
            </p>
          </div>
        )}

        {mode === "avis" && dossier && (
          <div className="flex flex-col gap-4">
            {!reviewSent ? (
              <>
                <h2 style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 600, fontSize: 20, color: C.navy }}>
                  Votre avis compte
                </h2>
                <p style={{ fontFamily: "'Inter', sans-serif", fontSize: 13, color: C.slate }}>
                  Dossier {dossier.ref} — quelques secondes pour partager votre expérience.
                </p>
                <div className="flex justify-center py-2">
                  <Stars value={reviewNote} size={32} interactive onChange={setReviewNote} />
                </div>
                <Field label="Un commentaire (facultatif)">
                  <textarea
                    style={{ ...inputStyle, minHeight: 90, resize: "vertical" }}
                    value={reviewComment}
                    onChange={(e) => setReviewComment(e.target.value)}
                    placeholder="Ce que vous avez apprécié, ou ce qu'on peut améliorer…"
                  />
                </Field>
                {error && (
                  <p className="flex items-center gap-2" style={{ color: C.stamp, fontSize: 13, fontFamily: "'Inter', sans-serif" }}>
                    <AlertCircle size={14} /> {error}
                  </p>
                )}
                <PrimaryButton onClick={handleSubmitReview} disabled={loading}>
                  {loading ? <Loader2 size={16} className="animate-spin" /> : "Envoyer mon avis"}
                </PrimaryButton>
              </>
            ) : (
              <div className="flex flex-col items-center gap-3 py-8 text-center">
                <CheckCircle2 size={36} color={C.green} />
                <span style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 600, fontSize: 17, color: C.ink }}>
                  Merci pour votre avis !
                </span>
                <button
                  onClick={() => setMode("dossier")}
                  style={{
                    fontFamily: "'Inter', sans-serif",
                    fontWeight: 600,
                    fontSize: 13,
                    color: C.gradB,
                    background: "transparent",
                    border: "none",
                    cursor: "pointer",
                  }}
                >
                  Retour au dossier
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

/* ---------------------------------------------------------------
   Agence portal
---------------------------------------------------------------- */
const STATUS_BADGE = {
  ouvert: { label: "Ouvert", color: C.slate },
  collecte: { label: "Collecte", color: C.slate },
  complet: { label: "Complet", color: C.gold },
  soumis: { label: "Soumis", color: C.navy },
  rdv: { label: "RDV pris", color: C.navy },
  decision: { label: "Décision", color: C.green },
};

function AgencePortal({ onBack, agencePin }) {
  const [dossiers, setDossiers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("tous");
  const [stats, setStats] = useState(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const all = await apiListDossiers(agencePin);
      setDossiers(all);
    } catch {
      setDossiers([]);
    }
    setLoading(false);
  }, [agencePin]);

  useEffect(() => {
    refresh();
    apiGetStats(agencePin)
      .then(setStats)
      .catch(() => setStats(null));
  }, [refresh, agencePin]);

  const updateSelected = async (updated) => {
    setSelected(updated);
    try {
      const saved = await apiUpdateDossier(
        updated.ref,
        { documents: updated.documents, notes: updated.notes, status: updated.status, decision: updated.decision },
        agencePin
      );
      setDossiers((prev) => prev.map((d) => (d.ref === saved.ref ? saved : d)));
    } catch {
      // la mise à jour locale reste visible même si la sauvegarde échoue
    }
  };

  const filtered = dossiers.filter((d) => {
    const matchesQuery =
      !query ||
      d.nom.toLowerCase().includes(query.toLowerCase()) ||
      d.ref.toLowerCase().includes(query.toLowerCase());
    const matchesFilter = filter === "tous" || d.status === filter;
    return matchesQuery && matchesFilter;
  });

  if (selected) {
    return (
      <div className="min-h-screen px-5 py-8" style={{ background: C.paper }}>
        <div className="max-w-md mx-auto flex flex-col gap-6">
          <button
            onClick={() => setSelected(null)}
            className="flex items-center gap-1"
            style={{ background: "transparent", border: "none", cursor: "pointer" }}
          >
            <ArrowLeft size={16} color={C.slate} />
            <span style={{ fontFamily: "'Inter', sans-serif", fontSize: 13, color: C.slate }}>
              Tous les dossiers
            </span>
          </button>

          <div className="flex items-center gap-4">
            <Seal percent={progressOf(selected)} />
            <div>
              <p style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 600, fontSize: 18, color: C.navy }}>
                {selected.nom}
              </p>
              <p style={{ fontFamily: "'Inter', sans-serif", fontSize: 13, color: C.slate }}>
                {selected.pays} · {selected.telephone || "—"}
                {selected.tier && ` · Offre ${PRICING.find((t) => t.id === selected.tier)?.label}`}
              </p>
              <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 12, color: C.gold }}>
                {selected.ref}
              </span>
            </div>
          </div>

          <div>
            <p
              className="uppercase mb-2"
              style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11, color: C.slate, letterSpacing: "0.08em" }}
            >
              Statut — cliquer pour mettre à jour
            </p>
            <StatusStepper
              status={selected.status}
              editable
              onChange={(status) => updateSelected({ ...selected, status })}
            />
            {selected.status === "decision" && (
              <div className="flex gap-2 mt-2 ml-9">
                <button
                  onClick={() => updateSelected({ ...selected, decision: "accepte" })}
                  className="px-3 py-1.5"
                  style={{
                    fontFamily: "'Inter', sans-serif",
                    fontSize: 12,
                    fontWeight: 600,
                    background: selected.decision === "accepte" ? C.green : "transparent",
                    color: selected.decision === "accepte" ? "#fff" : C.green,
                    border: `1px solid ${C.green}`,
                  }}
                >
                  Accepté
                </button>
                <button
                  onClick={() => updateSelected({ ...selected, decision: "refuse" })}
                  className="px-3 py-1.5"
                  style={{
                    fontFamily: "'Inter', sans-serif",
                    fontSize: 12,
                    fontWeight: 600,
                    background: selected.decision === "refuse" ? C.stamp : "transparent",
                    color: selected.decision === "refuse" ? "#fff" : C.stamp,
                    border: `1px solid ${C.stamp}`,
                  }}
                >
                  Refusé
                </button>
              </div>
            )}
          </div>

          <div>
            <p
              className="uppercase mb-2"
              style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11, color: C.slate, letterSpacing: "0.08em" }}
            >
              Documents
            </p>
            <Checklist
              documents={selected.documents}
              onToggle={(id) =>
                updateSelected({
                  ...selected,
                  documents: selected.documents.map((d) => (d.id === id ? { ...d, checked: !d.checked } : d)),
                })
              }
              onNoteChange={(id, note) =>
                updateSelected({
                  ...selected,
                  documents: selected.documents.map((d) => (d.id === id ? { ...d, note } : d)),
                })
              }
            />
          </div>

          <Field label="Notes internes">
            <textarea
              style={{ ...inputStyle, minHeight: 80, resize: "vertical" }}
              value={selected.notes || ""}
              onChange={(e) => setSelected({ ...selected, notes: e.target.value })}
              onBlur={() => updateSelected(selected)}
            />
          </Field>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen px-5 py-8" style={{ background: C.paper }}>
      <div className="max-w-md mx-auto flex flex-col gap-5">
        <button
          onClick={onBack}
          className="flex items-center gap-1"
          style={{ background: "transparent", border: "none", cursor: "pointer" }}
        >
          <ArrowLeft size={16} color={C.slate} />
          <span style={{ fontFamily: "'Inter', sans-serif", fontSize: 13, color: C.slate }}>Retour</span>
        </button>

        <div className="flex items-center gap-2">
          <Users size={20} color={C.navy} />
          <h2 style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 600, fontSize: 22, color: C.navy }}>
            Dossiers clients
          </h2>
        </div>

        {stats && (
          <div className="grid grid-cols-2 gap-2.5">
            {[
              { label: "Dossiers", value: stats.total, color: C.gradB },
              { label: "Payés", value: stats.payes, color: C.green },
              { label: "En attente", value: stats.enAttente, color: C.gold },
              { label: "Revenu", value: `${stats.revenu.toLocaleString("fr-FR")} F`, color: C.gradA },
            ].map((s) => (
              <div key={s.label} className="flex flex-col gap-1 p-3.5" style={{ background: "#fff", borderRadius: 12, border: `1px solid ${C.line}` }}>
                <span className="uppercase" style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10, letterSpacing: "0.08em", color: C.slate }}>
                  {s.label}
                </span>
                <span style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 700, fontSize: 20, color: s.color }}>
                  {s.value}
                </span>
              </div>
            ))}
            {stats.nbAvis > 0 && (
              <div className="col-span-2 flex items-center justify-between p-3.5" style={{ background: "#fff", borderRadius: 12, border: `1px solid ${C.line}` }}>
                <span style={{ fontFamily: "'Inter', sans-serif", fontSize: 12.5, color: C.slate }}>
                  Note moyenne des avis ({stats.nbAvis})
                </span>
                <div className="flex items-center gap-1.5">
                  <Stars value={Math.round(stats.noteMoyenne)} size={14} />
                  <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 13, fontWeight: 600, color: C.ink }}>
                    {stats.noteMoyenne.toFixed(1)}
                  </span>
                </div>
              </div>
            )}
          </div>
        )}

        <input
          style={inputStyle}
          placeholder="Rechercher par nom ou référence"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />

        <div className="flex gap-2 flex-wrap">
          {["tous", ...STATUS_STEPS.map((s) => s.id)].map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className="px-3 py-1"
              style={{
                fontFamily: "'JetBrains Mono', monospace",
                fontSize: 11,
                border: `1px solid ${filter === f ? C.navy : C.line}`,
                background: filter === f ? C.navy : "transparent",
                color: filter === f ? "#fff" : C.slate,
              }}
            >
              {f === "tous" ? "Tous" : STATUS_BADGE[f]?.label}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-10">
            <Loader2 size={20} className="animate-spin" color={C.slate} />
          </div>
        ) : filtered.length === 0 ? (
          <p style={{ fontFamily: "'Inter', sans-serif", fontSize: 13, color: C.slate, textAlign: "center", padding: "24px 0" }}>
            Aucun dossier pour l'instant. Les dossiers créés côté client apparaîtront ici.
          </p>
        ) : (
          <div className="flex flex-col gap-2">
            {filtered.map((d) => (
              <button
                key={d.ref}
                onClick={() => setSelected(d)}
                className="flex items-center gap-3 p-3 text-left w-full"
                style={{ background: C.paperCard, border: `1px solid ${C.line}` }}
              >
                <FileCheck2 size={18} color={C.navy} />
                <span className="flex-1">
                  <span style={{ fontFamily: "'Inter', sans-serif", fontWeight: 600, fontSize: 14, color: C.ink, display: "block" }}>
                    {d.nom}
                  </span>
                  <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11, color: C.slate }}>
                    {d.ref} · {d.pays} · {progressOf(d)}%
                    {d.tier && ` · ${PRICING.find((t) => t.id === d.tier)?.label}`}
                  </span>
                </span>
                <span
                  className="px-2 py-1"
                  style={{
                    fontFamily: "'JetBrains Mono', monospace",
                    fontSize: 10,
                    color: "#fff",
                    background: STATUS_BADGE[d.status]?.color || C.slate,
                  }}
                >
                  {STATUS_BADGE[d.status]?.label}
                </span>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

/* ---------------------------------------------------------------
   Agency access gate — verified by the backend (AGENCE_PIN in its .env)
---------------------------------------------------------------- */
function AgenceGate({ onBack, onUnlocked }) {
  const [input, setInput] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    setError("");
    setLoading(true);
    try {
      const ok = await apiAgenceLogin(input);
      if (ok) {
        onUnlocked(input);
      } else {
        setError("Code incorrect.");
      }
    } catch {
      setError("Impossible de joindre le serveur. Vérifiez qu'il est démarré.");
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen px-5 py-8 flex flex-col" style={{ background: C.paper }}>
      <div className="max-w-md mx-auto w-full flex flex-col gap-4">
        <button
          onClick={onBack}
          className="flex items-center gap-1"
          style={{ background: "transparent", border: "none", cursor: "pointer" }}
        >
          <ArrowLeft size={16} color={C.slate} />
          <span style={{ fontFamily: "'Inter', sans-serif", fontSize: 13, color: C.slate }}>Retour</span>
        </button>
        <h2 style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 600, fontSize: 22, color: C.navy }}>
          Espace agence
        </h2>
        <p style={{ fontFamily: "'Inter', sans-serif", fontSize: 12, color: C.slate }}>
          Le code d'accès est défini dans le fichier .env de votre serveur (AGENCE_PIN).
        </p>
        <Field label="Code d'accès">
          <input
            type="password"
            style={inputStyle}
            value={input}
            onChange={(e) => setInput(e.target.value)}
          />
        </Field>
        {error && (
          <p className="flex items-center gap-2" style={{ color: C.stamp, fontSize: 13, fontFamily: "'Inter', sans-serif" }}>
            <AlertCircle size={14} /> {error}
          </p>
        )}
        <PrimaryButton onClick={handleLogin} disabled={loading}>
          {loading ? <Loader2 size={16} className="animate-spin" /> : "Entrer"}
        </PrimaryButton>
      </div>
    </div>
  );
}

/* ---------------------------------------------------------------
   Root
---------------------------------------------------------------- */
export default function App() {
  const [role, setRole] = useState(null);
  const [agencePin, setAgencePin] = useState(null);
  return (
    <>
      {role === null && <LandingPage onSelect={setRole} />}
      {role === "client" && <ClientPortal onBack={() => setRole(null)} />}
      {role === "agence" && !agencePin && (
        <AgenceGate onBack={() => setRole(null)} onUnlocked={(pin) => setAgencePin(pin)} />
      )}
      {role === "agence" && agencePin && (
        <AgencePortal agencePin={agencePin} onBack={() => { setRole(null); setAgencePin(null); }} />
      )}
    </>
  );
}
