import { createFileRoute } from "@tanstack/react-router";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Lightbulb, Target, BarChart3, HeartHandshake, AlertTriangle, CheckCircle, XCircle, Clock, BookOpen } from "lucide-react";

export const Route = createFileRoute("/_authenticated/guide")({
  head: () => ({
    meta: [
      { title: "Evaluation Guide — NST Startup Track" },
      { name: "description", content: "How the NST Startup Track evaluation rubric, KPIs, milestones and status logic work." },
    ],
  }),
  component: EvaluationGuidePage,
});

function EvaluationGuidePage() {
  return (
    <div className="space-y-10">
      <header className="space-y-2 pb-5 border-b border-border/70">
        <div className="text-[10.5px] uppercase tracking-[0.25em] text-muted-foreground">Methodology</div>
        <h1 className="font-display text-4xl leading-[1.05] tracking-tight">
          How we <span className="italic text-accent">evaluate</span>.
        </h1>
        <p className="text-[15px] text-muted-foreground max-w-2xl">
          A transparent reference for faculty on the rubric, KPIs, milestones, and traffic-light logic behind every monthly review.
        </p>
      </header>

      {/* Academic Credit Wrapper */}
      <section className="space-y-4">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <BookOpen className="h-5 w-5 text-primary" />
          0. Academic Credit Structure (12 Credits)
        </h2>
        <p className="text-sm text-muted-foreground max-w-3xl">
          The Startup Track is wrapped into two 6-credit courses so the university can issue formal grades.
          The underlying monthly rubric, KPIs and traffic-light logic remain unchanged — these courses
          simply re-aggregate the existing evaluations into semester-level grades.
        </p>

        <div className="grid gap-4 lg:grid-cols-2">
          <Card className="border-blue-200">
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center justify-between gap-2">
                <span>Entrepreneurship Practice I</span>
                <Badge variant="outline" className="border-blue-300 text-blue-700 bg-blue-50 shrink-0">6 Credits · M1–3</Badge>
              </CardTitle>
              <p className="text-xs text-muted-foreground pt-1">Focus: Discovery → MVP → Validation</p>
            </CardHeader>
            <CardContent className="space-y-4 text-sm">
              <div>
                <p className="font-medium mb-1.5 text-xs uppercase tracking-wider text-muted-foreground">Course Components</p>
                <Table>
                  <TableBody>
                    <TableRow><TableCell>Customer Discovery & Problem Validation</TableCell><TableCell className="text-right font-mono">25%</TableCell></TableRow>
                    <TableRow><TableCell>MVP Development & Product Progress</TableCell><TableCell className="text-right font-mono">30%</TableCell></TableRow>
                    <TableRow><TableCell>Founder Reviews (Monthly)</TableCell><TableCell className="text-right font-mono">20%</TableCell></TableRow>
                    <TableRow><TableCell>Documentation & Reporting</TableCell><TableCell className="text-right font-mono">10%</TableCell></TableRow>
                    <TableRow><TableCell>Mentor Evaluation</TableCell><TableCell className="text-right font-mono">15%</TableCell></TableRow>
                    <TableRow className="font-semibold"><TableCell>Total</TableCell><TableCell className="text-right font-mono">100%</TableCell></TableRow>
                  </TableBody>
                </Table>
              </div>
              <div>
                <p className="font-medium mb-1.5 text-xs uppercase tracking-wider text-muted-foreground">Evidence Collected</p>
                <p className="text-muted-foreground leading-relaxed text-xs">
                  Customer interviews · Problem validation reports · ICP definition · MVP screenshots ·
                  Product demos · Iteration logs · Mentor feedback · Monthly progress reports
                </p>
              </div>
              <div>
                <p className="font-medium mb-1.5 text-xs uppercase tracking-wider text-muted-foreground">Maps to Existing Rubric</p>
                <div className="flex flex-wrap gap-1.5">
                  <Badge variant="outline">Customer & Market 40%</Badge>
                  <Badge variant="outline">Execution & Product 40%</Badge>
                  <Badge variant="outline">Founder Behaviour 20%</Badge>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-emerald-200">
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center justify-between gap-2">
                <span>Entrepreneurship Practice II</span>
                <Badge variant="outline" className="border-emerald-300 text-emerald-700 bg-emerald-50 shrink-0">6 Credits · M4–6</Badge>
              </CardTitle>
              <p className="text-xs text-muted-foreground pt-1">Focus: Business Model → Traction → Scale → Final Defense</p>
            </CardHeader>
            <CardContent className="space-y-4 text-sm">
              <div>
                <p className="font-medium mb-1.5 text-xs uppercase tracking-wider text-muted-foreground">Course Components</p>
                <Table>
                  <TableBody>
                    <TableRow><TableCell>Business Model & Revenue Validation</TableCell><TableCell className="text-right font-mono">25%</TableCell></TableRow>
                    <TableRow><TableCell>Traction & Market Progress</TableCell><TableCell className="text-right font-mono">25%</TableCell></TableRow>
                    <TableRow><TableCell>Founder Reviews (Monthly)</TableCell><TableCell className="text-right font-mono">15%</TableCell></TableRow>
                    <TableRow><TableCell>Final Venture Report</TableCell><TableCell className="text-right font-mono">15%</TableCell></TableRow>
                    <TableRow><TableCell>Final Pitch / Demo Day</TableCell><TableCell className="text-right font-mono">10%</TableCell></TableRow>
                    <TableRow><TableCell>Mentor Evaluation</TableCell><TableCell className="text-right font-mono">10%</TableCell></TableRow>
                    <TableRow className="font-semibold"><TableCell>Total</TableCell><TableCell className="text-right font-mono">100%</TableCell></TableRow>
                  </TableBody>
                </Table>
              </div>
              <div>
                <p className="font-medium mb-1.5 text-xs uppercase tracking-wider text-muted-foreground">Evidence Collected</p>
                <p className="text-muted-foreground leading-relaxed text-xs">
                  Revenue evidence · Pilot results · Pricing experiments · Partnership discussions ·
                  Growth metrics · Unit economics · Pitch deck · Demo day · Final venture report
                </p>
              </div>
              <div>
                <p className="font-medium mb-1.5 text-xs uppercase tracking-wider text-muted-foreground">Maps to Existing Rubric</p>
                <div className="flex flex-wrap gap-1.5">
                  <Badge variant="outline">Business & Metrics 40%</Badge>
                  <Badge variant="outline">Customer & Market 25%</Badge>
                  <Badge variant="outline">Execution & Product 20%</Badge>
                  <Badge variant="outline">Founder Behaviour 15%</Badge>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Monthly Milestone → Credit Course Mapping</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-24">Month</TableHead>
                  <TableHead>Focus</TableHead>
                  <TableHead className="w-44">Credit Course</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <TableRow><TableCell className="font-medium">Month 1</TableCell><TableCell>Problem Validation</TableCell><TableCell><Badge variant="outline" className="border-blue-300 text-blue-700">Practice I</Badge></TableCell></TableRow>
                <TableRow><TableCell className="font-medium">Month 2</TableCell><TableCell>Customer Discovery & MVP</TableCell><TableCell><Badge variant="outline" className="border-blue-300 text-blue-700">Practice I</Badge></TableCell></TableRow>
                <TableRow><TableCell className="font-medium">Month 3</TableCell><TableCell>MVP & Pilot</TableCell><TableCell><Badge variant="outline" className="border-blue-300 text-blue-700">Practice I</Badge></TableCell></TableRow>
                <TableRow><TableCell className="font-medium">Month 4</TableCell><TableCell>Business Model & Revenue</TableCell><TableCell><Badge variant="outline" className="border-emerald-300 text-emerald-700">Practice II</Badge></TableCell></TableRow>
                <TableRow><TableCell className="font-medium">Month 5</TableCell><TableCell>Growth & Partnerships</TableCell><TableCell><Badge variant="outline" className="border-emerald-300 text-emerald-700">Practice II</Badge></TableCell></TableRow>
                <TableRow><TableCell className="font-medium">Month 6</TableCell><TableCell>Final Venture Defense</TableCell><TableCell><Badge variant="outline" className="border-emerald-300 text-emerald-700">Practice II</Badge></TableCell></TableRow>
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <p className="text-xs text-muted-foreground italic">
          Note: the underlying monthly rubric, KPIs and traffic-light logic described in sections 1–6 below are unchanged.
          These two courses are an academic wrapper for university grading only.
        </p>
      </section>

      <Separator />

      {/* 4-Pillar Rubric */}
      <section className="space-y-4">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <BookOpen className="h-5 w-5 text-primary" />
          1. Four-Pillar Rubric (100 points)
        </h2>
        <p className="text-sm text-muted-foreground">
          Every monthly evaluation is scored across four pillars derived from the syllabus TLOs and CLOs.
        </p>

        <div className="grid gap-4 md:grid-cols-2">
          <PillarCard
            icon={<Lightbulb className="h-5 w-5" />}
            title="Execution & Product"
            weight={40}
            color="bg-blue-500/10 text-blue-600 border-blue-200"
            tlo="TLO-3, TLO-4"
            desc="Lean Startup experiments, rapid prototyping, technical architecture, feature delivery, product iterations."
          />
          <PillarCard
            icon={<Target className="h-5 w-5" />}
            title="Customer & Market"
            weight={25}
            color="bg-emerald-500/10 text-emerald-600 border-emerald-200"
            tlo="TLO-1, TLO-2"
            desc="Customer discovery, segmentation, market size (TAM/SAM/SOM), interview depth, competitive positioning."
          />
          <PillarCard
            icon={<BarChart3 className="h-5 w-5" />}
            title="Business & Metrics"
            weight={20}
            color="bg-amber-500/10 text-amber-600 border-amber-200"
            tlo="TLO-5, TLO-6, TLO-8"
            desc="Business model canvas, revenue model, unit economics, traction metrics, demo-ready pitch."
          />
          <PillarCard
            icon={<HeartHandshake className="h-5 w-5" />}
            title="Founder Behaviour"
            weight={15}
            color="bg-rose-500/10 text-rose-600 border-rose-200"
            tlo="TLO-9, TLO-10"
            desc="Self-direction, resilience, mentor engagement, accountability, time management, team dynamics."
          />
        </div>

        {/* Detailed scoring rubric */}
        <Card className="mt-4">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Detailed Scoring Rubric — Score Bands per Pillar</CardTitle>
            <p className="text-xs text-muted-foreground pt-1">
              Faculty use these descriptors to translate evidence into a numeric score for each pillar every month.
            </p>
          </CardHeader>
          <CardContent className="p-0 overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-40">Pillar (Max)</TableHead>
                  <TableHead>Exemplary (76–100%)</TableHead>
                  <TableHead>Proficient (51–75%)</TableHead>
                  <TableHead>Developing (26–50%)</TableHead>
                  <TableHead>Insufficient (0–25%)</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody className="text-xs align-top">
                <TableRow>
                  <TableCell className="font-medium">Execution & Product<br/><span className="font-mono text-muted-foreground">/ 40</span></TableCell>
                  <TableCell>Ships multiple iterations, working MVP with user testing evidence, disciplined experiment cadence, clear technical roadmap.</TableCell>
                  <TableCell>Prototype in market with 1–2 iterations, experiments run but incomplete learning loops, roadmap partial.</TableCell>
                  <TableCell>Early prototype only, few iterations, weak experiment design, limited technical progress.</TableCell>
                  <TableCell>No shipped artefact, no experiments, no roadmap or backlog.</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="font-medium">Customer & Market<br/><span className="font-mono text-muted-foreground">/ 25</span></TableCell>
                  <TableCell>15+ deep interviews, sharp ICP, quantified TAM/SAM/SOM, competitive map with clear wedge.</TableCell>
                  <TableCell>8–14 interviews, ICP defined, market sized with assumptions, basic competitor analysis.</TableCell>
                  <TableCell>1–7 interviews, vague ICP, market size guessed, competitors listed without analysis.</TableCell>
                  <TableCell>No interviews logged, no ICP, no market sizing.</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="font-medium">Business & Metrics<br/><span className="font-mono text-muted-foreground">/ 20</span></TableCell>
                  <TableCell>Validated revenue model, pricing tested with customers, defensible unit economics, traction KPIs trending up.</TableCell>
                  <TableCell>BMC complete, pricing hypothesis stated, early revenue or LOIs, some KPIs tracked.</TableCell>
                  <TableCell>BMC partial, no pricing tests, no revenue, KPIs inconsistent.</TableCell>
                  <TableCell>No business model, no metrics tracked.</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="font-medium">Founder Behaviour<br/><span className="font-mono text-muted-foreground">/ 15</span></TableCell>
                  <TableCell>Proactive, all mentor sessions attended, submissions on time, reflective on failure, strong team dynamics.</TableCell>
                  <TableCell>Attends most sessions, mostly on time, receptive to feedback, workable team.</TableCell>
                  <TableCell>Misses sessions, late submissions, defensive to feedback, team friction.</TableCell>
                  <TableCell>Disengaged, missed multiple deadlines, no mentor contact, team dysfunction.</TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <p className="text-xs text-muted-foreground italic">
          Scoring rule: select the band that fits the evidence, then place the score within that band.
          Example: a “Proficient” Execution founder scores 21–30 out of 40.
        </p>
      </section>

      <Separator />

      {/* Milestone Timeline */}
      <section className="space-y-4">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <Clock className="h-5 w-5 text-primary" />
          2. Six-Month Milestone Timeline
        </h2>
        <p className="text-sm text-muted-foreground">
          Each month has a defined focus that maps directly to the rubric pillars above.
        </p>
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-24">Month</TableHead>
                  <TableHead>Phase Focus</TableHead>
                  <TableHead>Key Deliverables / Evidence</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <TableRow>
                  <TableCell className="font-medium">Month 1</TableCell>
                  <TableCell>Discovery & Problem Validation</TableCell>
                  <TableCell>10+ customer interviews, pain-point hypothesis, initial segmentation</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="font-medium">Month 2</TableCell>
                  <TableCell>MVP & Prototype</TableCell>
                  <TableCell>Working prototype, feature list, 3+ iterations based on feedback</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="font-medium">Month 3</TableCell>
                  <TableCell>Market Pilot & Business Model</TableCell>
                  <TableCell>Early pilot results, completed BMC, revenue model clarity</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="font-medium">Month 4</TableCell>
                  <TableCell>Business Model & Revenue</TableCell>
                  <TableCell>Pricing tested, unit economics estimated, traction KPIs tracked</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="font-medium">Month 5</TableCell>
                  <TableCell>Scaling & Partnerships</TableCell>
                  <TableCell>Partnership conversations, growth plan, 5+ assumptions invalidated</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="font-medium">Month 6</TableCell>
                  <TableCell>Final Evaluation</TableCell>
                  <TableCell>Investor-ready pitch deck, demo link, revenue evidence, complete track record</TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </section>

      <Separator />

      {/* Status Logic */}
      <section className="space-y-4">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <AlertTriangle className="h-5 w-5 text-primary" />
          3. Status Logic & Traffic-Light System
        </h2>
        <p className="text-sm text-muted-foreground">
          Each month the system auto-computes a status from the total score and per-pillar minimums. Faculty can override manually.
        </p>
        <div className="grid gap-4 md:grid-cols-3">
          <Card className="border-emerald-200 bg-emerald-50/50 dark:bg-emerald-950/20">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2 text-emerald-700 dark:text-emerald-300">
                <CheckCircle className="h-4 w-4" /> Green (On Track)
              </CardTitle>
            </CardHeader>
            <CardContent className="text-sm space-y-2">
              <p>Total score <strong>≥ 70 / 100</strong></p>
              <p><strong>AND</strong> no single pillar below 50% of its weight</p>
              <p className="text-xs text-muted-foreground">Example: Execution must be ≥ 20, Customer ≥ 13, Business ≥ 10, Behaviour ≥ 8</p>
            </CardContent>
          </Card>
          <Card className="border-amber-200 bg-amber-50/50 dark:bg-amber-950/20">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2 text-amber-700 dark:text-amber-300">
                <AlertTriangle className="h-4 w-4" /> Yellow (Warning)
              </CardTitle>
            </CardHeader>
            <CardContent className="text-sm space-y-2">
              <p>Total score <strong>50 – 69 / 100</strong></p>
              <p>OR one pillar is below 50% of its weight but total ≥ 50</p>
              <p className="text-xs text-muted-foreground">Faculty should flag for a 1:1 review call.</p>
            </CardContent>
          </Card>
          <Card className="border-rose-200 bg-rose-50/50 dark:bg-rose-950/20">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2 text-rose-700 dark:text-rose-300">
                <XCircle className="h-4 w-4" /> Red (At Risk)
              </CardTitle>
            </CardHeader>
            <CardContent className="text-sm space-y-2">
              <p>Total score <strong>&lt; 50 / 100</strong></p>
              <p>OR multiple pillars below 50% of their weight</p>
              <p className="text-xs text-muted-foreground">Triggers Academic Review Board escalation.</p>
            </CardContent>
          </Card>
        </div>
      </section>

      <Separator />

      {/* Review Triggers */}
      <section className="space-y-4">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <Target className="h-5 w-5 text-primary" />
          4. Review Board Triggers
        </h2>
        <Card>
          <CardContent className="p-4 space-y-3">
            <div className="flex items-start gap-3">
              <Badge variant="outline" className="border-amber-300 text-amber-700 bg-amber-50 shrink-0 mt-0.5">2× Yellow</Badge>
              <div className="text-sm">
                <p className="font-medium">Faculty Review Warning</p>
                <p className="text-muted-foreground">If a student receives Yellow in two consecutive months, faculty must schedule a formal review and document an improvement plan.</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <Badge variant="outline" className="border-rose-300 text-rose-700 bg-rose-50 shrink-0 mt-0.5">2× Red</Badge>
              <div className="text-sm">
                <p className="font-medium">Academic Review Board</p>
                <p className="text-muted-foreground">If a student receives Red in two consecutive months, the case is escalated to the Academic Review Board to decide on continuation or return to internship track.</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </section>

      <Separator />

      {/* KPIs */}
      <section className="space-y-4">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <BarChart3 className="h-5 w-5 text-primary" />
          5. Key Performance Indicators (KPIs) Tracked
        </h2>
        <p className="text-sm text-muted-foreground">
          Founders self-report these monthly. They provide objective evidence to support the subjective rubric scores.
        </p>
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>KPI Category</TableHead>
                  <TableHead>Metrics</TableHead>
                  <TableHead className="w-40">Linked Pillar</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <TableRow>
                  <TableCell className="font-medium">Discovery</TableCell>
                  <TableCell>Customer interviews conducted, iterations this month, assumptions invalidated, key learnings documented</TableCell>
                  <TableCell><Badge variant="outline">Customer & Market</Badge></TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="font-medium">Product</TableCell>
                  <TableCell>Features shipped, demo link, technical milestones reached</TableCell>
                  <TableCell><Badge variant="outline">Execution & Product</Badge></TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="font-medium">Traction</TableCell>
                  <TableCell>Sign-ups / pilots, revenue (if any), partnerships in discussion</TableCell>
                  <TableCell><Badge variant="outline">Business & Metrics</Badge></TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="font-medium">Growth</TableCell>
                  <TableCell>Experiments run, failures documented, pivot evidence</TableCell>
                  <TableCell><Badge variant="outline">Founder Behaviour</Badge></TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </section>

      <Separator />

      {/* How to use */}
      <section className="space-y-4">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <HeartHandshake className="h-5 w-5 text-primary" />
          6. How Faculty Use This System
        </h2>
        <div className="grid gap-3 md:grid-cols-2">
          <Step number={1} title="Founders Submit Monthly" desc="Each founder fills in their KPIs and a self-assessment before the deadline." />
          <Step number={2} title="Faculty Score Each Pillar" desc="Open the founder’s profile, review evidence, and enter scores (0–100 per pillar)." />
          <Step number={3} title="System Auto-Calculates" desc="Total score, traffic-light status, and any review-board triggers are computed automatically." />
          <Step number={4} title="Dashboard Summary" desc="Review the cohort dashboard for real-time health of all startup-track students." />
          <Step number={5} title="Export for Board" desc="Use CSV export to compile cases for the Academic Review Board meeting." />
          <Step number={6} title="Override if Needed" desc="Faculty can manually change a status when qualitative judgement differs from the formula." />
        </div>
      </section>
    </div>
  );
}

function PillarCard({ icon, title, weight, color, tlo, desc }: { icon: React.ReactNode; title: string; weight: number; color: string; tlo: string; desc: string }) {
  return (
    <Card className={`border ${color}`}>
      <CardHeader className="pb-2">
        <div className="flex items-center gap-2">
          {icon}
          <CardTitle className="text-base">{title}</CardTitle>
        </div>
      </CardHeader>
      <CardContent className="space-y-2 text-sm">
        <p><strong>Weight:</strong> {weight}%</p>
        <p><strong>Syllabus:</strong> {tlo}</p>
        <p className="text-muted-foreground leading-relaxed">{desc}</p>
      </CardContent>
    </Card>
  );
}

function Step({ number, title, desc }: { number: number; title: string; desc: string }) {
  return (
    <div className="flex gap-3 items-start">
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground text-sm font-bold">
        {number}
      </div>
      <div>
        <p className="font-medium text-sm">{title}</p>
        <p className="text-xs text-muted-foreground leading-relaxed">{desc}</p>
      </div>
    </div>
  );
}
