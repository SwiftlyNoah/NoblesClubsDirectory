import { createRouter, createWebHistory } from 'vue-router';
import HomePage from './pages/HomePage.vue';
// import AdminPage from './components/AdminPage.vue';

const routes = [
  { path: '/', redirect: '/home' }, // Redirect root to /home
  { path: '/home', component: HomePage }
//   { path: '/admin', component: AdminPage },
];

const router = createRouter({
  history: createWebHistory(),
  routes,
});

export default router;
