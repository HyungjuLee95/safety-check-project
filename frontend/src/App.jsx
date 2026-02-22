// frontend/src/App.jsx
import React, { useEffect, useState } from 'react';
import { safetyApi } from './services/api';

import PhoneFrame from './components/PhoneFrame';
import LoadingOverlay from './components/LoadingOverlay';

import LoginView from './pages/LoginView';
import HomeView from './pages/HomeView';
import SetupView from './pages/SetupView';
import InspectionView from './pages/InspectionView';
import SignatureView from './pages/SignatureView';
import CompleteView from './pages/CompleteView';

import MyRecordsView from './pages/my/MyRecordsView';
import MyRecordDetailView from './pages/my/MyRecordDetailView';

import AdminHomeView from './pages/admin/AdminHomeView';
import AdminRecordsView from './pages/admin/AdminRecordsView';
import AdminChecklistManager from './pages/admin/AdminChecklistManager';
import AdminLocationManager from './pages/admin/AdminLocationManager';
import AdminSubadminManager from './pages/admin/AdminSubadminManager';
import AdminWorkTypeManager from './pages/admin/AdminWorkTypeManager';
import AdminRecordDetailView from './pages/admin/AdminRecordDetailView';

// ✅ SUBADMIN
import SubAdminHomeView from './pages/subadmin/SubAdminHomeView';
import SubAdminRecordsView from './pages/subadmin/SubAdminRecordsView';

import { normalizeToUiValue } from './utils/inspectionFormat';

