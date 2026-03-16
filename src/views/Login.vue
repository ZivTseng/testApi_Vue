<template>
  <div class="login-container">
    <el-card class="login-card" shadow="always">
      <div class="login-header">
        <el-icon size="50" color="#409EFF"><Platform /></el-icon>
        <h2>Blog Admin System</h2>
        <p>{{ isLoginMode ? '請輸入您的管理員帳號密碼' : '註冊新的管理員帳號' }}</p>
      </div>

      <el-form v-if="isLoginMode" :model="loginForm" label-position="top" size="large" @keyup.enter="handleLogin">
        <el-form-item label="帳號 (Email)">
          <el-input v-model="loginForm.email" placeholder="請輸入帳號" prefix-icon="Message" clearable />
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
        <el-form-item label="使用者名稱">
          <el-input v-model="registerForm.username" placeholder="請輸入您的暱稱 (例如: Ziv)" prefix-icon="User" clearable />
        </el-form-item>

        <el-form-item label="帳號 (Email)">
          <el-input v-model="registerForm.email" placeholder="請輸入 Email 作為登入帳號" prefix-icon="Message" clearable />
        </el-form-item>
        
        <el-form-item label="密碼">
          <el-input v-model="registerForm.password" type="password" placeholder="請設定密碼" prefix-icon="Lock" show-password />
        </el-form-item>

        <el-form-item label="確認密碼">
          <el-input v-model="registerForm.confirmPassword" type="password" placeholder="請再次輸入密碼" prefix-icon="Check" show-password />
        </el-form-item>

        <el-button type="success" class="action-button" :loading="loading" @click="handleRegister">
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
</template>

<script setup>
import { ref, reactive } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import axios from 'axios'

const router = useRouter()
const loading = ref(false)
const rememberMe = ref(false)

// 控制目前是「登入」還是「註冊」模式 (預設為登入)
const isLoginMode = ref(true)

// 登入用的資料
const loginForm = reactive({
  email: '',
  password: ''
})

// 註冊用的資料
const registerForm = reactive({
  username: '',
  email: '',
  password: '',
  confirmPassword: ''
})

// 切換模式的函數 (清空表單並切換狀態)
const toggleMode = () => {
  isLoginMode.value = !isLoginMode.value
  // 切換時順便清空註冊表單，避免資料殘留
  registerForm.username = ''
  registerForm.email = ''
  registerForm.password = ''
  registerForm.confirmPassword = ''
}

// === 登入功能 ===
const handleLogin = async () => {
  if (!loginForm.email || !loginForm.password) {
    ElMessage.warning('請填寫完整登入資訊')
    return
  }
  
  loading.value = true
  try {
    const res = await axios.post('http://localhost:8080/api/auth/login', loginForm)
    
    localStorage.setItem('token', res.data.token)
    
    // 如果後端沒傳 username，就用 email 前綴代替
    const displayName = res.data.username || loginForm.email.split('@')[0]
    localStorage.setItem('username', displayName)
    
    ElMessage.success({ message: `歡迎回來，${displayName}！`, duration: 2000 })
    router.push('/articles')
  } catch (err) {
    ElMessage.error('登入失敗：帳號或密碼錯誤')
  } finally {
    loading.value = false
  }
}

// === 註冊功能 ===
const handleRegister = async () => {
  // 1. 前端基本驗證
  if (!registerForm.username || !registerForm.email || !registerForm.password) {
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
    await axios.post('http://localhost:8080/api/auth/register', {
      username: registerForm.username,
      email: registerForm.email,
      password: registerForm.password
    })
    
    // 3. 註冊成功後的處理
    ElMessage.success('註冊成功！請使用新帳號登入。')
    // 自動將剛註冊的 email 填入登入表單，方便使用者
    loginForm.email = registerForm.email
    loginForm.password = ''
    // 切換回登入模式
    isLoginMode.value = true
  } catch (err) {
    // 根據後端回傳的錯誤訊息提示 (例如 Email 已被註冊)
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
  justify-content: center;
  align-items: center;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
}
.login-card {
  width: 420px;
  border-radius: 15px;
  padding: 20px 30px;
  box-sizing: border-box;
}
.login-header {
  text-align: center;
  margin-bottom: 25px;
}
.login-header h2 {
  margin: 15px 0 5px;
  font-size: 24px;
  color: #2c3e50;
}
.login-header p {
  color: #95a5a6;
  font-size: 14px;
  margin-top: 5px;
}
.login-options {
  margin-bottom: 20px;
}
.action-button {
  width: 100%;
  border-radius: 8px;
  font-weight: bold;
  letter-spacing: 2px;
  margin-top: 10px;
}
.toggle-mode {
  text-align: center;
  margin-top: 25px;
  font-size: 14px;
  color: #606266;
}
</style>