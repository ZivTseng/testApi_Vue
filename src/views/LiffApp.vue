<template>
  <div class="liff-page">
    <!-- 初始化中 -->
    <div v-if="stage === 'loading'" class="liff-center">
      <el-icon class="is-loading" :size="32"><Loading /></el-icon>
      <p>載入中...</p>
    </div>

    <!-- 第一次使用，尚未綁定 -->
    <div v-else-if="stage === 'needPhone'" class="liff-center liff-link-box">
      <h3>歡迎使用幼兒體能館預約系統</h3>

      <template v-if="!isNewCustomer">
        <p class="hint">已經是館方學員的家長，請輸入您登記的電話號碼完成綁定</p>
        <el-input v-model="phone" placeholder="請輸入電話號碼" style="margin: 16px 0" />
        <el-button type="primary" :loading="linking" @click="submitLink" style="width: 100%">綁定並開始使用</el-button>
        <p v-if="linkError" class="error-text">{{ linkError }}</p>
        <el-button link type="primary" style="margin-top: 12px" @click="isNewCustomer = true">我是新朋友，立即報名</el-button>
      </template>

      <template v-else>
        <p class="hint">第一次使用，請填寫以下資訊完成報名（館方確認後即可開始預約課程）</p>
        <el-input v-model="registerForm.parentName" placeholder="家長姓名" style="margin: 8px 0" />
        <el-input v-model="registerForm.phone" placeholder="聯絡電話" style="margin: 8px 0" />
        <el-input v-model="registerForm.childName" placeholder="孩子姓名" style="margin: 8px 0" />
        <el-button type="primary" :loading="linking" @click="submitRegister" style="width: 100%; margin-top: 8px">送出報名</el-button>
        <p v-if="linkError" class="error-text">{{ linkError }}</p>
        <el-button link type="primary" style="margin-top: 12px" @click="isNewCustomer = false">我已經是學員家長</el-button>
      </template>
    </div>

    <!-- 主畫面 -->
    <div v-else-if="stage === 'ready'" class="liff-main">
      <div class="liff-header">
        <span>您好，{{ parentName }}</span>
      </div>

      <el-tabs v-model="activeTab">
        <el-tab-pane label="可預約場次" name="sessions">
          <div v-loading="sessionsLoading">
            <el-empty v-if="!sessions.length" description="目前沒有可預約的場次" />
            <div v-for="s in sessions" :key="s.id" class="session-card">
              <div class="session-info">
                <div class="session-title">{{ s.courseName }}</div>
                <div class="session-meta">{{ s.sessionDate }} {{ s.startTime }} - {{ s.endTime }}</div>
                <div class="session-meta">名額：{{ s.reservedCount }} / {{ s.capacity }}{{ s.full ? '（已滿，可候補）' : '' }}</div>
              </div>
              <el-select v-model="bookingChild[s.id]" placeholder="選擇孩子" size="small" style="width: 100px">
                <el-option v-for="c in children" :key="c.id" :label="c.name" :value="c.id" />
              </el-select>
              <el-button type="primary" size="small" :disabled="!bookingChild[s.id]" @click="book(s)">
                {{ s.full ? '候補' : '預約' }}
              </el-button>
            </div>
          </div>
        </el-tab-pane>

        <el-tab-pane label="我的預約" name="reservations">
          <div v-loading="reservationsLoading">
            <el-empty v-if="!reservations.length" description="目前沒有預約紀錄" />
            <div v-for="r in reservations" :key="r.id" class="session-card">
              <div class="session-info">
                <div class="session-title">{{ r.studentName }} - {{ r.courseName }}</div>
                <div class="session-meta">{{ r.sessionDate }} {{ r.startTime }}</div>
                <el-tag :type="statusTagType(r.status)" size="small">{{ statusLabel(r.status) }}</el-tag>
              </div>
              <el-button
                v-if="r.status === 'CONFIRMED'"
                type="danger"
                link
                size="small"
                @click="cancel(r)"
              >取消</el-button>
            </div>
          </div>
        </el-tab-pane>
      </el-tabs>
    </div>

    <div v-else-if="stage === 'error'" class="liff-center">
      <p class="error-text">{{ errorMessage }}</p>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { Loading } from '@element-plus/icons-vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import liff from '@line/liff'
import { LIFF_ID } from '../liffConfig'
import liffHttp from '../api/liffHttp'

const stage = ref('loading') // loading | needPhone | ready | error
const errorMessage = ref('')

const phone = ref('')
const linking = ref(false)
const linkError = ref('')
const isNewCustomer = ref(false)
const registerForm = ref({ parentName: '', phone: '', childName: '' })

const parentName = ref('')
const activeTab = ref('sessions')

const sessions = ref([])
const sessionsLoading = ref(false)
const reservations = ref([])
const reservationsLoading = ref(false)
const children = ref([])
const bookingChild = ref({})

