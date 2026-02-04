import axios from 'axios';

// FastAPI 백엔드 서버 주소 (로컬 개발 환경 기준)
// 실제 배포 시에는 환경 변수(process.env.REACT_APP_API_URL 등)로 관리하는 것이 좋습니다.
const API_BASE_URL = 'http://localhost:8000/api/v1';

// Axios 인스턴스 생성 (공통 설정)
const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  // 타임아웃 설정 (선택 사항, 예: 10초)
  timeout: 10000, 
});

/**
 * 안전 점검 시스템 API 서비스 모듈
 */
export const safetyApi = {
  // --- 1. 공통 및 사용자 설정 조회 ---

  // 작업 장소(병원) 목록 조회
  getHospitals: async () => {
    try {
      const response = await api.get('/settings/hospitals');
      return response.data;
    } catch (error) {
      console.error('장소 목록 로딩 실패:', error);
      // 서버가 꺼져있거나 에러 발생 시, 앱이 멈추지 않도록 기본값 반환 (Fallback)
      return { 
        hospitals: ["서울대병원", "아산병원", "삼성서울병원", "세브란스병원", "경희대병원"] 
      };
    }
  },

  // 카테고리별 체크리스트 조회
  getChecklist: async (workType) => {
    try {
      // workType에 한글이나 특수문자가 포함될 수 있으므로 인코딩 처리
      const response = await api.get(`/checklists/${encodeURIComponent(workType)}`);
      return response.data;
    } catch (error) {
      console.error('체크리스트 로딩 실패:', error);
      // 에러 발생 시 기본 항목 반환
      return { 
        items: [
          { id: "1", text: "작업 전 안전 보호구(헬멧, 안전화 등)를 착용하였는가?", order: 1 },
          { id: "2", text: "작업 전 본인의 건강 상태는 양호한가?", order: 2 },
          { id: "3", text: "사용할 공구 및 장비의 육안 점검을 실시하였는가?", order: 3 },
          { id: "4", text: "사전 안전수칙 및 작업 절차를 숙지하였는가?", order: 4 },
          { id: "5", text: "작업장 주변 정리정돈 및 위험 요소 제거를 완료했는가?", order: 5 }
        ] 
      };
    }
  },

  // --- 2. 점검 결과 제출 (User) ---

  // 점검표 및 서명 데이터 제출
  submitInspection: async (inspectionData) => {
    try {
      // inspectionData 구조: { userName, date, hospital, workType, checklistVersion, answers, signatureBase64 }
      const response = await api.post('/inspections', inspectionData);
      return response.data;
    } catch (error) {
      console.error('점검 결과 제출 실패:', error);
      throw error; // UI 컴포넌트에서 에러 처리를 할 수 있도록 throw
    }
  },

  // --- 3. 관리자 전용 기능 (Admin) ---

  // 전체 점검 내역 조회 (필터링 포함)
  getInspections: async (params) => {
    try {
      // params 구조: { admin_name, start_date, end_date, user_name, hospital }
      const response = await api.get('/inspections', { params });
      return response.data;
    } catch (error) {
      console.error('점검 기록 조회 실패:', error);
      // 권한 없음(403) 등의 에러 처리는 UI단에서 수행하도록 에러 전파
      if (error.response && error.response.status === 403) {
        throw new Error('관리자 권한이 없습니다.');
      }
      return []; // 일반 에러 시 빈 배열 반환하여 렌더링 오류 방지
    }
  },

  // 점검 기록 엑셀 다운로드
  exportInspections: async (params) => {
    try {
      const response = await api.get('/inspections/export', {
        params,
        // 중요: 엑셀 파일(바이너리 데이터)을 받기 위해 responseType을 blob으로 설정
        responseType: 'blob',
      });
      
      // 브라우저에서 파일 다운로드 트리거
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      // 파일명 설정 (예: safety_report_timestamp.xlsx)
      link.setAttribute('download', `safety_report_${new Date().getTime()}.xlsx`);
      document.body.appendChild(link);
      link.click();
      
      // 클린업
      link.parentNode.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('엑셀 다운로드 실패:', error);
      throw error;
    }
  },

  // 체크리스트 항목 수정/업데이트
  updateChecklist: async (data) => {
    try {
      // data 구조: { adminName, workType, items: [...] }
      const response = await api.post('/checklists', data);
      return response.data;
    } catch (error) {
      console.error('체크리스트 업데이트 실패:', error);
      throw error;
    }
  },

  // 작업 장소 목록 수정/업데이트
  updateHospitals: async (adminName, hospitals) => {
    try {
      // hospitals: ["병원1", "병원2", ...]
      const response = await api.post('/settings/hospitals', { adminName, hospitals });
      return response.data;
    } catch (error) {
      console.error('장소 목록 업데이트 실패:', error);
      throw error;
    }
  }
};

export default api;