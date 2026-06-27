<template>
  <div class="common-layout">
    <el-container class="layout-container">
      <Sidebar />

      <el-container>
        <el-header class="app-header">
          <div class="header-left">
            <h2 class="page-title">營運報表</h2>
          </div>
          <div class="user-info">
            <span class="username">{{ currentUsername }}</span>
            <el-button link type="danger" @click="handleLogout">登出</el-button>
          </div>
        </el-header>

        <el-main class="app-main">
          <el-card class="filter-card" shadow="never">
            <el-form :inline="true">
              <el-form-item label="日期區間">
                <el-date-picker
                  v-model="dateRange"
                  type="daterange"
                  range-separator="至"
                  start-placeholder="開始日期"
                  end-placeholder="結束日期"
                  value-format="YYYY-MM-DD"
                />
              </el-form-item>
              <el-form-item>
                <el-button type="primary" @click="loadSummary">查詢</el-button>
              </el-form-item>
              <el-form-item>
                <el-button @click="setThisMonth">本月</el-button>
              </el-form-item>
            </el-form>
          </el-card>

          <el-row :gutter="20" v-loading="loading">
            <el-col :span="6">
              <el-card shadow="never" class="stat-card">
                <div class="stat-label">出席率</div>
                <div class="stat-value">{{ summary ? summary.attendanceRate.toFixed(1) : '-' }}%</div>
                <div class="stat-sub">出席 {{ summary?.attendedCount ?? '-' }} / 缺席 {{ summary?.absentCount ?? '-' }}</div>
              </el-card>
            </el-col>
            <el-col :span="6">
              <el-card shadow="never" class="stat-card">
                <div class="stat-label">堂數消耗</div>
                <div class="stat-value">{{ summary?.creditsConsumed ?? '-' }}</div>
                <div class="stat-sub">不含體驗課，共 {{ summary?.trialCount ?? 0 }} 堂體驗課</div>
              </el-card>
            </el-col>
            <el-col :span="6">
              <el-card shadow="never" class="stat-card">
                <div class="stat-label">已確認收款</div>
                <div class="stat-value">NT$ {{ summary?.confirmedRevenue ?? '-' }}</div>
                <div class="stat-sub">期間內已確認的繳費金額</div>
              </el-card>
            </el-col>
            <el-col :span="6">
              <el-card shadow="never" class="stat-card">
                <div class="stat-label">取消預約數</div>
                <div class="stat-value">{{ summary?.cancelledCount ?? '-' }}</div>
                <div class="stat-sub">共 {{ summary?.totalReservations ?? '-' }} 筆預約</div>
              </el-card>
            </el-col>
          </el-row>
        </el-main>
      </el-container>
    </el-container>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import Sidebar from '../components/Sidebar.vue'
import http from '../api/http'

const router = useRouter()
const currentUsername = ref(localStorage.getItem('username') || 'Admin')

const dateRange = ref([])
const summary = ref(null)
const loading = ref(false)

const formatDate = (d) => d.toISOString().slice(0, 10)

const setThisMonth = () => {
  const now = new Date()
  const first = new Date(now.getFullYear(), now.getMonth(), 1)
  const last = new Date(now.getFullYear(), now.getMonth() + 1, 0)
  dateRange.value = [formatDate(first), formatDate(last)]
  loadSummary()
}

const loadSummary = async () => {
  if (!dateRange.value || dateRange.value.length !== 2) return
  loading.value = true
  try {
    const { data } = await http.get('/api/reports/summary', {
      params: { from: dateRange.value[0], to: dateRange.value[1] },
    })
    summary.value = data
  } finally {
    loading.value = false
  }
}

const handleLogout = () => {
  localStorage.removeItem('token')
  localStorage.removeItem('username')
  router.push('/login')
}

onMounted(() => {
  setThisMonth()
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
.stat-card {
  text-align: center;
  padding: 6px 0;
}
.stat-label {
  font-size: 13px;
  color: #8a8d96;
  margin-bottom: 8px;
}
.stat-value {
  font-size: 26px;
  font-weight: 700;
  color: #1c1f26;
}
.stat-sub {
  font-size: 12px;
  color: #b0b2b9;
  margin-top: 6px;
}
</style>
