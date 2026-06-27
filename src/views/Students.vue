<template>
  <div class="common-layout">
    <el-container class="layout-container">
      <Sidebar />

      <el-container>
        <el-header class="app-header">
          <div class="header-left">
            <h2 class="page-title">學員 / 家長管理</h2>
          </div>
          <div class="user-info">
            <span class="username">{{ currentUsername }}</span>
            <el-button link type="danger" @click="handleLogout">登出</el-button>
          </div>
        </el-header>

        <el-main class="app-main">
          <el-tabs v-model="activeTab" class="tab-card">
            <el-tab-pane label="學員管理" name="students">
              <div class="toolbar">
                <el-input
                  v-model="studentKeyword"
                  placeholder="搜尋學號或姓名"
                  :prefix-icon="Search"
                  clearable
                  style="width: 220px"
                />
                <el-select v-model="studentGenderFilter" placeholder="全部性別" clearable style="width: 140px">
                  <el-option label="男" value="MALE" />
                  <el-option label="女" value="FEMALE" />
                  <el-option label="其他" value="OTHER" />
                </el-select>
                <el-select v-model="studentParentFilter" placeholder="依家長篩選" clearable filterable style="width: 180px">
                  <el-option v-for="p in parents" :key="p.id" :label="p.name" :value="p.id" />
                </el-select>
                <div class="toolbar-spacer" />
                <el-button type="primary" :icon="Plus" @click="openStudentDialog()">新增學員</el-button>
              </div>
              <el-table :data="filteredStudents" v-loading="studentsLoading" stripe>
                <el-table-column prop="studentNo" label="學號" width="120" />
                <el-table-column prop="name" label="姓名" width="120" />
                <el-table-column label="性別" width="90">
                  <template #default="{ row }">{{ genderLabel(row.gender) }}</template>
                </el-table-column>
                <el-table-column prop="birthday" label="生日" width="120" />
                <el-table-column label="家長">
                  <template #default="{ row }">{{ parentNames(row.parentIds) }}</template>
                </el-table-column>
                <el-table-column prop="note" label="備註" show-overflow-tooltip />
                <el-table-column label="操作" width="160" fixed="right">
                  <template #default="{ row }">
                    <el-button link type="primary" @click="openStudentDialog(row)">編輯</el-button>
                    <el-button link type="danger" @click="deleteStudent(row)">刪除</el-button>
                  </template>
                </el-table-column>
              </el-table>
            </el-tab-pane>

            <el-tab-pane label="家長管理" name="parents">
              <div class="toolbar">
                <el-input
                  v-model="parentKeyword"
                  placeholder="搜尋姓名或電話"
                  :prefix-icon="Search"
                  clearable
                  style="width: 220px"
                />
                <div class="toolbar-spacer" />
                <el-button type="primary" :icon="Plus" @click="openParentDialog()">新增家長</el-button>
              </div>
              <el-table :data="filteredParents" v-loading="parentsLoading" stripe>
                <el-table-column prop="name" label="姓名" width="140" />
                <el-table-column prop="phone" label="電話" width="140" />
                <el-table-column label="LINE 綁定" width="100">
                  <template #default="{ row }">
                    <el-tag :type="row.lineUserId ? 'success' : 'info'" size="small">
                      {{ row.lineUserId ? '已綁定' : '未綁定' }}
                    </el-tag>
                  </template>
                </el-table-column>
                <el-table-column label="孩子數量" width="100">
                  <template #default="{ row }">{{ row.studentIds?.length || 0 }}</template>
                </el-table-column>
                <el-table-column label="操作" width="240" fixed="right">
                  <template #default="{ row }">
                    <el-button link type="warning" @click="generateBindingCode(row)">產生綁定碼</el-button>
                    <el-button link type="primary" @click="openParentDialog(row)">編輯</el-button>
                    <el-button link type="danger" @click="deleteParent(row)">刪除</el-button>
                  </template>
                </el-table-column>
              </el-table>
            </el-tab-pane>
          </el-tabs>
        </el-main>
      </el-container>
    </el-container>

    <!-- 學員新增/編輯 -->
    <el-dialog v-model="studentDialogVisible" :title="studentForm.id ? '編輯學員' : '新增學員'" width="480px">
      <el-form :model="studentForm" label-position="top">
        <el-form-item label="學號" required>
          <el-input v-model="studentForm.studentNo" placeholder="例如 S001" />
        </el-form-item>
        <el-form-item label="姓名" required>
          <el-input v-model="studentForm.name" />
        </el-form-item>
        <el-form-item label="性別">
          <el-select v-model="studentForm.gender" placeholder="請選擇" style="width: 100%">
            <el-option label="男" value="MALE" />
            <el-option label="女" value="FEMALE" />
            <el-option label="其他" value="OTHER" />
          </el-select>
        </el-form-item>
        <el-form-item label="生日">
          <el-date-picker v-model="studentForm.birthday" type="date" value-format="YYYY-MM-DD" style="width: 100%" />
        </el-form-item>
        <el-form-item label="家長">
          <el-select v-model="studentForm.parentIds" multiple placeholder="請選擇家長" style="width: 100%">
            <el-option v-for="p in parents" :key="p.id" :label="p.name" :value="p.id" />
          </el-select>
        </el-form-item>
        <el-form-item label="備註">
          <el-input v-model="studentForm.note" type="textarea" :rows="2" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="studentDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="saveStudent">儲存</el-button>
      </template>
    </el-dialog>

    <!-- 家長新增/編輯 -->
    <el-dialog v-model="parentDialogVisible" :title="parentForm.id ? '編輯家長' : '新增家長'" width="420px">
      <el-form :model="parentForm" label-position="top">
        <el-form-item label="姓名" required>
          <el-input v-model="parentForm.name" />
        </el-form-item>
        <el-form-item label="電話">
          <el-input v-model="parentForm.phone" />
        </el-form-item>
        <el-form-item label="LINE User ID">
          <el-input v-model="parentForm.lineUserId" placeholder="綁定 LINE 後自動帶入，可留空" />
        </el-form-item>
        <el-form-item label="孩子">
          <el-select v-model="parentForm.studentIds" multiple placeholder="請選擇孩子" style="width: 100%">
            <el-option v-for="s in students" :key="s.id" :label="s.name" :value="s.id" />
          </el-select>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="parentDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="saveParent">儲存</el-button>
      </template>
    </el-dialog>

    <!-- 綁定驗證碼結果 -->
    <el-dialog v-model="bindingCodeDialogVisible" title="LINE 綁定驗證碼" width="400px">
      <div class="binding-code-box">
        <p class="binding-hint">請告知「{{ bindingCodeResult.parentName }}」加入 LINE 官方帳號後，於對話中輸入以下驗證碼：</p>
        <div class="binding-code">{{ bindingCodeResult.code }}</div>
        <p class="binding-hint">驗證碼將於 {{ bindingCodeResult.expireAt }} 失效（15 分鐘內有效）</p>
      </div>
      <template #footer>
        <el-button type="primary" @click="bindingCodeDialogVisible = false">關閉</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Plus, Search } from '@element-plus/icons-vue'
