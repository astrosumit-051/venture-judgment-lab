"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";

type View = "today" | "brief" | "snapshot" | "underwrite" | "history";

type LabRecord = {
  id: string;
  recordType: string;
  parentId: string | null;
  title: string;
  payload: Record<string, unknown>;
  committedAt: string;
  createdAt: string;
};

type LabEvent = {
  id: string;
  recordId: string;
  eventType: string;
  eventData: Record<string, unknown>;
  occurredAt: string;
  createdAt: string;
};

type LabData = { records: LabRecord[]; events: LabEvent[] };

const navItems: Array<{ id: View; key: string; label: string; hint: string }> = [
  { id: "today", key: "T", label: "Today", hint: "Your next judgment" },
  { id: "brief", key: "B", label: "Daily Brief", hint: "Four deliberate inputs" },
  { id: "snapshot", key: "S", label: "Snapshot", hint: "Commit the first pass" },
  { id: "underwrite", key: "U", label: "Underwrite", hint: "Investigate the crux" },
  { id: "history", key: "H", label: "History", hint: "Nothing gets rewritten" },
];

const readings = [
  {
    lane: "Current signal",
    time: 7,
    title: "Summer 2027 venture recruiting is already live",
    source: "Lab market record · August 5, 2026",
    purpose: "Correct the assumption that recruiting can wait until spring.",
    question: "What action becomes urgent when the calendar moves earlier than your plan?",
    body: "The internship market is not a future event. Exact-fit programs and relationship opportunities are already opening, which means skill-building and applications must run concurrently. The judgment lesson is broader than recruiting: stale timing assumptions can invalidate an otherwise sensible strategy.",
  },
  {
    lane: "Durable investing insight",
    time: 9,
    title: "Question-led diligence beats category completion",
    source: "Snapshot and Weekly Underwrite Standard",
    purpose: "Learn to investigate what can change a decision instead of filling memo sections.",
    question: "Which three claims carry the weight of this company’s venture case?",
    body: "A fast screen should commit a causal view while knowledge is still incomplete. Deeper diligence should preserve that view, investigate three load-bearing questions, seek evidence against the thesis, and explain the decision delta. A complete-looking template is not evidence of judgment.",
  },
  {
    lane: "Cross-domain input",
    time: 8,
    title: "Source, context, close reading, corroboration",
    source: "Library of Congress information-literacy framework",
    purpose: "Transfer historical-source discipline into company research.",
    question: "What would you believe differently if the source’s incentives changed?",
    body: "Evidence becomes useful only after identifying who produced it, what context shaped it, which claim it actually supports, and what independent sources say. A company announcement may prove that an announcement occurred without proving the promotional claims inside it.",
  },
  {
    lane: "Career / freeflow",
    time: 8,
    title: "Write the sentence you can defend",
    source: "Private recruiting evidence baseline",
    purpose: "Practice accurate positioning before returning to the Pear application.",
    question: "Which claim about your experience survives a skeptical follow-up question?",
    body: "The strongest recruiting story is not the most inflated one. It connects real founder-facing and sourcing work to the specific evidence gaps the Lab is closing: attribution, independent discovery, full diligence ownership, technical proof, and a dated judgment record.",
  },
] as const;

const foundationHistory = [
  { date: "Aug 5", label: "Practice architecture accepted", detail: "Normal, Calibration, Recruiting Surge, and Exam modes" },
  { date: "Aug 5", label: "Sector Discovery Cycle accepted", detail: "Six breadth rotations, then two confirmation sprints" },
  { date: "Aug 5", label: "Daily Brief standard accepted", detail: "Four lanes, 55-minute cap, permanent Reading Record" },
  { date: "Aug 5", label: "Judgment model accepted", detail: "Immutable Snapshot, three questions, explicit Decision Delta" },
] as const;

const emptySnapshot = {
  company: "",
  stage: "Pre-seed",
  sector: "",
  discoverySource: "",
  thesis: "",
  ventureMechanism: "",
  disposition: "Watch",
  confidence: 50,
  crux: "",
  supportingEvidence: "",
  disconfirmingSignal: "",
  topUnknown: "",
  nextEvidence: "",
};

