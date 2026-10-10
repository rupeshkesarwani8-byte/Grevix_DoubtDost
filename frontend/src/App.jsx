import { useState, useEffect, useRef } from "react";
import "./App.css";

const API = import.meta.env.VITE_API_URL || "http://127.0.0.1:8000";
const HISTORY_KEY = "doubtdost_history";

const normalize = (d) => (d && d.questions ? d : { questions: d ? [d] : [] });

function loadHistory() {
  try {
    return (JSON.parse(localStorage.getItem(HISTORY_KEY)) || []).map((h) => ({
      ...h,
      data: normalize(h.data),
    }));
  } catch {
    return [];
  }
}

export default function App() {
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [mode, setMode] = useState("full");
  const [lang, setLang] = useState("hinglish");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [active, setActive] = useState(0);
  const [error, setError] = useState("");
  const [history, setHistory] = useState(loadHistory);
  const [drag, setDrag] = useState(false);
  const [copied, setCopied] = useState(false);
  const inputRef = useRef(null);

  const pickFile = (f) => {
    if (!f || !f.type.startsWith("image/")) {
      setError("Sirf image file chunein");
      return;
    }
    setFile(f);
    setPreview(URL.createObjectURL(f));
    setResult(null);
    setActive(0);
    setError("");
  };

  useEffect(() => {
    const onPaste = (e) => {
      const item = [...(e.clipboardData?.items || [])].find((i) =>
        i.type.startsWith("image/")
      );
      if (item) pickFile(item.getAsFile());
    };
    window.addEventListener("paste", onPaste);
    return () => window.removeEventListener("paste", onPaste);
  }, []);

  const saveHistory = (data) => {
    const entry = { id: Date.now(), data };
    const next = [entry, ...history].slice(0, 5);
    setHistory(next);
    try {
      localStorage.setItem(HISTORY_KEY, JSON.stringify(next));
    } catch {
      /* ignore */
    }
  };

  const clearHistory = () => {
    setHistory([]);
    try {
      localStorage.removeItem(HISTORY_KEY);
    } catch {
      /* ignore */
    }
  };

  const onSolve = async () => {
    if (!file) return;
    setLoading(true);
    setError("");
    setResult(null);
    setActive(0);
    try {
      const form = new FormData();
      form.append("image", file);
      form.append("mode", mode);
      form.append("lang", lang);
      const res = await fetch(`${API}/solve`, { method: "POST", body: form });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail || "Kuch gadbad ho gayi");
      }
      const data = normalize(await res.json());
      setResult(data);
      saveHistory(data);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const questions = result?.questions || [];
  const q = questions[active];

  const onCopy = async () => {
    if (!q) return;
    const text = [
      q.question_text,
      ...(q.steps || []).map((s, i) => `${i + 1}. ${s}`),
      `Answer: ${q.final_answer}`,
    ].join("\n");
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      setError("Copy nahi ho paya");
    }
  };

  return (
    <div className="app">
      <div className="hero">
        <span className="badge">AI Doubt Solver</span>
        <h1>DoubtDost</h1>
        <p className="sub">Question ya poore paper ki photo daalo, step-by-step samjhaata hu.</p>
      </div>

      <div className="glass">
        <div
          className={`dropzone ${drag ? "drag" : ""}`}
          onClick={() => inputRef.current?.click()}
          onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
          onDragLeave={() => setDrag(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDrag(false);
            pickFile(e.dataTransfer.files[0]);
          }}
        >
          <b>Photo yahan drop karein</b>, ya click karein, ya <b>Ctrl + V</b> se paste karein
          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            hidden
            onChange={(e) => pickFile(e.target.files[0])}
          />
        </div>

        {preview && <img className="preview" src={preview} alt="question" />}

        <div className="row">
          <div>
            <span className="label">Mode</span>
            <div className="seg">
              <button className={mode === "full" ? "on" : ""} onClick={() => setMode("full")}>
                Poora solution
              </button>
              <button className={mode === "hint" ? "on" : ""} onClick={() => setMode("hint")}>
                Sirf hint
              </button>
            </div>
          </div>
          <div>
            <span className="label">Bhasha</span>
            <div className="seg">
              <button className={lang === "hinglish" ? "on" : ""} onClick={() => setLang("hinglish")}>Hinglish</button>
              <button className={lang === "english" ? "on" : ""} onClick={() => setLang("english")}>English</button>
              <button className={lang === "hindi" ? "on" : ""} onClick={() => setLang("hindi")}>हिन्दी</button>
            </div>
          </div>
        </div>

        <button className="btn" onClick={onSolve} disabled={!file || loading}>
          {loading && <span className="spinner" />}
          {loading ? "Saare questions padh raha hu..." : "Samjhao"}
        </button>
        {error && <div className="error">{error}</div>}
      </div>

      {q && (
        <div className="glass">
          {questions.length > 1 && (
            <>
              <span className="label">{questions.length} questions mile</span>
              <div className="qtabs">
                {questions.map((item, i) => (
                  <button
                    key={i}
                    className={`qtab ${i === active ? "on" : ""}`}
                    onClick={() => setActive(i)}
                  >
                    Q{item.number || i + 1}
                  </button>
                ))}
              </div>
            </>
          )}

          <div className="result-head">
            <span className="chip">{q.subject}</span>
            <button className="copy" onClick={onCopy}>{copied ? "Copy ho gaya" : "Copy"}</button>
          </div>
          <p className="qtext">{q.question_text}</p>

          <h3>Steps</h3>
          {q.steps?.map((s, i) => (
            <div className="step" key={i}>
              <div className="num">{i + 1}</div>
              <p>{s}</p>
            </div>
          ))}

          <div className="answer"><b>Answer:</b> {q.final_answer}</div>
          <div className="tip"><b>Dhyan rakho:</b> {q.mistake_hint}</div>

          <h3>Practice karo</h3>
          {q.practice_questions?.map((p, i) => (
            <div className="practice" key={i}>{p}</div>
          ))}
        </div>
      )}

      {history.length > 0 && (
        <div className="glass">
          <div className="hist-head">
            <h3 style={{ margin: 0 }}>Purane doubts</h3>
            <button className="link" onClick={clearHistory}>Clear</button>
          </div>
          {history.map((h) => (
            <button
              className="hist"
              key={h.id}
              onClick={() => { setResult(h.data); setActive(0); }}
            >
              {h.data.questions[0]?.question_text}
              <small>
                {h.data.questions[0]?.subject}
                {h.data.questions.length > 1 ? ` • ${h.data.questions.length} questions` : ""}
              </small>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}