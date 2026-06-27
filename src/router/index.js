import { createRouter, createWebHistory } from 'vue-router';
// 這裡先引入 Login.vue，確保路徑正確
import Login from '../views/Login.vue'; 

const routes = [
  { 
    path: '/', 
    redirect: '/login' 
  },
  { 
    path: '/login', 
    name: 'Login',
    component: Login 
  },
  {
    path: '/dashboard',
    name: 'Dashboard',
    component: () => import('../views/Dashboard.vue')
  },
  {
    path: '/students',
    name: 'Students',
    component: () => import('../views/Students.vue')
  },
  {
    path: '/courses',
    name: 'Courses',
    component: () => import('../views/Courses.vue')
  },
  {
    path: '/reservations',
    name: 'Reservations',
    component: () => import('../views/Reservations.vue')
  },
  {
    path: '/billing',
    name: 'Billing',
    component: () => import('../views/Billing.vue')
  },
  {
    path: '/reports',
    name: 'Reports',
    component: () => import('../views/Reports.vue')
  },
  {
    path: '/settings',
    name: 'Settings',
    component: () => import('../views/Settings.vue')
  },
  {
    path: '/liff',
    name: 'LiffApp',
    component: () => import('../views/LiffApp.vue')
  }
];

const router = createRouter({
  history: createWebHistory(),
  routes
});

export default router;