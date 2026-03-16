<template>
  <div class="common-layout">
    <el-container class="layout-container">
      
      <Sidebar />

      <el-container>
        <el-header class="app-header">
          <div class="header-left">
            <h2 class="page-title">文章管理</h2>
          </div>
          <div class="user-info">
            <el-avatar :size="32" src="https://cube.elemecdn.com/0/88/03b0d39583f48206768a7534e55bcpng.png" />
            <span class="username">{{ currentUsername }}</span>
            <el-button link type="danger" @click="handleLogout">登出</el-button>
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
                @keyup.enter="fetchArticles"
              />
              <el-button type="primary" icon="Plus" @click="openAddDialog">發布新文章</el-button>
            </div>

            <el-table :data="articles" stripe border style="width: 100%" v-loading="loading">
              <el-table-column prop="id" label="ID" width="80" align="center" />
              <el-table-column prop="title" label="文章標題" min-width="250" show-overflow-tooltip />
              <el-table-column prop="authorName" label="作者" width="120" />
              <el-table-column prop="createdAt" label="建立時間" width="180" sortable />
              
              <el-table-column label="操作" width="200" align="center" fixed="right">
                <template #default="scope">
                  <el-button size="small" type="primary" plain icon="Edit" @click="openEditDialog(scope.row)">編輯</el-button>
                  <el-button size="small" type="danger" plain icon="Delete" @click="handleDelete(scope.row)">刪除</el-button>
                </template>
              </el-table-column>
            </el-table>

            <div class="pagination-container">
              <el-pagination
                background
                layout="total, sizes, prev, pager, next, jumper"
                :total="total"
                v-model:page-size="pageSize"
                :page-sizes="[5, 10, 20, 50]"
                v-model:current-page="currentPage"
                @size-change="fetchArticles"
                @current-change="fetchArticles"
              />
            </div>
          </el-card>
        </el-main>
      </el-container>
    </el-container>

    <el-dialog v-model="dialogVisible" :title="dialogTitle" width="60%" destroy-on-close>
      <el-form :model="articleForm" label-width="80px" size="large">
        <el-form-item label="標題" required>
          <el-input v-model="articleForm.title" placeholder="請輸入文章標題" />
        </el-form-item>
        <el-form-item label="內容" required>
          <el-input 
            v-model="articleForm.content" 
            type="textarea" 
            :rows="10" 
            placeholder="請輸入文章內容..." 
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <span class="dialog-footer">
          <el-button @click="dialogVisible = false">取 消</el-button>
          <el-button type="primary" @click="saveArticle" :loading="submitLoading">確認儲存</el-button>
        </span>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
// 1. 引入剛才建立的 Sidebar 組件
import Sidebar from '../components/Sidebar.vue'

import { ref, reactive, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessageBox, ElMessage } from 'element-plus'
import axios from 'axios'

const router = useRouter()
const currentUsername = ref(localStorage.getItem('username') || 'Admin')

// --- 狀態變數 ---
const loading = ref(false)
const searchQuery = ref('')
const articles = ref([])
const total = ref(0)
const currentPage = ref(1)
const pageSize = ref(10)

const dialogVisible = ref(false)
const dialogTitle = ref('發布新文章')
const submitLoading = ref(false)
const articleForm = reactive({
  id: null,
  title: '',
  content: '',
  status: 'published' // 👈 給它一個預設值
})

// --- Axios API 設定 (自動帶 Token) ---
const api = axios.create({
  baseURL: 'http://localhost:8080/api',
  timeout: 5000
})

