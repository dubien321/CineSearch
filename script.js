const API_KEY = "";
const LANGUAGE = "fr-FR";
const BASE_URL = "https://api.themoviedb.org/3";
const IMAGE_BASE_URL = "https://image.tmdb.org/t/p/w500";

let movies = [];
let favorites = JSON.parse(localStorage.getItem("cineMatchFavorites")) || [];
let currentMode = "popular";

const searchForm = document.getElementById("searchForm");
const searchInput = document.getElementById("searchInput");
const moviesGrid = document.getElementById("moviesGrid");
const loader = document.getElementById("loader");
const errorMessage = document.getElementById("errorMessage");
const errorText = document.getElementById("errorText");
const retryButton = document.getElementById("retryButton");
const resultInfo = document.getElementById("resultInfo");
const emptyMessage = document.getElementById("emptyMessage");
const favoriteCount = document.getElementById("favoriteCount");
const favoritesGrid = document.getElementById("favoritesGrid");
const emptyFavorites = document.getElementById("emptyFavorites");
const showFavoritesButton = document.getElementById("showFavoritesButton");
const movieModal = document.getElementById("movieModal");
const modalContent = document.getElementById("modalContent");
const closeModalButton = document.getElementById("closeModalButton");

function hasApiKey() {
  return API_KEY && API_KEY !== "";
}

function buildUrl(endpoint, params = {}) {
  const url = new URL(`${BASE_URL}${endpoint}`);
  url.searchParams.set("api_key", API_KEY);
  url.searchParams.set("language", LANGUAGE);

  Object.entries(params).forEach(([key, value]) => {
    url.searchParams.set(key, value);
  });

  return url.toString();
}

async function fetchMovies(endpoint, params = {}) {
  if (!hasApiKey()) {
    throw new Error("Ajoutez une clé API TMDB dans API_KEY.");
  }

  const response = await fetch(buildUrl(endpoint, params));

  if (!response.ok) {
    throw new Error(`Erreur API TMDB : ${response.status}`);
  }

  const data = await response.json();
  return data.results || [];
}

async function loadPopularMovies() {
  currentMode = "popular";
  showLoader();

  try {
    movies = await fetchMovies("/movie/popular", { page: 1 });
    hideLoader();
    displayMovies(movies);
    resultInfo.textContent = `${movies.length} films populaires affichés`;
  } catch (error) {
    console.error(error);
    showError(error.message);
  }
}

async function searchMovies(query) {
  if (!query.trim()) {
    loadPopularMovies();
    return;
  }

  currentMode = "search";
  showLoader();

  try {
    movies = await fetchMovies("/search/movie", {
      query: query.trim(),
      page: 1,
      include_adult: false
    });

    hideLoader();
    displayMovies(movies);
    resultInfo.textContent = `${movies.length} résultat(s) pour « ${query.trim()} »`;
  } catch (error) {
    console.error(error);
    showError(error.message);
  }
}

function displayMovies(movieList) {
  moviesGrid.innerHTML = "";

  if (movieList.length === 0) {
    emptyMessage.classList.remove("hidden");
    return;
  }

  emptyMessage.classList.add("hidden");

  movieList.forEach(movie => {
    moviesGrid.appendChild(createMovieCard(movie));
  });
}

function createMovieCard(movie) {
  const article = document.createElement("article");
  article.className = "movie-card";

  const poster = movie.poster_path
    ? `${IMAGE_BASE_URL}${movie.poster_path}`
    : createPlaceholder(movie.title);

  const isFavorite = favorites.some(item => item.id === movie.id);

  article.innerHTML = `
    <img class="movie-poster"
         src="${poster}"
         alt="Affiche du film ${escapeHTML(movie.title)}"
         loading="lazy">

    <button class="favorite-button ${isFavorite ? "active" : ""}"
            data-id="${movie.id}"
            aria-label="${isFavorite ? "Retirer des favoris" : "Ajouter aux favoris"}">
      ${isFavorite ? "♥" : "♡"}
    </button>

    <div class="movie-card-body">
      <h3>${escapeHTML(movie.title)}</h3>
      <p class="movie-date">${formatDate(movie.release_date)}</p>
      <span class="rating ${getRatingClass(movie.vote_average)}">
        ${formatRating(movie.vote_average)}
      </span>
      <button class="details-button" data-id="${movie.id}">
        Voir les détails
      </button>
    </div>
  `;

  article.querySelector(".favorite-button").addEventListener("click", event => {
    event.stopPropagation();
    toggleFavorite(movie);
  });

  article.querySelector(".details-button").addEventListener("click", () => {
    openMovieDetails(movie);
  });

  return article;
}

