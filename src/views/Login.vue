<template>
  <div class="login-container">
    <div class="login-panel">
      <div class="brand-mark">
        <el-icon :size="22" color="#b8924f"><Platform /></el-icon>
        <span>幼兒體能館</span>
      </div>
      <h1>專注每一堂課，<br />照顧每一個孩子。</h1>
      <p class="brand-sub">課程預約 · 學員管理 · 點數與繳費，一站式後台系統。</p>
    </div>

    <div class="form-panel">
      <el-card class="login-card" shadow="never">
        <div class="login-header">
          <h2>{{ isLoginMode ? '管理員登入' : '建立管理員帳號' }}</h2>
          <p>{{ isLoginMode ? '請輸入您的管理員帳號密碼' : '註冊新的管理員帳號' }}</p>
        </div>

        <el-form v-if="isLoginMode" :model="loginForm" label-position="top" size="large" @keyup.enter="handleLogin">
          <el-form-item label="帳號">
            <el-input v-model="loginForm.username" placeholder="請輸入帳號" prefix-icon="User" clearable />
          </el-form-item>

          <el-form-item label="密碼">
            <el-input v-model="loginForm.password" type="password" placeholder="請輸入密碼" prefix-icon="Lock" show-password />
          </el-form-item>

          <div class="login-options">
            <el-checkbox v-model="rememberMe">記住我</el-checkbox>
          </div>

          <el-button type="primary" class="action-button" :loading="loading" @click="handleLogin">
            登入系統
          </el-button>
        </el-form>

        <el-form v-else :model="registerForm" label-position="top" size="large" @keyup.enter="handleRegister">
          <el-form-item label="顯示名稱">
            <el-input v-model="registerForm.name" placeholder="請輸入您的姓名 (例如: Ziv)" prefix-icon="User" clearable />
          </el-form-item>

          <el-form-item label="登入帳號">
            <el-input v-model="registerForm.username" placeholder="請輸入登入帳號" prefix-icon="Message" clearable />
          </el-form-item>

          <el-form-item label="密碼">
            <el-input v-model="registerForm.password" type="password" placeholder="請設定密碼" prefix-icon="Lock" show-password />
          </el-form-item>

          <el-form-item label="確認密碼">
            <el-input v-model="registerForm.confirmPassword" type="password" placeholder="請再次輸入密碼" prefix-icon="Check" show-password />
          </el-form-item>

          <el-button type="primary" class="action-button" :loading="loading" @click="handleRegister">
            立即註冊
          </el-button>
        </el-form>

        <div class="toggle-mode">
          <span v-if="isLoginMode">
            還沒有帳號嗎？
            <el-button link type="primary" @click="toggleMode">點此註冊</el-button>
          </span>
          <span v-else>
            已經有帳號了？
            <el-button link type="primary" @click="toggleMode">返回登入</el-button>
          </span>
        </div>
      </el-card>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import http from '../api/http'

const router = useRouter()
const loading = ref(false)
const rememberMe = ref(false)

// 控制目前是「登入」還是「註冊」模式 (預設為登入)
const isLoginMode = ref(true)

// 登入用的資料
const loginForm = reactive({
  username: '',
  password: ''
})

// 註冊用的資料
const registerForm = reactive({
  name: '',
  username: '',
  password: '',
  confirmPassword: ''
})

// 切換模式的函數 (清空表單並切換狀態)
const toggleMode = () => {
  isLoginMode.value = !isLoginMode.value
  // 切換時順便清空註冊表單，避免資料殘留
  registerForm.name = ''
  registerForm.username = ''
  registerForm.password = ''
  registerForm.confirmPassword = ''
}

// === 登入功能 ===
const handleLogin = async () => {
  if (!loginForm.username || !loginForm.password) {
    ElMessage.warning('請填寫完整登入資訊')
    return
  }

  loading.value = true
  try {
    const res = await http.post('/api/auth/login', loginForm, { skipErrorToast: true })

    localStorage.setItem('token', res.data.token)
    localStorage.setItem('username', res.data.username || loginForm.username)

    ElMessage.success({ message: `歡迎回來，${res.data.username}！`, duration: 2000 })
    router.push('/dashboard')
  } catch (err) {
    ElMessage.error('登入失敗：帳號或密碼錯誤')
  } finally {
    loading.value = false
  }
}

// === 註冊功能 ===
const handleRegister = async () => {
  // 1. 前端基本驗證
  if (!registerForm.name || !registerForm.username || !registerForm.password) {
    ElMessage.warning('請填寫完整註冊資訊')
    return
  }
  if (registerForm.password !== registerForm.confirmPassword) {
    ElMessage.error('兩次輸入的密碼不一致！')
    return
  }

  loading.value = true
  try {
    // 2. 呼叫後端的註冊 API (目前預設路徑為 /api/auth/register)
    await http.post('/api/auth/register', {
      username: registerForm.username,
      password: registerForm.password,
      name: registerForm.name,
      role: 'STAFF'
    }, { skipErrorToast: true })

    // 3. 註冊成功後的處理
    ElMessage.success('註冊成功！請使用新帳號登入。')
    // 自動將剛註冊的帳號填入登入表單，方便使用者
    loginForm.username = registerForm.username
    loginForm.password = ''
    // 切換回登入模式
    isLoginMode.value = true
  } catch (err) {
    // 根據後端回傳的錯誤訊息提示 (例如帳號已被註冊)
    const errorMsg = err.response?.data?.message || '註冊失敗，請稍後再試'
    ElMessage.error(errorMsg)
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
.login-container {
  height: 100vh;
  display: flex;
  background: #f6f5f2;
}

.login-panel {
  flex: 1.1;
  background: #1c1f26;
  background-image: radial-gradient(circle at 20% 20%, rgba(184, 146, 79, 0.12), transparent 45%);
  color: #f1efe9;
  display: flex;
  flex-direction: column;
  justify-content: center;
  padding: 80px;
  box-sizing: border-box;
}
.brand-mark {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 15px;
  font-weight: 600;
  letter-spacing: 1px;
  color: #d9bd86;
  margin-bottom: 48px;
}
.login-panel h1 {
  color: #f1efe9;
  font-size: 32px;
  line-height: 1.5;
  font-weight: 600;
  margin: 0 0 16px;
}
.brand-sub {
  color: #9a9ca5;
  font-size: 14px;
  letter-spacing: 0.3px;
  margin: 0;
}

.form-panel {
  flex: 1;
  display: flex;
  justify-content: center;
  align-items: center;
  background: #ffffff;
}
.login-card {
  width: 360px;
  border: none !important;
  box-shadow: none !important;
}
.login-header {
  margin-bottom: 28px;
}
.login-header h2 {
  margin: 0 0 6px;
  font-size: 22px;
  color: #1c1f26;
}
.login-header p {
  color: #8a8d96;
  font-size: 13px;
  margin: 0;
}
.login-options {
  margin-bottom: 20px;
}
.action-button {
  width: 100%;
  font-weight: 600;
  letter-spacing: 1px;
  margin-top: 6px;
  height: 42px;
}
.toggle-mode {
  text-align: center;
  margin-top: 24px;
  font-size: 13px;
  color: #8a8d96;
}

@media (max-width: 860px) {
  .login-panel {
    display: none;
  }
}
</style>