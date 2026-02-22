import axios from 'axios';

function resolveDefaultApiBaseUrl() {
  if (typeof window === 'undefined') {
    return 'http://localhost:8000/api/v1';
  }

  const { protocol, hostname } = window.location;
  const isLocalhost = hostname === 'localhost' || hostname === '127.0.0.1';
  const apiHost = isLocalhost ? 'localhost' : hostname;

  return `${protocol}//${apiHost}:8000/api/v1`;
}

// VITE_API_BASE_URL가 있으면 우선 사용하고, 없으면 현재 접속 호스트 기준으로 API 주소를 계산한다.
const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || resolveDefaultApiBaseUrl()).trim();

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
    try {
      const response = await api.post('/users/login', payload);
      return response.data;
    } catch (error) {
      console.error('로그인 실패:', error);
      throw error;
    }
  },

  getHospitals: async () => {
    try {
      const response = await api.get('/settings/hospitals');
      return response.data;
    } catch (error) {
      console.error('장소 목록 로딩 실패:', error);
      return {
        hospitals: ['서울대병원', '아산병원', '삼성서울병원', '세브란스병원', '경희대병원'],
      };
    }
  },

  getWorkTypes: async () => {
    try {
      const response = await api.get('/settings/work-types');
      return response.data;
    } catch (error) {
      console.error('점검 업무 목록 로딩 실패:', error);
      return {
        workTypes: ['X-ray 설치작업', 'MR 설치작업', 'CT 작업', '정기 유지보수'],
      };
    }
  },

  getChecklist: async (workType) => {
    try {
      const response = await api.get(`/checklists/${encodeURIComponent(workType)}`);
      return response.data;
    } catch (error) {
      console.error('체크리스트 로딩 실패:', error);
      return {
        items: [
          { id: '1', text: '작업 전 안전 보호구(헬멧, 안전화 등)를 착용하였는가?', order: 1, code: 'a' },
          { id: '2', text: '작업 전 본인의 건강 상태는 양호한가?', order: 2, code: 'b' },
          { id: '3', text: '사용할 공구 및 장비의 육안 점검을 실시하였는가?', order: 3, code: 'c' },
          { id: '4', text: '사전 안전수칙 및 작업 절차를 숙지하였는가?', order: 4, code: 'd' },
          { id: '5', text: '작업장 주변 정리정돈 및 위험 요소 제거를 완료했는가?', order: 5, code: 'e' },
        ],
      };
    }
  },

  // --- 2. 점검 결과 제출 (User) ---
  submitInspection: async (inspectionData) => {
    try {
      const response = await api.post('/inspections', inspectionData);
      return response.data;
    } catch (error) {
      console.error('점검 결과 제출 실패:', error);
      throw error;
    }
  },

  // --- 2-1. 유저 내 점검 내역 ---
  getMyInspections: async (params) => {
    try {
      const response = await api.get('/me/inspections', { params });
      return response.data;
    } catch (error) {
      console.error('내 점검 내역 조회 실패:', error);
      return [];
    }
  },

  getMyInspectionDetail: async (params) => {
    try {
      const response = await api.get('/me/inspections/detail', { params });
      return response.data;
    } catch (error) {
      console.error('내 점검 상세 조회 실패:', error);
      throw error;
    }
  },

  cancelMyInspection: async (payload) => {
    try {
      const response = await api.post('/me/inspections/cancel', payload);
      return response.data;
    } catch (error) {
      console.error('점검 취소 실패:', error);
      throw error;
    }
  },

  resubmitMyInspection: async (payload) => {
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

  // 점검 기록 PDF 다운로드
  exportInspections: async (params) => {
    try {
      const response = await api.get('/inspections/export-pdf', {
        params,
        responseType: 'blob',
      });

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;

      const disposition = response.headers?.['content-disposition'] || '';
      const match = disposition.match(/filename="?([^";]+)"?/i);
      const serverFileName = match?.[1] || `safety_report_${new Date().getTime()}.pdf`;
      link.setAttribute('download', makeIncrementedFileName(serverFileName));

      document.body.appendChild(link);
      link.click();

      link.parentNode.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('PDF 다운로드 실패:', error);
      throw error;
    }
  },

  approveInspection: async (id, payload) => {
    const response = await api.post(`/inspections/${id}/approve`, payload || {});
    return response.data;
  },

  rejectInspection: async (id, payload) => {
    const response = await api.post(`/inspections/${id}/reject`, payload || {});
    return response.data;
  },

  updateChecklist: async (data) => {
    try {
      const response = await api.post('/checklists', data);
      return response.data;
    } catch (error) {
      console.error('체크리스트 업데이트 실패:', error);
      throw error;
    }
  },

  updateHospitals: async (adminName, hospitals) => {
    try {
      const response = await api.post('/settings/hospitals', { adminName, hospitals });
      return response.data;
    } catch (error) {
      console.error('장소 목록 업데이트 실패:', error);
      throw error;
    }
  },

  // 점검 업무 목록 수정/업데이트
  updateWorkTypes: async (adminName, workTypes) => {
    try {
      const response = await api.post('/settings/work-types', { adminName, workTypes });
      return response.data;
    } catch (error) {
      console.error('점검 업무 목록 업데이트 실패:', error);
      throw error;
    }
  },
};

export default api;
