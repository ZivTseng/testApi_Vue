<template>
  <div class="login-container">
    <el-card class="login-card" shadow="always">
      <div class="login-header">
        <el-icon size="50" color="#409EFF"><Platform /></el-icon>
        <h2>Ziv's System</h2>
      </div>

      <el-form :model="loginForm" label-position="top" size="large" @keyup.enter="handleLogin">
        <el-form-item label="帳號">
          <el-input v-model="loginForm.email" placeholder="admin@test.com" prefix-icon="User" clearable />
        </el-form-item>
        
        <el-form-item label="密碼">
          <el-input v-model="loginForm.password" type="password" placeholder="請輸入密碼" prefix-icon="Lock" show-password />
        </el-form-item>

        <div class="login-options">
          <el-checkbox v-model="rememberMe">記住我</el-checkbox>
        </div>

        <el-button type="primary" class="login-button" :loading="loading" @click="handleLogin">
          登入系統
        </el-button>
      </el-form>
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

const loginForm = reactive({
  email: 'admin@test.com',
  password: '123456'
})

const handleLogin = async () => {
  if (!loginForm.email || !loginForm.password) {
    ElMessage.warning('請填寫完整資訊')
    return
  }
  
  loading.value = true
  try {
    const res = await axios.post('http://localhost:8080/api/auth/login', loginForm)
    localStorage.setItem('token', res.data.token)
    localStorage.setItem('username', res.data.username)
    
    ElMessage.success({ message: '歡迎回來，管理員！', duration: 2000 })
    router.push('/articles')
  } catch (err) {
    ElMessage.error('登入失敗：帳號或密碼錯誤')
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
  padding: 20px;
}
.login-header {
  text-align: center;
  margin-bottom: 30px;
}
.login-header h2 {
  margin: 15px 0 5px;
  font-size: 24px;
  color: #2c3e50;
}
.login-header p {
  color: #95a5a6;
  font-size: 14px;
}
.login-options {
  margin-bottom: 20px;
}
.login-button {
  width: 100%;
  border-radius: 8px;
  font-weight: bold;
  letter-spacing: 1px;
}
</style>