const App = () => {
  const [view, setView] = useState('login');
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  // 서버 데이터
  const [hospitals, setHospitals] = useState([]);
  const [records, setRecords] = useState([]); // admin/subadmin records
  const [subadmins, setSubadmins] = useState([]);
  const [selectedRecord, setSelectedRecord] = useState(null);

  // 내 점검 내역
  const [myRecords, setMyRecords] = useState([]);
  const [mySelected, setMySelected] = useState(null);

  // 수정 모드 컨텍스트
  const [editContext, setEditContext] = useState(null);

  // 작업 종류
  const [workTypes, setWorkTypes] = useState(['X-ray 설치작업', 'MR 설치작업', 'CT 작업', '정기 유지보수']);

  // 점검 진행 상태
  const [setupData, setSetupData] = useState({
    hospital: '',
    equipmentName: '',
    workType: '',
    date: new Date().toISOString().split('T')[0],
  });

  // 임시: inspect->signature로 넘길 results 보관
  const [tempResults, setTempResults] = useState(null);

  // 1) 초기 설정 데이터 로딩
  useEffect(() => {
    const init = async () => {
      try {
        const [hospitalData, workTypeData] = await Promise.all([
          safetyApi.getHospitals(),
          safetyApi.getWorkTypes(),
        ]);
        setHospitals(hospitalData.hospitals || []);
        setWorkTypes(workTypeData.workTypes || []);
      } catch (e) {
        console.error(e);
      }
    };
    init();
  }, []);

  // ✅ 공통: admin/subadmin 화면 진입 시 기록 로딩
  const fetchAdminLikeRecords = async () => {
    if (!user?.name) return;
    setIsLoading(true);
    try {
      const now = new Date();
      const start = new Date(now.setMonth(now.getMonth() - 1)).toISOString().split('T')[0];
      const end = new Date().toISOString().split('T')[0];

      const data = await safetyApi.getInspections({
        admin_name: user.name,
        start_date: start,
        end_date: end,
        requester_role: user?.role,
        requester_categories: (user?.categories || []).join(','),
      });
      setRecords(data || []);
    } catch (e) {
      console.error(e);
      setRecords([]);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchSubadmins = async () => {
    if (!user?.isMasterAdmin) return;
    setIsLoading(true);
    try {
      const data = await safetyApi.getSubadmins();
      setSubadmins(data?.subadmins || []);
    } catch (e) {
      console.error(e);
      setSubadmins([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (!user?.isWorker || view !== 'home') return;

    const loadWorkerStats = async () => {
      try {
        const data = await safetyApi.getMyInspections({ userName: user.name });
        setMyRecords(data || []);
      } catch (e) {
        console.error(e);
      }
    };

    loadWorkerStats();
  }, [user, view]);

  useEffect(() => {
    const isAdminLike = Boolean(user?.isMasterAdmin || user?.isSubAdmin);

    if (!isAdminLike) return;

    if (
      view === 'admin_home' ||
      view === 'admin_records' ||
      view === 'subadmin_home' ||
      view === 'subadmin_records' ||
      view === 'admin_record_detail' ||
      view === 'subadmin_record_detail'
    ) {
      fetchAdminLikeRecords();
    }

    if (view === 'admin_subadmins') {
      fetchSubadmins();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, view]);

  // 로그인
  const handleLogin = async (name, phoneLast4) => {
    setIsLoading(true);
    try {
      const loggedInUser = await safetyApi.loginUser({ name, phoneLast4 });
      setUser(loggedInUser);

      if (loggedInUser?.isMasterAdmin) setView('admin_home');
      else if (loggedInUser?.isSubAdmin) setView('subadmin_home');
      else {
        const myData = await safetyApi.getMyInspections({ userName: loggedInUser.name });
        setMyRecords(myData || []);
        setView('home');
      }
    } catch (e) {
      console.error(e);
      const msg = e?.response?.data?.detail;
      alert(msg || '로그인 실패');
    } finally {
      setIsLoading(false);
    }
  };

  // 로그아웃
  const handleLogout = () => {
    setUser(null);
    setView('login');

    setRecords([]);
    setSubadmins([]);
    setSelectedRecord(null);

    setMyRecords([]);
    setMySelected(null);

    setEditContext(null);
    setTempResults(null);
  };

  // 내 점검 목록 로드
  const fetchMyRecords = async () => {
    if (!user?.name) return;

    setIsLoading(true);
    try {
      const data = await safetyApi.getMyInspections({ userName: user.name });
      setMyRecords(data || []);
    } catch (e) {
      console.error(e);
      setMyRecords([]);
    } finally {
      setIsLoading(false);
    }
  };

  // 내 점검 상세 로드
  const fetchMyDetail = async ({ date, hospital, equipmentName }) => {
    if (!user?.name) return;

    setIsLoading(true);
    try {
      const detail = await safetyApi.getMyInspectionDetail({
        userName: user.name,
        date,
        hospital,
        equipmentName,
      });
      setMySelected(detail);
      setView('my_record_detail');
    } catch (e) {
      console.error(e);
      alert('상세 조회 실패');
    } finally {
      setIsLoading(false);
    }
  };

  // 제출
  const handleInspectionSubmit = async (answers, signatureBase64) => {
    setIsLoading(true);
    try {
      if (editContext) {
        await safetyApi.resubmitMyInspection({
          userName: user.name,
          date: setupData.date,
          hospital: setupData.hospital,
          equipmentName: setupData.equipmentName,
          answers,
          signatureBase64,
        });
      } else {
        await safetyApi.submitInspection({
          userName: user.name,
          date: setupData.date,
          hospital: setupData.hospital,
          equipmentName: setupData.equipmentName,
          workType: setupData.workType,
          checklistVersion: 1,
          answers,
          signatureBase64,
        });
      }

      setEditContext(null);
      setTempResults(null);
      setView('complete');
    } catch (err) {
      const msg = err?.response?.data?.detail;
      alert(msg || '제출 실패');
    } finally {
      setIsLoading(false);
    }
  };

  // 내역 상세 -> 수정하기 진입
  const startEditFromMyDetail = () => {
    if (!mySelected?.latestRevision) return;

    const latest = mySelected.latestRevision;
    const initialAnswers = (latest.answers || []).map((a) => ({
      itemId: a.itemId,
      question: a.question,
      value: normalizeToUiValue(a.value),
      comment: a.comment || '',
    }));

    setEditContext({ initialAnswers });

    setSetupData({
      hospital: mySelected.hospital,
      equipmentName: mySelected.equipmentName || '',
      workType: mySelected.workType,
      date: mySelected.date,
    });

    setView('inspect');
  };

  // inspect 완료 -> signature로
  const goSignature = (resultsPayload) => {
    setTempResults(resultsPayload);
    setView('signature');
  };

// ✅ SUBADMIN 승인/반려 핸들러 (서명 포함)
const handleApprove = async ({ inspectionId, subadminName, signatureBase64 }) => {
  // ✅ 서명 누락이면 요청 자체를 막기 (422 방지)
  if (!signatureBase64 || String(signatureBase64).trim().length < 50) {
    alert('서명이 누락되었습니다. 서명을 다시 입력해주세요.');
    console.log('[approve] missing signatureBase64', { inspectionId, subadminName, signatureBase64 });
    return;
  }
  if (!subadminName || !String(subadminName).trim()) {
    alert('서브관리자 이름이 누락되었습니다.');
    return;
  }

  setIsLoading(true);
  try {
    await safetyApi.approveInspection(inspectionId, { subadminName, signatureBase64, subadminCategories: user?.isMasterAdmin ? [] : (user?.categories || []) });
    alert('승인 처리되었습니다.');

    // 처리 완료 후 목록 재조회 + 상세 화면 이탈(중복 처리 방지)
    await fetchAdminLikeRecords();
    setSelectedRecord(null);
    setView('subadmin_records');
  } catch (e) {
    console.error(e);
    const msg = e?.response?.data?.detail;
    alert(msg || '승인 실패');
  } finally {
    setIsLoading(false);
  }
};

const handleReject = async ({ inspectionId, subadminName, reason }) => {
  if (!subadminName || !String(subadminName).trim()) {
    alert('서브관리자 이름이 누락되었습니다.');
    return;
  }

  setIsLoading(true);
  try {
    await safetyApi.rejectInspection(inspectionId, { subadminName, reason, subadminCategories: user?.isMasterAdmin ? [] : (user?.categories || []) });
    alert('반려 처리되었습니다.');

    // 처리 완료 후 목록 재조회 + 상세 화면 이탈(중복 처리 방지)
    await fetchAdminLikeRecords();
    setSelectedRecord(null);
    setView('subadmin_records');
  } catch (e) {
    console.error(e);
    const msg = e?.response?.data?.detail;
    alert(msg || '반려 실패');
  } finally {
    setIsLoading(false);
  }
};

  return (
    <PhoneFrame>
      <LoadingOverlay isLoading={isLoading} />

      {/* 로그인 */}
      {view === 'login' && <LoginView onLogin={handleLogin} />}

      {/* 사용자 홈 */}
      {view === 'home' && (
        <HomeView
          user={user}
          stats={{
            total: myRecords.length,
            today: myRecords.filter((r) => r.date === new Date().toISOString().split('T')[0]).length,
            pending: myRecords.filter((r) => String(r.status || '').toUpperCase() === 'PENDING').length,
          }}
          onStart={() => {
            setEditContext(null);
            setTempResults(null);
            setView('setup');
          }}
          onMyRecords={async () => {
            await fetchMyRecords();
            setView('my_records');
          }}
          onLogout={handleLogout}
        />
      )}

      {/* 점검 정보 입력 */}
      {view === 'setup' && (
        <SetupView
          hospitals={hospitals}
          workTypes={workTypes}
          onBack={() => setView('home')}
          onNext={(data) => {
            setSetupData(data);
            setEditContext(null);
            setTempResults(null);
            setView('inspect');
          }}
        />
      )}

      {/* 점검 작성 */}
      {view === 'inspect' && (
        <InspectionView
          workType={setupData.workType}
          setup={setupData}
          initialAnswers={editContext?.initialAnswers || null}
          onBack={() => {
            if (editContext) setView('my_record_detail');
            else setView('setup');
          }}
          onFinish={goSignature}
        />
      )}

      {/* 서명 */}
      {view === 'signature' && (
        <SignatureView
          onBack={() => setView('inspect')}
          onFinish={(sig) => handleInspectionSubmit(tempResults, sig)}
        />
      )}

      {/* 완료 */}
      {view === 'complete' && <CompleteView onDone={() => setView('home')} />}

      {/* 내 점검 내역 */}
      {view === 'my_records' && (
        <MyRecordsView
          user={user}
          records={myRecords}
          onBack={() => setView('home')}
          onRefresh={fetchMyRecords}
          onDetail={fetchMyDetail}
        />
      )}

      {/* 내 점검 상세 */}
      {view === 'my_record_detail' && (
        <MyRecordDetailView
          user={user}
          detail={mySelected}
          onBack={() => setView('my_records')}
          onEdit={startEditFromMyDetail}
        />
      )}

      {/* 관리자 홈 */}
      {view === 'admin_home' && (
        <AdminHomeView user={user} records={records} setView={setView} onLogout={handleLogout} />
      )}

      {/* 관리자 기록 */}
      {view === 'admin_records' && (
        <AdminRecordsView
          user={user}
          records={records}
          onBack={() => setView('admin_home')}
          onDetail={(r) => {
            setSelectedRecord(r);
            setView('admin_record_detail');
          }}
        />
      )}


      {/* 관리자 점검 업무 */}
      {view === 'admin_work_types' && (
        <AdminWorkTypeManager
          user={user}
          workTypes={workTypes}
          setWorkTypes={setWorkTypes}
          onBack={() => setView('admin_home')}
        />
      )}

      {/* 관리자 체크리스트 */}
      {view === 'admin_checklist' && (
        <AdminChecklistManager user={user} categories={workTypes} onBack={() => setView('admin_home')} />
      )}

      {/* 관리자 장소 */}
      {view === 'admin_locations' && (
        <AdminLocationManager
          user={user}
          hospitals={hospitals}
          setHospitals={setHospitals}
          onBack={() => setView('admin_home')}
        />
      )}

      {view === 'admin_subadmins' && (
        <AdminSubadminManager
          categories={workTypes}
          subadmins={subadmins}
          onRefresh={fetchSubadmins}
          onBack={() => setView('admin_home')}
          onCreate={async (payload) => {
            await safetyApi.createSubadmin(payload);
            await fetchSubadmins();
          }}
          onUpdate={async (id, payload) => {
            await safetyApi.updateSubadmin(id, payload);
            await fetchSubadmins();
          }}
          onDelete={async (id) => {
            await safetyApi.deleteSubadmin(id);
            await fetchSubadmins();
          }}
        />
      )}

      {/* ✅ 관리자 상세 */}
      {view === 'admin_record_detail' && (
        <AdminRecordDetailView
          user={user}
          record={selectedRecord}
          onBack={() => setView('admin_records')}
          onApprove={handleApprove}
          onReject={handleReject}
        />
      )}

      {/* ✅ 서브관리자 홈 */}
      {view === 'subadmin_home' && (
        <SubAdminHomeView
          records={records}
          setView={setView}
          onLogout={handleLogout}
        />
      )}

      {/* ✅ 서브관리자 목록 */}
      {view === 'subadmin_records' && (
        <SubAdminRecordsView
          records={records}
          onBack={() => setView('subadmin_home')}
          onDetail={(r) => {
            setSelectedRecord(r);
            setView('subadmin_record_detail');
          }}
        />
      )}

      {/* ✅ 서브관리자 상세: AdminRecordDetailView 재사용 + 승인/반려 연결 */}
      {view === 'subadmin_record_detail' && (
        <AdminRecordDetailView
          user={user}
          record={selectedRecord}
          onBack={() => setView('subadmin_records')}
          onApprove={handleApprove}
          onReject={handleReject}
        />
      )}
    </PhoneFrame>
  );
};

export default App;
