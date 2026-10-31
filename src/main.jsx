import React, { useEffect, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import './style.css';

const initialMessages = [
  { id: 'welcome-1', sender: 'system', name: 'PalTech', text: 'A little space for big ideas. Drop a question, a thought, or a picture to get the conversation moving.', time: new Date().toISOString() },
];
const levels = [
  { name: 'First Spark', min: 0, icon: '✦' }, { name: 'Curious Mind', min: 50, icon: '✧' }, { name: 'Idea Builder', min: 120, icon: '◈' },
  { name: 'Bright Mind', min: 220, icon: '✴' }, { name: 'Visionary', min: 350, icon: '✺' }, { name: 'PalTech Legend', min: 500, icon: '♛' },
];
const fmtTime = (t) => new Intl.DateTimeFormat([], { hour: 'numeric', minute: '2-digit' }).format(new Date(t));
function App() {
  const [messages, setMessages] = useState(initialMessages);
  const [stats, setStats] = useState({ questions: 0, replies: 0, points: 0 });
  const [who, setWho] = useState(() => localStorage.getItem('ptt-name') || 'Valentine');
  const [text, setText] = useState('');
  const [file, setFile] = useState(null);
  const [connected, setConnected] = useState(false);
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState('');
  const [assistant, setAssistant] = useState(false);
  const [apiKeyMissing, setApiKeyMissing] = useState(false);
  const [feedbackOpen, setFeedbackOpen] = useState(false);
  const [feedbackBuild, setFeedbackBuild] = useState('');
  const [feedbackText, setFeedbackText] = useState('');
  const [roomKey, setRoomKey] = useState(() => localStorage.getItem('ptt-room-key') || '');
  const [keyDraft, setKeyDraft] = useState('');
  const [keyError, setKeyError] = useState('');
  const headers = () => roomKey ? { 'X-Room-Key': roomKey } : {};
  const messagesRef = useRef(null); const shouldAutoScrollRef = useRef(true); const inputRef = useRef(null); const fileRef = useRef(null);
  const currentLevel = [...levels].reverse().find(l => stats.points >= l.min) || levels[0];
  const nextLevel = levels.find(l => l.min > stats.points) || levels.at(-1);
  const progress = nextLevel.min === currentLevel.min ? 100 : Math.min(100, ((stats.points-currentLevel.min)/(nextLevel.min-currentLevel.min))*100);

  async function refresh() {
    try {
      const r = await fetch('/api/state', { headers: headers() }); if (r.status === 401) { localStorage.removeItem('ptt-room-key'); setRoomKey(''); setWho('Valentine'); throw Error(); } if (!r.ok) throw Error(); const d = await r.json();
      setMessages(d.messages?.length ? d.messages : initialMessages); setStats(d.stats || { questions: 0, replies: 0, points: 0 }); if (d.role) { setWho(d.role); localStorage.setItem('ptt-name',d.role); } setConnected(true);
    } catch { setConnected(false); }
  }
  useEffect(() => { refresh(); const id = setInterval(refresh, 1100); return () => clearInterval(id); }, [roomKey]);
  useEffect(() => {
    const list = messagesRef.current;
    if (list && shouldAutoScrollRef.current) list.scrollTop = list.scrollHeight;
  }, [messages]);
  useEffect(() => { if (toast) { const id=setTimeout(()=>setToast(''),3000); return ()=>clearTimeout(id); } }, [toast]);

  async function send(event) {
    event?.preventDefault(); if ((!text.trim() && !file) || busy) return;
    setBusy(true);
    try {
      const form = new FormData(); form.append('name', who); form.append('text', text.trim()); form.append('roomKey', roomKey);
      if (file) form.append('image', file);
      const res = await fetch('/api/messages', { method: 'POST', body: form }); const data = await res.json();
      if (!res.ok) throw Error(data.error || 'Could not send your message.');
      setText(''); setFile(null); if(fileRef.current) fileRef.current.value=''; await refresh();
    } catch (err) { setToast(err.message); }
    finally { setBusy(false); inputRef.current?.focus(); }
  }
  async function sendFeedback(event) {
    event.preventDefault();
    if (!feedbackBuild.trim() || !feedbackText.trim() || busy) return;
    setBusy(true);
    try {
      const form = new FormData();
      form.append('name', who);
      form.append('text', `Build feedback — ${feedbackBuild.trim()}: ${feedbackText.trim()}`);
      form.append('roomKey', roomKey);
      const response = await fetch('/api/messages', { method: 'POST', body: form });
      const data = await response.json();
      if (!response.ok) throw Error(data.error || 'Could not send your feedback.');
      setFeedbackBuild(''); setFeedbackText(''); setFeedbackOpen(false); await refresh();
    } catch (error) { setToast(error.message || 'Could not send your feedback.'); }
    finally { setBusy(false); }
  }
  async function askGemini() {
    if (!text.trim()) { inputRef.current?.focus(); setToast('Type a prompt for the Gemini helper first.'); return; }
    setBusy(true); setAssistant(true);
    try {
      const res = await fetch('/api/assistant', { method: 'POST', headers: {'Content-Type':'application/json', ...headers()}, body: JSON.stringify({ prompt: text, context: messages.slice(-8).map(m=>`${m.name}: ${m.text}`).join('\n') }) });
      const data=await res.json(); if(!res.ok) throw Error(data.error || 'Gemini could not respond.');
      setText(data.reply); setToast('Gemini drafted a reply. Review it, then send when you’re ready.');
    } catch(err) { setApiKeyMissing(true); setToast(err.message); }
    finally { setAssistant(false); setBusy(false); inputRef.current?.focus(); }
  }
  async function joinRoom(event) { event.preventDefault(); if (!keyDraft.trim()) return; setKeyError(''); try { const response=await fetch('/api/state',{headers:{'X-Room-Key':keyDraft.trim()}}); const data=await response.json(); if(!response.ok) throw Error(data.error||'That room key did not match. Try again.'); localStorage.setItem('ptt-room-key',keyDraft.trim()); localStorage.setItem('ptt-name',data.role); setWho(data.role); setRoomKey(keyDraft.trim()); } catch(error) { setKeyError(error.message||'Could not reach the room.'); } }
  return <div className="app-shell">
    {!roomKey&&<div className="access-overlay"><form className="access-card" onSubmit={joinRoom}><span className="access-star">✦</span><p className="eyebrow">A PRIVATE ROOM FOR TWO</p><h2>Come on in<span>.</span></h2><p>Enter your personal room code to join as Valentine or The Pal.</p><input autoFocus value={keyDraft} onChange={e=>setKeyDraft(e.target.value)} placeholder="Your room code" type="password"/>{keyError&&<p className="access-error">{keyError}</p>}<button className="primary-button" type="submit">Enter the room <span>↗</span></button></form></div>}
    {feedbackOpen&&<div className="access-overlay" onMouseDown={e=>{if(e.target===e.currentTarget)setFeedbackOpen(false)}}><form className="access-card feedback-card" role="dialog" aria-modal="true" aria-labelledby="feedback-title" onSubmit={sendFeedback}><button type="button" className="feedback-close" onClick={()=>setFeedbackOpen(false)} aria-label="Close feedback form">×</button><span className="access-star">✧</span><p className="eyebrow">BONUS POINTS</p><h2 id="feedback-title">Share your feedback<span>.</span></h2><p>Tell us what you think about a Jacobs &amp; Co build. Your feedback will be shared in the conversation.</p><label className="feedback-field">Build or project<input required value={feedbackBuild} onChange={e=>setFeedbackBuild(e.target.value)} placeholder="Which build did you view?"/></label><label className="feedback-field">Your feedback<textarea required value={feedbackText} onChange={e=>setFeedbackText(e.target.value)} placeholder="What worked well? What could improve?" rows="4"/></label><button className="primary-button" type="submit" disabled={busy}>{busy?'Sending…':'Send feedback'} <span>↗</span></button></form></div>}
    <div className="starfield" aria-hidden="true">{Array.from({length:48},(_,i)=><i key={i} style={{'--x':`${(i*47+13)%100}%`,'--y':`${(i*71+7)%100}%`,'--delay':`${(i%9)*-.7}s`,'--size':`${i%7===0?3:1.5}px`}} />)}</div>
    <header className="topbar"><a className="brand" href="#top" aria-label="PalTech Talk home"><span className="brand-mark">P<span>✦</span></span><span>PALTECH <b>TALK</b></span></a><div className="header-right"><div className={`live-state ${connected?'is-live':''}`}><span className="live-dot"/>{connected?'LIVE ROOM':'CONNECTING'}</div><div className="who-picker"><span>YOU ARE</span><strong className="who-name">{who}</strong></div></div></header>
    <main id="top">
      <section className="hero"><div className="hero-copy"><div className="eyebrow"><span className="eyebrow-star">✦</span> TWO MINDS. ONE BIGGER VISION.</div><h1>PalTech <span>Talk</span><sup>✦</sup></h1><p className="slogan">A bespoke platform that empowers and enriches.<br/><strong>Designed &amp; Engineered by the Pal for the Pal.</strong></p><p className="intro">A private corner of the ever-changing tech universe—made for questions, honest ideas, and building something remarkable together.</p><blockquote className="song-quote"><p>“One day we’ll leave this world behind.<br/>And say goodbye.<br/>But you and I will redefine<br/>Space and time<br/>'Cause we are living on the run<br/>Like a legacy<br/>Shining brighter than the son.”</p><cite>Quoted from “We Are Legends” — Hardwell, KAAZE &amp; Jonathan Mendelsohn</cite></blockquote><div className="hero-cta"><button className="primary-button" onClick={()=>inputRef.current?.focus()}>Start a conversation <span>↓</span></button><span className="private-note"><span className="lock-icon">⌑</span> YOUR LITTLE CORNER OF THE INTERNET</span></div></div>
        <div className="orbit-art" aria-hidden="true"><div className="orbit orbit-one"/><div className="orbit orbit-two"/><div className="orbit orbit-three"/><div className="planet"><span>✦</span><i/></div><div className="orbit-dot dot-one">✧</div><div className="orbit-dot dot-two">✦</div><div className="orbit-dot dot-three"/><div className="orbit-label label-top">IDEAS IN ORBIT</div><div className="orbit-label label-bottom">BUILT TOGETHER <span>✦</span></div></div></section>
      <section className="dashboard"><div className="stats-row"><div className="stat-card"><div className="stat-top"><span className="stat-icon blue">✧</span><span className="stat-label">QUESTIONS ASKED</span></div><div className="stat-number">{stats.questions}<span className="stat-unit"> questions</span></div><div className="stat-foot"><span className="mini-stars">✦ ✦ ✦</span> Every great idea starts here</div></div><div className="stat-card"><div className="stat-top"><span className="stat-icon gold">↗</span><span className="stat-label">PAL'S REPLIES</span></div><div className="stat-number">{stats.replies}<span className="stat-unit"> answered</span></div><div className="stat-foot"><span className="mini-stars">✦ ✦ ✦</span> Showing up earns its own reward</div></div><div className="stat-card points-card"><div className="stat-top"><span className="stat-icon gold">✺</span><span className="stat-label">PAL POINTS</span></div><div className="stat-number">{stats.points}<span className="stat-unit"> / 500</span></div><div className="level-line"><span>{currentLevel.icon} {currentLevel.name}</span><span>{stats.points >= 500 ? 'MAX LEVEL' : `${stats.points} PTS`}</span></div><div className="progress-track"><i style={{width:`${progress}%`}}/></div><div className="stat-foot">{stats.points >= 500 ? 'A share in the company awaits ✦' : `${Math.max(0,nextLevel.min-stats.points)} points to ${nextLevel.name}`}</div></div></div>
        <div className="chat-layout"><section className="chat-panel"><div className="chat-head"><div><span className="eyebrow">THE THINKING ROOM</span><h2>Our conversation<span>.</span></h2></div><div className="chat-head-right"><span className="secure-tag"><span>✦</span> JUST US TWO</span><button className="icon-button" aria-label="Conversation info" onClick={()=>setToast('Every Pal reply adds 10 points. 500 points marks the reward milestone.')}>···</button></div></div><div className="chat-messages" ref={messagesRef} onScroll={e=>{const el=e.currentTarget;shouldAutoScrollRef.current=el.scrollHeight-el.scrollTop-el.clientHeight<40}}>{messages.map((m,i)=>{const mine=m.name===who;const system=m.sender==='system';return <article key={m.id} className={`message ${mine?'mine':''} ${system?'system-message':''}`}><div className={`avatar ${mine?'avatar-you':system?'avatar-system':'avatar-pal'}`}>{system?'✦':mine?(who==='Valentine'?'V':'P'):'P'}</div><div className="message-body"><div className="message-meta"><strong>{system?'PalTech':mine?`${m.name} · YOU`:m.name||'The Pal'}</strong><time>{fmtTime(m.time)}</time>{m.pointsAwarded&&<span className="earned-points">+10 ✦</span>}</div><div className="bubble">{m.image&&<a href={m.image} target="_blank" rel="noreferrer"><img className="shared-image" src={m.image} alt="Shared in chat"/></a>}{m.text&&<p>{m.text}</p>}</div></div></article>})}</div><div className="composer-wrap">{file&&<div className="file-chip"><span>▧</span>{file.name}<button type="button" onClick={()=>{setFile(null);fileRef.current.value=''}} aria-label="Remove image">×</button></div>}<form className="composer" onSubmit={send}><textarea ref={inputRef} value={text} onChange={e=>setText(e.target.value)} onKeyDown={e=>{if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();send()}}} placeholder="Ask something. Share a thought. Start a spark…" rows="1" aria-label="Message"/><div className="composer-tools"><div className="tool-actions"><button type="button" className="tool-button" onClick={()=>fileRef.current?.click()} title="Share a picture"><span>▧</span><small>Picture</small></button><button type="button" className="tool-button gemini-button" onClick={askGemini} disabled={assistant}><span className="gemini-spark">✧</span><small>{assistant?'Thinking…':'Ask Gemini'}</small></button></div><button className="send-button" type="submit" disabled={busy||(!text.trim()&&!file)}>{busy?'…':'Send'} <span>↗</span></button></div></form><input ref={fileRef} type="file" accept="image/png,image/jpeg,image/gif,image/webp" hidden onChange={e=>{const f=e.target.files?.[0];if(f){if(f.size>8*1024*1024){setToast('Images must be 8 MB or smaller.');e.target.value='';return;}setFile(f)}}}/><p className="composer-hint">ENTER TO SEND <span>·</span> SHIFT + ENTER FOR A NEW LINE <span>·</span> UP TO 8 MB PER IMAGE</p></div></section>
        <aside className="side-column"><section className="bonus-builds"><div className="side-eyebrow"><span>✧</span> BONUS POINTS</div><h3>Explore what we’ve built.</h3><p>Earn bonus points by viewing and giving feedback on former builds by Jacobs &amp; Co Dynamic Development Labs.</p><button className="primary-button bonus-feedback-button" type="button" onClick={()=>setFeedbackOpen(true)}>Give feedback <span>↗</span></button></section><section className="points-info"><div className="side-eyebrow"><span>✦</span> THE PAL POINTS QUEST</div><h3>Good answers<br/>move us forward.</h3><p>Every time The Pal responds to a question, they earn <strong>10 points.</strong> Stack them up to 500 and unlock a share in the company, plus compensation.</p><div className="reward-track">{[0,100,200,300,400,500].map((x,i)=><div className={`reward-stop ${stats.points>=x?'achieved':''} ${x===500?'final-stop':''}`} key={x}><span>{i===5?'♛':i===0?'✦':'✧'}</span><small>{x}</small></div>)}</div><div className="reward-caption"><span>{currentLevel.icon} {currentLevel.name}</span><span>500 ✦ THE REWARD</span></div><div className="reward-note"><span>✧</span> A little friendly competition. A lot of shared ambition.</div></section><section className="directors-note"><div className="quote-mark">“</div><div className="note-label">A NOTE FROM THE DIRECTOR</div><p>The human brain has unlimited potential. Jacobs &amp; Co Dynamic Development Labs encourages collaboration, wisdom and honest critique to produce world-class results.</p><p>This is one component in the machine that delivers outcomes and goals that go <em>above and beyond.</em></p><div className="note-signature"><span>✦</span> IMRAAN JACOBS <span className="signature-dash"/> DIRECTOR</div></section></aside></div></section>
    </main><footer><div className="footer-stars">✦ <span>✧</span> ✦</div><p>Designed, prototyped and built by <strong>Imraan Jacobs</strong><br/>Jacobs &amp; Co Dynamic Development Labs.</p><div className="footer-end">MADE FOR THE PAL&nbsp; BY THE PAL <span>✦</span></div></footer>{toast&&<div className="toast" role="status"><span>✦</span> {toast}</div>}</div>
}

createRoot(document.getElementById('root')).render(<App/>);
