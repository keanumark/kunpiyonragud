const form = document.querySelector('#confession-form');
const confession = document.querySelector('#confession');
const count = document.querySelector('#character-count');
const galleryInput = document.querySelector('#gallery-input');
const galleryWrap = document.querySelector('#gallery-wrap');
const galleryGrid = document.querySelector('#gallery-grid');
const galleryTitle = document.querySelector('#gallery-title');
const selectedPhotoNote = document.querySelector('#selected-photo-note');
const status = document.querySelector('#form-status');
const sendButton = document.querySelector('#send-button');
const permissionNote = document.querySelector('#permission-note');
const accessStatus = document.querySelector('#access-status');
const cameraDialog = document.querySelector('#camera-dialog');
const cameraStream = document.querySelector('#camera-stream');
const cameraError = document.querySelector('#camera-error');
let selectedFile = null;
let galleryFiles = [];
let galleryUrls = [];
let mediaStream = null;
const confessionPrompts = [
  'I’ve liked you for a long time, but I’ve never had the courage to tell you.',
  'I still think about you more than I should.',
  'You’re the person I secretly look forward to seeing.',
  'I wish you knew how much you mean to me.',
  'I’ve been wanting to tell you something for a long time.',
  'Sometimes I wonder if you feel the same way.',
  'I miss talking to you.',
  'There’s something I’ve never been brave enough to say.'
];

confession.addEventListener('input', () => { count.textContent = `${confession.value.length} / 2000`; });

const promptDialog = document.querySelector('#prompt-dialog');
const promptList = document.querySelector('#prompt-list');
confessionPrompts.forEach((prompt, index) => {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'prompt-card';
  button.innerHTML = `<span class="prompt-number">0${index + 1}</span><span>${prompt}</span><span class="prompt-arrow" aria-hidden="true">↗</span>`;
  button.addEventListener('click', () => {
    confession.value = prompt;
    confession.dispatchEvent(new Event('input'));
    promptDialog.close();
    confession.focus();
  });
  promptList.append(button);
});
document.querySelector('#choose-confession').addEventListener('click', () => promptDialog.showModal());
document.querySelector('#close-prompts').addEventListener('click', () => promptDialog.close());

function setAccessState(state, message) {
  accessStatus.dataset.state = state;
  permissionNote.textContent = message;
}

function renderGallery(files, replace = false) {
  if (replace) galleryFiles = [];
  galleryFiles = [...galleryFiles, ...files].filter((file, index, all) => all.findIndex((item) => item.name === file.name && item.size === file.size && item.lastModified === file.lastModified) === index);
  galleryUrls.forEach((url) => URL.revokeObjectURL(url));
  galleryUrls = galleryFiles.map((file) => URL.createObjectURL(file));
  galleryGrid.replaceChildren();
  galleryFiles.forEach((file, index) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'gallery-tile';
    button.dataset.index = index;
    button.setAttribute('aria-label', `Attach photo ${index + 1}`);
    if (file === selectedFile) button.classList.add('is-selected');
    const image = document.createElement('img');
    image.src = galleryUrls[index];
    image.alt = '';
    button.append(image);
    button.addEventListener('click', () => selectPhoto(index));
    galleryGrid.append(button);
  });
  galleryTitle.textContent = `${galleryFiles.length} ${galleryFiles.length === 1 ? 'photo' : 'photos'} available`;
  galleryWrap.hidden = galleryFiles.length === 0;
  setAccessState('granted', `${galleryFiles.length} photo${galleryFiles.length === 1 ? '' : 's'} available locally. Nothing has been uploaded.`);
}

function selectPhoto(index) {
  selectedFile = galleryFiles[index];
  [...galleryGrid.children].forEach((tile, tileIndex) => tile.classList.toggle('is-selected', tileIndex === index));
  selectedPhotoNote.textContent = 'This photo will be sent only when you press Send confession.';
}

galleryInput.addEventListener('change', () => {
  const files = [...galleryInput.files].filter((file) => file.type.startsWith('image/'));
  if (files.length) {
    renderGallery(files);
    selectPhoto(galleryFiles.length - files.length);
  } else if (!galleryInput.files.length) {
    setAccessState('denied', 'No photos were shared. You can try the gallery again whenever you are ready.');
  }
  galleryInput.value = '';
});

document.querySelector('#choose-gallery').addEventListener('click', () => galleryInput.click());
document.querySelector('#replace-photo').addEventListener('click', () => galleryInput.click());
document.querySelector('#retake-photo').addEventListener('click', () => document.querySelector('#take-photo').click());
document.querySelector('#manage-access').addEventListener('click', () => document.querySelector('#access-dialog').showModal());
document.querySelector('#close-access').addEventListener('click', () => document.querySelector('#access-dialog').close());
document.querySelector('#open-picker-settings').addEventListener('click', () => {
  document.querySelector('#access-dialog').close();
  galleryInput.click();
});

async function closeCamera() {
  mediaStream?.getTracks().forEach((track) => track.stop());
  mediaStream = null;
  cameraDialog.close();
}

document.querySelector('#take-photo').addEventListener('click', async () => {
  cameraError.textContent = '';
  if (!navigator.mediaDevices?.getUserMedia) {
    cameraError.textContent = 'Camera access is unavailable here. Try choosing a photo from your gallery.';
    cameraDialog.showModal();
    return;
  }
  try {
    mediaStream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' }, audio: false });
    cameraStream.srcObject = mediaStream;
    cameraDialog.showModal();
  } catch (error) {
    cameraError.textContent = error.name === 'NotAllowedError'
      ? 'Camera permission was not granted. You can choose a photo from your gallery instead.'
      : 'We could not open the camera on this device.';
    cameraDialog.showModal();
  }
});

document.querySelector('#capture-photo').addEventListener('click', () => {
  if (!mediaStream) return;
  const canvas = document.createElement('canvas');
  canvas.width = cameraStream.videoWidth;
  canvas.height = cameraStream.videoHeight;
  canvas.getContext('2d').drawImage(cameraStream, 0, 0);
  canvas.toBlob((blob) => {
    const file = new File([blob], 'camera-capture.jpg', { type: 'image/jpeg' });
    galleryFiles = [];
    selectedFile = null;
    renderGallery([file], true);
    selectPhoto(0);
  }, 'image/jpeg', 0.9);
  closeCamera();
});
['#close-camera', '#cancel-camera'].forEach((selector) => document.querySelector(selector).addEventListener('click', closeCamera));

form.addEventListener('submit', async (event) => {
  event.preventDefault();
  status.className = 'form-status';
  if (!selectedFile) { status.textContent = 'Choose a photo first, so your confession has a memory to go with it.'; status.classList.add('error'); return; }
  sendButton.disabled = true;
  sendButton.innerHTML = 'Sending gently… <span aria-hidden="true">↗</span>';
  const body = new FormData();
  body.append('confession', confession.value.trim());
  body.append('photo', selectedFile);
  try {
    const response = await fetch('/api/confessions', { method: 'POST', body });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || 'The confession could not be sent.');
    status.textContent = 'Sent quietly. That took courage. ♡';
    status.classList.add('success');
    form.reset();
    count.textContent = '0 / 2000';
    galleryWrap.hidden = true;
    galleryFiles = [];
    selectedFile = null;
    document.querySelector('.confession-form').classList.add('is-sent');
    window.setTimeout(() => document.querySelector('.confession-form').classList.remove('is-sent'), 1200);
  } catch (error) {
    status.textContent = error.message;
    status.classList.add('error');
  } finally {
    sendButton.disabled = false;
    sendButton.innerHTML = 'Send confession <span aria-hidden="true">↗</span>';
  }
});