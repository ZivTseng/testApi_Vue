<template>
  <div class="common-layout">
    <el-container class="layout-container">
      <Sidebar />

      <el-container>
        <el-header class="app-header">
          <div class="header-left">
            <h2 class="page-title">儲值 / 繳費管理</h2>
          </div>
          <div class="user-info">
            <span class="username">{{ currentUsername }}</span>
            <el-button link type="danger" @click="handleLogout">登出</el-button>
          </div>
        </el-header>

        <el-main class="app-main">
          <el-tabs v-model="activeTab" class="tab-card">
            <!-- 方案模板 -->
            <el-tab-pane label="方案模板" name="plans">
              <div class="toolbar">
                <el-button type="primary" :icon="Plus" @click="openPlanDialog()">新增方案</el-button>
              </div>
              <el-table :data="plans" v-loading="plansLoading" stripe>
                <el-table-column prop="name" label="方案名稱" />
                <el-table-column prop="totalSessions" label="總堂數" width="100" />
                <el-table-column prop="validityDays" label="效期（天）" width="110" />
                <el-table-column label="價格" width="120">
                  <template #default="{ row }">NT$ {{ row.price }}</template>
                </el-table-column>
                <el-table-column label="操作" width="140" fixed="right">
                  <template #default="{ row }">
                    <el-button link type="primary" @click="openPlanDialog(row)">編輯</el-button>
                    <el-button link type="danger" @click="deletePlan(row)">刪除</el-button>
                  </template>
                </el-table-column>
              </el-table>
            </el-tab-pane>

            <!-- 學員儲值帳户 -->
            <el-tab-pane label="學員儲值" name="studentPlans">
              <div class="toolbar">
                <el-select v-model="billingStudentId" filterable placeholder="請選擇學員查詢儲值帳户" style="width: 260px" @change="loadStudentPlans">
                  <el-option v-for="s in students" :key="s.id" :label="`${s.name}（${s.studentNo}）`" :value="s.id" />
                </el-select>
                <el-button type="primary" :icon="Plus" :disabled="!billingStudentId" @click="openOpenPlanDialog">開通方案</el-button>
              </div>
              <el-table :data="studentPlans" v-loading="studentPlansLoading" stripe>
                <el-table-column prop="planName" label="方案" />
                <el-table-column prop="remainingSessions" label="剩餘堂數" width="100" />
                <el-table-column prop="purchaseDate" label="購買日" width="120" />
                <el-table-column prop="expireDate" label="到期日" width="120" />
                <el-table-column label="操作" width="140" fixed="right">
                  <template #default="{ row }">
                    <el-button link type="primary" @click="openAdjustDialog(row)">調整堂數</el-button>
                  </template>
                </el-table-column>
              </el-table>
            </el-tab-pane>

            <!-- 繳費紀錄 -->
            <el-tab-pane label="繳費紀錄" name="payments">
              <div class="toolbar">
                <el-button type="primary" :icon="Plus" @click="openPaymentDialog">新增繳費紀錄</el-button>
              </div>
              <el-table :data="payments" v-loading="paymentsLoading" stripe>
                <el-table-column prop="studentName" label="學員" width="120" />
                <el-table-column prop="planName" label="方案" />
                <el-table-column label="金額" width="100">
                  <template #default="{ row }">NT$ {{ row.amount }}</template>
                </el-table-column>
                <el-table-column label="方式" width="90">
                  <template #default="{ row }">{{ row.method === 'CASH' ? '現金' : '轉帳' }}</template>
                </el-table-column>
                <el-table-column prop="paymentDate" label="付款日" width="120" />
                <el-table-column label="狀態" width="100">
                  <template #default="{ row }">
                    <el-tag :type="row.status === 'CONFIRMED' ? 'success' : 'warning'">
                      {{ row.status === 'CONFIRMED' ? '已確認' : '待確認' }}
                    </el-tag>
                  </template>
                </el-table-column>
                <el-table-column label="操作" width="190" fixed="right">
                  <template #default="{ row }">
                    <template v-if="row.status === 'PENDING'">
                      <el-button link type="primary" @click="openEditPaymentDialog(row)">編輯</el-button>
                      <el-button link type="success" @click="confirmPayment(row)">確認收款</el-button>
                    </template>
                    <span v-else class="muted">已確認，不可修改</span>
                  </template>
                </el-table-column>
              </el-table>
            </el-tab-pane>
          </el-tabs>
        </el-main>
      </el-container>
    </el-container>

    <!-- 方案新增/編輯 -->
    <el-dialog v-model="planDialogVisible" :title="planForm.id ? '編輯方案' : '新增方案'" width="420px">
      <el-form :model="planForm" label-position="top">
        <el-form-item label="方案名稱" required>
          <el-input v-model="planForm.name" />
        </el-form-item>
        <el-form-item label="總堂數" required>
          <el-input-number v-model="planForm.totalSessions" :min="1" style="width: 100%" />
        </el-form-item>
        <el-form-item label="效期（天）" required>
          <el-input-number v-model="planForm.validityDays" :min="1" style="width: 100%" />
        </el-form-item>
        <el-form-item label="價格" required>
          <el-input-number v-model="planForm.price" :min="0" style="width: 100%" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="planDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="savePlan">儲存</el-button>
      </template>
    </el-dialog>

    <!-- 開通方案 -->
    <el-dialog v-model="openPlanDialogVisible" title="開通方案" width="420px">
      <el-form label-position="top">
        <el-form-item label="方案" required>
          <el-select v-model="openPlanForm.planId" placeholder="請選擇方案" style="width: 100%">
            <el-option v-for="p in plans" :key="p.id" :label="`${p.name}（${p.totalSessions} 堂）`" :value="p.id" />
          </el-select>
        </el-form-item>
        <el-form-item label="購買日">
          <el-date-picker v-model="openPlanForm.purchaseDate" type="date" value-format="YYYY-MM-DD" style="width: 100%" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="openPlanDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="submitOpenPlan">開通</el-button>
      </template>
    </el-dialog>

    <!-- 調整堂數 -->
    <el-dialog v-model="adjustDialogVisible" title="調整堂數" width="380px">
      <el-form label-position="top">
        <el-form-item label="調整量（正數補回 / 負數扣除）" required>
          <el-input-number v-model="adjustForm.delta" style="width: 100%" />
        </el-form-item>
        <el-form-item label="原因" required>
          <el-input v-model="adjustForm.reason" placeholder="例如：補課加贈、行政調整" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="adjustDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="submitAdjust">送出</el-button>
      </template>
    </el-dialog>

    <!-- 新增/編輯繳費紀錄 -->
    <el-dialog v-model="paymentDialogVisible" :title="paymentForm.id ? '編輯繳費紀錄' : '新增繳費紀錄'" width="460px">
      <el-form label-position="top">
        <el-form-item label="學員" required>
          <el-select v-model="paymentForm.studentId" filterable placeholder="請選擇學員" style="width: 100%">
            <el-option v-for="s in students" :key="s.id" :label="`${s.name}（${s.studentNo}）`" :value="s.id" />
          </el-select>
        </el-form-item>
        <el-form-item label="方案" required>
          <el-select v-model="paymentForm.planId" placeholder="請選擇方案" style="width: 100%">
            <el-option v-for="p in plans" :key="p.id" :label="p.name" :value="p.id" />
          </el-select>
        </el-form-item>
        <el-form-item label="金額" required>
          <el-input-number v-model="paymentForm.amount" :min="0" style="width: 100%" />
        </el-form-item>
        <el-form-item label="付款方式" required>
          <el-select v-model="paymentForm.method" style="width: 100%">
            <el-option label="現金" value="CASH" />
            <el-option label="轉帳" value="TRANSFER" />
          </el-select>
        </el-form-item>
        <el-form-item label="付款日" required>
          <el-date-picker v-model="paymentForm.paymentDate" type="date" value-format="YYYY-MM-DD" style="width: 100%" />
        </el-form-item>
        <el-form-item label="轉帳末五碼" v-if="paymentForm.method === 'TRANSFER'">
          <el-input v-model="paymentForm.transferLast5" />
        </el-form-item>
        <el-form-item label="備註">
          <el-input v-model="paymentForm.note" type="textarea" :rows="2" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="paymentDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="submitPayment">儲存</el-button>
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
const activeTab = ref('plans')

