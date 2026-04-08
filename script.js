/*
  Portfolio Gallery + Admin Panel
  --------------------------------
  This project is designed for GitHub Pages or any static hosting.
  Because there is no backend, the admin page stores edits in localStorage
  and lets you export an updated gallery.json file manually.
*/

const GALLERY_JSON_PATH = 'data/gallery.json';
const STORAGE_KEY = 'portfolioGalleryData';
const THEME_KEY = 'portfolioGalleryTheme';

let galleryItems = [];

function sortByOrder(items) {
  return [...items].sort((a, b) => (Number(a.order) || 0) - (Number(b.order) || 0));
}

async function loadGalleryData() {
  const localData = localStorage.getItem(STORAGE_KEY);
  if (localData) {
    try {
      const parsed = JSON.parse(localData);
      galleryItems = sortByOrder(parsed);
      return galleryItems;
    } catch (error) {
      console.warn('Invalid local gallery data. Falling back to JSON file.', error);
    }
  }

  try {
    const response = await fetch(GALLERY_JSON_PATH, { cache: 'no-store' });
    if (!response.ok) throw new Error('Failed to load gallery.json');
    const data = await response.json();
    galleryItems = sortByOrder(data);
    return galleryItems;
  } catch (error) {
    console.error(error);
    galleryItems = [];
    return galleryItems;
  }
}

function persistGalleryData() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(sortByOrder(galleryItems)));
}

function setTheme(theme) {
  const isLight = theme === 'light';
  document.body.classList.toggle('light-theme', isLight);
  localStorage.setItem(THEME_KEY, isLight ? 'light' : 'dark');

  const toggle = document.getElementById('themeToggle');
  if (toggle) {
    const icon = toggle.querySelector('.theme-toggle__icon');
    const text = toggle.querySelector('.theme-toggle__text');
    if (icon) icon.textContent = isLight ? '🌙' : '☀';
    if (text) text.textContent = isLight ? 'Dark mode' : 'Light mode';
  }
}

function initThemeToggle() {
  const initialTheme = localStorage.getItem(THEME_KEY) || 'dark';
  setTheme(initialTheme);

  const toggle = document.getElementById('themeToggle');
  if (!toggle) return;

  toggle.addEventListener('click', () => {
    const nextTheme = document.body.classList.contains('light-theme') ? 'dark' : 'light';
    setTheme(nextTheme);
  });
}

function showToast(message) {
  const toast = document.createElement('div');
  toast.textContent = message;
  toast.style.position = 'fixed';
  toast.style.bottom = '20px';
  toast.style.left = '50%';
  toast.style.transform = 'translateX(-50%)';
  toast.style.padding = '12px 16px';
  toast.style.borderRadius = '999px';
  toast.style.background = 'rgba(17, 24, 39, 0.92)';
  toast.style.color = '#fff';
  toast.style.border = '1px solid rgba(255,255,255,0.12)';
  toast.style.boxShadow = '0 14px 30px rgba(0,0,0,0.25)';
  toast.style.zIndex = '2000';
  toast.style.opacity = '0';
  toast.style.transition = 'opacity 180ms ease, transform 180ms ease';
  document.body.appendChild(toast);

  requestAnimationFrame(() => {
    toast.style.opacity = '1';
    toast.style.transform = 'translateX(-50%) translateY(-4px)';
  });

  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateX(-50%)';
    setTimeout(() => toast.remove(), 220);
  }, 2200);
}

function normalizeOrders() {
  galleryItems = sortByOrder(galleryItems).map((item, index) => ({
    ...item,
    order: index + 1,
  }));
}

function createSkeletonCards() {
  const skeleton = document.getElementById('gallerySkeleton');
  if (!skeleton) return;
  skeleton.classList.add('is-active');
  skeleton.innerHTML = '';
  for (let i = 0; i < 8; i += 1) {
    const card = document.createElement('div');
    card.className = 'skeleton-card';
    card.style.minHeight = `${220 + (i % 4) * 60}px`;
    skeleton.appendChild(card);
  }
}

