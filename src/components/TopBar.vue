<template>
  <nav class="navbar navbar-expand-lg navbar-light bg-light">
    <div class="container-fluid">
      <a class="navbar-brand" href="#" @click.prevent="goToHome">
        <img src="@/assets/logo_white.png" />
        Clubs &amp; Organizations Directory
      </a>
      <button
        class="navbar-toggler"
        type="button"
        data-bs-toggle="collapse"
        data-bs-target="#navbarSupportedContent"
        aria-controls="navbarSupportedContent"
        aria-expanded="false"
        aria-label="Toggle navigation"
      >
        <span class="navbar-toggler-icon"></span>
      </button>
      <div
        class="collapse navbar-collapse justify-content-end"
        id="navbarSupportedContent"
      >
        <ul class="navbar-nav">
          <li v-if="!userData" class="nav-item">
            <button class="btn btn-light" @click="signInPath">Sign In</button>
          </li>
          <template v-else>
            <li class="nav-item dropdown">
              <a
                class="nav-link dropdown-toggle user-name"
                href="#"
                id="userDropdown"
                role="button"
                data-bs-toggle="dropdown"
                aria-expanded="false"
              >
                <span class="name-text">{{ userData.first }}</span>
                <br />
                <span class="gray-text">
                  {{ userData.is_admin ? userData.admin_role : "My Clubs" }}
                </span>
              </a>
              <ul
                class="dropdown-menu dropdown-menu-end"
                aria-labelledby="userDropdown"
              >
                <li v-if="userData.is_admin">
                  <button class="dropdown-item" @click="goToAdmin">Admin Portal</button>
                </li>
                <button class="dropdown-item" @click="goToMyClubs">My Clubs</button>
                <li>
                  <button class="dropdown-item" @click="emit('register-new')">
                    Register a Club/Org
                  </button>
                </li>
                <li>
                  <button class="dropdown-item" @click="signOut">Sign Out</button>
                </li>
              </ul>
            </li>
          </template>
        </ul>
      </div>
    </div>
  </nav>
</template>

<script setup>
import { defineEmits, defineProps } from 'vue';
import { getAuth, signOut as firebaseSignOut } from "firebase/auth";

const auth = getAuth();

defineProps({
  userData: {
    type: Object,
    default: null
  }
});

const emit = defineEmits(['sign-in', 'register-new']);

function signInPath() {
  emit("sign-in");
}

function goToAdmin() {
  window.location.href = "/admin";
}

function goToMyClubs() {
  window.location.href = "/my-clubs";
}

function goToHome() {
  window.location.href = "/home";
}

function signOut() {
  firebaseSignOut(auth)
    .then(() => {
      localStorage.removeItem("userData");
      location.reload();
    })
    .catch((error) => {
      console.error("Error signing out:", error);
    });
}
</script>

<style scoped>
.navbar {
  background-color: #013366 !important;
}
.navbar-brand,
.nav-item a {
  color: white !important;
  font-family: Garamond, serif;
  text-align: center;
}
.navbar-brand img {
  width: 60px;
  margin-right: 0.5rem;
}
.user-name {
  font-family: Garamond, serif;
  text-align: right;
}
.name-text {
  font-size: 1.5rem;
}
.gray-text {
  color: #B6C4D7;
}
.navbar-toggler {
  border-color: rgba(255, 255, 255, 0.75) !important;
}
.navbar-toggler-icon {
  background-image: url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 30 30'%3e%3cpath stroke='rgba%28255, 255, 255, 1%29' stroke-linecap='round' stroke-miterlimit='10' stroke-width='2' d='M4 7h22M4 15h22M4 23h22'/%3e%3c/svg%3e")
    !important;
}
@media (max-width: 991px) {
  .navbar-nav {
    text-align: center;
    width: 100%;
  }
}
</style>
