import axios from 'axios'
import router from '../router'
import { ElMessage } from 'element-plus'

const http = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080',
})

http.interceptors.request.use((config) => {
  const token = localStorage.getItem('token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

http.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error.response?.status
    const message = error.response?.data?.message || '發生未知錯誤'
    if (status === 401 || status === 403) {
      localStorage.removeItem('token')
      localStorage.removeItem('username')
      router.push('/login')
    }
    // 呼叫端若要自行處理這個錯誤（例如跳出客製化的二次確認），可在 request config 加 skipErrorToast: true
    if (!error.config?.skipErrorToast) {
      ElMessage.error(message)
    }
    return Promise.reject(error)
  }
)

export default http