function renderGallery() {
  const galleryGrid = document.getElementById('galleryGrid');
  const emptyState = document.getElementById('galleryEmpty');
  const skeleton = document.getElementById('gallerySkeleton');
  if (!galleryGrid || !emptyState) return;

  galleryGrid.innerHTML = '';

  if (!galleryItems.length) {
    emptyState.classList.remove('is-hidden');
    galleryGrid.classList.add('is-hidden');
    if (skeleton) skeleton.classList.remove('is-active');
    return;
  }

  emptyState.classList.add('is-hidden');
  galleryGrid.classList.remove('is-hidden');

  galleryItems.forEach((item, index) => {
    const card = document.createElement('article');
    card.className = 'gallery-card';
    card.setAttribute('tabindex', '0');
    card.setAttribute('role', 'button');
    card.setAttribute('aria-label', `Open image ${index + 1}`);
    card.innerHTML = `
      <div class="gallery-card__image-wrap">
        <img class="gallery-card__image" src="${item.image}" alt="${escapeHtml(item.description || `Gallery image ${index + 1}`)}" loading="lazy" />
        <div class="gallery-card__overlay">
          <div class="gallery-card__description">${escapeHtml(item.description || 'No description')}</div>
        </div>
      </div>
    `;

    const img = card.querySelector('img');
    img.addEventListener('load', () => card.classList.add('is-loaded'));
    img.addEventListener('error', () => {
      card.classList.add('is-loaded');
      img.alt = 'Image not found';
    });

    card.addEventListener('click', () => lightbox.open(index));
    card.addEventListener('keydown', (event) => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        lightbox.open(index);
      }
    });

    galleryGrid.appendChild(card);
  });

  if (skeleton) skeleton.classList.remove('is-active');
}

function escapeHtml(text) {
  return String(text)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

const lightbox = {
  currentIndex: 0,
  scale: 1,
  translateX: 0,
  translateY: 0,
  isDragging: false,
  dragStartX: 0,
  dragStartY: 0,
  startTranslateX: 0,
  startTranslateY: 0,
  touchStartX: 0,
  touchStartY: 0,
  pinchStartDistance: null,
  pinchStartScale: 1,

  elements: {},

  init() {
    this.elements.root = document.getElementById('lightbox');
    if (!this.elements.root) return;

    this.elements.image = document.getElementById('lightboxImage');
    this.elements.description = document.getElementById('lightboxDescription');
    this.elements.counter = document.getElementById('lightboxCounter');
    this.elements.stage = document.getElementById('lightboxStage');

    document.getElementById('closeLightbox')?.addEventListener('click', () => this.close());
    document.getElementById('prevImage')?.addEventListener('click', () => this.prev());
    document.getElementById('nextImage')?.addEventListener('click', () => this.next());
    this.elements.root.addEventListener('click', (event) => {
      if (event.target?.dataset?.closeLightbox === 'true') this.close();
    });

    document.addEventListener('keydown', (event) => {
      if (!this.elements.root.classList.contains('is-open')) return;
      if (event.key === 'Escape') this.close();
      if (event.key === 'ArrowLeft') this.prev();
      if (event.key === 'ArrowRight') this.next();
    });

    this.elements.stage.addEventListener('wheel', (event) => {
      event.preventDefault();
      const delta = event.deltaY < 0 ? 0.15 : -0.15;
      this.scale = clamp(this.scale + delta, 1, 4);
      if (this.scale === 1) this.resetPan();
      this.applyTransform();
    }, { passive: false });

    this.elements.image.addEventListener('pointerdown', (event) => this.startDrag(event));
    window.addEventListener('pointermove', (event) => this.onDrag(event));
    window.addEventListener('pointerup', () => this.endDrag());

    this.elements.stage.addEventListener('touchstart', (event) => this.onTouchStart(event), { passive: false });
    this.elements.stage.addEventListener('touchmove', (event) => this.onTouchMove(event), { passive: false });
    this.elements.stage.addEventListener('touchend', (event) => this.onTouchEnd(event));
  },

  open(index) {
    if (!galleryItems.length) return;
    this.currentIndex = index;
    this.updateContent();
    this.elements.root.classList.add('is-open');
    this.elements.root.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
  },

  close() {
    this.elements.root.classList.remove('is-open');
    this.elements.root.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
    this.resetZoom();
  },

  prev() {
    this.currentIndex = (this.currentIndex - 1 + galleryItems.length) % galleryItems.length;
    this.updateContent();
  },

  next() {
    this.currentIndex = (this.currentIndex + 1) % galleryItems.length;
    this.updateContent();
  },

  updateContent() {
    const item = galleryItems[this.currentIndex];
    if (!item) return;
    this.resetZoom();
    this.elements.image.src = item.image;
    this.elements.image.alt = item.description || `Image ${this.currentIndex + 1}`;
    this.elements.description.textContent = item.description || 'No description provided.';
    this.elements.counter.textContent = `${this.currentIndex + 1} / ${galleryItems.length}`;
  },

  resetZoom() {
    this.scale = 1;
    this.resetPan();
    this.applyTransform();
  },

  resetPan() {
    this.translateX = 0;
    this.translateY = 0;
  },

  applyTransform() {
    this.elements.image.style.transform = `translate(${this.translateX}px, ${this.translateY}px) scale(${this.scale})`;
  },

  startDrag(event) {
    if (this.scale <= 1) return;
    this.isDragging = true;
    this.dragStartX = event.clientX;
    this.dragStartY = event.clientY;
    this.startTranslateX = this.translateX;
    this.startTranslateY = this.translateY;
    this.elements.image.classList.add('is-dragging');
  },

  onDrag(event) {
    if (!this.isDragging) return;
    this.translateX = this.startTranslateX + (event.clientX - this.dragStartX);
    this.translateY = this.startTranslateY + (event.clientY - this.dragStartY);
    this.applyTransform();
  },

  endDrag() {
    this.isDragging = false;
    this.elements.image?.classList.remove('is-dragging');
  },

  onTouchStart(event) {
    if (event.touches.length === 2) {
      event.preventDefault();
      this.pinchStartDistance = getTouchDistance(event.touches);
      this.pinchStartScale = this.scale;
      return;
    }

    if (event.touches.length === 1) {
      this.touchStartX = event.touches[0].clientX;
      this.touchStartY = event.touches[0].clientY;
      if (this.scale > 1) {
        this.startDrag(event.touches[0]);
      }
    }
  },

  onTouchMove(event) {
    if (event.touches.length === 2 && this.pinchStartDistance) {
      event.preventDefault();
      const currentDistance = getTouchDistance(event.touches);
      const zoomFactor = currentDistance / this.pinchStartDistance;
      this.scale = clamp(this.pinchStartScale * zoomFactor, 1, 4);
      if (this.scale === 1) this.resetPan();
      this.applyTransform();
      return;
    }

    if (event.touches.length === 1 && this.scale > 1) {
      event.preventDefault();
      this.onDrag(event.touches[0]);
    }
  },

  onTouchEnd(event) {
    this.pinchStartDistance = null;
    if (this.scale > 1) {
      this.endDrag();
      return;
    }

    if (event.changedTouches.length === 1) {
      const dx = event.changedTouches[0].clientX - this.touchStartX;
      const dy = event.changedTouches[0].clientY - this.touchStartY;
      if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy)) {
        if (dx < 0) this.next();
        else this.prev();
      }
    }
  },
};

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function getTouchDistance(touches) {
  const [a, b] = touches;
  return Math.hypot(b.clientX - a.clientX, b.clientY - a.clientY);
}

