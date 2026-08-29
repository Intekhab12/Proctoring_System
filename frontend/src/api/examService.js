import axiosInstance from './axiosInstance';

const examService = {
  // Exams
  getAllExams: () => axiosInstance.get('/api/exams/'),
  getExam: (id) => axiosInstance.get(`/api/exams/${id}/`),
  createExam: (data) => axiosInstance.post('/api/exams/', data),
  updateExam: (id, data) => axiosInstance.put(`/api/exams/${id}/`, data),
  patchExam: (id, data) => axiosInstance.patch(`/api/exams/${id}/`, data),
  deleteExam: (id) => axiosInstance.delete(`/api/exams/${id}/`),
  publishExam: (id) => axiosInstance.patch(`/api/exams/${id}/publish/`),
  getShareLink: (id) => axiosInstance.get(`/api/exams/${id}/share-link/`),

  // Questions
  getQuestions: (examId) => axiosInstance.get(`/api/exams/${examId}/questions/`),
  addQuestion: (examId, formData) => axiosInstance.post(`/api/exams/${examId}/questions/`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  }),
  updateQuestion: (examId, questionId, formData) => axiosInstance.patch(`/api/exams/${examId}/questions/${questionId}/`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  }),
  deleteQuestion: (examId, questionId) => axiosInstance.delete(`/api/exams/${examId}/questions/${questionId}/`),

  // Eligibility
  getEligibilities: (examId) => axiosInstance.get(`/api/exams/${examId}/eligibility/`),
  addEligibility: (examId, data) => axiosInstance.post(`/api/exams/${examId}/eligibility/`, data),
  uploadEligibilityCSV: (examId, file) => {
    const formData = new FormData();
    formData.append('file', file);
    return axiosInstance.post(`/api/exams/${examId}/eligibility/csv/`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
  },
  deleteEligibility: (examId, id) => axiosInstance.delete(`/api/exams/${examId}/eligibility/${id}/`),

  // Candidate
  getCandidateExams: () => axiosInstance.get('/api/candidate/exams/'),
  getAvailableExams: () => axiosInstance.get('/api/exams/candidate/available-exams/'),
  getCandidateExamStatus: (examId) => axiosInstance.get(`/api/exams/${examId}/candidate-status/`),
  registerForExam: (examId) => axiosInstance.post(`/api/exams/${examId}/register/`),
  getExamToTake: (examId) => axiosInstance.get(`/api/exams/${examId}/take/`),
  saveAnswer: (submissionId, questionId, textAnswer, whiteboardData) => axiosInstance.post(`/api/exams/submissions/${submissionId}/answers/`, { question_id: questionId, text_answer: textAnswer, whiteboard_data: whiteboardData }),
  submitExam: (submissionId) => axiosInstance.post(`/api/exams/submissions/${submissionId}/submit/`),

  // Evaluation
  getExamSubmissions: (examId) => axiosInstance.get(`/api/exams/${examId}/submissions/`),
  getSubmissionDetail: (submissionId) => axiosInstance.get(`/api/exams/submissions/${submissionId}/`),
  gradeAnswer: (answerId, data) => axiosInstance.patch(`/api/exams/answers/${answerId}/`, data),
  saveDraftGrades: (submissionId, data = {}) => axiosInstance.post(`/api/exams/submissions/${submissionId}/save-grades/`, data),
  publishResults: (submissionId, data = {}) => axiosInstance.post(`/api/exams/submissions/${submissionId}/publish/`, data),
  publishAllResults: (examId) => axiosInstance.post(`/api/exams/${examId}/publish-all-results/`),

  // Proctoring
  logProctoringIncident: (data) => axiosInstance.post('/api/exams/proctoring/logs/', data),
  getProctoringLogs: (submissionId) => axiosInstance.get(`/api/exams/submissions/${submissionId}/logs/`),
  uploadProctoringScreenshot: (formData) => axiosInstance.post('/api/exams/proctoring/screenshot/', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  }),
  uploadFullAudio: (formData) => axiosInstance.post('/api/exams/proctoring/audio/', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  }),
  getExamAudio: (submissionId) => axiosInstance.get(`/api/exams/submissions/${submissionId}/audio/`),
  uploadFullVideo: (formData) => axiosInstance.post('/api/exams/proctoring/video/', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  }),
  getExamVideo: (submissionId) => axiosInstance.get(`/api/exams/submissions/${submissionId}/video/`),
  
  // Disputes
  createDispute: (data) => axiosInstance.post('/api/exams/disputes/', data),
  getMyDisputes: () => axiosInstance.get('/api/exams/disputes/me/'),
  getExamDisputes: (examId) => axiosInstance.get(`/api/exams/${examId}/disputes/`),
  getDisputeDetail: (id) => axiosInstance.get(`/api/exams/disputes/${id}/`),
  sendDisputeMessage: (id, message) => axiosInstance.post(`/api/exams/disputes/${id}/messages/`, { message }),
  updateDisputeStatus: (id, status) => axiosInstance.post(`/api/exams/disputes/${id}/status/`, { status }),
  replyDispute: (id, data) => axiosInstance.patch(`/api/exams/disputes/${id}/reply/`, data),
  resolveDispute: (id) => axiosInstance.post(`/api/exams/disputes/${id}/resolve/`),
  
  // Candidate results
  getCandidateResult: (submissionId) => axiosInstance.get(`/api/exams/submissions/${submissionId}/candidate-result/`),
};

export default examService;
