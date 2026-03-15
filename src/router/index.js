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
    path: '/articles', 
    name: 'ArticleList',
    // 這裡使用懶加載，確保你有建立 src/views/ArticleList.vue
    component: () => import('../views/ArticleList.vue') 
  }
];

const router = createRouter({
  history: createWebHistory(),
  routes
});

export default router;