function getRatingClass(rating) {
  if (rating >= 7) return "rating-green";
  if (rating >= 5) return "rating-orange";
  return "rating-red";
}

function toggleFavorite(movie) {
  const index = favorites.findIndex(item => item.id === movie.id);

  if (index !== -1) {
    favorites.splice(index, 1);
  } else {
    favorites.push(movie);
  }

  localStorage.setItem("cineMatchFavorites", JSON.stringify(favorites));
  updateFavoriteCount();

  if (currentMode === "favorites") {
    displayFavorites();
  } else {
    displayMovies(movies);
  }
}

function updateFavoriteCount() {
  favoriteCount.textContent = favorites.length;
}

function displayFavorites() {
  currentMode = "favorites";
  favoritesGrid.innerHTML = "";

  if (favorites.length === 0) {
    emptyFavorites.classList.remove("hidden");
    return;
  }

  emptyFavorites.classList.add("hidden");

  favorites.forEach(movie => {
    favoritesGrid.appendChild(createMovieCard(movie));
  });
}

function openMovieDetails(movie) {
  const poster = movie.poster_path
    ? `${IMAGE_BASE_URL}${movie.poster_path}`
    : createPlaceholder(movie.title);

  modalContent.innerHTML = `
    <div class="modal-layout">
      <img class="modal-poster"
           src="${poster}"
           alt="Affiche du film ${escapeHTML(movie.title)}">

      <div class="modal-info">
        <h2 id="modalTitle">${escapeHTML(movie.title)}</h2>

        <div class="modal-meta">
          <span class="meta-tag">${formatDate(movie.release_date)}</span>
          <span class="meta-tag">${movie.original_language?.toUpperCase() || "N/A"}</span>
          <span class="rating ${getRatingClass(movie.vote_average)}">
            Note : ${formatRating(movie.vote_average)}
          </span>
        </div>

        <p>
          ${escapeHTML(movie.overview || "Aucun synopsis disponible.")}
        </p>

        <button id="modalFavoriteButton" class="primary-button">
          ${favorites.some(item => item.id === movie.id)
            ? "- Retirer des favoris"
            : "+ Ajouter aux favoris"}
        </button>
      </div>
    </div>
  `;

  document.getElementById("modalFavoriteButton").addEventListener("click", () => {
    toggleFavorite(movie);
    document.getElementById("modalFavoriteButton").textContent =
      favorites.some(item => item.id === movie.id)
        ? "- Retirer des favoris"
        : "+Ajouter aux favoris";
  });

  movieModal.showModal();
}

closeModalButton.addEventListener("click", () => movieModal.close());

movieModal.addEventListener("click", event => {
  if (event.target === movieModal) movieModal.close();
});

searchForm.addEventListener("submit", event => {
  event.preventDefault();
  searchMovies(searchInput.value);
});

showFavoritesButton.addEventListener("click", () => {
  displayFavorites();
  document.getElementById("favorites").scrollIntoView({ behavior: "smooth" });
});

retryButton.addEventListener("click", () => {
  if (currentMode === "search") {
    searchMovies(searchInput.value);
  } else {
    loadPopularMovies();
  }
});

function showLoader() {
  loader.classList.remove("hidden");
  errorMessage.classList.add("hidden");
  emptyMessage.classList.add("hidden");
  moviesGrid.innerHTML = "";
}

function hideLoader() {
  loader.classList.add("hidden");
}

function showError(message) {
  loader.classList.add("hidden");
  moviesGrid.innerHTML = "";
  errorMessage.classList.remove("hidden");
  errorText.textContent = message;
}

function formatDate(date) {
  if (!date) return "Date inconnue";

  return new Date(date).toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric"
  });
}

function formatRating(rating) {
  if (typeof rating !== "number") return "N/A";
  return `${rating.toFixed(1)}/10`;
}

function createPlaceholder(title) {
  return `https://placehold.co/500x750/111827/ffffff?text=${encodeURIComponent(title)}`;
}

function escapeHTML(text = "") {
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
}

updateFavoriteCount();
loadPopularMovies();