import Sidebar from '../components/Sidebar.vue'
import http from '../api/http'

const router = useRouter()
const currentUsername = ref(localStorage.getItem('username') || 'Admin')
const activeTab = ref('students')

const students = ref([])
const parents = ref([])
const studentsLoading = ref(false)
const parentsLoading = ref(false)

const studentKeyword = ref('')
const studentGenderFilter = ref(null)
const studentParentFilter = ref(null)
const parentKeyword = ref('')

const filteredStudents = computed(() => {
  const keyword = studentKeyword.value.trim().toLowerCase()
  return students.value.filter((s) => {
    const matchesKeyword =
      !keyword || s.studentNo.toLowerCase().includes(keyword) || s.name.toLowerCase().includes(keyword)
    const matchesGender = !studentGenderFilter.value || s.gender === studentGenderFilter.value
    const matchesParent = !studentParentFilter.value || (s.parentIds || []).includes(studentParentFilter.value)
    return matchesKeyword && matchesGender && matchesParent
  })
})

const filteredParents = computed(() => {
  const keyword = parentKeyword.value.trim().toLowerCase()
  if (!keyword) return parents.value
  return parents.value.filter(
    (p) => p.name.toLowerCase().includes(keyword) || (p.phone || '').toLowerCase().includes(keyword)
  )
})

const studentDialogVisible = ref(false)
const parentDialogVisible = ref(false)
const bindingCodeDialogVisible = ref(false)
const bindingCodeResult = reactive({ parentName: '', code: '', expireAt: '' })

const emptyStudent = () => ({ id: null, studentNo: '', name: '', gender: null, birthday: null, note: '', parentIds: [] })
const emptyParent = () => ({ id: null, name: '', phone: '', lineUserId: '', studentIds: [] })

const studentForm = reactive(emptyStudent())
const parentForm = reactive(emptyParent())

