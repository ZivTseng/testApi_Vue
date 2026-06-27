import axios from 'axios'
import { ElMessage } from 'element-plus'

// 家長端 (LIFF) 專用的 axios 實例，使用獨立的 Token 儲存空間，跟後台管理員的 http.js 互不影響
const liffHttp = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080',
})

liffHttp.interceptors.request.use((config) => {
  const token = localStorage.getItem('liffToken')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

liffHttp.interceptors.response.use(
  (response) => response,
  (error) => {
    const message = error.response?.data?.message || '發生未知錯誤'
    if (!error.config?.skipErrorToast) {
      ElMessage.error(message)
    }
    return Promise.reject(error)
  }
)

export default liffHttp
