"use client";

import { CalendarDots, Check, Clock, Flag, Path, Target } from "@phosphor-icons/react";
import { COURSE_FIRST_BREADTH_ROTATIONS } from "./courseCurriculum";
import type { CourseTodayState } from "./courseViewTypes";

export function PracticeView({ practiceDay, assignment }: CourseTodayState) {
  return <section className="view course-secondary-view">
    <div className="intro-row"><div><span className="eyebrow coral">Deliberate practice</span><h2>Your course, without catch-up debt.</h2></div><p>One sustainable route at a time. Missed or unavailable days remain honest gaps; they do not become a hidden backlog.</p></div>
    <div className="practice-summary-grid">
      <article className="practice-focus"><span className="eyebrow">Current rotation</span><Target size={25} /><h3>{practiceDay?.rotationTitle ?? "Day 1 not active"}</h3><p>{practiceDay?.teachingPurpose ?? "The course foundation is ready. Activation will create the first immutable Curriculum Epoch."}</p><dl><div><dt>Phase</dt><dd>{practiceDay?.phase ?? "Breadth"}</dd></div><div><dt>Course day</dt><dd>{practiceDay?.curriculumDay ?? "—"}</dd></div><div><dt>Route</dt><dd>{practiceDay?.totalMinutes ?? 105} min</dd></div></dl></article>
      <article className="practice-week"><span className="eyebrow">Sustainable week</span><Clock size={25} /><h3>720 minutes</h3><p>Five 105-minute weekday routes plus one focused weekend block. Recruiting Surge and Exam Mode substitute work; they never add debt.</p><div><span>Weekdays <strong>525</strong></span><span>Weekend <strong>195</strong></span></div></article>
      <article className="practice-weekend"><span className="eyebrow">Weekend assignment</span><CalendarDots size={25} /><h3>Underwrite + “What next?”</h3><p>135-minute Underwrite, 30-minute cross-domain causal map, and a 30-minute recruiting or field block.</p><small>Monthly calibration replaces—not adds to—the normal block.</small></article>
    </div>
    <section className="course-map"><header><div><span className="eyebrow">Twelve-week course map</span><h3>Explore broadly, then confirm with evidence.</h3></div><p>Weeks 1–6 rotate through technology domains. The two strongest advance into distinct three-week confirmation sprints.</p></header><div className="course-map-weeks">{COURSE_FIRST_BREADTH_ROTATIONS.map((sector, index) => <article className={practiceDay?.rotationWeek === index + 1 ? "active" : ""} key={sector}><span>W{index + 1}</span>{practiceDay && practiceDay.rotationWeek > index + 1 ? <Check weight="bold" /> : <Path />}<strong>{sector}</strong><small>Breadth rotation</small></article>)}<article><span>W7–9</span><Flag /><strong>Finalist one</strong><small>Evidence-qualified sprint</small></article><article><span>W10–12</span><Flag /><strong>Finalist two</strong><small>Evidence-qualified sprint</small></article></div><footer><Target size={19} /><p><strong>After week 12:</strong> 70% provisional focus · 30% runner-up, adjacent domains, and disconfirmation.</p></footer></section>
    <section className="unfinished-work"><span className="eyebrow">Unfinished work</span><h3>{assignment?.state === "ready" ? "Today’s route is still open." : "Nothing is carried forward as debt."}</h3><p>{assignment?.state === "ready" ? "Return to Today and continue from the first incomplete checkpoint." : "Prior drafts remain accessible in More and preserved history remains in Evidence."}</p></section>
  </section>;
}
