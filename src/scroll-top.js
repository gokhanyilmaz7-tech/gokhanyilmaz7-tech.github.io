const btn = document.createElement('button');
btn.innerHTML = '↑';
btn.title = 'Başa Dön';
Object.assign(btn.style, {
  position: 'fixed', bottom: '20px', left: '20px', width: '45px', height: '45px', // Top left or bottom left? bottom right is usually covered by chat widgets, but let's do bottom right
  borderRadius: '50%', background: '#2e67d2', color: 'white', border: 'none',
  fontSize: '1.2rem', cursor: 'pointer', zIndex: '9999', display: 'none',
  boxShadow: '0 4px 12px rgba(46,103,210,0.3)', transition: 'opacity 0.2s, transform 0.2s',
  opacity: '0', pointerEvents: 'none',
  display: 'flex', alignItems: 'center', justifyContent: 'center'
});
// Re-assign right
btn.style.left = 'auto';
btn.style.right = '20px';

document.body.appendChild(btn);

window.addEventListener('scroll', () => {
  if (window.scrollY > 300) {
    btn.style.display = 'flex';
    setTimeout(() => { btn.style.opacity = '1'; btn.style.pointerEvents = 'auto'; }, 10);
  } else {
    btn.style.opacity = '0';
    btn.style.pointerEvents = 'none';
    setTimeout(() => { if(window.scrollY <= 300) btn.style.display = 'none'; }, 200);
  }
});

btn.addEventListener('click', () => {
  window.scrollTo({ top: 0, left: 0, behavior: 'smooth' });
});