let cachedIdToken = ''

onMounted(async () => {
  try {
    await liff.init({ liffId: LIFF_ID })
    if (!liff.isLoggedIn()) {
      liff.login()
      return // login() 會導頁，後面不會執行
    }
    cachedIdToken = liff.getIDToken()
    await authenticate()
  } catch (e) {
    stage.value = 'error'
    errorMessage.value = '初始化失敗，請確認是否在 LINE 中開啟此頁面：' + (e?.message || e)
  }
})

async function authenticate() {
  const { data } = await liffHttp.post('/api/liff/auth', { idToken: cachedIdToken }, { skipErrorToast: true })
  if (data.linked) {
    finishLogin(data)
  } else {
    stage.value = 'needPhone'
  }
}

function finishLogin(data) {
  localStorage.setItem('liffToken', data.token)
  parentName.value = data.parentName
  stage.value = 'ready'
  loadChildren()
  loadSessions()
  loadReservations()
}

async function submitLink() {
  if (!phone.value) {
    linkError.value = '請輸入電話號碼'
    return
  }
  linking.value = true
  linkError.value = ''
  try {
    const { data } = await liffHttp.post('/api/liff/link', { idToken: cachedIdToken, phone: phone.value }, { skipErrorToast: true })
    finishLogin(data)
  } catch (e) {
    linkError.value = e.response?.data?.message || '綁定失敗，請確認電話號碼是否正確，或聯絡館方'
  } finally {
    linking.value = false
  }
}

async function submitRegister() {
  const { parentName, phone: regPhone, childName } = registerForm.value
  if (!parentName || !regPhone || !childName) {
    linkError.value = '請填寫完整資訊'
    return
  }
  linking.value = true
  linkError.value = ''
  try {
    const { data } = await liffHttp.post('/api/liff/register', {
      idToken: cachedIdToken,
      parentName,
      phone: regPhone,
      childName,
    }, { skipErrorToast: true })
    finishLogin(data)
  } catch (e) {
    linkError.value = e.response?.data?.message || '報名失敗，請稍後再試或聯絡館方'
  } finally {
    linking.value = false
  }
}

async function loadChildren() {
  const { data } = await liffHttp.get('/api/liff/me')
  children.value = data
}

async function loadSessions() {
  sessionsLoading.value = true
  try {
    const { data } = await liffHttp.get('/api/liff/sessions')
    sessions.value = data
  } finally {
    sessionsLoading.value = false
  }
}

async function loadReservations() {
  reservationsLoading.value = true
  try {
    const { data } = await liffHttp.get('/api/liff/reservations')
    reservations.value = data
  } finally {
    reservationsLoading.value = false
  }
}

async function book(session) {
  const studentId = bookingChild.value[session.id]
  try {
    const { data } = await liffHttp.post('/api/liff/reservations', { studentId, sessionId: session.id })
    ElMessage.success(data.message)
    loadSessions()
    loadReservations()
  } catch {
    // 錯誤訊息已由 liffHttp 攔截器統一顯示
  }
}

async function cancel(reservation) {
  try {
    await ElMessageBox.confirm('確定要取消這個預約嗎？', '取消確認', { type: 'warning' })
  } catch {
    return
  }
  try {
    await liffHttp.post(`/api/liff/reservations/${reservation.id}/cancel`)
    ElMessage.success('已取消')
    loadSessions()
    loadReservations()
  } catch {
    // 錯誤訊息已由 liffHttp 攔截器統一顯示
  }
}

function statusLabel(status) {
  return { CONFIRMED: '已確認', CANCELLED: '已取消', ATTENDED: '已出席', ABSENT: '缺席' }[status] || status
}

function statusTagType(status) {
  return { CONFIRMED: 'success', CANCELLED: 'info', ATTENDED: 'success', ABSENT: 'danger' }[status] || ''
}
</script>

<style scoped>
.liff-page {
  min-height: 100vh;
  background: #f7f5f0;
  padding: 16px;
  box-sizing: border-box;
}
.liff-center {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 80vh;
  text-align: center;
}
.liff-link-box {
  background: #fff;
  border-radius: 12px;
  padding: 24px;
  margin: 40px auto;
  max-width: 360px;
}
.liff-header {
  font-weight: 600;
  margin-bottom: 12px;
  font-size: 16px;
}
.session-card {
  display: flex;
  align-items: center;
  gap: 8px;
  background: #fff;
  border-radius: 10px;
  padding: 12px;
  margin-bottom: 10px;
}
.session-info {
  flex: 1;
  min-width: 0;
}
.session-title {
  font-weight: 600;
}
.session-meta {
  font-size: 12px;
  color: #8a8d96;
  margin-top: 2px;
}
.error-text {
  color: #c45656;
  font-size: 13px;
  margin-top: 8px;
}
.hint {
  font-size: 13px;
  color: #8a8d96;
}
</style>
