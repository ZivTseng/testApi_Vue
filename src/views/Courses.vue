<template>
  <div class="common-layout">
    <el-container class="layout-container">
      <Sidebar />

      <el-container>
        <el-header class="app-header">
          <div class="header-left">
            <h2 class="page-title">課程 / 場次管理</h2>
          </div>
          <div class="user-info">
            <span class="username">{{ currentUsername }}</span>
            <el-button link type="danger" @click="handleLogout">登出</el-button>
          </div>
        </el-header>

        <el-main class="app-main">
          <div class="grid">
            <el-card class="panel" shadow="never">
              <div class="panel-header">
                <h3>課程列表</h3>
                <el-button type="primary" :icon="Plus" size="small" @click="openCourseDialog()">新增課程</el-button>
              </div>
              <el-table
                :data="courses"
                v-loading="coursesLoading"
                highlight-current-row
                @current-change="handleSelectCourse"
                stripe
              >
                <el-table-column prop="name" label="課程名稱" />
                <el-table-column prop="description" label="說明" show-overflow-tooltip />
                <el-table-column label="操作" width="140" fixed="right">
                  <template #default="{ row }">
                    <el-button link type="primary" @click.stop="openCourseDialog(row)">編輯</el-button>
                    <el-button link type="danger" @click.stop="deleteCourse(row)">刪除</el-button>
                  </template>
                </el-table-column>
              </el-table>
            </el-card>

            <el-card class="panel" shadow="never">
              <div class="panel-header">
                <h3>{{ selectedCourse ? `「${selectedCourse.name}」的場次` : '請先在左側選擇課程' }}</h3>
                <el-button
                  type="primary"
                  :icon="Plus"
                  size="small"
                  :disabled="!selectedCourse"
                  @click="openSessionDialog()"
                >新增場次</el-button>
              </div>
              <el-table :data="sessions" v-loading="sessionsLoading" stripe>
                <el-table-column prop="sessionDate" label="日期" width="120" />
                <el-table-column label="時間" width="140">
                  <template #default="{ row }">{{ row.startTime }} - {{ row.endTime }}</template>
                </el-table-column>
                <el-table-column label="名額" width="140">
                  <template #default="{ row }">
                    <el-tag :type="row.full ? 'danger' : 'success'">{{ row.reservedCount }} / {{ row.capacity }}</el-tag>
                  </template>
                </el-table-column>
                <el-table-column label="操作" width="140" fixed="right">
                  <template #default="{ row }">
                    <el-button link type="primary" @click="openSessionDialog(row)">編輯</el-button>
                    <el-button link type="danger" @click="deleteSession(row)">刪除</el-button>
                  </template>
                </el-table-column>
              </el-table>
            </el-card>
          </div>
        </el-main>
      </el-container>
    </el-container>

    <!-- 課程新增/編輯 -->
    <el-dialog v-model="courseDialogVisible" :title="courseForm.id ? '編輯課程' : '新增課程'" width="420px">
      <el-form :model="courseForm" label-position="top">
        <el-form-item label="課程名稱" required>
          <el-input v-model="courseForm.name" />
        </el-form-item>
        <el-form-item label="說明">
          <el-input v-model="courseForm.description" type="textarea" :rows="3" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="courseDialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="courseSaving" @click="saveCourse">儲存</el-button>
      </template>
    </el-dialog>

    <!-- 場次新增/編輯 -->
    <el-dialog v-model="sessionDialogVisible" :title="sessionForm.id ? '編輯場次' : '新增場次'" width="440px">
      <el-form :model="sessionForm" label-position="top">
        <el-form-item v-if="!sessionForm.id" label="建立方式">
          <el-radio-group v-model="sessionForm.repeatMode">
            <el-radio-button label="once">單次</el-radio-button>
            <el-radio-button label="daily">每天</el-radio-button>
            <el-radio-button label="weekly">每週</el-radio-button>
          </el-radio-group>
        </el-form-item>

        <el-form-item :label="sessionForm.repeatMode === 'once' ? '日期' : '起始日期'" required>
          <el-date-picker v-model="sessionForm.sessionDate" type="date" value-format="YYYY-MM-DD" style="width: 100%" />
        </el-form-item>

        <el-form-item v-if="sessionForm.repeatMode !== 'once'" label="重複至（結束日期）" required>
          <el-date-picker v-model="sessionForm.repeatEndDate" type="date" value-format="YYYY-MM-DD" style="width: 100%" />
        </el-form-item>

        <el-form-item v-if="sessionForm.repeatMode === 'weekly'" label="每週星期" required>
          <el-checkbox-group v-model="sessionForm.repeatWeekdays">
            <el-checkbox v-for="d in weekdayOptions" :key="d.value" :label="d.value">{{ d.label }}</el-checkbox>
          </el-checkbox-group>
        </el-form-item>

        <el-form-item label="開始時間" required>
          <el-time-picker v-model="sessionForm.startTime" value-format="HH:mm:ss" style="width: 100%" />
        </el-form-item>
        <el-form-item label="結束時間" required>
          <el-time-picker v-model="sessionForm.endTime" value-format="HH:mm:ss" style="width: 100%" />
        </el-form-item>
        <el-form-item label="名額" required>
          <el-input-number v-model="sessionForm.capacity" :min="1" style="width: 100%" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="sessionDialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="sessionSaving" @click="saveSession">儲存</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Plus } from '@element-plus/icons-vue'
