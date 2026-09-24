"use strict";
/* Nova Dental Clinic - AI Phone Receptionist demo. No API keys. Browser only. */
const BIZ = { addr: "48 Harbour Lane, Suite 2, Riverside", after: "(555) 010-0199", hours: { 0: null, 1: [8, 18], 2: [8, 18], 3: [8, 18], 4: [8, 18], 5: [8, 18], 6: [9, 14] } };
const SERVICES = [
  { n: "Children's check-up", p: "$65", k: /child|kid|pediatric/ },
  { n: "Check-up and cleaning", p: "$95", k: /check.?up|cleaning|hygien|dental exam/ },
  { n: "Teeth whitening", p: "$299 in-office, or $99 for a take-home kit", k: /whiten|bleach/ },
  { n: "Filling", p: "from $140", k: /filling|cavity|cavities/ },
  { n: "Root canal", p: "from $650", k: /root canal/ },
  { n: "Crown", p: "$890", k: /crown/ },
  { n: "Tooth extraction", p: "from $180", k: /extract|wisdom/ },
  { n: "Aligner consultation", p: "free for the consultation, with treatment from $3,200", k: /aligner|invisalign|braces|straighten/ }
];
const INTENTS = [
  ["emergency", /emergenc|bleeding|knocked|swollen|swelling|can'?t breathe|excruciating|urgent|broke(n)? tooth|abscess/],
  ["transfer", /(speak|talk).*(someone|person|human|staff|receptionist|dentist)|transfer|real person|operator/],
  ["cancel", /cancel|can'?t make it|reschedul|move my appointment|change my appointment/],
  ["price", /how much|price|cost|pricing|fee\b|charge|afford/],
  ["book", /book|appointment|schedul|see (a|the) dentist|come in/],
  ["hours", /\bopen\b|hours|closing|what time|when are you/],
  ["location", /where|locat|address|direction|parking/],
  ["insurance", /insurance|coverage|delta|payment plan/],
  ["services", /services|what do you (do|offer|provide)|treatments|\boffer\b|provide/],
  ["bye", /^(bye|goodbye|that'?s all|no thanks?|thank you,? bye|i'?m all set)/],
  ["greet", /^(hi|hello|hey|good (morning|afternoon|evening))\b/]
];
const FAQ = ["hours", "price", "location", "services", "insurance"];
const PRI = ["emergency", "transfer", "cancel", "book", "price", "insurance", "services", "hours", "location"];
const LABEL = { book: "Book appointment", cancel: "Cancel / reschedule", emergency: "Emergency", transfer: "Transfer to staff", price: "Pricing question", hours: "Opening hours", location: "Location", services: "Services", insurance: "Insurance", other: "General enquiry" };
const CHIPS = ["I'd like to book an appointment.", "What time are you open?", "How much is teeth whitening?", "Where are you located?", "I need to cancel my appointment.", "I need an emergency appointment.", "Can I speak to someone?", "What services do you provide?"];
const DAYS = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];
const MON = ["january", "february", "march", "april", "may", "june", "july", "august", "september", "october", "november", "december"];
const NUM = { zero: 0, oh: 0, one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9 };
const ELSE = " Is there anything else I can help with?";
const GREETING = "Thank you for calling Nova Dental Clinic. This is Nova, the virtual receptionist. How can I help you today?";
const KEY = "nova-receptionist-demo-calls";

const $ = s => document.querySelector(s);
const cap = s => s.replace(/\b[a-z]/g, c => c.toUpperCase());
const esc = s => String(s).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
const mmss = s => Math.floor(s / 60) + ":" + String(s % 60).padStart(2, "0");
const fmtDate = d => d.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" });
const fmtTime = t => (((t.h + 11) % 12) + 1) + ":" + String(t.m).padStart(2, "0") + " " + (t.h < 12 ? "AM" : "PM") + (t.soft ? " (" + t.soft + ")" : "");
const h12 = h => (h > 12 ? h - 12 : h) + (h >= 12 ? " PM" : " AM");
const fmtPhone = d => (d.length === 10 ? "(" + d.slice(0, 3) + ") " + d.slice(3, 6) + "-" + d.slice(6) : d);
const spoken = d => d.split("").join(" ");

/* ---------- understanding: intents and slots ---------- */
function classify(t) {
  t = t.toLowerCase();
  for (const [id, re] of INTENTS) if (re.test(t)) return id;
  return SERVICES.some(s => s.k.test(t)) ? "book" : null;
}
function phoneOf(t) {
  const s = t.toLowerCase().replace(/\b(zero|oh|one|two|three|four|five|six|seven|eight|nine)\b/g, m => NUM[m]);
  const m = s.match(/(?:\d[\s\-().]*){7,}/);
  return m ? m[0].replace(/\D/g, "").slice(0, 11) : null;
}
function timeOf(t) {
  let m = t.match(/\b(\d{1,2})(?::(\d{2}))?\s*([ap])\.?m\b/);
  if (m) return { h: (+m[1] % 12) + (m[3] === "p" ? 12 : 0), m: +(m[2] || 0) };
  if (/\bnoon|midday/.test(t)) return { h: 12, m: 0 };
  m = t.match(/\bat (\d{1,2})(?::(\d{2}))?(?!\d)/);
  if (m && +m[1] <= 12) return { h: +m[1] < 8 ? +m[1] + 12 : +m[1], m: +(m[2] || 0) };
  if (/morning/.test(t)) return { h: 9, m: 0, soft: "morning" };
  if (/afternoon/.test(t)) return { h: 14, m: 0, soft: "afternoon" };
  if (/evening/.test(t)) return { h: 17, m: 0, soft: "evening" };
  return null;
}
function bareTime(t) {
  const m = t.match(/^\s*(\d{1,2})(?::(\d{2}))?\s*$/);
  return m && +m[1] <= 12 ? { h: +m[1] < 8 ? +m[1] + 12 : +m[1], m: +(m[2] || 0) } : null;
}
function dateOf(t) {
  const d = new Date(); d.setHours(0, 0, 0, 0);
  if (/\btoday\b/.test(t)) return d;
  if (/\btomorrow\b/.test(t)) { d.setDate(d.getDate() + 1); return d; }
  let m = t.match(/\b(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\.? (\d{1,2})/);
  if (m) { const x = new Date(d.getFullYear(), MON.findIndex(n => n.startsWith(m[1])), +m[2]); if (x < d) x.setFullYear(x.getFullYear() + 1); return x; }
  m = t.match(/\b(sunday|monday|tuesday|wednesday|thursday|friday|saturday|sun|mon|tues?|wed|thur?s?|fri|sat)\b/);
  if (m) { const w = DAYS.findIndex(n => n.startsWith(m[1].slice(0, 3))); let add = (w - d.getDay() + 7) % 7; if (!add) add = 7; d.setDate(d.getDate() + add); return d; }
  m = t.match(/\bthe (\d{1,2})(st|nd|rd|th)\b/);
  if (m) { const x = new Date(d.getFullYear(), d.getMonth(), +m[1]); if (x <= d) x.setMonth(x.getMonth() + 1); return x; }
  return null;
}
function nameOf(t, strict) {
  let m = t.match(/(?:my name is|my name's|this is|call me|name is)\s+([a-z'-]+(?:\s[a-z'-]+)?)/i) || (strict && t.match(/(?:i am|i'm|it's|im)\s+([a-z'-]+(?:\s[a-z'-]+)?)/i));
  if (m) return cap(m[1].replace(/\s(and|i|for|to|at|on|would|need|want|calling)$/i, ""));
  if (strict) {
    const w = t.replace(/[^a-z' -]/gi, "").trim().split(/\s+/);
    if (w[0] && w.length <= 3 && !classify(t) && !/^(no|yes|yeah|nope|hello|hi|hey|ok|okay|sure|please|thanks|thank you)$/i.test(w.join(" "))) return cap(w.join(" ").toLowerCase());
  }
  return null;
}
function openCheck(d, t) {
  const h = BIZ.hours[d.getDay()];
  if (!h) return ["date", "We're closed on Sundays."];
  if (t && !t.soft && (t.h < h[0] || t.h >= h[1])) return ["time", "On " + cap(DAYS[d.getDay()]) + " we're open " + h12(h[0]) + " to " + h12(h[1]) + "."];
  return null;
}

/* ---------- conversation brain ---------- */
let ctx = null, state = "idle", gen = 0, silence = 0, voice = false, VOICE = null, recog = null, tick = null;
const newCtx = () => ({ active: false, flow: null, step: null, slots: {}, seen: new Set(), log: [], t0: 0, n: 0 });
const QUESTION = {
  name: "May I have your name?",
  service: "Which service do you need? For example a check-up and cleaning, whitening, a filling, or an aligner consultation.",
  date: "What day works best for you?",
  time: "And what time of day do you prefer?",
  phone: "What's the best phone number to reach you?",
  cdate: "Which day is that appointment?"
};
const ask = () => QUESTION[ctx.step] || "";

function faq(id, t) {
  const sv = SERVICES.find(s => s.k.test(t.toLowerCase()));
  if (id === "hours") return "We're open Monday to Friday, 8 AM to 6 PM, and Saturday 9 AM to 2 PM. We're closed on Sundays." + ELSE;
  if (id === "location") return "We're at " + BIZ.addr + ", with free parking behind the building." + ELSE;
  if (id === "insurance") return "We accept most major PPO dental plans and offer payment plans for larger treatments. Our team can check your coverage before your visit." + ELSE;
  if (id === "services") return "We offer check-ups and cleanings, whitening, fillings, root canals, crowns, extractions, aligner consultations, children's dentistry and emergency care. Would you like to request an appointment?";
  ctx.offer = true;
  return sv ? sv.n + " is " + sv.p + ". These are demo prices. Would you like to request an appointment?"
    : "Here are our demo prices: check-up and cleaning $95, whitening from $99, fillings from $140, root canals from $650, and crowns $890. Which service would you like to know about?";
}

function book(t, first) {
  const c = ctx, s = c.slots, st = c.step, lt = t.toLowerCase();
  if (first) c.flow = "book";
  const nm = nameOf(t, st === "name"); if (nm && !s.name) s.name = nm;
  const sv = SERVICES.find(x => x.k.test(lt));
  if (sv && (!s.service || st === "service")) s.service = sv.n;
  else if (st === "service" && !sv && c.retry > 0 && lt.split(/\s+/).length <= 4) s.service = cap(lt.replace(/[^a-z' -]/g, "").trim());
  const d = dateOf(lt); if (d) s.dateObj = d;
  const tm = timeOf(lt) || (st === "time" && bareTime(lt)); if (tm) s.timeObj = tm;
  const ph = phoneOf(lt); if (ph) s.phone = ph;
  if (s.dateObj) {
    const bad = openCheck(s.dateObj, s.timeObj);
    if (bad) { delete (bad[0] === "date" ? s.dateObj : s.timeObj); c.step = bad[0]; return bad[1] + " " + (bad[0] === "date" ? "What other day works for you?" : "What time would you prefer?"); }
    s.date = fmtDate(s.dateObj);
  }
  if (s.timeObj) s.time = fmtTime(s.timeObj);
  const miss = ["name", "service", "date", "time", "phone"].find(k => !s[k]);
  if (miss) {
    c.retry = miss === st ? (c.retry || 0) + 1 : 0;
    c.step = miss;
    if (c.retry) return "Sorry, I didn't catch that. " + ask() + (miss === "date" ? " You can say tomorrow, a weekday, or a date." : "");
    const ack = first ? "Happy to help with that. " : ["Great. ", "Perfect. ", "Got it. "][c.n++ % 3];
    return ack + ask();
  }
  c.flow = null; c.done = true;
  return "Thank you, " + s.name + ". I've noted your request for " + s.service + " on " + s.date + " at " + s.time + ". A team member will call " + spoken(s.phone) + " to confirm it." + ELSE;
}

function cancel(t, first) {
  const c = ctx, s = c.slots, lt = t.toLowerCase();
  if (first) { c.flow = "cancel"; c.kind = /reschedul|move|change/.test(lt) ? "reschedule" : "cancel"; }
  const nm = nameOf(t, c.step === "name"); if (nm && !s.name) s.name = nm;
  const d = dateOf(lt); if (d && !s.cdate) s.cdate = fmtDate(d);
  if (!s.name) { c.step = "name"; return first ? "I can help with that. May I have your name?" : "Sorry, what name is the appointment under?"; }
  if (!s.cdate) { c.step = "cdate"; return "Thanks, " + s.name + ". Which day is the appointment you'd like to " + c.kind + "?"; }
  c.flow = null; c.done = true;
  return "Thank you, " + s.name + ". I've logged a request to " + c.kind + " your appointment on " + s.cdate + ". The team will confirm by phone." + ELSE;
}

function callback(kind) {
  const c = ctx; c.flow = "callback"; c.kind = kind; c.step = "name";
  if (kind === "emergency") return "If you have severe bleeding, swelling that affects your breathing or swallowing, or a head or facial injury, please hang up and call 911 now. For a knocked-out or broken tooth or severe pain, call our after-hours line at " + BIZ.after + ". We hold same-day emergency slots every weekday morning. I can also log a callback request. May I have your name?";
  c.pendingTransfer = true;
  return "Of course. Let me transfer you to our front desk team.";
}
function cb(t) {
  const c = ctx, s = c.slots;
  const nm = nameOf(t, c.step === "name"); if (nm && !s.name) s.name = nm;
  const p = phoneOf(t); if (p && !s.phone) s.phone = p;
  if (!s.name) { c.step = "name"; return "May I have your name?"; }
  if (!s.phone) { c.step = "phone"; return "Thanks, " + s.name + ". What's the best number to reach you?"; }
  c.flow = null; c.done = true;
  return c.kind === "emergency"
    ? "Thank you, " + s.name + ". I've logged an urgent callback request for " + spoken(s.phone) + ". Please follow the emergency guidance I gave you in the meantime." + ELSE
    : "Thank you, " + s.name + ". I've logged a callback request for " + spoken(s.phone) + ". The front desk will return your call." + ELSE;
}

function respond(text) {
  const c = ctx, t = text.toLowerCase().trim(), it = classify(t), ae = c.askedElse, offer = c.offer;
  c.askedElse = c.offer = false;
  const no = /^(no|nope|nah|that'?s (it|all)|all good|no thanks?)\b/.test(t);
  const yes = /^(yes|yeah|yep|sure|please|ok|okay|sounds good|go ahead|definitely)\b/.test(t);
  if (it) c.seen.add(it);
  if (it === "emergency" || it === "transfer") return callback(it);
  if (!c.flow && (it === "bye" || (no && (ae || offer)))) { c.ending = true; return "Thank you for calling Nova Dental Clinic. Have a wonderful day. Goodbye!"; }
  if (c.flow && FAQ.includes(it)) return faq(it, t).replace(ELSE, "").replace(/ Would you like to request an appointment\?$/, "") + " " + ask();
  if (c.flow === "book") return book(text);
  if (c.flow === "cancel") return cancel(text);
  if (c.flow === "callback") return cb(text);
  if (it === "book" || (yes && offer)) { c.seen.add("book"); return book(text, true); }
  if (it === "cancel") return cancel(text, true);
  if (FAQ.includes(it)) return faq(it, t);
  if (it === "greet") return "Hello! How can I help you today?";
  if (yes && ae) return "Of course. What can I help you with?";
  c.unknown = (c.unknown || 0) + 1;
  return c.unknown > 1 ? "I'm sorry, I'm still not sure I understood. Would you like me to transfer you to a member of our team?"
    : "Sorry, I didn't quite catch that. I can request appointments, share our hours, prices and location, or transfer you to staff.";
}

/* ---------- call UI ---------- */
const STATUS = { idle: "Ready when you are", ringing: "Calling Nova Dental Clinic...", speaking: "Nova is speaking", listening: "Listening. Go ahead.", thinking: "Thinking...", typing: "Type your reply below", transfer: "Transferring to staff...", ended: "Call ended" };
function setState(s) {
  state = s; $("#handset").dataset.state = s; $("#status").textContent = STATUS[s];
  const on = ctx && ctx.active;
  $("#dial").textContent = on ? "End call" : "Call receptionist"; $("#dial").classList.toggle("live", !!on);
  $("#txt").disabled = $(".send").disabled = !on;
  document.querySelectorAll("#chips button").forEach(b => (b.disabled = !on));
}
function msg(who, text) {
  const l = $("#log"); const e = l.querySelector(".empty"); if (e) e.remove();
  const d = document.createElement("div"); d.className = "msg " + (who === "You" ? "you" : "nova");
  d.innerHTML = "<b>" + (who === "You" ? "You" : "Nova") + "</b><p></p>"; d.querySelector("p").textContent = text;
  l.insertBefore(d, $("#interim")); l.scrollTop = l.scrollHeight; ctx.log.push([who === "You" ? "Caller" : "Nova", text]);
}
function renderSlip() {
  const s = ctx ? ctx.slots : {}, row = (k, v) => "<div><dt>" + k + "</dt><dd>" + esc(v || "-") + "</dd></div>";
  $("#slip").innerHTML = row("Name", s.name) + row("Service", s.service) + row("Date", s.date || s.cdate) + row("Time", s.time) + row("Phone", s.phone && fmtPhone(s.phone));
  const p = primary(); $("#intentNow").textContent = "Intent: " + (ctx && ctx.seen.size ? LABEL[p] : "waiting for the call");
}
const primary = () => (ctx && PRI.find(i => ctx.seen.has(i))) || "other";

function say(text, next) {
  msg("Nova", text); setState("speaking");
  const id = ++gen, go = () => { if (id === gen && next) next(); };
  if (!$("#speak").checked || !window.speechSynthesis) return void setTimeout(go, Math.min(1800, 500 + text.length * 12));
  speechSynthesis.cancel();
  const parts = (text.match(/[^.!?]+[.!?]*/g) || [text]).map(p => p.trim()).filter(Boolean); let i = 0;
  const step = () => {
    if (id !== gen) return; if (i >= parts.length) return go();
    const u = new SpeechSynthesisUtterance(parts[i++]); u.lang = "en-US"; if (VOICE) u.voice = VOICE; u.onend = u.onerror = step; speechSynthesis.speak(u);
  };
  step();
}
function turn(text) {
  if (!ctx || !ctx.active || !text.trim()) return;
  silence = 0; try { recog && recog.abort(); } catch (e) {}
  msg("You", text); setState("thinking"); $("#interim").textContent = "";
  setTimeout(() => {
    const r = respond(text); renderSlip(); ctx.askedElse = /anything else/.test(r);
    say(r, () => {
      if (ctx.ending) return finish();
      if (ctx.pendingTransfer) return transfer();
      listen();
    });
  }, 450);
}
function transfer() {
  ctx.pendingTransfer = false; setState("transfer");
  setTimeout(() => say("I'm sorry, nobody is available to take the call in this demo. In production this would ring the front desk. I've logged a callback request instead. May I have your name?", listen), 3000);
}
function listen() {
  if (!ctx || !ctx.active) return;
  if (!voice) { setState("typing"); $("#txt").focus(); return; }
  setState("listening");
  try { recog.start(); } catch (e) {}
}
function makeRecog() {
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  const r = new SR(); r.lang = "en-US"; r.interimResults = true;
  r.onresult = e => {
    let fin = "", tmp = "";
    for (let i = e.resultIndex; i < e.results.length; i++) (e.results[i].isFinal ? (fin += e.results[i][0].transcript) : (tmp += e.results[i][0].transcript));
    $("#interim").textContent = tmp; if (fin) turn(fin.trim());
  };
  r.onerror = e => {
    if (["not-allowed", "service-not-allowed", "network", "audio-capture"].includes(e.error)) {
      voice = false; $("#fallback").hidden = false; $("#fallback").textContent = "The microphone isn't available (permission blocked or no connection), so this call switched to typing.";
      if (state === "listening") listen();
    }
  };
  r.onend = () => {
    if (!ctx || !ctx.active || state !== "listening") return;
    silence++;
    if (silence === 2) say("Are you still there?", listen);
    else if (silence >= 4) { ctx.ending = true; say("I'm not hearing anything, so I'll end the call. Goodbye!", finish); }
    else listen();
  };
  return r;
}
function startCall() {
  ctx = newCtx(); ctx.active = true; ctx.t0 = Date.now(); silence = 0; gen++;
  $("#log").querySelectorAll(".msg,.empty").forEach(n => n.remove()); $("#summary").hidden = true; renderSlip();
  if (window.speechSynthesis && $("#speak").checked) speechSynthesis.speak(new SpeechSynthesisUtterance(""));
  if (voice) recog = makeRecog();
  clearInterval(tick); tick = setInterval(() => ($("#timer").textContent = mmss(Math.round((Date.now() - ctx.t0) / 1000))), 500);
  setState("ringing");
  setTimeout(() => ctx.active && say(GREETING, listen), 1500);
}
function finish() {
  if (!ctx || !ctx.active) return;
  ctx.active = false; gen++; clearInterval(tick);
  try { recog && recog.abort(); } catch (e) {}
  if (window.speechSynthesis) speechSynthesis.cancel();
  const r = record(); const all = load(); all.push(r); save(all);
  setState("ended"); $("#interim").textContent = ""; showSummary(r); renderDash();
}

/* ---------- summary, storage, dashboard ---------- */
function record() {
  const s = ctx.slots, pri = primary(), done = !!ctx.done;
  const lead = pri === "emergency" ? "Urgent" : pri === "book" && done && s.date ? "Hot" : ["book", "price", "transfer", "services"].includes(pri) ? "Warm" : pri === "cancel" ? "Existing patient" : "Info only";
  const follow = { emergency: "Urgent callback", transfer: "Return call to caller", cancel: "Confirm " + (ctx.kind || "cancellation") + " with patient", book: done && s.date ? "Call to confirm appointment" : "Call back to finish booking", price: "Send price list, offer to book", services: "Offer to book" }[pri] || "None";
  const svc = s.service || (ctx.seen.has("price") ? "Pricing enquiry" : "-");
  return { id: "demo-" + Date.now(), src: "Demo Call", at: Date.now(), dur: Math.max(1, Math.round((Date.now() - ctx.t0) / 1000)), caller: s.name || "Unknown caller", intent: pri, service: svc, phone: s.phone ? fmtPhone(s.phone) : "-", appt: pri === "book" && s.date ? s.date + (s.time ? ", " + s.time : " (time not chosen)") : pri === "cancel" && s.cdate ? "Existing: " + s.cdate : "-", lead, follow, log: ctx.log };
}
function showSummary(r) {
  const row = (k, v) => "<div><dt>" + k + "</dt><dd>" + esc(v) + "</dd></div>";
  $("#summary").hidden = false;
  $("#summary").innerHTML = "<h2>Call summary <span class='badge demo'>Demo Call</span></h2><dl>" + row("Caller name", r.caller) + row("Reason for call", LABEL[r.intent]) + row("Requested service", r.service) + row("Appointment information", r.appt) + row("Phone number", r.phone) + row("Duration", mmss(r.dur)) + row("Lead status", r.lead) + row("Follow-up required", r.follow) + "</dl><div class='row'><button class='primary' id='again'>Start another Demo Call</button><button class='ghost' id='toDash'>Open dashboard</button></div>";
  $("#again").onclick = startCall; $("#toDash").onclick = () => view("dash");
  $("#summary").scrollIntoView({ behavior: "smooth", block: "nearest" });
}
function load() { try { return JSON.parse(localStorage.getItem(KEY)) || []; } catch (e) { return []; } }
function save(a) { try { localStorage.setItem(KEY, JSON.stringify(a.slice(-30))); } catch (e) {} }
const S = (m, dur, caller, intent, service, appt, lead, follow, log) => ({ id: "s" + m, src: "Sample", at: Date.now() - m * 60000, dur, caller, intent, service, phone: "-", appt, lead, follow, log });
const SAMPLES = () => [
  S(12, 161, "Maya Thompson", "book", "Teeth whitening", "Tomorrow, 10:00 AM", "Hot", "Call to confirm appointment", [["Caller", "Hi, I'd like whitening, ideally tomorrow morning."], ["Nova", "Noted. I've requested 10:00 AM tomorrow and a team member will call to confirm."]]),
  S(48, 72, "Unknown caller", "price", "Teeth whitening", "-", "Warm", "Send price list, offer to book", [["Caller", "How much is teeth whitening?"], ["Nova", "In-office is $299, or $99 for a take-home kit."]]),
  S(130, 54, "Unknown caller", "hours", "-", "-", "Info only", "None", [["Caller", "Are you open on Saturdays?"], ["Nova", "Yes, Saturday 9 AM to 2 PM."]]),
  S(190, 200, "Daniel Reyes", "book", "Check-up and cleaning", "Friday, 8:30 AM", "Hot", "Call to confirm appointment", [["Caller", "I need a cleaning this Friday, early if possible."], ["Nova", "I've requested 8:30 AM Friday for a check-up and cleaning."]]),
  S(300, 107, "Priya Nair", "cancel", "-", "Existing: Wednesday, 3:00 PM", "Existing patient", "Confirm cancellation and offer rebooking", [["Caller", "I need to cancel my Wednesday appointment."], ["Nova", "I've logged that request and the team will confirm."]]),
  S(1500, 125, "Chris Baker", "emergency", "Emergency exam", "-", "Urgent", "Urgent callback", [["Caller", "I broke a tooth and it hurts a lot."], ["Nova", "Please call our after-hours line. I've logged an urgent callback."]]),
  S(1620, 90, "Sam Ortiz", "transfer", "-", "-", "Warm", "Return call about insurance billing", [["Caller", "Can I speak to someone about a bill?"], ["Nova", "Transferring you. Nobody is free, so I've logged a callback."]]),
  S(1740, 228, "Amira Hassan", "book", "Aligner consultation", "Saturday (time not chosen)", "Warm", "Call back to finish booking", [["Caller", "I'm curious about aligners."], ["Caller", "Sorry, I have to go. Can you call me later?"]])
];
const allCalls = () => [...load(), ...SAMPLES()].sort((a, b) => b.at - a.at);
const ago = t => { const m = Math.round((Date.now() - t) / 60000); return m < 60 ? m + " min ago" : m < 1440 ? Math.round(m / 60) + " h ago" : "Yesterday"; };

function renderDash() {
  const all = allCalls(), f = $("#filter").value;
  const appts = all.filter(c => c.intent === "book" && c.appt !== "-").length, fu = all.filter(c => c.follow !== "None").length;
  const avg = Math.round(all.reduce((a, c) => a + c.dur, 0) / all.length);
  const k = (n, l) => "<div class='kpi'><b>" + n + "</b><span>" + l + "</span></div>";
  $("#kpis").innerHTML = k(all.length, "Calls") + k(mmss(avg), "Average duration") + k(appts, "Appointment requests") + k(fu, "Follow-up required");
  const rows = all.filter(c => f === "all" || (f === "book" && c.intent === "book") || (f === "follow" && c.follow !== "None") || (f === "emergency" && c.intent === "emergency"));
  $("#tbl").innerHTML = "<tr><th>Caller</th><th>When</th><th>Duration</th><th>Intent</th><th>Lead status</th><th>Appointment</th><th>Follow-up</th><th>Source</th></tr>" +
    rows.map(c => "<tr class='row' data-id='" + c.id + "'><td>" + esc(c.caller) + "</td><td>" + ago(c.at) + "</td><td>" + mmss(c.dur) + "</td><td>" + LABEL[c.intent] + "</td><td><span class='badge " + c.lead.split(" ")[0] + "'>" + c.lead + "</span></td><td>" + esc(c.appt) + "</td><td>" + esc(c.follow) + "</td><td><span class='badge " + (c.src === "Demo Call" ? "demo" : "") + "'>" + c.src + "</span></td></tr>").join("");
  $("#tbl").querySelectorAll("tr.row").forEach(tr => (tr.onclick = () => {
    const nx = tr.nextElementSibling; if (nx && nx.classList.contains("dt")) return nx.remove();
    const c = all.find(x => x.id === tr.dataset.id), d = document.createElement("tr"); d.className = "dt";
    d.innerHTML = "<td colspan='8'><b>Service:</b> " + esc(c.service) + " &nbsp; <b>Phone:</b> " + esc(c.phone) + (c.src === "Sample" ? " &nbsp; <i>(sample data)</i>" : "") + c.log.map(l => "<p class='tr'><b>" + l[0] + ":</b>" + esc(l[1]) + "</p>").join("") + "</td>";
    tr.after(d);
  }));
}
function view(v) {
  $("#view-call").hidden = v !== "call"; $("#view-dash").hidden = v !== "dash";
  document.querySelectorAll("nav button").forEach(b => b.toggleAttribute("aria-current", b.dataset.view === v) || b.removeAttribute("aria-current"));
  document.querySelectorAll("nav button").forEach(b => b.dataset.view === v ? b.setAttribute("aria-current", "page") : b.removeAttribute("aria-current"));
  if (v === "dash") renderDash();
}

/* ---------- init ---------- */
(function init() {
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  voice = !!(SR && window.speechSynthesis); $("#fallback").hidden = voice;
  if (window.speechSynthesis) {
    const pick = () => { const l = speechSynthesis.getVoices(); VOICE = l.find(v => /Samantha|Aria|Jenny|Google US English|Zira/.test(v.name)) || l.find(v => v.lang && v.lang.startsWith("en")) || null; };
    pick(); speechSynthesis.onvoiceschanged = pick;
  } else $("#speak").parentNode.hidden = true;
  $("#chips").innerHTML = CHIPS.map(c => "<button disabled>" + esc(c) + "</button>").join("");
  $("#chips").onclick = e => e.target.tagName === "BUTTON" && ctx && ctx.active && turn(e.target.textContent);
  $("#dial").onclick = () => (ctx && ctx.active ? finish() : startCall());
  $("#form").onsubmit = e => { e.preventDefault(); const v = $("#txt").value; $("#txt").value = ""; turn(v); };
  document.querySelectorAll("nav button").forEach(b => (b.onclick = () => view(b.dataset.view)));
  $("#filter").onchange = renderDash;
  $("#reset").onclick = () => { save([]); renderDash(); };
  renderSlip(); setState("idle"); if (location.hash === "#dashboard") view("dash");
})();
