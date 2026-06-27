<template>
  <div class="common-layout">
    <el-container class="layout-container">

      <Sidebar />

      <el-container>
        <el-header class="app-header">
          <div class="header-left">
            <h2 class="page-title">營運總覽</h2>
          </div>
          <div class="user-info">
            <el-avatar :size="32" src="https://cube.elemecdn.com/0/88/03b0d39583f48206768a7534e55bcpng.png" />
            <span class="username">{{ currentUsername }}</span>
            <el-button link type="danger" @click="handleLogout">登出</el-button>
          </div>
        </el-header>

        <el-main class="app-main">
          <el-row :gutter="20">
            <el-col :span="6">
              <el-card shadow="never" class="stat-card">
                <div class="stat-label">今日預約數</div>
                <div class="stat-value">{{ todaySummary?.totalReservations ?? '-' }}</div>
                <div class="stat-sub">取消 {{ todaySummary?.cancelledCount ?? 0 }} 筆</div>
              </el-card>
            </el-col>
            <el-col :span="6">
              <el-card shadow="never" class="stat-card">
                <div class="stat-label">本週出席率</div>
                <div class="stat-value">{{ weekSummary ? weekSummary.attendanceRate.toFixed(1) : '-' }}%</div>
                <div class="stat-sub">出席 {{ weekSummary?.attendedCount ?? 0 }} / 缺席 {{ weekSummary?.absentCount ?? 0 }}</div>
              </el-card>
            </el-col>
            <el-col :span="6">
              <el-card shadow="never" class="stat-card">
                <div class="stat-label">待確認收款</div>
                <div class="stat-value">{{ pendingPaymentCount }}</div>
                <div class="stat-sub">筆繳費紀錄待確認</div>
              </el-card>
            </el-col>
            <el-col :span="6">
              <el-card shadow="never" class="stat-card alert" :class="{ 'has-alert': lowBalanceCount > 0 }">
                <div class="stat-label">堂數即將用完</div>
                <div class="stat-value">{{ lowBalanceCount }}</div>
                <div class="stat-sub">剩餘 ≤ 2 堂的學員</div>
              </el-card>
            </el-col>
          </el-row>

          <el-card shadow="never" class="chart-card">
            <div class="chart-header">
              <h3>預約趨勢</h3>
              <div class="chart-controls">
                <el-radio-group v-model="rangePreset" size="small" @change="applyPreset">
                  <el-radio-button :value="7">近 7 天</el-radio-button>
                  <el-radio-button :value="30">近 30 天</el-radio-button>
                  <el-radio-button :value="90">近 90 天</el-radio-button>
                </el-radio-group>
                <el-date-picker
                  v-model="customRange"
                  type="daterange"
                  range-separator="至"
                  start-placeholder="開始日期"
                  end-placeholder="結束日期"
                  size="small"
                  value-format="YYYY-MM-DD"
                  style="width: 230px"
                  @change="applyCustomRange"
                />
              </div>
            </div>
            <v-chart class="chart" :option="chartOption" autoresize v-loading="trendLoading" />
          </el-card>
        </el-main>
      </el-container>
    </el-container>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { use } from 'echarts/core'
import { CanvasRenderer } from 'echarts/renderers'
import { LineChart } from 'echarts/charts'
import { TooltipComponent, GridComponent, LegendComponent } from 'echarts/components'
import VChart from 'vue-echarts'
import Sidebar from '../components/Sidebar.vue'
import http from '../api/http'

use([CanvasRenderer, LineChart, TooltipComponent, GridComponent, LegendComponent])

const router = useRouter()
const currentUsername = ref(localStorage.getItem('username') || 'Admin')

const todaySummary = ref(null)
const weekSummary = ref(null)
const pendingPaymentCount = ref(0)
const lowBalanceCount = ref(0)
const trend = ref([])
const trendLoading = ref(false)
const rangePreset = ref(30)
const customRange = ref([])

const formatDate = (d) => d.toISOString().slice(0, 10)

const chartOption = computed(() => ({
  tooltip: { trigger: 'axis' },
  legend: { data: ['預約數', '出席數'], top: 4, right: 8, itemGap: 20 },
  grid: { left: 36, right: 16, top: 48, bottom: 28 },
  xAxis: { type: 'category', data: trend.value.map((t) => t.date.slice(5)) },
  yAxis: { type: 'value', minInterval: 1 },
  series: [
    {
      name: '預約數',
      type: 'line',
      smooth: true,
      data: trend.value.map((t) => t.reservationCount),
      itemStyle: { color: '#b8924f' },
      areaStyle: { color: 'rgba(184, 146, 79, 0.12)' },
    },
    {
      name: '出席數',
      type: 'line',
      smooth: true,
      data: trend.value.map((t) => t.attendedCount),
      itemStyle: { color: '#2ec4b6' },
    },
  ],
}))

const loadKpis = async () => {
  const today = new Date()
  const todayStr = formatDate(today)
  const weekStart = new Date(today)
  weekStart.setDate(today.getDate() - today.getDay())

  const [todayRes, weekRes, paymentsRes, lowBalanceRes] = await Promise.all([
    http.get('/api/reports/summary', { params: { from: todayStr, to: todayStr } }),
    http.get('/api/reports/summary', { params: { from: formatDate(weekStart), to: todayStr } }),
    http.get('/api/payments'),
    http.get('/api/student-plans/low-balance', { params: { threshold: 2 } }),
  ])

  todaySummary.value = todayRes.data
  weekSummary.value = weekRes.data
  pendingPaymentCount.value = paymentsRes.data.filter((p) => p.status === 'PENDING').length
  lowBalanceCount.value = lowBalanceRes.data.length
}

const loadTrend = async (from, to) => {
  trendLoading.value = true
  try {
    const { data } = await http.get('/api/reports/daily-trend', { params: { from, to } })
    trend.value = data
  } finally {
    trendLoading.value = false
  }
}

const applyPreset = (days) => {
  customRange.value = []
  const today = new Date()
  const start = new Date(today)
  start.setDate(today.getDate() - (days - 1))
  loadTrend(formatDate(start), formatDate(today))
}

const applyCustomRange = (range) => {
  if (!range || range.length !== 2) return
  rangePreset.value = null
  loadTrend(range[0], range[1])
}

const handleLogout = () => {
  localStorage.removeItem('token')
  localStorage.removeItem('username')
  router.push('/login')
}

onMounted(() => {
  loadKpis()
  applyPreset(30)
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
  z-index: 10;
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
.stat-card {
  text-align: center;
  padding: 6px 0;
}
.stat-card.has-alert {
  border-color: rgba(217, 86, 86, 0.4) !important;
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
.stat-card.has-alert .stat-value {
  color: #b03a3a;
}
.stat-sub {
  font-size: 12px;
  color: #b0b2b9;
  margin-top: 6px;
}
.chart-card {
  margin-top: 20px;
}
.chart-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 12px;
  margin-bottom: 12px;
}
.chart-header h3 {
  margin: 0;
  font-size: 15px;
  font-weight: 600;
  color: #1c1f26;
}
.chart-controls {
  display: flex;
  align-items: center;
  gap: 10px;
}
.chart {
  height: 320px;
}
</style>
