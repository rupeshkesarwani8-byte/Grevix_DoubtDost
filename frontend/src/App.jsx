import { useState, useEffect, useRef } from "react";
import "./App.css";

const API = import.meta.env.VITE_API_URL || "http://127.0.0.1:8000";
const HISTORY_KEY = "doubtdost_history_v2";

function loadHistory() {
  try {
    return JSON.parse(localStorage.getItem(HISTORY_KEY)) || [];
  } catch {
    return [];
  }
}

function confBadge(c) {
  if (c >= 0.85) return ["high", "Pakka padha"];
  if (c >= 0.6) return ["mid", "Check karein"];
  return ["low", "Shayad galat"];
}

async function apiError(res) {
  const err = await res.json().catch(() => ({}));
  return err.detail || "Kuch gadbad ho gayi";
}

export default function App() {
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [mode, setMode] = useState("full");
  const [lang, setLang] = useState("hinglish");
  const [segmenting, setSegmenting] = useState(false);
  const [solvingAll, setSolvingAll] = useState(false);
  const [questions, setQuestions] = useState([]);
  const [warnings, setWarnings] = useState([]);
  const [sessionId, setSessionId] = useState(null);
  const [error, setError] = useState("");
  const [history, setHistory] = useState(loadHistory);
  const [drag, setDrag] = useState(false);
  const inputRef = useRef(null);

  const pickFile = (f) => {
    if (!f || !f.type.startsWith("image/")) {
      setError("Sirf image file chunein");
      return;
    }
    setFile(f);
    setPreview(URL.createObjectURL(f));
    setQuestions([]);
    setWarnings([]);
    setSessionId(null);
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

  // jab bhi koi solution aaye, session history me save/update ho
  useEffect(() => {
    if (!sessionId || !questions.some((q) => q.solution)) return;
    const entry = {
      id: sessionId,
      questions: questions.map(({ id, number, text, solution }) => ({
        id,
        number,
        text,
        solution,
      })),
    };
    setHistory((prev) => {
      const next = [entry, ...prev.filter((h) => h.id !== sessionId)].slice(0, 5);
      try {
        localStorage.setItem(HISTORY_KEY, JSON.stringify(next));
      } catch {
        /* ignore */
      }
      return next;
    });
  }, [questions, sessionId]);

  const clearHistory = () => {
    setHistory([]);
    try {
      localStorage.removeItem(HISTORY_KEY);
    } catch {
      /* ignore */
    }
  };

  const updateQ = (id, patch) =>
    setQuestions((qs) => qs.map((q) => (q.id === id ? { ...q, ...patch } : q)));

  const removeQ = (id) => setQuestions((qs) => qs.filter((q) => q.id !== id));

  const addQuestion = () => {
    if (!sessionId) setSessionId(Date.now());
    setQuestions((qs) => [
      ...qs,
      {
        id: `m${Date.now()}`,
        number: String(qs.length + 1),
        text: "",
        confidence: 1,
        issues: [],
        has_diagram: false,
        needs_confirmation: false,
        confirmed: true,
        manual: true,
        solution: null,
        solving: false,
        error: "",
      },
    ]);
  };

  const onSegment = async () => {
    if (!file) return;
    setSegmenting(true);
    setError("");
    setQuestions([]);
    setWarnings([]);
    try {
      const form = new FormData();
      form.append("image", file);
      const res = await fetch(`${API}/segment`, { method: "POST", body: form });
      if (!res.ok) throw new Error(await apiError(res));
      const data = await res.json();
      setSessionId(Date.now());
      setWarnings(data.warnings || []);
      setQuestions(
        (data.questions || []).map((q) => ({
          ...q,
          confirmed: !q.needs_confirmation,
          solution: null,
          solving: false,
          error: "",
        }))
      );
      if (!data.questions?.length) {
        setError("Koi question nahi mila. Saaf photo try karein, ya neeche 'Question jodein' se khud likhein.");
      }
    } catch (e) {
      setError(e.message);
    } finally {
      setSegmenting(false);
    }
  };

  const solveOne = async (q) => {
    updateQ(q.id, { solving: true, error: "" });
    try {
      const form = new FormData();
      form.append("question_text", q.text);
      form.append("number", q.number || "");
      form.append("mode", mode);
      form.append("lang", lang);
      if (q.has_diagram && file) form.append("image", file);
      const res = await fetch(`${API}/solve-question`, { method: "POST", body: form });
      if (!res.ok) throw new Error(await apiError(res));
      updateQ(q.id, { solution: await res.json(), solving: false });
    } catch (e) {
      updateQ(q.id, { solving: false, error: e.message });
    }
  };

  const solveAll = async () => {
    setSolvingAll(true);
    for (const q of questions) {
      if (q.solution || !q.confirmed || !q.text.trim()) continue;
      await solveOne(q);
    }
    setSolvingAll(false);
  };

  const openHistory = (h) => {
    setSessionId(h.id);
    setWarnings([]);
    setError("");
    setQuestions(
      h.questions.map((q) => ({
        ...q,
        confidence: 1,
        issues: [],
        has_diagram: false,
        needs_confirmation: false,
        confirmed: true,
        solving: false,
        error: "",
      }))
    );
  };

  const pending = questions.filter((q) => !q.confirmed).length;
  const toSolve = questions.filter((q) => q.confirmed && !q.solution && q.text.trim()).length;

  return (
    <div className="app">
      <div className="hero">
        <span className="badge">AI Doubt Solver</span>
        <h1>DoubtDost</h1>
        <p className="sub">Pehle har question alag nikalta hu, aapke confirm karne par hi solve karta hu.</p>
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
              <button className={mode === "full" ? "on" : ""} onClick={() => setMode("full")}>Poora solution</button>
              <button className={mode === "hint" ? "on" : ""} onClick={() => setMode("hint")}>Sirf hint</button>
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

        <button className="btn" onClick={onSegment} disabled={!file || segmenting}>
          {segmenting && <span className="spinner" />}
          {segmenting ? "Questions padh raha hu..." : "Questions padho"}
        </button>
        {error && <div className="error">{error}</div>}
      </div>

      {sessionId && (
        <div className="glass">
          <div className="hist-head">
            <h3 style={{ margin: 0 }}>{questions.length} questions</h3>
            <button className="link" onClick={addQuestion}>+ Question jodein</button>
          </div>

          {warnings.map((w, i) => (
            <div className="warn" key={i}>{w}</div>
          ))}

          {pending > 0 && (
            <div className="warn">{pending} question confirm hone baaki hain. Confirm kiye bina wo solve nahi honge.</div>
          )}

          {questions.map((q) => {
            const [cls, label] = confBadge(q.issues?.length ? Math.min(q.confidence, 0.84) : q.confidence);
            const flagged = q.needs_confirmation;
            const sol = q.solution;
            return (
              <div className={`qcard ${flagged && !q.confirmed ? "flag" : ""}`} key={q.id}>
                <div className="qhead">
                  <span className="qno">Q{q.number}</span>
                  {q.manual ? (
                    <span className="conf high">Aapne jodha</span>
                  ) : (
                    <span className={`conf ${cls}`}>{label} ({Math.round(q.confidence * 100)}%)</span>
                  )}
                  {q.has_diagram && <span className="conf mid">Diagram wala</span>}
                  {flagged && q.confirmed && <span className="conf high">Confirm kiya</span>}
                  <button className="link" onClick={() => removeQ(q.id)}>Hatao</button>
                </div>

                {q.issues?.length > 0 && (
                  <ul className="issues">
                    {q.issues.map((x, i) => <li key={i}>{x}</li>)}
                  </ul>
                )}

                <textarea
                  className="qedit"
                  rows={3}
                  value={q.text}
                  placeholder="Question yahan likhein"
                  onChange={(e) =>
                    updateQ(q.id, { text: e.target.value, confirmed: true, solution: null })
                  }
                />

                <div className="actions">
                  {!q.confirmed && (
                    <button className="btn btn-sm" onClick={() => updateQ(q.id, { confirmed: true })}>
                      Haan, yehi question hai
                    </button>
                  )}
                  {q.confirmed && (
                    <button
                      className="btn btn-sm"
                      disabled={q.solving || solvingAll || !q.text.trim()}
                      onClick={() => solveOne(q)}
                    >
                      {q.solving ? (
                        <><span className="spinner" />Soch raha hu...</>
                      ) : sol ? "Dobara solve karo" : mode === "hint" ? "Hint do" : "Solve karo"}
                    </button>
                  )}
                </div>

                {q.error && <div className="error">{q.error}</div>}

                {sol && sol.status === "needs_clarification" && (
                  <div className="clarify">
                    <b>Main yeh solve nahi kar sakta:</b> {sol.missing || "Question me jaankari kam hai."}
                    <br />Upar question edit karke dobara try karein.
                  </div>
                )}

                {sol && sol.status !== "needs_clarification" && (
                  <div>
                    {sol.subject && <span className="chip">{sol.subject}</span>}
                    <h3>Steps</h3>
                    {sol.steps?.map((s, i) => (
                      <div className="step" key={i}>
                        <div className="num">{i + 1}</div>
                        <p>{s}</p>
                      </div>
                    ))}
                    {sol.final_answer && <div className="answer"><b>Answer:</b> {sol.final_answer}</div>}
                    {sol.verification && <div className="verify"><b>Jaanch:</b> {sol.verification}</div>}
                    {sol.mistake_hint && <div className="tip"><b>Dhyan rakho:</b> {sol.mistake_hint}</div>}
                    {sol.practice_questions?.length > 0 && (
                      <>
                        <h3>Practice karo</h3>
                        {sol.practice_questions.map((p, i) => (
                          <div className="practice" key={i}>{p}</div>
                        ))}
                      </>
                    )}
                  </div>
                )}
              </div>
            );
          })}

          {questions.length > 0 && (
            <button className="btn" onClick={solveAll} disabled={solvingAll || toSolve === 0}>
              {solvingAll && <span className="spinner" />}
              {solvingAll ? "Solve ho raha hai..." : `Saare confirmed questions solve karo (${toSolve})`}
            </button>
          )}
        </div>
      )}

      {history.length > 0 && (
        <div className="glass">
          <div className="hist-head">
            <h3 style={{ margin: 0 }}>Purane doubts</h3>
            <button className="link" onClick={clearHistory}>Clear</button>
          </div>
          {history.map((h) => (
            <button className="hist" key={h.id} onClick={() => openHistory(h)}>
              {h.questions[0]?.text}
              <small>{h.questions.length} question{h.questions.length > 1 ? "s" : ""}</small>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}