<template>
  <div class="common-layout">
    <el-container>
      <el-header class="app-header">
        <div class="logo">
          <el-icon><Menu /></el-icon>
          <span>部落格管理後台</span>
        </div>
        <div class="user-info">
          <el-avatar :size="32" src="https://cube.elemecdn.com/0/88/03b0d39583f48206768a7534e55bcpng.png" />
          <span class="username">Admin</span>
          <el-button link @click="handleLogout">登出</el-button>
        </div>
      </el-header>

      <el-main class="app-main">
        <el-card shadow="never" class="table-card">
          <div class="toolbar">
            <el-input
              v-model="searchQuery"
              placeholder="搜尋文章標題..."
              style="width: 300px"
              prefix-icon="Search"
              clearable
              @clear="fetchArticles"
            />
            <el-button type="primary" icon="Plus" @click="handleAdd">發布新文章</el-button>
          </div>

          <el-table :data="articles" stripe style="width: 100%" v-loading="loading">
            <el-table-column prop="id" label="ID" width="80" align="center" />
            <el-table-column prop="title" label="文章標題" min-width="200" show-overflow-tooltip />
            <el-table-column prop="author" label="作者" width="120" />
            <el-table-column prop="createdAt" label="建立時間" width="180" sortable />
            <el-table-column label="操作" width="180" align="right">
              <template #default="scope">
                <el-button size="small" icon="Edit" @click="handleEdit(scope.row)">編輯</el-button>
                <el-button size="small" type="danger" icon="Delete" @click="handleDelete(scope.row)">刪除</el-button>
              </template>
            </el-table-column>
          </el-table>

          <div class="pagination-container">
            <el-pagination
              background
              layout="total, prev, pager, next"
              :total="total"
              :page-size="pageSize"
              v-model:current-page="currentPage"
              @current-change="fetchArticles"
            />
          </div>
        </el-card>
      </el-main>
    </el-container>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessageBox, ElMessage } from 'element-plus'

const router = useRouter()
const loading = ref(false)
const searchQuery = ref('')
const articles = ref([])
const total = ref(0)
const currentPage = ref(1)
const pageSize = ref(10)

// 模擬從後端抓取資料 (你之後可以改成 axios.get('/api/articles'))
const fetchArticles = () => {
  loading.value = true
  setTimeout(() => {
    articles.value = [
      { id: 101, title: '如何使用 Spring Boot 3 構建 API', author: 'Ziv', createdAt: '2026-03-10' },
      { id: 102, title: 'Vue 3 + Element Plus 的美化技巧', author: 'Admin', createdAt: '2026-03-12' },
      { id: 103, title: 'JWT 驗證流程解析', author: 'Austin', createdAt: '2026-03-13' }
    ]
    total.value = 3
    loading.value = false
  }, 500)
}

const handleLogout = () => {
  localStorage.clear()
  router.push('/login')
}

const handleDelete = (row) => {
  ElMessageBox.confirm(`確定要刪除「${row.title}」嗎？`, '警告', {
    type: 'warning',
    confirmButtonText: '確定',
    cancelButtonText: '取消'
  }).then(() => {
    ElMessage.success('刪除成功')
  })
}

onMounted(fetchArticles)
</script>

<style scoped>
.app-header {
  background-color: #fff;
  border-bottom: 1px solid #e6e6e6;
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0 40px;
  height: 60px;
}
.logo {
  display: flex;
  align-items: center;
  font-size: 18px;
  font-weight: bold;
  color: #409EFF;
  gap: 10px;
}
.user-info {
  display: flex;
  align-items: center;
  gap: 12px;
}
.username {
  font-size: 14px;
  color: #606266;
}
.app-main {
  background-color: #f0f2f5;
  min-height: calc(100vh - 60px);
  padding: 24px;
}
.table-card {
  border-radius: 8px;
}
.toolbar {
  display: flex;
  justify-content: space-between;
  margin-bottom: 20px;
}
.pagination-container {
  margin-top: 25px;
  display: flex;
  justify-content: flex-end;
}
</style>