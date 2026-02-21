import axios from 'axios';

// FastAPI 백엔드 서버 주소 (기본: 외부 접근 IP, 필요 시 .env의 VITE_API_BASE_URL로 덮어쓰기)
const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || 'https://safety-backend-ryzxipd66a-du.a.run.app/api/v1').trim();

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: { 'Content-Type': 'application/json' },
  timeout: 10000,
});

const downloadNameCounter = new Map();

function makeIncrementedFileName(fileName) {
  const safeName = fileName || 'safety_report.xlsx';
  const dot = safeName.lastIndexOf('.');
  const base = dot > 0 ? safeName.slice(0, dot) : safeName;
  const ext = dot > 0 ? safeName.slice(dot) : '';

  const current = downloadNameCounter.get(safeName) || 0;
  downloadNameCounter.set(safeName, current + 1);

  if (current === 0) return safeName;
  return `${base}_${current}${ext}`;
}

/**
 * 안전 점검 시스템 API 서비스 모듈
 */
export const safetyApi = {
  // --- 1. 공통 및 사용자 설정 조회 ---

  loginUser: async (payload) => {
    // payload: { name, phoneLast4 }
    try {
      const response = await api.post('/users/login', payload);
      return response.data;
    } catch (error) {
      console.error('로그인 실패:', error);
      throw error;
    }
  },

  // 작업 장소(병원) 목록 조회
  getHospitals: async () => {
    try {
      const response = await api.get('/settings/hospitals');
      return response.data;
    } catch (error) {
      console.error('장소 목록 로딩 실패:', error);
      return {
        hospitals: ["서울대병원", "아산병원", "삼성서울병원", "세브란스병원", "경희대병원"]
      };
    }
  },

  // 카테고리별 체크리스트 조회
  getChecklist: async (workType) => {
    try {
      const response = await api.get(`/checklists/${encodeURIComponent(workType)}`);
      return response.data;
    } catch (error) {
      console.error('체크리스트 로딩 실패:', error);
      return {
        items: [
          { id: "1", text: "작업 전 안전 보호구(헬멧, 안전화 등)를 착용하였는가?", order: 1, code: "a" },
          { id: "2", text: "작업 전 본인의 건강 상태는 양호한가?", order: 2, code: "b" },
          { id: "3", text: "사용할 공구 및 장비의 육안 점검을 실시하였는가?", order: 3, code: "c" },
          { id: "4", text: "사전 안전수칙 및 작업 절차를 숙지하였는가?", order: 4, code: "d" },
          { id: "5", text: "작업장 주변 정리정돈 및 위험 요소 제거를 완료했는가?", order: 5, code: "e" }
        ]
      };
    }
  },

  // --- 2. 점검 결과 제출 (User) ---

  // 점검표 및 서명 데이터 제출
  // inspectionData 구조:
  // {
  //   userName, date, hospital, equipmentName, workType,
  //   checklistVersion, answers: [{itemId, question, value, comment?}], signatureBase64
  // }
  submitInspection: async (inspectionData) => {
    try {
      const response = await api.post('/inspections', inspectionData);
      return response.data;
    } catch (error) {
      console.error('점검 결과 제출 실패:', error);
      // 백엔드에서 "점검 필요 내용을 기재해주세요"를 400으로 보낼 수 있음
      // 프론트에서 제출 전 검증으로 팝업 띄우는 방식이 UX 최선.
      throw error;
    }
  },

  // --- 2-1. 유저 내 점검 내역 (추후 App.jsx에서 메뉴 연결) ---

  // 내 점검 목록: 날짜 + 상태 + 개선필요 개수 (+ 병원/장비)
  getMyInspections: async (params) => {
    // params: { userName, start_date?, end_date? }
    try {
      const response = await api.get('/me/inspections', { params });
      return response.data;
    } catch (error) {
      console.error('내 점검 내역 조회 실패:', error);
      return [];
    }
  },

  // 내 점검 상세(최신 revision)
  getMyInspectionDetail: async (params) => {
    // params: { userName, date, hospital, equipmentName? }
    try {
      const response = await api.get('/me/inspections/detail', { params });
      return response.data;
    } catch (error) {
      console.error('내 점검 상세 조회 실패:', error);
      throw error;
    }
  },

  // (선택) 내 점검 취소 - 삭제가 아니라 status만 CANCELLED로 변경
  cancelMyInspection: async (payload) => {
    // payload: { userName, date, hospital, equipmentName? }
    try {
      const response = await api.post('/me/inspections/cancel', payload);
      return response.data;
    } catch (error) {
      console.error('점검 취소 실패:', error);
      throw error;
    }
  },

  // 내 점검 재제출(기존 레코드에 revision 추가)
  resubmitMyInspection: async (payload) => {
    // payload: { userName, date, hospital, equipmentName?, answers, signatureBase64? }
    try {
      const response = await api.post('/me/inspections/resubmit', payload);
      return response.data;
    } catch (error) {
      console.error('점검 재제출 실패:', error);
      throw error;
    }
  },

  // --- 3. 관리자 전용 기능 (Admin) ---


  getSubadmins: async () => {
    const response = await api.get('/subadmins');
    return response.data;
  },

  createSubadmin: async (payload) => {
    const response = await api.post('/subadmins', payload);
    return response.data;
  },

  updateSubadmin: async (id, payload) => {
    const response = await api.put(`/subadmins/${id}`, payload);
    return response.data;
  },

  deleteSubadmin: async (id) => {
    const response = await api.delete(`/subadmins/${id}`);
    return response.data;
  },

  // 전체 점검 내역 조회 (필터링 포함)
  getInspections: async (params) => {
    try {
      const response = await api.get('/inspections', { params });
      return response.data;
    } catch (error) {
      console.error('점검 기록 조회 실패:', error);
      if (error.response && error.response.status === 403) {
        throw new Error('관리자 권한이 없습니다.');
      }
      return [];
    }
  },

  // 점검 기록 엑셀 다운로드 (아직 mock)
  exportInspections: async (params) => {
    try {
      const response = await api.get('/inspections/export', {
        params,
        responseType: 'blob',
      });

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;

      const disposition = response.headers?.['content-disposition'] || '';
      const match = disposition.match(/filename="?([^";]+)"?/i);
      const serverFileName = match?.[1] || `safety_report_${new Date().getTime()}.xlsx`;
      link.setAttribute('download', makeIncrementedFileName(serverFileName));

      document.body.appendChild(link);
      link.click();

      link.parentNode.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('엑셀 다운로드 실패:', error);
      throw error;
    }
  },

  // (SUBADMIN) 승인/반려
  approveInspection: async (id, payload) => {
    // payload: { subadminName?, signatureBase64? }
    const response = await api.post(`/inspections/${id}/approve`, payload || {});
    return response.data;
  },

  rejectInspection: async (id, payload) => {
    // payload: { subadminName?, reason? }
    const response = await api.post(`/inspections/${id}/reject`, payload || {});
    return response.data;
  },

  // 체크리스트 항목 수정/업데이트 (in-memory 반영)
  updateChecklist: async (data) => {
    try {
      const response = await api.post('/checklists', data);
      return response.data;
    } catch (error) {
      console.error('체크리스트 업데이트 실패:', error);
      throw error;
    }
  },

  // 작업 장소 목록 수정/업데이트 (in-memory 반영)
  updateHospitals: async (adminName, hospitals) => {
    try {
      const response = await api.post('/settings/hospitals', { adminName, hospitals });
      return response.data;
    } catch (error) {
      console.error('장소 목록 업데이트 실패:', error);
      throw error;
    }
  }
};

export default api;