const emptyUnderwrite = {
  snapshotId: "",
  question1: "",
  question2: "",
  question3: "",
  supportingEvidence: "",
  disconfirmingEvidence: "",
  founderEvidence: "",
  countercase: "",
  disposition: "Watch",
  confidence: 50,
  decisionDelta: "",
  nextEvidence: "",
};

function formatTime(value: string): string {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}

function recordLabel(type: string): string {
  return {
    daily_brief: "Daily Brief",
    snapshot_judgment: "Snapshot Judgment",
    weekly_underwrite: "Weekly Underwrite",
  }[type] ?? type;
}

function payloadText(payload: Record<string, unknown>, key: string): string {
  const value = payload[key];
  return typeof value === "string" ? value : "";
}

export function LabApp({ displayName }: { displayName: string }) {
  const [view, setView] = useState<View>("today");
  const [data, setData] = useState<LabData>({ records: [], events: [] });
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");
  const [briefChecks, setBriefChecks] = useState<boolean[]>(readings.map(() => false));
  const [briefCarry, setBriefCarry] = useState("");
  const [snapshot, setSnapshot] = useState(emptySnapshot);
  const [underwrite, setUnderwrite] = useState(emptyUnderwrite);
  const [reflectionRecord, setReflectionRecord] = useState("");
  const [reflection, setReflection] = useState("");

  const snapshots = useMemo(
    () => data.records.filter((record) => record.recordType === "snapshot_judgment"),
    [data.records],
  );

  async function refresh() {
    try {
      const response = await fetch("/api/lab", { cache: "no-store" });
      if (!response.ok) throw new Error("Your private record could not be loaded.");
      setData((await response.json()) as LabData);
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Your private record could not be loaded.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void refresh();
  }, []);

  async function post(body: Record<string, unknown>) {
    setBusy(true);
    setNotice("");
    try {
      const response = await fetch("/api/lab", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
      });
      const result = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(result.error ?? "The record could not be preserved.");
      await refresh();
      return true;
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "The record could not be preserved.");
      return false;
    } finally {
      setBusy(false);
    }
  }

  async function commitBrief() {
    if (!briefChecks.every(Boolean) || !briefCarry.trim()) {
      setNotice("Finish all four readings and record the idea you will carry forward.");
      return;
    }
    const saved = await post({
      operation: "commit_record",
      recordType: "daily_brief",
      title: "Orientation Brief — evidence before narrative",
      payload: {
        assignedDate: "2026-08-05",
        timezone: "America/Chicago",
        totalMinutes: readings.reduce((sum, reading) => sum + reading.time, 0),
        readings: readings.map((reading) => ({ lane: reading.lane, title: reading.title, status: "completed" })),
        carryForward: briefCarry.trim(),
      },
    });
    if (saved) {
      setNotice("Daily Brief committed. The original response is now part of your history.");
      setView("snapshot");
    }
  }

  async function commitSnapshot(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const saved = await post({
      operation: "commit_record",
      recordType: "snapshot_judgment",
      title: `${snapshot.company} — ${snapshot.disposition} at ${snapshot.confidence}%`,
      payload: { ...snapshot, timezone: "America/Chicago", timeboxMinutes: 20 },
    });
    if (saved) {
      setSnapshot(emptySnapshot);
      setNotice("Snapshot committed. It is locked; deeper research will append a new judgment.");
      setView("underwrite");
    }
  }

  async function commitUnderwrite(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const parent = snapshots.find((record) => record.id === underwrite.snapshotId);
    if (!parent) {
      setNotice("Choose the locked Snapshot this Underwrite investigates.");
      return;
    }
    const saved = await post({
      operation: "commit_record",
      recordType: "weekly_underwrite",
      parentId: parent.id,
      title: `${parent.title.split(" — ")[0]} — Underwrite`,
      payload: {
        ...underwrite,
        questions: [underwrite.question1, underwrite.question2, underwrite.question3],
        mode: "Normal Week",
        timeboxMinutes: 165,
        coachStatus: "withheld_until_commitment",
      },
    });
    if (saved) {
      setUnderwrite(emptyUnderwrite);
      setNotice("Underwrite committed. The Snapshot remains unchanged beside this deeper view.");
      setView("history");
    }
  }

  async function appendReflection(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!reflectionRecord || !reflection.trim()) {
      setNotice("Choose a record and write the reflection you want to append.");
      return;
    }
    const saved = await post({
      operation: "append_event",
      recordId: reflectionRecord,
      eventType: "reflection",
      eventData: { text: reflection.trim() },
    });
    if (saved) {
      setReflection("");
      setNotice("Reflection appended. The original submission was not changed.");
    }
  }

  const loopCount = data.records.filter((record) => record.recordType === "snapshot_judgment").length;
  const latestSnapshot = snapshots[0];

  return (
    <div className="lab-shell">
      <aside className="rail">
        <button className="brand" onClick={() => setView("today")} aria-label="Venture Judgment Lab home">
          <span className="brand-mark">VJ</span>
          <span><strong>Venture</strong><em>Judgment Lab</em></span>
        </button>

        <nav aria-label="Lab sections">
          {navItems.map((item) => (
            <button
              key={item.id}
              className={view === item.id ? "nav-item active" : "nav-item"}
              onClick={() => setView(item.id)}
              aria-current={view === item.id ? "page" : undefined}
            >
              <span className="nav-key">{item.key}</span>
              <span><strong>{item.label}</strong><small>{item.hint}</small></span>
            </button>
          ))}
        </nav>

        <div className="rail-foot">
          <span className="privacy-dot" />
          <span><strong>Private record</strong><small>Append-only by design</small></span>
        </div>
      </aside>

      <main className="workspace">
        <header className="topbar">
          <div>
            <span className="eyebrow">Wednesday · August 5, 2026</span>
            <h1>{view === "today" ? `Good morning, ${displayName}.` : navItems.find((item) => item.id === view)?.label}</h1>
          </div>
          <div className="mode-chip"><span>Normal Week</span><strong>11.5h</strong></div>
        </header>

        {notice && <div className="notice" role="status">{notice}<button onClick={() => setNotice("")} aria-label="Dismiss notice">×</button></div>}

        {view === "today" && (
          <section className="view today-view">
            <div className="hero-grid">
              <article className="hero-card">
                <div className="hero-index">01</div>
                <div className="hero-copy">
                  <span className="eyebrow coral">Today’s judgment loop · 90 minutes</span>
                  <h2>Your work is not a streak.<br />It is a record.</h2>
                  <p>Read deliberately. Commit a view before coaching. Leave the uncertainty visible.</p>
                  <button className="primary" onClick={() => setView("brief")}>Begin today’s brief <span>→</span></button>
                </div>
                <div className="loop-dial" aria-label={`${loopCount} Snapshot Judgments preserved`}>
                  <strong>{String(loopCount).padStart(2, "0")}</strong>
                  <span>judgments<br />preserved</span>
                </div>
              </article>

              <aside className="standard-card">
                <span className="eyebrow">Today’s standard</span>
                <p>“Do not tell me what the company says. Tell me what must be true.”</p>
                <div className="rule"><span>55</span><small>minutes<br />reading cap</small></div>
                <div className="rule"><span>20</span><small>minutes<br />first pass</small></div>
                <div className="rule"><span>10</span><small>minutes<br />Forecast reserved</small></div>
              </aside>
            </div>

            <div className="section-heading">
              <div><span className="eyebrow">The work in front of you</span><h3>One loop, four commitments</h3></div>
              <span className="quiet">Flexible blocks · no catch-up debt</span>
            </div>

            <div className="commitment-grid">
              {[
                ["01", "Daily Brief", "Four distinct inputs", "32 min orientation edition", "brief"],
                ["02", "Snapshot Judgment", "Commit the causal view", "20 min · confidence required", "snapshot"],
                ["03", "Forecast", "Standard still being designed", "10 min reserved · not yet active", "today"],
                ["04", "Preserve", "Timestamp the evidence", "5 min · no rewriting", "history"],
              ].map(([number, title, copy, meta, target]) => (
                <button className="commitment" key={title} onClick={() => setView(target as View)} disabled={title === "Forecast"}>
                  <span className="commitment-number">{number}</span>
                  <strong>{title}</strong>
                  <p>{copy}</p>
                  <small>{meta}</small>
                </button>
              ))}
            </div>

            {latestSnapshot && (
              <article className="latest-card">
                <span className="eyebrow">Latest locked judgment</span>
                <h3>{latestSnapshot.title}</h3>
                <p>{payloadText(latestSnapshot.payload, "thesis")}</p>
                <button className="text-button" onClick={() => setView("history")}>Open immutable record →</button>
              </article>
            )}
          </section>
        )}

        {view === "brief" && (
          <section className="view">
            <div className="intro-row">
              <div><span className="eyebrow coral">Orientation edition · 32 minutes</span><h2>Four readings. Four different jobs.</h2></div>
              <p>This first brief introduces the Lab’s evidence discipline. Future briefs will use the same four-lane contract.</p>
            </div>

            <div className="reading-list">
              {readings.map((reading, index) => (
                <article className={briefChecks[index] ? "reading-card complete" : "reading-card"} key={reading.lane}>
                  <div className="reading-order">0{index + 1}</div>
                  <div className="reading-main">
                    <div className="reading-meta"><span>{reading.lane}</span><span>{reading.time} min</span></div>
                    <h3>{reading.title}</h3>
                    <p className="source">{reading.source}</p>
                    <p><strong>Teaching purpose:</strong> {reading.purpose}</p>
                    <details><summary>Read selection</summary><p>{reading.body}</p><p className="carry"><strong>Carry question:</strong> {reading.question}</p></details>
                  </div>
                  <label className="read-check">
                    <input
                      type="checkbox"
                      checked={briefChecks[index]}
                      onChange={(event) => setBriefChecks((current) => current.map((value, itemIndex) => itemIndex === index ? event.target.checked : value))}
                    />
                    <span>{briefChecks[index] ? "Read" : "Mark read"}</span>
                  </label>
                </article>
              ))}
            </div>

            <div className="commit-panel">
              <label><span>What idea will you carry into today’s company judgment?</span><textarea value={briefCarry} onChange={(event) => setBriefCarry(event.target.value)} placeholder="Write the connection in your own words before moving on." rows={3} /></label>
              <button className="primary" onClick={commitBrief} disabled={busy}>{busy ? "Preserving…" : "Commit Daily Brief"}</button>
            </div>
          </section>
        )}

        {view === "snapshot" && (
          <section className="view form-view">
            <div className="intro-row">
              <div><span className="eyebrow coral">Independent First Pass · 20-minute cap</span><h2>Commit before you know everything.</h2></div>
              <p>The point is not to be complete. The point is to make the crux, evidence, uncertainty, and confidence visible before deeper research.</p>
            </div>

            <form className="judgment-form" onSubmit={commitSnapshot}>
              <fieldset><legend><span>01</span> Identify the opportunity</legend><div className="field-grid three"><label>Company<input required value={snapshot.company} onChange={(e) => setSnapshot({ ...snapshot, company: e.target.value })} placeholder="Company name" /></label><label>Stage<select value={snapshot.stage} onChange={(e) => setSnapshot({ ...snapshot, stage: e.target.value })}><option>Pre-seed</option><option>Seed</option><option>Series A</option><option>Unknown</option></select></label><label>Sector<input required value={snapshot.sector} onChange={(e) => setSnapshot({ ...snapshot, sector: e.target.value })} placeholder="Specific domain" /></label></div><label>How did you find it?<input required value={snapshot.discoverySource} onChange={(e) => setSnapshot({ ...snapshot, discoverySource: e.target.value })} placeholder="Daily Brief, founder, database, event, independent search…" /></label></fieldset>

              <fieldset><legend><span>02</span> State the causal view</legend><label>One-sentence investment thesis<textarea required rows={3} value={snapshot.thesis} onChange={(e) => setSnapshot({ ...snapshot, thesis: e.target.value })} placeholder="This company could matter because…" /></label><label>Venture-scale mechanism<textarea required rows={3} value={snapshot.ventureMechanism} onChange={(e) => setSnapshot({ ...snapshot, ventureMechanism: e.target.value })} placeholder="Explain the mechanism, not the market adjective." /></label></fieldset>

              <fieldset><legend><span>03</span> Commit the judgment</legend><div className="field-grid two"><label>Practice Disposition<select value={snapshot.disposition} onChange={(e) => setSnapshot({ ...snapshot, disposition: e.target.value })}><option>Pursue</option><option>Watch</option><option>Pass</option></select><small>Pursue spends attention now. Watch requires a trigger. Pass states what must change.</small></label><label>Confidence <strong>{snapshot.confidence}%</strong><input className="range" type="range" min="1" max="99" value={snapshot.confidence} onChange={(e) => setSnapshot({ ...snapshot, confidence: Number(e.target.value) })} /></label></div><label>The crux<textarea required rows={2} value={snapshot.crux} onChange={(e) => setSnapshot({ ...snapshot, crux: e.target.value })} placeholder="The single claim on which your view most depends." /></label></fieldset>

              <fieldset><legend><span>04</span> Expose the evidence gap</legend><label>Strongest supporting evidence<textarea required rows={2} value={snapshot.supportingEvidence} onChange={(e) => setSnapshot({ ...snapshot, supportingEvidence: e.target.value })} placeholder="Observation and source—not a marketing conclusion." /></label><label>Strongest disconfirming signal<textarea required rows={2} value={snapshot.disconfirmingSignal} onChange={(e) => setSnapshot({ ...snapshot, disconfirmingSignal: e.target.value })} placeholder="If none was found in the timebox, say that explicitly." /></label><div className="field-grid two"><label>Top unknown<textarea required rows={3} value={snapshot.topUnknown} onChange={(e) => setSnapshot({ ...snapshot, topUnknown: e.target.value })} /></label><label>Next evidence that would change the view<textarea required rows={3} value={snapshot.nextEvidence} onChange={(e) => setSnapshot({ ...snapshot, nextEvidence: e.target.value })} /></label></div></fieldset>

              <div className="form-commit"><div><span className="lock-mark">↳</span><p><strong>This submission becomes immutable.</strong><br />Later evidence will be appended as a new judgment.</p></div><button className="primary" disabled={busy}>{busy ? "Committing…" : "Commit Snapshot"}</button></div>
            </form>
          </section>
        )}

        {view === "underwrite" && (
          <section className="view form-view">
            <div className="intro-row">
              <div><span className="eyebrow coral">Normal Week · 165 minutes</span><h2>Investigate what can change the view.</h2></div>
              <p>Exactly three load-bearing questions. Evidence for and against. No weighted startup score.</p>
            </div>

            {!snapshots.length ? (
              <div className="empty-state"><span>U</span><h3>An Underwrite begins with a locked Snapshot.</h3><p>Commit the independent first pass before opening deeper diligence.</p><button className="primary" onClick={() => setView("snapshot")}>Create Snapshot</button></div>
            ) : (
              <form className="judgment-form" onSubmit={commitUnderwrite}>
                <fieldset><legend><span>01</span> Reopen without rewriting</legend><label>Locked Snapshot<select required value={underwrite.snapshotId} onChange={(e) => setUnderwrite({ ...underwrite, snapshotId: e.target.value })}><option value="">Choose a Snapshot…</option>{snapshots.map((record) => <option key={record.id} value={record.id}>{record.title} · {formatTime(record.committedAt)}</option>)}</select></label>{underwrite.snapshotId && (() => { const chosen = snapshots.find((record) => record.id === underwrite.snapshotId); return chosen ? <div className="locked-view"><span>Original thesis</span><p>{payloadText(chosen.payload, "thesis")}</p><small>Locked {formatTime(chosen.committedAt)} · {payloadText(chosen.payload, "crux")}</small></div> : null; })()}</fieldset>

                <fieldset><legend><span>02</span> Frame three Load-Bearing Questions</legend>{(["question1", "question2", "question3"] as const).map((key, index) => <label key={key}>Question {index + 1}<input required value={underwrite[key]} onChange={(e) => setUnderwrite({ ...underwrite, [key]: e.target.value })} placeholder="What answer could materially change the disposition?" /></label>)}</fieldset>

                <fieldset><legend><span>03</span> Build the Evidence Ledger</legend><label>Material supporting evidence<textarea required rows={3} value={underwrite.supportingEvidence} onChange={(e) => setUnderwrite({ ...underwrite, supportingEvidence: e.target.value })} placeholder="Observation, source, date, reliability limit, and inference." /></label><label>Material disconfirming evidence<textarea required rows={3} value={underwrite.disconfirmingEvidence} onChange={(e) => setUnderwrite({ ...underwrite, disconfirmingEvidence: e.target.value })} placeholder="The strongest evidence that challenges the causal case." /></label><label>Founder Evidence—or the explicit gap<textarea required rows={3} value={underwrite.founderEvidence} onChange={(e) => setUnderwrite({ ...underwrite, founderEvidence: e.target.value })} placeholder="Observable behavior only. No pedigree or personality inference." /></label></fieldset>

                <fieldset><legend><span>04</span> Countercase and deeper judgment</legend><label>Strongest evidence-based Countercase<textarea required rows={4} value={underwrite.countercase} onChange={(e) => setUnderwrite({ ...underwrite, countercase: e.target.value })} placeholder="Describe the causal path by which this fails to create venture-scale value." /></label><div className="field-grid two"><label>Final Practice Disposition<select value={underwrite.disposition} onChange={(e) => setUnderwrite({ ...underwrite, disposition: e.target.value })}><option>Pursue</option><option>Watch</option><option>Pass</option></select></label><label>Final confidence <strong>{underwrite.confidence}%</strong><input className="range" type="range" min="1" max="99" value={underwrite.confidence} onChange={(e) => setUnderwrite({ ...underwrite, confidence: Number(e.target.value) })} /></label></div><label>Decision Delta<textarea required rows={3} value={underwrite.decisionDelta} onChange={(e) => setUnderwrite({ ...underwrite, decisionDelta: e.target.value })} placeholder="What stayed, changed, or reversed—and which evidence caused it?" /></label><label>Next decisive evidence<textarea required rows={2} value={underwrite.nextEvidence} onChange={(e) => setUnderwrite({ ...underwrite, nextEvidence: e.target.value })} /></label></fieldset>

                <div className="form-commit"><div><span className="lock-mark">↳</span><p><strong>Coach interpretation remains withheld.</strong><br />It can be appended only after this commitment.</p></div><button className="primary" disabled={busy}>{busy ? "Committing…" : "Commit Underwrite"}</button></div>
              </form>
            )}
          </section>
        )}

        {view === "history" && (
          <section className="view history-view">
            <div className="intro-row">
              <div><span className="eyebrow coral">Private Learning Record</span><h2>The evidence survives the story.</h2></div>
              <p>Original submissions remain intact. Corrections, reflection, and hindsight arrive as dated events.</p>
            </div>

            <div className="history-layout">
              <div className="timeline">
                {data.records.map((record) => (
                  <article className="timeline-record" key={record.id}>
                    <div className="timeline-dot" />
                    <div className="record-head"><span>{recordLabel(record.recordType)}</span><time>{formatTime(record.committedAt)}</time></div>
                    <h3>{record.title}</h3>
                    {record.recordType === "snapshot_judgment" && <p>{payloadText(record.payload, "thesis")}</p>}
                    {record.recordType === "weekly_underwrite" && <p><strong>Decision Delta:</strong> {payloadText(record.payload, "decisionDelta")}</p>}
                    {record.recordType === "daily_brief" && <p><strong>Carry forward:</strong> {payloadText(record.payload, "carryForward")}</p>}
                    {data.events.filter((item) => item.recordId === record.id).map((item) => <div className="event" key={item.id}><span>{recordLabel(item.eventType)}</span><p>{payloadText(item.eventData, "text")}</p><time>{formatTime(item.occurredAt)}</time></div>)}
                  </article>
                ))}

                {!loading && !data.records.length && <div className="empty-history"><p>No learner submissions yet.</p><span>Your first committed Brief or Snapshot will appear above the accepted Lab foundation.</span></div>}

                <div className="foundation-line"><span>Accepted foundation</span></div>
                {foundationHistory.map((item) => <article className="foundation-record" key={item.label}><time>{item.date}</time><div><strong>{item.label}</strong><p>{item.detail}</p></div></article>)}
              </div>

              <aside className="append-card">
                <span className="eyebrow">Append, never edit</span>
                <h3>Add a dated reflection</h3>
                <p>Use hindsight without letting it rewrite the original judgment.</p>
                <form onSubmit={appendReflection}><label>Record<select value={reflectionRecord} onChange={(e) => setReflectionRecord(e.target.value)}><option value="">Choose a record…</option>{data.records.map((record) => <option key={record.id} value={record.id}>{recordLabel(record.recordType)} · {record.title}</option>)}</select></label><label>Reflection<textarea rows={5} value={reflection} onChange={(e) => setReflection(e.target.value)} placeholder="What changed, what did you miss, and what evidence now matters?" /></label><button className="secondary" disabled={busy || !data.records.length}>{busy ? "Appending…" : "Append reflection"}</button></form>
              </aside>
            </div>
          </section>
        )}
      </main>
    </div>
  );
}