const plans = ref([])
const plansLoading = ref(false)
const students = ref([])
const studentPlans = ref([])
const studentPlansLoading = ref(false)
const payments = ref([])
const paymentsLoading = ref(false)
const billingStudentId = ref(null)

const planDialogVisible = ref(false)
const planForm = reactive({ id: null, name: '', totalSessions: 10, validityDays: 90, price: 0 })

const openPlanDialogVisible = ref(false)
const openPlanForm = reactive({ planId: null, purchaseDate: null })

const adjustDialogVisible = ref(false)
const adjustForm = reactive({ studentPlanId: null, delta: 0, reason: '' })

const paymentDialogVisible = ref(false)
const emptyPayment = () => ({
  id: null,
  studentId: null,
  planId: null,
  amount: 0,
  method: 'CASH',
  paymentDate: null,
  transferLast5: '',
  note: '',
})
const paymentForm = reactive(emptyPayment())

const loadPlans = async () => {
  plansLoading.value = true
  try {
    const { data } = await http.get('/api/plans')
    plans.value = data
  } finally {
    plansLoading.value = false
  }
}

const loadStudents = async () => {
  const { data } = await http.get('/api/students')
  students.value = data
}

const loadStudentPlans = async () => {
  if (!billingStudentId.value) {
    studentPlans.value = []
    return
  }
  studentPlansLoading.value = true
  try {
    const { data } = await http.get(`/api/student-plans/student/${billingStudentId.value}`)
    studentPlans.value = data
  } finally {
    studentPlansLoading.value = false
  }
}

