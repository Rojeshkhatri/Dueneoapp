"use client";

import * as React from "react";
import { ToolLayout, type ToolContent } from "@/components/dueneo/tool-layout";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { CopyButton } from "@/components/dueneo/copy-button";
import { toast } from "sonner";
import {
  RotateCcw,
  Download,
  Wand2,
  Play,
  Pause,
  Radio,
  ArrowRightLeft,
} from "lucide-react";
import type { ToolDefinition } from "@/data/tools";
import { byteLength, MAX_INPUT_BYTES, INPUT_TOO_LARGE_MSG, downloadText } from "./_text-helpers";

/** Standard ITU Morse code table. */
const MORSE_TABLE: Record<string, string> = {
  A: ".-", B: "-...", C: "-.-.", D: "-..", E: ".", F: "..-.",
  G: "--.", H: "....", I: "..", J: ".---", K: "-.-", L: ".-..",
  M: "--", N: "-.", O: "---", P: ".--.", Q: "--.-", R: ".-.",
  S: "...", T: "-", U: "..-", V: "...-", W: ".--", X: "-..-",
  Y: "-.--", Z: "--..",
  "0": "-----", "1": ".----", "2": "..---", "3": "...--",
  "4": "....-", "5": ".....", "6": "-....", "7": "--...",
  "8": "---..", "9": "----.",
  ".": ".-.-.-", ",": "--..--", "?": "..--..", "'": ".----.",
  "!": "-.-.--", "/": "-..-", "(": "-.--.", ")": "-.--.-",
  "&": ".-...", ":": "---...", ";": "-.-.-.", "=": "-...-",
  "+": ".-.-.", "-": "-....-", "_": "..--.", '"': ".-..-.",
  $: "...-..-", "@": ".--.-.",
};

/** Reverse lookup — morse sequence → character. */
const REVERSE_MORSE: Record<string, string> = (() => {
  const m: Record<string, string> = {};
  for (const [k, v] of Object.entries(MORSE_TABLE)) m[v] = k;
  return m;
})();

const MAX_PLAY_CHARS = 500;

/** Convert text to a morse code string. Letters separated by single space, words by " / ". */
function textToMorse(text: string): string {
  const words = text.toUpperCase().split(/\s+/).filter(Boolean);
  return words
    .map((word) =>
      word
        .split("")
        .map((ch) => MORSE_TABLE[ch] ?? "")
        .filter(Boolean)
        .join(" "),
    )
    .filter(Boolean)
    .join(" / ");
}

/**
 * Convert a morse string back to text. Tolerates " / " word separators,
 * single-space or triple-space letter separators, and arbitrary runs of
 * dots, dashes and spaces.
 */
function morseToText(morse: string): { ok: true; text: string; unknown: number } {
  const trimmed = morse.trim();
  if (!trimmed) return { ok: true, text: "", unknown: 0 };

  const words = trimmed.split(/\s*\/\s*/);
  let unknown = 0;
  const decodedWords = words.map((word) => {
    const letters = word.trim().split(/\s+/).filter(Boolean);
    return letters
      .map((seq) => {
        const clean = seq.replace(/[^.\-]/g, "");
        if (!clean) return "";
        const ch = REVERSE_MORSE[clean];
        if (!ch) {
          unknown++;
          return "?";
        }
        return ch;
      })
      .join("");
  });
  return { ok: true, text: decodedWords.join(" "), unknown };
}