function downloadJson(data, fileName = 'gallery.json') {
  const blob = new Blob([JSON.stringify(sortByOrder(data), null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = fileName;
  anchor.click();
  URL.revokeObjectURL(url);
}

function initGalleryPage() {
  createSkeletonCards();
  loadGalleryData().then(() => {
    renderGallery();
    lightbox.init();
  });
}

function initAdminPage() {
  const adminForm = document.getElementById('adminForm');
  const preview = document.getElementById('uploadPreview');
  const imageFileInput = document.getElementById('imageFile');
  const imagePathInput = document.getElementById('imagePath');
  const imageDescriptionInput = document.getElementById('imageDescription');
  const imageOrderInput = document.getElementById('imageOrder');
  const imageIdInput = document.getElementById('imageId');
  const resetFormBtn = document.getElementById('resetFormBtn');
  const exportJsonBtn = document.getElementById('exportJsonBtn');
  const importJsonInput = document.getElementById('importJsonInput');
  const resetLocalDataBtn = document.getElementById('resetLocalDataBtn');

  loadGalleryData().then(() => {
    renderAdminList();
  });

  imageFileInput?.addEventListener('change', (event) => {
    const [file] = event.target.files || [];
    if (!file) {
      resetPreview();
      return;
    }

    if (!imagePathInput.value.trim()) {
      imagePathInput.value = `images/${file.name}`;
    }

    const reader = new FileReader();
    reader.onload = () => {
      preview.classList.remove('upload-preview--empty');
      preview.innerHTML = `<img src="${reader.result}" alt="Preview" />`;
    };
    reader.readAsDataURL(file);
  });

  adminForm?.addEventListener('submit', (event) => {
    event.preventDefault();

    const idValue = imageIdInput.value ? Number(imageIdInput.value) : Date.now();
    const path = imagePathInput.value.trim();
    const description = imageDescriptionInput.value.trim();
    const manualOrder = Number(imageOrderInput.value);

    if (!path || !description) {
      showToast('Please fill in image path and description.');
      return;
    }

    const existingIndex = galleryItems.findIndex((item) => Number(item.id) === idValue);
    const nextOrder = Number.isFinite(manualOrder) && manualOrder > 0 ? manualOrder : galleryItems.length + 1;
    const nextItem = { id: idValue, image: path, description, order: nextOrder };

    if (existingIndex >= 0) {
      galleryItems[existingIndex] = nextItem;
      showToast('Item updated.');
    } else {
      galleryItems.push(nextItem);
      showToast('Item added.');
    }

    normalizeOrders();
    persistGalleryData();
    renderAdminList();
    resetAdminForm();
  });

  resetFormBtn?.addEventListener('click', resetAdminForm);

  exportJsonBtn?.addEventListener('click', () => {
    normalizeOrders();
    persistGalleryData();
    downloadJson(galleryItems);
    showToast('gallery.json exported.');
  });

  importJsonInput?.addEventListener('change', async (event) => {
    const [file] = event.target.files || [];
    if (!file) return;
    try {
      const text = await file.text();
      const parsed = JSON.parse(text);
      if (!Array.isArray(parsed)) throw new Error('JSON must be an array.');
      galleryItems = sortByOrder(parsed);
      normalizeOrders();
      persistGalleryData();
      renderAdminList();
      showToast('JSON imported successfully.');
    } catch (error) {
      console.error(error);
      showToast('Invalid JSON file.');
    }
    event.target.value = '';
  });

  resetLocalDataBtn?.addEventListener('click', async () => {
    localStorage.removeItem(STORAGE_KEY);
    await loadGalleryData();
    renderAdminList();
    resetAdminForm();
    showToast('Local admin data reset.');
  });

  function resetPreview() {
    preview.className = 'upload-preview upload-preview--empty';
    preview.innerHTML = '<span>Preview will appear here</span>';
  }

  function resetAdminForm() {
    adminForm.reset();
    imageIdInput.value = '';
    resetPreview();
  }

  function fillForm(item) {
    imageIdInput.value = item.id;
    imagePathInput.value = item.image;
    imageDescriptionInput.value = item.description;
    imageOrderInput.value = item.order;
    preview.classList.remove('upload-preview--empty');
    preview.innerHTML = `<img src="${item.image}" alt="Existing preview" />`;
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function moveItem(itemId, direction) {
    const index = galleryItems.findIndex((item) => item.id === itemId);
    if (index < 0) return;
    const newIndex = index + direction;
    if (newIndex < 0 || newIndex >= galleryItems.length) return;
    [galleryItems[index], galleryItems[newIndex]] = [galleryItems[newIndex], galleryItems[index]];
    normalizeOrders();
    persistGalleryData();
    renderAdminList();
  }

  function renderAdminList() {
    const list = document.getElementById('adminList');
    const emptyState = document.getElementById('adminEmpty');
    const template = document.getElementById('adminItemTemplate');
    if (!list || !template || !emptyState) return;

    list.innerHTML = '';
    normalizeOrders();

    if (!galleryItems.length) {
      emptyState.classList.remove('is-hidden');
      return;
    }

    emptyState.classList.add('is-hidden');

    galleryItems.forEach((item) => {
      const node = template.content.firstElementChild.cloneNode(true);
      node.dataset.id = String(item.id);
      node.querySelector('.admin-item__thumb').src = item.image;
      node.querySelector('.admin-item__thumb').alt = item.description;
      node.querySelector('.admin-item__order').textContent = `Order ${item.order}`;
      node.querySelector('.admin-item__path').textContent = item.image;
      node.querySelector('.admin-item__description').textContent = item.description;

      node.querySelector('.admin-edit').addEventListener('click', () => fillForm(item));
      node.querySelector('.admin-delete').addEventListener('click', () => {
        galleryItems = galleryItems.filter((entry) => entry.id !== item.id);
        normalizeOrders();
        persistGalleryData();
        renderAdminList();
        showToast('Item removed.');
      });
      node.querySelector('.admin-up').addEventListener('click', () => moveItem(item.id, -1));
      node.querySelector('.admin-down').addEventListener('click', () => moveItem(item.id, 1));

      attachDragHandlers(node, item.id);
      list.appendChild(node);
    });
  }

  let draggedId = null;

  function attachDragHandlers(node, itemId) {
    node.addEventListener('dragstart', () => {
      draggedId = itemId;
      node.classList.add('is-dragging');
    });

    node.addEventListener('dragend', () => {
      draggedId = null;
      node.classList.remove('is-dragging');
      node.classList.remove('drag-over');
    });

    node.addEventListener('dragover', (event) => {
      event.preventDefault();
      if (draggedId !== itemId) node.classList.add('drag-over');
    });

    node.addEventListener('dragleave', () => {
      node.classList.remove('drag-over');
    });

    node.addEventListener('drop', (event) => {
      event.preventDefault();
      node.classList.remove('drag-over');
      if (draggedId === null || draggedId === itemId) return;

      const fromIndex = galleryItems.findIndex((entry) => entry.id === draggedId);
      const toIndex = galleryItems.findIndex((entry) => entry.id === itemId);
      if (fromIndex < 0 || toIndex < 0) return;

      const [movedItem] = galleryItems.splice(fromIndex, 1);
      galleryItems.splice(toIndex, 0, movedItem);
      normalizeOrders();
      persistGalleryData();
      renderAdminList();
    });
  }
}

function init() {
  initThemeToggle();
  const page = document.body.dataset.page;
  if (page === 'gallery') initGalleryPage();
  if (page === 'admin') initAdminPage();
}

document.addEventListener('DOMContentLoaded', init);