import Sidebar from '../components/Sidebar.vue'
import http from '../api/http'

const router = useRouter()
const currentUsername = ref(localStorage.getItem('username') || 'Admin')

const courses = ref([])
const coursesLoading = ref(false)
const courseDialogVisible = ref(false)
const courseForm = reactive({ id: null, name: '', description: '' })
const courseSaving = ref(false)
const sessionSaving = ref(false)

const selectedCourse = ref(null)
const sessions = ref([])
const sessionsLoading = ref(false)
const sessionDialogVisible = ref(false)
const emptySessionForm = () => ({
  id: null,
  sessionDate: null,
  startTime: null,
  endTime: null,
  capacity: 10,
  repeatMode: 'once',
  repeatEndDate: null,
  repeatWeekdays: [],
})
const sessionForm = reactive(emptySessionForm())

// 對應 JS Date.getDay()：0 是星期日
const weekdayOptions = [
  { label: '一', value: 1 },
  { label: '二', value: 2 },
  { label: '三', value: 3 },
  { label: '四', value: 4 },
  { label: '五', value: 5 },
  { label: '六', value: 6 },
  { label: '日', value: 0 },
]

const loadCourses = async () => {
  coursesLoading.value = true
  try {
    const { data } = await http.get('/api/courses')
    courses.value = data
  } finally {
    coursesLoading.value = false
  }
}

const loadAllSessions = async () => {
  const { data } = await http.get('/api/course-sessions')
  return data
}

const handleSelectCourse = async (row) => {
  selectedCourse.value = row
  if (!row) {
    sessions.value = []
    return
  }
  sessionsLoading.value = true
  try {
    const all = await loadAllSessions()
    sessions.value = all.filter((s) => s.courseId === row.id)
  } finally {
    sessionsLoading.value = false
  }
}

const refreshSessions = () => {
  if (selectedCourse.value) handleSelectCourse(selectedCourse.value)
}

const openCourseDialog = (row) => {
  Object.assign(courseForm, row ? { ...row } : { id: null, name: '', description: '' })
  courseDialogVisible.value = true
}

const saveCourse = async () => {
  if (!courseForm.name) {
    ElMessage.warning('請填寫課程名稱')
    return
  }
  if (courseSaving.value) return
  courseSaving.value = true
  const payload = { name: courseForm.name, description: courseForm.description }
  try {
    if (courseForm.id) {
      await http.put(`/api/courses/${courseForm.id}`, payload)
    } else {
      await http.post('/api/courses', payload)
    }
    ElMessage.success('課程已儲存')
    courseDialogVisible.value = false
    loadCourses()
  } catch {
    // 錯誤訊息已由 http 攔截器統一顯示，這裡只需保持對話框開啟讓使用者修正
  } finally {
    courseSaving.value = false
  }
}

const deleteCourse = async (row) => {
  try {
    await ElMessageBox.confirm(`確定要刪除課程「${row.name}」嗎？`, '刪除確認', { type: 'warning' })
  } catch {
    return // 使用者取消刪除
  }
  try {
    await http.delete(`/api/courses/${row.id}`)
    ElMessage.success('已刪除')
    if (selectedCourse.value?.id === row.id) {
      selectedCourse.value = null
      sessions.value = []
    }
    loadCourses()
  } catch {
    // 錯誤訊息已由 http 攔截器統一顯示
  }
}

const openSessionDialog = (row) => {
  Object.assign(sessionForm, row ? { ...row, repeatMode: 'once', repeatEndDate: null, repeatWeekdays: [] } : emptySessionForm())
  sessionDialogVisible.value = true
}

// 依重複規則展開出所有要建立的日期（含起始日），週模式只取勾選的星期幾
const expandRepeatDates = (startStr, endStr, mode, weekdays) => {
  const dates = []
  const cursor = new Date(`${startStr}T00:00:00`)
  const end = new Date(`${endStr}T00:00:00`)
  while (cursor <= end) {
    if (mode === 'daily' || weekdays.includes(cursor.getDay())) {
      dates.push(cursor.toISOString().slice(0, 10))
    }
    cursor.setDate(cursor.getDate() + 1)
  }
  return dates
}