export function MorseCodeTranslator({ tool }: { tool: ToolDefinition }) {
  const [mode, setMode] = React.useState<"encode" | "decode">("encode");
  const [text, setText] = React.useState("");
  const [bin, setBin] = React.useState("");
  const [wpm, setWpm] = React.useState(15);

  const audioCtxRef = React.useRef<AudioContext | null>(null);
  const oscRef = React.useRef<OscillatorNode | null>(null);
  const gainRef = React.useRef<GainNode | null>(null);
  const [playing, setPlaying] = React.useState(false);
  const playTokenRef = React.useRef(0);

  const tooLarge = byteLength(text) > MAX_INPUT_BYTES;
  const source = tooLarge ? "" : text;

  const encoded = React.useMemo(() => textToMorse(source), [source]);
  const decodeResult = React.useMemo(() => morseToText(bin), [bin]);

  const loadSample = () => {
    if (mode === "encode") {
      setText("SOS Dueneo");
      setBin("");
    } else {
      setBin("... --- ... / -.. ..- . -. . ---");
      setText("");
    }
    toast.message("Sample loaded.");
  };

  const reset = () => {
    setText("");
    setBin("");
    stopPlayback();
  };

  const swap = () => {
    if (mode === "encode") {
      if (!encoded) {
        toast.error("Nothing to swap — encode some text first.");
        return;
      }
      setBin(encoded);
      setText("");
      setMode("decode");
      toast.message("Swapped to morse → text mode with your output.");
    } else {
      if (!decodeResult.text) {
        toast.error("Nothing to swap — decode some morse first.");
        return;
      }
      setText(decodeResult.text);
      setBin("");
      setMode("encode");
      toast.message("Swapped to text → morse mode with your output.");
    }
  };

  const download = () => {
    if (mode === "encode") {
      if (!encoded) {
        toast.error("Nothing to download yet.");
        return;
      }
      downloadText("morse.txt", encoded);
      toast.success("Downloaded morse.txt");
    } else {
      if (!decodeResult.text) {
        toast.error("Nothing to download yet.");
        return;
      }
      downloadText("morse-decoded.txt", decodeResult.text);
      toast.success("Downloaded morse-decoded.txt");
    }
  };

  /** Stop any active playback. */
  const stopPlayback = React.useCallback(() => {
    playTokenRef.current++;
    if (gainRef.current && audioCtxRef.current) {
      try {
        gainRef.current.gain.cancelScheduledValues(audioCtxRef.current.currentTime);
        gainRef.current.gain.setValueAtTime(0, audioCtxRef.current.currentTime);
      } catch {
        /* ignore */
      }
    }
    setPlaying(false);
  }, []);

  /** Play the morse string using the Web Audio API. */
  const playMorse = React.useCallback(
    (morse: string) => {
      if (!morse) {
        toast.error("Nothing to play — encode some text first.");
        return;
      }
      // Stop anything currently playing.
      stopPlayback();

      // PARIS standard: 1 WPM = 50 dot durations per minute.
      // Dot duration (s) = 60 / (50 * WPM) = 1.2 / WPM.
      const dot = 1.2 / Math.max(1, Math.min(60, wpm));
      const dash = 3 * dot;
      const intraGap = dot;       // between elements of one letter
      const letterGap = 3 * dot;  // between letters
      const wordGap = 7 * dot;    // between words

      try {
        if (!audioCtxRef.current) {
          const Ctx =
            window.AudioContext ||
            (window as unknown as { webkitAudioContext: typeof AudioContext })
              .webkitAudioContext;
          audioCtxRef.current = new Ctx();
        }
        const ctx = audioCtxRef.current!;
        if (ctx.state === "suspended") void ctx.resume();

        // Recreate oscillator + gain for a clean envelope.
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = "sine";
        osc.frequency.value = 600;
        gain.gain.value = 0;
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        oscRef.current = osc;
        gainRef.current = gain;

        const token = ++playTokenRef.current;
        setPlaying(true);

        let t = ctx.currentTime + 0.05;
        const schedBeep = (dur: number) => {
          gain.gain.setValueAtTime(0.0001, t);
          gain.gain.exponentialRampToValueAtTime(0.3, t + 0.005);
          gain.gain.setValueAtTime(0.3, t + dur - 0.005);
          gain.gain.exponentialRampToValueAtTime(0.0001, t + dur);
          t += dur;
        };
        const schedSilence = (dur: number) => {
          gain.gain.setValueAtTime(0.0001, t);
          t += dur;
        };

        // Tokenise the morse string.
        const tokens = morse.split(/(\s+|\/)/).filter((s) => s !== "");
        for (const tok of tokens) {
          if (playTokenRef.current !== token) {
            // Playback was cancelled — bail out.
            break;
          }
          if (tok === "/") {
            schedSilence(wordGap - intraGap); // we already added intraGap
            continue;
          }
          if (/^\s+$/.test(tok)) {
            // Whitespace run — treat as letter gap (minus already-added intraGap).
            // A single space = letterGap, but we already added one intraGap.
            // Multiple spaces collapse to one letter gap.
            schedSilence(letterGap - intraGap);
            continue;
          }
          // Element sequence — emit each . or -
          for (const c of tok) {
            if (c === ".") {
              schedBeep(dot);
              schedSilence(intraGap);
            } else if (c === "-") {
              schedBeep(dash);
              schedSilence(intraGap);
            }
          }
        }

        // Schedule oscillator stop after the last event.
        const stopAt = t + 0.1;
        osc.stop(stopAt);
        osc.onended = () => {
          if (playTokenRef.current === token) {
            setPlaying(false);
            oscRef.current = null;
            gainRef.current = null;
          }
        };
      } catch {
        toast.error("Audio playback isn't available in this browser.");
        setPlaying(false);
      }
    },
    [wpm, stopPlayback],
  );

  // Tidy up on unmount.
  React.useEffect(() => {
    return () => {
      playTokenRef.current++;
      if (oscRef.current) {
        try {
          oscRef.current.stop();
        } catch {
          /* ignore */
        }
      }
      if (audioCtxRef.current) {
        try {
          void audioCtxRef.current.close();
        } catch {
          /* ignore */
        }
      }
    };
  }, []);

  // Which morse string should we play? In encode mode, the encoded output.
  // In decode mode, the user's binary input (so they can hear what they typed).
  const playableMorse = mode === "encode" ? encoded : bin.trim();

  const content: ToolContent = {
    intro:
      "Translate text to and from standard ITU Morse code. Covers A–Z, 0–9 and common punctuation. Listen to the result with a 600 Hz sine-wave beep at any speed from 1–60 WPM (PARIS standard), then copy or download the morse. Fully offline, browser-only — perfect for learning, ham-radio practice or decoding puzzle trails.",
    tool: (
      <div className="space-y-5">
        <Tabs value={mode} onValueChange={(v) => setMode(v as "encode" | "decode")}>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <TabsList>
              <TabsTrigger value="encode">
                <Radio className="mr-1.5 h-3.5 w-3.5" /> Text → Morse
              </TabsTrigger>
              <TabsTrigger value="decode">Morse → Text</TabsTrigger>
            </TabsList>
            <div className="flex gap-1.5">
              <Button variant="outline" size="sm" onClick={swap}>
                <ArrowRightLeft className="mr-1.5 h-3.5 w-3.5" /> Swap
              </Button>
              <Button variant="outline" size="sm" onClick={loadSample}>
                <Wand2 className="mr-1.5 h-3.5 w-3.5" /> Sample
              </Button>
              <Button variant="ghost" size="sm" onClick={reset}>
                <RotateCcw className="mr-1.5 h-3.5 w-3.5" /> Reset
              </Button>
            </div>
          </div>

          <TabsContent value="encode" className="mt-4 space-y-3">
            <div className="space-y-2">
              <Label htmlFor="mt-text">Input text</Label>
              <Textarea
                id="mt-text"
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="Type or paste text here…"
                className="min-h-[100px]"
                aria-label="Input text"
              />
              {tooLarge && (
                <p className="text-xs text-destructive" role="status">
                  {INPUT_TOO_LARGE_MSG}
                </p>
              )}
              <p className="text-xs text-muted-foreground">
                {text.length} characters · case-insensitive · unsupported
                characters are skipped
              </p>
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="mt-morse-out">Morse output</Label>
                <div className="flex gap-1.5">
                  <Button
                    variant={playing ? "secondary" : "outline"}
                    size="sm"
                    onClick={() => (playing ? stopPlayback() : playMorse(playableMorse))}
                    disabled={!playableMorse || text.length > MAX_PLAY_CHARS}
                  >
                    {playing ? (
                      <>
                        <Pause className="mr-1.5 h-3.5 w-3.5" /> Stop
                      </>
                    ) : (
                      <>
                        <Play className="mr-1.5 h-3.5 w-3.5" /> Play
                      </>
                    )}
                  </Button>
                  <CopyButton value={encoded} size="sm" />
                  <Button variant="outline" size="sm" onClick={download} disabled={!encoded}>
                    <Download className="mr-1.5 h-3.5 w-3.5" /> Save
                  </Button>
                </div>
              </div>
              <Textarea
                id="mt-morse-out"
                value={encoded}
                readOnly
                placeholder="Your text rendered as ITU Morse code…"
                className="min-h-[100px] font-mono text-sm"
                aria-label="Morse output"
                spellCheck={false}
              />
              <p className="text-xs text-muted-foreground">
                Words separated by <code>/</code> · letters by single space
              </p>
            </div>
          </TabsContent>

          <TabsContent value="decode" className="mt-4 space-y-3">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="mt-morse-in">Input morse</Label>
                <Button
                  variant={playing ? "secondary" : "outline"}
                  size="sm"
                  onClick={() => (playing ? stopPlayback() : playMorse(playableMorse))}
                  disabled={!playableMorse || playableMorse.length > 4000}
                >
                  {playing ? (
                    <>
                      <Pause className="mr-1.5 h-3.5 w-3.5" /> Stop
                    </>
                  ) : (
                    <>
                      <Play className="mr-1.5 h-3.5 w-3.5" /> Play
                    </>
                  )}
                </Button>
              </div>
              <Textarea
                id="mt-morse-in"
                value={bin}
                onChange={(e) => setBin(e.target.value)}
                placeholder="Paste morse here — e.g. ... --- ... / -.. ..- . -. . ---"
                className="min-h-[100px] font-mono text-sm"
                aria-label="Input morse"
                spellCheck={false}
              />
              <p className="text-xs text-muted-foreground">
                Use <code>.</code> and <code>-</code> · separate letters
                with a space · separate words with <code>/</code>
              </p>
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="mt-text-out">Decoded text</Label>
                <div className="flex gap-1.5">
                  <CopyButton
                    value={decodeResult.text}
                    size="sm"
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={download}
                    disabled={!decodeResult.text}
                  >
                    <Download className="mr-1.5 h-3.5 w-3.5" /> Save
                  </Button>
                </div>
              </div>
              <Textarea
                id="mt-text-out"
                value={decodeResult.text}
                readOnly
                placeholder="Your decoded text will appear here…"
                className="min-h-[100px]"
                aria-label="Decoded text"
              />
              {decodeResult.unknown > 0 && (
                <p className="text-xs text-amber-600 dark:text-amber-500" role="status">
                  {decodeResult.unknown} unknown sequence
                  {decodeResult.unknown === 1 ? "" : "s"} (shown as ?)
                </p>
              )}
            </div>
          </TabsContent>
        </Tabs>

        <div className="rounded-xl border bg-muted/30 p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <Label htmlFor="mt-wpm" className="text-sm font-medium">
                Playback speed
              </Label>
              <p className="mt-0.5 text-xs text-muted-foreground">
                {wpm} WPM (PARIS standard) · dot = {(1.2 / wpm).toFixed(3)}s
              </p>
            </div>
            <span className="rounded-md bg-background px-2 py-1 font-mono text-xs">
              {wpm} WPM
            </span>
          </div>
          <Slider
            id="mt-wpm"
            className="mt-3"
            min={5}
            max={40}
            step={1}
            value={[wpm]}
            onValueChange={(v) => setWpm(v[0] ?? 15)}
            aria-label="Playback speed in words per minute"
          />
          <div className="mt-2 flex justify-between text-[11px] text-muted-foreground">
            <span>5 WPM (slow)</span>
            <span>20 WPM (ham-radio exam)</span>
            <span>40 WPM (expert)</span>
          </div>
        </div>
      </div>
    ),
    howTo: [
      {
        title: "Pick a direction",
        description:
          "Use the Text → Morse or Morse → Text tab. Swap moves your output into the other mode's input.",
      },
      {
        title: "Type or paste",
        description:
          "For encoding, type any text — case-insensitive, unsupported characters are skipped. For decoding, paste morse with dots, dashes, spaces and slashes.",
      },
      {
        title: "Play the audio",
        description:
          "Click Play to hear the morse at the chosen speed. A 600 Hz sine wave beeps for each dot and dash with proper PARIS-standard timing.",
      },
      {
        title: "Copy or download",
        description:
          "Use Copy for the clipboard or Save to download a .txt file with the result.",
      },
    ],
    useCases: [
      "Practise receiving or sending morse for amateur-radio exams.",
      "Decode morse-code puzzles in escape rooms or geocaching trails.",
      "Add a nostalgic touch to messages, bios or art projects.",
      "Teach kids (or yourself) the ITU Morse code alphabet with audio.",
    ],
    limitations: (
      <ul className="list-disc space-y-1 pl-5">
        <li>
          The morse table is the standard ITU/RFC 1319 set — A–Z, 0–9 and
          common punctuation. Prosigns (SK, AR, BT), accented letters and
          national variants aren't included.
        </li>
        <li>
          Audio uses a single 600 Hz sine wave (the traditional practice
          frequency). Real radios use a wider audio spectrum; this is a
          training aid, not a transmitter.
        </li>
        <li>
          Very long inputs (&gt;500 characters for encoding, &gt;4000 for
          decoding) disable the Play button to avoid scheduling thousands
          of audio events.
        </li>
        <li>
          The first Play click may need a user gesture to unlock the
          browser's AudioContext — click Play once if you don't hear
          anything.
        </li>
      </ul>
    ),
    faq: [
      {
        q: "How is the speed (WPM) calculated?",
        a: "Using the PARIS standard: the word PARIS is exactly 50 dot durations long, so 1 WPM = 50 dots per minute. A dot is 1.2 / WPM seconds; a dash is three dots; gaps are 1, 3 or 7 dots.",
      },
      {
        q: "Why don't I hear anything on the first click?",
        a: "Browsers require a user gesture before an AudioContext can produce sound. The first click unlocks it — click Play again if nothing comes through.",
      },
      {
        q: "Can I decode morse that uses different separators?",
        a: "Yes — the decoder is tolerant. Letters can be separated by one or more spaces; words by a slash with optional surrounding spaces. Anything that isn't a dot, dash, space or slash is ignored.",
      },
      {
        q: "Is my text uploaded anywhere?",
        a: "No. Translation and audio synthesis run entirely in your browser. Nothing is sent to a server.",
      },
    ],
  };

  return <ToolLayout tool={tool} content={content} />;
}
