// content/privacyTerms.ts
//
// Full text shown in PrivacyConsentModal. Kept as data (not JSX) so it's
// easy to review, version, and translate independently of the component
// that renders it.
//
// IMPORTANT — not legal advice: this is a plain-language starting draft,
// not a reviewed legal document. Before shipping this to real users:
//   1. Fill in every [BRACKETED] placeholder below — retention period,
//      who can access recordings, and a real contact address. Don't ship
//      with placeholders still in place.
//   2. Since this records identifiable audio/video of people (including,
//      potentially, research participants at ITS/NTUST), check whether
//      your institution's ethics/IRB process requires a separate informed
//      consent form for the research use itself — this modal covers the
//      product's data handling, not necessarily human-subjects approval.
//   3. Have someone who can actually assess Indonesian PDP Law (UU PDP)
//      and any NTUST/Taiwan data-handling obligations review this before
//      it's the only consent record you're relying on.

export const PRIVACY_TERMS_VERSION = "2026-08-07";

export interface PrivacyTermsSection {
  heading: string;
  body: string[]; // one string per paragraph
}

export const PRIVACY_TERMS: PrivacyTermsSection[] = [
  {
    heading: "What this covers",
    body: [
      "This notice explains what Lab Brain records during a session, how that recording is processed, and the choice you're making below. It applies to every session you join while logged in to this account, until you change your decision in Settings → Privacy.",
    ],
  },
  {
    heading: "What we record",
    body: [
      "While a session is active, Lab Brain captures your microphone audio and camera video, and produces from them: a text transcript of speech, speaker labels distinguishing who said what, a scene description of what's visible on camera (objects, lighting, general layout — not a biometric face match), and short tags for action items, decisions, and deadlines mentioned in the conversation.",
      "If session recording (egress) is enabled for your organization, a composite audio/video file of the session may also be saved to storage.",
    ],
  },
  {
    heading: "How it's processed",
    body: [
      "Transcription (WhisperX), speaker diarization (pyannote), scene analysis, and the conversational assistant all run on infrastructure operated for this deployment — not sent to a third-party AI vendor's cloud API. That doesn't make the data private by default; it means the only parties with access are the ones operating this deployment, per the access rules below.",
    ],
  },
  {
    heading: "Automatic redaction",
    body: [
      "Before your transcript is written to storage, it passes through two layers of automated redaction: pattern-based matching for structured identifiers (email addresses, phone numbers, national ID numbers, card numbers), followed by a machine-learning model that flags less structured personal information such as names, physical addresses, and dates.",
      "Automated redaction is a risk-reduction measure, not a guarantee — it can miss things, especially content in languages or formats the underlying model wasn't trained on. Avoid saying anything in-session you wouldn't want retained even if redaction happens to miss it.",
    ],
  },
  {
    heading: "Your choice: identified or anonymized",
    body: [
      "\u201cI agree\u201d — your speech is transcribed under your real name, your face may be recognized and labeled in scene descriptions, and the automated redaction above does not remove personal information from your own speech.",
      "\u201cKeep me anonymized\u201d — your speech is attributed to a generic label instead of your name, your face is not identified in scene descriptions, and the redaction layers above are applied to anything you say.",
      "Either way, this choice only affects how your own contributions are recorded and labeled — it doesn't change what's captured about anyone else in the room, which depends on their own setting.",
    ],
  },
  {
    heading: "Storage and retention",
    body: [
      "Transcripts, tags, and (if enabled) session recordings are stored in this deployment's database and object storage. [ADD: how long records are retained, and whether/how they're deleted after a session, project, or academic term ends.]",
    ],
  },
  {
    heading: "Who can access your data",
    body: [
      "Session records are visible to the session's owner and to participants who were part of that session. [ADD: whether any administrator, researcher, or supervisor role has broader access, and under what circumstances.]",
    ],
  },
  {
    heading: "Changing your mind",
    body: [
      "You can change this decision at any time in Settings → Privacy. The new setting applies from your next session onward — it does not retroactively re-process transcripts or recordings from sessions that already happened under your previous setting.",
    ],
  },
  {
    heading: "Questions or requests",
    body: [
      "To ask a question, request a copy of your data, or request deletion, contact [ADD: contact person/email].",
    ],
  },
  {
    heading: "Changes to this notice",
    body: [
      `This is version ${PRIVACY_TERMS_VERSION} of this notice. If the recording or processing described here changes materially, you'll be asked to review and re-confirm your choice.`,
    ],
  },
];