const saveSession = async () => {
  if (!sessionForm.sessionDate || !sessionForm.startTime || !sessionForm.endTime) {
    ElMessage.warning('請填寫完整日期與時間')
    return
  }
  if (sessionForm.repeatMode !== 'once' && !sessionForm.repeatEndDate) {
    ElMessage.warning('請選擇重複至的結束日期')
    return
  }
  if (sessionForm.repeatMode === 'weekly' && sessionForm.repeatWeekdays.length === 0) {
    ElMessage.warning('請至少勾選一個星期')
    return
  }
  if (sessionSaving.value) return
  sessionSaving.value = true

  const basePayload = {
    courseId: selectedCourse.value.id,
    startTime: sessionForm.startTime,
    endTime: sessionForm.endTime,
    capacity: sessionForm.capacity,
  }

  try {
    if (sessionForm.id) {
      await http.put(`/api/course-sessions/${sessionForm.id}`, { ...basePayload, sessionDate: sessionForm.sessionDate })
      ElMessage.success('場次已儲存')
    } else if (sessionForm.repeatMode === 'once') {
      await http.post('/api/course-sessions', { ...basePayload, sessionDate: sessionForm.sessionDate })
      ElMessage.success('場次已建立')
    } else {
      const dates = expandRepeatDates(
        sessionForm.sessionDate,
        sessionForm.repeatEndDate,
        sessionForm.repeatMode,
        sessionForm.repeatWeekdays
      )
      if (dates.length === 0) {
        ElMessage.warning('在所選日期區間內沒有符合條件的日期')
        return
      }
      for (const date of dates) {
        await http.post('/api/course-sessions', { ...basePayload, sessionDate: date })
      }
      ElMessage.success(`已建立 ${dates.length} 個場次`)
    }
    sessionDialogVisible.value = false
    refreshSessions()
  } catch {
    // 錯誤訊息已由 http 攔截器統一顯示，這裡只需保持對話框開啟讓使用者修正
  } finally {
    sessionSaving.value = false
  }
}

const deleteSession = async (row) => {
  try {
    await ElMessageBox.confirm(`確定要刪除 ${row.sessionDate} 的場次嗎？`, '刪除確認', { type: 'warning' })
  } catch {
    return // 使用者取消刪除
  }

  try {
    await http.delete(`/api/course-sessions/${row.id}`, { skipErrorToast: true })
    ElMessage.success('已刪除')
    refreshSessions()
    return
  } catch (err) {
    const blockedMessage = err.response?.data?.message
    // 場次仍有預約/候補紀錄，後端會擋下並回傳明確訊息（一律以 404 回傳，這裡只看訊息內容判斷），跳出第二層更嚴重的警告讓使用者確認是否強制刪除
    if (!blockedMessage?.includes('強制刪除')) {
      ElMessage.error(blockedMessage || '刪除失敗')
      return
    }

    try {
      await ElMessageBox.confirm(
        `${blockedMessage}<br/><br/>強制刪除將會：<br/>・移除此場次底下所有預約與候補紀錄<br/>・已確認的預約會全額退還堂數給學員<br/>・此操作無法復原`,
        '強制刪除場次',
        { type: 'error', confirmButtonText: '強制刪除', cancelButtonText: '取消', dangerouslyUseHTMLString: true }
      )
    } catch {
      return // 使用者取消強制刪除
    }

    try {
      await http.delete(`/api/course-sessions/${row.id}`, { params: { force: true } })
      ElMessage.success('已強制刪除場次，相關預約已自動取消並退還堂數')
      refreshSessions()
    } catch {
      // 錯誤訊息已由 http 攔截器統一顯示
    }
  }
}

const handleLogout = () => {
  localStorage.removeItem('token')
  localStorage.removeItem('username')
  router.push('/login')
}

onMounted(() => {
  loadCourses()
})
</script>

<style scoped>
.layout-container {
  height: 100vh;
}
.app-header {
  background-color: #fff;
  border-bottom: 1px solid #e8e6e0;
  display: flex;
  justify-content: space-between;
  align-items: center;
  height: 64px;
  padding: 0 28px;
}
.page-title {
  margin: 0;
  font-size: 17px;
  font-weight: 600;
  color: #1c1f26;
  letter-spacing: 0.3px;
}
.user-info {
  display: flex;
  align-items: center;
  gap: 14px;
}
.username {
  font-size: 14px;
  font-weight: 500;
  color: #4b4d55;
}
.app-main {
  background-color: #f6f5f2;
  padding: 28px;
}
.grid {
  display: grid;
  grid-template-columns: 1.1fr 1fr;
  gap: 20px;
  align-items: start;
}
.panel-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 14px;
}
.panel-header h3 {
  margin: 0;
  font-size: 15px;
  font-weight: 600;
}
@media (max-width: 1100px) {
  .grid {
    grid-template-columns: 1fr;
  }
}
</style>
