"use client";
import { useState } from "react";
import { PRIVACY_TERMS, PRIVACY_TERMS_VERSION } from "@/content/privacyTerms";

export function PrivacyConsentModal({ onDecide }: { onDecide: (accepted: boolean) => void }) {
  const [submitting, setSubmitting] = useState(false);

  async function decide(accepted: boolean) {
    setSubmitting(true);
    try {
      await onDecide(accepted);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-4">
      <div className="glass rounded-2xl max-w-lg w-full p-6 max-h-[85vh] flex flex-col">
        <h2 className="text-lg font-bold text-white mb-1">Before you start</h2>
        <p className="text-sm text-neutral-400 mb-4 leading-relaxed">
          Lab Brain records audio and video during sessions. Choose whether your
          speech and face are identified and stored under your name, or kept
          anonymized and redacted by default — full details below.
        </p>

        <div className="flex-1 overflow-y-auto pr-1 mb-4 border-t border-b border-white/10 py-4 space-y-4">
          {PRIVACY_TERMS.map((section) => (
            <div key={section.heading}>
              <h3 className="text-xs font-semibold text-neutral-300 uppercase tracking-wider mb-1.5">
                {section.heading}
              </h3>
              {section.body.map((para, i) => (
                <p key={i} className="text-xs text-neutral-500 leading-relaxed mb-1.5 last:mb-0">
                  {para}
                </p>
              ))}
            </div>
          ))}
          <p className="text-[10px] text-neutral-600 pt-1">
            Notice version {PRIVACY_TERMS_VERSION}
          </p>
        </div>

        <p className="text-xs text-neutral-500 mb-4">
          You can change this later in Settings → Privacy.
        </p>

        <div className="flex gap-3">
          <button
            disabled={submitting}
            onClick={() => decide(false)}
            className="flex-1 px-4 py-2.5 rounded-xl border border-white/10 text-sm text-neutral-300 hover:bg-white/5 transition-colors disabled:opacity-50"
          >
            Keep me anonymized
          </button>
          <button
            disabled={submitting}
            onClick={() => decide(true)}
            className="flex-1 px-4 py-2.5 rounded-xl bg-signal hover:bg-signal-light text-white text-sm font-semibold transition-colors disabled:opacity-50"
          >
            I agree
          </button>
        </div>
      </div>
    </div>
  );
}