const loadPayments = async () => {
  paymentsLoading.value = true
  try {
    const { data } = await http.get('/api/payments')
    payments.value = data
  } finally {
    paymentsLoading.value = false
  }
}

const openPlanDialog = (row) => {
  Object.assign(planForm, row ? { ...row } : { id: null, name: '', totalSessions: 10, validityDays: 90, price: 0 })
  planDialogVisible.value = true
}

const savePlan = async () => {
  if (!planForm.name) {
    ElMessage.warning('請填寫方案名稱')
    return
  }
  const payload = {
    name: planForm.name,
    totalSessions: planForm.totalSessions,
    validityDays: planForm.validityDays,
    price: planForm.price,
  }
  try {
    if (planForm.id) {
      await http.put(`/api/plans/${planForm.id}`, payload)
    } else {
      await http.post('/api/plans', payload)
    }
    ElMessage.success('方案已儲存')
    planDialogVisible.value = false
    loadPlans()
  } catch {
    // 錯誤訊息已由 http 攔截器統一顯示
  }
}

const deletePlan = async (row) => {
  try {
    await ElMessageBox.confirm(`確定要刪除方案「${row.name}」嗎？`, '刪除確認', { type: 'warning' })
  } catch {
    return
  }
  try {
    await http.delete(`/api/plans/${row.id}`)
    ElMessage.success('已刪除')
    loadPlans()
  } catch {
    // 錯誤訊息已由 http 攔截器統一顯示
  }
}

const openOpenPlanDialog = () => {
  openPlanForm.planId = null
  openPlanForm.purchaseDate = null
  openPlanDialogVisible.value = true
}

const submitOpenPlan = async () => {
  if (!openPlanForm.planId) {
    ElMessage.warning('請選擇方案')
    return
  }
  try {
    await http.post('/api/student-plans', {
      studentId: billingStudentId.value,
      planId: openPlanForm.planId,
      purchaseDate: openPlanForm.purchaseDate,
    })
    ElMessage.success('方案已開通')
    openPlanDialogVisible.value = false
    loadStudentPlans()
  } catch {
    // 錯誤訊息已由 http 攔截器統一顯示
  }
}

const openAdjustDialog = (row) => {
  adjustForm.studentPlanId = row.id
  adjustForm.delta = 0
  adjustForm.reason = ''
  adjustDialogVisible.value = true
}

const submitAdjust = async () => {
  if (!adjustForm.delta || !adjustForm.reason) {
    ElMessage.warning('請填寫調整量與原因')
    return
  }
  try {
    await http.post(`/api/student-plans/${adjustForm.studentPlanId}/adjust`, {
      delta: adjustForm.delta,
      reason: adjustForm.reason,
    })
    ElMessage.success('堂數已調整')
    adjustDialogVisible.value = false
    loadStudentPlans()
  } catch {
    // 錯誤訊息已由 http 攔截器統一顯示
  }
}

const openPaymentDialog = () => {
  Object.assign(paymentForm, emptyPayment())
  paymentDialogVisible.value = true
}

const openEditPaymentDialog = (row) => {
  Object.assign(paymentForm, { ...row })
  paymentDialogVisible.value = true
}

const submitPayment = async () => {
  if (!paymentForm.studentId || !paymentForm.planId || !paymentForm.paymentDate) {
    ElMessage.warning('請填寫完整繳費資訊')
    return
  }
  try {
    if (paymentForm.id) {
      await http.put(`/api/payments/${paymentForm.id}`, paymentForm)
      ElMessage.success('繳費紀錄已更新')
    } else {
      await http.post('/api/payments', paymentForm)
      ElMessage.success('繳費紀錄已建立')
    }
    paymentDialogVisible.value = false
    loadPayments()
  } catch {
    // 錯誤訊息已由 http 攔截器統一顯示
  }
}

const confirmPayment = async (row) => {
  try {
    await http.post(`/api/payments/${row.id}/confirm`)
    ElMessage.success('已確認收款')
    loadPayments()
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
  loadPlans()
  loadStudents()
  loadPayments()
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
.tab-card {
  background: #fff;
  border-radius: 12px;
  border: 1px solid #e8e6e0;
  padding: 8px 20px 20px;
}
.toolbar {
  display: flex;
  align-items: center;
  gap: 12px;
  margin: 12px 0 16px;
}
.muted {
  color: #c4c5ca;
}
</style>
