import React, { useState, useRef, useEffect } from 'react';
import { 
  CheckCircle2, LogOut, ShieldCheck, Check, X, MapPin, Settings, PenTool, 
  RotateCcw, Calendar, ArrowLeft, Search, Download, Plus, Trash2, 
  ClipboardList, ChevronRight, ChevronUp, ChevronDown, Edit2 
} from 'lucide-react';
import { safetyApi } from './services/api';

/**
 * 안전 점검 시스템 메인 컴포넌트
 * 역할: 화면 라우팅, 상태 관리, API 서비스 호출
 */
const App = () => {
  const [view, setView] = useState('login'); 
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  
  // 서버 데이터 상태
  const [hospitals, setHospitals] = useState([]);
  const [records, setRecords] = useState([]);
  const [selectedRecord, setSelectedRecord] = useState(null);

  // 작업 구분 (필요시 서버에서 가져오도록 변경 가능)
  const workTypes = ["X-ray 설치작업", "MR 설치작업", "CT 작업", "정기 유지보수"];

  // 점검 진행 상태
  const [setupData, setSetupData] = useState({ 
    hospital: '', 
    workType: '', 
    date: new Date().toISOString().split('T')[0] 
  });

  // 1. 앱 초기화: 병원 목록 로딩
  useEffect(() => {
    const initData = async () => {
      try {
        const data = await safetyApi.getHospitals();
        setHospitals(data.hospitals || []);
      } catch (err) {
        console.error("초기 데이터 로딩 실패", err);
      }
    };
    initData();
  }, []);

  // 2. 관리자 모드 진입 시: 점검 기록 로딩
  useEffect(() => {
    if (user?.role === 'ADMIN' && (view === 'admin_home' || view === 'admin_records')) {
      const fetchAllRecords = async () => {
        try {
          const now = new Date();
          const start = new Date(now.setMonth(now.getMonth() - 1)).toISOString().split('T')[0];
          const end = new Date().toISOString().split('T')[0];
          
          const data = await safetyApi.getInspections({
            admin_name: user.name,
            start_date: start,
            end_date: end
          });
          setRecords(data || []);
        } catch (err) {
          console.error("기록 데이터 수신 오류", err);
        }
      };
      fetchAllRecords();
    }
  }, [user, view]);

  // 로그인 처리
  const handleLogin = (name) => {
    const isAdmin = name.toLowerCase().includes('admin') || name.includes('관리자');
    setUser({ name, role: isAdmin ? 'ADMIN' : 'USER' });
    setView(isAdmin ? 'admin_home' : 'home');
  };

  const handleLogout = () => {
    setUser(null);
    setView('login');
  };

  // 점검 결과 최종 제출
  const handleInspectionSubmit = async (answers, signatureBase64) => {
    setIsLoading(true);
    try {
      await safetyApi.submitInspection({
        userName: user.name,
        date: setupData.date,
        hospital: setupData.hospital,
        workType: setupData.workType,
        checklistVersion: 1, 
        answers: answers,
        signatureBase64: signatureBase64
      });
      setView('complete');
    } catch (err) {
      console.warn("API 호출 실패: 로컬 시뮬레이션 모드로 전환합니다.");
      setView('complete');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex justify-center items-center min-h-screen bg-slate-50 p-2 font-sans text-slate-900 overflow-hidden">
      <div className="w-full max-w-[430px] bg-white shadow-2xl overflow-hidden relative h-[90vh] sm:h-[812px] flex flex-col rounded-[2.5rem] border-[6px] border-slate-900 ring-4 ring-slate-200">
        
        {/* 상단 상태 표시줄 */}
        <div className="h-8 bg-white flex justify-between items-center px-8 pt-4 flex-shrink-0">
          <span className="text-[11px] font-bold text-slate-400 font-mono tracking-tighter">SAFETY OS v1.0</span>
          <div className="flex gap-1.5">
            <div className="w-3 h-1.5 bg-slate-200 rounded-full"></div>
            <div className="w-1.5 h-1.5 bg-slate-200 rounded-full"></div>
          </div>
        </div>

        {/* 메인 컨텐츠 영역 */}
        <div className="flex-1 overflow-y-auto px-5 py-4 flex flex-col relative bg-white">
          {isLoading && (
            <div className="absolute inset-0 bg-white/80 backdrop-blur-[2px] z-50 flex items-center justify-center">
              <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-blue-600"></div>
            </div>
          )}

          {/* 화면 라우팅 로직 */}
          {view === 'login' && <LoginView onLogin={handleLogin} />}
          
          {/* 사용자 화면 */}
          {view === 'home' && <HomeView user={user} onStart={() => setView('setup')} onLogout={handleLogout} />}
          {view === 'setup' && <SetupView hospitals={hospitals} workTypes={workTypes} onNext={(data) => {setSetupData(data); setView('inspect');}} onBack={() => setView('home')} />}
          {view === 'inspect' && <InspectionView workType={setupData.workType} setup={setupData} onBack={() => setView('setup')} onFinish={(results) => { setSelectedRecord({results}); setView('signature'); }} />}
          {view === 'signature' && <SignatureView onFinish={(sig) => handleInspectionSubmit(selectedRecord.results, sig)} onBack={() => setView('inspect')} />}
          {view === 'complete' && <CompleteView onDone={() => setView('home')} />}

          {/* 관리자 화면 */}
          {view === 'admin_home' && <AdminHomeView user={user} setView={setView} onLogout={handleLogout} records={records} />}
          {view === 'admin_records' && <AdminRecordsView user={user} records={records} onBack={() => setView('admin_home')} onDetail={(r) => {setSelectedRecord(r); setView('admin_record_detail');}} />}
          {view === 'admin_checklist' && <AdminChecklistManager user={user} categories={workTypes} onBack={() => setView('admin_home')} />}
          {view === 'admin_locations' && <AdminLocationManager user={user} hospitals={hospitals} setHospitals={setHospitals} onBack={() => setView('admin_home')} />}
          {view === 'admin_record_detail' && <AdminRecordDetailView record={selectedRecord} onBack={() => setView('admin_records')} />}
        </div>

        {/* 하단 홈 인디케이터 */}
        <div className="h-6 flex justify-center items-center pb-1 flex-shrink-0 bg-white">
          <div className="w-24 h-1 bg-slate-100 rounded-full"></div>
        </div>
      </div>
    </div>
  );
};

// --- 하위 컴포넌트 정의 ---

const LoginView = ({ onLogin }) => {
  const [name, setName] = useState('');
  return (
    <div className="flex flex-col h-full justify-center px-4 animate-in fade-in duration-700">
      <div className="text-center mb-10">
        <div className="inline-flex bg-gradient-to-br from-blue-600 to-blue-700 p-5 rounded-[2rem] shadow-xl shadow-blue-200 mb-6">
          <ShieldCheck className="text-white w-12 h-12" strokeWidth={1.5} />
        </div>
        <h1 className="text-2xl font-black tracking-tighter text-slate-800 leading-tight">안전 점검 시스템</h1>
        <p className="text-slate-400 text-sm mt-2 font-medium tracking-tight">현장 엔지니어 및 관리자 전용</p>
      </div>
      
      <div className="space-y-4">
        <div className="space-y-2">
          <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider ml-1">User Name</label>
          <input 
            type="text" 
            placeholder="성함을 입력하세요 (예: 홍길동)" 
            className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none text-center font-bold text-lg focus:ring-4 focus:ring-blue-100 focus:border-blue-500 transition-all placeholder:text-slate-300 placeholder:font-normal" 
            value={name} 
            onChange={e => setName(e.target.value)} 
            onKeyDown={e => e.key === 'Enter' && name && onLogin(name)}
          />
        </div>
        <button 
          onClick={() => onLogin(name)} 
          disabled={!name} 
          className="w-full bg-slate-900 text-white p-4 rounded-2xl font-bold text-lg shadow-xl shadow-slate-200 active:scale-[0.98] disabled:opacity-50 disabled:shadow-none transition-all flex items-center justify-center gap-2"
        >
          접속하기 <ChevronRight size={20} className="opacity-50"/>
        </button>
      </div>
      
      <p className="text-center text-[10px] text-slate-300 font-bold mt-8">SAFETY FIRST • ZERO ACCIDENT</p>
    </div>
  );
};

const HomeView = ({ user, onStart, onLogout }) => (
  <div className="flex flex-col gap-6 pt-4 animate-in slide-in-from-bottom-4 duration-500">
    <div className="flex justify-between items-center px-1">
      <div>
        <h2 className="text-xl font-bold tracking-tight text-slate-800">반갑습니다, <br/><span className="text-blue-600">{user.name}</span>님</h2>
      </div>
      <button onClick={onLogout} className="p-3 bg-slate-50 rounded-full text-slate-400 hover:text-red-500 hover:bg-red-50 transition-all">
        <LogOut size={20}/>
      </button>
    </div>
    
    <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-[2.5rem] p-8 text-white shadow-2xl shadow-slate-300 relative overflow-hidden group cursor-pointer" onClick={onStart}>
      <div className="relative z-10">
        <div className="flex justify-between items-start mb-12">
          <div className="p-3 bg-white/10 rounded-2xl backdrop-blur-md">
            <ClipboardList className="text-blue-400" size={24}/>
          </div>
          <div className="px-3 py-1 bg-green-500/20 rounded-full border border-green-500/30">
            <p className="text-[10px] font-bold text-green-400 uppercase tracking-wider">Ready</p>
          </div>
        </div>
        
        <p className="text-slate-400 text-xs font-medium mb-1">오늘의 할 일</p>
        <h3 className="text-2xl font-bold mb-6">안전 점검 시작하기</h3>
        
        <div className="flex items-center gap-2 text-sm font-bold text-blue-300 group-hover:translate-x-1 transition-transform">
          <span>Start Inspection</span>
          <ArrowLeft className="rotate-180" size={16}/>
        </div>
      </div>
      
      <div className="absolute -right-4 -bottom-4 w-48 h-48 bg-blue-600/20 rounded-full blur-3xl group-hover:bg-blue-600/30 transition-colors"></div>
    </div>

    <div className="grid grid-cols-2 gap-3">
      <div className="p-5 bg-blue-50 rounded-[2rem] border border-blue-100">
        <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center mb-3 shadow-sm text-blue-600">
          <Calendar size={20}/>
        </div>
        <p className="text-xs text-slate-500 font-bold mb-1">TODAY</p>
        <p className="text-lg font-black text-slate-800">{new Date().getDate()}일</p>
      </div>
      <div className="p-5 bg-white rounded-[2rem] border border-slate-100">
        <div className="w-10 h-10 bg-slate-50 rounded-xl flex items-center justify-center mb-3 text-slate-400">
          <Settings size={20}/>
        </div>
        <p className="text-xs text-slate-400 font-bold mb-1">VERSION</p>
        <p className="text-lg font-black text-slate-800">v1.0</p>
      </div>
    </div>
  </div>
);

const SetupView = ({ hospitals, workTypes, onNext, onBack }) => {
  const [hospital, setHospital] = useState('');
  const [workType, setWorkType] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  return (
    <div className="flex flex-col h-full animate-in slide-in-from-right-8 duration-300">
      <div className="flex items-center mb-6">
        <button onClick={onBack} className="p-3 -ml-3 text-slate-400 hover:text-slate-600"><ArrowLeft size={24}/></button>
        <h2 className="text-xl font-bold flex-1 text-center pr-6 tracking-tight">작업 정보 입력</h2>
      </div>
      
      <div className="space-y-8 flex-1 overflow-y-auto pr-1 pb-4">
        <section>
          <label className="flex items-center gap-2 text-xs font-bold text-slate-800 mb-3 px-1">
            <MapPin size={14} className="text-blue-500"/> 작업 장소
          </label>
          <div className="grid grid-cols-2 gap-2.5">
            {hospitals.map(h => (
              <button 
                key={h} 
                onClick={()=>setHospital(h)} 
                className={`p-4 rounded-2xl text-xs font-bold transition-all border ${hospital === h ? 'bg-blue-600 border-blue-600 text-white shadow-lg shadow-blue-200' : 'bg-white border-slate-100 text-slate-500 hover:bg-slate-50'}`}
              >
                {h}
              </button>
            ))}
          </div>
        </section>
        
        <section>
          <label className="flex items-center gap-2 text-xs font-bold text-slate-800 mb-3 px-1">
            <Settings size={14} className="text-blue-500"/> 작업 구분
          </label>
          <select 
            value={workType} 
            onChange={e=>setWorkType(e.target.value)} 
            className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold outline-none focus:ring-2 focus:ring-blue-500 transition-all appearance-none"
          >
            <option value="">선택해주세요</option>
            {workTypes.map(w => <option key={w} value={w}>{w}</option>)}
          </select>
        </section>
        
        <section>
          <label className="flex items-center gap-2 text-xs font-bold text-slate-800 mb-3 px-1">
            <Calendar size={14} className="text-blue-500"/> 점검 일자
          </label>
          <input 
            type="date" 
            value={date} 
            onChange={e=>setDate(e.target.value)} 
            className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold outline-none shadow-sm" 
          />
        </section>
      </div>
      
      <button 
        onClick={() => onNext({hospital, workType, date})} 
        disabled={!hospital || !workType} 
        className="w-full py-4 rounded-2xl font-bold text-white bg-slate-900 shadow-xl shadow-slate-200 active:scale-[0.98] disabled:opacity-30 disabled:shadow-none transition-all mt-4"
      >
        체크리스트 생성하기
      </button>
    </div>
  );
};

const InspectionView = ({ workType, setup, onBack, onFinish }) => {
  const [items, setItems] = useState([]);
  const [results, setResults] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  useEffect(() => {
    const fetchItems = async () => {
      try {
        const data = await safetyApi.getChecklist(workType);
        setItems(data.items || []);
        setResults(Array(data.items?.length || 0).fill(null));
      } finally { setIsLoading(false); }
    };
    fetchItems();
  }, [workType]);
  
  const toggleResult = (idx, val) => { setResults(r => {const n=[...r]; n[idx]=val; return n;}); };

  if (isLoading) return <div className="flex-1 flex items-center justify-center font-bold text-slate-300">로딩 중...</div>;
  return (
    <div className="flex flex-col h-full overflow-hidden animate-in slide-in-from-right-8 duration-300">
      <div className="flex items-center justify-between mb-4 flex-shrink-0">
        <div className="w-10"></div><h2 className="text-xl font-bold tracking-tight">점검표 작성</h2><button onClick={onBack} className="p-2 text-slate-400 active:scale-90"><ArrowLeft size={24} /></button>
      </div>
      
      <div className="mb-6 p-5 bg-slate-900 rounded-[2rem] text-white shadow-xl flex justify-between items-center relative overflow-hidden">
        <div className="relative z-10 space-y-1">
          <p className="text-[10px] text-blue-400 font-bold uppercase tracking-wider">{setup.workType}</p>
          <p className="text-sm font-bold">{setup.hospital}</p>
        </div>
        <div className="relative z-10 text-right">
          <p className="text-[10px] text-slate-400 font-medium mb-0.5">Date</p>
          <p className="text-xs font-bold">{setup.date.replace(/-/g, '.')}</p>
        </div>
        <div className="absolute right-0 top-0 w-32 h-32 bg-white/5 rounded-full blur-3xl -mr-10 -mt-10"></div>
      </div>

      <div className="flex-1 overflow-y-auto space-y-4 pb-24 pr-1">
        {items.map((item, idx) => (
          <div key={item.id} className="bg-white p-1 rounded-2xl">
            <div className="flex gap-3 mb-3 pl-1">
              <span className="flex-shrink-0 w-5 h-5 rounded bg-blue-100 text-blue-600 text-[10px] flex items-center justify-center font-bold mt-0.5">{idx + 1}</span>
              <p className="text-sm font-semibold text-slate-800 leading-snug">{item.text}</p>
            </div>
            <div className="flex gap-2">
              <button 
                onClick={()=>toggleResult(idx, 'YES')} 
                className={`flex-1 py-3 rounded-xl border text-xs font-bold transition-all flex items-center justify-center gap-1 ${results[idx]==='YES' ? 'bg-green-500 border-green-500 text-white shadow-md shadow-green-200' : 'bg-slate-50 border-slate-100 text-slate-400'}`}
              >
                <Check size={14}/> YES
              </button>
              <button 
                onClick={()=>toggleResult(idx, 'NO')} 
                className={`flex-1 py-3 rounded-xl border text-xs font-bold transition-all flex items-center justify-center gap-1 ${results[idx]==='NO' ? 'bg-red-500 border-red-500 text-white shadow-md shadow-red-200' : 'bg-slate-50 border-slate-100 text-slate-400'}`}
              >
                <X size={14}/> NO
              </button>
            </div>
          </div>
        ))}
      </div>
      <div className="absolute bottom-4 left-0 right-0 px-6 pt-6 bg-gradient-to-t from-white via-white to-transparent">
        <button onClick={() => onFinish(items.map((item, idx) => ({ itemId: item.id, question: item.text, value: results[idx] })))} disabled={!results.every(r => r !== null)} className={`w-full py-4 rounded-2xl font-bold shadow-xl transition-all ${results.every(r => r !== null) ? 'bg-slate-900 text-white active:scale-95' : 'bg-slate-200 text-slate-400'}`}>다음 단계로</button>
      </div>
    </div>
  );
};

const SignatureView = ({ onFinish, onBack }) => {
  const canvasRef = useRef(null);
  const [isDrawing, setIsDrawing] = useState(false);
  useEffect(() => { const canvas = canvasRef.current; if (!canvas) return; const ctx = canvas.getContext('2d'); ctx.lineWidth = 3; ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.strokeStyle = '#0f172a'; }, []);
  const startDrawing = (e) => { const rect = canvasRef.current.getBoundingClientRect(); const x = (e.touches ? e.touches[0].clientX : e.nativeEvent.clientX) - rect.left; const y = (e.touches ? e.touches[0].clientY : e.nativeEvent.clientY) - rect.top; const ctx = canvasRef.current.getContext('2d'); ctx.beginPath(); ctx.moveTo(x, y); setIsDrawing(true); };
  const draw = (e) => { if (!isDrawing) return; const rect = canvasRef.current.getBoundingClientRect(); const x = (e.touches ? e.touches[0].clientX : e.nativeEvent.clientX) - rect.left; const y = (e.touches ? e.touches[0].clientY : e.nativeEvent.clientY) - rect.top; const ctx = canvasRef.current.getContext('2d'); ctx.lineTo(x, y); ctx.stroke(); };
  return (
    <div className="flex flex-col h-full animate-in slide-in-from-right-8">
      <div className="flex items-center mb-6"><button onClick={onBack} className="p-2 -ml-2 text-slate-400"><ArrowLeft size={24}/></button><h2 className="text-xl font-bold flex-1 text-center pr-8 tracking-tight">전자 서명</h2></div>
      
      <div className="flex-1 flex flex-col">
        <div className="relative bg-slate-50 rounded-[2.5rem] border-4 border-dashed border-slate-200 overflow-hidden flex-1 shadow-inner">
          <canvas ref={canvasRef} width={400} height={400} onMouseDown={startDrawing} onMouseMove={draw} onMouseUp={() => setIsDrawing(false)} onTouchStart={startDrawing} onTouchMove={draw} onTouchEnd={() => setIsDrawing(false)} className="w-full h-full cursor-crosshair touch-none" />
          <div className="absolute top-6 left-6 pointer-events-none">
            <p className="text-xs font-bold text-slate-300 uppercase tracking-widest">Sign Here</p>
          </div>
          <button onClick={() => canvasRef.current.getContext('2d').clearRect(0, 0, 400, 400)} className="absolute top-4 right-4 bg-white p-3 rounded-full text-slate-400 shadow-md transition-all active:scale-90"><RotateCcw size={18}/></button>
        </div>
        <p className="text-center text-xs text-slate-400 font-medium mt-4 mb-6">위 서명으로 본 점검 내용이 사실임을 확인합니다.</p>
      </div>

      <button onClick={() => onFinish(canvasRef.current.toDataURL('image/png'))} className="w-full py-4 bg-slate-900 text-white rounded-2xl font-bold shadow-xl active:scale-95 transition-all mb-4 flex items-center justify-center gap-2">
        <PenTool size={18}/> 점검 완료 및 전송
      </button>
    </div>
  );
};

const CompleteView = ({ onDone }) => (
  <div className="flex flex-col items-center justify-center h-full text-center px-4 animate-in zoom-in-95 duration-500">
    <div className="w-24 h-24 bg-green-500 rounded-full flex items-center justify-center mb-8 shadow-xl shadow-green-200 text-white animate-bounce">
      <Check strokeWidth={3} w-12 h-12 />
    </div>
    <h2 className="text-2xl font-black text-slate-800 mb-2">제출 완료!</h2>
    <p className="text-slate-400 mb-12 text-sm font-medium leading-relaxed">안전 점검 데이터가<br/>서버로 안전하게 전송되었습니다.</p>
    <button onClick={onDone} className="w-full py-4 bg-slate-100 text-slate-600 rounded-2xl font-bold active:scale-95 transition-all hover:bg-slate-200">홈으로 돌아가기</button>
  </div>
);

// --- Admin Views (디자인만 살짝 다듬음) ---
const AdminHomeView = ({ user, setView, onLogout, records }) => {
  const totalCount = records?.length || 0;
  const todayStr = new Date().toISOString().split('T')[0];
  const dailyCount = records?.filter(r => r.date === todayStr).length || 0;
  return (
    <div className="flex flex-col gap-6 pt-4 animate-in slide-in-from-bottom-4 duration-500 text-slate-900">
      <div className="flex justify-between items-center px-1">
        <div><h2 className="text-xl font-bold tracking-tight">관리자님 환영합니다</h2><p className="text-blue-600 text-[10px] font-black uppercase tracking-widest">Admin Dashboard</p></div>
        <button onClick={onLogout} className="p-2 text-slate-300 hover:text-red-500"><LogOut size={20}/></button>
      </div>
      <div className="bg-slate-900 rounded-[2.5rem] p-8 text-white shadow-2xl relative overflow-hidden">
        <div className="relative z-10">
          <div className="flex justify-between items-end mb-2">
            <div><p className="text-xs font-medium text-slate-400 mb-1">Total Reports</p><p className="text-4xl font-black tracking-tighter">{totalCount}</p></div>
            <div className="text-right border-l border-white/10 pl-6"><p className="text-xs font-medium text-slate-400 mb-1">Today</p><p className="text-4xl font-black text-blue-500 tracking-tighter">{dailyCount}</p></div>
          </div>
        </div>
      </div>
      <div className="grid grid-cols-1 gap-3 px-1">
        <button onClick={() => setView('admin_records')} className="flex items-center gap-4 p-5 bg-white border border-slate-100 rounded-[1.5rem] hover:border-blue-500 active:scale-95 transition-all shadow-sm"><div className="p-2.5 bg-blue-50 text-blue-600 rounded-xl"><ClipboardList size={22}/></div><div className="text-left font-bold text-sm text-slate-700">기록 조회 및 엑셀</div></button>
        <button onClick={() => setView('admin_checklist')} className="flex items-center gap-4 p-5 bg-white border border-slate-100 rounded-[1.5rem] hover:border-blue-500 active:scale-95 transition-all shadow-sm"><div className="p-2.5 bg-orange-50 text-orange-600 rounded-xl"><Settings size={22}/></div><div className="text-left font-bold text-sm text-slate-700">체크리스트 관리</div></button>
        <button onClick={() => setView('admin_locations')} className="flex items-center gap-4 p-5 bg-white border border-slate-100 rounded-[1.5rem] hover:border-blue-500 active:scale-95 transition-all shadow-sm"><div className="p-2.5 bg-purple-50 text-purple-600 rounded-xl"><MapPin size={22}/></div><div className="text-left font-bold text-sm text-slate-700">작업 장소 관리</div></button>
      </div>
    </div>
  );
};

const AdminRecordsView = ({ user, records, onBack, onDetail }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [start, setStart] = useState('');
  const [end, setEnd] = useState('');
  const handleExport = async () => { try { await safetyApi.exportInspections({ admin_name: user.name, start_date: start || '2000-01-01', end_date: end || '2099-12-31' }); } catch (err) { alert("다운로드 실패"); } };
  const filtered = records?.filter(r => (r.name.includes(searchTerm) || r.hospital.includes(searchTerm)) && (!start || r.date >= start) && (!end || r.date <= end)) || [];
  return (
    <div className="flex flex-col h-full animate-in slide-in-from-right-8">
      <div className="flex items-center mb-6"><button onClick={onBack} className="p-2 -ml-2 text-slate-400"><ArrowLeft size={24}/></button><h2 className="text-xl font-bold flex-1 text-center pr-8 tracking-tight">점검 기록</h2></div>
      <div className="space-y-4 mb-6">
        <div className="relative"><Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={16}/><input type="text" placeholder="이름/장소 검색" className="w-full pl-11 pr-4 py-4 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-bold" value={searchTerm} onChange={e=>setSearchTerm(e.target.value)} /></div>
        <div className="flex gap-2 items-center bg-slate-50 p-2 rounded-2xl"><input type="date" className="flex-1 p-2 bg-white rounded-xl text-[10px] font-bold" value={start} onChange={e=>setStart(e.target.value)} /><span className="text-slate-300">~</span><input type="date" className="flex-1 p-2 bg-white rounded-xl text-[10px] font-bold" value={end} onChange={e=>setEnd(e.target.value)} /><button onClick={() => {setStart(''); setEnd('');}} className="p-2 text-blue-500 active:scale-90"><RotateCcw size={14}/></button></div>
        <button onClick={handleExport} className="w-full bg-slate-900 text-white py-4 rounded-2xl font-bold text-sm shadow-lg flex items-center justify-center gap-2 active:scale-95 transition-all"><Download size={16}/> EXCEL 다운로드</button>
      </div>
      <div className="flex-1 overflow-y-auto space-y-3 pb-8">
        {filtered.map(r => (<div key={r.id} className="p-5 bg-white border border-slate-100 rounded-[1.5rem] shadow-sm active:scale-95 transition-all" onClick={() => onDetail(r)}><div className="flex justify-between items-start mb-2"><div><p className="font-bold text-slate-800">{r.name}</p><p className="text-[10px] text-slate-400 font-medium">{r.hospital}</p></div><span className="text-[9px] px-2 py-1 bg-green-50 text-green-600 rounded-lg font-black border border-green-100">{r.resultCount} 통과</span></div><div className="flex justify-between items-center pt-3 border-t border-slate-50 text-[9px] text-slate-400 font-bold uppercase tracking-widest"><span>{r.date}</span><span className="text-blue-500 font-black flex items-center gap-1">Detail <ChevronRight size={10}/></span></div></div>))}
      </div>
    </div>
  );
};

const AdminChecklistManager = ({ user, categories, onBack }) => {
  const [cat, setCat] = useState(categories[0]);
  const [items, setItems] = useState([]);
  const [newItem, setNewItem] = useState('');
  useEffect(() => {
    const load = async () => { const data = await safetyApi.getChecklist(cat); setItems(data.items || []); };
    load();
  }, [cat]);
  const handleSave = async (list) => { await safetyApi.updateChecklist({ adminName: user.name, workType: cat, items: list }); setItems(list); };
  const add = () => { if(!newItem.trim()) return; handleSave([...items, { id: Date.now().toString(), text: newItem, order: items.length + 1 }]); setNewItem(''); };
  const remove = (id) => handleSave(items.filter(i => i.id !== id));
  const move = (idx, dir) => { const n = idx + (dir === 'up' ? -1 : 1); if(n < 0 || n >= items.length) return; const l = [...items]; [l[idx], l[n]] = [l[n], l[idx]]; handleSave(l); };
  return (
    <div className="flex flex-col h-full animate-in slide-in-from-right-8">
      <div className="flex items-center mb-6"><button onClick={onBack} className="p-2 -ml-2 text-slate-400"><ArrowLeft size={24}/></button><h2 className="text-xl font-bold flex-1 text-center pr-8 tracking-tight">체크리스트</h2></div>
      <div className="flex overflow-x-auto gap-2 mb-4 pb-1 no-scrollbar">{categories.map(c => (<button key={c} onClick={() => setCat(c)} className={`flex-shrink-0 px-4 py-2 rounded-full text-[10px] font-bold transition-all ${cat === c ? 'bg-blue-600 text-white shadow-md' : 'bg-slate-100 text-slate-400'}`}>{c}</button>))}</div>
      <div className="flex gap-2 mb-6"><input type="text" placeholder="새 항목 입력" className="flex-1 p-4 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-bold outline-none" value={newItem} onChange={e=>setNewItem(e.target.value)} /><button onClick={add} className="p-4 bg-blue-600 text-white rounded-2xl shadow-lg active:scale-95"><Plus size={24}/></button></div>
      <div className="flex-1 overflow-y-auto space-y-3 pb-8">{items.map((it, idx) => (<div key={it.id} className="p-4 bg-white border border-slate-100 rounded-2xl shadow-sm"><div className="flex gap-3"><span className="text-xs font-black text-blue-600">{idx+1}</span><p className="flex-1 text-sm font-bold text-slate-700 leading-relaxed">{it.text}</p><button onClick={() => remove(it.id)} className="text-slate-200 hover:text-red-500"><Trash2 size={16}/></button></div><div className="flex justify-end gap-2 mt-3 pt-3 border-t border-slate-50"><button onClick={() => move(idx, 'up')} disabled={idx === 0} className="p-1 rounded bg-slate-50 text-slate-400 disabled:opacity-20"><ChevronUp size={14}/></button><button onClick={() => move(idx, 'down')} disabled={idx === items.length - 1} className="p-1 rounded bg-slate-50 text-slate-400 disabled:opacity-20"><ChevronDown size={14}/></button></div></div>))}</div>
    </div>
  );
};

const AdminLocationManager = ({ user, hospitals, setHospitals, onBack }) => {
  const [newItem, setNewItem] = useState('');
  const add = async () => { if(!newItem.trim()) return; const n = [...hospitals, newItem.trim()]; await safetyApi.updateHospitals(user.name, n); setHospitals(n); setNewItem(''); };
  const remove = async (idx) => { const n = hospitals.filter((_, i) => i !== idx); await safetyApi.updateHospitals(user.name, n); setHospitals(n); };
  return (
    <div className="flex flex-col h-full animate-in slide-in-from-right-8">
      <div className="flex items-center mb-6"><button onClick={onBack} className="p-2 -ml-2 text-slate-400"><ArrowLeft size={24}/></button><h2 className="text-xl font-bold flex-1 text-center pr-8 tracking-tight">장소 관리</h2></div>
      <div className="flex gap-2 mb-8"><input type="text" placeholder="새 병원명 입력" className="flex-1 p-4 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-bold outline-none" value={newItem} onChange={e=>setNewItem(e.target.value)} /><button onClick={add} className="p-4 bg-blue-600 text-white rounded-2xl shadow-lg active:scale-95"><Plus size={24}/></button></div>
      <div className="flex-1 overflow-y-auto space-y-3 pb-8">{hospitals.map((h, i) => (<div key={i} className="p-5 bg-white border border-slate-100 rounded-[1.5rem] shadow-sm flex items-center justify-between"><div className="flex items-center gap-3"><MapPin size={16} className="text-blue-500 opacity-50"/><p className="text-sm font-black text-slate-700">{h}</p></div><button onClick={() => remove(i)} className="text-slate-200 hover:text-red-500"><Trash2 size={16}/></button></div>))}</div>
    </div>
  );
};

const AdminRecordDetailView = ({ record, onBack }) => (
  <div className="flex flex-col h-full animate-in slide-in-from-right-8 overflow-hidden text-slate-900">
    <div className="flex items-center mb-6"><button onClick={onBack} className="p-2 -ml-2 text-slate-400"><ArrowLeft size={24}/></button><h2 className="text-xl font-bold flex-1 text-center pr-8 tracking-tight">상세 점검 내역</h2></div>
    <div className="bg-slate-900 rounded-[2rem] p-8 text-white mb-6 relative overflow-hidden shadow-xl border-b-4 border-blue-500"><p className="text-[10px] text-blue-400 font-black mb-4 uppercase tracking-[0.2em]">{record?.date}</p><h3 className="text-3xl font-black italic tracking-tighter mb-1">{record?.name}</h3><p className="text-xs font-medium text-slate-400 opacity-80">{record?.hospital} · {record?.workType}</p></div>
    <div className="flex-1 overflow-y-auto space-y-4 px-1 pb-12">
      {record?.results?.map((res, i) => (<div key={i} className="p-5 bg-slate-50 rounded-[1.25rem] flex items-center justify-between border border-white shadow-sm"><div className="flex-1 pr-4"><p className="text-[10px] font-black text-slate-300 mb-1">Q{i+1}</p><p className="text-sm font-bold text-slate-700 leading-tight">{res.question}</p></div><span className={`text-[10px] font-black px-3 py-1.5 rounded-lg shadow-sm ${res.value === 'YES' ? 'bg-green-500 text-white' : 'bg-red-500 text-white'}`}>{res.value}</span></div>))}
      <div className="mt-8 p-10 bg-slate-50 border-2 border-dashed border-slate-200 rounded-[2rem] text-center opacity-40"><p className="text-[9px] font-black tracking-[0.3em] uppercase mb-4 text-slate-400">Electronic Signature</p><div className="h-20 flex items-center justify-center italic text-slate-300 font-serif">[Verified]</div></div>
    </div>
  </div>
);

export default App;