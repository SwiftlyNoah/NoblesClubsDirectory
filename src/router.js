import { createRouter, createWebHistory } from 'vue-router';
import HomePage from './pages/HomePage.vue';
import AdminPage from './pages/AdminPage.vue';
import MyClubsPage from './pages/MyClubsPage.vue'

const routes = [
  { path: '/', redirect: '/home' }, // Redirect '/' to '/home'
  { path: '/home', component: HomePage },
  { path: '/admin', component: AdminPage },
  { path: '/my-clubs', component: MyClubsPage }
];

const router = createRouter({
  history: createWebHistory('/clubs'),
  routes,
});

export default router;