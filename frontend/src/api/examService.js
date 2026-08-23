import axiosInstance from './axiosInstance';

const examService = {
  // Exams
  getAllExams: () => axiosInstance.get('/api/exams/'),
  getExam: (id) => axiosInstance.get(`/api/exams/${id}/`),
  createExam: (data) => axiosInstance.post('/api/exams/', data),
  updateExam: (id, data) => axiosInstance.put(`/api/exams/${id}/`, data),
  patchExam: (id, data) => axiosInstance.patch(`/api/exams/${id}/`, data),
  publishExam: (id) => axiosInstance.patch(`/api/exams/${id}/publish/`),
  getShareLink: (id) => axiosInstance.get(`/api/exams/${id}/share-link/`),

  // Questions
  getQuestions: (examId) => axiosInstance.get(`/api/exams/${examId}/questions/`),
  addQuestion: (examId, formData) => axiosInstance.post(`/api/exams/${examId}/questions/`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  }),
  bulkAddQuestions: (examId, data) => axiosInstance.post(`/api/exams/${examId}/questions/bulk/`, data),
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
  getAvailableExams: () => axiosInstance.get('/api/exams/candidate/available-exams/'),
  getCandidateExamStatus: (examId) => axiosInstance.get(`/api/exams/${examId}/candidate-status/`),
  registerForExam: (examId) => axiosInstance.post(`/api/exams/${examId}/register/`),
  getExamToTake: (examId) => axiosInstance.get(`/api/exams/${examId}/take/`),
  saveAnswer: (submissionId, questionId, textAnswer) => axiosInstance.post(`/api/exams/submissions/${submissionId}/answers/`, { question_id: questionId, text_answer: textAnswer }),
  submitExam: (submissionId) => axiosInstance.post(`/api/exams/submissions/${submissionId}/submit/`),

  // Evaluation
  getExamSubmissions: (examId) => axiosInstance.get(`/api/exams/${examId}/submissions/`),
  getSubmissionDetail: (submissionId) => axiosInstance.get(`/api/exams/submissions/${submissionId}/`),
  gradeAnswer: (answerId, data) => axiosInstance.patch(`/api/exams/answers/${answerId}/`, data),
  publishResults: (submissionId) => axiosInstance.post(`/api/exams/submissions/${submissionId}/publish/`),

  // Proctoring
  logProctoringIncident: (data) => axiosInstance.post('/api/exams/proctoring/logs/', data),
  getProctoringLogs: (submissionId) => axiosInstance.get(`/api/exams/submissions/${submissionId}/logs/`),
};

export default examService;
