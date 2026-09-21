import React, { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { supabase } from "./supabaseClient";
import {
  Home, Trophy, User, Coins, Moon, Sun, ChevronLeft, Play, CheckCircle2, XCircle,
  Sparkles, Zap, Lock, RefreshCw, Flame, Star, Award, Gift, Layers, Search, X,
  Brain, GraduationCap, Compass, Landmark, Atom, Cpu, Gamepad2, Clapperboard,
  Swords, Music, Dumbbell, Goal, Puzzle, Languages, UtensilsCrossed, PartyPopper,
  ClipboardCheck, Briefcase, Globe, ArrowRight, Timer as TimerIcon, ChevronRight, HelpCircle
} from "lucide-react";

/* ============================================================
   QUIZ MASTER — data model
   Categories, sub-topics, and questions now live in Supabase
   (see /supabase/schema.sql + seed.sql) instead of being hardcoded
   here. admin.html reads/writes the same tables directly, so any
   edit made there shows up here on the next page load — no manual
   copy-paste step anymore.
   ============================================================ */
// Maps the icon name string stored in the `categories.icon` column
// to the actual icon component. Add an import above + an entry here
// if you create a category in admin.html with a new icon name.
const ICONS = {
  Brain, GraduationCap, Compass, Landmark, Atom, Cpu, Gamepad2, Clapperboard,
  Swords, Music, Dumbbell, Goal, Puzzle, Languages, UtensilsCrossed,
  PartyPopper, ClipboardCheck, Briefcase, Globe, Sparkles,
};

// Populated at runtime by fetchQuizData(). Read by components after
// the app's initial data load completes (see the `dataReady` state
// in QuizMaster below, which gates rendering until this is filled in).
let CATEGORY_INDEX = [];
let ALL_POPULATED = [];

function buildIndex(categories, subtopics, questions) {
  const questionsBySubtopic = {};
  questions.forEach((q) => {
    if (!questionsBySubtopic[q.subtopic_id]) questionsBySubtopic[q.subtopic_id] = [];
    questionsBySubtopic[q.subtopic_id].push({ q: q.question, options: q.options, correct: q.correct, explain: q.explain });
  });
  const subtopicsByCategory = {};
  subtopics.forEach((s) => {
    if (!subtopicsByCategory[s.category_id]) subtopicsByCategory[s.category_id] = [];
    subtopicsByCategory[s.category_id].push({ id: s.id, label: s.label, questions: questionsBySubtopic[s.id] || [] });
  });
  CATEGORY_INDEX = categories.map((c) => ({
    id: c.id, label: c.label, icon: c.icon, color: c.color,
    subtopics: subtopicsByCategory[c.id] || [],
  }));
  ALL_POPULATED = CATEGORY_INDEX.flatMap((c) =>
    c.subtopics.flatMap((s) => s.questions.map((q) => ({ ...q, catId: c.id })))
  );
}

async function fetchQuizData() {
  const [catRes, subRes, qRes] = await Promise.all([
    supabase.from("categories").select("*").order("sort_order"),
    supabase.from("subtopics").select("*").order("sort_order"),
    supabase.from("questions").select("*").order("sort_order"),
  ]);
  const err = catRes.error || subRes.error || qRes.error;
  if (err) { console.error("Failed to load quiz data:", err); return false; }
  buildIndex(catRes.data || [], subRes.data || [], qRes.data || []);
  return true;
}

const FEATURED_IDS = ["world-facts","basic-mathematics","countries-of-the-world","ancient-egypt","space-science","artificial-intelligence","video-games","marvel-universe","naruto","football-soccer","riddles","guess-the-flag"];

function findSubtopic(id) {
  for (const c of CATEGORY_INDEX) {
    const s = c.subtopics.find((x) => x.id === id);
    if (s) return { ...s, catId: c.id, catLabel: c.label, catColor: c.color, catIcon: ICONS[c.icon] };
  }
  return null;
}


const DIFFICULTIES = [
  { id: "beginner", label: "Beginner", time: 20, mult: 1 },
  { id: "intermediate", label: "Intermediate", time: 14, mult: 2 },
  { id: "expert", label: "Expert", time: 9, mult: 3 },
];

const LEVEL_TITLES = [
  { at: 1, title: "Beginner" },
  { at: 5, title: "Knowledge Explorer" },
  { at: 10, title: "Quiz Expert" },
  { at: 25, title: "Grandmaster" },
  { at: 50, title: "Quiz Master" },
];

const ACHIEVEMENTS = [
  { id: "first_win", label: "First Victory", desc: "Complete your first quiz", check: (s) => s.quizzesPlayed >= 1 },
  { id: "perfect", label: "Perfect Score", desc: "Answer all questions correctly in one quiz", check: (s, last) => last && last.correct === last.total && last.total > 0 },
  { id: "century", label: "100 Questions", desc: "Answer 100 questions total", check: (s) => s.questionsAnswered >= 100 },
  { id: "streak_5", label: "On Fire", desc: "Reach a 5-day play streak", check: (s) => s.dayStreak >= 5 },
  { id: "level_10", label: "Quiz Expert", desc: "Reach Level 10", check: (s) => s.level >= 10 },
  { id: "explorer", label: "Explorer", desc: "Play quizzes from 5 different categories", check: (s) => Object.keys(s.categoryCounts || {}).length >= 5 },
];

const DEFAULT_PROFILE = {
  username: "Player", level: 1, xp: 0, points: 0, coins: 0, dayStreak: 0, lastPlayedDate: null,
  quizzesPlayed: 0, questionsAnswered: 0, correctAnswers: 0, bestScore: 0, favoriteCategory: null,
  achievements: [], categoryCounts: {}, history: [],
};

function xpForLevel(level) { return 100 + (level - 1) * 60; }
function titleForLevel(level) { let t = LEVEL_TITLES[0].title; for (const l of LEVEL_TITLES) if (level >= l.at) t = l.title; return t; }
function todaySeed() { const d = new Date(); return d.getFullYear() * 10000 + (d.getMonth() + 1) * 100 + d.getDate(); }
function seededShuffle(arr, seed) {
  const a = [...arr]; let s = seed;
  for (let i = a.length - 1; i > 0; i--) { s = (s * 9301 + 49297) % 233280; const j = Math.floor((s / 233280) * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
  return a;
}
function buildDailyQuiz() { return seededShuffle(ALL_POPULATED, todaySeed()).slice(0, 5); }
function dateStr(d = new Date()) { return d.toISOString().slice(0, 10); }

/* ---------------- Theme ---------------- */
const THEME = {
  dark: { bg: "#0B0F1F", surface: "#131A2E", surface2: "#1A2338", text: "#F1F5F9", textDim: "#8B95AC", border: "#232C45",
    coral: "#F43F5E", lime: "#4ADE80", cyan: "#2DD4BF", gold: "#FBBF24", violet: "#8B5CF6", pink: "#EC4899" },
  light: { bg: "#F4F6FB", surface: "#FFFFFF", surface2: "#EAEFF9", text: "#0B0F1F", textDim: "#5B6478", border: "#DCE3F0",
    coral: "#DC2626", lime: "#16A34A", cyan: "#0D9488", gold: "#CA8A04", violet: "#7C3AED", pink: "#DB2777" },
};

function getOrCreateDeviceId() {
  try {
    let id = localStorage.getItem("qm_device_id");
    if (!id) {
      id = (crypto && crypto.randomUUID) ? crypto.randomUUID() : `dev-${Date.now()}-${Math.random().toString(36).slice(2)}`;
      localStorage.setItem("qm_device_id", id);
    }
    return id;
  } catch (e) {
    return `dev-${Date.now()}-${Math.random().toString(36).slice(2)}`;
  }
}

async function syncLeaderboard(deviceId, p) {
  try {
    await supabase.from("leaderboard").upsert({
      device_id: deviceId,
      username: p.username || "Player",
      level: p.level,
      points: p.points,
      coins: p.coins,
      day_streak: p.dayStreak,
      achievements_count: p.achievements.length,
      updated_at: new Date().toISOString(),
    });
  } catch (e) {
    console.error("Leaderboard sync failed:", e);
  }
}

export default function QuizMaster() {
  const [booting, setBooting] = useState(true);
  const [dataError, setDataError] = useState(false);
  const [themeMode, setThemeMode] = useState("dark");
  const [profile, setProfile] = useState(DEFAULT_PROFILE);
  const [screen, setScreen] = useState("home");
  const [activeCat, setActiveCat] = useState(null);
  const [activeSubtopic, setActiveSubtopic] = useState(null);
  const [selectedMode, setSelectedMode] = useState(null);
  const [selectedDiff, setSelectedDiff] = useState(DIFFICULTIES[1]);
  const [query, setQuery] = useState("");
  const [toast, setToast] = useState(null);

  const T = THEME[themeMode];
  const deviceIdRef = useRef(null);
  if (deviceIdRef.current === null) deviceIdRef.current = getOrCreateDeviceId();

  useEffect(() => {
    (async () => {
      // Profile/theme are per-device preferences, so plain localStorage is
      // the right tool here — the quiz content itself comes from Supabase
      // (fetchQuizData below) since that's what admin.html also edits.
      try { const p = localStorage.getItem("qm_profile"); if (p) setProfile({ ...DEFAULT_PROFILE, ...JSON.parse(p) }); } catch (e) {}
      try { const t = localStorage.getItem("qm_settings"); if (t) setThemeMode(JSON.parse(t).theme || "dark"); } catch (e) {}
      const ok = await fetchQuizData();
      if (!ok) setDataError(true);
      setTimeout(() => setBooting(false), 800);
    })();
  }, []);

  const saveProfile = useCallback((next) => {
    setProfile(next);
    try { localStorage.setItem("qm_profile", JSON.stringify(next)); } catch (e) { console.error(e); }
    syncLeaderboard(deviceIdRef.current, next);
  }, []);

  const updateUsername = useCallback((name) => {
    setProfile((prev) => {
      const next = { ...prev, username: name || "Player" };
      try { localStorage.setItem("qm_profile", JSON.stringify(next)); } catch (e) { console.error(e); }
      syncLeaderboard(deviceIdRef.current, next);
      return next;
    });
  }, []);

  const toggleTheme = useCallback(() => {
    const next = themeMode === "dark" ? "light" : "dark";
    setThemeMode(next);
    try { localStorage.setItem("qm_settings", JSON.stringify({ theme: next })); } catch (e) { console.error(e); }
  }, [themeMode]);

  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(null), 2400); };

  const applyDayStreak = useCallback((p) => {
    const today = dateStr();
    if (p.lastPlayedDate === today) return p;
    const yesterday = dateStr(new Date(Date.now() - 86400000));
    const dayStreak = p.lastPlayedDate === yesterday ? p.dayStreak + 1 : 1;
    return { ...p, dayStreak, lastPlayedDate: today };
  }, []);

  const finishQuiz = useCallback((result) => {
    setProfile((prev) => {
      let p = applyDayStreak(prev);
      const newXp = p.xp + result.pointsEarned;
      let level = p.level, xp = newXp, xpNeed = xpForLevel(level);
      while (xp >= xpNeed) { xp -= xpNeed; level += 1; xpNeed = xpForLevel(level); }
      const categoryCounts = { ...p.categoryCounts };
      if (result.catId) categoryCounts[result.catId] = (categoryCounts[result.catId] || 0) + 1;
      let favoriteCategory = p.favoriteCategory, max = 0;
      Object.entries(categoryCounts).forEach(([k, v]) => { if (v > max) { max = v; favoriteCategory = k; } });
      const next = {
        ...p, level, xp, points: p.points + result.pointsEarned, coins: p.coins + Math.round(result.pointsEarned / 20),
        quizzesPlayed: p.quizzesPlayed + 1, questionsAnswered: p.questionsAnswered + result.total,
        correctAnswers: p.correctAnswers + result.correct, bestScore: Math.max(p.bestScore, result.pointsEarned),
        categoryCounts, favoriteCategory, history: [{ ...result, date: dateStr() }, ...p.history].slice(0, 25),
      };
      const newlyUnlocked = ACHIEVEMENTS.filter((a) => !next.achievements.includes(a.id) && a.check(next, result));
      if (newlyUnlocked.length) { next.achievements = [...next.achievements, ...newlyUnlocked.map((a) => a.id)]; showToast(`Achievement unlocked: ${newlyUnlocked[0].label}`); }
      saveProfile(next);
      return next;
    });
  }, [applyDayStreak, saveProfile]);

  const resetProgress = useCallback(() => { saveProfile(DEFAULT_PROFILE); showToast("Progress reset"); }, [saveProfile]);
  const goHome = () => { setScreen("home"); setActiveCat(null); setActiveSubtopic(null); setQuery(""); };

  return (
    <div style={{ background: T.bg, color: T.text, fontFamily: "'Inter', sans-serif", minHeight: "100vh" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Orbitron:wght@600;700;800;900&family=Inter:wght@400;500;600;700&display=swap');
        .qm-heading { font-family: 'Orbitron', sans-serif; letter-spacing: 0.02em; }
        .qm-shout { font-family: 'Orbitron', sans-serif; letter-spacing: 0.08em; text-transform: uppercase; }
        .qm-btn { transition: transform .12s ease, box-shadow .12s ease, opacity .12s ease; }
        .qm-btn:active { transform: scale(0.96); }
        .qm-card { transition: transform .15s ease, box-shadow .15s ease; }
        .qm-card:hover { transform: translateY(-3px); }
        @keyframes qm-pop { 0% { transform: scale(.85); opacity: 0; } 100% { transform: scale(1); opacity: 1; } }
        .qm-pop { animation: qm-pop .3s ease; }
        @keyframes qm-shake { 0%,100% { transform: translateX(0); } 25% { transform: translateX(-6px); } 75% { transform: translateX(6px); } }
        .qm-shake { animation: qm-shake .3s ease; }
        .qm-scrollx { display: flex; gap: 12px; overflow-x: auto; padding-bottom: 6px; -ms-overflow-style: none; scrollbar-width: none; }
        .qm-scrollx::-webkit-scrollbar { display: none; }
        input::placeholder { color: ${T.textDim}; }
      `}</style>

      {booting ? (
        <SplashScreen T={T} />
      ) : dataError ? (
        <DataErrorScreen T={T} />
      ) : (
        <div style={{ maxWidth: 480, margin: "0 auto", paddingBottom: 84, position: "relative" }}>
          <TopBar T={T} profile={profile} themeMode={themeMode} toggleTheme={toggleTheme} goHome={goHome} />
          <div style={{ padding: "0 16px" }}>
            {screen === "home" && (
              <HomeScreen
                T={T} profile={profile} query={query} setQuery={setQuery}
                onOpenCategory={(catId) => { setActiveCat(catId); setScreen("subtopics"); }}
                onOpenSubtopic={(subId) => {
                  const s = findSubtopic(subId);
                  if (!s || s.questions.length === 0) { showToast("Questions coming soon for this topic"); return; }
                  setActiveSubtopic(subId); setScreen("battleSetup");
                }}
                onDaily={() => { setSelectedMode("daily"); setScreen("quiz"); }}
                onLeaderboard={() => setScreen("leaderboard")}
                onProfile={() => setScreen("profile")}
                onAchievements={() => setScreen("achievements")}
              />
            )}
            {screen === "subtopics" && (
              <SubtopicsScreen
                T={T} category={CATEGORY_INDEX.find((c) => c.id === activeCat)}
                onBack={() => setScreen("home")}
                onPick={(subId) => {
                  const s = findSubtopic(subId);
                  if (!s || s.questions.length === 0) { showToast("Questions coming soon for this topic"); return; }
                  setActiveSubtopic(subId); setScreen("battleSetup");
                }}
              />
            )}
            {screen === "battleSetup" && (
              <BattleSetupScreen T={T} subtopic={findSubtopic(activeSubtopic)} onBack={() => setScreen("subtopics")}
                onStart={(mode, diff) => { setSelectedMode(mode); setSelectedDiff(diff); setScreen("quiz"); }} />
            )}
            {screen === "quiz" && (
              <QuizScreen T={T} mode={selectedMode} subtopicId={activeSubtopic} difficulty={selectedDiff}
                onFinish={(result) => { finishQuiz(result); setScreen("results"); }} onExit={goHome} />
            )}
            {screen === "results" && (
              <ResultsScreen T={T} lastResult={profile.history[0]} onPlayAgain={goHome} onHome={goHome} />
            )}
            {screen === "leaderboard" && <LeaderboardScreen T={T} profile={profile} onBack={goHome} />}
            {screen === "profile" && <ProfileScreen T={T} profile={profile} onReset={resetProgress} onBack={goHome} onUsernameChange={updateUsername} />}
            {screen === "achievements" && <AchievementsScreen T={T} profile={profile} onBack={goHome} />}
          </div>
          <BottomNav T={T} screen={screen} onHome={goHome} onSearchTab={() => setScreen("home")} onLeaderboard={() => setScreen("leaderboard")} onProfile={() => setScreen("profile")} />
          {toast && <Toast T={T} message={toast} />}
        </div>
      )}
    </div>
  );
}

/* ---------------- Splash ---------------- */
function SplashScreen({ T }) {
  return (
    <div style={{ height: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", background: `radial-gradient(circle at 50% 35%, ${T.surface2}, ${T.bg})` }}>
      <div className="qm-pop" style={{ position: "relative", width: 130, height: 130, display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 26 }}>
        <div style={{ position: "absolute", inset: 0, borderRadius: 20, border: `2px dashed ${T.cyan}88`, transform: "rotate(45deg)" }} />
        <div style={{ position: "absolute", inset: -14, borderRadius: "50%", background: `radial-gradient(circle, ${T.cyan}33, transparent 70%)`, filter: "blur(6px)" }} />
        <div style={{ position: "relative", width: 76, height: 76, borderRadius: 20, background: T.surface2, display: "flex", alignItems: "center", justifyContent: "center", boxShadow: `0 0 26px ${T.cyan}55` }}>
          <HelpCircle size={34} color={T.cyan} />
        </div>
      </div>
      <div className="qm-shout" style={{ fontSize: 26, fontWeight: 800, color: T.text }}>Quiz Master</div>
      <div className="qm-shout" style={{ color: T.textDim, marginTop: 8, fontSize: 11, fontWeight: 700 }}>Play. Learn. Win.</div>
      <div style={{ marginTop: 28, width: 140, height: 5, borderRadius: 4, background: T.surface2, overflow: "hidden" }}>
        <div style={{ width: "60%", height: "100%", background: `linear-gradient(90deg, ${T.cyan}, ${T.lime})`, animation: "qm-loadbar 1.3s ease-in-out infinite" }} />
      </div>
      <style>{`@keyframes qm-loadbar { 0% { transform: translateX(-100%);} 50% { transform: translateX(60%);} 100% { transform: translateX(220%);} }`}</style>
    </div>
  );
}

/* ---------------- Data error ---------------- */
function DataErrorScreen({ T }) {
  return (
    <div style={{ height: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: 30, textAlign: "center", background: T.bg, color: T.text }}>
      <div style={{ width: 64, height: 64, borderRadius: 20, background: `${T.coral}22`, display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 18 }}>
        <XCircle size={30} color={T.coral} />
      </div>
      <div className="qm-heading" style={{ fontSize: 18, fontWeight: 800 }}>Couldn't load quiz content</div>
      <div style={{ color: T.textDim, fontSize: 13, marginTop: 8, maxWidth: 320 }}>
        This usually means the Supabase URL/key aren't set correctly, or the database tables haven't been created yet.
        Check <code>VITE_SUPABASE_URL</code> and <code>VITE_SUPABASE_ANON_KEY</code> in your environment variables,
        and make sure you've run <code>schema.sql</code> and <code>seed.sql</code> in your Supabase project.
      </div>
    </div>
  );
}

/* ---------------- Top bar ---------------- */
function TopBar({ T, profile, themeMode, toggleTheme, goHome }) {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 16px 8px" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 9, cursor: "pointer" }} onClick={goHome}>
        <div style={{ width: 36, height: 36, borderRadius: "50%", background: T.surface2, border: `1.5px solid ${T.cyan}`, boxShadow: `0 0 12px ${T.cyan}55`, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <HelpCircle size={18} color={T.cyan} />
        </div>
        <span className="qm-shout" style={{ fontWeight: 700, fontSize: 15 }}>Quiz Master</span>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 5, background: T.surface, border: `1px solid ${T.border}`, borderRadius: 20, padding: "6px 10px", fontSize: 13, fontWeight: 700 }}>
          <Coins size={14} color={T.gold} />{profile.coins}
        </div>
        <button className="qm-btn" onClick={toggleTheme} style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 10, width: 34, height: 34, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>
          {themeMode === "dark" ? <Sun size={16} color={T.textDim} /> : <Moon size={16} color={T.textDim} />}
        </button>
      </div>
    </div>
  );
}

/* ---------------- Home ---------------- */
function HomeScreen({ T, profile, query, setQuery, onOpenCategory, onOpenSubtopic, onDaily, onLeaderboard, onProfile, onAchievements }) {
  const need = xpForLevel(profile.level);
  const pct = Math.min(100, Math.round((profile.xp / need) * 100));
  const dailyDone = profile.lastPlayedDate === dateStr() && profile.history[0]?.mode === "daily";

  const results = useMemo(() => {
    if (!query.trim()) return null;
    const q = query.toLowerCase();
    const catMatches = CATEGORY_INDEX.filter((c) => c.label.toLowerCase().includes(q));
    const subMatches = CATEGORY_INDEX.flatMap((c) => c.subtopics.filter((s) => s.label.toLowerCase().includes(q)).map((s) => ({ ...s, catId: c.id, catLabel: c.label })));
    return { catMatches, subMatches };
  }, [query]);

  return (
    <div>
      <div style={{ position: "relative", marginTop: 12 }}>
        <Search size={16} color={T.textDim} style={{ position: "absolute", left: 14, top: 13 }} />
        <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search categories or topics..."
          style={{ width: "100%", background: T.surface, border: `1px solid ${T.border}`, borderRadius: 14, padding: "12px 14px 12px 38px", color: T.text, fontSize: 13.5, fontFamily: "inherit", boxSizing: "border-box" }} />
        {query && (
          <button onClick={() => setQuery("")} style={{ position: "absolute", right: 10, top: 10, background: "none", border: "none", cursor: "pointer" }}>
            <X size={16} color={T.textDim} />
          </button>
        )}
      </div>

      {results ? (
        <div style={{ marginTop: 16 }}>
          {results.catMatches.length === 0 && results.subMatches.length === 0 && (
            <div style={{ color: T.textDim, fontSize: 13, marginTop: 20, textAlign: "center" }}>No matches. Try another search.</div>
          )}
          {results.catMatches.map((c) => {
            const Icon = ICONS[c.icon];
            return (
              <button key={c.id} onClick={() => onOpenCategory(c.id)} className="qm-btn" style={{ width: "100%", display: "flex", alignItems: "center", gap: 10, background: T.surface, border: `1px solid ${T.border}`, borderRadius: 12, padding: 12, marginBottom: 8, cursor: "pointer", fontFamily: "inherit", textAlign: "left" }}>
                <Icon size={17} color={c.color} /><span style={{ fontWeight: 700, fontSize: 13.5 }}>{c.label}</span>
                <span style={{ marginLeft: "auto", fontSize: 11, color: T.textDim }}>{c.subtopics.length} topics</span>
              </button>
            );
          })}
          {results.subMatches.map((s) => (
            <button key={s.id} onClick={() => onOpenSubtopic(s.id)} className="qm-btn" style={{ width: "100%", display: "flex", alignItems: "center", gap: 10, background: T.surface, border: `1px solid ${T.border}`, borderRadius: 12, padding: 12, marginBottom: 8, cursor: "pointer", fontFamily: "inherit", textAlign: "left" }}>
              <div><div style={{ fontWeight: 700, fontSize: 13 }}>{s.label}</div><div style={{ fontSize: 11, color: T.textDim }}>{s.catLabel}</div></div>
              {s.questions.length === 0 && <span style={{ marginLeft: "auto", fontSize: 10, color: T.textDim, background: T.surface2, padding: "3px 8px", borderRadius: 8 }}>Soon</span>}
              {s.questions.length > 0 && <ChevronRight size={15} color={T.textDim} style={{ marginLeft: "auto" }} />}
            </button>
          ))}
        </div>
      ) : (
        <>
          <div className="qm-shout" style={{ fontSize: 11, color: T.textDim, marginTop: 18, fontWeight: 700 }}>Welcome back</div>
          <div className="qm-heading" style={{ fontSize: 22, fontWeight: 800, marginTop: 4, lineHeight: 1.25 }}>Ready for your next challenge?</div>

          <div style={{ background: T.surface, border: `1px solid ${T.cyan}44`, boxShadow: `0 0 24px ${T.cyan}22`, borderRadius: 18, padding: 16, marginTop: 16 }}>
            <div className="qm-shout" style={{ fontSize: 10.5, color: T.textDim, marginBottom: 8 }}>Level {profile.level} · {titleForLevel(profile.level)}</div>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12.5, color: T.textDim, marginBottom: 6 }}>
              <span>XP progress</span><span>{profile.xp} / {need}</span>
            </div>
            <div style={{ height: 8, borderRadius: 6, background: T.surface2, overflow: "hidden" }}>
              <div style={{ width: `${pct}%`, height: "100%", background: `linear-gradient(90deg, ${T.cyan}, ${T.lime})`, transition: "width .5s ease" }} />
            </div>
            <div style={{ display: "flex", gap: 10, marginTop: 14 }}>
              <MiniStat icon={<Star size={14} color={T.gold} />} label="Points" value={profile.points} T={T} />
              <MiniStat icon={<Flame size={14} color={T.pink} />} label="Streak" value={`${profile.dayStreak}d`} T={T} />
              <MiniStat icon={<Award size={14} color={T.cyan} />} label="Badges" value={profile.achievements.length} T={T} />
            </div>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 16 }}>
            <button className="qm-btn qm-shout" onClick={() => document.getElementById("qm-category-browse")?.scrollIntoView({ behavior: "smooth" })} style={{ width: "100%", background: `linear-gradient(135deg, ${T.cyan}, ${T.lime})`, border: "none", borderRadius: 16, padding: "15px", color: "#08110D", fontWeight: 800, fontSize: 13.5, cursor: "pointer" }}>
              Start Quiz
            </button>
            <button className="qm-btn qm-shout" onClick={onDaily} disabled={dailyDone} style={{ width: "100%", background: dailyDone ? T.surface : `linear-gradient(135deg, ${T.pink}, ${T.violet})`, border: dailyDone ? `1px solid ${T.border}` : "none", borderRadius: 16, padding: "15px", color: dailyDone ? T.textDim : "#fff", fontWeight: 800, fontSize: 13.5, cursor: dailyDone ? "default" : "pointer" }}>
              {dailyDone ? "Daily Challenge Completed" : "Start Daily Challenge"}
            </button>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginTop: 10 }}>
            <PillButton T={T} label="Leaderboard" onClick={onLeaderboard} />
            <PillButton T={T} label="Rewards" onClick={onAchievements} />
          </div>

          <div className="qm-heading" style={{ marginTop: 22, marginBottom: 10, fontWeight: 700, fontSize: 15 }}>Featured quizzes</div>
          <div className="qm-scrollx">
            {FEATURED_IDS.filter((id) => findSubtopic(id)?.questions.length > 0).map((id) => {
              const s = findSubtopic(id); const Icon = s.catIcon;
              return (
                <button key={id} onClick={() => onOpenSubtopic(id)} className="qm-btn qm-card" style={{ minWidth: 130, background: `linear-gradient(160deg, ${s.catColor}26, ${T.surface})`, border: `1px solid ${T.border}`, borderRadius: 16, padding: 14, textAlign: "left", cursor: "pointer", fontFamily: "inherit", flexShrink: 0 }}>
                  <Icon size={18} color={s.catColor} />
                  <div style={{ fontWeight: 700, fontSize: 12.5, marginTop: 10, color: T.text }}>{s.label}</div>
                  <div style={{ fontSize: 10.5, color: T.textDim, marginTop: 2 }}>{s.questions.length} questions</div>
                </button>
              );
            })}
          </div>

          <div id="qm-category-browse" className="qm-heading" style={{ marginTop: 22, marginBottom: 10, fontWeight: 700, fontSize: 15 }}>Browse all categories</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            {CATEGORY_INDEX.map((c) => {
              const Icon = ICONS[c.icon];
              const populated = c.subtopics.filter((s) => s.questions.length > 0).length;
              return (
                <button key={c.id} onClick={() => onOpenCategory(c.id)} className="qm-btn qm-card" style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 16, padding: 14, textAlign: "left", cursor: "pointer", fontFamily: "inherit" }}>
                  <div style={{ width: 36, height: 36, borderRadius: "50%", background: `${c.color}22`, display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 10 }}>
                    <Icon size={17} color={c.color} />
                  </div>
                  <div style={{ fontWeight: 700, fontSize: 12.5, color: T.text }}>{c.label}</div>
                  <div style={{ fontSize: 10.5, color: T.textDim, marginTop: 2 }}>{c.subtopics.length} topics{populated ? ` · ${populated} ready` : ""}</div>
                </button>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}

function MiniStat({ icon, label, value, T }) {
  return (
    <div style={{ flex: 1, background: T.surface2, borderRadius: 12, padding: "8px 10px", textAlign: "center" }}>
      <div style={{ display: "flex", justifyContent: "center", marginBottom: 3 }}>{icon}</div>
      <div style={{ fontWeight: 700, fontSize: 14 }}>{value}</div>
      <div style={{ fontSize: 10, color: T.textDim }}>{label}</div>
    </div>
  );
}

function PillButton({ T, label, onClick }) {
  return (
    <button className="qm-btn qm-shout" onClick={onClick} style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 14, padding: "13px 12px", textAlign: "center", cursor: "pointer", fontFamily: "inherit", fontSize: 12, fontWeight: 700, color: T.text }}>
      {label}
    </button>
  );
}

/* ---------------- Subtopics ---------------- */
function SubtopicsScreen({ T, category, onBack, onPick }) {
  if (!category) return null;
  const Icon = ICONS[category.icon];
  return (
    <div>
      <BackRow T={T} onBack={onBack} />
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 6 }}>
        <div style={{ width: 42, height: 42, borderRadius: "50%", background: `${category.color}22`, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <Icon size={20} color={category.color} />
        </div>
        <div className="qm-heading" style={{ fontSize: 19, fontWeight: 800 }}>{category.label}</div>
      </div>
      <div style={{ marginTop: 14, display: "flex", flexDirection: "column", gap: 8 }}>
        {category.subtopics.map((s) => {
          const ready = s.questions.length > 0;
          return (
            <button key={s.id} onClick={() => onPick(s.id)} className="qm-btn" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", background: T.surface, border: `1px solid ${T.border}`, borderRadius: 13, padding: "13px 14px", cursor: "pointer", fontFamily: "inherit", opacity: ready ? 1 : 0.6 }}>
              <span style={{ fontWeight: 600, fontSize: 13.5, color: T.text }}>{s.label}</span>
              {ready ? <ChevronRight size={16} color={T.textDim} /> : <span style={{ fontSize: 10, color: T.textDim, background: T.surface2, padding: "3px 8px", borderRadius: 8 }}>Soon</span>}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function BackRow({ T, onBack }) {
  return (
    <button onClick={onBack} className="qm-btn" style={{ display: "flex", alignItems: "center", gap: 5, background: "none", border: "none", color: T.textDim, fontSize: 13, fontWeight: 600, padding: "8px 0", cursor: "pointer", fontFamily: "inherit" }}>
      <ChevronLeft size={16} /> Back
    </button>
  );
}

/* ---------------- Difficulty ---------------- */
/* ---------------- Battle setup (mode + difficulty combined) ---------------- */
function BattleSetupScreen({ T, subtopic, onBack, onStart }) {
  const [mode, setMode] = useState("classic");
  const [diff, setDiff] = useState(DIFFICULTIES[1]);
  if (!subtopic) return null;

  const modes = [
    { id: "classic", label: "Classic", desc: `${subtopic.questions.length} questions`, icon: Layers },
    { id: "time", label: "Time Challenge", desc: "60s, answer as many as you can", icon: TimerIcon },
  ];

  return (
    <div>
      <BackRow T={T} onBack={onBack} />
      <div className="qm-heading" style={{ fontSize: 20, fontWeight: 800, marginTop: 4 }}>Pick your battle</div>
      <div style={{ color: T.textDim, fontSize: 13, marginTop: 2 }}>{subtopic.label} · mode, then difficulty</div>

      <div className="qm-shout" style={{ fontSize: 11, color: T.textDim, marginTop: 20, marginBottom: 10 }}>Game mode</div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
        {modes.map((m) => {
          const MIcon = m.icon;
          const active = mode === m.id;
          return (
            <button key={m.id} onClick={() => setMode(m.id)} className="qm-btn" style={{
              background: T.surface, borderRadius: 16, padding: 14, textAlign: "left", cursor: "pointer", fontFamily: "inherit",
              border: active ? `1.5px solid ${T.cyan}` : `1px solid ${T.border}`,
              boxShadow: active ? `0 0 18px ${T.cyan}44` : "none",
            }}>
              <MIcon size={19} color={active ? T.cyan : T.textDim} />
              <div style={{ fontWeight: 700, fontSize: 13.5, color: T.text, marginTop: 10 }}>{m.label}</div>
              <div style={{ fontSize: 11, color: T.textDim, marginTop: 2 }}>{m.desc}</div>
            </button>
          );
        })}
      </div>

      {mode === "classic" && (
        <>
          <div className="qm-shout" style={{ fontSize: 11, color: T.textDim, marginTop: 22, marginBottom: 10 }}>Difficulty</div>
          <div style={{ display: "grid", gridTemplateColumns: `repeat(${DIFFICULTIES.length}, 1fr)`, gap: 8 }}>
            {DIFFICULTIES.map((d) => {
              const active = diff.id === d.id;
              return (
                <button key={d.id} onClick={() => setDiff(d)} className="qm-btn" style={{
                  borderRadius: 12, padding: "10px 4px", textAlign: "center", cursor: "pointer", fontFamily: "inherit", border: "none",
                  background: active ? `linear-gradient(135deg, ${T.cyan}, ${T.lime})` : T.surface,
                  color: active ? "#08110D" : T.text,
                }}>
                  <div style={{ fontWeight: 800, fontSize: 12.5 }}>{d.label}</div>
                  <div style={{ fontSize: 10, marginTop: 1, opacity: 0.85 }}>{d.time}s</div>
                </button>
              );
            })}
          </div>
        </>
      )}

      <button className="qm-btn qm-shout" onClick={() => onStart(mode, diff)} style={{ width: "100%", marginTop: 26, background: `linear-gradient(135deg, ${T.cyan}, ${T.lime})`, border: "none", borderRadius: 16, padding: 16, color: "#08110D", fontWeight: 800, fontSize: 14, cursor: "pointer" }}>
        Play
      </button>
    </div>
  );
}

/* ---------------- Quiz gameplay ---------------- */
function QuizScreen({ T, mode, subtopicId, difficulty, onFinish, onExit }) {
  const subtopic = mode === "classic" ? findSubtopic(subtopicId) : null;
  const questions = useRef(
    mode === "daily" ? buildDailyQuiz()
    : mode === "time" ? seededShuffle(ALL_POPULATED, Date.now() % 100000)
    : seededShuffle(subtopic.questions.map((q) => ({ ...q, catId: subtopic.catId })), Date.now() % 100000)
  ).current;

  const perQTime = mode === "classic" ? difficulty.time : 15;
  const mult = mode === "classic" ? difficulty.mult : 1;

  const [idx, setIdx] = useState(0);
  const [timeLeft, setTimeLeft] = useState(mode === "time" ? 60 : perQTime);
  const [selected, setSelected] = useState(null);
  const [locked, setLocked] = useState(false);
  const [correctCount, setCorrectCount] = useState(0);
  const [answeredCount, setAnsweredCount] = useState(0);
  const [streak, setStreak] = useState(0);
  const [pointsEarned, setPointsEarned] = useState(0);
  const [shake, setShake] = useState(false);
  const [confirmExit, setConfirmExit] = useState(false);

  const current = questions[idx % questions.length];

  const endQuiz = useCallback((c, t, p) => {
    onFinish({ correct: c, total: t, pointsEarned: p, catId: mode === "classic" ? subtopic.catId : null, mode });
  }, [onFinish, subtopic, mode]);

  useEffect(() => {
    if (locked || confirmExit) return;
    if (timeLeft <= 0) {
      if (mode === "time") { endQuiz(correctCount, answeredCount, pointsEarned); return; }
      handleAnswer(-1);
      return;
    }
    const t = setTimeout(() => setTimeLeft((v) => v - 1), 1000);
    return () => clearTimeout(t);
  }, [timeLeft, locked, confirmExit]);

  function handleAnswer(optionIdx) {
    if (locked) return;
    setLocked(true); setSelected(optionIdx);
    const isCorrect = optionIdx === current.correct;
    const timeBonus = isCorrect && mode !== "time" ? Math.max(0, Math.round((timeLeft / perQTime) * 50)) : 0;
    const streakBonus = isCorrect ? Math.min(streak, 5) * 10 : 0;
    const earned = Math.round(((isCorrect ? 100 : 0) + timeBonus + streakBonus) * mult);
    if (!isCorrect) { setShake(true); setTimeout(() => setShake(false), 320); }

    const newCorrect = correctCount + (isCorrect ? 1 : 0);
    const newAnswered = answeredCount + 1;
    const newPoints = pointsEarned + earned;
    setCorrectCount(newCorrect); setAnsweredCount(newAnswered); setPointsEarned(newPoints);
    setStreak(isCorrect ? streak + 1 : 0);

    setTimeout(() => {
      const isLast = mode !== "time" && idx + 1 >= questions.length;
      if (isLast) { endQuiz(newCorrect, newAnswered, newPoints); return; }
      setIdx((v) => v + 1); setSelected(null); setLocked(false);
      setTimeLeft(mode === "time" ? timeLeft : perQTime);
    }, 1200);
  }

  const progressLabel = mode === "time" ? `⏱ ${timeLeft}s left` : `Question ${idx + 1} / ${questions.length}`;
  const ringPct = mode === "time" ? (timeLeft / 60) * 100 : (timeLeft / perQTime) * 100;

  return (
    <div>
      {confirmExit ? (
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 4, marginBottom: 14, background: T.surface, border: `1px solid ${T.coral}`, borderRadius: 14, padding: "10px 14px" }}>
          <span style={{ fontSize: 12.5, color: T.coral, fontWeight: 700 }}>Quit? You'll lose this quiz's progress.</span>
          <div style={{ display: "flex", gap: 8 }}>
            <button className="qm-btn" onClick={onExit} style={{ background: T.coral, border: "none", borderRadius: 10, padding: "6px 12px", color: "#fff", fontWeight: 700, fontSize: 12, cursor: "pointer" }}>Quit</button>
            <button className="qm-btn" onClick={() => setConfirmExit(false)} style={{ background: T.surface2, border: "none", borderRadius: 10, padding: "6px 12px", color: T.text, fontWeight: 700, fontSize: 12, cursor: "pointer" }}>Cancel</button>
          </div>
        </div>
      ) : (
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 4, marginBottom: 14 }}>
          <button className="qm-btn" onClick={() => setConfirmExit(true)} style={{ background: "none", border: "none", padding: 0, cursor: "pointer", display: "flex", alignItems: "center", gap: 6 }}>
            <X size={16} color={T.textDim} />
            <span style={{ fontSize: 13, fontWeight: 600, color: T.textDim }}>{progressLabel}</span>
          </button>
          <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, fontWeight: 700, color: T.gold }}><Zap size={14} /> {pointsEarned} pts</div>
        </div>
      )}
      <TimerRing T={T} pct={ringPct} danger={mode !== "time" && timeLeft <= 3} />
      <div className={shake ? "qm-shake" : ""} style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 18, padding: 18, marginTop: 14, minHeight: 90 }}>
        {(mode === "time" || mode === "daily") && current.catId && (
          <div style={{ fontSize: 11, color: T.textDim, marginBottom: 6, fontWeight: 600 }}>{CATEGORY_INDEX.find((c) => c.id === current.catId)?.label}</div>
        )}
        <div className="qm-heading" style={{ fontWeight: 700, fontSize: 16, lineHeight: 1.4 }}>{current.q}</div>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginTop: 14 }}>
        {current.options.map((opt, i) => {
          let bg = T.surface, border = T.border, color = T.text;
          if (selected !== null) {
            if (i === current.correct) { bg = `${T.lime}22`; border = T.lime; }
            else if (i === selected) { bg = `${T.coral}22`; border = T.coral; }
          }
          return (
            <button key={i} disabled={locked} onClick={() => handleAnswer(i)} className="qm-btn" style={{ background: bg, border: `1.5px solid ${border}`, borderRadius: 14, padding: "14px 10px", fontWeight: 600, fontSize: 13.5, color, cursor: locked ? "default" : "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 6, textAlign: "center", fontFamily: "inherit", minHeight: 56 }}>
              {selected !== null && i === current.correct && <CheckCircle2 size={15} color={T.lime} />}
              {selected !== null && i === selected && i !== current.correct && <XCircle size={15} color={T.coral} />}
              {opt}
            </button>
          );
        })}
      </div>
      {selected !== null && <div className="qm-pop" style={{ marginTop: 14, background: T.surface2, borderRadius: 12, padding: 12, fontSize: 12.5, color: T.textDim }}>{current.explain}</div>}
      {streak >= 2 && selected === null && <div style={{ marginTop: 12, display: "flex", alignItems: "center", gap: 6, color: T.coral, fontSize: 12.5, fontWeight: 700 }}><Flame size={14} /> {streak} in a row!</div>}
    </div>
  );
}

function TimerRing({ T, pct, danger }) {
  const r = 26, c = 2 * Math.PI * r;
  const offset = c - (Math.max(0, Math.min(100, pct)) / 100) * c;
  return (
    <div style={{ display: "flex", justifyContent: "center" }}>
      <svg width="64" height="64" viewBox="0 0 64 64">
        <circle cx="32" cy="32" r={r} stroke={T.surface2} strokeWidth="6" fill="none" />
        <circle cx="32" cy="32" r={r} stroke={danger ? T.coral : T.gold} strokeWidth="6" fill="none" strokeDasharray={c} strokeDashoffset={offset} strokeLinecap="round" transform="rotate(-90 32 32)" style={{ transition: "stroke-dashoffset .9s linear" }} />
      </svg>
    </div>
  );
}

/* ---------------- Results ---------------- */
function ResultsScreen({ T, lastResult, onPlayAgain, onHome }) {
  if (!lastResult) return null;
  const pct = lastResult.total ? Math.round((lastResult.correct / lastResult.total) * 100) : 0;
  const good = pct >= 70;
  return (
    <div style={{ textAlign: "center", marginTop: 20 }}>
      <div className="qm-pop" style={{ width: 84, height: 84, borderRadius: "50%", background: good ? `${T.lime}22` : `${T.gold}22`, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto" }}>
        <Trophy size={38} color={good ? T.lime : T.gold} />
      </div>
      <div className="qm-heading" style={{ fontSize: 20, fontWeight: 800, marginTop: 14 }}>{pct === 100 ? "Perfect score!" : good ? "Great job!" : "Quiz complete"}</div>
      <div style={{ color: T.textDim, marginTop: 4, fontSize: 13 }}>{lastResult.correct} / {lastResult.total} correct</div>
      <div style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 16, padding: 18, marginTop: 18, display: "flex", justifyContent: "space-around" }}>
        <div><div style={{ fontWeight: 800, fontSize: 20, color: T.gold }}>+{lastResult.pointsEarned}</div><div style={{ fontSize: 11, color: T.textDim }}>Points</div></div>
        <div><div style={{ fontWeight: 800, fontSize: 20, color: T.cyan }}>+{Math.round(lastResult.pointsEarned / 20)}</div><div style={{ fontSize: 11, color: T.textDim }}>Coins</div></div>
        <div><div style={{ fontWeight: 800, fontSize: 20, color: T.lime }}>{pct}%</div><div style={{ fontSize: 11, color: T.textDim }}>Accuracy</div></div>
      </div>
      <button className="qm-btn qm-shout" onClick={onPlayAgain} style={{ width: "100%", marginTop: 20, background: `linear-gradient(135deg, ${T.cyan}, ${T.lime})`, border: "none", borderRadius: 16, padding: 15, fontWeight: 800, fontSize: 13.5, color: "#08110D", cursor: "pointer" }}>Play Again</button>
      <button className="qm-btn" onClick={onHome} style={{ width: "100%", marginTop: 10, background: T.surface, border: `1px solid ${T.border}`, borderRadius: 16, padding: 14, fontWeight: 700, fontSize: 14, color: T.text, cursor: "pointer" }}>Back to home</button>
    </div>
  );
}

/* ---------------- Leaderboard ---------------- */
function LeaderboardScreen({ T, profile, onBack }) {
  const [tab, setTab] = useState("global");
  const [rows, setRows] = useState(null); // null = loading
  const [loadFailed, setLoadFailed] = useState(false);

  useEffect(() => {
    if (tab !== "global") return;
    let cancelled = false;
    setRows(null);
    supabase.from("leaderboard").select("*").order("points", { ascending: false }).limit(20)
      .then(({ data, error }) => {
        if (cancelled) return;
        if (error) { console.error(error); setLoadFailed(true); setRows([]); return; }
        setRows(data || []);
      });
    return () => { cancelled = true; };
  }, [tab]);

  const youInTop = rows && rows.some((r) => r.username === profile.username && r.points === profile.points);

  return (
    <div>
      <BackRow T={T} onBack={onBack} />
      <div className="qm-heading" style={{ fontSize: 19, fontWeight: 800, marginTop: 4 }}>Leaderboard</div>
      <div style={{ color: T.textDim, fontSize: 13, marginTop: 2 }}>See how you stack up</div>
      <div style={{ display: "flex", gap: 8, marginTop: 14 }}>
        {["global", "friends", "weekly"].map((t) => (
          <button key={t} onClick={() => setTab(t)} className="qm-btn" style={{ flex: 1, padding: "8px 0", borderRadius: 10, border: "none", background: tab === t ? `linear-gradient(135deg, ${T.cyan}, ${T.lime})` : T.surface, color: tab === t ? "#08110D" : T.textDim, fontWeight: 700, fontSize: 12.5, textTransform: "capitalize", cursor: "pointer" }}>{t}</button>
        ))}
      </div>

      {tab !== "global" ? (
        <div style={{ marginTop: 30, textAlign: "center", color: T.textDim, fontSize: 13 }}>
          {tab === "friends" ? "Friends lists aren't built yet — this needs a way to connect with other players first." : "Weekly resets aren't built yet — for now, Global shows all-time scores."}
        </div>
      ) : rows === null ? (
        <div style={{ marginTop: 30, textAlign: "center", color: T.textDim, fontSize: 13 }}>Loading rankings…</div>
      ) : (
        <>
          <div style={{ marginTop: 14, background: T.surface, border: `1px solid ${T.border}`, borderRadius: 16, overflow: "hidden" }}>
            {rows.length === 0 && (
              <div style={{ padding: 18, textAlign: "center", color: T.textDim, fontSize: 12.5 }}>
                {loadFailed ? "Couldn't load the leaderboard right now." : "No scores yet — be the first to play a quiz!"}
              </div>
            )}
            {rows.map((r, i) => {
              const isYou = r.username === profile.username && r.points === profile.points;
              return (
                <div key={r.device_id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "12px 14px", borderBottom: i < rows.length - 1 ? `1px solid ${T.border}` : "none", background: isYou ? `${T.gold}15` : "transparent" }}>
                  <div style={{ width: 22, fontWeight: 800, color: i < 3 ? T.gold : T.textDim, fontSize: 13 }}>{i + 1}</div>
                  <div style={{ width: 32, height: 32, borderRadius: "50%", background: T.surface2, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 700 }}>{(r.username || "P")[0]}</div>
                  <div style={{ flex: 1 }}><div style={{ fontWeight: 700, fontSize: 13 }}>{r.username}{isYou ? " (you)" : ""}</div><div style={{ fontSize: 11, color: T.textDim }}>Level {r.level}</div></div>
                  <div style={{ fontWeight: 800, fontSize: 13 }}>{r.points.toLocaleString()}</div>
                </div>
              );
            })}
          </div>
          {rows.length > 0 && !youInTop && profile.quizzesPlayed > 0 && (
            <div style={{ marginTop: 10, background: `${T.gold}15`, border: `1px solid ${T.gold}44`, borderRadius: 14, padding: "10px 14px", display: "flex", justifyContent: "space-between", fontSize: 13 }}>
              <span style={{ fontWeight: 700 }}>{profile.username} (you)</span>
              <span style={{ fontWeight: 800 }}>{profile.points.toLocaleString()} · not yet in top 20</span>
            </div>
          )}
          <div style={{ fontSize: 11, color: T.textDim, marginTop: 10, textAlign: "center" }}>
            Live scores from everyone playing this app. Play a quiz to join the board.
          </div>
        </>
      )}
    </div>
  );
}

/* ---------------- Profile ---------------- */
function ProfileScreen({ T, profile, onReset, onBack, onUsernameChange }) {
  const acc = profile.questionsAnswered ? Math.round((profile.correctAnswers / profile.questionsAnswered) * 100) : 0;
  const favCat = profile.favoriteCategory ? CATEGORY_INDEX.find((c) => c.id === profile.favoriteCategory)?.label : "—";
  const [editingName, setEditingName] = useState(false);
  const [nameDraft, setNameDraft] = useState(profile.username);
  return (
    <div>
      <BackRow T={T} onBack={onBack} />
      <div className="qm-heading" style={{ fontSize: 19, fontWeight: 800, marginTop: 4 }}>Profile</div>
      <div style={{ display: "flex", alignItems: "center", gap: 14, marginTop: 16 }}>
        <div style={{ width: 64, height: 64, borderRadius: "50%", background: `linear-gradient(135deg, ${T.cyan}, ${T.violet})`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 24, fontWeight: 800, color: "#fff", flexShrink: 0 }}>{profile.username[0]}</div>
        <div style={{ flex: 1 }}>
          {editingName ? (
            <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
              <input value={nameDraft} onChange={(e) => setNameDraft(e.target.value)} maxLength={20}
                style={{ background: T.surface2, border: `1px solid ${T.cyan}`, borderRadius: 8, padding: "6px 8px", color: T.text, fontSize: 14, fontWeight: 700, fontFamily: "inherit", width: 120 }} />
              <button className="qm-btn" onClick={() => { onUsernameChange(nameDraft.trim() || "Player"); setEditingName(false); }} style={{ background: T.cyan, border: "none", borderRadius: 8, padding: "6px 10px", color: "#08110D", fontWeight: 700, fontSize: 12, cursor: "pointer" }}>Save</button>
            </div>
          ) : (
            <div onClick={() => { setNameDraft(profile.username); setEditingName(true); }} style={{ cursor: "pointer", display: "flex", alignItems: "center", gap: 6 }}>
              <div style={{ fontWeight: 800, fontSize: 17 }}>{profile.username}</div>
              <span style={{ fontSize: 10, color: T.cyan, fontWeight: 700 }}>Edit</span>
            </div>
          )}
          <div style={{ fontSize: 12.5, color: T.textDim, marginTop: 2 }}>Level {profile.level} · {titleForLevel(profile.level)}</div>
        </div>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginTop: 18 }}>
        <StatCard T={T} label="Quizzes played" value={profile.quizzesPlayed} />
        <StatCard T={T} label="Questions answered" value={profile.questionsAnswered} />
        <StatCard T={T} label="Accuracy" value={`${acc}%`} />
        <StatCard T={T} label="Best score" value={profile.bestScore} />
        <StatCard T={T} label="Favorite category" value={favCat} span />
      </div>
      <button className="qm-btn" onClick={onReset} style={{ width: "100%", marginTop: 20, background: "transparent", border: `1px solid ${T.coral}`, borderRadius: 14, padding: 13, color: T.coral, fontWeight: 700, fontSize: 13, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}><RefreshCw size={14} /> Reset progress</button>
    </div>
  );
}

function StatCard({ T, label, value, span }) {
  return (
    <div style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 14, padding: 12, gridColumn: span ? "1 / -1" : "auto" }}>
      <div style={{ fontWeight: 800, fontSize: 16 }}>{value}</div>
      <div style={{ fontSize: 11, color: T.textDim, marginTop: 2 }}>{label}</div>
    </div>
  );
}

/* ---------------- Achievements ---------------- */
function AchievementsScreen({ T, profile, onBack }) {
  return (
    <div>
      <BackRow T={T} onBack={onBack} />
      <div className="qm-heading" style={{ fontSize: 19, fontWeight: 800, marginTop: 4 }}>Achievements</div>
      <div style={{ color: T.textDim, fontSize: 13, marginTop: 2 }}>{profile.achievements.length} / {ACHIEVEMENTS.length} unlocked</div>
      <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 14 }}>
        {ACHIEVEMENTS.map((a) => {
          const unlocked = profile.achievements.includes(a.id);
          return (
            <div key={a.id} style={{ display: "flex", alignItems: "center", gap: 12, background: T.surface, border: `1px solid ${T.border}`, borderRadius: 14, padding: 14, opacity: unlocked ? 1 : 0.55 }}>
              <div style={{ width: 40, height: 40, borderRadius: 10, background: unlocked ? `${T.gold}22` : T.surface2, display: "flex", alignItems: "center", justifyContent: "center" }}>
                {unlocked ? <Award size={19} color={T.gold} /> : <Lock size={16} color={T.textDim} />}
              </div>
              <div><div style={{ fontWeight: 700, fontSize: 13.5 }}>{a.label}</div><div style={{ fontSize: 11.5, color: T.textDim, marginTop: 1 }}>{a.desc}</div></div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ---------------- Bottom nav & toast ---------------- */
function BottomNav({ T, screen, onHome, onSearchTab, onLeaderboard, onProfile }) {
  const items = [
    { id: "home", icon: Home, action: onHome },
    { id: "home-search", icon: Search, action: onSearchTab },
    { id: "leaderboard", icon: Trophy, action: onLeaderboard },
    { id: "profile", icon: User, action: onProfile },
  ];
  return (
    <div style={{ position: "fixed", bottom: 0, left: "50%", transform: "translateX(-50%)", width: "100%", maxWidth: 480, background: T.surface, borderTop: `1px solid ${T.border}`, display: "flex", justifyContent: "space-around", padding: "10px 0 14px" }}>
      {items.map((it) => {
        const Icon = it.icon;
        const active = screen === it.id || (it.id === "home" && screen === "home");
        return (
          <button key={it.id} onClick={it.action} className="qm-btn" style={{ background: "none", border: "none", cursor: "pointer", display: "flex", flexDirection: "column", alignItems: "center", gap: 3 }}>
            <Icon size={20} color={active ? T.coral : T.textDim} />
          </button>
        );
      })}
    </div>
  );
}

function Toast({ T, message }) {
  return (
    <div className="qm-pop" style={{ position: "fixed", top: 16, left: "50%", transform: "translateX(-50%)", background: T.coral, color: "#fff", padding: "10px 18px", borderRadius: 30, fontSize: 13, fontWeight: 700, display: "flex", alignItems: "center", gap: 8, boxShadow: "0 8px 24px rgba(0,0,0,.25)", zIndex: 50 }}>
      <Sparkles size={14} /> {message}
    </div>
  );
}