const genderLabel = (g) => ({ MALE: '男', FEMALE: '女', OTHER: '其他' }[g] || '-')
const parentNames = (ids) => {
  if (!ids || ids.length === 0) return '-'
  return ids.map((id) => parents.value.find((p) => p.id === id)?.name).filter(Boolean).join('、') || '-'
}

const loadStudents = async () => {
  studentsLoading.value = true
  try {
    const { data } = await http.get('/api/students')
    students.value = data
  } finally {
    studentsLoading.value = false
  }
}

const loadParents = async () => {
  parentsLoading.value = true
  try {
    const { data } = await http.get('/api/parents')
    parents.value = data
  } finally {
    parentsLoading.value = false
  }
}

const openStudentDialog = (row) => {
  Object.assign(studentForm, row ? { ...row, parentIds: [...(row.parentIds || [])] } : emptyStudent())
  studentDialogVisible.value = true
}

const saveStudent = async () => {
  if (!studentForm.studentNo || !studentForm.name) {
    ElMessage.warning('請填寫學號與姓名')
    return
  }
  const payload = {
    studentNo: studentForm.studentNo,
    name: studentForm.name,
    gender: studentForm.gender,
    birthday: studentForm.birthday,
    note: studentForm.note,
    parentIds: studentForm.parentIds,
  }
  try {
    if (studentForm.id) {
      await http.put(`/api/students/${studentForm.id}`, payload)
    } else {
      await http.post('/api/students', payload)
    }
    ElMessage.success('學員資料已儲存')
    studentDialogVisible.value = false
    loadStudents()
    loadParents() // 學員的家長綁定會影響家長端的孩子數量，需同步刷新
  } catch {
    // 錯誤訊息已由 http 攔截器統一顯示，這裡只需保持對話框開啟讓使用者修正
  }
}

const deleteStudent = async (row) => {
  try {
    await ElMessageBox.confirm(`確定要刪除學員「${row.name}」嗎？`, '刪除確認', { type: 'warning' })
  } catch {
    return // 使用者取消刪除
  }
  try {
    await http.delete(`/api/students/${row.id}`)
    ElMessage.success('已刪除')
    loadStudents()
    loadParents()
  } catch {
    // 錯誤訊息已由 http 攔截器統一顯示
  }
}

const openParentDialog = (row) => {
  Object.assign(parentForm, row ? { ...row, studentIds: [...(row.studentIds || [])] } : emptyParent())
  parentDialogVisible.value = true
}

const saveParent = async () => {
  if (!parentForm.name) {
    ElMessage.warning('請填寫家長姓名')
    return
  }
  const payload = {
    name: parentForm.name,
    phone: parentForm.phone,
    lineUserId: parentForm.lineUserId,
    studentIds: parentForm.studentIds,
  }
  try {
    if (parentForm.id) {
      await http.put(`/api/parents/${parentForm.id}`, payload)
    } else {
      await http.post('/api/parents', payload)
    }
    ElMessage.success('家長資料已儲存')
    parentDialogVisible.value = false
    loadParents()
    loadStudents() // 家長綁定的孩子清單會影響學員端的家長顯示，需同步刷新
  } catch {
    // 錯誤訊息已由 http 攔截器統一顯示，這裡只需保持對話框開啟讓使用者修正
  }
}

const generateBindingCode = async (row) => {
  try {
    const { data } = await http.post(`/api/parents/${row.id}/binding-code`)
    bindingCodeResult.parentName = row.name
    bindingCodeResult.code = data.code
    bindingCodeResult.expireAt = new Date(data.expireAt).toLocaleString('zh-TW', { hour12: false })
    bindingCodeDialogVisible.value = true
  } catch {
    // 錯誤訊息已由 http 攔截器統一顯示
  }
}

const deleteParent = async (row) => {
  try {
    await ElMessageBox.confirm(`確定要刪除家長「${row.name}」嗎？`, '刪除確認', { type: 'warning' })
  } catch {
    return // 使用者取消刪除
  }
  try {
    await http.delete(`/api/parents/${row.id}`)
    ElMessage.success('已刪除')
    loadParents()
    loadStudents()
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
  loadParents()
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
  flex-wrap: wrap;
}
.toolbar-spacer {
  flex: 1;
}
.binding-code-box {
  text-align: center;
  padding: 8px 0;
}
.binding-code {
  font-size: 36px;
  font-weight: 700;
  letter-spacing: 8px;
  color: #b8924f;
  margin: 16px 0;
}
.binding-hint {
  font-size: 13px;
  color: #8a8d96;
  margin: 0;
}
</style>