api.interceptors.request.use(config => {
  const token = localStorage.getItem('token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

api.interceptors.response.use(res => res, err => {
  if (err.response && (err.response.status === 401 || err.response.status === 403)) {
    ElMessage.error('登入已過期或權限不足，請重新登入')
    handleLogout()
  }
  return Promise.reject(err)
})

// --- 核心 CRUD 功能 ---

// 1. 取得文章列表 (READ)
const fetchArticles = async () => {
  loading.value = true
  try {
    const res = await api.get('/articles', {
      params: {
        keyword: searchQuery.value,
        page: currentPage.value - 1, 
        size: pageSize.value
      }
    })
    articles.value = res.data.content 
    total.value = res.data.totalElements
  } catch (err) {
    console.error(err)
    ElMessage.error('無法取得文章列表，請確認後端是否啟動')
  } finally {
    loading.value = false
  }
}

// 2. 開啟新增彈窗
const openAddDialog = () => {
  dialogTitle.value = '發布新文章'
  articleForm.id = null
  articleForm.title = ''
  articleForm.content = ''
  dialogVisible.value = true
}

// 3. 開啟編輯彈窗
const openEditDialog = (row) => {
  dialogTitle.value = '編輯文章'
  articleForm.id = row.id
  articleForm.title = row.title
  articleForm.content = row.content
  dialogVisible.value = true
}

// 4. 儲存文章 (CREATE & UPDATE)
const saveArticle = async () => {
  if (!articleForm.title.trim() || !articleForm.content.trim()) {
    ElMessage.warning('文章標題與內容不可為空！')
    return
  }
  
  submitLoading.value = true
  try {
    // 👇 把要傳給後端的資料包裝好，確保包含 status
    const payload = {
      title: articleForm.title,
      content: articleForm.content,
      status: articleForm.status 
    }

    if (articleForm.id) {
      // 編輯文章
      await api.put(`/articles/${articleForm.id}`, payload)
      ElMessage.success('文章更新成功！')
    } else {
      // 新增文章
      await api.post('/articles', payload)
      ElMessage.success('新文章發布成功！')
    }
    
    dialogVisible.value = false
    fetchArticles() // 重新整理列表
    
  } catch (err) {
    // 👇 這樣寫，F12 的 Console 才會印出 Spring Boot 傳回來的真實死因
    console.error('後端回傳的錯誤：', err.response?.data || err)
    ElMessage.error('儲存失敗，請按 F12 看 Console 的詳細錯誤')
  } finally {
    submitLoading.value = false
  }
}

// 5. 刪除文章 (DELETE)
const handleDelete = (row) => {
  ElMessageBox.confirm(`確定要永久刪除文章「${row.title}」嗎？`, '刪除警告', {
    confirmButtonText: '確定刪除',
    cancelButtonText: '取消',
    type: 'error'
  }).then(async () => {
    try {
      await api.delete(`/articles/${row.id}`)
      ElMessage.success('刪除成功')
      
      if (articles.value.length === 1 && currentPage.value > 1) {
        currentPage.value -= 1
      }
      fetchArticles()
    } catch (err) {
      ElMessage.error('刪除失敗')
    }
  }).catch(() => {})
}

// --- 登出功能 ---
const handleLogout = () => {
  localStorage.removeItem('token')
  localStorage.removeItem('username')
  router.push('/login')
}

// 組件掛載時自動抓取資料
onMounted(() => {
  fetchArticles()
})
</script>

<style scoped>
/* 讓整個佈局撐滿螢幕高度 */
.layout-container {
  height: 100vh;
}

/* 頂部導航列樣式 */
.app-header {
  background-color: #fff;
  border-bottom: 1px solid #e6e6e6;
  display: flex;
  justify-content: space-between;
  align-items: center;
  height: 60px;
  padding: 0 20px;
  box-shadow: 0 1px 4px rgba(0,21,41,.08);
  z-index: 10;
}
.page-title {
  margin: 0;
  font-size: 18px;
  color: #303133;
}
.user-info {
  display: flex;
  align-items: center;
  gap: 12px;
}
.username {
  font-size: 14px;
  font-weight: 500;
  color: #606266;
}

/* 內容區樣式 */
.app-main {
  background-color: #f0f2f5;
  padding: 20px;
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
  margin-top: 20px;
  display: flex;
  justify-content: flex-end;
}
</style>