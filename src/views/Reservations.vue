<template>
  <div class="common-layout">
    <el-container class="layout-container">
      <Sidebar />

      <el-container>
        <el-header class="app-header">
          <div class="header-left">
            <h2 class="page-title">預約 / 候補管理</h2>
          </div>
          <div class="user-info">
            <span class="username">{{ currentUsername }}</span>
            <el-button link type="danger" @click="handleLogout">登出</el-button>
          </div>
        </el-header>

        <el-main class="app-main">
          <el-card class="filter-card" shadow="never">
            <el-form :inline="true">
              <el-form-item label="課程篩選">
                <el-select v-model="selectedCourseId" placeholder="全部課程" clearable style="width: 220px">
                  <el-option v-for="c in courses" :key="c.id" :label="c.name" :value="c.id" />
                </el-select>
              </el-form-item>
              <el-form-item label="圖例">
                <el-tag size="small" type="success" effect="plain">尚有名額</el-tag>
                <el-tag size="small" type="danger" effect="plain" style="margin-left: 6px">已滿</el-tag>
              </el-form-item>
              <el-form-item>
                <el-button type="primary" :icon="Plus" @click="openBookingDialog()">新增預約</el-button>
                <el-button :icon="Tickets" @click="openDailyRosterDialog()">每日預約表</el-button>
              </el-form-item>
            </el-form>
          </el-card>

          <el-card class="calendar-card" shadow="never">
            <el-calendar ref="calendarRef" v-model="calendarValue">
              <template #header>
                <div class="cal-header">
                  <el-button @click="calendarRef.selectDate('today')">今天</el-button>
                  <el-date-picker
                    v-model="calendarValue"
                    type="month"
                    placeholder="直接選擇年月"
                    style="width: 160px"
                    :clearable="false"
                  />
                </div>
              </template>
              <template #date-cell="{ data }">
                <div class="cal-cell">
                  <p class="cal-day">{{ Number(data.day.split('-')[2]) }}</p>
                  <div
                    v-for="s in sessionsForDate(data.day)"
                    :key="s.id"
                    class="cal-session"
                    :class="{ full: s.full }"
                    @click.stop="openSessionDrawer(s)"
                  >
                    {{ s.courseName }} {{ s.startTime?.slice(0, 5) }}
                  </div>
                </div>
              </template>
            </el-calendar>
          </el-card>
        </el-main>
      </el-container>
    </el-container>

    <!-- 場次詳情：預約名冊 / 候補名單 -->
    <el-drawer v-model="drawerVisible" size="640px" :title="drawerTitle">
      <template v-if="activeSession">
        <div class="drawer-toolbar">
          <el-tag :type="activeSession.full ? 'danger' : 'success'">
            名額 {{ activeSession.reservedCount }} / {{ activeSession.capacity }}
          </el-tag>
          <el-button type="primary" :icon="Plus" @click="openBookingDialog(activeSession)">新增預約</el-button>
        </div>

        <h4 class="section-title">預約名冊</h4>
        <el-table :data="roster" v-loading="rosterLoading" stripe>
          <el-table-column prop="studentName" label="學員" width="120" />
          <el-table-column label="狀態" width="100">
            <template #default="{ row }">
              <el-tag :type="statusTagType(row.status)">{{ statusLabel(row.status) }}</el-tag>
            </template>
          </el-table-column>
          <el-table-column label="體驗課" width="70">
            <template #default="{ row }">{{ row.trial ? '是' : '否' }}</template>
          </el-table-column>
          <el-table-column label="操作" fixed="right">
            <template #default="{ row }">
              <template v-if="row.status === 'CONFIRMED'">
                <el-button link type="success" @click="markAttendance(row, 'ATTENDED')">出席</el-button>
                <el-button link type="warning" @click="markAttendance(row, 'ABSENT')">缺席</el-button>
                <el-button link type="danger" @click="cancelReservation(row)">取消</el-button>
              </template>
              <span v-else class="muted">—</span>
            </template>
          </el-table-column>
        </el-table>

        <h4 class="section-title">候補名單</h4>
        <el-table :data="waitlist" v-loading="waitlistLoading" stripe>
          <el-table-column prop="queueNo" label="順位" width="60" />
          <el-table-column prop="studentName" label="學員" width="120" />
          <el-table-column label="狀態" width="110">
            <template #default="{ row }">
              <el-tag :type="waitlistTagType(row.status)">{{ waitlistLabel(row.status) }}</el-tag>
            </template>
          </el-table-column>
          <el-table-column prop="expireAt" label="保留期限" show-overflow-tooltip />
          <el-table-column label="操作" width="100" fixed="right">
            <template #default="{ row }">
              <el-button v-if="row.status === 'NOTIFIED'" link type="primary" @click="confirmWaitlist(row)">
                確認轉正
              </el-button>
              <span v-else class="muted">—</span>
            </template>
          </el-table-column>
        </el-table>
      </template>
    </el-drawer>

    <!-- 新增預約 -->
    <el-dialog v-model="bookingDialogVisible" title="新增預約" width="440px" append-to-body>
      <el-form label-position="top">
        <el-form-item label="課程" required>
          <el-select
            v-model="bookingForm.courseId"
            filterable
            placeholder="請選擇課程"
            style="width: 100%"
            :disabled="bookingLocked"
            @change="bookingForm.sessionId = null"
          >
            <el-option v-for="c in courses" :key="c.id" :label="c.name" :value="c.id" />
          </el-select>
        </el-form-item>
        <el-form-item label="場次" required>
          <el-select
            v-model="bookingForm.sessionId"
            filterable
            placeholder="請選擇場次"
            style="width: 100%"
            :disabled="bookingLocked || !bookingForm.courseId"
          >
            <el-option
              v-for="s in sessionsForBookingCourse"
              :key="s.id"
              :label="`${s.sessionDate} ${s.startTime?.slice(0, 5)}-${s.endTime?.slice(0, 5)}（${s.reservedCount}/${s.capacity}）`"
              :value="s.id"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="學員" required>
          <el-select v-model="bookingForm.studentId" filterable placeholder="請選擇學員" style="width: 100%">
            <el-option v-for="s in students" :key="s.id" :label="`${s.name}（${s.studentNo}）`" :value="s.id" />
          </el-select>
        </el-form-item>
        <el-form-item label="預約方式">
          <el-radio-group v-model="bookingForm.repeatMode">
            <el-radio-button label="once">單次</el-radio-button>
            <el-radio-button label="weekly">連續（未來每週同一時段）</el-radio-button>
          </el-radio-group>
        </el-form-item>
        <el-form-item v-if="bookingForm.repeatMode === 'weekly'" label="重複次數（含本次）" required>
          <el-input-number v-model="bookingForm.repeatCount" :min="2" :max="26" style="width: 100%" />
          <p class="hint">會依目前選的場次找出未來同一課程、同星期、同時段的場次一併預約，找不到對應場次的部分會跳過</p>
        </el-form-item>
        <el-form-item v-if="bookingForm.repeatMode === 'once'" label="體驗課">
          <el-switch v-model="bookingForm.trial" />
          <span class="hint">體驗課不扣堂數</span>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="bookingDialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="bookingSaving" @click="submitBooking">送出預約</el-button>
      </template>
    </el-dialog>

    <!-- 每日預約表 -->
    <el-dialog v-model="dailyRosterDialogVisible" title="每日預約表" width="700px" append-to-body>
      <el-date-picker
        v-model="dailyRosterDate"
        type="date"
        value-format="YYYY-MM-DD"
        style="margin-bottom: 16px"
        @change="loadDailyRoster"
      />
      <el-table :data="dailyRoster" v-loading="dailyRosterLoading" stripe>
        <el-table-column prop="startTime" label="時間" width="90">
          <template #default="{ row }">{{ row.startTime?.slice(0, 5) }}</template>
        </el-table-column>
        <el-table-column prop="courseName" label="課程" />
        <el-table-column prop="studentName" label="學員" width="120" />
        <el-table-column label="狀態" width="100">
          <template #default="{ row }">
            <el-tag :type="row.status === 'CONFIRMED' ? 'success' : row.status === 'ABSENT' ? 'danger' : ''" size="small">
              {{ statusLabel(row.status) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="體驗課" width="80">
          <template #default="{ row }">{{ row.trial ? '是' : '' }}</template>
        </el-table-column>
      </el-table>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Plus, Tickets } from '@element-plus/icons-vue'
import Sidebar from '../components/Sidebar.vue'
import http from '../api/http'

const router = useRouter()
const currentUsername = ref(localStorage.getItem('username') || 'Admin')

const courses = ref([])
const allSessions = ref([])
const students = ref([])

const selectedCourseId = ref(null)
const calendarValue = ref(new Date())
const calendarRef = ref(null)

const drawerVisible = ref(false)
const activeSessionId = ref(null)

const roster = ref([])
const waitlist = ref([])
const rosterLoading = ref(false)
const waitlistLoading = ref(false)

const bookingDialogVisible = ref(false)
const bookingSaving = ref(false)
const bookingLocked = ref(false)
const bookingForm = reactive({ courseId: null, sessionId: null, studentId: null, trial: false, repeatMode: 'once', repeatCount: 4 })

const dailyRosterDialogVisible = ref(false)
const dailyRosterDate = ref(null)
const dailyRoster = ref([])
const dailyRosterLoading = ref(false)

const visibleSessions = computed(() =>
  selectedCourseId.value ? allSessions.value.filter((s) => s.courseId === selectedCourseId.value) : allSessions.value
)
const activeSession = computed(() => allSessions.value.find((s) => s.id === activeSessionId.value) || null)
const drawerTitle = computed(() =>
  activeSession.value ? `${activeSession.value.courseName} · ${activeSession.value.sessionDate} ${activeSession.value.startTime?.slice(0, 5)}` : ''
)
const sessionsForBookingCourse = computed(() =>
  allSessions.value.filter((s) => s.courseId === bookingForm.courseId)
)

const sessionsForDate = (day) => visibleSessions.value.filter((s) => s.sessionDate === day)

const statusLabel = (s) => ({ CONFIRMED: '已確認', CANCELLED: '已取消', ATTENDED: '已出席', ABSENT: '已缺席' }[s] || s)
const statusTagType = (s) => ({ CONFIRMED: 'success', CANCELLED: 'info', ATTENDED: 'success', ABSENT: 'warning' }[s] || '')
const waitlistLabel = (s) => ({ WAITING: '候補中', NOTIFIED: '已通知轉正', CONFIRMED: '已轉正', EXPIRED: '已逾期', CANCELLED: '已取消' }[s] || s)
const waitlistTagType = (s) => ({ WAITING: 'info', NOTIFIED: 'warning', CONFIRMED: 'success', EXPIRED: 'danger', CANCELLED: 'info' }[s] || '')

const loadCourses = async () => {
  const { data } = await http.get('/api/courses')
  courses.value = data
}

const loadAllSessions = async () => {
  const { data } = await http.get('/api/course-sessions')
  allSessions.value = data
}

const loadStudents = async () => {
  const { data } = await http.get('/api/students')
  students.value = data
}

const loadRoster = async () => {
  if (!activeSessionId.value) return
  rosterLoading.value = true
  try {
    const { data } = await http.get(`/api/reservations/session/${activeSessionId.value}/roster`)
    roster.value = data
  } finally {
    rosterLoading.value = false
  }
}

const loadWaitlist = async () => {
  if (!activeSessionId.value) return
  waitlistLoading.value = true
  try {
    const { data } = await http.get(`/api/waitlist/session/${activeSessionId.value}`)
    waitlist.value = data
  } finally {
    waitlistLoading.value = false
  }
}

const refreshSessionData = async () => {
  await loadAllSessions()
  await Promise.all([loadRoster(), loadWaitlist()])
}

const openSessionDrawer = (session) => {
  activeSessionId.value = session.id
  drawerVisible.value = true
  loadRoster()
  loadWaitlist()
}

const openBookingDialog = (lockedSession = null) => {
  if (lockedSession) {
    bookingForm.courseId = lockedSession.courseId
    bookingForm.sessionId = lockedSession.id
    bookingLocked.value = true
  } else {
    bookingForm.courseId = null
    bookingForm.sessionId = null
    bookingLocked.value = false
  }
  bookingForm.studentId = null
  bookingForm.trial = false
  bookingForm.repeatMode = 'once'
  bookingForm.repeatCount = 4
  bookingDialogVisible.value = true
}

// 同課程、同星期、同時段，從選定場次（含）往後找，找出未來幾次符合條件的場次 ID，供「連續預約」一次建立多筆
const findRepeatSessionIds = (session, count) => {
  const weekday = new Date(session.sessionDate).getDay()
  return allSessions.value
    .filter((s) =>
      s.courseId === session.courseId &&
      s.startTime === session.startTime &&
      s.sessionDate >= session.sessionDate &&
      new Date(s.sessionDate).getDay() === weekday
    )
    .sort((a, b) => a.sessionDate.localeCompare(b.sessionDate))
    .slice(0, count)
    .map((s) => s.id)
}

const openDailyRosterDialog = () => {
  dailyRosterDate.value = new Date().toISOString().slice(0, 10)
  dailyRosterDialogVisible.value = true
  loadDailyRoster()
}

const loadDailyRoster = async () => {
  if (!dailyRosterDate.value) return
  dailyRosterLoading.value = true
  try {
    const { data } = await http.get(`/api/reservations/date/${dailyRosterDate.value}`)
    dailyRoster.value = data.sort((a, b) => a.startTime.localeCompare(b.startTime))
  } finally {
    dailyRosterLoading.value = false
  }
}

const submitBooking = async () => {
  if (!bookingForm.sessionId || !bookingForm.studentId) {
    ElMessage.warning('請選擇課程場次與學員')
    return
  }
  if (bookingSaving.value) return
  bookingSaving.value = true
  try {
    if (bookingForm.repeatMode === 'once') {
      const { data } = await http.post('/api/reservations', {
        studentId: bookingForm.studentId,
        sessionId: bookingForm.sessionId,
        trial: bookingForm.trial,
      })
      ElMessage.success(data.message)
    } else {
      const session = allSessions.value.find((s) => s.id === bookingForm.sessionId)
      const sessionIds = findRepeatSessionIds(session, bookingForm.repeatCount)
      let reservedCount = 0
      let waitlistedCount = 0
      for (const sessionId of sessionIds) {
        const { data } = await http.post('/api/reservations', {
          studentId: bookingForm.studentId,
          sessionId,
          trial: false,
        })
        if (data.waitlisted) waitlistedCount++
        else reservedCount++
      }
      const skipped = bookingForm.repeatCount - sessionIds.length
      ElMessage.success(
        `已預約 ${reservedCount} 場、候補 ${waitlistedCount} 場` +
          (skipped > 0 ? `，另有 ${skipped} 次找不到對應場次未建立` : '')
      )
    }
    bookingDialogVisible.value = false
    if (bookingForm.sessionId === activeSessionId.value) {
      refreshSessionData()
    } else {
      loadAllSessions()
    }
  } catch {
    // 錯誤訊息已由 http 攔截器統一顯示，這裡只需保持對話框開啟讓使用者修正
  } finally {
    bookingSaving.value = false
  }
}

const cancelReservation = async (row) => {
  try {
    await ElMessageBox.confirm(`確定要取消學員「${row.studentName}」的預約嗎？`, '取消確認', { type: 'warning' })
  } catch {
    return
  }
  try {
    await http.post(`/api/reservations/${row.id}/cancel`)
    ElMessage.success('已取消預約')
    refreshSessionData()
  } catch {
    // 錯誤訊息已由 http 攔截器統一顯示
  }
}

const markAttendance = async (row, status) => {
  try {
    await http.post(`/api/reservations/${row.id}/attendance`, { status })
    ElMessage.success('點名完成')
    loadRoster()
  } catch {
    // 錯誤訊息已由 http 攔截器統一顯示
  }
}

const confirmWaitlist = async (row) => {
  try {
    await http.post(`/api/waitlist/${row.id}/confirm`)
    ElMessage.success('候補已轉正為預約')
    refreshSessionData()
  } catch {
    // 錯誤訊息已由 http 攔截器統一顯示
  }
}

const handleLogout = () => {
  localStorage.removeItem('token')
  localStorage.removeItem('username')
  router.push('/login')
}

onMounted(() => {
  loadCourses()
  loadAllSessions()
  loadStudents()
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
.filter-card {
  margin-bottom: 20px;
}
.cal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.calendar-card :deep(.el-calendar-table .el-calendar-day) {
  height: auto;
  min-height: 90px;
  padding: 4px;
}
.cal-cell {
  height: 100%;
  display: flex;
  flex-direction: column;
  gap: 3px;
}
.cal-day {
  margin: 0 0 2px;
  font-size: 12px;
  color: #8a8d96;
}
.cal-session {
  font-size: 11px;
  background: rgba(46, 196, 182, 0.12);
  color: #1c7d73;
  border-radius: 4px;
  padding: 2px 4px;
  cursor: pointer;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.cal-session.full {
  background: rgba(217, 86, 86, 0.12);
  color: #b03a3a;
}
.cal-session:hover {
  opacity: 0.8;
}
.drawer-toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}
.section-title {
  font-size: 14px;
  font-weight: 600;
  color: #1c1f26;
  margin: 20px 0 10px;
}
.muted {
  color: #c4c5ca;
}
.hint {
  margin-left: 10px;
  font-size: 12px;
  color: #8a8d96;
}
</style>
