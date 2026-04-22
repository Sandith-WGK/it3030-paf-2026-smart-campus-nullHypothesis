import Swal from 'sweetalert2/dist/sweetalert2.all.js';

/**
 * Custom SweetAlert2 configuration that matches the Smart Campus theme.
 */
const isDark = () => document.documentElement.classList.contains('dark');

const getThemeOptions = () => ({
  background: isDark() ? '#18181b' : '#fff', // zinc-900 or white
  color: isDark() ? '#f4f4f5' : '#18181b', // zinc-100 or zinc-900
  confirmButtonColor: '#7c3aed', // violet-600
  cancelButtonColor: '#71717a', // zinc-500
  customClass: {
    popup: 'rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-xl',
    confirmButton: 'px-5 py-2.5 rounded-xl font-semibold transition-all hover:scale-105 active:scale-95',
    cancelButton: 'px-5 py-2.5 rounded-xl font-semibold transition-all hover:scale-105 active:scale-95'
  },
  buttonsStyling: true
});

export const showConfirm = async (title, text, confirmButtonText = 'Yes, delete it') => {
  return Swal.fire({
    title,
    text,
    icon: 'warning',
    showCancelButton: true,
    confirmButtonText,
    ...getThemeOptions()
  });
};

export const showPrompt = async (title, placeholder, defaultValue = '') => {
  return Swal.fire({
    title,
    input: 'textarea',
    inputPlaceholder: placeholder,
    inputValue: defaultValue,
    showCancelButton: true,
    confirmButtonText: 'Save Changes',
    ...getThemeOptions(),
    inputAttributes: {
      rows: '4',
      className: 'w-full rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-950 p-3 text-sm focus:ring-2 focus:ring-violet-500 outline-none'
    }
  });
};

export const showSuccess = (title, text) => {
  Swal.fire({
    title,
    text,
    icon: 'success',
    timer: 2000,
    showConfirmButton: false,
    ...getThemeOptions()
  });
};

export const showError = (title, text) => {
  Swal.fire({
    title,
    text,
    icon: 'error',
    ...getThemeOptions()
  });
};
