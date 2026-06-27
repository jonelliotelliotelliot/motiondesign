// js/head.js

// List of all common head elements you want to load on every page
const headElements = [
  // Meta tags
  { tag: 'meta', attributes: { charset: 'UTF-8' } },
  { tag: 'meta', attributes: { name: 'viewport', content: 'width=device-width, initial-scale=1.0' } },

  // Font Awesome
  { tag: 'link', attributes: { rel: 'stylesheet', href: 'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.2/css/all.min.css' } },

  // Google Fonts
  { tag: 'link', attributes: { rel: 'preconnect', href: 'https://fonts.googleapis.com' } },
  { tag: 'link', attributes: { rel: 'preconnect', href: 'https://fonts.gstatic.com', crossorigin: '' } },
  { tag: 'link', attributes: { rel: 'stylesheet', href: 'https://fonts.googleapis.com/css2?family=Poppins:wght@400;600;700&display=swap' } },
  // Prism CSS
  { tag: 'link', attributes: { rel: 'stylesheet', href: 'https://cdnjs.cloudflare.com/ajax/libs/prism/1.29.0/themes/prism-tomorrow.min.css' } },
  // Prism Core JS
    { tag: 'script', attributes: { src: 'https://cdnjs.cloudflare.com/ajax/libs/prism/1.29.0/components/prism-core.min.js' } },
    // Prism Autoloader Plugin (to automatically load languages like JS)
    { tag: 'script', attributes: { src: 'https://cdnjs.cloudflare.com/ajax/libs/prism/1.29.0/plugins/autoloader/prism-autoloader.min.js' } }

];

// Loop through the list and create/append each element to the document's <head>
headElements.forEach(el => {
  const element = document.createElement(el.tag);
  for (const key in el.attributes) {
    element.setAttribute(key, el.attributes[key]);
  }
  document.head.appendChild(element);
});
