# Nova Dental Clinic: AI Phone Receptionist (browser demo)

A free, browser-based prototype of an AI phone receptionist for a fictional dental clinic. Press **Call receptionist**, talk (or type), and Nova takes appointment requests, answers FAQs, handles emergencies, simulates a staff transfer, and writes a call summary that lands in a receptionist dashboard.

> **This is a browser-based prototype.** Production deployments can connect this receptionist to a real business phone number. Calls made in the browser are labelled **Demo Call** and never reach a real phone line. Sample rows in the dashboard are labelled **Sample**.

## Cost: free, no keys

Vanilla HTML/CSS/JS. No Twilio, no paid telephony or voice APIs, no OpenAI, ElevenLabs, Vapi or Retell, no database, no build step. Speech uses the browser's own **Web Speech API** (`SpeechRecognition` for listening, `speechSynthesis` for speaking). Demo Calls are stored in `localStorage` only.

## Run it

Open `index.html`, or host the folder on GitHub Pages. Best voice experience is Chrome or Edge (desktop or Android) over HTTPS or localhost. If speech recognition is unavailable, or the microphone is blocked, the call automatically falls back to typing.

## What it does

- **Appointment flow:** name, service, preferred date, preferred time, phone number. It fills slots from a single sentence ("book whitening tomorrow at 3 pm") and checks the clinic's opening hours.
- **FAQ:** hours, prices, location, services, insurance, all from the knowledge base at the top of `script.js`.
- **Emergency:** reads the clinic's predefined policy (911 for life-threatening symptoms, after-hours line for urgent dental pain) and logs an urgent callback.
- **Transfer:** shows a "Transferring to staff..." state, then logs a callback because no staff exist in a demo.
- **Cancel / reschedule:** logs the request for staff to confirm.
- **After the call:** caller name, reason, requested service, appointment information, lead status and follow-up required. Dashboard shows calls, duration, caller, intent, lead status, appointment requests and follow-ups.

All clinic details (address, prices, phone numbers) are fictional demo data.

## Customising

Edit `BIZ`, `SERVICES` and `INTENTS` in `script.js` for another business. Conversation logic lives in `respond()`, `book()`, `cancel()` and `callback()`.

## Path to production

```
Browser prototype -> Telephony provider -> Speech recognition -> AI -> CRM / calendar
```

1. **Browser prototype (this repo).** Proves the conversation design, knowledge base and call summaries with no spend.
2. **Telephony provider.** Give the business a real number with a provider such as Twilio, Telnyx or Vonage. Inbound calls hit a webhook and stream audio to your server over WebSocket.
3. **Speech recognition.** Replace the Web Speech API with streaming speech-to-text (and text-to-speech for replies). Add barge-in and silence detection.
4. **AI.** Replace `respond()` with an LLM that keeps this repo's knowledge base as its grounding and calls tools like `book_appointment`, `cancel_appointment` and `transfer_call`. Keep the emergency policy as a hard-coded rule that runs before the model.
5. **CRM and calendar.** Write the call summary to the CRM as a lead or activity, and check real availability and create events in the clinic's calendar system. Add consent and call-recording notices, and follow local rules on healthcare data.

## Files

`index.html` (layout), `styles.css` (design), `script.js` (knowledge base, intents, conversation, dashboard), `README.md`.
