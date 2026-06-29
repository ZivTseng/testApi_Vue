<template>
  <div class="common-layout">
    <el-container class="layout-container">
      <Sidebar />

      <el-container>
        <el-header class="app-header">
          <div class="header-left">
            <h2 class="page-title">系統參數設定</h2>
          </div>
          <div class="user-info">
            <span class="username">{{ currentUsername }}</span>
            <el-button link type="danger" @click="handleLogout">登出</el-button>
          </div>
        </el-header>

        <el-main class="app-main">
          <el-card class="panel" shadow="never">
            <p class="hint">這裡的數值會直接影響取消預約、候補保留等營運規則，調整後立即生效。</p>
            <el-table :data="params" v-loading="loading" stripe>
              <el-table-column prop="paramKey" label="參數鍵" width="260" />
              <el-table-column prop="description" label="說明" show-overflow-tooltip />
              <el-table-column prop="paramValue" label="目前數值" width="120" />
              <el-table-column label="操作" width="120" fixed="right">
                <template #default="{ row }">
                  <el-button link type="primary" @click="openEditDialog(row)">編輯</el-button>
                </template>
              </el-table-column>
            </el-table>
          </el-card>
        </el-main>
      </el-container>
    </el-container>

    <el-dialog v-model="editDialogVisible" title="編輯參數" width="400px">
      <el-form label-position="top">
        <el-form-item :label="editForm.paramKey">
          <el-input v-model="editForm.paramValue" />
          <p class="dialog-hint">{{ editForm.description }}</p>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="editDialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="paramSaving" @click="saveParam">儲存</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import Sidebar from '../components/Sidebar.vue'
import http from '../api/http'

const router = useRouter()
const currentUsername = ref(localStorage.getItem('username') || 'Admin')

const params = ref([])
const loading = ref(false)
const editDialogVisible = ref(false)
const editForm = reactive({ paramKey: '', paramValue: '', description: '' })
const paramSaving = ref(false)

const loadParams = async () => {
  loading.value = true
  try {
    const { data } = await http.get('/api/system-parameters')
    params.value = data
  } finally {
    loading.value = false
  }
}

const openEditDialog = (row) => {
  Object.assign(editForm, { ...row })
  editDialogVisible.value = true
}

const saveParam = async () => {
  if (!editForm.paramValue) {
    ElMessage.warning('請輸入數值')
    return
  }
  if (paramSaving.value) return
  paramSaving.value = true
  try {
    await http.put(`/api/system-parameters/${editForm.paramKey}`, { paramValue: editForm.paramValue })
    ElMessage.success('參數已更新')
    editDialogVisible.value = false
    loadParams()
  } catch {
    // 錯誤訊息已由 http 攔截器統一顯示
  } finally {
    paramSaving.value = false
  }
}

const handleLogout = () => {
  localStorage.removeItem('token')
  localStorage.removeItem('username')
  router.push('/login')
}

onMounted(() => {
  loadParams()
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
.hint {
  color: #8a8d96;
  font-size: 13px;
  margin: 0 0 16px;
}
.dialog-hint {
  color: #8a8d96;
  font-size: 12px;
  margin: 6px 0 0;
}
</style>
