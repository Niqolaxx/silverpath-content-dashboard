"use client";

import { useState, useEffect } from "react";
import { 
  Sparkles, 
  Terminal, 
  Search, 
  FileText, 
  PenTool, 
  ShieldCheck, 
  Share2, 
  Layout,
  CheckCircle2,
  Loader2,
  ChevronRight,
  LogOut
} from "lucide-react";
import ReactMarkdown from "react-markdown";
import { useSession, signOut } from "next-auth/react";
import { useRouter } from "next/navigation";

export default function Dashboard() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [isGenerating, setIsGenerating] = useState(false);
  const [topic, setTopic] = useState("");
  const [sourceType, setSourceType] = useState<"manual" | "youtube">("manual");
  const [youtubeUrl, setYoutubeUrl] = useState("");
  const [category, setCategory] = useState("Guide");
  const [scenario, setScenario] = useState("");
  const [logs, setLogs] = useState<{agent: string, msg: string, time: string}[]>([]);
  const [results, setResults] = useState<{[key: number]: string}>({});
  const [activeTab, setActiveTab] = useState<number>(0);
  const [history, setHistory] = useState<{id: string, topic: string, category?: string, scenario?: string, date: string, results: any}[]>([]);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);

  const workflowSteps = [
    { title: "Research", agent: "Gemini 3.1", icon: <Search className="w-4 h-4" />, status: "Analyzing UK market data..." },
    { title: "Brief", agent: "Claude 4.6", icon: <FileText className="w-4 h-4" />, status: "Structuring content angle..." },
    { title: "Draft", agent: "Claude 4.6", icon: <PenTool className="w-4 h-4" />, status: "Drafting 1,500 words..." },
    { title: "Polish", agent: "Gemini 3.1", icon: <Sparkles className="w-4 h-4" />, status: "Enhancing UK stats..." },
    { title: "SEO", agent: "Gemini 3.1", icon: <ShieldCheck className="w-4 h-4" />, status: "Generating metadata..." },
    { title: "Social", agent: "Claude 4.6", icon: <Share2 className="w-4 h-4" />, status: "Formatting platform posts..." },
    { title: "Carousel", agent: "Claude 4.6", icon: <Layout className="w-4 h-4" />, status: "Designing slide copy..." },
  ];

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
    }
  }, [status, router]);

  useEffect(() => {
    const fetchHistory = async () => {
      if (status !== "authenticated") return;
      try {
        const res = await fetch("/api/projects");
        if (!res.ok) throw new Error("Failed to load projects");
        const { projects } = await res.json();
        const mapped = projects.map((p: any) => ({
          id: p.id,
          topic: p.topic,
          category: p.category,
          scenario: p.scenario,
          date: new Date(p.created_at).toLocaleDateString(),
          results: p.results,
        }));
        setHistory(mapped);
      } catch (err) {
        console.error("History fetch error:", err);
      }
    };
    fetchHistory();
  }, [status]);

  // Show loading while checking auth
  if (status === "loading") {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'radial-gradient(circle at 50% 50%, #1a1a2e 0%, #0a0a0f 100%)' }}>
        <div style={{ textAlign: 'center' }}>
          <Loader2 size={32} style={{ animation: 'spin 1s linear infinite', color: 'var(--accent-primary)' }} />
          <p style={{ marginTop: '16px', color: '#94a3b8', fontSize: '14px' }}>Loading dashboard...</p>
        </div>
      </div>
    );
  }

  if (status === "unauthenticated") return null;

  const startGeneration = async () => {
    if (sourceType === "manual" && (!topic || !scenario)) return;
    if (sourceType === "youtube" && (!youtubeUrl || !scenario)) return;

    setIsGenerating(true);
    setStep(1);
    setLogs([{ agent: "System", msg: "Workflow initialised", time: "00:01" }]);
    
    let currentOutput = "";
    let transcript = "";
    const newResults: {[key: number]: string} = {};

    try {
      // 1. Fetch transcript if in YouTube mode
      let finalTopic = topic;
      if (sourceType === "youtube") {
        setLogs(prev => [{ agent: "System", msg: "Fetching YouTube Transcript...", time: "00:05" }, ...prev]);
        const tRes = await fetch("/api/transcript", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ url: youtubeUrl })
        });
        const tData = await tRes.json();
        if (tData.error) throw new Error(tData.error);
        transcript = tData.transcript;
        finalTopic = tData.title || "YouTube Repurpose";
        setTopic(finalTopic); // Update state so it shows up
        setLogs(prev => [{ agent: "System", msg: `Transcript loaded: ${finalTopic}`, time: "00:10" }, ...prev]);
      }

      for (let i = 1; i <= workflowSteps.length; i++) {
        setStep(i);
        setActiveTab(i);
        const res = await fetch("/api/generate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ 
            step: i, 
            topic: finalTopic, 
            category,
            scenario, 
            previousOutput: currentOutput,
            transcript: transcript // New field
          })
        });

        const data = await res.json();
        if (data.error) throw new Error(data.error);

        currentOutput = data.output;
        newResults[i] = currentOutput;
        setResults({...newResults});
        
        setLogs(prev => [
          { agent: data.agent, msg: workflowSteps[i-1].status, time: "00:" + ((i + 1) * 5).toString().padStart(2, '0') },
          ...prev
        ]);
      }
      setIsGenerating(false);
      setStep(workflowSteps.length + 1);
      
      const saveRes = await fetch("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          topic: sourceType === "youtube" ? (finalTopic || topic) : topic,
          category,
          scenario,
          results: newResults,
        }),
      });

      if (!saveRes.ok) {
        const saveErr = await saveRes.json().catch(() => ({ error: "non-JSON response" }));
        console.error("Save Error:", saveRes.status, saveErr);
        throw new Error(`Save failed (HTTP ${saveRes.status}): ${saveErr.error}`);
      }

      const { project: savedProject } = await saveRes.json();
      const newEntry = {
        id: savedProject.id,
        topic: sourceType === "youtube" ? (finalTopic || topic) : topic,
        category,
        scenario,
        date: new Date().toLocaleDateString(),
        results: newResults,
      };
      setHistory([newEntry, ...history]);
      
      setLogs(prev => [{ agent: "System", msg: "Content Pack Finished", time: "DONE" }, ...prev]);
    } catch (err: any) {
      console.error(err);
      setLogs(prev => [{ agent: "ERROR", msg: err.message, time: "FAIL" }, ...prev]);
      setIsGenerating(false);
    }
  };

  const downloadPack = () => {
    const fullText = Object.entries(results)
      .sort(([a], [b]) => Number(a) - Number(b))
      .map(([stepNum, content]) => {
        const stepName = workflowSteps[Number(stepNum) - 1].title;
        return `## STEP ${stepNum}: ${stepName}\n\n${content}`;
      })
      .join("\n\n---\n\n");

    const blob = new Blob([fullText], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `silverpath-pack-${topic.toLowerCase().replace(/\s+/g, '-')}.md`;
    a.click();
  };

  const copyToClipboard = () => {
    const textToCopy = results[activeTab] || "";
    // Basic markdown to clean text fallback if they want it messy-free
    const cleanText = textToCopy
      .replace(/[#*`]/g, '')
      .replace(/\[([^\]]+)\]\([^\)]+\)/g, '$1');
    
    navigator.clipboard.writeText(textToCopy); // Still keep raw markdown but I'll add a choice later
    setLogs(prev => [{ agent: "System", msg: "Copied Markdown to clipboard", time: "NOW" }, ...prev]);
  };

  const loadFromHistory = (entry: any) => {
    setTopic(entry.topic);
    setCategory(entry.category || "Guide");
    setScenario(entry.scenario || "");
    setResults(entry.results);
    setStep(workflowSteps.length + 1);
    setActiveTab(1);
    setLogs([{ agent: "System", msg: `Loaded project: ${entry.topic}`, time: "LOAD" }]);
  };

  const exportPDF = () => {
    window.print();
  };


  return (
    <div className="dashboard-container">
      {/* Sidebar - Agent Timeline */}
      <aside className="sidebar">
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '40px' }}>
          <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: 'var(--accent-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Sparkles style={{ color: 'white', width: '20px', height: '20px' }} />
          </div>
          <h1 style={{ fontSize: '20px', fontWeight: '700' }}>Silverpath.ai <span style={{ fontSize: '10px', opacity: 0.4, fontWeight: '400' }}>v2</span></h1>
        </div>

        <div style={{ marginBottom: '40px' }}>
          <h2 style={{ fontSize: '11px', fontWeight: '800', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.25em', marginBottom: '20px', paddingLeft: '4px' }}>Recent Projects</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '32px' }}>
            {history.length === 0 ? (
              <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.2)', paddingLeft: '4px' }}>No history yet</p>
            ) : (
              history.slice(0, 5).map((entry) => (
                <button 
                  key={entry.id}
                  onClick={() => loadFromHistory(entry)}
                  className="history-item"
                  style={{ 
                    background: 'none', 
                    border: 'none', 
                    padding: '8px', 
                    borderRadius: '8px',
                    textAlign: 'left',
                    cursor: 'pointer',
                    width: '100%',
                    transition: 'all 0.2s ease',
                    color: 'var(--text-secondary)'
                  }}
                >
                  <div style={{ fontSize: '13px', fontWeight: '600', marginBottom: '2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{entry.topic || '(Untitled Project)'}</div>
                  <div style={{ fontSize: '10px', opacity: 0.5 }}>{entry.date}</div>
                </button>
              ))
            )}
            {history.length > 5 && (
              <button
                onClick={() => setIsHistoryOpen(true)}
                style={{
                  background: 'rgba(255,255,255,0.05)',
                  border: '1px solid rgba(255,255,255,0.08)',
                  padding: '10px',
                  borderRadius: '8px',
                  width: '100%',
                  cursor: 'pointer',
                  fontSize: '12px',
                  color: 'var(--accent-primary)',
                  fontWeight: '600',
                  transition: 'all 0.2s ease',
                  marginTop: '4px'
                }}
              >View All Projects ({history.length})</button>
            )}
          </div>

          <h2 style={{ fontSize: '11px', fontWeight: '800', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.25em', marginBottom: '32px', paddingLeft: '4px' }}>Agent Activity Logs</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {logs.length === 0 && (
              <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.2)', paddingLeft: '4px', fontStyle: 'italic' }}>No activity yet...</p>
            )}
            {logs.map((log, i) => (
              <div key={i} className="log-entry">
                <span className="log-time">{log.time}</span>
                <div className="log-content">
                  <span className={`log-agent`} style={{ color: log.agent.includes('Gemini') ? '#3b82f6' : log.agent.includes('Claude') ? '#f97316' : 'var(--text-secondary)' }}>
                    {log.agent}
                  </span>
                  <p className="log-msg">{log.msg}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div style={{ marginTop: 'auto', paddingTop: '32px', borderTop: '1px solid var(--border-color)' }}>
          <button 
            onClick={() => setIsSettingsOpen(true)}
            style={{ 
              width: '100%', 
              background: 'rgba(255,255,255,0.03)', 
              border: '1px solid var(--border-color)', 
              borderRadius: '12px', 
              padding: '12px', 
              color: 'white', 
              fontSize: '13px', 
              fontWeight: '600', 
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              transition: 'all 0.2s ease'
            }}
            onMouseOver={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.08)'}
            onMouseOut={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.03)'}
          >
            <div style={{ width: '28px', height: '28px', borderRadius: '6px', background: 'rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Terminal size={14} style={{ opacity: 0.6 }} />
            </div>
            Settings & Account
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="main-content">
        <header className="dashboard-header">
          <div>
            <h2 style={{ fontSize: '32px', fontWeight: '700' }}>Content Dashboard</h2>
            <p style={{ color: 'var(--text-secondary)', marginTop: '4px' }}>Welcome, {session?.user?.email}</p>
          </div>
        </header>

        <section className="dashboard-grid">
          {/* Left Column */}
          <div className="no-print" style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
            <div className="glass-card">
              <h3 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '12px' }}>
                <PenTool style={{ width: '18px', height: '18px', color: 'var(--accent-primary)' }} />
                New Pack Details
              </h3>
              
              <div style={{ display: 'flex', gap: '8px', marginBottom: '24px', background: 'rgba(255,255,255,0.03)', padding: '4px', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.05)' }}>
              <button 
                onClick={() => setSourceType("manual")}
                style={{ 
                  flex: 1, 
                  padding: '8px', 
                  borderRadius: '6px', 
                  fontSize: '12px', 
                  fontWeight: '600',
                  background: sourceType === "manual" ? 'var(--accent-primary)' : 'transparent',
                  color: sourceType === "manual" ? 'white' : 'var(--text-secondary)',
                  border: 'none',
                  cursor: 'pointer',
                  transition: 'all 0.2s'
                }}
              >Manual Topic</button>
              <button 
                onClick={() => setSourceType("youtube")}
                style={{ 
                  flex: 1, 
                  padding: '8px', 
                  borderRadius: '6px', 
                  fontSize: '12px', 
                  fontWeight: '600',
                  background: sourceType === "youtube" ? 'var(--accent-primary)' : 'transparent',
                  color: sourceType === "youtube" ? 'white' : 'var(--text-secondary)',
                  border: 'none',
                  cursor: 'pointer',
                  transition: 'all 0.2s'
                }}
              >YouTube URL</button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1.2fr', gap: '24px', marginBottom: '24px' }}>
              <div className="input-group">
                <label style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--text-secondary)', marginBottom: '8px', display: 'block' }}>
                  {sourceType === "manual" ? "ARTICLE TOPIC" : "YOUTUBE VIDEO URL"}
                </label>
                <input 
                  type="text" 
                  value={sourceType === "manual" ? topic : youtubeUrl} 
                  onChange={(e) => sourceType === "manual" ? setTopic(e.target.value) : setYoutubeUrl(e.target.value)}
                  placeholder={sourceType === "manual" ? "e.g. AI Automation for Lawyers" : "https://youtube.com/watch?v=..."}
                  style={{ width: '100%', background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border-color)', borderRadius: '12px', padding: '12px 16px', color: 'white' }}
                />
              </div>
                <div className="input-group">
                  <label className="input-label">CONTENT CATEGORY</label>
                  <select 
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    style={{ width: '100%', background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border-color)', borderRadius: '12px', padding: '12px 16px', color: 'white', cursor: 'pointer', outline: 'none' }}
                  >
                    <option value="Guide">How-to Guide</option>
                    <option value="Case Study">Case Study</option>
                    <option value="Thought Leadership">Thought Leadership</option>
                    <option value="Technical Breakdown">Tech Build Breakdown</option>
                    <option value="News">Industry News</option>
                  </select>
                </div>
              </div>
              
              <div className="input-group">
                <label className="input-label">SME Scenario</label>
                <textarea 
                  value={scenario}
                  onChange={(e) => setScenario(e.target.value)}
                  placeholder="e.g. 12-person firm, Central Scotland"
                  rows={4}
                  className="text-area"
                />
              </div>

              <button 
                onClick={startGeneration}
                disabled={isGenerating || (sourceType === "manual" ? !topic : !youtubeUrl)}
                className="btn-primary"
                style={{ width: '100%', padding: '16px', marginTop: '12px' }}
              >
                {isGenerating ? "Generating..." : "Generate Content Pack"}
              </button>
            </div>

            <div className="glass-card">
              <h3 style={{ fontSize: '14px', fontWeight: '600', marginBottom: '20px' }}>Workflow Progress</h3>
              {workflowSteps.map((s, i) => {
                const isActive = step === i + 1;
                const isCompleted = step > i + 1;
                return (
                  <div key={i} className={`workflow-item ${isActive ? 'active' : isCompleted ? 'completed' : ''}`}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <div style={{ width: '32px', height: '32px', border: '1px solid var(--border-color)', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: isCompleted ? '#22c55e' : 'inherit' }}>
                        {isCompleted ? <CheckCircle2 size={16} /> : s.icon}
                      </div>
                      <span style={{ fontSize: '13px', fontWeight: '500' }}>{s.title}</span>
                    </div>
                    <span style={{ fontSize: '10px', textTransform: 'uppercase', opacity: 0.6 }}>{s.agent}</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Right Column */}
          <div className="glass-card print-content" style={{ minHeight: '600px', display: 'flex', flexDirection: 'column', padding: '0' }}>
            <div className="no-print" style={{ padding: '20px 32px', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ fontSize: '10px', fontWeight: '700', letterSpacing: '0.2em', color: 'var(--text-secondary)' }}>CONTENT PREVIEW</div>
              <div style={{ display: 'flex', gap: '16px' }}>
                <button onClick={copyToClipboard} style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', fontSize: '12px', cursor: 'pointer' }}>Copy</button>
                <button onClick={downloadPack} style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', fontSize: '12px', cursor: 'pointer' }}>Download Pack</button>
                <button onClick={exportPDF} style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', fontSize: '12px', cursor: 'pointer' }}>Export PDF</button>
              </div>
            </div>

            <div style={{ padding: '48px', flex: 1, overflowY: 'auto' }}>
              {Object.keys(results).length > 0 && (
                <div className="no-print" style={{ display: 'flex', gap: '8px', marginBottom: '32px', overflowX: 'auto', paddingBottom: '8px' }}>
                  {workflowSteps.map((s, i) => (
                    <button 
                      key={i} 
                      onClick={() => setActiveTab(i + 1)}
                      disabled={!results[i + 1]}
                      className={`tab-button ${activeTab === i + 1 ? 'active' : ''}`}
                      style={{ 
                        padding: '8px 16px', 
                        borderRadius: '8px', 
                        fontSize: '12px', 
                        fontWeight: '600',
                        whiteSpace: 'nowrap',
                        background: activeTab === i + 1 ? 'var(--accent-primary)' : 'rgba(255,255,255,0.05)',
                        color: activeTab === i + 1 ? 'white' : 'var(--text-secondary)',
                        border: 'none',
                        cursor: results[i + 1] ? 'pointer' : 'not-allowed',
                        opacity: results[i + 1] ? 1 : 0.3,
                        transition: 'all 0.2s ease'
                      }}
                    >
                      {s.title}
                    </button>
                  ))}
                </div>
              )}

              {step === 0 && !isGenerating && Object.keys(results).length === 0 ? (
                <div style={{ height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', opacity: 0.3 }}>
                  <Sparkles size={48} style={{ marginBottom: '16px' }} />
                  <p>Awaiting input to begin generation...</p>
                </div>
              ) : (
                <div style={{ animation: 'fadeIn 0.5s ease-in' }}>
                  <div className="markdown-content">
                    <ReactMarkdown>{results[activeTab] || "Processing..."}</ReactMarkdown>
                  </div>
                  {step === workflowSteps.length + 1 && (
                    <div style={{ marginTop: '40px', padding: '24px', background: 'rgba(0, 121, 107, 0.1)', border: '1px dashed var(--accent-secondary)', borderRadius: '16px' }}>
                      <p style={{ color: 'var(--accent-secondary)', fontWeight: '600' }}>✓ Content Package Finalized</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </section>
      </main>
      {/* Settings Modal */}
      {isSettingsOpen && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(8px)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div className="glass-card" style={{ width: '400px', padding: '40px' }}>
            <h3 style={{ fontSize: '20px', fontWeight: '700', marginBottom: '8px' }}>Dashboard Settings</h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '13px', marginBottom: '32px' }}>Configure your agency profile and API credentials.</p>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
              <div>
                <label style={{ fontSize: '11px', fontWeight: '800', opacity: 0.5, marginBottom: '8px', display: 'block' }}>AGENCY BRANDING</label>
                <div style={{ width: '100%', padding: '12px', border: '1px dashed var(--border-color)', borderRadius: '8px', textAlign: 'center', fontSize: '12px', color: 'var(--text-secondary)' }}>
                  Default (Silverpath.ai)
                </div>
              </div>

              <div>
                <label style={{ fontSize: '11px', fontWeight: '800', opacity: 0.5, marginBottom: '8px', display: 'block' }}>EXPORT FORMAT</label>
                <select style={{ width: '100%', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border-color)', padding: '12px', borderRadius: '8px', color: 'white', fontSize: '13px' }}>
                  <option>Markdown (.md)</option>
                  <option>Rich Text (MS Word)</option>
                </select>
              </div>
            </div>

            <div style={{ borderTop: '1px solid var(--border-color)', marginTop: '32px', paddingTop: '24px' }}>
              <label style={{ fontSize: '11px', fontWeight: '800', opacity: 0.5, marginBottom: '8px', display: 'block' }}>ACCOUNT</label>
              <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '16px' }}>{session?.user?.email}</p>
              <button 
                onClick={() => signOut({ callbackUrl: '/login' })}
                style={{ 
                  width: '100%', 
                  padding: '12px', 
                  background: 'rgba(239, 68, 68, 0.1)', 
                  border: '1px solid rgba(239, 68, 68, 0.3)', 
                  borderRadius: '10px', 
                  color: '#ef4444', 
                  fontSize: '13px', 
                  fontWeight: '600', 
                  cursor: 'pointer', 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center', 
                  gap: '8px',
                  fontFamily: 'inherit',
                  transition: 'all 0.2s ease'
                }}
              >
                <LogOut size={14} />
                Log Out
              </button>
            </div>

            <button 
              onClick={() => setIsSettingsOpen(false)}
              className="btn-primary" 
              style={{ width: '100%', marginTop: '24px' }}
            >
              Close Settings
            </button>
          </div>
        </div>
      )}

      {/* All Projects Modal */}
      {isHistoryOpen && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(8px)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div className="glass-card" style={{ width: '550px', maxHeight: '80vh', padding: '40px', display: 'flex', flexDirection: 'column' }}>
            <h3 style={{ fontSize: '20px', fontWeight: '700', marginBottom: '8px' }}>All Projects</h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '13px', marginBottom: '24px' }}>{history.length} projects in your history</p>
            
            <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '24px', paddingRight: '8px' }}>
              {history.map((entry) => (
                <button 
                  key={entry.id}
                  onClick={() => { loadFromHistory(entry); setIsHistoryOpen(false); }}
                  style={{ 
                    background: 'rgba(255,255,255,0.03)', 
                    border: '1px solid rgba(255,255,255,0.06)', 
                    padding: '16px', 
                    borderRadius: '12px',
                    textAlign: 'left',
                    cursor: 'pointer',
                    width: '100%',
                    transition: 'all 0.2s ease',
                    color: 'var(--text-secondary)',
                    fontFamily: 'inherit'
                  }}
                  onMouseOver={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.08)'}
                  onMouseOut={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.03)'}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ fontSize: '14px', fontWeight: '600', color: 'white', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '350px' }}>{entry.topic || '(Untitled Project)'}</div>
                    <div style={{ fontSize: '11px', opacity: 0.5, whiteSpace: 'nowrap', marginLeft: '12px' }}>{entry.date}</div>
                  </div>
                  <div style={{ fontSize: '11px', opacity: 0.4, marginTop: '4px' }}>{entry.category || 'Guide'} • {entry.scenario?.substring(0, 60) || 'No scenario'}...</div>
                </button>
              ))}
            </div>
            
            <button 
              onClick={() => setIsHistoryOpen(false)}
              className="btn-primary" 
              style={{ width: '100%' }}
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
